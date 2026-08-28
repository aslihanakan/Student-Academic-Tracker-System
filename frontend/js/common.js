console.log("APP JS LOADED");

// Not: sabit "/api" yerine auth.js'deki API_BASE_URL kullanılıyor.
// Vercel'de frontend ve backend zaten aynı domain'den servis edildiği
// için bu her zaman relative "/api" olarak çözülür, ama local'de
// Live Server (3000) kullanıldığında da doğru backend'e gider.
const API_URL = API_BASE_URL + "/api";

/* ─── HELPERS ─────────────────────────────────────────────────────────────────*/

function formatEmpty(value) {
    if (value === null || value === undefined || value === "") return "-";
    return value;
}

function toTitleCase(value) {
    if (value === null || value === undefined) return "";

    const str = String(value).trim().replace(/\s+/g, " ");
    if (!str) return "";

    return str
        .split(" ")
        .map(function (word) {
            if (!word) return "";

            return word.split("-").map(function (sub) {
                if (!sub) return "";
                const first = sub.charAt(0).toLocaleUpperCase("tr-TR");
                const rest = sub.slice(1).toLocaleLowerCase("tr-TR");
                return first + rest;
            }).join("-");
        })
        .join(" ");
}

function formatTitleCase(value) {
    return toTitleCase(value);
}

function toSentenceCase(value) {
    if (value === null || value === undefined) return "";
    const str = String(value).trim().replace(/\s+/g, " ");
    if (!str) return "";
    return str.charAt(0).toLocaleUpperCase("tr-TR") + str.slice(1);
}

function normalizeEmail(value) {
    if (!value) return "";
    return String(value).trim().toLowerCase();
}

function autoFormatInput(inputEl, formatType) {
    if (!inputEl) return;
    inputEl.addEventListener("blur", function () {
        if (!this.value) return;
        if (formatType === "title" || formatType === "name") {
            this.value = toTitleCase(this.value);
        } else if (formatType === "email") {
            this.value = normalizeEmail(this.value);
        } else if (formatType === "sentence") {
            this.value = toSentenceCase(this.value);
        }
    });
}

window.toTitleCase = toTitleCase;
window.formatTitleCase = formatTitleCase;
window.toSentenceCase = toSentenceCase;
window.normalizeEmail = normalizeEmail;
window.autoFormatInput = autoFormatInput;

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function escapeForOnclick(value) {
    return String(value ?? "")
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'")
        .replace(/"/g, "&quot;")
        .replace(/\n/g, "\\n")
        .replace(/\r/g, "");
}

function toDateText(dateValue) {
    if (!dateValue) return "";

    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) {
        return String(dateValue).split("T")[0];
    }

    return date.toISOString().split("T")[0];
}

function calculateDaysLeft(dateText) {
    if (!dateText) return null;

    const today = new Date();
    const targetDate = new Date(dateText);

    today.setHours(0, 0, 0, 0);
    targetDate.setHours(0, 0, 0, 0);

    return Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));
}

function formatDaysLeft(dateText) {
    const days = calculateDaysLeft(dateText);

    if (days === null) return "-";
    if (days < 0) return "Overdue";
    if (days === 0) return "Today";
    if (days === 1) return "1 day left";

    return `${days} days left`;
}

function formatDaysLeftColored(dateText) {
    const days = calculateDaysLeft(dateText);

    if (days === null) return "-";

    if (days < 0) {
        return `<span style="color:#ef4444;font-weight:700">Overdue ⚠️</span>`;
    }

    if (days === 0) {
        return `<span style="color:#ef4444;font-weight:700">Today! ⚠️</span>`;
    }

    if (days <= 2) {
        return `<span style="color:#ef4444;font-weight:700">${days} days left ⚠️</span>`;
    }

    if (days <= 7) {
        return `<span style="color:#f97316;font-weight:700">${days} days left</span>`;
    }

    return `<span style="color:#22c55e;font-weight:600">${days} days left</span>`;
}

function getDeadlineProximityColor(days) {
    if (days === null || days === undefined) return "#94a3b8";

    if (days <= 2) return "#ef4444";
    if (days <= 4) return "#f0653d";
    if (days <= 7) return "#f97316";
    return "#22c55e";
}

function formatStatusCell(dateText, isDone) {
    if (isDone) {
        return `<span style="color:#16a34a;font-weight:700">✅ Completed</span>`;
    }

    return formatDaysLeftColored(dateText);
}

function isItemOverdue(dateText, isDone) {
    const days = calculateDaysLeft(dateText);
    if (days === null) return null;
    return !isDone && days < 0;
}

/* ─── OFFLINE DATA CACHE & STATUS MANAGEMENT ─────────────────────────────────*/

const ATS_CACHE_PREFIX = "ats_cache_";
const ATS_QUEUE_KEY = "ats_offline_sync_queue";

function getOfflineCacheKey(url) {
    const user = (typeof getStoredUser === "function") ? getStoredUser() : null;
    const uid = user ? (user.id || user.email || "user") : "guest";
    return `${ATS_CACHE_PREFIX}${uid}_${url}`;
}

function saveOfflineCache(url, data) {
    try {
        const key = getOfflineCacheKey(url);
        const record = JSON.stringify({
            savedAt: Date.now(),
            data: data
        });
        localStorage.setItem(key, record);

        // If courses are saved, keep other course query caches and in-memory lists strictly in sync
        if (url.includes("/courses") && Array.isArray(data)) {
            window._allCourses = data;
            window._currentPageCourses = data;
            window._allCoursesForDeadlines = data;
            window._coursesForGPA = data;

            const user = (typeof getStoredUser === "function") ? getStoredUser() : null;
            const uid = user ? (user.id || user.email || "user") : "guest";
            const prefix = `${ATS_CACHE_PREFIX}${uid}_`;

            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && k.startsWith(prefix) && k.includes("/courses") && k !== key) {
                    try {
                        const old = JSON.parse(localStorage.getItem(k) || "{}");
                        if (Array.isArray(old.data)) {
                            const map = new Map(data.map(c => [String(c.id), c]));
                            const merged = old.data.map(c => map.get(String(c.id)) ? { ...c, ...map.get(String(c.id)) } : c);
                            localStorage.setItem(k, JSON.stringify({ savedAt: Date.now(), data: merged }));
                        }
                    } catch (e) {}
                }
            }
        }
    } catch (e) {
        console.warn("[Offline Cache] LocalStorage quota or write error:", e);
    }
}

function getOfflineCache(url) {
    try {
        const key = getOfflineCacheKey(url);
        const raw = localStorage.getItem(key);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && parsed.data !== undefined) return parsed.data;
        }

        // Fuzzy fallback across similar endpoints when query parameters vary
        const user = (typeof getStoredUser === "function") ? getStoredUser() : null;
        const uid = user ? (user.id || user.email || "user") : "guest";
        const prefix = `${ATS_CACHE_PREFIX}${uid}_`;

        const scanCache = (endpoint) => {
            let bestData = null;
            let bestSavedAt = -1;

            // 1. Check user prefix keys
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && k.startsWith(prefix) && k.includes(endpoint)) {
                    try {
                        const item = JSON.parse(localStorage.getItem(k) || "{}");
                        if (item && item.data !== undefined) {
                            const time = Number(item.savedAt) || 0;
                            if (time >= bestSavedAt) {
                                bestSavedAt = time;
                                bestData = item.data;
                            }
                        }
                    } catch (e) {}
                }
            }

            if (bestData !== null) return bestData;

            // 2. Fallback: check any ATS_CACHE_PREFIX key
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && k.startsWith(ATS_CACHE_PREFIX) && k.includes(endpoint)) {
                    try {
                        const item = JSON.parse(localStorage.getItem(k) || "{}");
                        if (item && item.data !== undefined) {
                            const time = Number(item.savedAt) || 0;
                            if (time >= bestSavedAt) {
                                bestSavedAt = time;
                                bestData = item.data;
                            }
                        }
                    } catch (e) {}
                }
            }

            return bestData;
        };

        // 1. Courses fallback
        if (url.includes("/courses")) {
            const cached = scanCache("/courses");
            if (Array.isArray(cached) && cached.length > 0) return cached;
            if (window._allCourses && window._allCourses.length > 0) return window._allCourses;
            if (window._currentPageCourses && window._currentPageCourses.length > 0) return window._currentPageCourses;
            if (window._allCoursesForDeadlines && window._allCoursesForDeadlines.length > 0) return window._allCoursesForDeadlines;
            return [];
        }

        // 2. Study sessions fallback
        if (url.includes("/study-sessions")) {
            const cached = scanCache("/study-sessions");
            if (Array.isArray(cached)) return cached;
            if (window._allSessions) return window._allSessions;
            return [];
        }

        // 3. Exams fallback
        if (url.includes("/exams")) {
            const cached = scanCache("/exams");
            if (Array.isArray(cached)) return cached;
            if (window._allExams) return window._allExams;
            return [];
        }

        // 4. Projects fallback
        if (url.includes("/projects")) {
            const cached = scanCache("/projects");
            if (Array.isArray(cached)) return cached;
            if (window._allProjects) return window._allProjects;
            return [];
        }

        // 5. Todos fallback
        if (url.includes("/todos")) {
            const cached = scanCache("/todos");
            if (Array.isArray(cached)) return cached;
            if (window._dashboardActivities) return window._dashboardActivities;
            return [];
        }

        // 6. Day notes fallback
        if (url.includes("/day-notes")) {
            const cached = scanCache("/day-notes");
            if (Array.isArray(cached)) return cached;
            if (window._dayNotes) return window._dayNotes;
            return [];
        }

        // 7. Dashboard fallback
        if (url.includes("/dashboard")) {
            const cached = scanCache("/dashboard");
            if (cached) return cached;
            return {
                stats: { totalCourses: 0, passedCourses: 0, averageGrade: 0 },
                chartData: [],
                recentActivities: []
            };
        }

        return null;
    } catch (e) {
        return null;
    }
}

async function fetchJson(url) {
    // 1. Cihaz kesin olarak çevrimdışıysa doğrudan önbellekten dön
    if (!navigator.onLine) {
        const cached = getOfflineCache(url);
        if (cached !== null) {
            console.log(`[Offline Cache] Serving offline data: ${url}`);
            return cached;
        }
    }

    // 2. Ağ isteğini dene
    try {
        const response = await fetch(url);

        if (!response.ok) {
            // Sunucu hatası varsa veya Service Worker çevrimdışı 503 döndüyse önbelleğe bak
            const cached = getOfflineCache(url);
            if (cached !== null) {
                console.warn(`[Offline Cache Fallback] Server status ${response.status}, using cached data: ${url}`);
                return cached;
            }
            throw new Error(`Request failed: ${url} (status ${response.status})`);
        }

        const data = await response.json();
        // Başarılı yanıtı çevrimdışı kullanım için kaydet
        saveOfflineCache(url, data);
        return data;

    } catch (err) {
        // Ağ hatası (çevrimdışı, timeout vb.)
        const cached = getOfflineCache(url);
        if (cached !== null) {
            console.log(`[Offline Cache Fallback] Network failed, serving cached: ${url}`);
            if (typeof showOfflineIndicator === "function") {
                showOfflineIndicator(true);
            }
            return cached;
        }
        throw err;
    }
}

function ensureOfflineIndicatorElement() {
    let el = document.getElementById("ats-offline-badge");
    if (el) return el;

    el = document.createElement("div");
    el.id = "ats-offline-badge";
    el.innerHTML = `
        <div class="ats-offline-content">
            <span class="ats-offline-dot"></span>
            <span class="ats-offline-text">Offline Mode (Viewing cached data)</span>
        </div>
    `;

    const style = document.createElement("style");
    style.id = "ats-offline-badge-style";
    style.textContent = `
        #ats-offline-badge {
            position: fixed;
            bottom: 24px;
            left: 50%;
            transform: translateX(-50%) translateY(100px);
            background: rgba(15, 23, 42, 0.95);
            border: 1px solid rgba(245, 158, 11, 0.45);
            backdrop-filter: blur(12px);
            color: #fef08a;
            padding: 10px 22px;
            border-radius: 9999px;
            font-size: 13px;
            font-weight: 600;
            box-shadow: 0 12px 30px rgba(0, 0, 0, 0.45), 0 0 16px rgba(245, 158, 11, 0.2);
            z-index: 10001;
            transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.35s ease;
            pointer-events: none;
            display: flex;
            align-items: center;
            opacity: 0;
        }
        #ats-offline-badge.visible {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
        }
        #ats-offline-badge.online-back {
            border-color: rgba(34, 197, 94, 0.45);
            color: #86efac;
            box-shadow: 0 12px 30px rgba(0, 0, 0, 0.45), 0 0 16px rgba(34, 197, 94, 0.2);
        }
        .ats-offline-content {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .ats-offline-dot {
            width: 9px;
            height: 9px;
            border-radius: 50%;
            background: #f59e0b;
            box-shadow: 0 0 8px #f59e0b;
            animation: ats-pulse 1.8s infinite ease-in-out;
        }
        #ats-offline-badge.online-back .ats-offline-dot {
            background: #22c55e;
            box-shadow: 0 0 8px #22c55e;
            animation: none;
        }
        @keyframes ats-pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.35; transform: scale(0.8); }
        }
    `;

    document.head.appendChild(style);
    document.body.appendChild(el);
    return el;
}

function showOfflineIndicator(isOffline) {
    const badge = ensureOfflineIndicatorElement();
    if (!badge) return;

    if (isOffline) {
        badge.classList.remove("online-back");
        badge.querySelector(".ats-offline-text").textContent = "⚡ Offline Mode (Viewing cached data)";
        badge.classList.add("visible");
    } else {
        badge.classList.add("online-back");
        badge.querySelector(".ats-offline-text").textContent = "🟢 Back Online - Syncing data...";
        badge.classList.add("visible");
        setTimeout(() => {
            badge.classList.remove("visible");
        }, 3500);
    }
}
window.showOfflineIndicator = showOfflineIndicator;

function getOfflineQueue() {
    try {
        return JSON.parse(localStorage.getItem(ATS_QUEUE_KEY) || "[]");
    } catch (e) {
        return [];
    }
}

function saveOfflineQueue(queue) {
    try {
        localStorage.setItem(ATS_QUEUE_KEY, JSON.stringify(queue));
    } catch (e) {}
}

function applyOptimisticOfflineMutation(url, method, body, syntheticId) {
    const user = (typeof getStoredUser === "function") ? getStoredUser() : null;
    const uid = user ? (user.id || user.email || "user") : "guest";
    const prefix = `${ATS_CACHE_PREFIX}${uid}_`;

    try {
        if (url.includes("/courses")) {
            const courseKeys = [];
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && k.startsWith(prefix) && k.includes("/courses")) courseKeys.push(k);
            }
            if (method === "POST" && body) {
                const newCourse = {
                    id: syntheticId,
                    midtermGrade: null,
                    projectGrade: null,
                    finalGrade: null,
                    makeupGrade: null,
                    midtermWeight: 0,
                    projectWeight: 0,
                    passingGrade: 60,
                    extraGrades: [],
                    ...body
                };
                window._allCourses = [...(window._allCourses || []).filter(c => String(c.id) !== String(syntheticId)), newCourse];
                window._coursesForGPA = window._allCourses;
                window._currentPageCourses = window._allCourses;
                window._allCoursesForDeadlines = window._allCourses;

                const primaryKey = `${prefix}${API_URL}/courses`;
                const unlistedKey = `${prefix}${API_URL}/courses?includeUnlisted=1`;
                if (!courseKeys.includes(primaryKey)) courseKeys.push(primaryKey);
                if (!courseKeys.includes(unlistedKey)) courseKeys.push(unlistedKey);

                courseKeys.forEach(k => {
                    let cached = null;
                    try { cached = JSON.parse(localStorage.getItem(k) || "{}"); } catch (e) {}
                    if (!cached || !Array.isArray(cached.data)) {
                        cached = { savedAt: Date.now(), data: [] };
                    }
                    if (!cached.data.some(c => String(c.id) === String(newCourse.id))) {
                        cached.data.push(newCourse);
                    }
                    cached.savedAt = Date.now();
                    localStorage.setItem(k, JSON.stringify(cached));
                });
            } else if (method === "DELETE") {
                const idMatch = url.match(/\/courses\/([^\/?#]+)/);
                if (idMatch) {
                    const idToDelete = idMatch[1];
                    window._allCourses = (window._allCourses || []).filter(c => String(c.id) !== String(idToDelete));
                    window._currentPageCourses = window._allCourses;
                    window._allCoursesForDeadlines = window._allCourses;
                    courseKeys.forEach(k => {
                        const cached = JSON.parse(localStorage.getItem(k) || "{}");
                        if (Array.isArray(cached.data)) {
                            cached.data = cached.data.filter(c => String(c.id) !== String(idToDelete));
                            localStorage.setItem(k, JSON.stringify(cached));
                        }
                    });
                }
            } else if (method === "PUT" && body) {
                const idMatch = url.match(/\/courses\/([^\/?#]+)/);
                if (idMatch) {
                    const idToUpdate = idMatch[1];
                    const updater = c => String(c.id) === String(idToUpdate) ? { ...c, ...body } : c;
                    window._allCourses = (window._allCourses || []).map(updater);
                    window._currentPageCourses = window._allCourses;
                    window._allCoursesForDeadlines = window._allCourses;
                    courseKeys.forEach(k => {
                        const cached = JSON.parse(localStorage.getItem(k) || "{}");
                        if (Array.isArray(cached.data)) {
                            cached.data = cached.data.map(updater);
                            localStorage.setItem(k, JSON.stringify(cached));
                        }
                    });
                }
            }
        } else if (url.includes("/exams")) {
            let exams = getOfflineCache(`${API_URL}/exams`) || getOfflineCache(`${API_BASE_URL}/api/exams`) || window._allExams || [];
            if (!Array.isArray(exams)) exams = [];

            if (method === "POST" && body) {
                const newExam = { id: syntheticId, isDone: 0, ...body };
                exams = [newExam, ...exams.filter(e => String(e.id) !== String(syntheticId))];
                saveOfflineCache(`${API_URL}/exams`, exams);
                saveOfflineCache(`${API_BASE_URL}/api/exams`, exams);
                window._allExams = exams;
                if (window._examsPageData) window._examsPageData.exams = exams;
            } else if (method === "PATCH" && url.includes("/status")) {
                const idMatch = url.match(/\/exams\/([^\/?#]+)\/status/);
                if (idMatch) {
                    const id = idMatch[1];
                    exams = exams.map(e => String(e.id) === String(id) ? { ...e, isDone: Number(body?.isDone ?? 1) } : e);
                    saveOfflineCache(`${API_URL}/exams`, exams);
                    saveOfflineCache(`${API_BASE_URL}/api/exams`, exams);
                    window._allExams = exams;
                    if (window._examsPageData) window._examsPageData.exams = exams;
                }
            } else if (method === "PUT") {
                const idMatch = url.match(/\/exams\/([^\/?#]+)/);
                if (idMatch) {
                    const id = idMatch[1];
                    exams = exams.map(e => String(e.id) === String(id) ? { ...e, ...body } : e);
                    saveOfflineCache(`${API_URL}/exams`, exams);
                    saveOfflineCache(`${API_BASE_URL}/api/exams`, exams);
                    window._allExams = exams;
                    if (window._examsPageData) window._examsPageData.exams = exams;
                }
            } else if (method === "DELETE") {
                const idMatch = url.match(/\/exams\/([^\/?#]+)/);
                if (idMatch) {
                    const id = idMatch[1];
                    exams = exams.filter(e => String(e.id) !== String(id));
                    saveOfflineCache(`${API_URL}/exams`, exams);
                    saveOfflineCache(`${API_BASE_URL}/api/exams`, exams);
                    window._allExams = exams;
                    if (window._examsPageData) window._examsPageData.exams = exams;
                }
            }
        } else if (url.includes("/projects")) {
            let projects = getOfflineCache(`${API_URL}/projects`) || getOfflineCache(`${API_BASE_URL}/api/projects`) || window._allProjects || [];
            if (!Array.isArray(projects)) projects = [];

            if (method === "POST" && body) {
                const newProject = { id: syntheticId, status: "in_progress", ...body };
                projects = [newProject, ...projects.filter(p => String(p.id) !== String(syntheticId))];
                saveOfflineCache(`${API_URL}/projects`, projects);
                saveOfflineCache(`${API_BASE_URL}/api/projects`, projects);
                window._allProjects = projects;
                if (window._examsPageData) window._examsPageData.projects = projects;
            } else if (method === "PATCH" && url.includes("/status")) {
                const idMatch = url.match(/\/projects\/([^\/?#]+)\/status/);
                if (idMatch) {
                    const id = idMatch[1];
                    projects = projects.map(p => String(p.id) === String(id) ? { ...p, status: body?.status || "completed" } : p);
                    saveOfflineCache(`${API_URL}/projects`, projects);
                    saveOfflineCache(`${API_BASE_URL}/api/projects`, projects);
                    window._allProjects = projects;
                    if (window._examsPageData) window._examsPageData.projects = projects;
                }
            } else if (method === "PUT") {
                const idMatch = url.match(/\/projects\/([^\/?#]+)/);
                if (idMatch) {
                    const id = idMatch[1];
                    projects = projects.map(p => String(p.id) === String(id) ? { ...p, ...body } : p);
                    saveOfflineCache(`${API_URL}/projects`, projects);
                    saveOfflineCache(`${API_BASE_URL}/api/projects`, projects);
                    window._allProjects = projects;
                    if (window._examsPageData) window._examsPageData.projects = projects;
                }
            } else if (method === "DELETE") {
                const idMatch = url.match(/\/projects\/([^\/?#]+)/);
                if (idMatch) {
                    const id = idMatch[1];
                    projects = projects.filter(p => String(p.id) !== String(id));
                    saveOfflineCache(`${API_URL}/projects`, projects);
                    saveOfflineCache(`${API_BASE_URL}/api/projects`, projects);
                    window._allProjects = projects;
                    if (window._examsPageData) window._examsPageData.projects = projects;
                }
            }
        } else if (url.includes("/todos")) {
            let todos = getOfflineCache(`${API_URL}/todos`) || getOfflineCache(`${API_BASE_URL}/api/todos`) || window._dashboardActivities || [];
            if (!Array.isArray(todos)) todos = [];

            if (method === "POST" && body) {
                const newTodo = { id: syntheticId, isDone: 0, ...body };
                todos = [newTodo, ...todos.filter(t => String(t.id) !== String(syntheticId))];
                saveOfflineCache(`${API_URL}/todos`, todos);
                saveOfflineCache(`${API_BASE_URL}/api/todos`, todos);
                window._dashboardActivities = todos;
                if (window._examsPageData) {
                    window._examsPageData.activities = todos.filter(t => ["homework", "quiz", "other"].includes(t.type));
                }
            } else if (method === "PATCH" || method === "PUT") {
                const idMatch = url.match(/\/todos\/([^\/?#]+)/);
                if (idMatch) {
                    const id = idMatch[1];
                    todos = todos.map(t => String(t.id) === String(id) ? { ...t, ...body } : t);
                    saveOfflineCache(`${API_URL}/todos`, todos);
                    saveOfflineCache(`${API_BASE_URL}/api/todos`, todos);
                    window._dashboardActivities = todos;
                    if (window._examsPageData) {
                        window._examsPageData.activities = todos.filter(t => ["homework", "quiz", "other"].includes(t.type));
                    }
                }
            } else if (method === "DELETE") {
                const idMatch = url.match(/\/todos\/([^\/?#]+)/);
                if (idMatch) {
                    const id = idMatch[1];
                    todos = todos.filter(t => String(t.id) !== String(id));
                    saveOfflineCache(`${API_URL}/todos`, todos);
                    saveOfflineCache(`${API_BASE_URL}/api/todos`, todos);
                    window._dashboardActivities = todos;
                    if (window._examsPageData) {
                        window._examsPageData.activities = todos.filter(t => ["homework", "quiz", "other"].includes(t.type));
                    }
                }
            }
        } else if (url.includes("/study-sessions")) {
            let sessions = getOfflineCache(`${API_URL}/study-sessions`) || getOfflineCache(`${API_BASE_URL}/api/study-sessions`) || window._allSessions || [];
            if (!Array.isArray(sessions)) sessions = [];

            if (method === "POST" && body) {
                const newSession = { id: syntheticId, ...body };
                sessions = [newSession, ...sessions.filter(s => String(s.id) !== String(syntheticId))];
                saveOfflineCache(`${API_URL}/study-sessions`, sessions);
                saveOfflineCache(`${API_BASE_URL}/api/study-sessions`, sessions);
                window._allSessions = sessions;
            } else if (method === "PUT" && body) {
                const idMatch = url.match(/\/study-sessions\/([^\/?#]+)/);
                if (idMatch) {
                    const id = idMatch[1];
                    sessions = sessions.map(s => String(s.id) === String(id) ? { ...s, ...body } : s);
                    saveOfflineCache(`${API_URL}/study-sessions`, sessions);
                    saveOfflineCache(`${API_BASE_URL}/api/study-sessions`, sessions);
                    window._allSessions = sessions;
                }
            } else if (method === "DELETE") {
                const idMatch = url.match(/\/study-sessions\/([^\/?#]+)/);
                if (idMatch) {
                    const id = idMatch[1];
                    sessions = sessions.filter(s => String(s.id) !== String(id));
                    saveOfflineCache(`${API_URL}/study-sessions`, sessions);
                    saveOfflineCache(`${API_BASE_URL}/api/study-sessions`, sessions);
                    window._allSessions = sessions;
                }
            }
        } else if (url.includes("/day-notes")) {
            let dayNotes = getOfflineCache(`${API_URL}/day-notes`) || getOfflineCache(`${API_BASE_URL}/api/day-notes`) || window._dayNotes || [];
            if (!Array.isArray(dayNotes)) dayNotes = [];

            if (method === "POST" && body) {
                const newNote = { id: syntheticId, ...body };
                dayNotes = [...dayNotes.filter(n => String(n.id) !== String(syntheticId)), newNote];
                saveOfflineCache(`${API_URL}/day-notes`, dayNotes);
                saveOfflineCache(`${API_BASE_URL}/api/day-notes`, dayNotes);
                window._dayNotes = dayNotes;
            } else if (method === "DELETE") {
                const idMatch = url.match(/\/day-notes\/([^\/?#]+)/);
                if (idMatch) {
                    const id = idMatch[1];
                    dayNotes = dayNotes.filter(n => String(n.id) !== String(id));
                    saveOfflineCache(`${API_URL}/day-notes`, dayNotes);
                    saveOfflineCache(`${API_BASE_URL}/api/day-notes`, dayNotes);
                    window._dayNotes = dayNotes;
                }
            }
        }
    } catch (e) {
        console.warn("[Offline Optimistic Update] Error updating state:", e);
    }
}
window.applyOptimisticOfflineMutation = applyOptimisticOfflineMutation;

function queueOfflineAction(action) {
    const queue = getOfflineQueue();
    queue.push({
        id: Date.now() + "_" + Math.random().toString(36).substring(2, 7),
        ...action,
        queuedAt: new Date().toISOString()
    });
    saveOfflineQueue(queue);
    console.log("[Offline Queue] Queued action:", action);
    if (typeof showToast === "function") {
        showToast("Action saved offline. It will sync automatically when back online.", "warning");
    }
}
window.queueOfflineAction = queueOfflineAction;

async function processOfflineSyncQueue() {
    const queue = getOfflineQueue();
    if (!queue.length) return;

    console.log(`[Offline Sync] Processing ${queue.length} queued action(s)...`);
    const remaining = [];

    for (const item of queue) {
        try {
            const res = await fetch(item.url, {
                method: item.method || "POST",
                headers: item.headers || { "Content-Type": "application/json" },
                body: item.body ? JSON.stringify(item.body) : undefined
            });

            if (!res.ok && res.status < 500) {
                console.warn("[Offline Sync] Dropping invalid request (4xx):", res.status, item);
            } else if (!res.ok) {
                remaining.push(item);
            } else {
                console.log("[Offline Sync] Action synced successfully:", item.description || item.url);
            }
        } catch (e) {
            remaining.push(item);
        }
    }

    saveOfflineQueue(remaining);

    if (queue.length > remaining.length && typeof showToast === "function") {
        showToast(`${queue.length - remaining.length} offline action(s) synced successfully.`, "success");
        refreshCurrentView();
    }
}
window.processOfflineSyncQueue = processOfflineSyncQueue;

function refreshCurrentView() {
    if (!window._currentActivePage) return;
    switch (window._currentActivePage) {
        case "courses":
            if (typeof loadCourses === "function") loadCourses();
            break;
        case "exams":
            if (typeof loadExamsPage === "function") loadExamsPage();
            break;
        case "study":
            if (typeof loadStudyPage === "function") loadStudyPage(false);
            break;
        case "settings":
            if (typeof loadSettingsPage === "function") loadSettingsPage();
            break;
        case "dashboard":
        default:
            if (typeof loadDashboard === "function") loadDashboard();
            break;
    }
}
window.refreshCurrentView = refreshCurrentView;

function initOnlineOfflineListeners() {
    window.addEventListener("online", () => {
        console.log("[Network] Application is online.");
        showOfflineIndicator(false);
        refreshCurrentView();
        processOfflineSyncQueue();
    });

    window.addEventListener("offline", () => {
        console.log("[Network] Application went offline.");
        showOfflineIndicator(true);
        if (typeof showToast === "function") {
            showToast("Internet connection lost. Switched to offline mode.", "warning");
        }
    });

    if (!navigator.onLine) {
        showOfflineIndicator(true);
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initOnlineOfflineListeners);
} else {
    initOnlineOfflineListeners();
}


/* ─── CUSTOM UI NOTIFICATIONS ─────────────────────────────────────────────────*/

function ensureNotificationRoot() {
    if (document.getElementById("app-toast-root")) return;

    const style = document.createElement("style");
    style.textContent = `
        #app-toast-root {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        .app-toast {
            min-width: 280px;
            max-width: 380px;
            background: #ffffff;
            border-left: 4px solid #3b82f6;
            border-radius: 10px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.25);
            padding: 14px 16px;
            font-size: 14px;
            color: #1e293b;
            display: flex;
            align-items: flex-start;
            gap: 10px;
            animation: app-toast-in 0.2s ease-out;
        }
        .app-toast.warning { border-left-color: #f97316; }
        .app-toast.error   { border-left-color: #ef4444; }
        .app-toast.success { border-left-color: #22c55e; }
        @keyframes app-toast-in {
            from { transform: translateX(20px); opacity: 0; }
            to   { transform: translateX(0); opacity: 1; }
        }
        .app-modal-overlay {
            position: fixed;
            inset: 0;
            background: rgba(15,23,42,0.55);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .app-modal-box {
            background: #ffffff;
            border-radius: 14px;
            padding: 24px;
            width: 360px;
            max-width: 90vw;
            box-shadow: 0 20px 50px rgba(0,0,0,0.35);
        }
        .app-modal-title {
            font-size: 16px;
            font-weight: 700;
            color: #0f172a;
            margin-bottom: 8px;
        }
        .app-modal-message {
            font-size: 14px;
            color: #475569;
            margin-bottom: 20px;
            line-height: 1.5;
        }
        .app-modal-actions {
            display: flex;
            justify-content: flex-end;
            gap: 10px;
        }
        .app-modal-btn {
            padding: 8px 16px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            border: none;
            cursor: pointer;
        }
        .app-modal-btn.cancel {
            background: #f1f5f9;
            color: #334155;
        }
        .app-modal-btn.confirm {
            background: #ef4444;
            color: #ffffff;
        }
    `;
    document.head.appendChild(style);

    const root = document.createElement("div");
    root.id = "app-toast-root";
    document.body.appendChild(root);
}

function showToast(message, type) {
    ensureNotificationRoot();

    const root = document.getElementById("app-toast-root");
    const toast = document.createElement("div");
    toast.className = "app-toast " + (type || "warning");

    const icon = type === "error" ? "⛔" : type === "success" ? "✅" : "⚠️";

    toast.innerHTML = `<span>${icon}</span><span>${escapeHtml(message)}</span>`;
    root.appendChild(toast);

    setTimeout(function () {
        toast.style.transition = "opacity 0.3s";
        toast.style.opacity = "0";
        setTimeout(function () { toast.remove(); }, 300);
    }, 3500);
}

function showConfirm(title, message, confirmLabel) {
    ensureNotificationRoot();

    return new Promise(function (resolve) {
        const overlay = document.createElement("div");
        overlay.className = "app-modal-overlay";

        overlay.innerHTML = `
            <div class="app-modal-box">
                <div class="app-modal-title">${escapeHtml(title)}</div>
                <div class="app-modal-message">${escapeHtml(message)}</div>
                <div class="app-modal-actions">
                    <button class="app-modal-btn cancel">Cancel</button>
                    <button class="app-modal-btn confirm">${escapeHtml(confirmLabel || "Yes, delete")}</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        overlay.querySelector(".cancel").onclick = function () {
            overlay.remove();
            resolve(false);
        };

        overlay.querySelector(".confirm").onclick = function () {
            overlay.remove();
            resolve(true);
        };
    });
}


/* ─── STICKY PAGE HEADER ───────────────────────────────────────────────────────*/

const PAGE_META = {
    dashboard: {
        title: "Dashboard",
        subtitle: "Welcome back! Let's check your academic progress.",
        icon: "🏠"
    },
    courses: {
        title: "Grades",
        subtitle: "Manage your courses and grades.",
        icon: "📚"
    },
    exams: {
        title: "Deadlines",
        subtitle: "Track all your upcoming exam and project deadlines.",
        placeholder: "Search by course name or date...",
        icon: "📝",
        searchable: true
    },
    study: {
        title: "Study Sessions",
        subtitle: "Record and review your daily study time.",
        icon: "⏱️"
    },
    settings: {
        title: "Settings",
        subtitle: "Update your profile, grade, department, and avatar icon.",
        iconHtml: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:#60a5fa;"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`
    }
};

function updateStickyHeader(pageKey) {
    window._currentActivePage = pageKey;
    const meta = PAGE_META[pageKey] || PAGE_META.dashboard;
    const header = document.getElementById("sticky-header");

    if (!header) return;

    const iconContent = meta.iconHtml
        ? `<span class="sticky-header-icon" style="display:inline-flex; align-items:center; justify-content:center;">${meta.iconHtml}</span>`
        : `<span class="sticky-header-icon">${meta.icon}</span>`;

    const isOnline = navigator.onLine;
    const syncStatusClass = isOnline ? "online" : "offline";
    const syncStatusText = isOnline ? "Cloud Synced" : "Offline Mode";

    header.innerHTML = `
        <div class="sticky-header-left">
            ${iconContent}
            <div>
                <div class="sticky-header-title">
                    ${escapeHtml(meta.title)}
                </div>
                <div class="sticky-header-subtitle">
                    ${escapeHtml(meta.subtitle)}
                </div>
            </div>
        </div>

        <div class="sticky-header-right">
            ${
                meta.searchable
                    ? `
                        <input
                            type="text"
                            class="sticky-search"
                            placeholder="${escapeHtml(meta.placeholder || "Search...")}"
                            autocomplete="off"
                            oninput="handleStickySearch(this.value)"
                        >
                    `
                    : ""
            }

            <div class="header-notification-wrapper">
                <button type="button" class="header-icon-btn" onclick="toggleNotificationDropdown()" title="Upcoming Deadlines & Notifications" aria-label="Notifications">
                    🔔
                    <span id="headerNotificationCount" class="notification-badge-count" style="display:none;">0</span>
                </button>
                <div id="headerNotificationDropdown" class="notification-dropdown">
                    <div class="notification-dropdown-header">
                        <span>🔔 Upcoming Deadlines</span>
                        <span id="notifSubtext" style="font-size:11px; font-weight:500; color:#94a3b8;">Next 7 days</span>
                    </div>
                    <div id="headerNotificationList" class="notification-dropdown-list">
                        <div style="padding:14px; text-align:center; color:#94a3b8; font-size:12px;">No upcoming deadlines soon.</div>
                    </div>
                </div>
            </div>

            <div id="cloudSyncBadge" class="cloud-sync-badge ${syncStatusClass}">
                <span class="sync-dot"></span>
                <span id="cloudSyncBadgeText">${syncStatusText}</span>
            </div>
        </div>
    `;

    setTimeout(checkDeadlineNotifications, 120);
}

function updateCloudSyncStatus(status) {
    const badge = document.getElementById("cloudSyncBadge");
    const badgeText = document.getElementById("cloudSyncBadgeText");
    if (!badge || !badgeText) return;

    badge.classList.remove("online", "syncing", "offline");

    if (status === "syncing") {
        badge.classList.add("syncing");
        badgeText.textContent = "Syncing...";
    } else if (status === "offline" || !navigator.onLine) {
        badge.classList.add("offline");
        badgeText.textContent = "Offline Mode";
    } else {
        badge.classList.add("online");
        badgeText.textContent = "Cloud Synced";
    }
}
window.updateCloudSyncStatus = updateCloudSyncStatus;

window.addEventListener("online", () => {
    updateCloudSyncStatus("syncing");
    if (typeof processOfflineSyncQueue === "function") {
        processOfflineSyncQueue().finally(() => updateCloudSyncStatus("online"));
    } else {
        updateCloudSyncStatus("online");
    }
});

window.addEventListener("offline", () => {
    updateCloudSyncStatus("offline");
});

function toggleNotificationDropdown() {
    const dropdown = document.getElementById("headerNotificationDropdown");
    if (!dropdown) return;
    dropdown.classList.toggle("is-open");
}

document.addEventListener("click", function (e) {
    const dropdown = document.getElementById("headerNotificationDropdown");
    const wrapper = document.querySelector(".header-notification-wrapper");
    if (dropdown && dropdown.classList.contains("is-open") && wrapper && !wrapper.contains(e.target)) {
        dropdown.classList.remove("is-open");
    }
});

function checkDeadlineNotifications() {
    const exams = window._allExams || (typeof getOfflineCache === "function" ? getOfflineCache(`${API_URL}/exams`) : []) || [];
    const projects = window._allProjects || (typeof getOfflineCache === "function" ? getOfflineCache(`${API_URL}/projects`) : []) || [];
    const activities = window._dashboardActivities || (typeof getOfflineCache === "function" ? getOfflineCache(`${API_URL}/todos`) : []) || [];

    const upcoming = [];

    const checkItem = (title, courseName, type, dateStr, isDone, id) => {
        if (isDone || !dateStr) return;
        const days = calculateDaysLeft(dateStr);
        if (days !== null && days >= 0 && days <= 7) {
            upcoming.push({ title, courseName, type, dateStr, days, id });
        }
    };

    exams.forEach(e => checkItem(e.examName || "Exam", e.courseName, "Exam", e.examDate, Number(e.isDone) === 1, e.id));
    projects.forEach(p => checkItem(p.projectName || "Project", p.courseName, "Project", p.dueDate, p.status === "completed", p.id));
    activities.forEach(a => checkItem(a.title || "Activity", a.courseName, toTitleCase(a.type || "Task"), a.dueDate, Number(a.isDone) === 1, a.id));

    upcoming.sort((a, b) => a.days - b.days);

    const countBadge = document.getElementById("headerNotificationCount");
    const listEl = document.getElementById("headerNotificationList");

    if (countBadge) {
        if (upcoming.length > 0) {
            countBadge.textContent = upcoming.length;
            countBadge.style.display = "inline-block";
        } else {
            countBadge.style.display = "none";
        }
    }

    if (listEl) {
        if (!upcoming.length) {
            listEl.innerHTML = `<div style="padding:16px; text-align:center; color:#94a3b8; font-size:12px;">🎉 No pending deadlines in the next 7 days!</div>`;
        } else {
            listEl.innerHTML = upcoming.map(item => `
                <div class="notification-dropdown-item">
                    <span style="font-size:16px;">${item.type === "Exam" ? "📝" : item.type === "Project" ? "🚀" : "📌"}</span>
                    <div style="flex:1; min-width:0;">
                        <div style="font-weight:600; color:#f8fafc; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                            ${escapeHtml(item.title)}
                        </div>
                        <div style="font-size:11px; color:#94a3b8;">
                            ${escapeHtml(item.courseName || "")} • 📅 ${escapeHtml(toDateText(item.dateStr))}
                        </div>
                    </div>
                    <span style="font-size:11px; font-weight:700; color:${item.days <= 1 ? "#ef4444" : "#f59e0b"};">
                        ${item.days === 0 ? "Today!" : item.days === 1 ? "Tomorrow" : `${item.days}d left`}
                    </span>
                </div>
            `).join("");
        }
    }
}
window.checkDeadlineNotifications = checkDeadlineNotifications;

/* ─── GOOGLE CALENDAR & .ICS EXPORT UTILITIES ────────────────────────────────*/

function getGoogleCalendarUrl(title, dateStr, description) {
    if (!dateStr) return "";
    const cleanDate = dateStr.replace(/[^0-9]/g, "").slice(0, 8);
    if (cleanDate.length < 8) return "";

    const dateObj = new Date(dateStr);
    dateObj.setDate(dateObj.getDate() + 1);
    const cleanEnd = dateObj.toISOString().slice(0, 10).replace(/[^0-9]/g, "");

    const params = new URLSearchParams({
        action: "TEMPLATE",
        text: title || "Academic Deadline",
        dates: `${cleanDate}/${cleanEnd}`,
        details: description || "Tracked in Academi Buddy",
        sf: "true",
        output: "xml"
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
window.getGoogleCalendarUrl = getGoogleCalendarUrl;

function generateIcsCalendar(events) {
    const lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Academi Buddy//Academic Tracker//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH"
    ];

    (events || []).forEach((evt, idx) => {
        if (!evt.date) return;
        const cleanDate = evt.date.replace(/[^0-9]/g, "").slice(0, 8);
        if (cleanDate.length < 8) return;
        const uid = `academi-buddy-${evt.id || (Date.now() + "_" + idx)}-${cleanDate}@academibuddy.app`;
        const summary = (evt.title || "Academic Event").replace(/[,;\n\r]/g, " ");
        const dateObj = new Date(evt.date);
        dateObj.setDate(dateObj.getDate() + 1);
        const cleanEnd = dateObj.toISOString().slice(0, 10).replace(/[^0-9]/g, "");

        lines.push("BEGIN:VEVENT");
        lines.push(`UID:${uid}`);
        lines.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`);
        lines.push(`DTSTART;VALUE=DATE:${cleanDate}`);
        lines.push(`DTEND;VALUE=DATE:${cleanEnd}`);
        lines.push(`SUMMARY:${summary}`);
        if (description) lines.push(`DESCRIPTION:${description}`);
        lines.push("STATUS:CONFIRMED");
        lines.push("TRANSP:TRANSPARENT");
        lines.push("END:VEVENT");
    });

    lines.push("END:VCALENDAR");
    return lines.join("\r\n");
}
window.generateIcsCalendar = generateIcsCalendar;

function downloadAllDeadlinesIcs() {
    const events = window._lastCalendarEvents || [];
    if (!events.length) {
        showToast("No deadlines found to export.", "warning");
        return;
    }
    downloadIcsCalendar(events, "Academi_Buddy_Deadlines.ics");
}
window.downloadAllDeadlinesIcs = downloadAllDeadlinesIcs;

function downloadIcsCalendar(events, filename = "Academi_Buddy_Deadlines.ics") {
    if (!events || !events.length) {
        showToast("No deadlines found to export.", "warning");
        return;
    }
    const icsContent = generateIcsCalendar(events);
    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    if (typeof showToast === "function") {
        showToast("Calendar file (.ics) downloaded! Open it to import to Apple/Google/Outlook.", "success");
    }
}
window.downloadIcsCalendar = downloadIcsCalendar;

function openCalendarExportModal() {
    const exams = window._allExams || (typeof getOfflineCache === "function" ? getOfflineCache(`${API_URL}/exams`) : []) || [];
    const projects = window._allProjects || (typeof getOfflineCache === "function" ? getOfflineCache(`${API_URL}/projects`) : []) || [];
    const activities = window._dashboardActivities || (typeof getOfflineCache === "function" ? getOfflineCache(`${API_URL}/todos`) : []) || [];

    const upcomingEvents = [];

    exams.forEach(e => {
        if (!e.examDate) return;
        upcomingEvents.push({
            id: `exam-${e.id}`,
            title: `[Exam] ${e.courseName || ''} - ${e.examName || 'Exam'}`,
            displayTitle: `${e.examName || 'Exam'} (${e.courseName || 'Course'})`,
            date: e.examDate,
            type: "Exam",
            description: `Type: ${toTitleCase(e.examType || '')} | Instructor: ${e.instructorName || '-'}`
        });
    });

    projects.forEach(p => {
        if (!p.dueDate) return;
        upcomingEvents.push({
            id: `proj-${p.id}`,
            title: `[Project] ${p.courseName || ''} - ${p.projectName || 'Project'}`,
            displayTitle: `${p.projectName || 'Project'} (${p.courseName || 'Course'})`,
            date: p.dueDate,
            type: "Project",
            description: `Description: ${p.description || ''}`
        });
    });

    activities.forEach(a => {
        if (!a.dueDate) return;
        upcomingEvents.push({
            id: `todo-${a.id}`,
            title: `[${toTitleCase(a.type || 'Task')}] ${a.courseName || ''} - ${a.title || 'Task'}`,
            displayTitle: `${a.title || 'Task'} (${a.courseName || 'Course'})`,
            date: a.dueDate,
            type: toTitleCase(a.type || "Task"),
            description: `Task for ${a.courseName || ''}`
        });
    });

    upcomingEvents.sort((a, b) => new Date(a.date) - new Date(b.date));

    const existing = document.getElementById("calendarExportModal");
    if (existing) existing.remove();

    const modal = document.createElement("div");
    modal.className = "modal-overlay is-open";
    modal.id = "calendarExportModal";
    modal.style.position = "fixed";
    modal.style.top = "0";
    modal.style.left = "0";
    modal.style.width = "100%";
    modal.style.height = "100%";
    modal.style.backgroundColor = "rgba(0, 0, 0, 0.65)";
    modal.style.display = "flex";
    modal.style.alignItems = "center";
    modal.style.justifyContent = "center";
    modal.style.zIndex = "9999";
    modal.style.padding = "20px";

    const itemsHtml = upcomingEvents.slice(0, 8).map(evt => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:9px 12px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; margin-bottom:8px; gap:8px;">
            <div style="min-width:0; flex:1;">
                <div style="font-weight:700; font-size:12.5px; color:#1e293b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                    ${evt.type === "Exam" ? "📝" : evt.type === "Project" ? "🚀" : "📌"} ${escapeHtml(evt.displayTitle)}
                </div>
                <div style="font-size:11px; color:#64748b;">📅 ${escapeHtml(toDateText(evt.date))}</div>
            </div>
            <a
                href="${getGoogleCalendarUrl(evt.title, evt.date, evt.description)}"
                target="_blank"
                rel="noopener"
                style="padding:6px 12px; font-size:11px; font-weight:700; background:#2563eb; color:#ffffff; border-radius:6px; text-decoration:none; display:inline-flex; align-items:center; gap:4px; flex-shrink:0;"
            >
                + Google Calendar ↗
            </a>
        </div>
    `).join("");

    modal.innerHTML = `
        <div class="modal-box" style="max-width:680px; width:100%; max-height:90vh; overflow-y:auto; padding:0; background:#ffffff; border-radius:14px; box-shadow:0 25px 50px -12px rgba(0,0,0,0.4); color:#0f172a;">
            <!-- Header -->
            <div style="display:flex; justify-content:space-between; align-items:center; padding:18px 24px; background:#0f172a; color:#ffffff; border-radius:14px 14px 0 0;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <span style="font-size:24px;">📅</span>
                    <div>
                        <div style="font-size:16px; font-weight:800;">Add Deadlines to Calendar</div>
                        <div style="font-size:12px; color:#94a3b8;">Choose the easiest way to sync your academic deadlines</div>
                    </div>
                </div>
                <button type="button" onclick="document.getElementById('calendarExportModal').remove()" style="background:rgba(255,255,255,0.1); border:none; color:#ffffff; font-size:14px; font-weight:700; width:28px; height:28px; border-radius:50%; cursor:pointer;">✕</button>
            </div>

            <!-- Content Area -->
            <div style="padding:24px;">
                <!-- Method 1: Instant Google Calendar Links -->
                <div style="margin-bottom:24px;">
                    <div style="display:flex; align-items:center; gap:8px; margin-bottom:10px;">
                        <span style="background:#eff6ff; color:#2563eb; font-weight:800; font-size:11px; padding:2px 8px; border-radius:12px; border:1px solid #bfdbfe;">RECOMMENDED</span>
                        <span style="font-size:13px; font-weight:800; color:#1e293b;">Option 1: Add Directly to Google Calendar (No file download / No Outlook)</span>
                    </div>
                    <div style="font-size:12px; color:#64748b; margin-bottom:12px;">
                        Click on any deadline below to open it instantly in Google Calendar in your web browser. Zero setup required!
                    </div>
                    <div style="max-height:220px; overflow-y:auto; padding-right:4px;">
                        ${itemsHtml || '<div style="padding:12px; text-align:center; color:#94a3b8; font-size:12px;">No upcoming deadlines found.</div>'}
                    </div>
                </div>

                <hr style="border:none; border-top:1px solid #e2e8f0; margin:20px 0;">

                <!-- Method 2: Bulk .ics Export with Direct Import Link -->
                <div>
                    <div style="font-size:13px; font-weight:800; color:#1e293b; margin-bottom:6px;">
                        Option 2: Import All Deadlines at Once (${upcomingEvents.length} Events)
                    </div>
                    <div style="font-size:12px; color:#64748b; margin-bottom:14px;">
                        Want all your exams and projects in your calendar at the same time? Follow these 2 easy steps:
                    </div>

                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:14px;">
                        <button
                            type="button"
                            onclick="downloadAllDeadlinesIcs()"
                            style="padding:11px 14px; background:#f1f5f9; border:1px solid #cbd5e1; border-radius:8px; font-weight:700; font-size:12px; color:#1e293b; cursor:pointer; text-align:center; display:flex; align-items:center; justify-content:center; gap:6px;"
                        >
                            <span>📥</span> 1. Download .ics File
                        </button>
                        <a
                            href="https://calendar.google.com/calendar/u/0/r/settings/export"
                            target="_blank"
                            rel="noopener"
                            style="padding:11px 14px; background:linear-gradient(135deg, #2563eb, #1d4ed8); border:none; border-radius:8px; font-weight:700; font-size:12px; color:#ffffff; text-decoration:none; text-align:center; display:flex; align-items:center; justify-content:center; gap:6px;"
                        >
                            <span>🔗</span> 2. Open Google Import ↗
                        </a>
                    </div>

                    <!-- Helpful Notice -->
                    <div style="background:#fffbeb; border:1px solid #fef3c7; border-radius:8px; padding:12px; font-size:11.5px; color:#92400e; line-height:1.45;">
                        <strong>💡 Helpful Tip:</strong> If your computer tries to open <em>Microsoft Outlook</em> when you download the file, you can safely close Outlook. Simply click <strong>"2. Open Google Import"</strong> and drop the downloaded file directly into Google Calendar!
                    </div>
                </div>
            </div>
        </div>
    `;

    window._lastCalendarEvents = upcomingEvents;
    document.body.appendChild(modal);
}
window.openCalendarExportModal = openCalendarExportModal;

function handleStickySearch(query) {
    const lowerQuery = query.toLowerCase().trim();

    document.querySelectorAll(".add-form-box").forEach(box => {
        box.style.display = lowerQuery ? "none" : "";
    });

    document.querySelectorAll("table").forEach(table => {
        const rows = table.querySelectorAll("tbody tr");
        let anyVisible = false;

        rows.forEach(row => {
            const match = row.textContent.toLowerCase().includes(lowerQuery);
            row.style.display = match ? "" : "none";
            if (match) anyVisible = true;
        });

        const wrapper = table.closest(".session-group") || table;
        wrapper.style.display = (lowerQuery && !anyVisible) ? "none" : "";
    });
}

function fillCourseInfoByName(nameFieldId, teacherFieldId) {
    const typed = document.getElementById(nameFieldId).value.trim();
    if (!typed) return;

    const normalized = toTitleCase(typed);
    const course = (window._currentPageCourses || window._allCoursesForDeadlines || []).find(c => toTitleCase(c.courseName) === normalized);

    if (course) {
        document.getElementById(teacherFieldId).value = course.instructorName || "";
    }
}

function getDefaultAcademicTerm() {
    const stored = normalizeTermInput(getStoredLastTerm());
    if (isValidTermFormat(stored)) return stored;

    const fromCourses = (window._allCoursesForDeadlines || [])
        .concat(window._allCourses || [])
        .map(c => {
            if (c.academicYear && isValidTermFormat(c.academicYear)) {
                return normalizeTermInput(c.academicYear);
            }

            const label = getTermLabel(c);
            return isValidTermFormat(label) ? normalizeTermInput(label) : null;
        })
        .find(Boolean);

    if (fromCourses) return fromCourses;

    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const storedUser = typeof getStoredUser === "function" ? getStoredUser() : null;
    const gradeMatch = storedUser?.gradeLevel ? /(\d+)/.exec(storedUser.gradeLevel) : null;
    let gradePrefix = "4th Grade ";
    if (gradeMatch) {
        const num = parseInt(gradeMatch[1], 10);
        const suf = num === 1 ? "st" : num === 2 ? "nd" : num === 3 ? "rd" : "th";
        gradePrefix = `${num}${suf} Grade `;
    } else if (storedUser?.gradeLevel?.toLowerCase().includes("prep")) {
        gradePrefix = "Prep Year ";
    } else if (storedUser?.gradeLevel === "Other") {
        gradePrefix = "";
    }

    if (month >= 9) return `${year}-${year + 1} ${gradePrefix}Fall Term`.trim();
    if (month >= 6) return `${year - 1}-${year} ${gradePrefix}Summer Term`.trim();
    return `${year - 1}-${year} ${gradePrefix}Spring Term`.trim();
}

/*
 * Finds an existing course to attach a new deadline/study session to,
 * or quick-creates a new (ungraded) one if no match exists.
 *
 * `scope` tells us which page is calling ("exams" for the Deadlines
 * page, "study" for the Study Sessions page). Matching is done only
 * against window._currentPageCourses, which each page fills with
 * exactly the courses it's allowed to see (its own quick-added
 * courses + every grade-registered/shared course) - so a course
 * quick-added from one page never gets silently reused or
 * re-registered from another page. New courses are tagged with
 * `createdFrom: scope` so they keep showing up only on that page
 * until they're formally registered from the Grades page.
 */
async function getOrCreateCourseIdByName(courseName, instructorName, scope) {
    const normalizedName = toTitleCase(courseName);
    if (!normalizedName) return null;

    const candidates = (window._currentPageCourses && window._currentPageCourses.length)
        ? window._currentPageCourses
        : (window._allCourses || window._allCoursesForDeadlines || (typeof getOfflineCache === "function" ? getOfflineCache(`${API_URL}/courses`) : []) || []);
    const existing = candidates.find(c => toTitleCase(c.courseName) === normalizedName);

    if (existing) {
        return existing.id;
    }

    try {
        const response = await fetch(`${API_URL}/courses`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                courseName: normalizedName,
                instructorName: toTitleCase(instructorName) || "-",
                credit: 1,
                academicYear: getDefaultAcademicTerm(),
                semester: null,
                midtermWeight: 0,
                projectWeight: 0,
                passingGrade: 60,
                listedInGrades: 0,
                createdFrom: scope
            })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            console.error("Auto Course Create Error:", error);
            return null;
        }

        const created = await response.json();

        window._currentPageCourses = [...(window._currentPageCourses || []), created];

        // Keep the legacy page-specific caches in sync too, so any
        // other code still reading them (autocomplete lists, term
        // defaults, etc.) sees the freshly created course right away.
        if (scope === "study") {
            window._allCourses = window._currentPageCourses;
        } else if (scope === "exams") {
            window._allCoursesForDeadlines = window._currentPageCourses;
        }

        return created.id;
    } catch (err) {
        console.error("Auto Course Create Error:", err);
        return null;
    }
}


/* ─── MOBILE COLLAPSIBLE "ADD" FORMS ─────────────────────────────────────────*/

function toggleAddFormBox(headerEl) {
    const box = headerEl.closest(".add-form-box");
    if (!box) return;
    box.classList.toggle("is-expanded");
}

function expandAddFormBoxIfCollapsed(anyElementInsideBox) {
    if (window.innerWidth > 768) return;
    const box = anyElementInsideBox?.closest(".add-form-box");
    if (box) box.classList.add("is-expanded");
}

function scrollAppFormIntoView() {
    const mainArea = document.querySelector(".main-area");
    if (mainArea) {
        mainArea.scrollTo({ top: 0, behavior: "smooth" });
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
}


/* ─── MOBILE SIDEBAR ──────────────────────────────────────────────────────────*/

function openMobileSidebar() {
    document.getElementById("mainSidebar")?.classList.add("is-open");
    document.getElementById("sidebarOverlay")?.classList.add("is-visible");
    document.getElementById("mobileTopbar")?.classList.add("is-open");
    document.getElementById("sidebarToggleBtn")?.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
}

function closeMobileSidebar() {
    document.getElementById("mainSidebar")?.classList.remove("is-open");
    document.getElementById("sidebarOverlay")?.classList.remove("is-visible");
    document.getElementById("mobileTopbar")?.classList.remove("is-open");
    document.getElementById("sidebarToggleBtn")?.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
}

function toggleMobileSidebar() {
    const sidebar = document.getElementById("mainSidebar");
    if (sidebar?.classList.contains("is-open")) {
        closeMobileSidebar();
    } else {
        openMobileSidebar();
    }
}

document.getElementById("sidebarToggleBtn")?.addEventListener("click", toggleMobileSidebar);
document.getElementById("sidebarCloseBtn")?.addEventListener("click", closeMobileSidebar);
document.getElementById("sidebarOverlay")?.addEventListener("click", closeMobileSidebar);

document.getElementById("mainSidebar")?.querySelectorAll("button:not(.sidebar-close-btn)").forEach((btn) => {
    btn.addEventListener("click", () => {
        if (window.innerWidth <= 768) closeMobileSidebar();
    });
});

window.addEventListener("resize", () => {
    if (window.innerWidth > 768) closeMobileSidebar();
});
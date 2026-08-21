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

async function fetchJson(url) {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Request failed: ${url}`);
    }

    return response.json();
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
    const meta = PAGE_META[pageKey] || PAGE_META.dashboard;
    const header = document.getElementById("sticky-header");

    if (!header) return;

    const iconContent = meta.iconHtml
        ? `<span class="sticky-header-icon" style="display:inline-flex; align-items:center; justify-content:center;">${meta.iconHtml}</span>`
        : `<span class="sticky-header-icon">${meta.icon}</span>`;

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
    `;
}

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

    const candidates = window._currentPageCourses || [];
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
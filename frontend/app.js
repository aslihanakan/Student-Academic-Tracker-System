console.log("APP JS LOADED");

const API_URL = "/api";

/* ─── HELPERS ─────────────────────────────────────────────────────────────────*/

function formatEmpty(value) {
    if (value === null || value === undefined || value === "") return "-";
    return value;
}

function toTitleCase(value) {
    if (value === null || value === undefined) return value;

    const str = String(value).trim();
    if (!str) return str;

    return str
        .split(/\s+/)
        .map(function (word) {
            if (!word) return word;

            const first = word.charAt(0).toLocaleUpperCase("tr-TR");
            const rest = word.slice(1).toLocaleLowerCase("tr-TR");

            return first + rest;
        })
        .join(" ");
}

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

const examsPageFilters = {
    exams: "all",
    projects: "all",
    activities: "all"
};

function filterItemsByStatus(items, filter, dateKey, doneFn) {
    if (filter === "all") return items;

    return items.filter(item => {
        const done = doneFn(item);
        const days = calculateDaysLeft(item[dateKey]);

        if (filter === "completed") return !!done;
        if (filter === "overdue") return !done && days !== null && days < 0;
        if (filter === "upcoming") return !done && (days === null || days >= 0);

        return true;
    });
}

function buildStatusFilterTabs(groupKey, onclickFnName) {
    const labels = [
        { key: "all", label: "All" },
        { key: "upcoming", label: "Upcoming" },
        { key: "overdue", label: "Overdue" },
        { key: "completed", label: "Completed" }
    ];

    return `
        <div class="status-filter-tabs">
            ${labels.map(l => `
                <button
                    type="button"
                    class="status-filter-tab${examsPageFilters[groupKey] === l.key ? " active" : ""}"
                    onclick="${onclickFnName}('${l.key}')"
                >
                    ${l.label}
                </button>
            `).join("")}
        </div>
    `;
}

const OLD_COMPLETED_DAYS_THRESHOLD = 90; // ~3 ay

function isOlderThanThreeMonths(dateText) {
    const days = calculateDaysLeft(dateText);
    return days !== null && days < -OLD_COMPLETED_DAYS_THRESHOLD;
}

async function cleanupOldCompletedRecords(items, dateKey, doneFn, deleteUrlFn, kindLabel) {
    const stale = (items || []).filter(item => doneFn(item) && isOlderThanThreeMonths(item[dateKey]));

    if (!stale.length) {
        showToast(`No completed ${kindLabel} older than 3 months found.`, "success");
        return;
    }

    const confirmed = await showConfirm(
        `Delete Old Completed ${kindLabel}`,
        `${stale.length} completed ${kindLabel.toLowerCase()} older than 3 months will be permanently deleted. Continue?`,
        "Yes, delete"
    );

    if (!confirmed) return;

    try {
        const results = await Promise.all(
            stale.map(item => fetch(deleteUrlFn(item.id), { method: "DELETE" }))
        );

        const failed = results.filter(r => !r.ok).length;

        if (failed) {
            showToast(`${failed} record(s) could not be deleted.`, "error");
        } else {
            showToast(`${stale.length} old completed ${kindLabel.toLowerCase()} deleted.`, "success");
        }

        await loadExamsPage();
    } catch (err) {
        console.error("Cleanup Old Completed Records Error:", err);
        showToast("Old completed records could not be deleted.", "error");
    }
}

function cleanupOldCompletedExams() {
    const data = window._examsPageData;
    if (!data) return;

    cleanupOldCompletedRecords(
        data.exams,
        "examDate",
        e => Number(e.isDone) === 1,
        id => `${API_URL}/exams/${id}`,
        "Exams"
    );
}

function cleanupOldCompletedProjects() {
    const data = window._examsPageData;
    if (!data) return;

    cleanupOldCompletedRecords(
        data.projects,
        "dueDate",
        p => p.status === "completed",
        id => `${API_URL}/projects/${id}`,
        "Projects"
    );
}

function cleanupOldCompletedActivities() {
    const data = window._examsPageData;
    if (!data) return;

    cleanupOldCompletedRecords(
        data.activities,
        "dueDate",
        a => Number(a.isDone) === 1,
        id => `${API_URL}/todos/${id}`,
        "Activities"
    );
}

function buildFilterBarWithCleanup(groupKey, onclickFnName, cleanupFnName) {
    return `
        <div class="status-filter-bar">
            ${buildStatusFilterTabs(groupKey, onclickFnName)}
            <button
                type="button"
                class="cleanup-old-completed-btn"
                onclick="${cleanupFnName}()"
                title="Delete completed records older than 3 months"
            >
                🧹 Delete Old Completed (3mo+)
            </button>
        </div>
    `;
}

async function fetchJson(url) {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Request failed: ${url}`);
    }

    return response.json();
}


/* ─── REQUIRED FINAL GRADE CALCULATOR ──────────────────────────────────────────*/

function calcRequiredFinal(midterm, project, midtermWeight, projectWeight, passingGrade, extraGrades) {
    if (
        midtermWeight === null ||
        midtermWeight === undefined ||
        midtermWeight === "" ||
        projectWeight === null ||
        projectWeight === undefined ||
        projectWeight === ""
    ) {
        return {
            value: null,
            label: "Enter weights",
            color: "#f97316"
        };
    }

    const extras = Array.isArray(extraGrades) ? extraGrades : [];
    const mw = Number(midtermWeight) / 100;
    const pw = Number(projectWeight) / 100;
    const ew = extras.reduce((sum, item) => sum + (Number(item.weight) || 0), 0) / 100;
    const pg = Number(passingGrade);

    if (mw < 0 || pw < 0 || ew < 0 || mw + pw + ew >= 1) {
        return {
            value: null,
            label: "Invalid weights",
            color: "#ef4444"
        };
    }

    if (!Number.isFinite(pg)) {
        return {
            value: null,
            label: "Enter passing grade",
            color: "#f97316"
        };
    }

    const fw = 1 - mw - pw - ew;
    const m = midterm !== null && midterm !== undefined && midterm !== "" ? Number(midterm) : null;
    const p = project !== null && project !== undefined && project !== "" ? Number(project) : null;
    const extraHasAnyGrade = extras.some(item => item.score !== null && item.score !== undefined && item.score !== "");

    if (m === null && p === null && !extraHasAnyGrade) {
        return {
            value: null,
            label: "-",
            color: "#94a3b8"
        };
    }

    if ((m !== null && mw === 0) || (p !== null && pw === 0)) {
        return {
            value: null,
            label: "Enter weights",
            color: "#f97316"
        };
    }

    const extraEarned = extras.reduce((sum, item) => {
        const score = item.score !== null && item.score !== undefined && item.score !== "" ? Number(item.score) : 0;
        return sum + (score * (Number(item.weight) || 0) / 100);
    }, 0);

    if (fw === 0) {
        const currentGrade = (m !== null ? m * mw : 0) + (p !== null ? p * pw : 0) + extraEarned;

        if (currentGrade >= pg) {
            return { value: 0, label: "✓ Passing", color: "#22c55e" };
        }
        return { value: null, label: "✗ Impossible", color: "#ef4444" };
    }

    const earnedSoFar = (m !== null ? m * mw : 0) + (p !== null ? p * pw : 0) + extraEarned;
    const needed = (pg - earnedSoFar) / fw;

    if (needed <= 0) {
        return { value: 0, label: "✓ Passing", color: "#22c55e" };
    }

    if (needed > 100) {
        return { value: null, label: "✗ Impossible", color: "#ef4444" };
    }

    let neededColor;
    if (needed > 70) {
        neededColor = "#ef4444";
    } else if (needed >= 35) {
        neededColor = "#f97316";
    } else {
        neededColor = "#22c55e";
    }

    return {
        value: needed,
        label: needed.toFixed(1),
        color: neededColor
    };
}


/* ─── COURSE PASS/FAIL RESULT & MAKEUP (BÜT) GRADE ─────────────────────────────*/

function calcCourseResult(course) {
    const f = course.finalGrade;

    if (f === null || f === undefined || f === "") {
        return null;
    }

    const extras = Array.isArray(course.extraGrades) ? course.extraGrades : [];
    const mw = Number(course.midtermWeight ?? 0) / 100;
    const pw = Number(course.projectWeight ?? 0) / 100;
    const ew = extras.reduce((sum, item) => sum + (Number(item.weight) || 0), 0) / 100;
    const fw = 1 - mw - pw - ew;
    const pg = Number(course.passingGrade ?? 60);

    const m = course.midtermGrade !== null && course.midtermGrade !== undefined && course.midtermGrade !== "" ? Number(course.midtermGrade) : 0;
    const p = course.projectGrade !== null && course.projectGrade !== undefined && course.projectGrade !== "" ? Number(course.projectGrade) : 0;

    const extraEarned = extras.reduce((sum, item) => {
        const score = item.score !== null && item.score !== undefined && item.score !== "" ? Number(item.score) : 0;
        return sum + (score * (Number(item.weight) || 0) / 100);
    }, 0);

    const avg = (m * mw) + (p * pw) + (Number(f) * fw) + extraEarned;

    if (avg >= pg) {
        return "pass";
    }

    const makeup = course.makeupGrade;
    if (makeup !== null && makeup !== undefined && makeup !== "" && Number(makeup) >= pg) {
        return "pass";
    }

    return "fail";
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
    }
};

function updateStickyHeader(pageKey) {
    const meta = PAGE_META[pageKey] || PAGE_META.dashboard;
    const header = document.getElementById("sticky-header");

    if (!header) return;

    header.innerHTML = `
        <div class="sticky-header-left">
            <span class="sticky-header-icon">${meta.icon}</span>
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
    const course = (window._allCoursesForDeadlines || []).find(c => toTitleCase(c.courseName) === normalized);

    if (course) {
        document.getElementById(teacherFieldId).value = course.instructorName || "";
    }
}

async function getOrCreateCourseIdByName(courseName, instructorName) {
    const normalizedName = toTitleCase(courseName);
    if (!normalizedName) return null;

    const existing = (window._allCoursesForDeadlines || [])
        .concat(window._allCourses || [])
        .find(c => toTitleCase(c.courseName) === normalizedName);

    if (existing) {
        return existing.id;
    }

    try {
        const response = await fetch(`${API_URL}/courses`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                courseName: normalizedName,
                instructorName: instructorName || "-",
                credit: 1
            })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            console.error("Auto Course Create Error:", error);
            return null;
        }

        const created = await response.json();
        window._allCoursesForDeadlines = [...(window._allCoursesForDeadlines || []), created];
        window._allCourses = [...(window._allCourses || []), created];

        return created.id;
    } catch (err) {
        console.error("Auto Course Create Error:", err);
        return null;
    }
}


/* ─── DASHBOARD ───────────────────────────────────────────────────────────────*/

let calendarYear;
let calendarMonth;
let calendarDeadlines = [];

async function loadDashboard() {
    updateStickyHeader("dashboard");

    try {
        const [
            summary,
            courses,
            sessions,
            exams,
            projects,
            todos
        ] = await Promise.all([
            fetchJson(`${API_URL}/dashboard`),
            fetchJson(`${API_URL}/courses`),
            fetchJson(`${API_URL}/study-sessions`),
            fetchJson(`${API_URL}/exams`),
            fetchJson(`${API_URL}/projects`),
            fetchJson(`${API_URL}/todos`)
        ]);

        window._dashboardActivities = todos;

        const reminderActivities = todos
            .filter(t => ["homework", "quiz", "other"].includes(t.type))
            .filter(t => Number(t.isDone) !== 1)
            .map(t => ({
                ...t,
                daysLeft: calculateDaysLeft(t.dueDate)
            }))
            .sort((a, b) => (a.daysLeft ?? Infinity) - (b.daysLeft ?? Infinity))
            .slice(0, 6);

        const today = new Date();
        const todayText = today.toLocaleDateString("sv-SE");
        const weekAgo = new Date();
        weekAgo.setDate(today.getDate() - 6);
        weekAgo.setHours(0, 0, 0, 0);

        const todaySessions = sessions.filter(s => String(s.studyDate).split("T")[0] === todayText);
        const weeklySessions = sessions.filter(s => new Date(String(s.studyDate).split("T")[0] + "T00:00:00") >= weekAgo);

        const dailyTotal = todaySessions.reduce((sum, s) => sum + Number(s.hours || 0), 0).toFixed(1);
        const weeklyTotal = weeklySessions.reduce((sum, s) => sum + Number(s.hours || 0), 0).toFixed(1);

        const dailyAverage = todaySessions.length
            ? (todaySessions.reduce((s, i) => s + Number(i.hours || 0), 0) / todaySessions.length).toFixed(1)
            : 0;

        const weeklyAverage = weeklySessions.length
            ? (weeklySessions.reduce((s, i) => s + Number(i.hours || 0), 0) / 7).toFixed(1)
            : 0;

        const chartColors = ["#3b82f6", "#22c55e", "#f97316", "#8b5cf6", "#ec4899", "#14b8a6", "#f59e0b"];

        function buildDonutChart(items) {
            const total = items.reduce((sum, i) => sum + i.value, 0);
            if (total === 0) return `<div class="donut-chart empty-chart"></div>`;

            let current = 0;
            const parts = items.map((item, idx) => {
                const pct = (item.value / total) * 100;
                const start = current;
                current += pct;
                return `${chartColors[idx % chartColors.length]} ${start}% ${current}%`;
            });

            return `<div class="donut-chart" style="background:conic-gradient(${parts.join(",")});"></div>`;
        }

        function buildLegend(items) {
            const total = items.reduce((sum, i) => sum + i.value, 0);
            if (!items.length || total === 0) return `<p class="empty-text">No study data found.</p>`;

            return items.map((item, idx) => {
                const pct = Math.round((item.value / total) * 100);
                return `
                    <div class="chart-row">
                        <div class="chart-name">
                            <span class="chart-dot" style="background: ${chartColors[idx % chartColors.length]}"></span>
                            ${escapeHtml(item.label)}
                        </div>
                        <div class="chart-value">${item.value}h (${pct}%)</div>
                    </div>
                `;
            }).join("");
        }

        function groupByCourse(list) {
            const g = {};
            list.forEach(s => {
                const n = s.courseName || "Other";
                g[n] = (g[n] || 0) + Number(s.hours || 0);
            });
            return Object.keys(g).map(n => ({ label: n, value: Number(g[n].toFixed(1)) }));
        }

        function groupByDay(list) {
            const names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
            const g = {};
            list.forEach(s => {
                const n = names[new Date(String(s.studyDate).split("T")[0] + "T00:00:00").getDay()];
                g[n] = (g[n] || 0) + Number(s.hours || 0);
            });
            return Object.keys(g).map(n => ({ label: n, value: Number(g[n].toFixed(1)) }));
        }

        calendarDeadlines = [
            ...exams.map(e => ({
                title: `${e.courseName} — ${toTitleCase(e.examType)} Exam`,
                detail: `Instructor: ${formatEmpty(e.examName)}`,
                date: toDateText(e.examDate),
                type: "Exam"
            })),
            ...projects.map(p => ({
                title: `${p.courseName} — ${p.projectName}`,
                detail: `Description: ${formatEmpty(p.description)}`,
                date: toDateText(p.dueDate),
                type: "Project"
            }))
        ]
        .filter(i => i.date)
        .sort((a, b) => new Date(a.date) - new Date(b.date));

        const nearest = calendarDeadlines.length ? calendarDeadlines[0] : null;
        const nearestDays = nearest ? calculateDaysLeft(nearest.date) : null;
        const counterWidth = nearestDays !== null
            ? Math.max(8, Math.min(100, nearestDays <= 0 ? 100 : Math.max(8, 100 - nearestDays * 5)))
            : 0;

        const barColor = nearest ? "#ef4444" : "#3b82f6";

        const upcomingDeadlines = calendarDeadlines
            .slice(1)
            .map(item => ({
                ...item,
                daysLeft: calculateDaysLeft(item.date)
            }))
            .filter(item => item.daysLeft !== null && item.daysLeft >= 0 && item.daysLeft <= 10);

        calendarYear = today.getFullYear();
        calendarMonth = today.getMonth();

        const totalCourses = summary.totalCourses || courses.length || 0;
        const totalHours = summary.totalStudyHours || 0;

        document.getElementById("app").innerHTML = `
            <div class="analytics-grid">

                <div class="analytics-card">
                    <div class="analytics-top">
                        <div>
                            <h3>Daily Average</h3>
                            <div class="big-number">${dailyAverage}h</div>
                            <span class="green-label">Today</span>
                        </div>
                        ${buildDonutChart(groupByCourse(todaySessions))}
                    </div>
                    <h4>Study Time by Course</h4>
                    ${buildLegend(groupByCourse(todaySessions))}
                    <div class="chart-total">
                        <span>Total</span>
                        <strong>${dailyTotal}h</strong>
                    </div>
                </div>

                <div class="analytics-card">
                    <div class="analytics-top">
                        <div>
                            <h3>Weekly Average</h3>
                            <div class="big-number">${weeklyAverage}h</div>
                            <span class="green-label">Last 7 days</span>
                        </div>
                        ${buildDonutChart(groupByDay(weeklySessions))}
                    </div>
                    <h4>Study Time by Day</h4>
                    ${buildLegend(groupByDay(weeklySessions))}
                    <div class="chart-total">
                        <span>Total</span>
                        <strong>${weeklyTotal}h</strong>
                    </div>
                </div>

            </div>


            <div class="dashboard-main-layout">

                <div class="panel nearest-panel" style="display: flex; flex-direction: column; gap: 14px;">
                    <div style="display: grid; grid-template-columns: 1fr 215px; gap: 18px; align-items: stretch;">
                        
                        <!-- SOL BÖLÜM: Nearest Deadline & Upcoming -->
                        <div style="display: flex; flex-direction: column; justify-content: space-between; min-width: 0;">
                            <div>
                                <h2 style="margin-top: 0; margin-bottom: 12px;">Nearest Deadline</h2>
                                ${
                                    nearest
                                        ? `
                                    <div class="deadline-card" style="margin-bottom: 0;">
                                        <span class="badge badge-${nearest.type.toLowerCase()}">${escapeHtml(nearest.type)}</span>
                                        <div class="deadline-course">${escapeHtml(nearest.title)}</div>
                                        <div class="deadline-instructor">👨‍🏫 ${escapeHtml(nearest.detail)}</div>
                                        <div class="deadline-date-row">
                                            <span class="deadline-date">📅 ${escapeHtml(nearest.date)}</span>
                                            <span class="deadline-days" style="color:${barColor}; font-weight:800; font-size:20px;">
                                                ${nearestDays <= 0 ? "⚠️ Today!" : `${nearestDays} day(s) left`}
                                            </span>
                                        </div>
                                        <div class="progress-bar full">
                                            <div class="progress-fill" style="width:${counterWidth}%; background:${barColor}; transition: width 0.6s ease, background 0.4s ease"></div>
                                        </div>
                                    </div>
                                    `
                                        : `<p class="empty-text">No deadline found.</p>`
                                }
                            </div>

                            ${
                                upcomingDeadlines.length
                                    ? `
                                <div style="margin-top: 12px; display: flex; flex-direction: column;">
                                    <div style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">
                                        Upcoming (next 10 days)
                                    </div>
                                    ${upcomingDeadlines.map(item => {
                                        const itemColor = getDeadlineProximityColor(item.daysLeft);
                                        return `
                                            <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 6px 0; border-top: 1px solid #f1f5f9;">
                                                <div style="min-width: 0; display: flex; align-items: center; gap: 6px;">
                                                    <span style="flex-shrink: 0; width: 7px; height: 7px; border-radius: 50%; background: ${itemColor};"></span>
                                                    <span style="font-size: 12px; color: #334155; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                                        ${escapeHtml(item.title)}
                                                    </span>
                                                </div>
                                                <span style="flex-shrink: 0; font-size: 12px; font-weight: 700; color: ${itemColor};">
                                                    ${item.daysLeft <= 0 ? "Today!" : `${item.daysLeft} day(s) left`}
                                                </span>
                                            </div>
                                        `;
                                    }).join("")}
                                </div>
                                `
                                    : ""
                            }
                        </div>

                        <!-- SAĞ BÖLÜM: Dikey Quick Reminders Paneli -->
                        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; display: flex; flex-direction: column; height: 100%; box-sizing: border-box;">
                            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid #e2e8f0;">
                                <h3 style="margin: 0; font-size: 14px; font-weight: 700; color: #1e293b; display: flex; align-items: center; gap: 6px;">
                                    📝 Quick Reminders
                                </h3>
                                <span style="font-size: 11px; font-weight: 600; color: #64748b; background: #e2e8f0; padding: 2px 6px; border-radius: 10px;">
                                    ${reminderActivities.length}
                                </span>
                            </div>

                            <div style="display: flex; flex-direction: column; gap: 8px; overflow-y: auto; max-height: 230px; padding-right: 4px;">
                                ${
                                    reminderActivities.length
                                        ? reminderActivities.map(item => {
                                            const overdue = item.daysLeft !== null && item.daysLeft < 0;
                                            const itemColor = overdue ? "#ef4444" : getDeadlineProximityColor(item.daysLeft);
                                            const daysLabel = item.daysLeft === null ? "-" : overdue ? "Overdue" : item.daysLeft === 0 ? "Today!" : `${item.daysLeft}d left`;
                                            const formattedDueDate = toDateText(item.dueDate);

                                            return `
                                                <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; padding: 8px; background: #ffffff; border: 1px solid #edf2f7; border-radius: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
                                                    <div style="display: flex; align-items: flex-start; gap: 8px; min-width: 0;">
                                                        <input
                                                            type="checkbox"
                                                            class="done-checkbox"
                                                            style="margin-top: 2px; cursor: pointer;"
                                                            onchange="toggleDashboardReminderDone(${item.id}, this.checked)"
                                                        >
                                                        <div style="display: flex; flex-direction: column; min-width: 0;">
                                                            <div style="display: flex; align-items: center; gap: 5px;">
                                                                <span class="reminder-type-tag" style="font-size: 10px; padding: 1px 5px;">
                                                                    ${escapeHtml(toTitleCase(item.type))}
                                                                </span>
                                                                <span style="font-size: 12px; font-weight: 600; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                                                    ${escapeHtml(item.courseName)}
                                                                </span>
                                                            </div>
                                                            <span style="font-size: 11px; color: #475569; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                                                ${escapeHtml(item.title)}
                                                            </span>
                                                            ${
                                                                formattedDueDate
                                                                    ? `<span style="font-size: 10px; color: #94a3b8; margin-top: 2px;">📅 ${escapeHtml(formattedDueDate)}</span>`
                                                                    : ""
                                                            }
                                                        </div>
                                                    </div>
                                                    <span style="flex-shrink: 0; font-size: 11px; font-weight: 700; color: ${itemColor}; margin-top: 2px;">
                                                        ${daysLabel}
                                                    </span>
                                                </div>
                                            `;
                                        }).join("")
                                        : `<p class="empty-text" style="font-size: 12px; margin: 10px 0;">No pending activities.</p>`
                                }
                            </div>
                        </div>

                    </div>
                </div>

                <div class="dashboard-side-stats">
                    <div class="mini-stat-card">
                        <div class="mini-stat-icon">📚</div>
                        <div class="mini-stat-number">${totalCourses}</div>
                        <div class="mini-stat-label">Active Courses</div>
                    </div>

                    <div class="mini-stat-card">
                        <div class="mini-stat-icon">⏰</div>
                        <div class="mini-stat-number">${totalHours}h</div>
                        <div class="mini-stat-label">Total Study</div>
                    </div>
                </div>

                <div class="vertical-motivation-card">
                    <video class="motivation-video" autoplay muted loop playsinline>
                        <source src="videos/motivation.mp4" type="video/mp4">
                    </video>
                </div>

            </div>

            <div class="panel calendar-panel">
                <h2>Monthly Calendar</h2>
                <div class="calendar-nav">
                    <button class="calendar-nav-btn" onclick="changeCalendarMonth(-1)">&#8592; Previous</button>
                    <span id="calendar-month-label" class="calendar-month-label"></span>
                    <button class="calendar-nav-btn" onclick="changeCalendarMonth(1)">Next &#8594;</button>
                </div>
                <div id="calendar-content"></div>
            </div>
        `;

        renderCalendar();
    } catch (err) {
        console.error("Dashboard Load Error:", err);
        document.getElementById("app").innerHTML = `<p>Dashboard could not be loaded.</p>`;
    }
}

async function toggleDashboardReminderDone(id, isDone) {
    try {
        const response = await fetch(`${API_URL}/todos/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isDone })
        });

        if (!response.ok) {
            showToast("Activity status could not be updated.", "error");
            return;
        }

        await loadDashboard();
    } catch (err) {
        console.error("Dashboard Reminder Update Error:", err);
        showToast("Activity status could not be updated.", "error");
    }
}

function changeCalendarMonth(direction) {
    calendarMonth += direction;

    if (calendarMonth > 11) {
        calendarMonth = 0;
        calendarYear++;
    }

    if (calendarMonth < 0) {
        calendarMonth = 11;
        calendarYear--;
    }

    renderCalendar();
}

function renderCalendar() {
    const todayText = new Date().toLocaleDateString("sv-SE");
    const monthName = new Date(calendarYear, calendarMonth, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });

    document.getElementById("calendar-month-label").textContent = monthName;

    const firstDay = new Date(calendarYear, calendarMonth, 1);
    const totalDays = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    const startDay = (firstDay.getDay() + 6) % 7;

    let cells = "";

    for (let i = 0; i < startDay; i++) {
        cells += `<div class="calendar-cell empty"></div>`;
    }

    for (let day = 1; day <= totalDays; day++) {
        const dateText = `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const events = calendarDeadlines.filter(i => i.date === dateText);

        cells += `
            <div class="calendar-cell ${dateText === todayText ? "today" : ""}">
                <div class="calendar-date">${day}</div>
                ${events.map(e => `
                    <div class="calendar-event calendar-event-${e.type.toLowerCase()}">
                        ${escapeHtml(e.type)}: ${escapeHtml(e.title)}
                    </div>
                `).join("")}
            </div>
        `;
    }

    document.getElementById("calendar-content").innerHTML = `
        <div class="calendar-grid">
            <div class="calendar-weekday">Mon</div>
            <div class="calendar-weekday">Tue</div>
            <div class="calendar-weekday">Wed</div>
            <div class="calendar-weekday">Thu</div>
            <div class="calendar-weekday">Fri</div>
            <div class="calendar-weekday">Sat</div>
            <div class="calendar-weekday">Sun</div>
            ${cells}
        </div>
    `;
}


/* ─── COURSES ─────────────────────────────────────────────────────────────────*/

function getTermLabel(c) {
    const year = c.academicYear && c.academicYear !== "Unspecified" ? c.academicYear : null;
    const sem = c.semester && c.semester !== "Unspecified" ? c.semester : null;

    if (!year && !sem) {
        return "No Term Assigned";
    }

    return [year, sem].filter(Boolean).join(" ");
}

const LAST_TERM_STORAGE_KEY = "sat_last_term_text";

function getStoredLastTerm() {
    try {
        return localStorage.getItem(LAST_TERM_STORAGE_KEY) || "";
    } catch (e) {
        return "";
    }
}

function setStoredLastTerm(value) {
    try {
        localStorage.setItem(LAST_TERM_STORAGE_KEY, value || "");
    } catch (e) {}
}

const TERM_FORMAT_REGEX = /^(\d{4})-(\d{4}) (Fall|Spring|Summer)$/i;
const TERM_FORMAT_EXAMPLE = "2025-2026 Fall";

function isValidTermFormat(text) {
    const match = TERM_FORMAT_REGEX.exec((text || "").trim());
    if (!match) return false;

    const startYear = parseInt(match[1], 10);
    const endYear = parseInt(match[2], 10);

    return endYear === startYear + 1;
}

function normalizeTermInput(text) {
    const trimmed = (text || "").trim();
    const match = TERM_FORMAT_REGEX.exec(trimmed);

    if (!match) return trimmed;

    const startYear = parseInt(match[1], 10);
    const endYear = parseInt(match[2], 10);

    if (endYear !== startYear + 1) return trimmed;

    const season = match[3].toLowerCase();
    const canonicalSeason = season.charAt(0).toUpperCase() + season.slice(1);

    return `${match[1]}-${match[2]} ${canonicalSeason}`;
}

function groupCoursesByTerm(courses) {
    const groups = new Map();

    courses.forEach(c => {
        const label = getTermLabel(c);
        if (!groups.has(label)) {
            groups.set(label, []);
        }
        groups.get(label).push(c);
    });

    return groups;
}

function buildCourseRow(c, termLabel) {
    const rowTermLabel = termLabel || getTermLabel(c);
    const mw = c.midtermWeight ?? 0;
    const pw = c.projectWeight ?? 0;
    const pg = c.passingGrade ?? 60;
    const extraGrades = Array.isArray(c.extraGrades) ? c.extraGrades : [];

    const req = calcRequiredFinal(c.midtermGrade, c.projectGrade, mw, pw, pg, extraGrades);

    const extraGradesCell = extraGrades.length
        ? `
            <div style="font-size:12px;line-height:1.6;">
                ${extraGrades.map(item => `
                    <div>
                        ${escapeHtml(item.label)}:
                        <strong>${escapeHtml(formatEmpty(item.score))}</strong>
                        <span style="color:#94a3b8">(${escapeHtml(item.weight)}%)</span>
                    </div>
                `).join("")}
            </div>
        `
        : `<span style="color:#94a3b8">-</span>`;

    const reqCell = `<span style="color:${req.color}; font-weight:700">${req.label}</span>`;
    const result = calcCourseResult(c);

    const resultCell = result === "pass"
        ? `<span style="color:#22c55e;font-weight:700">✅ Pass</span>`
        : result === "fail"
            ? `<span style="color:#ef4444;font-weight:700">❌ Fail</span>`
            : `<span style="color:#94a3b8">-</span>`;

    const butValue = c.makeupGrade !== null && c.makeupGrade !== undefined && c.makeupGrade !== "" ? c.makeupGrade : "";
    const butCell = butValue !== "" ? `<span>${escapeHtml(butValue)}</span>` : `<span style="color:#94a3b8">-</span>`;

    return `
        <tr data-term="${escapeHtml(rowTermLabel)}" data-course-id="${c.id}">
            <td data-label="Course"><span class="course-name-text">${escapeHtml(c.courseName)}</span></td>
            <td data-label="Instructor">${escapeHtml(formatEmpty(c.instructorName))}</td>
            <td data-label="Credit">${escapeHtml(formatEmpty(c.credit))}</td>
            <td data-label="Midterm">${escapeHtml(formatEmpty(c.midtermGrade))}</td>
            <td data-label="Project">${escapeHtml(formatEmpty(c.projectGrade))}</td>
            <td data-label="Req. Final">${reqCell}</td>
            <td data-label="Final">${escapeHtml(formatEmpty(c.finalGrade))}</td>
            <td data-label="Result">${resultCell}</td>
            <td data-label="Makeup Grade">${butCell}</td>
            <td data-label="Extra Grades">${extraGradesCell}</td>
            <td class="action-buttons">
                <button
                    class="btn-edit"
                    onclick="editCourse(
                        ${c.id},
                        '${escapeForOnclick(c.courseName)}',
                        '${escapeForOnclick(c.instructorName)}',
                        '${escapeForOnclick(c.credit)}',
                        '${escapeForOnclick(c.midtermGrade ?? "")}',
                        '${escapeForOnclick(c.projectGrade ?? "")}',
                        '${escapeForOnclick(c.finalGrade ?? "")}',
                        '${escapeForOnclick(mw)}',
                        '${escapeForOnclick(pw)}',
                        '${escapeForOnclick(pg)}',
                        '${escapeForOnclick(c.makeupGrade ?? "")}',
                        '${escapeForOnclick(c.academicYear ?? "")}',
                        '${escapeForOnclick(c.semester ?? "")}'
                    )"
                >
                    ✏️
                </button>
                <button class="btn-delete" onclick="deleteCourse(${c.id}, '${escapeForOnclick(c.courseName)}')">
                    🗑️
                </button>
            </td>
        </tr>
    `;
}

function renderCoursesTableBody(courses) {
    const tbody = document.querySelector("#courses-table tbody");
    if (!tbody) return;

    tbody.innerHTML = courses.length
        ? courses.map(c => buildCourseRow(c)).join("")
        : `<tr><td colspan="11">No courses found.</td></tr>`;
}

async function loadCourses() {
    updateStickyHeader("courses");

    try {
        const courses = await fetchJson(`${API_URL}/courses`);
        window._coursesForGPA = courses;
        window._allCoursesForTermFilter = courses;

        const termGroups = groupCoursesByTerm(courses);
        const termKeys = [...termGroups.keys()];
        const realTermKeys = termKeys.filter(label => label !== "No Term Assigned");

        const defaultTerm = realTermKeys.length > 0 ? realTermKeys[0] : (termKeys[0] || "");
        const termOptions = termKeys.map(label => `<option value="${escapeHtml(label)}" ${label === defaultTerm ? "selected" : ""}>${escapeHtml(label)}</option>`).join("");
        const activeTermText = getStoredLastTerm();
        const termDatalistOptions = [...termGroups.keys()].filter(label => label !== "No Term Assigned").map(label => `<option value="${escapeHtml(label)}"></option>`).join("");

        const rows = courses.length
            ? [...termGroups.entries()].map(([label, group]) => `
                <tr class="term-group-header" data-term="${escapeHtml(label)}">
                    <td colspan="11" style="background:#f1f5f9; font-weight:700; color:#334155; padding:10px 14px;">
                        📅 ${escapeHtml(label)}
                        <span style="font-weight:500; color:#94a3b8;">(${group.length} course${group.length === 1 ? "" : "s"})</span>
                    </td>
                </tr>
                ${group.map(c => buildCourseRow(c, label)).join("")}
            `).join("")
            : `<tr><td colspan="11">No courses found.</td></tr>`;

        document.getElementById("app").innerHTML = `
            <div class="form-box add-form-box">
                <div class="form-box-header" onclick="toggleAddFormBox(this)">
                    <h2>Add Course</h2>
                    <span class="form-box-chevron">▾</span>
                </div>

                <div style="margin-bottom:14px; padding:10px 12px; background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px;">
                    <label for="academicYear" style="font-size:12px; color:#1e40af; display:block; margin-bottom:4px; font-weight:700;">
                        📅 Current Term (required) - format: YYYY-YYYY Fall/Spring/Summer (e.g. 2025-2026 Fall)
                    </label>
                    <input
                        type="text"
                        id="academicYear"
                        list="termHistoryList"
                        placeholder="e.g. 2025-2026 Fall"
                        value="${escapeHtml(activeTermText)}"
                        oninput="rememberActiveTerm(this.value)"
                        required
                        style="width:100%; padding:8px 10px; border-radius:8px; border:1px solid #93c5fd; font-size:14px; background:#fff; color:#1e293b;"
                    >
                    <datalist id="termHistoryList">${termDatalistOptions}</datalist>
                </div>

                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(160px,1fr)); gap:10px;">
                    <input type="text" id="courseName" placeholder="Course name">
                    <input type="text" id="instructorName" placeholder="Instructor name">
                    <input type="number" id="credit" placeholder="Credit">
                    <input type="number" id="midtermGrade" placeholder="Midterm grade" min="0" max="100" oninput="updateRequiredFinalPreview()">
                    <input type="number" id="projectGrade" placeholder="Project grade (optional)" min="0" max="100" oninput="updateRequiredFinalPreview()">
                    <input type="number" id="finalGrade" placeholder="Final grade" min="0" max="100">
                    <input type="number" id="makeupGrade" placeholder="Makeup grade (optional)" min="0" max="100">
                </div>

                <div style="display:grid; grid-template-columns: repeat(3,1fr); gap:10px; margin-top:10px; padding:12px; background:#f8fafc; border-radius:8px; border:1px solid #e2e8f0;">
                    <div>
                        <label style="font-size:12px; color:#64748b; display:block; margin-bottom:4px; font-weight:600;">Midterm Weight (%)</label>
                        <input type="number" id="midtermWeight" placeholder="e.g. 40" min="0" max="100" oninput="updateRequiredFinalPreview()">
                    </div>
                    <div>
                        <label style="font-size:12px; color:#64748b; display:block; margin-bottom:4px; font-weight:600;">Project Weight (%)</label>
                        <input type="number" id="projectWeight" placeholder="0 if no project" min="0" max="100" oninput="updateRequiredFinalPreview()">
                    </div>
                    <div>
                        <label style="font-size:12px; color:#64748b; display:block; margin-bottom:4px; font-weight:600;">Passing Grade</label>
                        <input type="number" id="passingGrade" value="60" min="0" max="100" oninput="updateRequiredFinalPreview()">
                    </div>
                </div>

                <div style="margin-top:10px; padding:12px; background:#f8fafc; border-radius:8px; border:1px solid #e2e8f0;">
                    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
                        <label style="font-size:12px; color:#64748b; font-weight:600;">Other Graded Items (optional)</label>
                        <button type="button" onclick="addExtraGradeRow()" style="font-size:12px; padding:4px 12px; background:#eff6ff; border:1px solid #93c5fd; border-radius:20px; cursor:pointer; color:#1e40af; font-weight:700;">+ Add Grade Item</button>
                    </div>
                    <div id="extraGradesList"></div>
                </div>

                <div id="required-final-preview" style="margin-top:8px; font-size:13px; color:#64748b; min-height:20px; padding:0 2px;"></div>

                <button id="courseSaveButton" onclick="saveCourse()" style="margin-top:12px;">Save Course</button>
            </div>

            <div class="tools-grid">
                <div class="form-box tool-box">
                    <h2>🔍 Search Courses</h2>
                    <input type="text" id="courseSearch" placeholder="Search by name, instructor, grade..." oninput="filterCourses(this.value)" style="margin-bottom:8px;">
                    <div id="search-stats" style="font-size:12px; color:#94a3b8; margin-bottom:8px;"></div>
                    <select id="termFilter" onchange="filterCoursesByTerm(this.value)" style="width:100%; margin-bottom:8px; padding:6px 8px; border-radius:8px; border:1px solid #cbd5e1; font-size:13px;">
                        ${termOptions}
                    </select>
                    <div style="display:flex; flex-wrap:wrap; gap:6px;">
                        <button onclick="document.getElementById('courseSearch').value=''; filterCourses('');" style="font-size:12px; padding:4px 12px; background:#f1f5f9; border:1px solid #cbd5e1; border-radius:20px; cursor:pointer; color:#475569; font-weight:500;">Clear Search</button>
                        <button onclick="applyQuickFilter('no-final')" style="font-size:12px; padding:4px 12px; background:#fef9c3; border:1px solid #fde047; border-radius:20px; cursor:pointer; color:#854d0e; font-weight:500;">Missing Final</button>
                        <button onclick="applyQuickFilter('low-midterm')" style="font-size:12px; padding:4px 12px; background:#fee2e2; border:1px solid #fca5a5; border-radius:20px; cursor:pointer; color:#991b1b; font-weight:500;">Low Midterm (&lt;50)</button>
                        <button onclick="applyQuickFilter('high-midterm')" style="font-size:12px; padding:4px 12px; background:#dcfce7; border:1px solid #86efac; border-radius:20px; cursor:pointer; color:#166534; font-weight:500;">High Midterm (≥80)</button>
                    </div>
                </div>

                <div class="form-box tool-box">
                    <h2>🎓 GPA Calculator</h2>
                    <p style="font-size:13px; color:#94a3b8; margin-bottom:12px;">Uses each course's own grade weights.</p>
                    <div id="gpa-result"><span style="color:#94a3b8; font-size:14px;">Click below to calculate your GPA.</span></div>
                    <button onclick="calculateGPA()" style="margin-top:12px;">Calculate GPA</button>
                </div>
            </div>

            <div style="margin:0 0 10px 0; display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
                <label for="tableTermFilter" style="font-weight:700; font-size:13px; color:#334155;">📅 Filter by Term:</label>
                <select id="tableTermFilter" onchange="filterCoursesByTerm(this.value)" style="padding:6px 10px; border-radius:8px; border:1px solid #cbd5e1; font-size:13px; min-width:220px;">
                    ${termOptions}
                </select>
            </div>

            <table id="courses-table">
                <thead>
                    <tr>
                        <th>Course</th>
                        <th>Instructor</th>
                        <th>Credit</th>
                        <th>Midterm</th>
                        <th>Project</th>
                        <th>Req. Final</th>
                        <th>Final</th>
                        <th>Result</th>
                        <th>Makeup Grade</th>
                        <th>Extra Grades</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        `;

        updateRequiredFinalPreview();

        if (defaultTerm) {
            filterCoursesByTerm(defaultTerm);
        } else {
            updateSearchStats();
        }
    } catch (err) {
        console.error("Courses Load Error:", err);
        document.getElementById("app").innerHTML = `<p>Courses could not be loaded.</p>`;
    }
}


/* ─── OTHER GRADED ITEMS ──────────────────────────────────────────────────────*/

let extraGradeRowCounter = 0;

function addExtraGradeRow(item) {
    const container = document.getElementById("extraGradesList");
    if (!container) return;

    const rowId = `extraGradeRow_${extraGradeRowCounter++}`;
    const label = item?.label ?? "";
    const weight = item?.weight ?? "";
    const score = item?.score ?? "";

    const row = document.createElement("div");
    row.className = "extra-grade-row";
    row.id = rowId;
    row.style.cssText = "display:grid; grid-template-columns:2fr 1fr 1fr auto; gap:8px; margin-bottom:8px; align-items:center;";

    row.innerHTML = `
        <input type="text" class="extra-grade-label" placeholder="e.g. Homework, Quiz" value="${escapeHtml(label)}" oninput="updateRequiredFinalPreview()">
        <input type="number" class="extra-grade-weight" placeholder="Weight %" min="0" max="100" value="${escapeHtml(weight)}" oninput="updateRequiredFinalPreview()">
        <input type="number" class="extra-grade-score" placeholder="Score" min="0" max="100" value="${escapeHtml(score)}" oninput="updateRequiredFinalPreview()">
        <button type="button" onclick="removeExtraGradeRow('${rowId}')" style="font-size:12px; padding:6px 10px; background:#fee2e2; border:1px solid #fca5a5; border-radius:8px; cursor:pointer; color:#991b1b; font-weight:700;">✕</button>
    `;

    container.appendChild(row);
    updateRequiredFinalPreview();
}

function removeExtraGradeRow(rowId) {
    const row = document.getElementById(rowId);
    if (row) row.remove();
    updateRequiredFinalPreview();
}

function clearExtraGradeRows() {
    const container = document.getElementById("extraGradesList");
    if (container) container.innerHTML = "";
}

function getExtraGradesFromForm() {
    const rows = document.querySelectorAll("#extraGradesList .extra-grade-row");
    const list = [];

    rows.forEach(row => {
        const labelRaw = row.querySelector(".extra-grade-label")?.value.trim() || "";
        const label = toTitleCase(labelRaw);
        const weightRaw = row.querySelector(".extra-grade-weight")?.value.trim() || "";
        const scoreRaw = row.querySelector(".extra-grade-score")?.value.trim() || "";

        if (!label && !weightRaw && !scoreRaw) return;

        list.push({
            label,
            weight: weightRaw === "" ? 0 : Number(weightRaw),
            score: scoreRaw === "" ? null : Number(scoreRaw)
        });
    });

    return list;
}


/* ─── REQUIRED FINAL LIVE PREVIEW ─────────────────────────────────────────────*/

function updateRequiredFinalPreview() {
    const midterm = document.getElementById("midtermGrade")?.value || null;
    const project = document.getElementById("projectGrade")?.value || null;
    const midtermWeight = Number(document.getElementById("midtermWeight")?.value || 0);
    const projectWeight = Number(document.getElementById("projectWeight")?.value || 0);
    const passingGrade = Number(document.getElementById("passingGrade")?.value || 60);

    const extraGrades = getExtraGradesFromForm();
    const extraWeightSum = extraGrades.reduce((sum, item) => sum + (Number(item.weight) || 0), 0);
    const preview = document.getElementById("required-final-preview");

    if (!preview) return;

    const finalWeight = 100 - midtermWeight - projectWeight - extraWeightSum;

    if (midtermWeight < 0 || projectWeight < 0 || extraWeightSum < 0 || finalWeight < 0) {
        preview.innerHTML = `<span style="color:#ef4444">⚠️ Weights cannot exceed 100%.</span>`;
        return;
    }

    if (project && projectWeight === 0) {
        preview.innerHTML = `<span style="color:#f97316">⚠️ You entered a project grade, so please enter the project weight.</span>`;
        return;
    }

    if (midterm && midtermWeight === 0) {
        preview.innerHTML = `<span style="color:#f97316">⚠️ Please enter the midterm weight.</span>`;
        return;
    }

    const extraWeightInfo = extraWeightSum > 0 ? ` · Extras: <strong>${extraWeightSum}%</strong>` : "";
    const weightInfo = `Weights → Midterm: <strong>${midtermWeight}%</strong> · Project: <strong>${projectWeight}%</strong>${extraWeightInfo} · Final: <strong>${finalWeight}%</strong>`;
    const extraHasAnyValue = extraGrades.some(item => item.label || item.weight);

    if (!midterm && !project && !extraHasAnyValue) {
        preview.innerHTML = weightInfo;
        return;
    }

    const req = calcRequiredFinal(midterm, project, midtermWeight, projectWeight, passingGrade, extraGrades);
    preview.innerHTML = `${weightInfo} &nbsp;|&nbsp; Required final to pass: <strong style="color:${req.color}">${req.label}</strong>`;
}


/* ─── QUICK FILTERS ───────────────────────────────────────────────────────────*/

function applyQuickFilter(type) {
    const rows = document.querySelectorAll("#courses-table tbody tr");
    const activeTerm = document.getElementById("tableTermFilter")?.value || document.getElementById("termFilter")?.value || "";
    let count = 0;

    rows.forEach(row => {
        if (row.classList.contains("term-group-header")) {
            row.style.display = (!activeTerm || row.dataset.term === activeTerm) ? "" : "none";
            return;
        }

        if (activeTerm && row.dataset.term !== activeTerm) {
            row.style.display = "none";
            return;
        }

        const cells = row.querySelectorAll("td");
        if (cells.length < 7) {
            row.style.display = "none";
            return;
        }

        const midterm = parseFloat(cells[3].textContent) || 0;
        const finalGrade = cells[6].textContent.trim();
        let show = false;

        if (type === "no-final") show = finalGrade === "-" || finalGrade === "";
        if (type === "low-midterm") show = midterm > 0 && midterm < 50;
        if (type === "high-midterm") show = midterm >= 80;

        row.style.display = show ? "" : "none";
        if (show) count++;
    });

    updateSearchStats(count);
}

function updateSearchStats(visible) {
    const stats = document.getElementById("search-stats");
    if (!stats) return;

    const allRows = document.querySelectorAll("#courses-table tbody tr:not(.term-group-header)");
    const total = allRows.length;
    const shown = visible !== undefined ? visible : total;

    stats.textContent = shown === total ? `Showing all ${total} courses` : `Showing ${shown} of ${total} courses`;
}

function filterCoursesByTerm(termLabel) {
    const rows = document.querySelectorAll("#courses-table tbody tr");
    let count = 0;

    rows.forEach(row => {
        if (row.classList.contains("term-group-header")) {
            row.style.display = (!termLabel || row.dataset.term === termLabel) ? "" : "none";
            return;
        }

        const match = !termLabel || row.dataset.term === termLabel;
        row.style.display = match ? "" : "none";
        if (match) count++;
    });

    const termFilterEl = document.getElementById("termFilter");
    if (termFilterEl && termFilterEl.value !== (termLabel || "")) termFilterEl.value = termLabel || "";

    const tableTermFilterEl = document.getElementById("tableTermFilter");
    if (tableTermFilterEl && tableTermFilterEl.value !== (termLabel || "")) tableTermFilterEl.value = termLabel || "";

    updateSearchStats(count);
}

function rememberActiveTerm(value) {
    setStoredLastTerm((value || "").trim());
}

function filterCourses(keyword) {
    const rows = document.querySelectorAll("#courses-table tbody tr");
    const query = keyword.toLowerCase();
    const activeTerm = document.getElementById("tableTermFilter")?.value || document.getElementById("termFilter")?.value || "";
    let count = 0;

    rows.forEach(row => {
        if (row.classList.contains("term-group-header")) {
            const termMatches = !activeTerm || row.dataset.term === activeTerm;
            row.style.display = (query || !termMatches) ? "none" : "";
            return;
        }

        if (activeTerm && row.dataset.term !== activeTerm) {
            row.style.display = "none";
            return;
        }

        const match = row.textContent.toLowerCase().includes(query);
        row.style.display = match ? "" : "none";
        if (match) count++;
    });

    updateSearchStats(count);
}


/* ─── GPA CALCULATOR ──────────────────────────────────────────────────────────*/

function calculateGPA() {
    const rows = document.querySelectorAll("#courses-table tbody tr");
    let totalCredits = 0;
    let totalPoints = 0;
    let counted = 0;

    rows.forEach(row => {
        const cells = row.querySelectorAll("td");
        if (cells.length < 7) return;

        const credit = parseFloat(cells[2].textContent) || 0;
        const midterm = parseFloat(cells[3].textContent);
        const project = parseFloat(cells[4].textContent);
        const final = parseFloat(cells[6].textContent);

        if (credit === 0) return;

        const courseId = Number(row.dataset.courseId);
        const course = window._coursesForGPA?.find(c => c.id === courseId);
        if (!course) return;

        const extraGrades = Array.isArray(course.extraGrades) ? course.extraGrades : [];
        const midtermWeight = Number(course.midtermWeight ?? 0) / 100;
        const projectWeight = Number(course.projectWeight ?? 0) / 100;
        const extraWeight = extraGrades.reduce((sum, item) => sum + (Number(item.weight) || 0), 0) / 100;
        const finalWeight = 1 - midtermWeight - projectWeight - extraWeight;

        if (Number.isNaN(final) || final < 0) return;

        const midtermValue = Number.isNaN(midterm) ? 0 : midterm;
        const projectValue = Number.isNaN(project) ? 0 : project;

        const extraEarned = extras = extraGrades.reduce((sum, item) => {
            const score = item.score !== null && item.score !== undefined && item.score !== "" ? Number(item.score) : 0;
            return sum + (score * (Number(item.weight) || 0) / 100);
        }, 0);

        const avg = (midtermValue * midtermWeight) + (projectValue * projectWeight) + (final * finalWeight) + extraEarned;

        let gpaPoint = 0;
        if (avg >= 90) gpaPoint = 4.0;
        else if (avg >= 85) gpaPoint = 3.5;
        else if (avg >= 75) gpaPoint = 3.0;
        else if (avg >= 65) gpaPoint = 2.5;
        else if (avg >= 55) gpaPoint = 2.0;
        else if (avg >= 45) gpaPoint = 1.5;

        totalPoints += gpaPoint * credit;
        totalCredits += credit;
        counted++;
    });

    const el = document.getElementById("gpa-result");
    if (counted === 0) {
        el.innerHTML = `<span style="color:#94a3b8; font-size:14px;">No complete grade data found.</span>`;
        return;
    }

    const gpa = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : "0.00";
    const gpaNum = parseFloat(gpa);

    let gpaColor = "#ef4444";
    let gpaLabel = "Needs Improvement";

    if (gpaNum >= 3.5) { gpaColor = "#22c55e"; gpaLabel = "Excellent"; }
    else if (gpaNum >= 3.0) { gpaColor = "#3b82f6"; gpaLabel = "Good"; }
    else if (gpaNum >= 2.5) { gpaColor = "#f97316"; gpaLabel = "Average"; }
    else if (gpaNum >= 2.0) { gpaColor = "#f59e0b"; gpaLabel = "Below Average"; }

    el.innerHTML = `
        <div style="text-align:center; padding:6px 0 4px;">
            <div style="font-size:52px; font-weight:800; color:${gpaColor}; line-height:1; letter-spacing:-2px;">${gpa}</div>
            <div style="font-size:13px; color:#94a3b8; margin-top:2px;">out of 4.00</div>
            <div style="display:inline-block; margin-top:10px; padding:5px 18px; background:${gpaColor}20; color:${gpaColor}; border-radius:20px; font-size:13px; font-weight:700;">${gpaLabel}</div>
            <div style="font-size:12px; color:#94a3b8; margin-top:6px;">Based on ${counted} course(s) · ${totalCredits} credits</div>
        </div>
    `;
}


/* ─── REQUIRED FINAL MANUAL CALCULATOR ────────────────────────────────────────*/

function calculateNeededFinal() {
    const midterm = document.getElementById("calcMidterm").value || null;
    const project = document.getElementById("calcProject").value || null;
    const midtermW = document.getElementById("calcMidtermW").value || 0;
    const projectW = document.getElementById("calcProjectW").value || 0;
    const passing = document.getElementById("calcPassing").value || 60;

    const req = calcRequiredFinal(midterm, project, midtermW, projectW, passing);
    const el = document.getElementById("final-calc-result");

    if (req.label === "✓ Passing") {
        el.innerHTML = `<span style="color:#22c55e; font-weight:700">✅ You already passed!</span>`;
    } else if (req.label === "✗ Impossible") {
        el.innerHTML = `<span style="color:#ef4444; font-weight:700">❌ Passing is not possible even with 100 on the final.</span>`;
    } else if (req.label === "Invalid weights") {
        el.innerHTML = `<span style="color:#ef4444; font-weight:700">⚠️ Invalid weights. Total weights cannot exceed 100%.</span>`;
    } else if (req.value === null) {
        el.innerHTML = `Enter at least one grade to calculate.`;
    } else {
        el.innerHTML = `📝 You need at least <strong style="color:${req.color}">${req.label}</strong> on the final.`;
    }
}


/* ─── SAVE COURSE ─────────────────────────────────────────────────────────────*/

async function saveCourse() {
    const course = {
        courseName: toTitleCase(document.getElementById("courseName").value.trim()),
        instructorName: toTitleCase(document.getElementById("instructorName").value.trim()),
        credit: document.getElementById("credit").value,
        academicYear: normalizeTermInput(document.getElementById("academicYear").value) || null,
        semester: null,
        midtermGrade: document.getElementById("midtermGrade").value.trim() || null,
        projectGrade: document.getElementById("projectGrade").value.trim() || null,
        finalGrade: document.getElementById("finalGrade").value.trim() || null,
        makeupGrade: document.getElementById("makeupGrade").value.trim() || null,
        midtermWeight: Number(document.getElementById("midtermWeight").value.trim() || 0),
        projectWeight: Number(document.getElementById("projectWeight").value.trim() || 0),
        passingGrade: Number(document.getElementById("passingGrade").value.trim() || 60),
        extraGrades: getExtraGradesFromForm()
    };

    if (!course.courseName || !course.instructorName || !course.credit) {
        showToast("Course name, instructor name and credit are required.", "warning");
        return;
    }

    if (!course.academicYear || !isValidTermFormat(course.academicYear)) {
        showToast(`Please enter the current term, in the format "${TERM_FORMAT_EXAMPLE}" (year-year, space, then Fall/Spring/Summer).`, "warning");
        return;
    }

    if (course.midtermWeight < 0 || course.projectWeight < 0) {
        showToast("Weights cannot be negative.", "warning");
        return;
    }

    for (const item of course.extraGrades) {
        if (!item.label) {
            showToast("Please enter a name for every extra grade item (e.g. Homework, Quiz, Attendance).", "warning");
            return;
        }
        if (!(item.weight > 0)) {
            showToast(`Please enter a weight for "${item.label}".`, "warning");
            return;
        }
    }

    const extraWeightSum = course.extraGrades.reduce((sum, item) => sum + (Number(item.weight) || 0), 0);

    if (course.midtermWeight + course.projectWeight + extraWeightSum >= 100) {
        showToast("Midterm, project and extra grade item weights must total less than 100%. The remaining percentage is automatically used for the final.", "warning");
        return;
    }

    if (course.projectGrade !== null && course.projectWeight === 0) {
        showToast("You entered a project grade. Please enter the project weight.", "warning");
        return;
    }


    try {
        const response = await fetch(`${API_URL}/courses`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(course)
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            showToast(error.message || "Course could not be saved.", "error");
            return;
        }

        await loadCourses();
    } catch (err) {
        console.error("Course Save Error:", err);
        showToast("Course could not be saved.", "error");
    }
}


/* ─── EDIT COURSE ─────────────────────────────────────────────────────────────*/

function editCourse(
    id,
    courseName,
    instructorName,
    credit,
    midtermGrade,
    projectGrade,
    finalGrade,
    midtermWeight,
    projectWeight,
    passingGrade,
    makeupGrade,
    academicYear,
    semester
) {
    document.getElementById("courseName").value = courseName;
    document.getElementById("instructorName").value = instructorName;
    document.getElementById("credit").value = credit;
    document.getElementById("academicYear").value =
        ((academicYear && academicYear !== "Unspecified") || (semester && semester !== "Unspecified"))
            ? getTermLabel({ academicYear, semester })
            : "";

    document.getElementById("midtermGrade").value = midtermGrade;
    document.getElementById("projectGrade").value = projectGrade;
    document.getElementById("finalGrade").value = finalGrade;
    document.getElementById("makeupGrade").value = makeupGrade ?? "";

    document.getElementById("midtermWeight").value = midtermWeight ?? "";
    document.getElementById("projectWeight").value = projectWeight ?? "";
    document.getElementById("passingGrade").value = passingGrade ?? 60;

    clearExtraGradeRows();

    const fullCourse = window._coursesForGPA?.find(c => c.id === id);
    const existingExtraGrades = Array.isArray(fullCourse?.extraGrades) ? fullCourse.extraGrades : [];
    existingExtraGrades.forEach(item => addExtraGradeRow(item));

    updateRequiredFinalPreview();

    const saveButton = document.getElementById("courseSaveButton");
    saveButton.textContent = "Update Course";

    saveButton.onclick = async function () {
        const updated = {
            courseName: toTitleCase(document.getElementById("courseName").value.trim()),
            instructorName: toTitleCase(document.getElementById("instructorName").value.trim()),
            credit: document.getElementById("credit").value,
            academicYear: normalizeTermInput(document.getElementById("academicYear").value) || null,
            semester: null,
            midtermGrade: document.getElementById("midtermGrade").value.trim() || null,
            projectGrade: document.getElementById("projectGrade").value.trim() || null,
            finalGrade: document.getElementById("finalGrade").value.trim() || null,
            makeupGrade: document.getElementById("makeupGrade").value.trim() || null,
            midtermWeight: Number(document.getElementById("midtermWeight").value.trim() || 0),
            projectWeight: Number(document.getElementById("projectWeight").value.trim() || 0),
            passingGrade: Number(document.getElementById("passingGrade").value.trim() || 60),
            extraGrades: getExtraGradesFromForm()
        };

        if (!updated.courseName || !updated.instructorName || !updated.credit) {
            showToast("Course name, instructor name and credit are required.", "warning");
            return;
        }

        if (!updated.academicYear || !isValidTermFormat(updated.academicYear)) {
            showToast(`Please enter the current term, in the format "${TERM_FORMAT_EXAMPLE}" (year-year, space, then Fall/Spring/Summer).`, "warning");
            return;
        }

        if (updated.midtermWeight < 0 || updated.projectWeight < 0) {
            showToast("Weights cannot be negative.", "warning");
            return;
        }

        for (const item of updated.extraGrades) {
            if (!item.label) {
                showToast("Please enter a name for every extra grade item (e.g. Homework, Quiz, Attendance).", "warning");
                return;
            }
            if (!(item.weight > 0)) {
                showToast(`Please enter a weight for "${item.label}".`, "warning");
                return;
            }
        }

        const updatedExtraWeightSum = updated.extraGrades.reduce((sum, item) => sum + (Number(item.weight) || 0), 0);

        if (updated.midtermWeight + updated.projectWeight + updatedExtraWeightSum >= 100) {
            showToast("Midterm, project and extra grade item weights must total less than 100%.", "warning");
            return;
        }

        if (updated.projectGrade !== null && updated.projectWeight === 0) {
            showToast("You entered a project grade. Please enter the project weight.", "warning");
            return;
        }


        try {
            const response = await fetch(`${API_URL}/courses/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updated)
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                showToast(error.message || "Course could not be updated.", "error");
                return;
            }

            await loadCourses();
        } catch (err) {
            console.error("Course Update Error:", err);
            showToast("Course could not be updated.", "error");
        }
    };

    scrollAppFormIntoView();
    expandAddFormBoxIfCollapsed(saveButton);
}


/* ─── DELETE COURSE ────────────────────────────────────────────────────────────*/

async function deleteCourse(id, courseName) {
    const confirmed = await showConfirm(
        "Delete Course",
        `Are you sure you want to delete "${courseName}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
        const response = await fetch(`${API_URL}/courses/${id}`, {
            method: "DELETE"
        });

        if (!response.ok) {
            showToast("Course could not be deleted.", "error");
            return;
        }

        await loadCourses();
    } catch (err) {
        console.error("Course Delete Error:", err);
        showToast("Course could not be deleted.", "error");
    }
}


/* ─── STUDY SESSIONS ──────────────────────────────────────────────────────────*/

let selectedStudyDate = null;
let editingStudySessionId = null;

async function loadStudyPage(resetToToday = true) {
    updateStickyHeader("study");

    try {
        const [courses, sessions] = await Promise.all([
            fetchJson(`${API_URL}/courses`),
            fetchJson(`${API_URL}/study-sessions`)
        ]);

        window._allCourses = courses;

        const studyCourseDatalistOptions = courses.map(c => `<option value="${escapeHtml(c.courseName)}"></option>`).join("");
        const courseFilterOptions = courses.map(c => `<option value="${escapeHtml(c.courseName)}">${escapeHtml(c.courseName)}</option>`).join("");

        const uniqueDates = [...new Set(sessions.map(s => String(s.studyDate).split("T")[0]))].sort().reverse();
        const dateFilterOptions = uniqueDates.map(d => `<option value="${d}">${d}</option>`).join("");

        window._allSessions = sessions;

        const todayText = new Date().toLocaleDateString("sv-SE");

        if (resetToToday) {
            selectedStudyDate = todayText;
        } else if (!selectedStudyDate) {
            selectedStudyDate = uniqueDates[0] || todayText;
        }

        document.getElementById("app").innerHTML = `
            <div class="form-box add-form-box">
                <div class="form-box-header" onclick="toggleAddFormBox(this)">
                    <h2 id="studyFormTitle">Add Study Session</h2>
                    <span class="form-box-chevron">▾</span>
                </div>

                <input type="text" id="studyCourseName" list="studyCourseOptions" placeholder="Type course name..." autocomplete="off">
                <datalist id="studyCourseOptions">${studyCourseDatalistOptions}</datalist>

                <input type="number" id="studyHours" placeholder="Study hours" step="0.5" min="0.5">
                <input type="text" id="studyTopic" placeholder="Studied topics">

                <button id="studySaveButton" onclick="saveStudySession()">Save Session</button>
                <button id="studyCancelButton" onclick="cancelStudyEdit()" style="display:none;">Cancel Edit</button>
            </div>

            <div class="form-box filter-box">
                <h2>🔍 Filter Sessions</h2>
                <div class="filter-row">
                    <select id="filterDate" onchange="changeStudyDateFromFilter()">
                        <option value="">All Dates</option>
                        ${dateFilterOptions}
                    </select>

                    <select id="filterCourse" onchange="renderSessionsBySelectedDate()">
                        <option value="">All Courses</option>
                        ${courseFilterOptions}
                    </select>

                    <button onclick="clearStudyFilters()">Clear Filter</button>
                </div>
            </div>

            <div class="study-day-panel">
                <div class="study-day-nav">
                    <button onclick="changeStudyDay(-1)">← Previous Day</button>
                    <div class="study-day-title">
                        <h2 id="selected-study-date-title"></h2>
                        <p id="selected-study-date-subtitle"></p>
                    </div>
                    <button id="studyGoToTodayBtn" class="study-today-btn" onclick="goToStudyToday()" style="display:none;">📍 Go to Today</button>
                </div>
                <div id="single-day-session-table"></div>
            </div>
        `;

        document.getElementById("filterDate").value = selectedStudyDate;
        renderSessionsBySelectedDate();
    } catch (err) {
        console.error("Study Page Load Error:", err);
        document.getElementById("app").innerHTML = `<p>Study sessions could not be loaded.</p>`;
    }
}

function changeStudyDateFromFilter() {
    const d = document.getElementById("filterDate").value;
    if (d) selectedStudyDate = d;
    renderSessionsBySelectedDate();
}

function changeStudyDay(direction) {
    const date = new Date(selectedStudyDate + "T00:00:00");
    date.setDate(date.getDate() + direction);
    selectedStudyDate = date.toLocaleDateString("sv-SE");

    const fd = document.getElementById("filterDate");
    if (fd) fd.value = selectedStudyDate;

    renderSessionsBySelectedDate();
}

function goToStudyToday() {
    selectedStudyDate = new Date().toLocaleDateString("sv-SE");

    const fd = document.getElementById("filterDate");
    if (fd) fd.value = selectedStudyDate;

    renderSessionsBySelectedDate();
}

function renderSessionsBySelectedDate() {
    const sessions = window._allSessions || [];
    const filterCourse = document.getElementById("filterCourse")?.value || "";
    const filterDate = document.getElementById("filterDate")?.value || "";

    if (filterDate) selectedStudyDate = filterDate;

    const dayName = new Date(selectedStudyDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "long" });

    document.getElementById("selected-study-date-title").textContent = selectedStudyDate;
    document.getElementById("selected-study-date-subtitle").textContent = dayName;

    const todayText = new Date().toLocaleDateString("sv-SE");
    const goToTodayBtn = document.getElementById("studyGoToTodayBtn");

    if (goToTodayBtn) {
        goToTodayBtn.style.display = selectedStudyDate === todayText ? "none" : "inline-block";
    }

    const filtered = sessions.filter(s => {
        return (String(s.studyDate).split("T")[0] === selectedStudyDate) &&
            (!filterCourse || s.courseName === filterCourse);
    });

    const dayTotal = filtered.reduce((sum, s) => sum + Number(s.hours || 0), 0).toFixed(1);
    const container = document.getElementById("single-day-session-table");

    if (!filtered.length) {
        container.innerHTML = `
            <div class="empty-day-box">
                <h3>No study sessions found.</h3>
                <p>There is no saved study session for ${selectedStudyDate} (${dayName}).</p>
            </div>
        `;
        return;
    }

    const rows = filtered.map(s => `
        <tr>
            <td data-label="Course">${escapeHtml(s.courseName)}</td>
            <td data-label="Duration">${escapeHtml(s.hours)}h</td>
            <td data-label="Topic">${escapeHtml(formatEmpty(s.note))}</td>
            <td class="action-buttons">
                <button
                    class="btn-edit icon-btn"
                    onclick="editStudySession(
                        ${s.id},
                        '${escapeForOnclick(s.courseName)}',
                        '${escapeForOnclick(s.hours)}',
                        '${escapeForOnclick(s.note ?? "")}'
                    )"
                >
                    ✏️
                </button>
                <button class="btn-delete icon-btn" onclick="deleteStudySession(${s.id})">
                    🗑️
                </button>
            </td>
        </tr>
    `).join("");

    container.innerHTML = `
        <div class="single-session-table-header">
            <span>Sessions for ${selectedStudyDate} (${dayName})</span>
            <strong>Total: ${dayTotal}h</strong>
        </div>
        <table>
            <thead>
                <tr>
                    <th>Course</th>
                    <th>Duration</th>
                    <th>Topic</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
    `;
}

function clearStudyFilters() {
    document.getElementById("filterDate").value = "";
    document.getElementById("filterCourse").value = "";

    const sessions = window._allSessions || [];
    const existingDates = sessions.map(s => String(s.studyDate).split("T")[0]).sort().reverse();

    selectedStudyDate = existingDates[0] || new Date().toLocaleDateString("sv-SE");
    renderSessionsBySelectedDate();
}

async function saveStudySession() {
    const enteredCourseName = toTitleCase(document.getElementById("studyCourseName").value.trim());
    const hoursValue = document.getElementById("studyHours").value;

    if (!enteredCourseName || !hoursValue) {
        showToast("Course name and study hours are required.", "warning");
        return;
    }

    if (!editingStudySessionId && selectedStudyDate) {
        const todayText = new Date().toLocaleDateString("sv-SE");

        if (selectedStudyDate !== todayText) {
            const friendlyDate = new Date(selectedStudyDate + "T00:00:00").toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric"
            });

            const confirmedPastDate = await showConfirm(
                "Add Entry For a Different Day?",
                `You are about to add a study session for ${friendlyDate}, not today. Do you want to continue?`,
                "Yes, add it"
            );

            if (!confirmedPastDate) return;
        }
    }

    const courseId = await getOrCreateCourseIdByName(enteredCourseName, null);

    if (!courseId) {
        showToast("Course could not be found or created.", "error");
        return;
    }

    const session = {
        courseId: courseId,
        studyDate: selectedStudyDate || new Date().toLocaleDateString("sv-SE"),
        hours: hoursValue,
        note: toTitleCase(document.getElementById("studyTopic").value.trim())
    };

    try {
        const url = editingStudySessionId ? `${API_URL}/study-sessions/${editingStudySessionId}` : `${API_URL}/study-sessions`;
        const method = editingStudySessionId ? "PUT" : "POST";

        const response = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(session)
        });

        if (!response.ok) {
            showToast("Study session could not be saved.", "error");
            return;
        }

        editingStudySessionId = null;
        await loadStudyPage(false);
    } catch (err) {
        console.error("Study Session Save Error:", err);
        showToast("Study session could not be saved.", "error");
    }
}

function editStudySession(id, courseName, hours, note) {
    editingStudySessionId = id;

    document.getElementById("studyCourseName").value = courseName;
    document.getElementById("studyHours").value = hours;
    document.getElementById("studyTopic").value = note;

    document.getElementById("studyFormTitle").textContent = "Edit Study Session";
    document.getElementById("studySaveButton").textContent = "Update Session";
    document.getElementById("studyCancelButton").style.display = "inline-block";

    scrollAppFormIntoView();
    expandAddFormBoxIfCollapsed(document.getElementById("studyFormTitle"));
}

function cancelStudyEdit() {
    editingStudySessionId = null;

    document.getElementById("studyCourseName").value = "";
    document.getElementById("studyHours").value = "";
    document.getElementById("studyTopic").value = "";

    document.getElementById("studyFormTitle").textContent = "Add Study Session";
    document.getElementById("studySaveButton").textContent = "Save Session";
    document.getElementById("studyCancelButton").style.display = "none";
}

async function deleteStudySession(id) {
    const confirmed = await showConfirm(
        "Delete Study Session",
        "Are you sure you want to delete this study session? This action cannot be undone."
    );

    if (!confirmed) return;

    try {
        const response = await fetch(`${API_URL}/study-sessions/${id}`, {
            method: "DELETE"
        });

        if (!response.ok) {
            showToast("Study session could not be deleted.", "error");
            return;
        }

        await loadStudyPage(false);
    } catch (err) {
        console.error("Study Session Delete Error:", err);
        showToast("Study session could not be deleted.", "error");
    }
}


/* ─── EXAMS & PROJECTS ────────────────────────────────────────────────────────*/

async function loadExamsPage() {
    updateStickyHeader("exams");

    try {
        const [courses, exams, projects, todos] = await Promise.all([
            fetchJson(`${API_URL}/courses`),
            fetchJson(`${API_URL}/exams`),
            fetchJson(`${API_URL}/projects`),
            fetchJson(`${API_URL}/todos`)
        ]);

        window._allCoursesForDeadlines = courses;
        const activities = todos.filter(t => ["homework", "quiz", "other"].includes(t.type));

        window._examsPageData = { courses, exams, projects, activities };

        const courseNameDatalistOptions = courses.map(c => `<option value="${escapeHtml(c.courseName)}"></option>`).join("");
        window._examsPageCourseOptions = courseNameDatalistOptions;

        document.getElementById("app").innerHTML = `
            <div class="form-box add-form-box">
                <div class="form-box-header" onclick="toggleAddFormBox(this)">
                    <h2>Add Exam</h2>
                    <span class="form-box-chevron">▾</span>
                </div>

                <input
                    type="text"
                    id="examCourseName"
                    list="examCourseNameOptions"
                    placeholder="Select or type a course name..."
                    autocomplete="off"
                    oninput="fillCourseInfoByName('examCourseName', 'examTeacherName')"
                >
                <datalist id="examCourseNameOptions">${courseNameDatalistOptions}</datalist>

                <input type="text" id="examTeacherName" placeholder="Instructor name">
                <input type="date" id="examDate">

                <select id="examType">
                    <option value="midterm">Midterm</option>
                    <option value="final">Final</option>
                    <option value="quiz">Quiz</option>
                    <option value="other">Other</option>
                </select>

                <button id="examSaveButton" onclick="saveExam()">Save Exam</button>
            </div>

            <div id="examsFilterTabsWrap">${buildFilterBarWithCleanup("exams", "setExamsFilter", "cleanupOldCompletedExams")}</div>

            <table>
                <thead>
                    <tr>
                        <th>Course</th>
                        <th>Instructor</th>
                        <th>Type</th>
                        <th>Date</th>
                        <th>Status</th>
                        <th>Done</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody id="examsTableBody"></tbody>
            </table>

            <div class="form-box add-form-box">
                <div class="form-box-header" onclick="toggleAddFormBox(this)">
                    <h2>Add Project</h2>
                    <span class="form-box-chevron">▾</span>
                </div>

                <input
                    type="text"
                    id="projectCourseName"
                    list="projectCourseNameOptions"
                    placeholder="Select or type a course name..."
                    autocomplete="off"
                    oninput="fillCourseInfoByName('projectCourseName', 'projectTeacherName')"
                >
                <datalist id="projectCourseNameOptions">${courseNameDatalistOptions}</datalist>

                <input type="text" id="projectTopic" placeholder="Project topic">
                <input type="text" id="projectTeacherName" placeholder="Instructor name">
                <input type="date" id="projectDueDate">

                <select id="projectStatus">
                    <option value="pending">Pending</option>
                    <option value="in progress">In Progress</option>
                    <option value="completed">Completed</option>
                </select>

                <button id="projectSaveButton" onclick="saveProject()">Save Project</button>
            </div>

            <div id="examsFilterTabsWrap">${buildFilterBarWithCleanup("exams", "setExamsFilter", "cleanupOldCompletedExams")}</div>

            <table>
                <thead>
                    <tr>
                        <th>Course</th>
                        <th>Project Topic</th>
                        <th>Instructor</th>
                        <th>Due Date</th>
                        <th>Status</th>
                        <th>Done</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody id="projectsTableBody"></tbody>
            </table>

            <div class="form-box add-form-box">
                <div class="form-box-header" onclick="toggleAddFormBox(this)">
                    <h2>Add Activity <span style="font-weight:400;color:#94a3b8;font-size:12px;">(homework, quiz, etc.)</span></h2>
                    <span class="form-box-chevron">▾</span>
                </div>

                <input type="text" id="activityCourseName" list="activityCourseNameOptions" placeholder="Select or type a course name..." autocomplete="off">
                <datalist id="activityCourseNameOptions">${courseNameDatalistOptions}</datalist>

                <select id="activityType">
                    <option value="homework">Homework</option>
                    <option value="quiz">Quiz</option>
                    <option value="other">Other</option>
                </select>

                <input type="text" id="activityTitle" placeholder="What is it? (e.g. Chapter 3 exercises)">
                <input type="date" id="activityDueDate">

                <button id="activitySaveButton" onclick="saveActivity()">Save Activity</button>
            </div>

            <div id="activitiesFilterTabsWrap">${buildFilterBarWithCleanup("activities", "setActivitiesFilter", "cleanupOldCompletedActivities")}</div>

            <table>
                <thead>
                    <tr>
                        <th>Course</th>
                        <th>Type</th>
                        <th>Title</th>
                        <th>Due Date</th>
                        <th>Status</th>
                        <th>Done</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody id="activitiesTableBody"></tbody>
            </table>
        `;

        renderExamsTableBody();
        renderProjectsTableBody();
        renderActivitiesTableBody();
    } catch (err) {
        console.error("Exams Page Error:", err);
        document.getElementById("app").innerHTML = `<p>Exams and projects could not be loaded.</p>`;
    }
}


/* ─── EXAMS: FILTERED RENDER + DONE TOGGLE ───────────────────────────────────*/

function setExamsFilter(filter) {
    examsPageFilters.exams = filter;
    document.getElementById("examsFilterTabsWrap").innerHTML = buildFilterBarWithCleanup("exams", "setExamsFilter", "cleanupOldCompletedExams");
    renderExamsTableBody();
}

function renderExamsTableBody() {
    const data = window._examsPageData;
    if (!data) return;

    const filtered = filterItemsByStatus(data.exams, examsPageFilters.exams, "examDate", e => Number(e.isDone) === 1);

    document.getElementById("examsTableBody").innerHTML = filtered.length
        ? filtered.map(e => `
            <tr>
                <td data-label="Course">${escapeHtml(e.courseName)}</td>
                <td data-label="Instructor">${escapeHtml(e.examName)}</td>
                <td data-label="Type">${escapeHtml(toTitleCase(e.examType))}</td>
                <td data-label="Date">${escapeHtml(toDateText(e.examDate))}</td>
                <td data-label="Status">${formatStatusCell(e.examDate, Number(e.isDone) === 1)}</td>
                <td data-label="Done" class="done-cell">
                    <input type="checkbox" class="done-checkbox" ${Number(e.isDone) === 1 ? "checked" : ""} onchange="toggleExamDone(${e.id}, this.checked)">
                </td>
                <td class="action-buttons">
                    <button
                        class="btn-edit"
                        onclick="editExam(
                            ${e.id},
                            '${escapeForOnclick(e.courseName)}',
                            '${escapeForOnclick(e.examName)}',
                            '${escapeForOnclick(toDateText(e.examDate))}',
                            '${escapeForOnclick(e.examType)}',
                            '${escapeForOnclick(e.score ?? "")}'
                        )"
                    >
                        ✏️
                    </button>
                    <button class="btn-delete" onclick="deleteExam(${e.id})">🗑️</button>
                </td>
            </tr>
        `).join("")
        : `<tr><td colspan="7">No exams found for this filter.</td></tr>`;
}

async function toggleExamDone(id, isDone) {
    try {
        const response = await fetch(`${API_URL}/exams/${id}/status`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isDone })
        });

        if (!response.ok) {
            showToast("Exam status could not be updated.", "error");
            return;
        }

        const exam = window._examsPageData.exams.find(e => e.id === id);
        if (exam) exam.isDone = isDone ? 1 : 0;

        renderExamsTableBody();
    } catch (err) {
        console.error("Exam Status Update Error:", err);
        showToast("Exam status could not be updated.", "error");
    }
}


/* ─── PROJECTS: FILTERED RENDER + DONE TOGGLE ────────────────────────────────*/

function setProjectsFilter(filter) {
    examsPageFilters.projects = filter;
    document.getElementById("projectsFilterTabsWrap").innerHTML = buildFilterBarWithCleanup("projects", "setProjectsFilter", "cleanupOldCompletedProjects");
    renderProjectsTableBody();
}

function renderProjectsTableBody() {
    const data = window._examsPageData;
    if (!data) return;

    const filtered = filterItemsByStatus(data.projects, examsPageFilters.projects, "dueDate", p => p.status === "completed");

    document.getElementById("projectsTableBody").innerHTML = filtered.length
        ? filtered.map(p => `
            <tr>
                <td data-label="Course">${escapeHtml(p.courseName)}</td>
                <td data-label="Project Topic">${escapeHtml(p.projectName)}</td>
                <td data-label="Instructor">${escapeHtml(formatEmpty(p.description))}</td>
                <td data-label="Due Date">${escapeHtml(toDateText(p.dueDate))}</td>
                <td data-label="Status">${formatStatusCell(p.dueDate, p.status === "completed")}</td>
                <td data-label="Done" class="done-cell">
                    <input type="checkbox" class="done-checkbox" ${p.status === "completed" ? "checked" : ""} onchange="toggleProjectDone(${p.id}, this.checked)">
                </td>
                <td class="action-buttons">
                    <button
                        class="btn-edit"
                        onclick="editProject(
                            ${p.id},
                            '${escapeForOnclick(p.courseName)}',
                            '${escapeForOnclick(p.projectName)}',
                            '${escapeForOnclick(toDateText(p.dueDate))}',
                            '${escapeForOnclick(p.description ?? "")}',
                            '${escapeForOnclick(p.status)}',
                            '${escapeForOnclick(p.score ?? "")}'
                        )"
                    >
                        ✏️
                    </button>
                    <button class="btn-delete" onclick="deleteProject(${p.id})">🗑️</button>
                </td>
            </tr>
        `).join("")
        : `<tr><td colspan="7">No projects found for this filter.</td></tr>`;
}

async function toggleProjectDone(id, isDone) {
    try {
        const response = await fetch(`${API_URL}/projects/${id}/status`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: isDone ? "completed" : "pending" })
        });

        if (!response.ok) {
            showToast("Project status could not be updated.", "error");
            return;
        }

        const project = window._examsPageData.projects.find(p => p.id === id);
        if (project) project.status = isDone ? "completed" : "pending";

        renderProjectsTableBody();
    } catch (err) {
        console.error("Project Status Update Error:", err);
        showToast("Project status could not be updated.", "error");
    }
}


/* ─── EXTRA ACTIVITIES: CRUD + FILTERED RENDER ──────────────────────────────*/

async function saveActivity() {
    const courseNameInput = toTitleCase(document.getElementById("activityCourseName").value.trim());
    const type = document.getElementById("activityType").value;
    const title = document.getElementById("activityTitle").value.trim();
    const dueDate = document.getElementById("activityDueDate").value;

    if (!courseNameInput || !title || !dueDate) {
        showToast("Course, title and due date are required.", "warning");
        return;
    }

    try {
        const courseId = await getOrCreateCourseIdByName(courseNameInput, "-");

        if (!courseId) {
            showToast("Course could not be found or created.", "error");
            return;
        }

        const response = await fetch(`${API_URL}/todos`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ courseId, type, title, dueDate })
        });

        if (!response.ok) {
            showToast("Activity could not be saved.", "error");
            return;
        }

        document.getElementById("activityCourseName").value = "";
        document.getElementById("activityTitle").value = "";
        document.getElementById("activityDueDate").value = "";

        await loadExamsPage();
    } catch (err) {
        console.error("Activity Save Error:", err);
        showToast("Activity could not be saved.", "error");
    }
}

async function deleteActivity(id) {
    const confirmed = await showConfirm(
        "Delete Activity",
        "Are you sure you want to delete this activity? This action cannot be undone."
    );

    if (!confirmed) return;

    try {
        const response = await fetch(`${API_URL}/todos/${id}`, {
            method: "DELETE"
        });

        if (!response.ok) {
            showToast("Activity could not be deleted.", "error");
            return;
        }

        await loadExamsPage();
    } catch (err) {
        console.error("Activity Delete Error:", err);
        showToast("Activity could not be deleted.", "error");
    }
}

function setActivitiesFilter(filter) {
    examsPageFilters.activities = filter;
    document.getElementById("activitiesFilterTabsWrap").innerHTML = buildFilterBarWithCleanup("activities", "setActivitiesFilter", "cleanupOldCompletedActivities");
    renderActivitiesTableBody();
}

function renderActivitiesTableBody() {
    const data = window._examsPageData;
    if (!data) return;

    const filtered = filterItemsByStatus(data.activities, examsPageFilters.activities, "dueDate", a => Number(a.isDone) === 1);

    document.getElementById("activitiesTableBody").innerHTML = filtered.length
        ? filtered.map(a => `
            <tr>
                <td data-label="Course">${escapeHtml(a.courseName)}</td>
                <td data-label="Type">${escapeHtml(toTitleCase(a.type))}</td>
                <td data-label="Title">${escapeHtml(a.title)}</td>
                <td data-label="Due Date">${escapeHtml(toDateText(a.dueDate))}</td>
                <td data-label="Status">${formatStatusCell(a.dueDate, Number(a.isDone) === 1)}</td>
                <td data-label="Done" class="done-cell">
                    <input type="checkbox" class="done-checkbox" ${Number(a.isDone) === 1 ? "checked" : ""} onchange="toggleActivityDone(${a.id}, this.checked)">
                </td>
                <td class="action-buttons">
                    <button class="btn-delete" onclick="deleteActivity(${a.id})">🗑️</button>
                </td>
            </tr>
        `).join("")
        : `<tr><td colspan="7">No activities found for this filter.</td></tr>`;
}

async function toggleActivityDone(id, isDone) {
    try {
        const response = await fetch(`${API_URL}/todos/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isDone })
        });

        if (!response.ok) {
            showToast("Activity status could not be updated.", "error");
            return;
        }

        const activity = window._examsPageData.activities.find(a => a.id === id);
        if (activity) activity.isDone = isDone ? 1 : 0;

        renderActivitiesTableBody();
    } catch (err) {
        console.error("Activity Status Update Error:", err);
        showToast("Activity status could not be updated.", "error");
    }
}

async function saveExam() {
    const courseNameInput = toTitleCase(document.getElementById("examCourseName").value.trim());
    const examName = toTitleCase(document.getElementById("examTeacherName").value.trim());
    const examDate = document.getElementById("examDate").value;
    const examType = document.getElementById("examType").value;

    if (!courseNameInput || !examName || !examDate || !examType) {
        showToast("Course, instructor name, date and exam type are required.", "warning");
        return;
    }

    try {
        const courseId = await getOrCreateCourseIdByName(courseNameInput, examName);

        if (!courseId) {
            showToast("Course could not be found or created.", "error");
            return;
        }

        const exam = { courseId, examName, examDate, examType, score: "" };

        const response = await fetch(`${API_URL}/exams`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(exam)
        });

        if (!response.ok) {
            showToast("Exam could not be saved.", "error");
            return;
        }

        await loadExamsPage();
    } catch (err) {
        console.error("Exam Save Error:", err);
        showToast("Exam could not be saved.", "error");
    }
}

async function deleteExam(id) {
    const confirmed = await showConfirm(
        "Delete Exam",
        "Are you sure you want to delete this exam? This action cannot be undone."
    );

    if (!confirmed) return;

    try {
        const response = await fetch(`${API_URL}/exams/${id}`, {
            method: "DELETE"
        });

        if (!response.ok) {
            showToast("Exam could not be deleted.", "error");
            return;
        }

        await loadExamsPage();
    } catch (err) {
        console.error("Exam Delete Error:", err);
        showToast("Exam could not be deleted.", "error");
    }
}

function editExam(id, courseName, examName, examDate, examType, score) {
    document.getElementById("examCourseName").value = courseName;
    document.getElementById("examTeacherName").value = examName;
    document.getElementById("examDate").value = examDate;
    document.getElementById("examType").value = examType;

    const saveButton = document.getElementById("examSaveButton");
    saveButton.textContent = "Update Exam";

    saveButton.onclick = async function () {
        const courseNameInput = toTitleCase(document.getElementById("examCourseName").value.trim());
        const examNameInput = toTitleCase(document.getElementById("examTeacherName").value.trim());
        const examDateInput = document.getElementById("examDate").value;
        const examTypeInput = document.getElementById("examType").value;

        if (!courseNameInput || !examNameInput || !examDateInput || !examTypeInput) {
            showToast("Course, instructor name, date and exam type are required.", "warning");
            return;
        }

        try {
            const courseId = await getOrCreateCourseIdByName(courseNameInput, examNameInput);

            if (!courseId) {
                showToast("Course could not be found or created.", "error");
                return;
            }

            const response = await fetch(`${API_URL}/exams/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    courseId,
                    examName: examNameInput,
                    examDate: examDateInput,
                    examType: examTypeInput,
                    score
                })
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                showToast(error.message || "Exam could not be updated.", "error");
                return;
            }

            await loadExamsPage();
        } catch (err) {
            console.error("Exam Update Error:", err);
            showToast("Exam could not be updated.", "error");
        }
    };

    scrollAppFormIntoView();
    expandAddFormBoxIfCollapsed(saveButton);
}

async function saveProject() {
    const courseNameInput = toTitleCase(document.getElementById("projectCourseName").value.trim());
    const projectName = toTitleCase(document.getElementById("projectTopic").value.trim());
    const dueDate = document.getElementById("projectDueDate").value;
    const description = toTitleCase(document.getElementById("projectTeacherName").value.trim());
    const status = document.getElementById("projectStatus").value;

    if (!courseNameInput || !projectName || !dueDate) {
        showToast("Course, project topic and due date are required.", "warning");
        return;
    }

    try {
        const courseId = await getOrCreateCourseIdByName(courseNameInput, description);

        if (!courseId) {
            showToast("Course could not be found or created.", "error");
            return;
        }

        const project = { courseId, projectName, dueDate, description, score: "", status };

        const response = await fetch(`${API_URL}/projects`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(project)
        });

        if (!response.ok) {
            showToast("Project could not be saved.", "error");
            return;
        }

        await loadExamsPage();
    } catch (err) {
        console.error("Project Save Error:", err);
        showToast("Project could not be saved.", "error");
    }
}

async function deleteProject(id) {
    const confirmed = await showConfirm(
        "Delete Project",
        "Are you sure you want to delete this project? This action cannot be undone."
    );

    if (!confirmed) return;

    try {
        const response = await fetch(`${API_URL}/projects/${id}`, {
            method: "DELETE"
        });

        if (!response.ok) {
            showToast("Project could not be deleted.", "error");
            return;
        }

        await loadExamsPage();
    } catch (err) {
        console.error("Project Delete Error:", err);
        showToast("Project could not be deleted.", "error");
    }
}

function editProject(id, courseName, projectName, dueDate, description, status, score) {
    document.getElementById("projectCourseName").value = courseName;
    document.getElementById("projectTopic").value = projectName;
    document.getElementById("projectTeacherName").value = description;
    document.getElementById("projectDueDate").value = dueDate;
    document.getElementById("projectStatus").value = status;

    const saveButton = document.getElementById("projectSaveButton");
    saveButton.textContent = "Update Project";

    saveButton.onclick = async function () {
        const courseNameInput = toTitleCase(document.getElementById("projectCourseName").value.trim());
        const projectNameInput = toTitleCase(document.getElementById("projectTopic").value.trim());
        const dueDateInput = document.getElementById("projectDueDate").value;
        const descriptionInput = toTitleCase(document.getElementById("projectTeacherName").value.trim());
        const statusInput = document.getElementById("projectStatus").value;

        if (!courseNameInput || !projectNameInput || !dueDateInput) {
            showToast("Course, project topic and due date are required.", "warning");
            return;
        }

        try {
            const courseId = await getOrCreateCourseIdByName(courseNameInput, descriptionInput);

            if (!courseId) {
                showToast("Course could not be found or created.", "error");
                return;
            }

            const response = await fetch(`${API_URL}/projects/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    courseId,
                    projectName: projectNameInput,
                    dueDate: dueDateInput,
                    description: descriptionInput,
                    status: statusInput,
                    score
                })
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                showToast(error.message || "Project could not be updated.", "error");
                return;
            }

            await loadExamsPage();
        } catch (err) {
            console.error("Project Update Error:", err);
            showToast("Project could not be updated.", "error");
        }
    };

    scrollAppFormIntoView();
    expandAddFormBoxIfCollapsed(saveButton);
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


/* ─── EVENTS ──────────────────────────────────────────────────────────────────*/

document.getElementById("dashboardBtn")?.addEventListener("click", loadDashboard);
document.getElementById("coursesBtn")?.addEventListener("click", loadCourses);
document.getElementById("examsBtn")?.addEventListener("click", loadExamsPage);
document.getElementById("studyBtn")?.addEventListener("click", loadStudyPage);


/* ─── START ───────────────────────────────────────────────────────────────────*/

window.onAuthenticated = loadDashboard;
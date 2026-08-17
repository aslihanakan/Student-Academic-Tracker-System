console.log("APP JS LOADED");

const API_URL = "/api";

/* ─── HELPERS ─────────────────────────────────────────────────────────────────*/

function formatEmpty(value) {
    if (value === null || value === undefined || value === "") return "-";
    return value;
}

/*
 * Normalizes free-text names (course names, instructor names) to a
 * consistent Title Case, regardless of how the user typed them in.
 * "calculus 2" / "CALCULUS 2" / "Calculus 2" all become "Calculus 2".
 * Locale-aware (tr-TR) so Turkish letters (İ/I/ı/i) capitalize correctly.
 */
function toTitleCase(value) {
    if (value === null || value === undefined) return value;

    const str = String(value).trim();

    if (!str) return str;

    return str
        .split(/\s+/)
        .map(function (word) {
            if (!word) return word;

            const first =
                word.charAt(0).toLocaleUpperCase("tr-TR");

            const rest =
                word.slice(1).toLocaleLowerCase("tr-TR");

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

    return Math.ceil(
        (targetDate - today) / (1000 * 60 * 60 * 24)
    );
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

/*
 * Banded green -> orange -> red color based on how many days are
 * left, used for the "upcoming deadlines" list on the dashboard:
 *   8-10 days  -> green   (plenty of time)
 *   5-7 days   -> orange  (getting close)
 *   3-4 days   -> red-leaning orange (close)
 *   0-2 days   -> red     (urgent / today)
 */
function getDeadlineProximityColor(days) {
    if (days === null || days === undefined) return "#94a3b8";

    if (days <= 2) return "#ef4444";   // red
    if (days <= 4) return "#f0653d";   // red-leaning orange
    if (days <= 7) return "#f97316";   // orange
    return "#22c55e";                   // green
}

async function fetchJson(url) {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Request failed: ${url}`);
    }

    return response.json();
}


/* ─── REQUIRED FINAL GRADE CALCULATOR ──────────────────────────────────────────*/

/*
 * IMPORTANT:
 *
 * The system DOES NOT assign default 30% weights anymore.
 *
 * Example:
 * Midterm = 40%
 * Project = empty / 0%
 * Final = automatically 60%
 *
 * OR
 *
 * Midterm = 30%
 * Project = 20%
 * Final = automatically 50%
 */

function calcRequiredFinal(midterm, project, midtermWeight, projectWeight, passingGrade) {
    // Weights must be entered by the user.
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

    // Weights come in as percentages (e.g. 40 for 40%), convert to fractions.
    const mw = Number(midtermWeight) / 100;
    const pw = Number(projectWeight) / 100;
    const pg = Number(passingGrade);

    if (mw < 0 || pw < 0 || mw + pw >= 1) {
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

    const fw = 1 - mw - pw;

    const m =
        midterm !== null &&
        midterm !== undefined &&
        midterm !== ""
            ? Number(midterm)
            : null;

    const p =
        project !== null &&
        project !== undefined &&
        project !== ""
            ? Number(project)
            : null;

    // No grades entered
    if (m === null && p === null) {
        return {
            value: null,
            label: "-",
            color: "#94a3b8"
        };
    }

    /*
     * Defensive guard:
     * A grade was entered but its weight is 0 (e.g. old/legacy
     * records saved before weight validation existed, or bad data).
     * Computing against a 0% weight silently discards that grade and
     * makes the result collapse onto the passing grade. Treat this
     * as "weight missing" instead of calculating with it.
     */
    if (
        (m !== null && mw === 0) ||
        (p !== null && pw === 0)
    ) {
        return {
            value: null,
            label: "Enter weights",
            color: "#f97316"
        };
    }

    // If final weight is 0, we cannot calculate a required final
    if (fw === 0) {
        const currentGrade =
            (m !== null ? m * mw : 0) +
            (p !== null ? p * pw : 0);

        if (currentGrade >= pg) {
            return {
                value: 0,
                label: "✓ Passing",
                color: "#22c55e"
            };
        }

        return {
            value: null,
            label: "✗ Impossible",
            color: "#ef4444"
        };
    }

    const earnedSoFar =
        (m !== null ? m * mw : 0) +
        (p !== null ? p * pw : 0);

    const needed = (pg - earnedSoFar) / fw;

    if (needed <= 0) {
        return {
            value: 0,
            label: "✓ Passing",
            color: "#22c55e"
        };
    }

    if (needed > 100) {
        return {
            value: null,
            label: "✗ Impossible",
            color: "#ef4444"
        };
    }

    let neededColor;

    if (needed > 70) {
        neededColor = "#ef4444";   // red — need a high final score
    } else if (needed >= 35) {
        neededColor = "#f97316";   // orange — moderate final score needed
    } else {
        neededColor = "#22c55e";   // green — only a low final score needed
    }

    return {
        value: needed,
        label: needed.toFixed(1),
        color: neededColor
    };
}


/* ─── COURSE PASS/FAIL RESULT & MAKEUP (BÜT) GRADE ─────────────────────────────*/

/*
 * Once a final grade has been entered for a course, this computes
 * the weighted overall average (midterm + project + final, using
 * the course's own weights) and compares it against the passing
 * grade to decide Pass / Fail.
 *
 * If the weighted average is below the passing grade, but a makeup
 * ("büt") grade has been entered and that makeup grade itself meets
 * or exceeds the passing grade, the course is treated as passed.
 *
 * Returns:
 *   null    -> no final grade entered yet (nothing to evaluate)
 *   "pass"  -> weighted average (or makeup grade) reached the passing grade
 *   "fail"  -> weighted average is below the passing grade and no
 *              passing makeup grade was entered
 */
function calcCourseResult(course) {
    const f = course.finalGrade;

    if (f === null || f === undefined || f === "") {
        return null;
    }

    const mw = Number(course.midtermWeight ?? 0) / 100;
    const pw = Number(course.projectWeight ?? 0) / 100;
    const fw = 1 - mw - pw;
    const pg = Number(course.passingGrade ?? 60);

    const m =
        course.midtermGrade !== null &&
        course.midtermGrade !== undefined &&
        course.midtermGrade !== ""
            ? Number(course.midtermGrade)
            : 0;

    const p =
        course.projectGrade !== null &&
        course.projectGrade !== undefined &&
        course.projectGrade !== ""
            ? Number(course.projectGrade)
            : 0;

    const avg = (m * mw) + (p * pw) + (Number(f) * fw);

    if (avg >= pg) {
        return "pass";
    }

    // Normal average did not pass — check the makeup ("büt") grade.
    const makeup = course.makeupGrade;

    if (
        makeup !== null &&
        makeup !== undefined &&
        makeup !== "" &&
        Number(makeup) >= pg
    ) {
        return "pass";
    }

    return "fail";
}


/* ─── CUSTOM UI NOTIFICATIONS (replaces browser alert/confirm) ────────────────*/

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

    const icon =
        type === "error" ? "⛔" :
        type === "success" ? "✅" :
        "⚠️";

    toast.innerHTML =
        `<span>${icon}</span><span>${escapeHtml(message)}</span>`;

    root.appendChild(toast);

    setTimeout(function () {
        toast.style.transition = "opacity 0.3s";
        toast.style.opacity = "0";
        setTimeout(function () { toast.remove(); }, 300);
    }, 3500);
}

function showConfirm(title, message) {
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
                    <button class="app-modal-btn confirm">Yes, delete</button>
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
        placeholder: "Search dashboard...",
        icon: "🏠"
    },

    courses: {
        title: "Grades",
        subtitle: "Manage your courses and grades.",
        placeholder: "Search courses or instructors...",
        icon: "📚"
    },

    exams: {
        title: "Deadlines",
        subtitle: "Track all your upcoming exam and project deadlines.",
        placeholder: "Search exams or projects...",
        icon: "📝"
    },

    study: {
        title: "Study Sessions",
        subtitle: "Record and review your daily study time.",
        placeholder: "Search sessions or courses...",
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
    `;
}

function handleStickySearch(query) {
    const lowerQuery = query.toLowerCase().trim();

    const courseRows =
        document.querySelectorAll("#courses-table tbody tr");

    if (courseRows.length) {
        courseRows.forEach(row => {
            row.style.display =
                row.textContent
                    .toLowerCase()
                    .includes(lowerQuery)
                    ? ""
                    : "none";
        });

        return;
    }

    const allRows = document.querySelectorAll("table tbody tr");

    if (allRows.length) {
        allRows.forEach(row => {
            row.style.display =
                row.textContent
                    .toLowerCase()
                    .includes(lowerQuery)
                    ? ""
                    : "none";
        });

        return;
    }

    const sessionGroups =
        document.querySelectorAll(".session-group");

    if (sessionGroups.length) {
        sessionGroups.forEach(group => {
            const rows = group.querySelectorAll("tbody tr");

            let anyVisible = false;

            rows.forEach(row => {
                const match =
                    row.textContent
                        .toLowerCase()
                        .includes(lowerQuery);

                row.style.display = match ? "" : "none";

                if (match) {
                    anyVisible = true;
                }
            });

            group.style.display =
                anyVisible ? "" : "none";
        });
    }
}

/*
 * Auto-fills the instructor field when the typed course name
 * exactly matches a known course. Works against the courses
 * list already loaded for the page, since the course field is
 * now free text (with autocomplete) instead of a select.
 */
function fillCourseInfoByName(nameFieldId, teacherFieldId) {
    const typed =
        document.getElementById(nameFieldId).value.trim();

    if (!typed) return;

    const normalized = toTitleCase(typed);

    const course =
        (window._allCoursesForDeadlines || []).find(
            c => toTitleCase(c.courseName) === normalized
        );

    if (course) {
        document.getElementById(teacherFieldId).value =
            course.instructorName || "";
    }
}

/*
 * Resolves a typed course name to an existing course's id.
 * If no course with that name exists yet (e.g. a course that
 * hasn't had a midterm grade entered on the Grades page, or a
 * brand new course typed directly on the Study Sessions or
 * Deadlines page), a lightweight course record is created on
 * the fly so the exam, project, or study session can still be
 * linked to it. Details like credit and grades can be filled in
 * later from the Grades page.
 *
 * Checks against both course caches (Deadlines page and Study
 * Sessions page load their own copies) so a course entered on
 * one page is recognized on the other without a full reload.
 */
async function getOrCreateCourseIdByName(courseName, instructorName) {
    const normalizedName = toTitleCase(courseName);

    if (!normalizedName) return null;

    const existing =
        (window._allCoursesForDeadlines || [])
            .concat(window._allCourses || [])
            .find(
                c => toTitleCase(c.courseName) === normalizedName
            );

    if (existing) {
        return existing.id;
    }

    try {
        const response =
            await fetch(
                `${API_URL}/courses`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body:
                        JSON.stringify({
                            courseName: normalizedName,
                            instructorName:
                                instructorName || "-",
                            // The backend requires a truthy credit
                            // value (a 0 is treated as "missing"),
                            // so auto-created lightweight courses
                            // get a default of 1. The real credit
                            // can be filled in later from the
                            // Grades page.
                            credit: 1
                        })
                }
            );

        if (!response.ok) {
            const error =
                await response
                    .json()
                    .catch(() => ({}));

            console.error(
                "Auto Course Create Error:",
                error
            );

            return null;
        }

        const created = await response.json();

        window._allCoursesForDeadlines = [
            ...(window._allCoursesForDeadlines || []),
            created
        ];

        window._allCourses = [
            ...(window._allCourses || []),
            created
        ];

        return created.id;

    } catch (err) {
        console.error(
            "Auto Course Create Error:",
            err
        );

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
            projects
        ] = await Promise.all([
            fetchJson(`${API_URL}/dashboard`),
            fetchJson(`${API_URL}/courses`),
            fetchJson(`${API_URL}/study-sessions`),
            fetchJson(`${API_URL}/exams`),
            fetchJson(`${API_URL}/projects`)
        ]);

        const today = new Date();

        const todayText =
            today.toLocaleDateString("sv-SE");

        const weekAgo = new Date();

        weekAgo.setDate(today.getDate() - 6);
        weekAgo.setHours(0, 0, 0, 0);

        const todaySessions = sessions.filter(
            s =>
                String(s.studyDate).split("T")[0] ===
                todayText
        );

        const weeklySessions = sessions.filter(
            s =>
                new Date(
                    String(s.studyDate).split("T")[0] +
                    "T00:00:00"
                ) >= weekAgo
        );

        const dailyTotal =
            todaySessions
                .reduce(
                    (sum, s) =>
                        sum + Number(s.hours || 0),
                    0
                )
                .toFixed(1);

        const weeklyTotal =
            weeklySessions
                .reduce(
                    (sum, s) =>
                        sum + Number(s.hours || 0),
                    0
                )
                .toFixed(1);

        const dailyAverage =
            todaySessions.length
                ? (
                    todaySessions.reduce(
                        (s, i) =>
                            s + Number(i.hours || 0),
                        0
                    ) / todaySessions.length
                ).toFixed(1)
                : 0;

        const weeklyAverage =
            weeklySessions.length
                ? (
                    weeklySessions.reduce(
                        (s, i) =>
                            s + Number(i.hours || 0),
                        0
                    ) / 7
                ).toFixed(1)
                : 0;

        const chartColors = [
            "#3b82f6",
            "#22c55e",
            "#f97316",
            "#8b5cf6",
            "#ec4899",
            "#14b8a6",
            "#f59e0b"
        ];

        function buildDonutChart(items) {
            const total =
                items.reduce(
                    (sum, i) => sum + i.value,
                    0
                );

            if (total === 0) {
                return `
                    <div class="donut-chart empty-chart"></div>
                `;
            }

            let current = 0;

            const parts = items.map((item, idx) => {
                const pct =
                    (item.value / total) * 100;

                const start = current;

                current += pct;

                return `
                    ${chartColors[idx % chartColors.length]}
                    ${start}% ${current}%
                `;
            });

            return `
                <div
                    class="donut-chart"
                    style="background:conic-gradient(${parts.join(",")});"
                ></div>
            `;
        }

        function buildLegend(items) {
            const total =
                items.reduce(
                    (sum, i) => sum + i.value,
                    0
                );

            if (!items.length || total === 0) {
                return `
                    <p class="empty-text">
                        No study data found.
                    </p>
                `;
            }

            return items.map((item, idx) => {
                const pct =
                    Math.round(
                        (item.value / total) * 100
                    );

                return `
                    <div class="chart-row">
                        <div class="chart-name">
                            <span
                                class="chart-dot"
                                style="
                                    background:
                                    ${chartColors[idx % chartColors.length]}
                                "
                            ></span>

                            ${escapeHtml(item.label)}
                        </div>

                        <div class="chart-value">
                            ${item.value}h (${pct}%)
                        </div>
                    </div>
                `;
            }).join("");
        }

        function groupByCourse(list) {
            const g = {};

            list.forEach(s => {
                const n = s.courseName || "Other";

                g[n] =
                    (g[n] || 0) +
                    Number(s.hours || 0);
            });

            return Object.keys(g).map(n => ({
                label: n,
                value: Number(g[n].toFixed(1))
            }));
        }

        function groupByDay(list) {
            const names = [
                "Sunday",
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday"
            ];

            const g = {};

            list.forEach(s => {
                const n =
                    names[
                        new Date(
                            String(s.studyDate)
                                .split("T")[0] +
                            "T00:00:00"
                        ).getDay()
                    ];

                g[n] =
                    (g[n] || 0) +
                    Number(s.hours || 0);
            });

            return Object.keys(g).map(n => ({
                label: n,
                value: Number(g[n].toFixed(1))
            }));
        }

        calendarDeadlines = [
            ...exams.map(e => ({
                title:
                    `${e.courseName} — ${toTitleCase(e.examType)} Exam`,
                detail:
                    `Instructor: ${formatEmpty(e.examName)}`,
                date:
                    toDateText(e.examDate),
                type: "Exam"
            })),

            ...projects.map(p => ({
                title:
                    `${p.courseName} — ${p.projectName}`,
                detail:
                    `Description: ${formatEmpty(p.description)}`,
                date:
                    toDateText(p.dueDate),
                type: "Project"
            }))
        ]
        .filter(i => i.date)
        .sort(
            (a, b) =>
                new Date(a.date) -
                new Date(b.date)
        );

        const nearest =
            calendarDeadlines.length
                ? calendarDeadlines[0]
                : null;

        const nearestDays =
            nearest
                ? calculateDaysLeft(nearest.date)
                : null;

        const counterWidth =
            nearestDays !== null
                ? Math.max(
                    8,
                    Math.min(
                        100,
                        nearestDays <= 0
                            ? 100
                            : Math.max(
                                8,
                                100 - nearestDays * 5
                            )
                    )
                )
                : 0;

        /*
         * The nearest deadline is always shown in red at the top,
         * regardless of how many days are left — it is by
         * definition the most urgent item.
         */
        const barColor =
            nearest
                ? "#ef4444"
                : "#3b82f6";

        /*
         * The rest of the deadlines that fall within the next
         * 10 days get a smooth green -> orange -> red gradient
         * based on how close they are, so the list below the
         * nearest-deadline card visually ranks urgency.
         */
        const upcomingDeadlines =
            calendarDeadlines
                .slice(1)
                .map(item => ({
                    ...item,
                    daysLeft: calculateDaysLeft(item.date)
                }))
                .filter(
                    item =>
                        item.daysLeft !== null &&
                        item.daysLeft >= 0 &&
                        item.daysLeft <= 10
                );

        calendarYear = today.getFullYear();
        calendarMonth = today.getMonth();

    

        const totalCourses =
            summary.totalCourses ||
            courses.length ||
            0;

        const totalHours =
            summary.totalStudyHours ||
            0;

        document.getElementById("app").innerHTML = `
            <div class="analytics-grid">

                <div class="analytics-card">
                    <div class="analytics-top">

                        <div>
                            <h3>Daily Average</h3>

                            <div class="big-number">
                                ${dailyAverage}h
                            </div>

                            <span class="green-label">
                                Today
                            </span>
                        </div>

                        ${buildDonutChart(
                            groupByCourse(todaySessions)
                        )}
                    </div>

                    <h4>
                        Study Time by Course
                    </h4>

                    ${buildLegend(
                        groupByCourse(todaySessions)
                    )}

                    <div class="chart-total">
                        <span>Total</span>
                        <strong>${dailyTotal}h</strong>
                    </div>
                </div>


                <div class="analytics-card">
                    <div class="analytics-top">

                        <div>
                            <h3>Weekly Average</h3>

                            <div class="big-number">
                                ${weeklyAverage}h
                            </div>

                            <span class="green-label">
                                Last 7 days
                            </span>
                        </div>

                        ${buildDonutChart(
                            groupByDay(weeklySessions)
                        )}
                    </div>

                    <h4>
                        Study Time by Day
                    </h4>

                    ${buildLegend(
                        groupByDay(weeklySessions)
                    )}

                    <div class="chart-total">
                        <span>Total</span>
                        <strong>${weeklyTotal}h</strong>
                    </div>
                </div>

            </div>


            <div class="dashboard-main-layout">

                <div class="panel nearest-panel">

                    <h2>
                        Nearest Deadline
                    </h2>

                    ${
                        nearest
                            ? `
                        <div class="deadline-card">

                            <span
                                class="badge badge-${nearest.type.toLowerCase()}"
                            >
                                ${escapeHtml(nearest.type)}
                            </span>

                            <div class="deadline-course">
                                ${escapeHtml(nearest.title)}
                            </div>

                            <div class="deadline-instructor">
                                👨‍🏫
                                ${escapeHtml(nearest.detail)}
                            </div>

                            <div class="deadline-date-row">

                                <span class="deadline-date">
                                    📅 ${escapeHtml(nearest.date)}
                                </span>

                                <span
                                    class="deadline-days"
                                    style="
                                        color:${barColor};
                                        font-weight:800;
                                        font-size:20px;
                                    "
                                >
                                    ${
                                        nearestDays <= 0
                                            ? "⚠️ Today!"
                                            : `${nearestDays} day(s) left`
                                    }
                                </span>

                            </div>

                            <div class="progress-bar full">

                                <div
                                    class="progress-fill"
                                    style="
                                        width:${counterWidth}%;
                                        background:${barColor};
                                        transition:
                                            width 0.6s ease,
                                            background 0.4s ease
                                    "
                                ></div>

                            </div>

                        </div>

                        ${
                            upcomingDeadlines.length
                                ? `
                            <div
                                style="
                                    margin-top:16px;
                                    display:flex;
                                    flex-direction:column;
                                "
                            >

                                <div
                                    style="
                                        font-size:12px;
                                        font-weight:700;
                                        color:#94a3b8;
                                        text-transform:uppercase;
                                        letter-spacing:0.5px;
                                        margin-bottom:6px;
                                    "
                                >
                                    Upcoming (next 10 days)
                                </div>

                                ${
                                    upcomingDeadlines
                                        .map(item => {
                                            const itemColor =
                                                getDeadlineProximityColor(
                                                    item.daysLeft
                                                );

                                            return `
                                                <div
                                                    style="
                                                        display:flex;
                                                        justify-content:space-between;
                                                        align-items:center;
                                                        gap:10px;
                                                        padding:8px 0;
                                                        border-top:1px solid #e2e8f0;
                                                    "
                                                >

                                                    <div
                                                        style="
                                                            min-width:0;
                                                            display:flex;
                                                            align-items:center;
                                                            gap:8px;
                                                        "
                                                    >
                                                        <span
                                                            style="
                                                                flex-shrink:0;
                                                                width:8px;
                                                                height:8px;
                                                                border-radius:50%;
                                                                background:${itemColor};
                                                            "
                                                        ></span>

                                                        <span
                                                            style="
                                                                font-size:13px;
                                                                color:#334155;
                                                                white-space:nowrap;
                                                                overflow:hidden;
                                                                text-overflow:ellipsis;
                                                            "
                                                        >
                                                            ${escapeHtml(item.title)}
                                                        </span>
                                                    </div>

                                                    <span
                                                        style="
                                                            flex-shrink:0;
                                                            font-size:13px;
                                                            font-weight:700;
                                                            color:${itemColor};
                                                        "
                                                    >
                                                        ${
                                                            item.daysLeft <= 0
                                                                ? "Today!"
                                                                : `${item.daysLeft} day(s) left`
                                                        }
                                                    </span>

                                                </div>
                                            `;
                                        })
                                        .join("")
                                }

                            </div>
                            `
                                : ""
                        }
                        `
                            : `<p>No deadline found.</p>`
                    }

                </div>


                <div class="dashboard-side-stats">

                    <div class="mini-stat-card">

                        <div class="mini-stat-icon">
                            📚
                        </div>

                        <div class="mini-stat-number">
                            ${totalCourses}
                        </div>

                        <div class="mini-stat-label">
                            Active Courses
                        </div>

                    </div>


                    <div class="mini-stat-card">

                        <div class="mini-stat-icon">
                            ⏰
                        </div>

                        <div class="mini-stat-number">
                            ${totalHours}h
                        </div>

                        <div class="mini-stat-label">
                            Total Study
                        </div>

                    </div>

                </div>


          <div class="vertical-motivation-card">

    <video
        class="motivation-video"
        autoplay
        muted
        loop
        playsinline
    >
        <source src="videos/motivation.mp4" type="video/mp4">
    </video>

</div>

            </div>


            <div class="panel calendar-panel">

                <h2>
                    Monthly Calendar
                </h2>

                <div class="calendar-nav">

                    <button
                        class="calendar-nav-btn"
                        onclick="changeCalendarMonth(-1)"
                    >
                        &#8592; Previous
                    </button>

                    <span
                        id="calendar-month-label"
                        class="calendar-month-label"
                    ></span>

                    <button
                        class="calendar-nav-btn"
                        onclick="changeCalendarMonth(1)"
                    >
                        Next &#8594;
                    </button>

                </div>

                <div id="calendar-content"></div>

            </div>
        `;

        renderCalendar();

    } catch (err) {
        console.error(
            "Dashboard Load Error:",
            err
        );

        document.getElementById("app").innerHTML =
            `<p>Dashboard could not be loaded.</p>`;
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
    const todayText =
        new Date().toLocaleDateString("sv-SE");

    const monthName =
        new Date(
            calendarYear,
            calendarMonth,
            1
        ).toLocaleDateString(
            "en-US",
            {
                month: "long",
                year: "numeric"
            }
        );

    document.getElementById(
        "calendar-month-label"
    ).textContent = monthName;

    const firstDay =
        new Date(
            calendarYear,
            calendarMonth,
            1
        );

    const totalDays =
        new Date(
            calendarYear,
            calendarMonth + 1,
            0
        ).getDate();

    const startDay =
        (firstDay.getDay() + 6) % 7;

    let cells = "";

    for (
        let i = 0;
        i < startDay;
        i++
    ) {
        cells += `
            <div class="calendar-cell empty"></div>
        `;
    }

    for (
        let day = 1;
        day <= totalDays;
        day++
    ) {
        const dateText =
            `${calendarYear}-${String(
                calendarMonth + 1
            ).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

        const events =
            calendarDeadlines.filter(
                i => i.date === dateText
            );

        cells += `
            <div
                class="calendar-cell
                ${dateText === todayText ? "today" : ""}"
            >

                <div class="calendar-date">
                    ${day}
                </div>

                ${
                    events.map(e => `
                        <div
                            class="
                                calendar-event
                                calendar-event-${e.type.toLowerCase()}
                            "
                        >
                            ${escapeHtml(e.type)}:
                            ${escapeHtml(e.title)}
                        </div>
                    `).join("")
                }

            </div>
        `;
    }

    document.getElementById(
        "calendar-content"
    ).innerHTML = `
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

/*
 * Builds a single <tr> for the courses table.
 */
function buildCourseRow(c) {

    // NO automatic 30/30 anymore
    const mw =
        c.midtermWeight ?? 0;

    const pw =
        c.projectWeight ?? 0;

    const pg =
        c.passingGrade ?? 60;

    const req =
        calcRequiredFinal(
            c.midtermGrade,
            c.projectGrade,
            mw,
            pw,
            pg
        );

    const reqCell = `
        <span
            style="
                color:${req.color};
                font-weight:700
            "
        >
            ${req.label}
        </span>
    `;

    /*
     * Pass / Fail result — only evaluated once a final grade has
     * actually been entered for this course. Also takes the
     * makeup ("büt") grade into account: if the weighted average
     * failed but the makeup grade meets the passing grade, the
     * course is reported as Pass.
     */
    const result =
        calcCourseResult(c);

    const resultCell =
        result === "pass"
            ? `<span style="color:#22c55e;font-weight:700">✅ Pass</span>`
            : result === "fail"
                ? `<span style="color:#ef4444;font-weight:700">❌ Fail</span>`
                : `<span style="color:#94a3b8">-</span>`;

    /*
     * Makeup ("büt") grade cell.
     * Read-only display only — editing happens in one place,
     * through the main "Edit Course" (✏️) form in the Action
     * column, so there is no separate edit/save/cancel control
     * here anymore.
     */
    const butValue =
        c.makeupGrade !== null &&
        c.makeupGrade !== undefined &&
        c.makeupGrade !== ""
            ? c.makeupGrade
            : "";

    const wasFailingBeforeMakeup =
        (function () {
            const f = c.finalGrade;

            if (f === null || f === undefined || f === "") {
                return false;
            }

            const mwF = Number(c.midtermWeight ?? 0) / 100;
            const pwF = Number(c.projectWeight ?? 0) / 100;
            const fwF = 1 - mwF - pwF;
            const pgF = Number(c.passingGrade ?? 60);

            const mF =
                c.midtermGrade !== null &&
                c.midtermGrade !== undefined &&
                c.midtermGrade !== ""
                    ? Number(c.midtermGrade)
                    : 0;

            const pF =
                c.projectGrade !== null &&
                c.projectGrade !== undefined &&
                c.projectGrade !== ""
                    ? Number(c.projectGrade)
                    : 0;

            const avgF =
                (mF * mwF) + (pF * pwF) + (Number(f) * fwF);

            return avgF < pgF;
        })();

    const butCell =
        wasFailingBeforeMakeup
            ? `<span>${escapeHtml(butValue || "-")}</span>`
            : `<span style="color:#94a3b8">-</span>`;

    return `
        <tr>

            <td>
                ${escapeHtml(c.courseName)}
            </td>

            <td>
                ${escapeHtml(
                    formatEmpty(
                        c.instructorName
                    )
                )}
            </td>

            <td>
                ${escapeHtml(
                    formatEmpty(c.credit)
                )}
            </td>

            <td>
                ${escapeHtml(
                    formatEmpty(
                        c.midtermGrade
                    )
                )}
            </td>

            <td>
                ${escapeHtml(
                    formatEmpty(
                        c.projectGrade
                    )
                )}
            </td>

            <td>
                ${reqCell}
            </td>

            <td>
                ${escapeHtml(
                    formatEmpty(
                        c.finalGrade
                    )
                )}
            </td>

            <td>
                ${resultCell}
            </td>

            <td>
                ${butCell}
            </td>

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
                        '${escapeForOnclick(c.makeupGrade ?? "")}'
                    )"
                >
                    ✏️
                </button>

                <button
                    class="btn-delete"
                    onclick="deleteCourse(${c.id}, '${escapeForOnclick(c.courseName)}')"
                >
                    🗑️
                </button>

            </td>

        </tr>
    `;
}

/*
 * Rebuilds just the courses table body from already-loaded data
 * (window._coursesForGPA), without hitting the API again.
 */
function renderCoursesTableBody(courses) {
    const tbody =
        document.querySelector("#courses-table tbody");

    if (!tbody) return;

    tbody.innerHTML =
        courses.length
            ? courses.map(c => buildCourseRow(c)).join("")
            : `
                <tr>
                    <td colspan="10">
                        No courses found.
                    </td>
                </tr>
            `;
}

async function loadCourses() {
    updateStickyHeader("courses");

    try {
        const courses =
            await fetchJson(`${API_URL}/courses`);

        /*
         * calculateGPA() looks courses up here by name to get
         * each course's own midterm/project/final weights. This
         * must stay in sync with what's currently on the page.
         */
        window._coursesForGPA =
            courses;

        const rows =
            courses.length
                ? courses.map(c => buildCourseRow(c)).join("")
                : `
                    <tr>
                        <td colspan="10">
                            No courses found.
                        </td>
                    </tr>
                `;


        document.getElementById("app").innerHTML = `

            <div class="form-box">

                <h2>
                    Add Course
                </h2>

                <div
                    style="
                        display:grid;
                        grid-template-columns:
                            repeat(
                                auto-fit,
                                minmax(160px,1fr)
                            );
                        gap:10px;
                    "
                >

                    <input
                        type="text"
                        id="courseName"
                        placeholder="Course name"
                    >

                    <input
                        type="text"
                        id="instructorName"
                        placeholder="Instructor name"
                    >

                    <input
                        type="number"
                        id="credit"
                        placeholder="Credit"
                    >

                    <input
                        type="number"
                        id="midtermGrade"
                        placeholder="Midterm grade"
                        min="0"
                        max="100"
                        oninput="updateRequiredFinalPreview()"
                    >

                    <input
                        type="number"
                        id="projectGrade"
                        placeholder="Project grade (optional)"
                        min="0"
                        max="100"
                        oninput="updateRequiredFinalPreview()"
                    >

                    <input
                        type="number"
                        id="finalGrade"
                        placeholder="Final grade"
                        min="0"
                        max="100"
                    >

                    <input
                        type="number"
                        id="makeupGrade"
                        placeholder="Makeup grade (optional)"
                        min="0"
                        max="100"
                    >

                </div>


                <div
                    style="
                        display:grid;
                        grid-template-columns:
                            repeat(3,1fr);
                        gap:10px;
                        margin-top:10px;
                        padding:12px;
                        background:#f8fafc;
                        border-radius:8px;
                        border:1px solid #e2e8f0;
                    "
                >

                    <div>

                        <label
                            style="
                                font-size:12px;
                                color:#64748b;
                                display:block;
                                margin-bottom:4px;
                                font-weight:600;
                            "
                        >
                            Midterm Weight (%)
                        </label>

                        <input
                            type="number"
                            id="midtermWeight"
                            placeholder="e.g. 40"
                            min="0"
                            max="100"
                            oninput="updateRequiredFinalPreview()"
                        >

                    </div>


                    <div>

                        <label
                            style="
                                font-size:12px;
                                color:#64748b;
                                display:block;
                                margin-bottom:4px;
                                font-weight:600;
                            "
                        >
                            Project Weight (%)
                        </label>

                        <input
                            type="number"
                            id="projectWeight"
                            placeholder="0 if no project"
                            min="0"
                            max="100"
                            oninput="updateRequiredFinalPreview()"
                        >

                    </div>


                    <div>

                        <label
                            style="
                                font-size:12px;
                                color:#64748b;
                                display:block;
                                margin-bottom:4px;
                                font-weight:600;
                            "
                        >
                            Passing Grade
                        </label>

                        <input
                            type="number"
                            id="passingGrade"
                            value="60"
                            min="0"
                            max="100"
                            oninput="updateRequiredFinalPreview()"
                        >

                    </div>

                </div>


                <div
                    id="required-final-preview"
                    style="
                        margin-top:8px;
                        font-size:13px;
                        color:#64748b;
                        min-height:20px;
                        padding:0 2px;
                    "
                ></div>


                <button
                    id="courseSaveButton"
                    onclick="saveCourse()"
                    style="margin-top:12px;"
                >
                    Save Course
                </button>

            </div>


            <div class="tools-grid">

                <!-- SEARCH CARD -->

                <div class="form-box tool-box">

                    <h2>
                        🔍 Search Courses
                    </h2>

                    <input
                        type="text"
                        id="courseSearch"
                        placeholder="Search by name, instructor, grade..."
                        oninput="filterCourses(this.value)"
                        style="margin-bottom:8px;"
                    >

                    <div
                        id="search-stats"
                        style="
                            font-size:12px;
                            color:#94a3b8;
                            margin-bottom:8px;
                        "
                    ></div>

                    <div
                        style="
                            display:flex;
                            flex-wrap:wrap;
                            gap:6px;
                        "
                    >

                        <button
                            onclick="
                                filterCourses('');
                                document.getElementById('courseSearch').value='';
                            "
                            style="
                                font-size:12px;
                                padding:4px 12px;
                                background:#f1f5f9;
                                border:1px solid #cbd5e1;
                                border-radius:20px;
                                cursor:pointer;
                                color:#475569;
                                font-weight:500;
                            "
                        >
                            All
                        </button>

                        <button
                            onclick="applyQuickFilter('no-final')"
                            style="
                                font-size:12px;
                                padding:4px 12px;
                                background:#fef9c3;
                                border:1px solid #fde047;
                                border-radius:20px;
                                cursor:pointer;
                                color:#854d0e;
                                font-weight:500;
                            "
                        >
                            Missing Final
                        </button>

                        <button
                            onclick="applyQuickFilter('low-midterm')"
                            style="
                                font-size:12px;
                                padding:4px 12px;
                                background:#fee2e2;
                                border:1px solid #fca5a5;
                                border-radius:20px;
                                cursor:pointer;
                                color:#991b1b;
                                font-weight:500;
                            "
                        >
                            Low Midterm (&lt;50)
                        </button>

                        <button
                            onclick="applyQuickFilter('high-midterm')"
                            style="
                                font-size:12px;
                                padding:4px 12px;
                                background:#dcfce7;
                                border:1px solid #86efac;
                                border-radius:20px;
                                cursor:pointer;
                                color:#166534;
                                font-weight:500;
                            "
                        >
                            High Midterm (≥80)
                        </button>

                    </div>

                </div>


                <!-- GPA CARD -->

                <div class="form-box tool-box">

                    <h2>
                        🎓 GPA Calculator
                    </h2>

                    <p
                        style="
                            font-size:13px;
                            color:#94a3b8;
                            margin-bottom:12px;
                        "
                    >
                        Uses each course's own grade weights.
                    </p>

                    <div id="gpa-result">

                        <span
                            style="
                                color:#94a3b8;
                                font-size:14px;
                            "
                        >
                            Click below to calculate your GPA.
                        </span>

                    </div>

                    <button
                        onclick="calculateGPA()"
                        style="margin-top:12px;"
                    >
                        Calculate GPA
                    </button>

                </div>

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
                        <th>Action</th>
                    </tr>

                </thead>

                <tbody>
                    ${rows}
                </tbody>

            </table>
        `;

        updateRequiredFinalPreview();
        updateSearchStats();

    } catch (err) {
        console.error(
            "Courses Load Error:",
            err
        );

        document.getElementById("app").innerHTML =
            `<p>Courses could not be loaded.</p>`;
    }
}


/* ─── REQUIRED FINAL LIVE PREVIEW ─────────────────────────────────────────────*/

function updateRequiredFinalPreview() {
    const midterm =
        document.getElementById(
            "midtermGrade"
        )?.value || null;

    const project =
        document.getElementById(
            "projectGrade"
        )?.value || null;

    const midtermWeight =
        Number(
            document.getElementById(
                "midtermWeight"
            )?.value || 0
        );

    const projectWeight =
        Number(
            document.getElementById(
                "projectWeight"
            )?.value || 0
        );

    const passingGrade =
        Number(
            document.getElementById(
                "passingGrade"
            )?.value || 60
        );

    const preview =
        document.getElementById(
            "required-final-preview"
        );

    if (!preview) return;


    const finalWeight =
        100 -
        midtermWeight -
        projectWeight;


    if (
        midtermWeight < 0 ||
        projectWeight < 0 ||
        finalWeight < 0
    ) {
        preview.innerHTML = `
            <span style="color:#ef4444">
                ⚠️ Weights cannot exceed 100%.
            </span>
        `;

        return;
    }


    /*
     * If a project grade is entered,
     * user should enter a project weight.
     */
    if (
        project &&
        projectWeight === 0
    ) {
        preview.innerHTML = `
            <span style="color:#f97316">
                ⚠️ You entered a project grade,
                so please enter the project weight.
            </span>
        `;

        return;
    }


    /*
     * If midterm grade exists,
     * a midterm weight should be entered.
     */
    if (
        midterm &&
        midtermWeight === 0
    ) {
        preview.innerHTML = `
            <span style="color:#f97316">
                ⚠️ Please enter the midterm weight.
            </span>
        `;

        return;
    }


    const weightInfo = `
        Weights →
        Midterm:
        <strong>${midtermWeight}%</strong>
        · Project:
        <strong>${projectWeight}%</strong>
        · Final:
        <strong>${finalWeight}%</strong>
    `;


    if (!midterm && !project) {
        preview.innerHTML = weightInfo;
        return;
    }


    const req =
        calcRequiredFinal(
            midterm,
            project,
            midtermWeight,
            projectWeight,
            passingGrade
        );


    preview.innerHTML = `
        ${weightInfo}
        &nbsp;|&nbsp;
        Required final to pass:

        <strong
            style="color:${req.color}"
        >
            ${req.label}
        </strong>
    `;
}


/* ─── QUICK FILTERS ───────────────────────────────────────────────────────────*/

function applyQuickFilter(type) {
    const rows =
        document.querySelectorAll(
            "#courses-table tbody tr"
        );

    let count = 0;

    rows.forEach(row => {
        const cells =
            row.querySelectorAll("td");

        if (cells.length < 7) {
            row.style.display = "none";
            return;
        }

        const midterm =
            parseFloat(
                cells[3].textContent
            ) || 0;

        const finalGrade =
            cells[6].textContent.trim();

        let show = false;

        if (type === "no-final") {
            show =
                finalGrade === "-" ||
                finalGrade === "";
        }

        if (type === "low-midterm") {
            show =
                midterm > 0 &&
                midterm < 50;
        }

        if (type === "high-midterm") {
            show =
                midterm >= 80;
        }

        row.style.display =
            show ? "" : "none";

        if (show) {
            count++;
        }
    });

    updateSearchStats(count);
}

function updateSearchStats(visible) {
    const stats =
        document.getElementById(
            "search-stats"
        );

    if (!stats) return;

    const allRows =
        document.querySelectorAll(
            "#courses-table tbody tr"
        );

    const total =
        allRows.length;

    const shown =
        visible !== undefined
            ? visible
            : total;

    stats.textContent =
        shown === total
            ? `Showing all ${total} courses`
            : `Showing ${shown} of ${total} courses`;
}

function filterCourses(keyword) {
    const rows =
        document.querySelectorAll(
            "#courses-table tbody tr"
        );

    const query =
        keyword.toLowerCase();

    let count = 0;

    rows.forEach(row => {
        const match =
            row.textContent
                .toLowerCase()
                .includes(query);

        row.style.display =
            match ? "" : "none";

        if (match) {
            count++;
        }
    });

    updateSearchStats(count);
}


/* ─── GPA CALCULATOR ──────────────────────────────────────────────────────────*/

/*
 * GPA now uses EACH COURSE'S OWN WEIGHTS.
 *
 * Example:
 *
 * Course A:
 * Midterm 40%
 * Project 0%
 * Final 60%
 *
 * Course B:
 * Midterm 30%
 * Project 20%
 * Final 50%
 *
 * Each course is calculated separately.
 */

function calculateGPA() {
    const rows =
        document.querySelectorAll(
            "#courses-table tbody tr"
        );

    let totalCredits = 0;
    let totalPoints = 0;
    let counted = 0;

    rows.forEach(row => {
        const cells =
            row.querySelectorAll("td");

        if (cells.length < 7) return;


        const credit =
            parseFloat(
                cells[2].textContent
            ) || 0;

        const midterm =
            parseFloat(
                cells[3].textContent
            );

        const project =
            parseFloat(
                cells[4].textContent
            );

        const final =
            parseFloat(
                cells[6].textContent
            );


        if (credit === 0) return;


        /*
         * Get the course from the API data
         * instead of assuming 30/30/40.
         */
        const courseName =
            cells[0].textContent.trim();


        /*
         * Find the matching course.
         */
        const course =
            window._coursesForGPA?.find(
                c =>
                    String(c.courseName).trim() ===
                    courseName
            );


        if (!course) return;


        const midtermWeight =
            Number(
                course.midtermWeight ?? 0
            ) / 100;

        const projectWeight =
            Number(
                course.projectWeight ?? 0
            ) / 100;

        const finalWeight =
            1 -
            midtermWeight -
            projectWeight;


        /*
         * GPA requires a final grade.
         */
        if (
            Number.isNaN(final) ||
            final < 0
        ) {
            return;
        }


        const midtermValue =
            Number.isNaN(midterm)
                ? 0
                : midterm;

        const projectValue =
            Number.isNaN(project)
                ? 0
                : project;


        const avg =
            (midtermValue * midtermWeight) +
            (projectValue * projectWeight) +
            (final * finalWeight);


        let gpaPoint = 0;

        if (avg >= 90) {
            gpaPoint = 4.0;
        } else if (avg >= 85) {
            gpaPoint = 3.5;
        } else if (avg >= 75) {
            gpaPoint = 3.0;
        } else if (avg >= 65) {
            gpaPoint = 2.5;
        } else if (avg >= 55) {
            gpaPoint = 2.0;
        } else if (avg >= 45) {
            gpaPoint = 1.5;
        }


        totalPoints +=
            gpaPoint * credit;

        totalCredits += credit;

        counted++;
    });


    const el =
        document.getElementById(
            "gpa-result"
        );


    if (counted === 0) {
        el.innerHTML = `
            <span
                style="
                    color:#94a3b8;
                    font-size:14px;
                "
            >
                No complete grade data found.
            </span>
        `;

        return;
    }


    const gpa =
        totalCredits > 0
            ? (
                totalPoints /
                totalCredits
            ).toFixed(2)
            : "0.00";


    const gpaNum =
        parseFloat(gpa);


    let gpaColor = "#ef4444";
    let gpaLabel = "Needs Improvement";


    if (gpaNum >= 3.5) {
        gpaColor = "#22c55e";
        gpaLabel = "Excellent";
    } else if (gpaNum >= 3.0) {
        gpaColor = "#3b82f6";
        gpaLabel = "Good";
    } else if (gpaNum >= 2.5) {
        gpaColor = "#f97316";
        gpaLabel = "Average";
    } else if (gpaNum >= 2.0) {
        gpaColor = "#f59e0b";
        gpaLabel = "Below Average";
    }


    el.innerHTML = `
        <div
            style="
                text-align:center;
                padding:6px 0 4px;
            "
        >

            <div
                style="
                    font-size:52px;
                    font-weight:800;
                    color:${gpaColor};
                    line-height:1;
                    letter-spacing:-2px;
                "
            >
                ${gpa}
            </div>

            <div
                style="
                    font-size:13px;
                    color:#94a3b8;
                    margin-top:2px;
                "
            >
                out of 4.00
            </div>

            <div
                style="
                    display:inline-block;
                    margin-top:10px;
                    padding:5px 18px;
                    background:${gpaColor}20;
                    color:${gpaColor};
                    border-radius:20px;
                    font-size:13px;
                    font-weight:700;
                    letter-spacing:0.5px;
                "
            >
                ${gpaLabel}
            </div>

            <div
                style="
                    font-size:12px;
                    color:#94a3b8;
                    margin-top:6px;
                "
            >
                Based on ${counted} course(s)
                · ${totalCredits} credits
            </div>

        </div>
    `;
}


/* ─── REQUIRED FINAL MANUAL CALCULATOR ────────────────────────────────────────*/

function calculateNeededFinal() {
    const midterm =
        document.getElementById(
            "calcMidterm"
        ).value || null;

    const project =
        document.getElementById(
            "calcProject"
        ).value || null;

    const midtermW =
        document.getElementById(
            "calcMidtermW"
        ).value || 0;

    const projectW =
        document.getElementById(
            "calcProjectW"
        ).value || 0;

    const passing =
        document.getElementById(
            "calcPassing"
        ).value || 60;


    const req =
        calcRequiredFinal(
            midterm,
            project,
            midtermW,
            projectW,
            passing
        );


    const el =
        document.getElementById(
            "final-calc-result"
        );


    if (req.label === "✓ Passing") {

        el.innerHTML = `
            <span
                style="
                    color:#22c55e;
                    font-weight:700
                "
            >
                ✅ You already passed!
            </span>
        `;

    } else if (
        req.label === "✗ Impossible"
    ) {

        el.innerHTML = `
            <span
                style="
                    color:#ef4444;
                    font-weight:700
                "
            >
                ❌ Passing is not possible
                even with 100 on the final.
            </span>
        `;

    } else if (
        req.label === "Invalid weights"
    ) {

        el.innerHTML = `
            <span
                style="
                    color:#ef4444;
                    font-weight:700
                "
            >
                ⚠️ Invalid weights.
                Total weights cannot exceed 100%.
            </span>
        `;

    } else if (req.value === null) {

        el.innerHTML =
            `Enter at least one grade to calculate.`;

    } else {

        el.innerHTML = `
            📝 You need at least

            <strong
                style="color:${req.color}"
            >
                ${req.label}
            </strong>

            on the final.
        `;
    }
}


/* ─── SAVE COURSE ─────────────────────────────────────────────────────────────*/

async function saveCourse() {
    const course = {

        courseName:
            toTitleCase(
                document.getElementById(
                    "courseName"
                ).value.trim()
            ),

        instructorName:
            toTitleCase(
                document.getElementById(
                    "instructorName"
                ).value.trim()
            ),

        credit:
            document.getElementById(
                "credit"
            ).value,

        midtermGrade:
            document.getElementById(
                "midtermGrade"
            ).value.trim() || null,

        projectGrade:
            document.getElementById(
                "projectGrade"
            ).value.trim() || null,

        finalGrade:
            document.getElementById(
                "finalGrade"
            ).value.trim() || null,

        makeupGrade:
            document.getElementById(
                "makeupGrade"
            ).value.trim() || null,

        // User decides the weights
        midtermWeight:
            Number(
                document.getElementById(
                    "midtermWeight"
                ).value.trim() || 0
            ),

        projectWeight:
            Number(
                document.getElementById(
                    "projectWeight"
                ).value.trim() || 0
            ),

        passingGrade:
            Number(
                document.getElementById(
                    "passingGrade"
                ).value.trim() || 60
            )
    };


    if (
        !course.courseName ||
        !course.instructorName ||
        !course.credit
    ) {
        showToast(
            "Course name, instructor name and credit are required.",
            "warning"
        );

        return;
    }


    if (
        course.midtermWeight < 0 ||
        course.projectWeight < 0
    ) {
        showToast(
            "Weights cannot be negative.",
            "warning"
        );

        return;
    }


    if (
        course.midtermWeight +
        course.projectWeight >= 100
    ) {
        showToast(
            "Midterm and project weights must total less than 100%. The remaining percentage is automatically used for the final.",
            "warning"
        );

        return;
    }


    /*
     * If a project grade is entered,
     * project weight must also be entered.
     * (Project itself is fully optional — if no
     * project grade/weight is entered at all, this
     * check never triggers and the course is scored
     * on midterm + final only.)
     */
    if (
        course.projectGrade !== null &&
        course.projectWeight === 0
    ) {
        showToast(
            "You entered a project grade. Please enter the project weight.",
            "warning"
        );

        return;
    }


    /*
     * If midterm grade is entered,
     * midterm weight must also be entered.
     */
    if (
        course.midtermGrade !== null &&
        course.midtermWeight === 0
    ) {
        showToast(
            "You entered a midterm grade. Please enter the midterm weight.",
            "warning"
        );

        return;
    }


    try {

        const response =
            await fetch(
                `${API_URL}/courses`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body:
                        JSON.stringify(course)
                }
            );


        if (!response.ok) {

            const error =
                await response
                    .json()
                    .catch(() => ({}));

            showToast(
                error.message ||
                "Course could not be saved.",
                "error"
            );

            return;
        }


        await loadCourses();

    } catch (err) {

        console.error(
            "Course Save Error:",
            err
        );

        showToast(
            "Course could not be saved.",
            "error"
        );
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
    makeupGrade
) {

    document.getElementById(
        "courseName"
    ).value = courseName;

    document.getElementById(
        "instructorName"
    ).value = instructorName;

    document.getElementById(
        "credit"
    ).value = credit;

    document.getElementById(
        "midtermGrade"
    ).value = midtermGrade;

    document.getElementById(
        "projectGrade"
    ).value = projectGrade;

    document.getElementById(
        "finalGrade"
    ).value = finalGrade;

    document.getElementById(
        "makeupGrade"
    ).value = makeupGrade ?? "";


    /*
     * Do NOT automatically use 30.
     */
    document.getElementById(
        "midtermWeight"
    ).value =
        midtermWeight ?? "";


    document.getElementById(
        "projectWeight"
    ).value =
        projectWeight ?? "";


    document.getElementById(
        "passingGrade"
    ).value =
        passingGrade ?? 60;


    updateRequiredFinalPreview();


    const saveButton =
        document.getElementById(
            "courseSaveButton"
        );


    saveButton.textContent =
        "Update Course";


    saveButton.onclick =
        async function () {

            const updated = {

                courseName:
                    toTitleCase(
                        document.getElementById(
                            "courseName"
                        ).value.trim()
                    ),

                instructorName:
                    toTitleCase(
                        document.getElementById(
                            "instructorName"
                        ).value.trim()
                    ),

                credit:
                    document.getElementById(
                        "credit"
                    ).value,

                midtermGrade:
                    document.getElementById(
                        "midtermGrade"
                    ).value.trim() || null,

                projectGrade:
                    document.getElementById(
                        "projectGrade"
                    ).value.trim() || null,

                finalGrade:
                    document.getElementById(
                        "finalGrade"
                    ).value.trim() || null,

                makeupGrade:
                    document.getElementById(
                        "makeupGrade"
                    ).value.trim() || null,

                midtermWeight:
                    Number(
                        document.getElementById(
                            "midtermWeight"
                        ).value.trim() || 0
                    ),

                projectWeight:
                    Number(
                        document.getElementById(
                            "projectWeight"
                        ).value.trim() || 0
                    ),

                passingGrade:
                    Number(
                        document.getElementById(
                            "passingGrade"
                        ).value.trim() || 60
                    )
            };


            if (
                !updated.courseName ||
                !updated.instructorName ||
                !updated.credit
            ) {
                showToast(
                    "Course name, instructor name and credit are required.",
                    "warning"
                );

                return;
            }


            if (
                updated.midtermWeight < 0 ||
                updated.projectWeight < 0
            ) {
                showToast(
                    "Weights cannot be negative.",
                    "warning"
                );

                return;
            }


            if (
                updated.midtermWeight +
                updated.projectWeight >= 100
            ) {
                showToast(
                    "Midterm and project weights must total less than 100%.",
                    "warning"
                );

                return;
            }


            if (
                updated.projectGrade !== null &&
                updated.projectWeight === 0
            ) {
                showToast(
                    "You entered a project grade. Please enter the project weight.",
                    "warning"
                );

                return;
            }


            if (
                updated.midtermGrade !== null &&
                updated.midtermWeight === 0
            ) {
                showToast(
                    "You entered a midterm grade. Please enter the midterm weight.",
                    "warning"
                );

                return;
            }


            try {

                const response =
                    await fetch(
                        `${API_URL}/courses/${id}`,
                        {
                            method: "PUT",
                            headers: {
                                "Content-Type":
                                    "application/json"
                            },
                            body:
                                JSON.stringify(updated)
                        }
                    );


                if (!response.ok) {

                    const error =
                        await response
                            .json()
                            .catch(() => ({}));

                    showToast(
                        error.message ||
                        "Course could not be updated.",
                        "error"
                    );

                    return;
                }


                await loadCourses();

            } catch (err) {

                console.error(
                    "Course Update Error:",
                    err
                );

                showToast(
                    "Course could not be updated.",
                    "error"
                );
            }
        };


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


/* ─── DELETE COURSE ────────────────────────────────────────────────────────────*/

async function deleteCourse(id, courseName) {

    const confirmed =
        await showConfirm(
            "Delete Course",
            `Are you sure you want to delete "${courseName}"? This action cannot be undone.`
        );

    if (!confirmed) return;

    try {

        const response =
            await fetch(
                `${API_URL}/courses/${id}`,
                {
                    method: "DELETE"
                }
            );


        if (!response.ok) {
            showToast(
                "Course could not be deleted.",
                "error"
            );

            return;
        }


        await loadCourses();

    } catch (err) {

        console.error(
            "Course Delete Error:",
            err
        );

        showToast(
            "Course could not be deleted.",
            "error"
        );
    }
}


/* ─── STUDY SESSIONS ──────────────────────────────────────────────────────────*/

let selectedStudyDate = null;
let editingStudySessionId = null;

async function loadStudyPage() {

    updateStickyHeader("study");

    try {

        const [
            courses,
            sessions
        ] = await Promise.all([
            fetchJson(
                `${API_URL}/courses`
            ),
            fetchJson(
                `${API_URL}/study-sessions`
            )
        ]);


        window._allCourses =
            courses;


        const studyCourseDatalistOptions =
            courses
                .map(
                    c =>
                        `<option value="${escapeHtml(c.courseName)}"></option>`
                )
                .join("");


        const courseFilterOptions =
            courses
                .map(
                    c =>
                        `<option value="${escapeHtml(c.courseName)}">
                            ${escapeHtml(c.courseName)}
                        </option>`
                )
                .join("");


        const uniqueDates =
            [
                ...new Set(
                    sessions.map(
                        s =>
                            String(
                                s.studyDate
                            ).split("T")[0]
                    )
                )
            ]
            .sort()
            .reverse();


        const dateFilterOptions =
            uniqueDates
                .map(
                    d =>
                        `<option value="${d}">
                            ${d}
                        </option>`
                )
                .join("");


        window._allSessions =
            sessions;


        const todayText =
            new Date()
                .toLocaleDateString("sv-SE");


        if (!selectedStudyDate) {
            selectedStudyDate =
                uniqueDates[0] ||
                todayText;
        }


        document.getElementById(
            "app"
        ).innerHTML = `

            <div class="form-box">

                <h2 id="studyFormTitle">
                    Add Study Session
                </h2>

                <input
                    type="text"
                    id="studyCourseName"
                    list="studyCourseOptions"
                    placeholder="Type course name..."
                    autocomplete="off"
                >

                <datalist id="studyCourseOptions">
                    ${studyCourseDatalistOptions}
                </datalist>

                <input
                    type="number"
                    id="studyHours"
                    placeholder="Study hours"
                    step="0.5"
                    min="0.5"
                >

                <input
                    type="text"
                    id="studyTopic"
                    placeholder="Studied topics"
                >

                <button
                    id="studySaveButton"
                    onclick="saveStudySession()"
                >
                    Save Session
                </button>

                <button
                    id="studyCancelButton"
                    onclick="cancelStudyEdit()"
                    style="display:none;"
                >
                    Cancel Edit
                </button>

            </div>


            <div class="form-box filter-box">

                <h2>
                    🔍 Filter Sessions
                </h2>

                <div class="filter-row">

                    <select
                        id="filterDate"
                        onchange="changeStudyDateFromFilter()"
                    >
                        <option value="">
                            All Dates
                        </option>

                        ${dateFilterOptions}
                    </select>

                    <select
                        id="filterCourse"
                        onchange="renderSessionsBySelectedDate()"
                    >
                        <option value="">
                            All Courses
                        </option>

                        ${courseFilterOptions}
                    </select>

                    <button
                        onclick="clearStudyFilters()"
                    >
                        Clear Filter
                    </button>

                </div>

            </div>


            <div class="study-day-panel">

                <div class="study-day-nav">

                    <button
                        onclick="changeStudyDay(-1)"
                    >
                        ← Previous Day
                    </button>

                    <div class="study-day-title">

                        <h2
                            id="selected-study-date-title"
                        ></h2>

                        <p
                            id="selected-study-date-subtitle"
                        ></p>

                    </div>

                    <button
                        id="studyGoToTodayBtn"
                        class="study-today-btn"
                        onclick="goToStudyToday()"
                        style="display:none;"
                    >
                        📍 Go to Today
                    </button>

                </div>

                <div
                    id="single-day-session-table"
                ></div>

            </div>
        `;


        document.getElementById(
            "filterDate"
        ).value =
            selectedStudyDate;


        renderSessionsBySelectedDate();

    } catch (err) {

        console.error(
            "Study Page Load Error:",
            err
        );

        document.getElementById(
            "app"
        ).innerHTML =
            `<p>Study sessions could not be loaded.</p>`;
    }
}

function changeStudyDateFromFilter() {

    const d =
        document.getElementById(
            "filterDate"
        ).value;

    if (d) {
        selectedStudyDate = d;
    }

    renderSessionsBySelectedDate();
}

function changeStudyDay(direction) {

    const date =
        new Date(
            selectedStudyDate +
            "T00:00:00"
        );

    date.setDate(
        date.getDate() + direction
    );

    selectedStudyDate =
        date.toLocaleDateString(
            "sv-SE"
        );

    const fd =
        document.getElementById(
            "filterDate"
        );

    if (fd) {
        fd.value =
            selectedStudyDate;
    }

    renderSessionsBySelectedDate();
}

/*
 * Jumps the study-session day view straight back to
 * today, no matter how far the user has navigated
 * into the past or future.
 */
function goToStudyToday() {

    selectedStudyDate =
        new Date()
            .toLocaleDateString("sv-SE");

    const fd =
        document.getElementById(
            "filterDate"
        );

    if (fd) {
        fd.value =
            selectedStudyDate;
    }

    renderSessionsBySelectedDate();
}

function renderSessionsBySelectedDate() {

    const sessions =
        window._allSessions || [];

    const filterCourse =
        document.getElementById(
            "filterCourse"
        )?.value || "";

    const filterDate =
        document.getElementById(
            "filterDate"
        )?.value || "";


    if (filterDate) {
        selectedStudyDate =
            filterDate;
    }


    const dayName =
        new Date(
            selectedStudyDate +
            "T00:00:00"
        ).toLocaleDateString(
            "en-US",
            {
                weekday: "long"
            }
        );


    document.getElementById(
        "selected-study-date-title"
    ).textContent =
        selectedStudyDate;


    document.getElementById(
        "selected-study-date-subtitle"
    ).textContent =
        dayName;


    const todayText =
        new Date()
            .toLocaleDateString("sv-SE");

    const goToTodayBtn =
        document.getElementById(
            "studyGoToTodayBtn"
        );

    if (goToTodayBtn) {
        goToTodayBtn.style.display =
            selectedStudyDate === todayText
                ? "none"
                : "inline-block";
    }


    const filtered =
        sessions.filter(s => {

            return (
                String(s.studyDate)
                    .split("T")[0] ===
                selectedStudyDate
            ) &&
            (
                !filterCourse ||
                s.courseName ===
                filterCourse
            );
        });


    const dayTotal =
        filtered
            .reduce(
                (sum, s) =>
                    sum +
                    Number(
                        s.hours || 0
                    ),
                0
            )
            .toFixed(1);


    const container =
        document.getElementById(
            "single-day-session-table"
        );


    if (!filtered.length) {

        container.innerHTML = `
            <div class="empty-day-box">

                <h3>
                    No study sessions found.
                </h3>

                <p>
                    There is no saved study session
                    for ${selectedStudyDate}
                    (${dayName}).
                </p>

            </div>
        `;

        return;
    }


    const rows =
        filtered.map(s => `
            <tr>

                <td>
                    ${escapeHtml(s.courseName)}
                </td>

                <td>
                    ${escapeHtml(s.hours)}h
                </td>

                <td>
                    ${escapeHtml(
                        formatEmpty(s.note)
                    )}
                </td>

                <td class="action-buttons">

                    <button
                        class="btn-edit icon-btn"
                        onclick="
                            editStudySession(
                                ${s.id},
                                '${escapeForOnclick(s.courseName)}',
                                '${escapeForOnclick(s.hours)}',
                                '${escapeForOnclick(s.note ?? "")}'
                            )
                        "
                    >
                        ✏️
                    </button>

                    <button
                        class="btn-delete icon-btn"
                        onclick="
                            deleteStudySession(${s.id})
                        "
                    >
                        🗑️
                    </button>

                </td>

            </tr>
        `).join("");


    container.innerHTML = `

        <div class="single-session-table-header">

            <span>
                Sessions for
                ${selectedStudyDate}
                (${dayName})
            </span>

            <strong>
                Total: ${dayTotal}h
            </strong>

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

            <tbody>
                ${rows}
            </tbody>

        </table>
    `;
}

function clearStudyFilters() {

    document.getElementById(
        "filterDate"
    ).value = "";

    document.getElementById(
        "filterCourse"
    ).value = "";


    const sessions =
        window._allSessions || [];


    const existingDates =
        sessions
            .map(
                s =>
                    String(
                        s.studyDate
                    ).split("T")[0]
            )
            .sort()
            .reverse();


    selectedStudyDate =
        existingDates[0] ||
        new Date()
            .toLocaleDateString(
                "sv-SE"
            );


    renderSessionsBySelectedDate();
}

async function saveStudySession() {

    const enteredCourseName =
        toTitleCase(
            document.getElementById(
                "studyCourseName"
            ).value.trim()
        );

    const hoursValue =
        document.getElementById(
            "studyHours"
        ).value;


    if (
        !enteredCourseName ||
        !hoursValue
    ) {
        showToast(
            "Course name and study hours are required.",
            "warning"
        );

        return;
    }


    /*
     * The course doesn't need to already exist — if it's not
     * found among the known courses, a lightweight course record
     * is created automatically (same behavior as the Deadlines
     * page), so any course name can be logged here directly.
     */
    const courseId =
        await getOrCreateCourseIdByName(
            enteredCourseName,
            null
        );

    if (!courseId) {
        showToast(
            "Course could not be found or created.",
            "error"
        );

        return;
    }


    const session = {

        courseId:
            courseId,

        studyDate:
            selectedStudyDate ||
            new Date()
                .toLocaleDateString(
                    "sv-SE"
                ),

        hours:
            hoursValue,

        note:
            toTitleCase(
                document.getElementById(
                    "studyTopic"
                ).value.trim()
            )
    };


    try {

        const url =
            editingStudySessionId
                ? `${API_URL}/study-sessions/${editingStudySessionId}`
                : `${API_URL}/study-sessions`;

        const method =
            editingStudySessionId
                ? "PUT"
                : "POST";


        const response =
            await fetch(
                url,
                {
                    method,
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body:
                        JSON.stringify(session)
                }
            );


        if (!response.ok) {
            showToast(
                "Study session could not be saved.",
                "error"
            );

            return;
        }


        editingStudySessionId = null;

        await loadStudyPage();

    } catch (err) {

        console.error(
            "Study Session Save Error:",
            err
        );

        showToast(
            "Study session could not be saved.",
            "error"
        );
    }
}

function editStudySession(
    id,
    courseName,
    hours,
    note
) {

    editingStudySessionId = id;


    document.getElementById(
        "studyCourseName"
    ).value = courseName;


    document.getElementById(
        "studyHours"
    ).value = hours;


    document.getElementById(
        "studyTopic"
    ).value = note;


    document.getElementById(
        "studyFormTitle"
    ).textContent =
        "Edit Study Session";


    document.getElementById(
        "studySaveButton"
    ).textContent =
        "Update Session";


    document.getElementById(
        "studyCancelButton"
    ).style.display =
        "inline-block";


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

function cancelStudyEdit() {

    editingStudySessionId = null;


    document.getElementById(
        "studyCourseName"
    ).value = "";

    document.getElementById(
        "studyHours"
    ).value = "";

    document.getElementById(
        "studyTopic"
    ).value = "";


    document.getElementById(
        "studyFormTitle"
    ).textContent =
        "Add Study Session";


    document.getElementById(
        "studySaveButton"
    ).textContent =
        "Save Session";


    document.getElementById(
        "studyCancelButton"
    ).style.display =
        "none";
}

async function deleteStudySession(id) {

    const confirmed =
        await showConfirm(
            "Delete Study Session",
            "Are you sure you want to delete this study session? This action cannot be undone."
        );

    if (!confirmed) return;


    try {

        const response =
            await fetch(
                `${API_URL}/study-sessions/${id}`,
                {
                    method: "DELETE"
                }
            );


        if (!response.ok) {

            showToast(
                "Study session could not be deleted.",
                "error"
            );

            return;
        }


        await loadStudyPage();

    } catch (err) {

        console.error(
            "Study Session Delete Error:",
            err
        );

        showToast(
            "Study session could not be deleted.",
            "error"
        );
    }
}


/* ─── EXAMS & PROJECTS ────────────────────────────────────────────────────────*/

async function loadExamsPage() {

    updateStickyHeader("exams");

    try {

        const [
            courses,
            exams,
            projects
        ] = await Promise.all([
            fetchJson(
                `${API_URL}/courses`
            ),
            fetchJson(
                `${API_URL}/exams`
            ),
            fetchJson(
                `${API_URL}/projects`
            )
        ]);


        window._allCoursesForDeadlines =
            courses;


        const courseNameDatalistOptions =
            courses
                .map(
                    c =>
                        `<option value="${escapeHtml(c.courseName)}"></option>`
                )
                .join("");


        const examRows =
            exams.length
                ? exams.map(e => `
                    <tr>

                        <td>
                            ${escapeHtml(e.courseName)}
                        </td>

                        <td>
                            ${escapeHtml(e.examName)}
                        </td>

                        <td>
                            ${escapeHtml(toTitleCase(e.examType))}
                        </td>

                        <td>
                            ${escapeHtml(
                                toDateText(e.examDate)
                            )}
                        </td>

                        <td>
                            ${formatDaysLeftColored(
                                e.examDate
                            )}
                        </td>

                        <td>
                            <button
                                class="btn-delete"
                                onclick="deleteExam(${e.id})"
                            >
                                🗑️
                            </button>
                        </td>

                    </tr>
                `).join("")
                : `
                    <tr>
                        <td colspan="6">
                            No exams found.
                        </td>
                    </tr>
                `;


        const projectRows =
            projects.length
                ? projects.map(p => `
                    <tr>

                        <td>
                            ${escapeHtml(p.courseName)}
                        </td>

                        <td>
                            ${escapeHtml(p.projectName)}
                        </td>

                        <td>
                            ${escapeHtml(
                                formatEmpty(
                                    p.description
                                )
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                toDateText(p.dueDate)
                            )}
                        </td>

                        <td>
                            ${formatDaysLeftColored(
                                p.dueDate
                            )}
                        </td>

                        <td>
                            ${escapeHtml(toTitleCase(p.status))}
                        </td>

                        <td>
                            <button
                                class="btn-delete"
                                onclick="deleteProject(${p.id})"
                            >
                                🗑️
                            </button>
                        </td>

                    </tr>
                `).join("")
                : `
                    <tr>
                        <td colspan="7">
                            No projects found.
                        </td>
                    </tr>
                `;


        document.getElementById(
            "app"
        ).innerHTML = `

            <div class="form-box">

                <h2>
                    Add Exam
                </h2>

                <input
                    type="text"
                    id="examCourseName"
                    list="examCourseNameOptions"
                    placeholder="Select or type a course name..."
                    autocomplete="off"
                    oninput="
                        fillCourseInfoByName(
                            'examCourseName',
                            'examTeacherName'
                        )
                    "
                >

                <datalist id="examCourseNameOptions">
                    ${courseNameDatalistOptions}
                </datalist>


                <input
                    type="text"
                    id="examTeacherName"
                    placeholder="Instructor name"
                >

                <input
                    type="date"
                    id="examDate"
                >


                <select id="examType">

                    <option value="midterm">
                        Midterm
                    </option>

                    <option value="final">
                        Final
                    </option>

                    <option value="quiz">
                        Quiz
                    </option>

                    <option value="other">
                        Other
                    </option>

                </select>


                <button
                    onclick="saveExam()"
                >
                    Save Exam
                </button>

            </div>


            <table>

                <thead>

                    <tr>
                        <th>Course</th>
                        <th>Instructor</th>
                        <th>Type</th>
                        <th>Date</th>
                        <th>Time Left</th>
                        <th>Action</th>
                    </tr>

                </thead>

                <tbody>
                    ${examRows}
                </tbody>

            </table>


            <div class="form-box">

                <h2>
                    Add Project
                </h2>

                <input
                    type="text"
                    id="projectCourseName"
                    list="projectCourseNameOptions"
                    placeholder="Select or type a course name..."
                    autocomplete="off"
                    oninput="
                        fillCourseInfoByName(
                            'projectCourseName',
                            'projectTeacherName'
                        )
                    "
                >

                <datalist id="projectCourseNameOptions">
                    ${courseNameDatalistOptions}
                </datalist>


                <input
                    type="text"
                    id="projectTopic"
                    placeholder="Project topic"
                >


                <input
                    type="text"
                    id="projectTeacherName"
                    placeholder="Instructor name"
                >


                <input
                    type="date"
                    id="projectDueDate"
                >


                <select id="projectStatus">

                    <option value="pending">
                        Pending
                    </option>

                    <option value="in progress">
                        In Progress
                    </option>

                    <option value="completed">
                        Completed
                    </option>

                </select>


                <button
                    onclick="saveProject()"
                >
                    Save Project
                </button>

            </div>


            <table>

                <thead>

                    <tr>
                        <th>Course</th>
                        <th>Project Topic</th>
                        <th>Instructor</th>
                        <th>Due Date</th>
                        <th>Time Left</th>
                        <th>Status</th>
                        <th>Action</th>
                    </tr>

                </thead>

                <tbody>
                    ${projectRows}
                </tbody>

            </table>
        `;

    } catch (err) {

        console.error(
            "Exams Page Error:",
            err
        );

        document.getElementById(
            "app"
        ).innerHTML =
            `<p>Exams and projects could not be loaded.</p>`;
    }
}

async function saveExam() {

    const courseNameInput =
        toTitleCase(
            document.getElementById(
                "examCourseName"
            ).value.trim()
        );

    const examName =
        toTitleCase(
            document.getElementById(
                "examTeacherName"
            ).value.trim()
        );

    const examDate =
        document.getElementById(
            "examDate"
        ).value;

    const examType =
        document.getElementById(
            "examType"
        ).value;


    if (
        !courseNameInput ||
        !examName ||
        !examDate ||
        !examType
    ) {
        showToast(
            "Course, instructor name, date and exam type are required.",
            "warning"
        );

        return;
    }


    try {

        const courseId =
            await getOrCreateCourseIdByName(
                courseNameInput,
                examName
            );

        if (!courseId) {
            showToast(
                "Course could not be found or created.",
                "error"
            );

            return;
        }

        const exam = {
            courseId,
            examName,
            examDate,
            examType,
            score: ""
        };

        const response =
            await fetch(
                `${API_URL}/exams`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body:
                        JSON.stringify(exam)
                }
            );


        if (!response.ok) {
            showToast(
                "Exam could not be saved.",
                "error"
            );

            return;
        }


        await loadExamsPage();

    } catch (err) {

        console.error(
            "Exam Save Error:",
            err
        );

        showToast(
            "Exam could not be saved.",
            "error"
        );
    }
}

async function deleteExam(id) {

    const confirmed =
        await showConfirm(
            "Delete Exam",
            "Are you sure you want to delete this exam? This action cannot be undone."
        );

    if (!confirmed) return;

    try {

        const response =
            await fetch(
                `${API_URL}/exams/${id}`,
                {
                    method: "DELETE"
                }
            );


        if (!response.ok) {
            showToast(
                "Exam could not be deleted.",
                "error"
            );

            return;
        }


        await loadExamsPage();

    } catch (err) {

        console.error(
            "Exam Delete Error:",
            err
        );

        showToast(
            "Exam could not be deleted.",
            "error"
        );
    }
}

async function saveProject() {

    const courseNameInput =
        toTitleCase(
            document.getElementById(
                "projectCourseName"
            ).value.trim()
        );

    const projectName =
        toTitleCase(
            document.getElementById(
                "projectTopic"
            ).value.trim()
        );

    const dueDate =
        document.getElementById(
            "projectDueDate"
        ).value;

    const description =
        toTitleCase(
            document.getElementById(
                "projectTeacherName"
            ).value.trim()
        );

    const status =
        document.getElementById(
            "projectStatus"
        ).value;


    if (
        !courseNameInput ||
        !projectName ||
        !dueDate
    ) {
        showToast(
            "Course, project topic and due date are required.",
            "warning"
        );

        return;
    }


    try {

        const courseId =
            await getOrCreateCourseIdByName(
                courseNameInput,
                description
            );

        if (!courseId) {
            showToast(
                "Course could not be found or created.",
                "error"
            );

            return;
        }

        const project = {
            courseId,
            projectName,
            dueDate,
            description,
            score: "",
            status
        };

        const response =
            await fetch(
                `${API_URL}/projects`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body:
                        JSON.stringify(project)
                }
            );


        if (!response.ok) {
            showToast(
                "Project could not be saved.",
                "error"
            );

            return;
        }


        await loadExamsPage();

    } catch (err) {

        console.error(
            "Project Save Error:",
            err
        );

        showToast(
            "Project could not be saved.",
            "error"
        );
    }
}

async function deleteProject(id) {

    const confirmed =
        await showConfirm(
            "Delete Project",
            "Are you sure you want to delete this project? This action cannot be undone."
        );

    if (!confirmed) return;

    try {

        const response =
            await fetch(
                `${API_URL}/projects/${id}`,
                {
                    method: "DELETE"
                }
            );


        if (!response.ok) {
            showToast(
                "Project could not be deleted.",
                "error"
            );

            return;
        }


        await loadExamsPage();

    } catch (err) {

        console.error(
            "Project Delete Error:",
            err
        );

        showToast(
            "Project could not be deleted.",
            "error"
        );
    }
}


/* ─── EVENTS ──────────────────────────────────────────────────────────────────*/

document
    .getElementById("dashboardBtn")
    ?.addEventListener(
        "click",
        loadDashboard
    );

document
    .getElementById("coursesBtn")
    ?.addEventListener(
        "click",
        loadCourses
    );

document
    .getElementById("examsBtn")
    ?.addEventListener(
        "click",
        loadExamsPage
    );

document
    .getElementById("studyBtn")
    ?.addEventListener(
        "click",
        loadStudyPage
    );


/* ─── START ───────────────────────────────────────────────────────────────────*/

window.onAuthenticated =
    loadDashboard;
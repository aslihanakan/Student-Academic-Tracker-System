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
            fetchJson(`${API_URL}/courses?includeUnlisted=1`),
            fetchJson(`${API_URL}/study-sessions`),
            fetchJson(`${API_URL}/exams`),
            fetchJson(`${API_URL}/projects`),
            fetchJson(`${API_URL}/todos`)
        ]);

        window._dashboardActivities = todos;
        window._allCoursesForDeadlines = courses;
        window._allCourses = courses;

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
                id: e.id,
                title: `${e.courseName} — ${toTitleCase(e.examType)} Exam`,
                detail: `Instructor: ${formatEmpty(e.examName)}`,
                date: toDateText(e.examDate),
                type: "Exam",
                isDone: Number(e.isDone) === 1
            })),
            ...projects.map(p => ({
                id: p.id,
                title: `${p.courseName} — ${p.projectName}`,
                detail: `Description: ${formatEmpty(p.description)}`,
                date: toDateText(p.dueDate),
                type: "Project",
                isDone: p.status === "completed"
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
        const hasNotes = getDayNotes(dateText).length > 0;
        const cellClasses = [
            "calendar-cell",
            dateText === todayText ? "today" : "",
            hasNotes ? "has-note" : ""
        ].filter(Boolean).join(" ");

        cells += `
            <div class="${cellClasses}" onclick="openCalendarDayModal('${dateText}')" style="cursor:pointer;">
                <div class="calendar-date-row">
                    <div class="calendar-date">${day}</div>
                    ${hasNotes ? `<span class="calendar-note-pin" title="Has notes">📌</span>` : ""}
                </div>
                ${hasNotes ? `<div class="calendar-event calendar-note-badge">📌 Note</div>` : ""}
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

function ensureDayModalStyles() {
    // Styles are defined in style.css
}

function openCalendarDayModal(dateText) {
    if (!dateText) return;
    ensureDayModalStyles();

    document.getElementById("day-detail-overlay")?.remove();

    const overlay = document.createElement("div");
    overlay.id = "day-detail-overlay";
    overlay.className = "day-modal-overlay";
    overlay.innerHTML = buildDayModalHtml(dateText);
    document.body.appendChild(overlay);

    overlay.addEventListener("click", function (e) {
        if (e.target === overlay) closeDayModal();
    });
}

function closeDayModal() {
    document.getElementById("day-detail-overlay")?.remove();
}

const DAY_NOTES_STORAGE_PREFIX = "sat_day_notes_";

function getDayNotes(dateText) {
    try {
        const raw = localStorage.getItem(DAY_NOTES_STORAGE_PREFIX + dateText);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}

function setDayNotes(dateText, notes) {
    try {
        localStorage.setItem(DAY_NOTES_STORAGE_PREFIX + dateText, JSON.stringify(notes));
    } catch (e) {}
}

function buildDayModalHtml(dateText) {
    const dateObj = new Date(dateText + "T00:00:00");
    const weekday = dateObj.toLocaleDateString("en-US", { weekday: "long" });
    const niceDate = dateObj.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });

    const events = (calendarDeadlines || []).filter(e => e.date === dateText);
    const activities = (window._dashboardActivities || [])
        .filter(t => ["homework", "quiz", "other"].includes(t.type))
        .filter(t => toDateText(t.dueDate) === dateText);

    const dayNotes = getDayNotes(dateText);

    const eventsHtml = events.map(e => `
        <div class="day-modal-item">
            <input type="checkbox" class="done-checkbox" ${e.isDone ? "checked" : ""} onchange="toggleDayModalDeadlineDone('${e.type}', ${e.id}, this.checked, '${dateText}')">
            <div class="day-modal-item-body">
                <span class="badge badge-${e.type.toLowerCase()}">${escapeHtml(e.type)}</span>
                <div class="day-modal-item-title">${escapeHtml(e.title)}</div>
                <div class="day-modal-item-detail">${escapeHtml(e.detail)}</div>
            </div>
        </div>
    `).join("");

    const activitiesHtml = activities.map(a => `
        <div class="day-modal-item">
            <input type="checkbox" class="done-checkbox" ${Number(a.isDone) === 1 ? "checked" : ""} onchange="toggleDayModalActivityDone(${a.id}, this.checked, '${dateText}')">
            <div class="day-modal-item-body">
                <span class="reminder-type-tag">${escapeHtml(toTitleCase(a.type))}</span>
                <div class="day-modal-item-title">${escapeHtml(a.courseName)}</div>
                <div class="day-modal-item-detail">${escapeHtml(a.title)}</div>
            </div>
        </div>
    `).join("");

    const notesHtml = dayNotes.map(n => `
        <div class="sticky-note-card">
            <button
                type="button"
                class="sticky-note-delete"
                onclick="deleteDayNote('${dateText}', '${n.id}')"
                title="Delete note"
                aria-label="Delete note"
            >✕</button>
            <div class="sticky-note-text">${escapeHtml(n.text)}</div>
        </div>
    `).join("");

    const hasRecords = events.length || activities.length;
    const recordsHtml = hasRecords
        ? `<div class="day-modal-list">${eventsHtml}${activitiesHtml}</div>`
        : `<p class="empty-text day-modal-empty-records">No deadlines or activities for this day.</p>`;

    const notesSectionHtml = dayNotes.length
        ? `<div class="day-modal-notes-section">${notesHtml}</div>`
        : "";

    return `
        <div class="day-modal-box" onclick="event.stopPropagation()">
            <div class="day-modal-header">
                <div>
                    <div class="day-modal-title">${escapeHtml(niceDate)}</div>
                    <div class="day-modal-subtitle">${escapeHtml(weekday)}</div>
                </div>
                <button type="button" class="day-modal-close" onclick="closeDayModal()">✕</button>
            </div>

            ${recordsHtml}
            ${notesSectionHtml}

            <div class="day-modal-add">
                <div class="day-modal-add-title">Add a note</div>
                <div class="sticky-note-compose">
                    <textarea
                        id="dayModalNoteText"
                        placeholder="Write a note for this day..."
                        rows="4"
                    ></textarea>
                </div>
                <button type="button" class="day-note-save-btn" onclick="submitDayModalNote('${dateText}')">Save Note</button>
            </div>
        </div>
    `;
}

function submitDayModalNote(dateText) {
    const textarea = document.getElementById("dayModalNoteText");
    const text = textarea.value.trim();

    if (!text) {
        showToast("Please write a note first.", "warning");
        return;
    }

    const notes = getDayNotes(dateText);
    notes.push({ id: String(Date.now()), text });
    setDayNotes(dateText, notes);

    showToast("Note added.", "success");
    renderCalendar();
    openCalendarDayModal(dateText);
}

function deleteDayNote(dateText, noteId) {
    const notes = getDayNotes(dateText).filter(n => n.id !== noteId);
    setDayNotes(dateText, notes);
    renderCalendar();
    openCalendarDayModal(dateText);
}

async function toggleDayModalDeadlineDone(type, id, isDone, dateText) {
    try {
        const response = type === "Exam"
            ? await fetch(`${API_URL}/exams/${id}/status`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isDone })
            })
            : await fetch(`${API_URL}/projects/${id}/status`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: isDone ? "completed" : "pending" })
            });

        if (!response.ok) {
            showToast("Status could not be updated.", "error");
            return;
        }

        await loadDashboard();
        openCalendarDayModal(dateText);
    } catch (err) {
        console.error("Day Modal Deadline Toggle Error:", err);
        showToast("Status could not be updated.", "error");
    }
}

async function toggleDayModalActivityDone(id, isDone, dateText) {
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
        openCalendarDayModal(dateText);
    } catch (err) {
        console.error("Day Modal Activity Toggle Error:", err);
        showToast("Activity status could not be updated.", "error");
    }
}
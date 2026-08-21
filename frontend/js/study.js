/* ─── STUDY SESSIONS ──────────────────────────────────────────────────────────*/

let selectedStudyDate = null;
let editingStudySessionId = null;

async function loadStudyPage(resetToToday = true) {
    updateStickyHeader("study");

    try {
        const [courses, sessions] = await Promise.all([
            fetchJson(`${API_URL}/courses?includeUnlisted=1&scope=study`),
            fetchJson(`${API_URL}/study-sessions`)
        ]);

        window._allCourses = courses;
        window._currentPageCourses = courses;

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

        if (typeof autoFormatInput === "function") {
            autoFormatInput(document.getElementById("studyCourseName"), "title");
            autoFormatInput(document.getElementById("studyTopic"), "sentence");
        }
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

    const courseId = await getOrCreateCourseIdByName(enteredCourseName, null, "study");

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
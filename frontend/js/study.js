/* ─── STUDY SESSIONS ──────────────────────────────────────────────────────────*/

let selectedStudyDate = null;
let editingStudySessionId = null;

async function loadStudyPage(resetToToday = true) {
    updateStickyHeader("study");

    try {
        let courses = window._allCourses || window._currentPageCourses || window._allCoursesForDeadlines || [];
        let sessions = window._allSessions || [];

        try {
            const results = await Promise.all([
                fetchJson(`${API_URL}/courses?includeUnlisted=1&scope=study`),
                fetchJson(`${API_URL}/study-sessions`)
            ]);
            if (Array.isArray(results[0])) courses = results[0];
            if (Array.isArray(results[1])) sessions = results[1];
        } catch (fetchErr) {
            console.warn("Study Page Network/Cache Fallback:", fetchErr);
            if (!courses.length) {
                courses = (await fetchJson(`${API_URL}/courses?includeUnlisted=1`).catch(() => [])) || [];
            }
            if (!sessions.length) {
                sessions = (await fetchJson(`${API_URL}/study-sessions`).catch(() => [])) || [];
            }
        }

        window._allCourses = courses;
        window._currentPageCourses = courses;
        window._allSessions = sessions;

        const studyCourseDatalistOptions = (courses || []).map(c => `<option value="${escapeHtml(c.courseName)}"></option>`).join("");
        const courseFilterOptions = (courses || []).map(c => `<option value="${escapeHtml(c.courseName)}">${escapeHtml(c.courseName)}</option>`).join("");

        const uniqueDates = [...new Set((sessions || []).map(s => String(s.studyDate).split("T")[0]))].sort().reverse();
        const dateFilterOptions = uniqueDates.map(d => `<option value="${d}">${d}</option>`).join("");

        const todayText = new Date().toLocaleDateString("sv-SE");

        if (resetToToday) {
            selectedStudyDate = todayText;
        } else if (!selectedStudyDate) {
            selectedStudyDate = uniqueDates[0] || todayText;
        }

        document.getElementById("app").innerHTML = `
            <div class="form-box add-form-box">
                <div class="form-box-header" onclick="toggleAddFormBox(this)">
                    <h2 id="studyFormTitle">${escapeHtml(typeof t === 'function' ? t('study_add_heading', 'Add Study Session') : 'Add Study Session')}</h2>
                    <span class="form-box-chevron">▾</span>
                </div>

                <input type="text" id="studyCourseName" list="studyCourseOptions" placeholder="${escapeHtml(typeof t === 'function' ? t('study_course_placeholder', 'Type course name...') : 'Type course name...')}" autocomplete="off">
                <datalist id="studyCourseOptions">${studyCourseDatalistOptions}</datalist>

                <input type="number" id="studyHours" placeholder="${escapeHtml(typeof t === 'function' ? t('study_hours_placeholder', 'Study hours') : 'Study hours')}" step="0.5" min="0.5">
                <input type="text" id="studyTopic" placeholder="${escapeHtml(typeof t === 'function' ? t('study_topic_placeholder', 'Studied topics') : 'Studied topics')}">

                <button id="studySaveButton" onclick="saveStudySession()">${escapeHtml(typeof t === 'function' ? t('study_save_btn', 'Save Session') : 'Save Session')}</button>
                <button id="studyCancelButton" onclick="cancelStudyEdit()" style="display:none;">${escapeHtml(typeof t === 'function' ? t('btn_cancel', 'Cancel') : 'Cancel Edit')}</button>
            </div>

            <div class="form-box filter-box">
                <h2>🔍 ${escapeHtml(typeof t === 'function' ? t('study_filter_heading', 'Filter Sessions') : 'Filter Sessions')}</h2>
                <div class="filter-row">
                    <select id="filterDate" onchange="changeStudyDateFromFilter()">
                        <option value="">${escapeHtml(typeof t === 'function' ? t('study_all_dates', 'All Dates') : 'All Dates')}</option>
                        ${dateFilterOptions}
                    </select>

                    <select id="filterCourse" onchange="renderSessionsBySelectedDate()">
                        <option value="">${escapeHtml(typeof t === 'function' ? t('study_all_courses', 'All Courses') : 'All Courses')}</option>
                        ${courseFilterOptions}
                    </select>

                    <button onclick="clearStudyFilters()">${escapeHtml(typeof t === 'function' ? t('btn_clear_filter', 'Clear Filter') : 'Clear Filter')}</button>
                </div>
            </div>

            <div class="study-day-panel">
                <div class="study-day-nav">
                    <button onclick="changeStudyDay(-1)">← ${escapeHtml(typeof t === 'function' ? t('btn_prev_day', 'Previous Day') : 'Previous Day')}</button>
                    <div class="study-day-title">
                        <h2 id="selected-study-date-title"></h2>
                        <p id="selected-study-date-subtitle"></p>
                    </div>
                    <button id="studyGoToTodayBtn" class="study-today-btn" onclick="goToStudyToday()" style="display:none;">📍 ${escapeHtml(typeof t === 'function' ? t('btn_goto_today', 'Go to Today') : 'Go to Today')}</button>
                </div>
                <div id="single-day-session-table"></div>
            </div>
        `;

        const filterDateEl = document.getElementById("filterDate");
        if (filterDateEl) filterDateEl.value = selectedStudyDate;
        renderSessionsBySelectedDate();

        if (typeof autoFormatInput === "function") {
            autoFormatInput(document.getElementById("studyCourseName"), "title");
            autoFormatInput(document.getElementById("studyTopic"), "sentence");
        }
    } catch (err) {
        console.error("Study Page Load Error:", err);
        document.getElementById("app").innerHTML = `<div class="empty-day-box"><h3>${escapeHtml(typeof t === 'function' ? t('study_title', 'Study Sessions') : 'Study Sessions')}</h3><p>${escapeHtml(typeof t === 'function' ? t('study_no_sessions', 'No study sessions found.') : 'No study sessions found.')}</p></div>`;
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

    const lang = typeof getCurrentLanguage === "function" ? getCurrentLanguage() : "en";
    const localeMap = {
        en: "en-US", tr: "tr-TR", de: "de-DE", es: "es-ES",
        fr: "fr-FR", it: "it-IT", ru: "ru-RU", ko: "ko-KR",
        ja: "ja-JP", ar: "ar-SA"
    };
    const activeLocale = localeMap[lang] || "en-US";
    const dayName = new Date(selectedStudyDate + "T00:00:00").toLocaleDateString(activeLocale, { weekday: "long" });

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
                <h3>${escapeHtml(typeof t === 'function' ? t('study_no_sessions', 'No study sessions found.') : 'No study sessions found.')}</h3>
                <p>${escapeHtml(typeof t === 'function' ? t('study_no_for_day', { date: selectedStudyDate, day: dayName }) : `There is no saved study session for ${selectedStudyDate} (${dayName}).`)}</p>
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
                        '${escapeForOnclick(String(s.id))}',
                        '${escapeForOnclick(s.courseName)}',
                        '${escapeForOnclick(s.hours)}',
                        '${escapeForOnclick(s.note ?? "")}'
                    )"
                >
                    ✏️
                </button>
                <button class="btn-delete icon-btn" onclick="deleteStudySession('${escapeForOnclick(String(s.id))}')">
                    🗑️
                </button>
            </td>
        </tr>
    `).join("");

    container.innerHTML = `
        <div class="single-session-table-header">
            <span>${escapeHtml(typeof t === 'function' ? t('study_sessions_for', { date: selectedStudyDate, day: dayName }) : `Sessions for ${selectedStudyDate} (${dayName})`)}</span>
            <strong>${escapeHtml(typeof t === 'function' ? t('dash_total', 'Total') : 'Total')}: ${dayTotal}h</strong>
        </div>
        <table>
            <thead>
                <tr>
                    <th>${escapeHtml(typeof t === 'function' ? t('courses_table_course', 'Course') : 'Course')}</th>
                    <th>${escapeHtml(typeof t === 'function' ? t('study_table_duration', 'Duration') : 'Duration')}</th>
                    <th>${escapeHtml(typeof t === 'function' ? t('study_table_topic', 'Topic') : 'Topic')}</th>
                    <th>${escapeHtml(typeof t === 'function' ? t('courses_table_action', 'Action') : 'Action')}</th>
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
        showToast(typeof t === "function" ? t("toast_course_required", "Course name and study hours are required.") : "Course name and study hours are required.", "warning");
        return;
    }

    if (!editingStudySessionId && selectedStudyDate) {
        const todayText = new Date().toLocaleDateString("sv-SE");

        if (selectedStudyDate !== todayText) {
            const friendlyDate = new Date(selectedStudyDate + "T00:00:00").toLocaleDateString(typeof getCurrentLanguage === "function" ? getCurrentLanguage() : "en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric"
            });

            const confirmedPastDate = await showConfirm(
                typeof t === "function" ? t("study_form_add_title", "Add Entry For a Different Day?") : "Add Entry For a Different Day?",
                typeof t === "function" ? t("study_confirm_different_day", `You are about to add a study session for ${friendlyDate}, not today. Do you want to continue?`) : `You are about to add a study session for ${friendlyDate}, not today. Do you want to continue?`,
                typeof t === "function" ? t("btn_save", "Yes, add it") : "Yes, add it"
            );

            if (!confirmedPastDate) return;
        }
    }

    const courseId = await getOrCreateCourseIdByName(enteredCourseName, null, "study");

    if (!courseId) {
        showToast(typeof t === "function" ? t("toast_course_save_err", "Course could not be found or created.") : "Course could not be found or created.", "error");
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

        const resData = await response.json().catch(() => ({}));
        const newId = editingStudySessionId || resData.id || ("temp_" + Date.now());
        const savedSession = {
            id: newId,
            courseName: enteredCourseName,
            courseId: courseId,
            studyDate: session.studyDate,
            hours: session.hours,
            note: session.note
        };

        if (window._allSessions) {
            window._allSessions = [savedSession, ...window._allSessions.filter(s => String(s.id) !== String(newId))];
        }
        if (typeof saveOfflineCache === "function") {
            saveOfflineCache(`${API_URL}/study-sessions`, window._allSessions);
        }

        editingStudySessionId = null;
        showToast(typeof t === "function" ? t("toast_study_saved_success", "Study session saved successfully!") : "Study session saved successfully!", "success");
        await loadStudyPage(false);
    } catch (err) {
        if (!navigator.onLine || err.name === "TypeError") {
            if (typeof queueOfflineAction === "function") {
                queueOfflineAction({
                    url: editingStudySessionId ? `${API_URL}/study-sessions/${editingStudySessionId}` : `${API_URL}/study-sessions`,
                    method: editingStudySessionId ? "PUT" : "POST",
                    body: session,
                    description: `Study session for ${enteredCourseName}`
                });
            }
            const localItem = {
                id: editingStudySessionId || ("temp_" + Date.now()),
                courseName: enteredCourseName,
                courseId: courseId,
                studyDate: session.studyDate,
                hours: session.hours,
                note: session.note
            };
            window._allSessions = [localItem, ...(window._allSessions || []).filter(s => String(s.id) !== String(localItem.id))];
            if (typeof saveOfflineCache === "function") {
                saveOfflineCache(`${API_URL}/study-sessions`, window._allSessions);
            }
            cancelStudyEdit();
            renderSessionsBySelectedDate();
            showToast(typeof t === "function" ? t("toast_offline_queued", "Saved offline. It will sync automatically when back online.") : "Saved offline. It will sync automatically when back online.", "warning");
            return;
        }

        console.error("Study Session Save Error:", err);
        showToast(typeof t === "function" ? t("toast_study_save_err", "Study session could not be saved.") : "Study session could not be saved.", "error");
    }
}

function editStudySession(id, courseName, hours, note) {
    editingStudySessionId = id;

    document.getElementById("studyCourseName").value = courseName;
    document.getElementById("studyHours").value = hours;
    document.getElementById("studyTopic").value = note;

    document.getElementById("studyFormTitle").textContent = typeof t === "function" ? t("study_form_edit_title", "Edit Study Session") : "Edit Study Session";
    document.getElementById("studySaveButton").textContent = typeof t === "function" ? t("study_form_btn_update", "Update Session") : "Update Session";
    document.getElementById("studyCancelButton").style.display = "inline-block";

    scrollAppFormIntoView();
    expandAddFormBoxIfCollapsed(document.getElementById("studySaveButton"));
}

function cancelStudyEdit() {
    editingStudySessionId = null;

    document.getElementById("studyCourseName").value = "";
    document.getElementById("studyHours").value = "";
    document.getElementById("studyTopic").value = "";

    document.getElementById("studyFormTitle").textContent = typeof t === "function" ? t("study_form_add_title", "Add Study Session") : "Add Study Session";
    document.getElementById("studySaveButton").textContent = typeof t === "function" ? t("study_form_btn_save", "Save Session") : "Save Session";
    document.getElementById("studyCancelButton").style.display = "none";
}

async function deleteStudySession(id) {
    const confirmed = await showConfirm(
        typeof t === "function" ? t("confirm_delete_session_title", "Delete Study Session") : "Delete Study Session",
        typeof t === "function" ? t("confirm_delete_session_msg", "Are you sure you want to delete this study session? This action cannot be undone.") : "Are you sure you want to delete this study session? This action cannot be undone.",
        typeof t === "function" ? t("btn_confirm_delete", "Yes, delete") : "Yes, delete"
    );

    if (!confirmed) return;

    try {
        const idStr = String(id);
        const isSynthetic = idStr.startsWith("temp_");

        if (isSynthetic) {
            if (typeof getOfflineQueue === "function" && typeof saveOfflineQueue === "function") {
                const q = getOfflineQueue().filter(item => !(item.url && item.url.includes("/study-sessions") && item.body && String(item.body.id) === idStr));
                saveOfflineQueue(q);
            }
        } else {
            const response = await fetch(`${API_URL}/study-sessions/${id}`, {
                method: "DELETE"
            });

            if (!response.ok && response.status !== 404) {
                showToast(typeof t === "function" ? t("toast_study_delete_err", "Study session could not be deleted.") : "Study session could not be deleted.", "error");
                return;
            }
        }

        if (window._allSessions) {
            window._allSessions = window._allSessions.filter(s => String(s.id) !== idStr);
        }
        if (typeof getOfflineCache === "function" && typeof saveOfflineCache === "function") {
            const cached = getOfflineCache(`${API_URL}/study-sessions`) || [];
            if (Array.isArray(cached)) {
                saveOfflineCache(`${API_URL}/study-sessions`, cached.filter(s => String(s.id) !== idStr));
            }
        }

        showToast(typeof t === "function" ? t("toast_study_deleted_success", "Study session deleted.") : "Study session deleted.", "success");
        await loadStudyPage(false);
    } catch (err) {
        console.error("Study Session Delete Error:", err);
        showToast(typeof t === "function" ? t("toast_study_delete_err", "Study session could not be deleted.") : "Study session could not be deleted.", "error");
    }
}
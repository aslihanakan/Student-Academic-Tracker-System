/* ─── DEADLINES PAGE: STATUS FILTERS & CLEANUP ────────────────────────────────*/

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
        { key: "all", label: (typeof t === "function" ? t("deadlines_all", "All") : "All") },
        { key: "upcoming", label: (typeof t === "function" ? t("deadlines_upcoming", "Upcoming") : "Upcoming") },
        { key: "overdue", label: (typeof t === "function" ? t("deadlines_overdue", "Overdue") : "Overdue") },
        { key: "completed", label: (typeof t === "function" ? t("deadlines_completed", "Completed") : "Completed") }
    ];

    return `
        <div class="status-filter-tabs">
            ${labels.map(l => `
                <button
                    type="button"
                    class="status-filter-tab${examsPageFilters[groupKey] === l.key ? " active" : ""}"
                    onclick="${onclickFnName}('${l.key}')"
                >
                    ${escapeHtml(l.label)}
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

async function cleanupOldCompletedRecords(items, dateKey, doneFn, deleteUrlFn, kindKey) {
    const stale = (items || []).filter(item => doneFn(item) && isOlderThanThreeMonths(item[dateKey]));

    const noItemsKey = kindKey === "exams" ? "toast_no_old_completed_exams" : (kindKey === "projects" ? "toast_no_old_completed_projects" : "toast_no_old_completed_activities");
    const confirmTitleKey = kindKey === "exams" ? "confirm_clean_old_exams_title" : (kindKey === "projects" ? "confirm_clean_old_projects_title" : "confirm_clean_old_activities_title");
    const confirmMsgKey = kindKey === "exams" ? "confirm_clean_old_exams_msg" : (kindKey === "projects" ? "confirm_clean_old_projects_msg" : "confirm_clean_old_activities_msg");

    if (!stale.length) {
        showToast(typeof t === "function" ? t(noItemsKey) : "No completed records older than 3 months found.", "success");
        return;
    }

    const confirmTitle = typeof t === "function" ? t(confirmTitleKey) : "Delete Old Records";
    const confirmMsg = typeof t === "function" ? t(confirmMsgKey, { n: stale.length }) : `${stale.length} old completed records will be deleted. Continue?`;
    const confirmBtn = typeof t === "function" ? t("btn_confirm_delete", "Yes, delete") : "Yes, delete";

    const confirmed = await showConfirm(confirmTitle, confirmMsg, confirmBtn);

    if (!confirmed) return;

    try {
        const results = await Promise.all(
            stale.map(item => fetch(deleteUrlFn(item.id), { method: "DELETE" }))
        );

        const failed = results.filter(r => !r.ok).length;

        if (failed) {
            showToast(`${failed} record(s) could not be deleted.`, "error");
        } else {
            showToast(typeof t === "function" ? t("toast_stale_records_deleted", { n: stale.length, kind: "" }) : `${stale.length} old completed records deleted.`, "success");
        }

        await loadExamsPage();
    } catch (err) {
        console.error("Cleanup Old Completed Records Error:", err);
        showToast(typeof t === "function" ? t("toast_old_records_delete_err", "Old completed records could not be deleted.") : "Old completed records could not be deleted.", "error");
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
        "exams"
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
        "projects"
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
        "activities"
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
                🧹 ${escapeHtml(typeof t === "function" ? t("deadlines_clean_old", "Delete Old Completed (3mo+)") : "Delete Old Completed (3mo+)")}
            </button>
        </div>
    `;
}


/* ─── EXAMS & PROJECTS ────────────────────────────────────────────────────────*/

async function loadExamsPage() {
    updateStickyHeader("exams");

    try {
        const [courses, exams, projects, todos] = await Promise.all([
            fetchJson(`${API_URL}/courses?includeUnlisted=1&scope=exams`),
            fetchJson(`${API_URL}/exams`),
            fetchJson(`${API_URL}/projects`),
            fetchJson(`${API_URL}/todos`)
        ]);

        window._allCoursesForDeadlines = courses;
        window._currentPageCourses = courses;
        const activities = todos.filter(t => ["homework", "quiz", "other"].includes(t.type));

        window._examsPageData = { courses, exams, projects, activities };

        const courseNameDatalistOptions = courses.map(c => `<option value="${escapeHtml(c.courseName)}"></option>`).join("");
        window._examsPageCourseOptions = courseNameDatalistOptions;

        document.getElementById("app").innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:10px;">
                <div style="font-size:13px; color:var(--theme-active-nav-color, #e2e8f0); font-weight:600;">
                    ${escapeHtml(typeof t === "function" ? t("deadlines_subtitle", "Track and manage your upcoming exams, projects, and assignments.") : "Track and manage your upcoming exams, projects, and assignments.")}
                </div>
                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                    <button
                        type="button"
                        class="btn-primary"
                        onclick="openSyllabusImportModal()"
                        style="display:inline-flex; align-items:center; gap:6px; padding:9px 16px; font-size:13px; font-weight:700; border-radius:9px; background:var(--theme-active-nav-bg, rgba(255,255,255,0.12)); border:1px solid var(--theme-active-nav-border, rgba(255,255,255,0.25)); color:#fff; cursor:pointer; box-shadow:0 2px 8px var(--theme-accent-glow, transparent);"
                    >
                        📑 ${escapeHtml(typeof t === "function" ? t("deadlines_syllabus_import", "Smart Syllabus Import") : "Smart Syllabus Import")}
                    </button>
                    <button
                        type="button"
                        class="btn-primary"
                        onclick="openCalendarExportModal()"
                        style="display:inline-flex; align-items:center; gap:6px; padding:9px 16px; font-size:13px; font-weight:700; border-radius:9px; background:var(--theme-accent-gradient, linear-gradient(135deg, #2563eb, #1d4ed8)); color:#fff; border:none; cursor:pointer; box-shadow:0 3px 12px var(--theme-accent-glow, rgba(37,99,235,0.25));"
                    >
                        📅 ${escapeHtml(typeof t === "function" ? t("dash_add_to_cal", "Add to Calendar") : "Add to Calendar")}
                    </button>
                </div>
            </div>

            <div class="form-box add-form-box">
                <div class="form-box-header" onclick="toggleAddFormBox(this)">
                    <h2>${escapeHtml(typeof t === "function" ? t("deadlines_add_exam", "Add Exam") : "Add Exam")}</h2>
                    <span class="form-box-chevron">▾</span>
                </div>

                <input
                    type="text"
                    id="examCourseName"
                    list="examCourseNameOptions"
                    placeholder="${escapeHtml(typeof t === 'function' ? t('deadlines_course_select_placeholder', 'Select or type a course name...') : 'Select or type a course name...')}"
                    autocomplete="off"
                    oninput="fillCourseInfoByName('examCourseName', 'examTeacherName')"
                >
                <datalist id="examCourseNameOptions">${courseNameDatalistOptions}</datalist>

                <input type="text" id="examTeacherName" placeholder="${escapeHtml(typeof t === 'function' ? t('courses_instructor_placeholder', 'Instructor Name') : 'Instructor name')}">
                <input type="date" id="examDate">

                <select id="examType">
                    <option value="midterm">${escapeHtml(typeof t === "function" ? t("deadlines_type_midterm", "Midterm") : "Midterm")}</option>
                    <option value="final">${escapeHtml(typeof t === "function" ? t("deadlines_type_final", "Final") : "Final")}</option>
                    <option value="quiz">${escapeHtml(typeof t === "function" ? t("deadlines_type_quiz", "Quiz") : "Quiz")}</option>
                    <option value="other">${escapeHtml(typeof t === "function" ? t("deadlines_type_other", "Other") : "Other")}</option>
                </select>

                <button id="examSaveButton" onclick="saveExam()">${escapeHtml(typeof t === "function" ? t("deadlines_save_exam", "Save Exam") : "Save Exam")}</button>
            </div>

            <div id="examsFilterTabsWrap">${buildFilterBarWithCleanup("exams", "setExamsFilter", "cleanupOldCompletedExams")}</div>

            <table>
                <thead>
                    <tr>
                        <th>${escapeHtml(typeof t === "function" ? t("courses_table_course", "Course") : "Course")}</th>
                        <th>${escapeHtml(typeof t === "function" ? t("courses_table_instructor", "Instructor") : "Instructor")}</th>
                        <th>${escapeHtml(typeof t === "function" ? t("deadlines_table_type", "Type") : "Type")}</th>
                        <th>${escapeHtml(typeof t === "function" ? t("deadlines_table_date", "Date") : "Date")}</th>
                        <th>${escapeHtml(typeof t === "function" ? t("courses_table_status", "Status") : "Status")}</th>
                        <th>${escapeHtml(typeof t === "function" ? t("btn_done", "Done") : "Done")}</th>
                        <th>${escapeHtml(typeof t === "function" ? t("courses_table_action", "Action") : "Action")}</th>
                    </tr>
                </thead>
                <tbody id="examsTableBody"></tbody>
            </table>

            <div class="form-box add-form-box">
                <div class="form-box-header" onclick="toggleAddFormBox(this)">
                    <h2>${escapeHtml(typeof t === "function" ? t("deadlines_add_project", "Add Project") : "Add Project")}</h2>
                    <span class="form-box-chevron">▾</span>
                </div>

                <input
                    type="text"
                    id="projectCourseName"
                    list="projectCourseNameOptions"
                    placeholder="${escapeHtml(typeof t === 'function' ? t('deadlines_course_select_placeholder', 'Select or type a course name...') : 'Select or type a course name...')}"
                    autocomplete="off"
                    oninput="fillCourseInfoByName('projectCourseName', 'projectTeacherName')"
                >
                <datalist id="projectCourseNameOptions">${courseNameDatalistOptions}</datalist>

                <input type="text" id="projectTopic" placeholder="${escapeHtml(typeof t === 'function' ? t('deadlines_project_topic_placeholder', 'Project topic') : 'Project topic')}">
                <input type="text" id="projectTeacherName" placeholder="${escapeHtml(typeof t === 'function' ? t('courses_instructor_placeholder', 'Instructor Name') : 'Instructor name')}">
                <input type="date" id="projectDueDate">

                <select id="projectStatus">
                    <option value="pending">${escapeHtml(typeof t === "function" ? t("status_pending", "Pending") : "Pending")}</option>
                    <option value="in progress">${escapeHtml(typeof t === "function" ? t("status_in_progress", "In Progress") : "In Progress")}</option>
                    <option value="completed">${escapeHtml(typeof t === "function" ? t("status_completed", "Completed") : "Completed")}</option>
                </select>

                <button id="projectSaveButton" onclick="saveProject()">${escapeHtml(typeof t === "function" ? t("deadlines_save_project", "Save Project") : "Save Project")}</button>
            </div>

            <div id="projectsFilterTabsWrap">${buildFilterBarWithCleanup("projects", "setProjectsFilter", "cleanupOldCompletedProjects")}</div>

            <table>
                <thead>
                    <tr>
                        <th>${escapeHtml(typeof t === "function" ? t("courses_table_course", "Course") : "Course")}</th>
                        <th>${escapeHtml(typeof t === "function" ? t("deadlines_table_project_topic", "Project Topic") : "Project Topic")}</th>
                        <th>${escapeHtml(typeof t === "function" ? t("courses_table_instructor", "Instructor") : "Instructor")}</th>
                        <th>${escapeHtml(typeof t === "function" ? t("deadlines_due_date", "Due Date") : "Due Date")}</th>
                        <th>${escapeHtml(typeof t === "function" ? t("courses_table_status", "Status") : "Status")}</th>
                        <th>${escapeHtml(typeof t === "function" ? t("btn_done", "Done") : "Done")}</th>
                        <th>${escapeHtml(typeof t === "function" ? t("courses_table_action", "Action") : "Action")}</th>
                    </tr>
                </thead>
                <tbody id="projectsTableBody"></tbody>
            </table>

            <div class="form-box add-form-box">
                <div class="form-box-header" onclick="toggleAddFormBox(this)">
                    <h2>${escapeHtml(typeof t === "function" ? t("deadlines_add_activity", "Add Activity (homework, quiz, etc.)") : "Add Activity (homework, quiz, etc.)")}</h2>
                    <span class="form-box-chevron">▾</span>
                </div>

                <input type="text" id="activityCourseName" list="activityCourseNameOptions" placeholder="${escapeHtml(typeof t === 'function' ? t('deadlines_course_select_placeholder', 'Select or type a course name...') : 'Select or type a course name...')}" autocomplete="off">
                <datalist id="activityCourseNameOptions">${courseNameDatalistOptions}</datalist>

                <select id="activityType">
                    <option value="homework">${escapeHtml(typeof t === "function" ? t("deadlines_type_homework", "Homework") : "Homework")}</option>
                    <option value="quiz">${escapeHtml(typeof t === "function" ? t("deadlines_type_quiz", "Quiz") : "Quiz")}</option>
                    <option value="other">${escapeHtml(typeof t === "function" ? t("deadlines_type_other", "Other") : "Other")}</option>
                </select>

                <input type="text" id="activityTitle" placeholder="${escapeHtml(typeof t === 'function' ? t('deadlines_activity_title_placeholder', 'What is it? (e.g. Chapter 3 exercises)') : 'What is it? (e.g. Chapter 3 exercises)')}">
                <input type="date" id="activityDueDate">

                <button id="activitySaveButton" onclick="saveActivity()">${escapeHtml(typeof t === "function" ? t("deadlines_save_activity", "Save Activity") : "Save Activity")}</button>
            </div>

            <div id="activitiesFilterTabsWrap">${buildFilterBarWithCleanup("activities", "setActivitiesFilter", "cleanupOldCompletedActivities")}</div>

            <table>
                <thead>
                    <tr>
                        <th>${escapeHtml(typeof t === "function" ? t("courses_table_course", "Course") : "Course")}</th>
                        <th>${escapeHtml(typeof t === "function" ? t("deadlines_table_type", "Type") : "Type")}</th>
                        <th>${escapeHtml(typeof t === "function" ? t("deadlines_table_title", "Title") : "Title")}</th>
                        <th>${escapeHtml(typeof t === "function" ? t("deadlines_due_date", "Due Date") : "Due Date")}</th>
                        <th>${escapeHtml(typeof t === "function" ? t("courses_table_status", "Status") : "Status")}</th>
                        <th>${escapeHtml(typeof t === "function" ? t("btn_done", "Done") : "Done")}</th>
                        <th>${escapeHtml(typeof t === "function" ? t("courses_table_action", "Action") : "Action")}</th>
                    </tr>
                </thead>
                <tbody id="activitiesTableBody"></tbody>
            </table>
        `;

        renderExamsTableBody();
        renderProjectsTableBody();
        renderActivitiesTableBody();

        if (typeof autoFormatInput === "function") {
            autoFormatInput(document.getElementById("examCourseName"), "title");
            autoFormatInput(document.getElementById("examTeacherName"), "title");
            autoFormatInput(document.getElementById("projectCourseName"), "title");
            autoFormatInput(document.getElementById("projectTopic"), "title");
            autoFormatInput(document.getElementById("projectTeacherName"), "title");
            autoFormatInput(document.getElementById("activityCourseName"), "title");
            autoFormatInput(document.getElementById("activityTitle"), "sentence");
        }
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
                    <input type="checkbox" class="done-checkbox" ${Number(e.isDone) === 1 ? "checked" : ""} onchange="toggleExamDone('${escapeForOnclick(String(e.id))}', this.checked)">
                </td>
                <td class="action-buttons">
                    <button
                        class="btn-edit"
                        onclick="editExam(
                            '${escapeForOnclick(String(e.id))}',
                            '${escapeForOnclick(e.courseName)}',
                            '${escapeForOnclick(e.examName)}',
                            '${escapeForOnclick(toDateText(e.examDate))}',
                            '${escapeForOnclick(e.examType)}',
                            '${escapeForOnclick(e.score ?? "")}'
                        )"
                        title="Edit Exam"
                    >
                        ✏️
                    </button>
                    <button class="btn-delete" onclick="deleteExam('${escapeForOnclick(String(e.id))}')" title="Delete Exam">🗑️</button>
                </td>
            </tr>
        `).join("")
        : `<tr><td colspan="7">No exams found for this filter.</td></tr>`;
}

async function toggleExamDone(id, isDone) {
    const idStr = String(id);
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

        const exam = window._examsPageData?.exams?.find(e => String(e.id) === idStr);
        if (exam) exam.isDone = isDone ? 1 : 0;

        if (window._allExams) {
            const allE = window._allExams.find(e => String(e.id) === idStr);
            if (allE) allE.isDone = isDone ? 1 : 0;
            if (typeof saveOfflineCache === "function") {
                saveOfflineCache(`${API_URL}/exams`, window._allExams);
            }
        }

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
                    <input type="checkbox" class="done-checkbox" ${p.status === "completed" ? "checked" : ""} onchange="toggleProjectDone('${escapeForOnclick(String(p.id))}', this.checked)">
                </td>
                <td class="action-buttons">
                    <button
                        class="btn-edit"
                        onclick="editProject(
                            '${escapeForOnclick(String(p.id))}',
                            '${escapeForOnclick(p.courseName)}',
                            '${escapeForOnclick(p.projectName)}',
                            '${escapeForOnclick(toDateText(p.dueDate))}',
                            '${escapeForOnclick(p.description ?? "")}',
                            '${escapeForOnclick(p.status)}',
                            '${escapeForOnclick(p.score ?? "")}'
                        )"
                        title="Edit Project"
                    >
                        ✏️
                    </button>
                    <button class="btn-delete" onclick="deleteProject('${escapeForOnclick(String(p.id))}')" title="Delete Project">🗑️</button>
                </td>
            </tr>
        `).join("")
        : `<tr><td colspan="7">No projects found for this filter.</td></tr>`;
}

async function toggleProjectDone(id, isDone) {
    const idStr = String(id);
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

        const project = window._examsPageData?.projects?.find(p => String(p.id) === idStr);
        if (project) project.status = isDone ? "completed" : "pending";

        if (window._allProjects) {
            const allP = window._allProjects.find(p => String(p.id) === idStr);
            if (allP) allP.status = isDone ? "completed" : "pending";
            if (typeof saveOfflineCache === "function") {
                saveOfflineCache(`${API_URL}/projects`, window._allProjects);
            }
        }

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
        showToast(typeof t === "function" ? t("toast_activity_required", "Course, title and due date are required.") : "Course, title and due date are required.", "warning");
        return;
    }

    try {
        const courseId = await getOrCreateCourseIdByName(courseNameInput, "-", "exams");

        if (!courseId) {
            showToast(typeof t === "function" ? t("toast_course_save_err", "Course could not be found or created.") : "Course could not be found or created.", "error");
            return;
        }

        const todoObj = { courseId, courseName: courseNameInput, type, title, dueDate };

        const response = await fetch(`${API_URL}/todos`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(todoObj)
        });

        if (!response.ok) {
            showToast(typeof t === "function" ? t("toast_activity_save_err", "Activity could not be saved.") : "Activity could not be saved.", "error");
            return;
        }

        const resData = await response.json().catch(() => ({}));
        const newId = resData.id || ("temp_" + Date.now());
        const savedActivity = { id: newId, isDone: 0, ...todoObj };

        if (typeof getOfflineCache === "function" && typeof saveOfflineCache === "function") {
            const currentTodos = getOfflineCache(`${API_URL}/todos`) || window._dashboardActivities || [];
            if (Array.isArray(currentTodos)) {
                const deduped = currentTodos.filter(t => String(t.id) !== String(newId));
                saveOfflineCache(`${API_URL}/todos`, [savedActivity, ...deduped]);
            }
        }
        if (window._dashboardActivities) {
            window._dashboardActivities = [savedActivity, ...window._dashboardActivities.filter(t => String(t.id) !== String(newId))];
        }

        document.getElementById("activityCourseName").value = "";
        document.getElementById("activityTitle").value = "";
        document.getElementById("activityDueDate").value = "";

        showToast(typeof t === "function" ? t("toast_activity_saved_success", "Activity saved successfully!") : "Activity saved successfully!", "success");
        await loadExamsPage();
    } catch (err) {
        console.error("Activity Save Error:", err);
        showToast(typeof t === "function" ? t("toast_activity_save_err", "Activity could not be saved.") : "Activity could not be saved.", "error");
    }
}

async function deleteActivity(id) {
    const confirmed = await showConfirm(
        typeof t === "function" ? t("confirm_delete_activity_title", "Delete Activity") : "Delete Activity",
        typeof t === "function" ? t("confirm_delete_activity_msg", "Are you sure you want to delete this activity? This action cannot be undone.") : "Are you sure you want to delete this activity? This action cannot be undone.",
        typeof t === "function" ? t("btn_confirm_delete", "Yes, delete") : "Yes, delete"
    );

    if (!confirmed) return;

    try {
        const idStr = String(id);
        const isSynthetic = idStr.startsWith("temp_");

        if (isSynthetic) {
            if (typeof getOfflineQueue === "function" && typeof saveOfflineQueue === "function") {
                const q = getOfflineQueue().filter(item => !(item.url && item.url.includes("/todos") && item.body && String(item.body.id) === idStr));
                saveOfflineQueue(q);
            }
        } else {
            const response = await fetch(`${API_URL}/todos/${id}`, {
                method: "DELETE"
            });

            if (!response.ok && response.status !== 404) {
                showToast(typeof t === "function" ? t("toast_activity_delete_err", "Activity could not be deleted.") : "Activity could not be deleted.", "error");
                return;
            }
        }

        if (window._dashboardActivities) {
            window._dashboardActivities = window._dashboardActivities.filter(t => String(t.id) !== idStr);
        }
        if (window._examsPageData?.activities) {
            window._examsPageData.activities = window._examsPageData.activities.filter(t => String(t.id) !== idStr);
        }
        if (typeof getOfflineCache === "function" && typeof saveOfflineCache === "function") {
            const cached = getOfflineCache(`${API_URL}/todos`) || [];
            if (Array.isArray(cached)) {
                saveOfflineCache(`${API_URL}/todos`, cached.filter(t => String(t.id) !== idStr));
            }
        }

        showToast(typeof t === "function" ? t("toast_activity_deleted_success", "Activity deleted.") : "Activity deleted.", "success");
        await loadExamsPage();
    } catch (err) {
        console.error("Activity Delete Error:", err);
        showToast(typeof t === "function" ? t("toast_activity_delete_err", "Activity could not be deleted.") : "Activity could not be deleted.", "error");
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
                    <input type="checkbox" class="done-checkbox" ${Number(a.isDone) === 1 ? "checked" : ""} onchange="toggleActivityDone('${escapeForOnclick(String(a.id))}', this.checked)">
                </td>
                <td class="action-buttons">
                    <button class="btn-delete" onclick="deleteActivity('${escapeForOnclick(String(a.id))}')">🗑️</button>
                </td>
            </tr>
        `).join("")
        : `<tr><td colspan="7">No activities found for this filter.</td></tr>`;
}

async function toggleActivityDone(id, isDone) {
    const idStr = String(id);
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

        const activity = window._examsPageData?.activities?.find(a => String(a.id) === idStr);
        if (activity) activity.isDone = isDone ? 1 : 0;

        if (window._dashboardActivities) {
            const allA = window._dashboardActivities.find(a => String(a.id) === idStr);
            if (allA) allA.isDone = isDone ? 1 : 0;
            if (typeof saveOfflineCache === "function") {
                saveOfflineCache(`${API_URL}/todos`, window._dashboardActivities);
            }
        }

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
        showToast(typeof t === "function" ? t("toast_exam_required", "Course, instructor name, date and exam type are required.") : "Course, instructor name, date and exam type are required.", "warning");
        return;
    }

    try {
        const courseId = await getOrCreateCourseIdByName(courseNameInput, examName, "exams");

        if (!courseId) {
            showToast(typeof t === "function" ? t("toast_course_save_err", "Course could not be found or created.") : "Course could not be found or created.", "error");
            return;
        }

        const exam = { courseId, courseName: courseNameInput, examName, examDate, examType, score: "" };

        const response = await fetch(`${API_URL}/exams`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(exam)
        });

        if (!response.ok) {
            showToast(typeof t === "function" ? t("toast_exam_save_err", "Exam could not be saved.") : "Exam could not be saved.", "error");
            return;
        }

        const resData = await response.json().catch(() => ({}));
        const newId = resData.id || ("temp_" + Date.now());
        const savedExam = { id: newId, isDone: 0, ...exam };

        if (typeof getOfflineCache === "function" && typeof saveOfflineCache === "function") {
            const currentExams = getOfflineCache(`${API_URL}/exams`) || window._allExams || [];
            if (Array.isArray(currentExams)) {
                const deduped = currentExams.filter(e => String(e.id) !== String(newId));
                saveOfflineCache(`${API_URL}/exams`, [savedExam, ...deduped]);
            }
        }
        if (window._allExams) {
            window._allExams = [savedExam, ...window._allExams.filter(e => String(e.id) !== String(newId))];
        }

        showToast(typeof t === "function" ? t("toast_exam_saved_success", "Exam saved successfully!") : "Exam saved successfully!", "success");
        await loadExamsPage();
    } catch (err) {
        console.error("Exam Save Error:", err);
        showToast(typeof t === "function" ? t("toast_exam_save_err", "Exam could not be saved.") : "Exam could not be saved.", "error");
    }
}

async function deleteExam(id) {
    const confirmed = await showConfirm(
        typeof t === "function" ? t("confirm_delete_exam_title", "Delete Exam") : "Delete Exam",
        typeof t === "function" ? t("confirm_delete_exam_msg", "Are you sure you want to delete this exam? This action cannot be undone.") : "Are you sure you want to delete this exam? This action cannot be undone.",
        typeof t === "function" ? t("btn_confirm_delete", "Yes, delete") : "Yes, delete"
    );

    if (!confirmed) return;

    try {
        const idStr = String(id);
        const isSynthetic = idStr.startsWith("temp_");

        if (isSynthetic) {
            if (typeof getOfflineQueue === "function" && typeof saveOfflineQueue === "function") {
                const q = getOfflineQueue().filter(item => !(item.url && item.url.includes("/exams") && item.body && String(item.body.id) === idStr));
                saveOfflineQueue(q);
            }
        } else {
            const response = await fetch(`${API_URL}/exams/${id}`, {
                method: "DELETE"
            });

            if (!response.ok && response.status !== 404) {
                showToast(typeof t === "function" ? t("toast_exam_delete_err", "Exam could not be deleted.") : "Exam could not be deleted.", "error");
                return;
            }
        }

        if (window._allExams) {
            window._allExams = window._allExams.filter(e => String(e.id) !== idStr);
        }
        if (window._examsPageData?.exams) {
            window._examsPageData.exams = window._examsPageData.exams.filter(e => String(e.id) !== idStr);
        }
        if (typeof getOfflineCache === "function" && typeof saveOfflineCache === "function") {
            const cached = getOfflineCache(`${API_URL}/exams`) || [];
            if (Array.isArray(cached)) {
                saveOfflineCache(`${API_URL}/exams`, cached.filter(e => String(e.id) !== idStr));
            }
        }

        showToast(typeof t === "function" ? t("toast_exam_deleted_success", "Exam deleted.") : "Exam deleted.", "success");
        await loadExamsPage();
    } catch (err) {
        console.error("Exam Delete Error:", err);
        showToast(typeof t === "function" ? t("toast_exam_delete_err", "Exam could not be deleted.") : "Exam could not be deleted.", "error");
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
            const courseId = await getOrCreateCourseIdByName(courseNameInput, examNameInput, "exams");

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
        showToast(typeof t === "function" ? t("toast_project_required", "Course, project topic and due date are required.") : "Course, project topic and due date are required.", "warning");
        return;
    }

    try {
        const courseId = await getOrCreateCourseIdByName(courseNameInput, description, "exams");

        if (!courseId) {
            showToast(typeof t === "function" ? t("toast_course_save_err", "Course could not be found or created.") : "Course could not be found or created.", "error");
            return;
        }

        const project = { courseId, courseName: courseNameInput, projectName, dueDate, description, score: "", status };

        const response = await fetch(`${API_URL}/projects`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(project)
        });

        if (!response.ok) {
            showToast(typeof t === "function" ? t("toast_project_save_err", "Project could not be saved.") : "Project could not be saved.", "error");
            return;
        }

        const resData = await response.json().catch(() => ({}));
        const newId = resData.id || ("temp_" + Date.now());
        const savedProject = { id: newId, ...project };

        if (typeof getOfflineCache === "function" && typeof saveOfflineCache === "function") {
            const currentProjects = getOfflineCache(`${API_URL}/projects`) || window._allProjects || [];
            if (Array.isArray(currentProjects)) {
                const deduped = currentProjects.filter(p => String(p.id) !== String(newId));
                saveOfflineCache(`${API_URL}/projects`, [savedProject, ...deduped]);
            }
        }
        if (window._allProjects) {
            window._allProjects = [savedProject, ...window._allProjects.filter(p => String(p.id) !== String(newId))];
        }

        showToast(typeof t === "function" ? t("toast_project_saved_success", "Project saved successfully!") : "Project saved successfully!", "success");
        await loadExamsPage();
    } catch (err) {
        console.error("Project Save Error:", err);
        showToast(typeof t === "function" ? t("toast_project_save_err", "Project could not be saved.") : "Project could not be saved.", "error");
    }
}

async function deleteProject(id) {
    const confirmed = await showConfirm(
        typeof t === "function" ? t("confirm_delete_project_title", "Delete Project") : "Delete Project",
        typeof t === "function" ? t("confirm_delete_project_msg", "Are you sure you want to delete this project? This action cannot be undone.") : "Are you sure you want to delete this project? This action cannot be undone.",
        typeof t === "function" ? t("btn_confirm_delete", "Yes, delete") : "Yes, delete"
    );

    if (!confirmed) return;

    try {
        const idStr = String(id);
        const isSynthetic = idStr.startsWith("temp_");

        if (isSynthetic) {
            if (typeof getOfflineQueue === "function" && typeof saveOfflineQueue === "function") {
                const q = getOfflineQueue().filter(item => !(item.url && item.url.includes("/projects") && item.body && String(item.body.id) === idStr));
                saveOfflineQueue(q);
            }
        } else {
            const response = await fetch(`${API_URL}/projects/${id}`, {
                method: "DELETE"
            });

            if (!response.ok && response.status !== 404) {
                showToast(typeof t === "function" ? t("toast_project_delete_err", "Project could not be deleted.") : "Project could not be deleted.", "error");
                return;
            }
        }

        if (window._allProjects) {
            window._allProjects = window._allProjects.filter(p => String(p.id) !== idStr);
        }
        if (window._examsPageData?.projects) {
            window._examsPageData.projects = window._examsPageData.projects.filter(p => String(p.id) !== idStr);
        }
        if (typeof getOfflineCache === "function" && typeof saveOfflineCache === "function") {
            const cached = getOfflineCache(`${API_URL}/projects`) || [];
            if (Array.isArray(cached)) {
                saveOfflineCache(`${API_URL}/projects`, cached.filter(p => String(p.id) !== idStr));
            }
        }

        showToast(typeof t === "function" ? t("toast_project_deleted_success", "Project deleted.") : "Project deleted.", "success");
        await loadExamsPage();
    } catch (err) {
        console.error("Project Delete Error:", err);
        showToast(typeof t === "function" ? t("toast_project_delete_err", "Project could not be deleted.") : "Project could not be deleted.", "error");
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
            const courseId = await getOrCreateCourseIdByName(courseNameInput, descriptionInput, "exams");

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

function exportDeadlinesToCalendarFile() {
    const data = window._examsPageData;
    if (!data) return;
    const events = [];

    (data.exams || []).forEach(e => {
        if (!e.examDate) return;
        events.push({
            id: `exam-${e.id}`,
            title: `[Exam] ${e.courseName || ''} - ${e.examName || 'Exam'}`,
            date: e.examDate,
            description: `Type: ${toTitleCase(e.examType || '')} | Course: ${e.courseName || ''}`
        });
    });

    (data.projects || []).forEach(p => {
        if (!p.dueDate) return;
        events.push({
            id: `proj-${p.id}`,
            title: `[Project] ${p.courseName || ''} - ${p.projectName || 'Project'}`,
            date: p.dueDate,
            description: `Project: ${p.projectName || ''} | Description: ${p.description || ''}`
        });
    });

    (data.activities || []).forEach(a => {
        if (!a.dueDate) return;
        events.push({
            id: `todo-${a.id}`,
            title: `[${toTitleCase(a.type || 'Task')}] ${a.courseName || ''} - ${a.title || 'Task'}`,
            date: a.dueDate,
            description: `Task for ${a.courseName || ''}`
        });
    });

    if (typeof downloadIcsCalendar === "function") {
        downloadIcsCalendar(events, "Academi_Buddy_Deadlines.ics");
    }
}
window.exportDeadlinesToCalendarFile = exportDeadlinesToCalendarFile;
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
                    >
                        ✏️
                    </button>
                    <button class="btn-delete" onclick="deleteExam('${escapeForOnclick(String(e.id))}')">🗑️</button>
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
                    >
                        ✏️
                    </button>
                    <button class="btn-delete" onclick="deleteProject('${escapeForOnclick(String(p.id))}')">🗑️</button>
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
        showToast("Course, title and due date are required.", "warning");
        return;
    }

    try {
        const courseId = await getOrCreateCourseIdByName(courseNameInput, "-", "exams");

        if (!courseId) {
            showToast("Course could not be found or created.", "error");
            return;
        }

        const todoObj = { courseId, courseName: courseNameInput, type, title, dueDate };

        const response = await fetch(`${API_URL}/todos`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(todoObj)
        });

        if (!response.ok) {
            showToast("Activity could not be saved.", "error");
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

        showToast("Activity saved successfully!", "success");
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
                showToast("Activity could not be deleted.", "error");
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

        showToast("Activity deleted.", "success");
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
        showToast("Course, instructor name, date and exam type are required.", "warning");
        return;
    }

    try {
        const courseId = await getOrCreateCourseIdByName(courseNameInput, examName, "exams");

        if (!courseId) {
            showToast("Course could not be found or created.", "error");
            return;
        }

        const exam = { courseId, courseName: courseNameInput, examName, examDate, examType, score: "" };

        const response = await fetch(`${API_URL}/exams`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(exam)
        });

        if (!response.ok) {
            showToast("Exam could not be saved.", "error");
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

        showToast("Exam saved successfully!", "success");
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
                showToast("Exam could not be deleted.", "error");
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

        showToast("Exam deleted.", "success");
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
        showToast("Course, project topic and due date are required.", "warning");
        return;
    }

    try {
        const courseId = await getOrCreateCourseIdByName(courseNameInput, description, "exams");

        if (!courseId) {
            showToast("Course could not be found or created.", "error");
            return;
        }

        const project = { courseId, courseName: courseNameInput, projectName, dueDate, description, score: "", status };

        const response = await fetch(`${API_URL}/projects`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(project)
        });

        if (!response.ok) {
            showToast("Project could not be saved.", "error");
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

        showToast("Project saved successfully!", "success");
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
                showToast("Project could not be deleted.", "error");
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

        showToast("Project deleted.", "success");
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
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
            label: typeof t === "function" ? t("courses_req_enter_weights", "Enter weights") : "Enter weights",
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
            return { value: 0, label: typeof t === "function" ? t("courses_req_passing", "✓ Passing") : "✓ Passing", color: "#22c55e" };
        }
        return { value: null, label: typeof t === "function" ? t("courses_req_impossible", "✗ Impossible") : "✗ Impossible", color: "#ef4444" };
    }

    const earnedSoFar = (m !== null ? m * mw : 0) + (p !== null ? p * pw : 0) + extraEarned;
    const needed = (pg - earnedSoFar) / fw;

    if (needed <= 0) {
        return { value: 0, label: typeof t === "function" ? t("courses_req_passing", "✓ Passing") : "✓ Passing", color: "#22c55e" };
    }

    if (needed > 100) {
        return { value: null, label: typeof t === "function" ? t("courses_req_impossible", "✗ Impossible") : "✗ Impossible", color: "#ef4444" };
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


/* ─── COURSES ─────────────────────────────────────────────────────────────────*/

function getTermLabel(c) {
    const year = c.academicYear && c.academicYear !== "Unspecified" ? String(c.academicYear).trim() : null;
    const sem = c.semester && c.semester !== "Unspecified" ? String(c.semester).trim() : null;

    if (!year && !sem) {
        return "No Term Assigned";
    }

    if (year && sem) {
        if (year === sem || year.includes(sem)) {
            return normalizeTermInput(year);
        }
        if (sem.includes(year)) {
            return normalizeTermInput(sem);
        }
        return normalizeTermInput(`${year} ${sem}`);
    }

    return normalizeTermInput(year || sem);
}

function formatTermForDisplay(termStr) {
    if (!termStr || termStr === "No Term Assigned") {
        return typeof t === "function" ? t("term_unassigned", "No Term Assigned") : "No Term Assigned";
    }
    const parts = (typeof getTermParts === "function") ? getTermParts(termStr) : null;
    if (!parts || !parts.year) return termStr;

    const gradeText = typeof formatLocalizedGradeLevel === "function" ? formatLocalizedGradeLevel(parts.grade) : parts.grade;
    let seasonKey = "term_fall";
    if (parts.season.toLowerCase().includes("spring") || parts.season.toLowerCase().includes("bahar")) {
        seasonKey = "term_spring";
    } else if (parts.season.toLowerCase().includes("summer") || parts.season.toLowerCase().includes("yaz")) {
        seasonKey = "term_summer";
    }
    const seasonText = typeof t === "function" ? t(seasonKey, parts.season) : parts.season;

    const otherKeywords = ["other", "diğer", "sonstiges", "otro", "autre", "altro", "другое", "기타", "その他", "أخرى"];
    const isOther = otherKeywords.includes(String(parts.grade || "").toLowerCase());
    const gradePart = (gradeText && !isOther) ? `${gradeText} ` : "";
    return `${parts.year} ${gradePart}${seasonText}`.replace(/\s+/g, " ").trim();
}
window.formatTermForDisplay = formatTermForDisplay;

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

const TERM_FORMAT_EXAMPLE = "2026-2027 4th Grade Fall Term";
const TERM_PARSER_REGEX = /^(\d{4})-(\d{4})\s+(?:(\d+)\.?\s*(?:Sınıf|sinif|Grade|th Grade|st Grade|nd Grade|rd Grade|Year|th Year|st Year|nd Year|rd Year)?\s+)?(Güz|Guz|Bahar|Yaz|Fall|Spring|Summer|Autumn)(?:\s*(?:Dönemi|Donemi|Term|Semester))?$/i;

function parseTermInfo(text) {
    const trimmed = String(text || "").trim();
    const match = TERM_PARSER_REGEX.exec(trimmed);
    if (!match) return null;

    const startYear = parseInt(match[1], 10);
    const endYear = parseInt(match[2], 10);

    if (endYear !== startYear + 1) return null;

    const gradeNumber = match[3] ? parseInt(match[3], 10) : null;
    const seasonRaw = match[4].toLowerCase();

    let seasonName = "Fall Term";

    if (seasonRaw === "güz" || seasonRaw === "guz" || seasonRaw === "fall" || seasonRaw === "autumn") {
        seasonName = "Fall Term";
    } else if (seasonRaw === "bahar" || seasonRaw === "spring") {
        seasonName = "Spring Term";
    } else if (seasonRaw === "yaz" || seasonRaw === "summer") {
        seasonName = "Summer Term";
    }

    let gradePrefix = "";
    if (gradeNumber) {
        const suffix = (gradeNumber === 1 ? "st" : gradeNumber === 2 ? "nd" : gradeNumber === 3 ? "rd" : "th");
        gradePrefix = `${gradeNumber}${suffix} Grade `;
    }

    return `${startYear}-${endYear} ${gradePrefix}${seasonName}`.replace(/\s+/g, " ").trim();
}

function isValidTermFormat(text) {
    return parseTermInfo(text) !== null;
}

function normalizeTermInput(text) {
    const parsed = parseTermInfo(text);
    return parsed !== null ? parsed : (text || "").trim();
}

function getTermParts(termStr) {
    const raw = String(termStr || "").trim();
    const match = TERM_PARSER_REGEX.exec(raw);

    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1;
    const fallbackYear = curMonth >= 9 ? `${curYear}-${curYear + 1}` : `${curYear - 1}-${curYear}`;
    const fallbackSeason = curMonth >= 9 ? "Fall Term" : (curMonth >= 6 ? "Summer Term" : "Spring Term");

    let fallbackGrade = "4th Grade";
    const storedUser = typeof getStoredUser === "function" ? getStoredUser() : null;
    if (storedUser?.gradeLevel) {
        const mGrade = /(\d+)/.exec(storedUser.gradeLevel);
        if (mGrade) {
            const num = parseInt(mGrade[1], 10);
            const suf = num === 1 ? "st" : num === 2 ? "nd" : num === 3 ? "rd" : "th";
            fallbackGrade = `${num}${suf} Grade`;
        } else if (storedUser.gradeLevel.toLowerCase().includes("prep")) {
            fallbackGrade = "Prep Year";
        }
    }

    if (!match) {
        return { year: fallbackYear, grade: fallbackGrade, season: fallbackSeason };
    }

    const startYear = parseInt(match[1], 10);
    const endYear = parseInt(match[2], 10);
    const yearStr = `${startYear}-${endYear}`;

    const gradeNumber = match[3] ? parseInt(match[3], 10) : null;
    let gradeStr = "Other";
    if (gradeNumber) {
        const suf = gradeNumber === 1 ? "st" : gradeNumber === 2 ? "nd" : gradeNumber === 3 ? "rd" : "th";
        gradeStr = `${gradeNumber}${suf} Grade`;
    } else if (raw.toLowerCase().includes("prep") || raw.toLowerCase().includes("hazırlık")) {
        gradeStr = "Prep Year";
    }

    const seasonRaw = match[4].toLowerCase();
    let seasonStr = "Fall Term";
    if (seasonRaw === "bahar" || seasonRaw === "spring") {
        seasonStr = "Spring Term";
    } else if (seasonRaw === "yaz" || seasonRaw === "summer") {
        seasonStr = "Summer Term";
    }

    return { year: yearStr, grade: gradeStr, season: seasonStr };
}

function assembleTerm(year, grade, season) {
    const y = (year || "2026-2027").trim();
    const g = (grade || "").trim();
    const s = (season || "Fall Term").trim();

    let gradePart = "";
    if (g && g !== "Other" && g !== "None") {
        gradePart = `${g} `;
    }

    return `${y} ${gradePart}${s}`.replace(/\s+/g, " ").trim();
}

function onTermControlsChange() {
    const yearInput = document.getElementById("termYearInput");
    const gradeSelect = document.getElementById("termGradeSelect");
    const seasonSelect = document.getElementById("termSeasonSelect");
    const hiddenInput = document.getElementById("academicYear");
    const previewEl = document.getElementById("termFormattedPreview");

    if (!yearInput || !gradeSelect || !seasonSelect || !hiddenInput) return;

    const term = assembleTerm(yearInput.value, gradeSelect.value, seasonSelect.value);
    hiddenInput.value = term;
    if (previewEl) {
        previewEl.textContent = formatTermForDisplay(term);
    }
    rememberActiveTerm(term);
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

    const reqCell = `<span style="color:${req.color}; font-weight:700">${escapeHtml(req.label)}</span>`;
    const result = calcCourseResult(c);

    const resultCell = result === "pass"
        ? `<span style="color:#22c55e;font-weight:700">✅ ${escapeHtml(typeof t === 'function' ? t('courses_result_pass', 'Pass') : 'Pass')}</span>`
        : result === "fail"
            ? `<span style="color:#ef4444;font-weight:700">❌ ${escapeHtml(typeof t === 'function' ? t('courses_result_fail', 'Fail') : 'Fail')}</span>`
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
                        '${escapeForOnclick(String(c.id))}',
                        '${escapeForOnclick(c.courseName)}',
                        '${escapeForOnclick(c.instructorName)}',
                        ${Number(c.credit) || 0},
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
                <button class="btn-delete" onclick="deleteCourse('${escapeForOnclick(String(c.id))}', '${escapeForOnclick(c.courseName)}')">
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
        const rawCourses = await fetchJson(`${API_URL}/courses`);
        const seenIds = new Set();
        const courses = (rawCourses || []).filter(c => {
            const idKey = String(c.id);
            if (seenIds.has(idKey)) return false;
            seenIds.add(idKey);
            return true;
        });

        window._coursesForGPA = courses;
        window._allCoursesForTermFilter = courses;

        const termGroups = groupCoursesByTerm(courses);
        const termKeys = [...termGroups.keys()];
        const realTermKeys = termKeys.filter(label => label !== "No Term Assigned");

        const defaultTerm = realTermKeys.length > 0 ? realTermKeys[0] : (termKeys[0] || "");
        const termOptions = termKeys.map(label => `<option value="${escapeHtml(label)}" ${label === defaultTerm ? "selected" : ""}>${escapeHtml(formatTermForDisplay(label))}</option>`).join("");
        const activeTermText = getStoredLastTerm() || (courses[0]?.academicYear ? normalizeTermInput(courses[0].academicYear) : "2026-2027 4th Grade Fall Term");
        const currentParts = getTermParts(activeTermText);
        const activeTermValue = assembleTerm(currentParts.year, currentParts.grade, currentParts.season);
        
        const gradeList = [
            { value: "4th Grade", key: "grade_4th", fallback: "4th Grade" },
            { value: "1st Grade", key: "grade_1st", fallback: "1st Grade" },
            { value: "2nd Grade", key: "grade_2nd", fallback: "2nd Grade" },
            { value: "3rd Grade", key: "grade_3rd", fallback: "3rd Grade" },
            { value: "Prep Year", key: "grade_prep", fallback: "Prep Year" },
            { value: "Other", key: "grade_other", fallback: "Other" }
        ];
        const gradeOptions = gradeList.map(g => `<option value="${escapeHtml(g.value)}" ${g.value === currentParts.grade ? "selected" : ""}>${escapeHtml(typeof t === "function" ? t(g.key, g.fallback) : g.fallback)}</option>`).join("");
        
        const seasonList = [
            { value: "Fall Term", key: "term_fall", fallback: "Fall Term" },
            { value: "Spring Term", key: "term_spring", fallback: "Spring Term" },
            { value: "Summer Term", key: "term_summer", fallback: "Summer Term" }
        ];
        const seasonOptions = seasonList.map(s => `<option value="${escapeHtml(s.value)}" ${s.value === currentParts.season ? "selected" : ""}>${escapeHtml(typeof t === "function" ? t(s.key, s.fallback) : s.fallback)}</option>`).join("");

        const rows = courses.length
            ? [...termGroups.entries()].map(([label, group]) => `
                <tr class="term-group-header" data-term="${escapeHtml(label)}">
                    <td colspan="11" style="background:var(--theme-active-nav-bg, #f1f5f9); font-weight:700; color:var(--theme-header-title, #1e293b); padding:10px 14px; border-left:4px solid var(--theme-primary, #3b82f6);">
                        📅 ${escapeHtml(formatTermForDisplay(label))}
                        <span style="font-weight:500; color:var(--theme-active-nav-color, #64748b);">(${group.length} ${group.length === 1 ? (typeof t === "function" ? t("courses_course_single", "course") : "course") : (typeof t === "function" ? t("courses_course_plural", "courses") : "courses")})</span>
                    </td>
                </tr>
                ${group.map(c => buildCourseRow(c, label)).join("")}
            `).join("")
            : `<tr><td colspan="11">No courses found.</td></tr>`;

        document.getElementById("app").innerHTML = `
            <div class="form-box add-form-box">
                <div class="form-box-header" onclick="toggleAddFormBox(this)">
                    <h2>${escapeHtml(typeof t === 'function' ? t('courses_add_heading', 'Add Course') : 'Add Course')}</h2>
                    <span class="form-box-chevron">▾</span>
                </div>

                <div style="margin-bottom:12px; padding:12px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; flex-wrap:wrap; gap:6px;">
                        <label style="font-size:12px; color:#64748b; font-weight:600;">
                            ${escapeHtml(typeof t === 'function' ? t('courses_term_class_label', 'Academic Term & Class') : 'Academic Term & Class')}
                        </label>
                        <span style="font-size:12px; color:#94a3b8; font-weight:500;">
                            ${escapeHtml(typeof t === 'function' ? t('courses_preview_label', 'Preview:') : 'Preview:')} <strong id="termFormattedPreview" style="color:#64748b; font-weight:600;">${escapeHtml(activeTermValue)}</strong>
                        </span>
                    </div>

                    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap:10px;">
                        <div>
                            <label style="font-size:12px; color:#64748b; display:block; margin-bottom:4px; font-weight:600;">${escapeHtml(typeof t === 'function' ? t('courses_academic_year_label', 'Academic Year') : 'Academic Year')}</label>
                            <input
                                type="text"
                                id="termYearInput"
                                list="termYearList"
                                placeholder="${escapeHtml(typeof t === 'function' ? t('courses_year_placeholder', 'e.g. 2026-2027') : 'e.g. 2026-2027')}"
                                value="${escapeHtml(currentParts.year)}"
                                oninput="onTermControlsChange()"
                                style="width:100%; padding:8px 10px; border-radius:8px; border:1px solid #e2e8f0; background:#ffffff; font-size:13px; font-weight:500; color:#475569;"
                            >
                            <datalist id="termYearList">
                                <option value="2024-2025"></option>
                                <option value="2025-2026"></option>
                                <option value="2026-2027"></option>
                                <option value="2027-2028"></option>
                                <option value="2028-2029"></option>
                                <option value="2029-2030"></option>
                                <option value="2030-2031"></option>
                                <option value="2031-2032"></option>
                            </datalist>
                        </div>
                        <div>
                            <label style="font-size:12px; color:#64748b; display:block; margin-bottom:4px; font-weight:600;">${escapeHtml(typeof t === 'function' ? t('courses_class_year_label', 'Class / Year') : 'Class / Year')}</label>
                            <select
                                id="termGradeSelect"
                                onchange="onTermControlsChange()"
                                style="width:100%; padding:8px 10px; border-radius:8px; border:1px solid #e2e8f0; background:#ffffff; font-size:13px; font-weight:500; color:#475569;"
                            >
                                ${gradeOptions}
                            </select>
                        </div>
                        <div>
                            <label style="font-size:12px; color:#64748b; display:block; margin-bottom:4px; font-weight:600;">${escapeHtml(typeof t === 'function' ? t('courses_semester_term_label', 'Semester / Term') : 'Semester / Term')}</label>
                            <select
                                id="termSeasonSelect"
                                onchange="onTermControlsChange()"
                                style="width:100%; padding:8px 10px; border-radius:8px; border:1px solid #e2e8f0; background:#ffffff; font-size:13px; font-weight:500; color:#475569;"
                            >
                                ${seasonOptions}
                            </select>
                        </div>
                    </div>

                    <input type="hidden" id="academicYear" value="${escapeHtml(activeTermValue)}">
                </div>

                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(160px,1fr)); gap:10px;">
                    <input type="text" id="courseName" placeholder="${escapeHtml(typeof t === 'function' ? t('courses_name_placeholder', 'Course Name') : 'Course name')}">
                    <input type="text" id="instructorName" placeholder="${escapeHtml(typeof t === 'function' ? t('courses_instructor_placeholder', 'Instructor Name') : 'Instructor name')}">
                    <input type="number" id="credit" placeholder="${escapeHtml(typeof t === 'function' ? t('courses_credits', 'Credit') : 'Credit')}">
                    <input type="number" id="midtermGrade" placeholder="${escapeHtml(typeof t === 'function' ? t('courses_midterm_placeholder', 'Midterm grade') : 'Midterm grade')}" min="0" max="100" oninput="updateRequiredFinalPreview()">
                    <input type="number" id="projectGrade" placeholder="${escapeHtml(typeof t === 'function' ? t('courses_project_placeholder', 'Project grade (optional)') : 'Project grade (optional)')}" min="0" max="100" oninput="updateRequiredFinalPreview()">
                    <input type="number" id="finalGrade" placeholder="${escapeHtml(typeof t === 'function' ? t('courses_final_placeholder', 'Final grade') : 'Final grade')}" min="0" max="100">
                    <input type="number" id="makeupGrade" placeholder="${escapeHtml(typeof t === 'function' ? t('courses_makeup_placeholder', 'Makeup grade (optional)') : 'Makeup grade (optional)')}" min="0" max="100">
                </div>

                <div style="display:grid; grid-template-columns: repeat(3,1fr); gap:10px; margin-top:10px; padding:12px; background:#f8fafc; border-radius:8px; border:1px solid #e2e8f0;">
                    <div>
                        <label style="font-size:12px; color:#64748b; display:block; margin-bottom:4px; font-weight:600;">${escapeHtml(typeof t === 'function' ? t('courses_midterm_weight_label', 'Midterm Weight (%)') : 'Midterm Weight (%)')}</label>
                        <input type="number" id="midtermWeight" placeholder="${escapeHtml(typeof t === 'function' ? t('courses_midterm_weight_placeholder', 'e.g. 40') : 'e.g. 40')}" min="0" max="100" oninput="updateRequiredFinalPreview()">
                    </div>
                    <div>
                        <label style="font-size:12px; color:#64748b; display:block; margin-bottom:4px; font-weight:600;">${escapeHtml(typeof t === 'function' ? t('courses_project_weight_label', 'Project Weight (%)') : 'Project Weight (%)')}</label>
                        <input type="number" id="projectWeight" placeholder="${escapeHtml(typeof t === 'function' ? t('courses_project_weight_placeholder', '0 if no project') : '0 if no project')}" min="0" max="100" oninput="updateRequiredFinalPreview()">
                    </div>
                    <div>
                        <label style="font-size:12px; color:#64748b; display:block; margin-bottom:4px; font-weight:600;">${escapeHtml(typeof t === 'function' ? t('courses_passing_grade_label', 'Passing Grade') : 'Passing Grade')}</label>
                        <input type="number" id="passingGrade" value="60" min="0" max="100" oninput="updateRequiredFinalPreview()">
                    </div>
                </div>

                <div style="margin-top:10px; padding:12px; background:#f8fafc; border-radius:8px; border:1px solid #e2e8f0;">
                    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
                        <label style="font-size:12px; color:#64748b; font-weight:600;">${escapeHtml(typeof t === 'function' ? t('courses_extra_grades_label', 'Other Graded Items (optional)') : 'Other Graded Items (optional)')}</label>
                        <button type="button" onclick="addExtraGradeRow()" style="font-size:12px; padding:4px 12px; background:#eff6ff; border:1px solid #93c5fd; border-radius:20px; cursor:pointer; color:#1e40af; font-weight:700;">${escapeHtml(typeof t === 'function' ? t('courses_add_extra_btn', '+ Add Grade Item') : '+ Add Grade Item')}</button>
                    </div>
                    <div id="extraGradesList"></div>
                </div>

                <div id="required-final-preview" style="margin-top:8px; font-size:13px; color:#64748b; min-height:20px; padding:0 2px;"></div>

                <button id="courseSaveButton" onclick="saveCourse()" style="margin-top:12px;">${escapeHtml(typeof t === "function" ? t("courses_save_btn", "Save Course") : "Save Course")}</button>
            </div>

            <div class="tools-grid">
                <div class="form-box tool-box">
                    <h2>${escapeHtml(typeof t === 'function' ? t('courses_search_heading', '🔍 Search Courses') : '🔍 Search Courses')}</h2>
                    <input type="text" id="courseSearch" placeholder="${escapeHtml(typeof t === 'function' ? t('courses_search_placeholder', 'Search by name, instructor, grade...') : 'Search by name, instructor, grade...')}" oninput="filterCourses(this.value)" style="margin-bottom:8px;">
                    <div id="search-stats" style="font-size:12px; color:#94a3b8; margin-bottom:8px;"></div>
                    <select id="termFilter" onchange="filterCoursesByTerm(this.value)" style="width:100%; margin-bottom:8px; padding:6px 8px; border-radius:8px; border:1px solid #cbd5e1; font-size:13px;">
                        ${termOptions}
                    </select>
                    <div style="display:flex; flex-wrap:wrap; gap:6px;">
                        <button onclick="document.getElementById('courseSearch').value=''; filterCourses('');" style="font-size:12px; padding:4px 12px; background:#f1f5f9; border:1px solid #cbd5e1; border-radius:20px; cursor:pointer; color:#475569; font-weight:500;">${escapeHtml(typeof t === 'function' ? t('btn_clear_search', 'Clear Search') : 'Clear Search')}</button>
                        <button onclick="applyQuickFilter('no-final')" style="font-size:12px; padding:4px 12px; background:#fef9c3; border:1px solid #fde047; border-radius:20px; cursor:pointer; color:#854d0e; font-weight:500;">${escapeHtml(typeof t === 'function' ? t('courses_missing_final', 'Missing Final') : 'Missing Final')}</button>
                        <button onclick="applyQuickFilter('low-midterm')" style="font-size:12px; padding:4px 12px; background:#fee2e2; border:1px solid #fca5a5; border-radius:20px; cursor:pointer; color:#991b1b; font-weight:500;">${escapeHtml(typeof t === 'function' ? t('courses_low_midterm', 'Low Midterm (<50)') : 'Low Midterm (<50)')}</button>
                        <button onclick="applyQuickFilter('high-midterm')" style="font-size:12px; padding:4px 12px; background:#dcfce7; border:1px solid #86efac; border-radius:20px; cursor:pointer; color:#166534; font-weight:500;">${escapeHtml(typeof t === 'function' ? t('courses_high_midterm', 'High Midterm (≥80)') : 'High Midterm (≥80)')}</button>
                    </div>
                </div>

                <div class="form-box tool-box">
                    <h2>${escapeHtml(typeof t === 'function' ? t('courses_gpa_heading', '🎓 GPA Calculator') : '🎓 GPA Calculator')}</h2>
                    <p style="font-size:13px; color:#94a3b8; margin-bottom:12px;">${escapeHtml(typeof t === 'function' ? t('courses_gpa_desc', 'Uses each course\'s own grade weights.') : 'Uses each course\'s own grade weights.')}</p>
                    <div id="gpa-result"><span style="color:#94a3b8; font-size:14px;">${escapeHtml(typeof t === 'function' ? t('courses_gpa_prompt', 'Click below to calculate your GPA.') : 'Click below to calculate your GPA.')}</span></div>
                    <div style="margin-top:12px;">
                        <button onclick="calculateGPA()" style="width:100%;">${escapeHtml(typeof t === 'function' ? t('btn_calculate_gpa', 'Calculate GPA') : 'Calculate GPA')}</button>
                    </div>
                </div>
            </div>

            <div style="margin:0 0 10px 0; display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
                <label for="tableTermFilter" style="font-weight:700; font-size:13px; color:var(--theme-header-title, #ffffff);">📅 ${escapeHtml(typeof t === "function" ? t("courses_filter_term", "Filter by Term:") : "Filter by Term:")}</label>
                <select id="tableTermFilter" onchange="filterCoursesByTerm(this.value)" style="padding:6px 10px; border-radius:8px; border:1px solid #cbd5e1; font-size:13px; min-width:220px;">
                    ${termOptions}
                </select>
            </div>

            <table id="courses-table">
                <thead>
                    <tr>
                        <th>${escapeHtml(typeof t === "function" ? t("courses_table_course", "Course") : "Course")}</th>
                        <th>${escapeHtml(typeof t === "function" ? t("courses_table_instructor", "Instructor") : "Instructor")}</th>
                        <th>${escapeHtml(typeof t === "function" ? t("courses_table_credits", "Credit") : "Credit")}</th>
                        <th>${escapeHtml(typeof t === "function" ? t("courses_table_midterm", "Midterm") : "Midterm")}</th>
                        <th>${escapeHtml(typeof t === "function" ? t("courses_table_project", "Project") : "Project")}</th>
                        <th>${escapeHtml(typeof t === "function" ? t("courses_table_req_final", "Req. Final") : "Req. Final")}</th>
                        <th>${escapeHtml(typeof t === "function" ? t("courses_table_final", "Final") : "Final")}</th>
                        <th>${escapeHtml(typeof t === "function" ? t("courses_table_result", "Result") : "Result")}</th>
                        <th>${escapeHtml(typeof t === "function" ? t("courses_table_makeup", "Makeup Grade") : "Makeup Grade")}</th>
                        <th>${escapeHtml(typeof t === "function" ? t("courses_table_extra", "Extra Grades") : "Extra Grades")}</th>
                        <th>${escapeHtml(typeof t === "function" ? t("courses_table_action", "Action") : "Action")}</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        `;

        updateRequiredFinalPreview();

        if (typeof autoFormatInput === "function") {
            autoFormatInput(document.getElementById("courseName"), "title");
            autoFormatInput(document.getElementById("instructorName"), "title");
        }

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
        <input type="text" class="extra-grade-label" placeholder="${escapeHtml(typeof t === 'function' ? t('courses_extra_item_placeholder', 'e.g. Homework, Quiz') : 'e.g. Homework, Quiz')}" value="${escapeHtml(label)}" oninput="updateRequiredFinalPreview()">
        <input type="number" class="extra-grade-weight" placeholder="${escapeHtml(typeof t === 'function' ? t('courses_extra_weight_placeholder', 'Weight %') : 'Weight %')}" min="0" max="100" value="${escapeHtml(weight)}" oninput="updateRequiredFinalPreview()">
        <input type="number" class="extra-grade-score" placeholder="${escapeHtml(typeof t === 'function' ? t('courses_extra_score_placeholder', 'Score') : 'Score')}" min="0" max="100" value="${escapeHtml(score)}" oninput="updateRequiredFinalPreview()">
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

    const isTr = typeof getCurrentLanguage === "function" && getCurrentLanguage() === "tr";
    const weightLabel = isTr ? "Ağırlıklar → Vize" : "Weights → Midterm";
    const projectLabel = isTr ? "Proje" : "Project";
    const finalLabel = isTr ? "Final" : "Final";
    const reqFinalLabel = isTr ? "Geçmek için gereken final" : "Required final to pass";

    const extraWeightInfo = extraWeightSum > 0 ? ` · ${isTr ? "Ekstralar" : "Extras"}: <strong>${extraWeightSum}%</strong>` : "";
    const weightInfo = `${weightLabel}: <strong>${midtermWeight}%</strong> · ${projectLabel}: <strong>${projectWeight}%</strong>${extraWeightInfo} · ${finalLabel}: <strong>${finalWeight}%</strong>`;
    const extraHasAnyValue = extraGrades.some(item => item.label || item.weight);

    if (!midterm && !project && !extraHasAnyValue) {
        preview.innerHTML = weightInfo;
        return;
    }

    const req = calcRequiredFinal(midterm, project, midtermWeight, projectWeight, passingGrade, extraGrades);
    preview.innerHTML = `${weightInfo} &nbsp;|&nbsp; ${reqFinalLabel}: <strong style="color:${req.color}">${req.label}</strong>`;
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

    if (req.value === 0 || (req.label && req.label.includes("Passing"))) {
        el.innerHTML = `<span style="color:#22c55e; font-weight:700">${escapeHtml(typeof t === "function" ? t("courses_calc_already_passed", "✅ You already passed!") : "✅ You already passed!")}</span>`;
    } else if (req.label && (req.label.includes("Impossible") || req.label.includes("İmkansız") || req.label.includes("Unerreichbar") || req.label.includes("Imposible") || req.label.includes("Невозможно"))) {
        el.innerHTML = `<span style="color:#ef4444; font-weight:700">${escapeHtml(typeof t === "function" ? t("courses_calc_impossible", "❌ Passing is not possible even with 100 on the final.") : "❌ Passing is not possible even with 100 on the final.")}</span>`;
    } else if (req.label === "Invalid weights") {
        el.innerHTML = `<span style="color:#ef4444; font-weight:700">${escapeHtml(typeof t === "function" ? t("courses_calc_invalid_weights", "⚠️ Invalid weights. Total weights cannot exceed 100%.") : "⚠️ Invalid weights. Total weights cannot exceed 100%.")}</span>`;
    } else if (req.value === null) {
        el.innerHTML = escapeHtml(typeof t === "function" ? t("courses_calc_enter_prompt", "Enter at least one grade to calculate.") : "Enter at least one grade to calculate.");
    } else {
        el.innerHTML = typeof t === "function" ? t("courses_calc_need_score", { score: `<strong style="color:${req.color}">${req.label}</strong>` }) : `📝 You need at least <strong style="color:${req.color}">${req.label}</strong> on the final.`;
    }
}


/* ─── SAVE COURSE ─────────────────────────────────────────────────────────────*/

async function saveCourse() {
    const saveBtn = document.getElementById("courseSaveButton");
    if (saveBtn) {
        if (saveBtn.dataset.busy === "1") return;
        saveBtn.dataset.busy = "1";
        saveBtn.disabled = true;
    }

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
        extraGrades: getExtraGradesFromForm(),
        listedInGrades: 1
    };

    const unlockBtn = () => {
        if (saveBtn) {
            delete saveBtn.dataset.busy;
            saveBtn.disabled = false;
        }
    };

    if (!course.courseName || !course.instructorName || !course.credit) {
        showToast("Course name, instructor name and credit are required.", "warning");
        unlockBtn();
        return;
    }

    if (!course.academicYear || !isValidTermFormat(course.academicYear)) {
        showToast(`Please enter the current term, in the format "${TERM_FORMAT_EXAMPLE}".`, "warning");
        unlockBtn();
        return;
    }

    if (course.midtermWeight < 0 || course.projectWeight < 0) {
        showToast("Weights cannot be negative.", "warning");
        unlockBtn();
        return;
    }

    for (const item of course.extraGrades) {
        if (!item.label) {
            showToast("Please enter a name for every extra grade item (e.g. Homework, Quiz, Attendance).", "warning");
            unlockBtn();
            return;
        }
        if (!(item.weight > 0)) {
            showToast(`Please enter a weight for "${item.label}".`, "warning");
            unlockBtn();
            return;
        }
    }

    const extraWeightSum = course.extraGrades.reduce((sum, item) => sum + (Number(item.weight) || 0), 0);

    if (course.midtermWeight + course.projectWeight + extraWeightSum >= 100) {
        showToast("Midterm, project and extra grade item weights must total less than 100%. The remaining percentage is automatically used for the final.", "warning");
        unlockBtn();
        return;
    }

    if (course.projectGrade !== null && course.projectWeight === 0) {
        showToast("You entered a project grade. Please enter the project weight.", "warning");
        unlockBtn();
        return;
    }

    try {
        const allCourses = await fetchJson(`${API_URL}/courses?includeUnlisted=1`);

        // Check if a course with the same name already exists in this term
        const duplicateCourse = (allCourses || []).find(c =>
            toTitleCase(c.courseName) === course.courseName &&
            c.academicYear === course.academicYear &&
            Number(c.listedInGrades) === 1
        );

        if (duplicateCourse) {
            showToast(`"${course.courseName}" is already registered for ${course.academicYear}.`, "warning");
            unlockBtn();
            return;
        }

        const existingUnlisted = (allCourses || []).find(c =>
            toTitleCase(c.courseName) === course.courseName && Number(c.listedInGrades) === 0
        );

        const response = existingUnlisted
            ? await fetch(`${API_URL}/courses/${existingUnlisted.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(course)
            })
            : await fetch(`${API_URL}/courses`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(course)
            });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            showToast(error.message || "Course could not be saved.", "error");
            unlockBtn();
            return;
        }

        const resData = await response.json().catch(() => ({}));
        const newId = resData.id || ("temp_" + Date.now());
        const savedItem = { id: newId, ...course };

        if (typeof getOfflineCache === "function" && typeof saveOfflineCache === "function") {
            const cachedList = getOfflineCache(`${API_URL}/courses`) || window._allCourses || [];
            if (Array.isArray(cachedList)) {
                const deduped = cachedList.filter(c => String(c.id) !== String(newId));
                saveOfflineCache(`${API_URL}/courses`, [...deduped, savedItem]);
                saveOfflineCache(`${API_URL}/courses?includeUnlisted=1`, [...deduped, savedItem]);
            }
        }

        if (window._allCourses) {
            window._allCourses = [...window._allCourses.filter(c => String(c.id) !== String(newId)), savedItem];
            window._coursesForGPA = window._allCourses;
        }

        showToast(typeof t === "function" ? t("toast_course_saved_success", "Course added successfully!") : "Course added successfully!", "success");
        await loadCourses();
    } catch (err) {
        console.error("Course Save Error:", err);
        showToast("Course could not be saved.", "error");
    } finally {
        unlockBtn();
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
    const rawTerm = ((academicYear && academicYear !== "Unspecified") || (semester && semester !== "Unspecified"))
        ? getTermLabel({ academicYear, semester })
        : "";
    const termParts = getTermParts(rawTerm);

    const yearInput = document.getElementById("termYearInput");
    const gradeSelect = document.getElementById("termGradeSelect");
    const seasonSelect = document.getElementById("termSeasonSelect");

    if (yearInput) {
        yearInput.value = termParts.year;
    }
    if (gradeSelect) {
        gradeSelect.value = termParts.grade;
    }
    if (seasonSelect) {
        seasonSelect.value = termParts.season;
    }
    onTermControlsChange();

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
            showToast(`Please enter the current term, in the format "${TERM_FORMAT_EXAMPLE}".`, "warning");
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

            // Immediately write updated grades to offline cache and state
            if (typeof getOfflineCache === "function" && typeof saveOfflineCache === "function") {
                const cachedList = getOfflineCache(`${API_URL}/courses`) || window._coursesForGPA || [];
                if (Array.isArray(cachedList)) {
                    const mergedList = cachedList.map(c => String(c.id) === String(id) ? { ...c, ...updated } : c);
                    saveOfflineCache(`${API_URL}/courses`, mergedList);
                    saveOfflineCache(`${API_URL}/courses?includeUnlisted=1`, mergedList);
                }
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
        typeof t === "function" ? t("confirm_delete_course_title", "Delete Course") : "Delete Course",
        typeof t === "function" ? t("confirm_delete_course_msg", { name: courseName }) : `Are you sure you want to delete "${courseName}"? This action cannot be undone.`,
        typeof t === "function" ? t("btn_confirm_delete", "Yes, delete") : "Yes, delete"
    );

    if (!confirmed) return;

    try {
        const idStr = String(id);
        const isSynthetic = idStr.startsWith("temp_");

        if (isSynthetic) {
            // Remove from offline sync queue if it was queued
            if (typeof getOfflineQueue === "function" && typeof saveOfflineQueue === "function") {
                const q = getOfflineQueue().filter(item => {
                    return !(item.url && item.url.includes("/courses") && item.body && item.body.courseName === courseName);
                });
                saveOfflineQueue(q);
            }
        } else {
            const response = await fetch(`${API_URL}/courses/${id}`, {
                method: "DELETE"
            });

            // If 404, the course is already gone from the server; proceed to clean local state
            if (!response.ok && response.status !== 404) {
                const error = await response.json().catch(() => ({}));
                showToast(error.message || "Course could not be deleted.", "error");
                return;
            }
        }

        // Purge immediately from local storage cache
        if (typeof getOfflineCache === "function" && typeof saveOfflineCache === "function") {
            const cachedList = getOfflineCache(`${API_URL}/courses`) || [];
            if (Array.isArray(cachedList)) {
                const filtered = cachedList.filter(c => String(c.id) !== idStr);
                saveOfflineCache(`${API_URL}/courses`, filtered);
                saveOfflineCache(`${API_URL}/courses?includeUnlisted=1`, filtered);
            }
        }

        if (window._allCourses) {
            window._allCourses = window._allCourses.filter(c => String(c.id) !== idStr);
        }
        if (window._coursesForGPA) {
            window._coursesForGPA = window._coursesForGPA.filter(c => String(c.id) !== idStr);
        }

        showToast(typeof t === "function" ? t("toast_course_deleted_success", { name: courseName }) : `"${courseName}" deleted.`, "success");
        await loadCourses();
    } catch (err) {
        console.error("Course Delete Error:", err);
        showToast("Course could not be deleted.", "error");
    }
}

function getGradeLetterAndPoints(avg) {
    if (avg === null || avg === undefined) return { letter: "-", points: 0, status: "In Progress" };
    if (avg >= 90) return { letter: "AA", points: 4.0, status: "Passed" };
    if (avg >= 85) return { letter: "BA", points: 3.5, status: "Passed" };
    if (avg >= 75) return { letter: "BB", points: 3.0, status: "Passed" };
    if (avg >= 65) return { letter: "CB", points: 2.5, status: "Passed" };
    if (avg >= 55) return { letter: "CC", points: 2.0, status: "Passed" };
    if (avg >= 45) return { letter: "DC", points: 1.5, status: "Conditional" };
    if (avg >= 35) return { letter: "DD", points: 1.0, status: "Conditional" };
    return { letter: "FF", points: 0.0, status: "Failed" };
}

function openOfficialTranscriptModal() {
    const user = (typeof getStoredUser === "function") ? getStoredUser() : null;
    const studentName = user ? (user.name || user.username || "Student") : "Student";
    const studentEmail = user ? (user.email || "-") : "-";
    const studentGrade = user?.gradeLevel || "Undergraduate";

    const courses = window._coursesForGPA || window._allCourses || [];
    if (!courses.length) {
        showToast("No courses available to generate transcript.", "warning");
        return;
    }

    let totalEarnedPoints = 0;
    let totalCreditsAttempted = 0;
    let totalCreditsEarned = 0;

    const termGroups = groupCoursesByTerm(courses);
    let tablesHtml = "";

    termGroups.forEach((termCourses, termLabel) => {
        let termCredits = 0;
        let termPoints = 0;

        const rows = termCourses.map(c => {
            const mw = c.midtermWeight ?? 0;
            const pw = c.projectWeight ?? 0;
            const fw = Math.max(0, 100 - mw - pw);
            const cr = Number(c.credit) || 0;

            const mVal = c.midtermGrade !== null && c.midtermGrade !== "" ? Number(c.midtermGrade) : null;
            const pVal = c.projectGrade !== null && c.projectGrade !== "" ? Number(c.projectGrade) : null;
            const fVal = c.finalGrade !== null && c.finalGrade !== "" ? Number(c.finalGrade) : null;

            let finalAvg = null;
            if (fVal !== null || mVal !== null) {
                finalAvg = Math.round(((mVal || 0) * mw / 100) + ((pVal || 0) * pw / 100) + ((fVal || 0) * fw / 100));
            }

            const { letter, points, status } = getGradeLetterAndPoints(finalAvg);

            if (finalAvg !== null) {
                termCredits += cr;
                termPoints += points * cr;
                totalCreditsAttempted += cr;
                totalEarnedPoints += points * cr;
                if (status !== "Failed") totalCreditsEarned += cr;
            }

            const badgeColor = status === "Passed" ? "#16a34a" : status === "Failed" ? "#dc2626" : "#475569";

            return `
                <tr>
                    <td style="padding:8px 10px; border-bottom:1px solid #e2e8f0; font-weight:600; color:#1e293b;">${escapeHtml(c.courseName)}</td>
                    <td style="padding:8px 10px; border-bottom:1px solid #e2e8f0; color:#64748b;">${escapeHtml(c.instructorName || "-")}</td>
                    <td style="padding:8px 10px; border-bottom:1px solid #e2e8f0; text-align:center; color:#1e293b;">${cr}</td>
                    <td style="padding:8px 10px; border-bottom:1px solid #e2e8f0; text-align:center; color:#1e293b;">${finalAvg !== null ? finalAvg : "-"}</td>
                    <td style="padding:8px 10px; border-bottom:1px solid #e2e8f0; text-align:center; font-weight:700; color:#1e293b;">${letter}</td>
                    <td style="padding:8px 10px; border-bottom:1px solid #e2e8f0; text-align:center; color:${badgeColor}; font-weight:600;">${status}</td>
                </tr>
            `;
        }).join("");

        const termGpa = termCredits > 0 ? (termPoints / termCredits).toFixed(2) : "-";

        tablesHtml += `
            <div style="margin-bottom:24px;">
                <div style="background:#f1f5f9; padding:8px 12px; font-weight:700; color:#334155; font-size:13px; border-radius:6px 6px 0 0; display:flex; justify-content:space-between;">
                    <span>📅 ${escapeHtml(termLabel)}</span>
                    <span>Term GPA: <strong>${termGpa}</strong> (${termCredits} Credits)</span>
                </div>
                <table style="width:100%; border-collapse:collapse; font-size:12px; background:#ffffff; border:1px solid #e2e8f0; border-top:none;">
                    <thead>
                        <tr style="background:#f8fafc; color:#64748b; font-size:11px; text-transform:uppercase;">
                            <th style="padding:6px 10px; text-align:left;">Course Name</th>
                            <th style="padding:6px 10px; text-align:left;">Instructor</th>
                            <th style="padding:6px 10px; text-align:center;">Credits</th>
                            <th style="padding:6px 10px; text-align:center;">Score</th>
                            <th style="padding:6px 10px; text-align:center;">Grade</th>
                            <th style="padding:6px 10px; text-align:center;">Status</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;
    });

    const cumulativeGpa = totalCreditsAttempted > 0 ? (totalEarnedPoints / totalCreditsAttempted).toFixed(2) : "0.00";
    const gpaNum = parseFloat(cumulativeGpa);
    const standing = gpaNum >= 3.50 ? "High Honors" : gpaNum >= 3.00 ? "Honors" : gpaNum >= 2.00 ? "Satisfactory" : "Academic Warning";

    const issueDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

    // Remove any existing modal
    const existing = document.getElementById("transcriptModal");
    if (existing) existing.remove();

    const modal = document.createElement("div");
    modal.className = "modal-overlay is-open";
    modal.id = "transcriptModal";
    modal.style.position = "fixed";
    modal.style.top = "0";
    modal.style.left = "0";
    modal.style.width = "100%";
    modal.style.height = "100%";
    modal.style.backgroundColor = "rgba(0, 0, 0, 0.6)";
    modal.style.display = "flex";
    modal.style.alignItems = "center";
    modal.style.justifyContent = "center";
    modal.style.zIndex = "9999";
    modal.style.padding = "20px";

    modal.innerHTML = `
        <div class="modal-box" style="max-width:850px; width:100%; max-height:90vh; overflow-y:auto; padding:0; background:#ffffff; border-radius:12px; box-shadow:0 20px 25px -5px rgba(0,0,0,0.3);">
            <div class="no-print" style="display:flex; justify-content:space-between; align-items:center; padding:14px 20px; background:#0f172a; color:#ffffff; border-radius:12px 12px 0 0;">
                <div style="font-weight:700; font-size:15px; display:flex; align-items:center; gap:8px;">
                    <span>📄</span> Official Academic Transcript Preview
                </div>
                <div style="display:flex; gap:10px;">
                    <button type="button" onclick="window.print()" style="padding:6px 16px; background:#2563eb; color:#ffffff; border:none; border-radius:6px; font-weight:700; font-size:12px; cursor:pointer;">
                        🖨️ Print / Save as PDF
                    </button>
                    <button type="button" onclick="document.getElementById('transcriptModal').remove()" style="padding:6px 12px; background:rgba(255,255,255,0.1); color:#ffffff; border:none; border-radius:6px; font-weight:700; font-size:12px; cursor:pointer;">
                        ✕ Close
                    </button>
                </div>
            </div>

            <div id="officialTranscriptPrintArea" style="padding:32px 40px; font-family:system-ui, -apple-system, sans-serif; background:#ffffff; color:#0f172a;">
                <!-- Header -->
                <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #0f172a; padding-bottom:18px; margin-bottom:20px;">
                    <div>
                        <h1 style="margin:0; font-size:22px; font-weight:800; letter-spacing:-0.5px; color:#0f172a;">ACADEMI BUDDY</h1>
                        <div style="font-size:12px; font-weight:700; color:#475569; letter-spacing:1px; text-transform:uppercase; margin-top:3px;">Official Academic Progress &amp; Transcript Report</div>
                        <div style="font-size:11px; color:#94a3b8; margin-top:4px;">Date of Issue: ${issueDate}</div>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-size:15px; font-weight:800; color:#0f172a;">${escapeHtml(studentName)}</div>
                        <div style="font-size:12px; color:#475569;">${escapeHtml(studentEmail)}</div>
                        <div style="font-size:12px; color:#64748b; margin-top:2px;">Status: <strong>${escapeHtml(studentGrade)}</strong></div>
                    </div>
                </div>

                <!-- Cumulative Stats Banner -->
                <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:12px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:14px; margin-bottom:24px; text-align:center;">
                    <div>
                        <div style="font-size:11px; font-weight:600; color:#64748b; text-transform:uppercase;">Cumulative GPA</div>
                        <div style="font-size:24px; font-weight:800; color:#2563eb; margin-top:2px;">${cumulativeGpa}</div>
                        <div style="font-size:10px; color:#94a3b8;">Out of 4.00</div>
                    </div>
                    <div>
                        <div style="font-size:11px; font-weight:600; color:#64748b; text-transform:uppercase;">Credits Attempted</div>
                        <div style="font-size:24px; font-weight:800; color:#0f172a; margin-top:2px;">${totalCreditsAttempted}</div>
                        <div style="font-size:10px; color:#94a3b8;">Total Enrolled</div>
                    </div>
                    <div>
                        <div style="font-size:11px; font-weight:600; color:#64748b; text-transform:uppercase;">Credits Earned</div>
                        <div style="font-size:24px; font-weight:800; color:#16a34a; margin-top:2px;">${totalCreditsEarned}</div>
                        <div style="font-size:10px; color:#94a3b8;">Passed Credits</div>
                    </div>
                    <div>
                        <div style="font-size:11px; font-weight:600; color:#64748b; text-transform:uppercase;">Standing</div>
                        <div style="font-size:16px; font-weight:800; color:#0f172a; margin-top:8px;">${standing}</div>
                        <div style="font-size:10px; color:#94a3b8;">Academic Standing</div>
                    </div>
                </div>

                <!-- Course Tables -->
                ${tablesHtml}

                <!-- Footer -->
                <div style="border-top:1px solid #e2e8f0; padding-top:14px; margin-top:30px; display:flex; justify-content:space-between; align-items:center; font-size:10px; color:#94a3b8;">
                    <span>Generated securely via Academi Buddy Student Academic Tracker System.</span>
                    <span>Document ID: SAT-${Date.now().toString(36).toUpperCase()}</span>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}
window.openOfficialTranscriptModal = openOfficialTranscriptModal;
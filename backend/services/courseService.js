const { db } = require("../database/database");

function isValidGrade(value) {
    return (
        value === null ||
        value === undefined ||
        value === "" ||
        (Number(value) >= 0 && Number(value) <= 100)
    );
}

function normalizeGrade(value) {
    if (value === undefined || value === null || value === "") {
        return null;
    }

    return Number(value);
}

function normalizeWeight(value) {
    if (value === undefined || value === null || value === "") {
        return 0;
    }

    return Number(value);
}

function isValidWeight(value) {
    return Number.isFinite(value) && value >= 0 && value <= 100;
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

function canonicalizeTermFormat(text) {
    return parseTermInfo(text);
}

function normalizeTermField(value) {
    if (value === undefined || value === null || value === "") {
        return "Unspecified";
    }

    const trimmed = String(value).trim();
    const canonical = canonicalizeTermFormat(trimmed);

    return canonical !== null ? canonical : trimmed;
}

function isValidTermFormat(text) {
    return parseTermInfo(text) !== null;
}

/*
 * ─── EXTRA (OPTIONAL) GRADED ITEMS ──────────────────────────────
 */

function parseExtraGrades(raw) {
    if (Array.isArray(raw)) return raw;

    if (typeof raw === "string" && raw.trim()) {
        try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            return [];
        }
    }

    return [];
}

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

function normalizeExtraGrades(raw) {
    const input = parseExtraGrades(raw);

    const list = [];

    for (let i = 0; i < input.length; i++) {
        const item = input[i] || {};

        const label = toTitleCase(String(item.label ?? "").trim());
        const weight = normalizeWeight(item.weight);
        const score = normalizeGrade(item.score);

        if (!label && !weight && (score === null)) {
            continue;
        }

        if (!label) {
            return {
                list: null,
                error: new Error(
                    "Please enter a name for every extra grade item (e.g. Homework, Quiz, Attendance)."
                )
            };
        }

        if (!isValidWeight(weight) || weight <= 0) {
            return {
                list: null,
                error: new Error(
                    `Please enter a weight between 1 and 100 for "${label}".`
                )
            };
        }

        if (!isValidGrade(score)) {
            return {
                list: null,
                error: new Error(
                    `The score for "${label}" must be between 0 and 100.`
                )
            };
        }

        list.push({ label, weight, score });
    }

    return { list, error: null };
}

function sumExtraGradeWeights(list) {
    return list.reduce(function (total, item) {
        return total + Number(item.weight || 0);
    }, 0);
}

function normalizeListedInGrades(value, defaultValue) {
    if (value === undefined || value === null || value === "") {
        return defaultValue;
    }

    return Number(value) === 0 ? 0 : 1;
}

/*
 * ─── COURSE ORIGIN PAGE ("createdFrom") ─────────────────────────
 * "grades"  -> added/registered from the Grades page, visible everywhere
 * "exams"   -> quick-added from the Deadlines page, only suggested there
 * "study"   -> quick-added from the Study Sessions page, only suggested there
 * "shared"  -> legacy quick-added course (created before this feature
 *              existed) or any course we can't confidently scope;
 *              treated as visible everywhere so old data keeps working
 */
const VALID_CREATED_FROM = ["grades", "exams", "study", "shared"];

function normalizeCreatedFrom(value, listedInGrades) {
    // A course that is registered in Grades is always fully shared.
    if (Number(listedInGrades) === 1) {
        return "grades";
    }

    const normalized = String(value || "").trim().toLowerCase();

    if (VALID_CREATED_FROM.indexOf(normalized) !== -1 && normalized !== "grades") {
        return normalized;
    }

    // Unknown/unspecified origin for an unlisted course: keep it
    // visible everywhere rather than accidentally hiding it.
    return "shared";
}

function mapCourseRow(row) {
    if (!row) return row;

    const listedInGrades = normalizeListedInGrades(row.listedInGrades, 1);

    return Object.assign({}, row, {
        extraGrades: parseExtraGrades(row.extraGrades),
        listedInGrades: listedInGrades,
        createdFrom: normalizeCreatedFrom(row.createdFrom, listedInGrades)
    });
}

function mapCourseRows(rows) {
    return (rows || []).map(mapCourseRow);
}

function getAllCourses(userId, options, callback) {
    // Backward compatible with the old getAllCourses(userId, includeUnlisted, callback) signature.
    if (typeof options === "function") {
        callback = options;
        options = {};
    } else if (typeof options === "boolean") {
        options = { includeUnlisted: options };
    } else {
        options = options || {};
    }

    const includeUnlisted = !!options.includeUnlisted;

    const scope = options.scope
        ? String(options.scope).trim().toLowerCase()
        : null;

    let sql;
    let params;

    if (!includeUnlisted) {
        sql = "SELECT * FROM courses WHERE userId = ? AND COALESCE(listedInGrades, 1) = 1";
        params = [userId];
    } else if (scope && scope !== "grades" && scope !== "shared" && VALID_CREATED_FROM.indexOf(scope) !== -1) {
        // Grade-registered courses and legacy "shared" courses show up
        // everywhere. Quick-added courses only show up on the page
        // (scope) they were created from.
        sql = `
            SELECT * FROM courses
            WHERE userId = ?
            AND (
                COALESCE(listedInGrades, 1) = 1
                OR COALESCE(createdFrom, 'shared') IN (?, 'shared')
            )
        `;
        params = [userId, scope];
    } else {
        // No (or unrecognized) scope requested: return everything,
        // e.g. for the Dashboard's overview or the Grades page's
        // "promote an existing unlisted course" lookup.
        sql = "SELECT * FROM courses WHERE userId = ?";
        params = [userId];
    }

    db.all(
        sql,
        params,
        function (err, rows) {
            if (err) return callback(err);
            callback(null, mapCourseRows(rows));
        }
    );
}

function getCourseById(id, userId, callback) {
    db.get(
        "SELECT * FROM courses WHERE id = ? AND userId = ?",
        [id, userId],
        function (err, row) {
            if (err) return callback(err);
            callback(null, mapCourseRow(row));
        }
    );
}

function createCourse(
    userId,
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
    semester,
    extraGrades,
    listedInGrades,
    createdFrom,
    callback
) {
    if (typeof createdFrom === "function") {
        callback = createdFrom;
        createdFrom = undefined;
    }

    if (typeof listedInGrades === "function") {
        callback = listedInGrades;
        listedInGrades = 1;
        createdFrom = undefined;
    }

    credit = Number(credit);
    listedInGrades = normalizeListedInGrades(listedInGrades, 1);
    createdFrom = normalizeCreatedFrom(createdFrom, listedInGrades);

    midtermGrade = normalizeGrade(midtermGrade);
    projectGrade = normalizeGrade(projectGrade);
    finalGrade = normalizeGrade(finalGrade);
    makeupGrade = normalizeGrade(makeupGrade);

    midtermWeight = normalizeWeight(midtermWeight);
    projectWeight = normalizeWeight(projectWeight);
    passingGrade = passingGrade === undefined || passingGrade === null || passingGrade === ""
        ? 60
        : Number(passingGrade);

    academicYear = normalizeTermField(academicYear);
    semester = normalizeTermField(semester);

    const extra = normalizeExtraGrades(extraGrades);

    if (extra.error) {
        return callback(extra.error);
    }

    const extraGradesList = extra.list;

    courseName = toTitleCase(courseName);
    instructorName = toTitleCase(instructorName);

    if (!courseName || !instructorName || !credit) {
        return callback(
            new Error(
                "Course name, instructor name and credit are required."
            )
        );
    }

    if (credit < 1 || credit > 10) {
        return callback(
            new Error("Credit must be between 1 and 10.")
        );
    }

    if (!isValidTermFormat(academicYear)) {
        return callback(
            new Error(
                `Current term is required, in the format "${TERM_FORMAT_EXAMPLE}" (year-year, space, then Fall/Spring/Summer).`
            )
        );
    }

    if (
        !isValidGrade(midtermGrade) ||
        !isValidGrade(projectGrade) ||
        !isValidGrade(finalGrade) ||
        !isValidGrade(makeupGrade)
    ) {
        return callback(
            new Error("Grades must be between 0 and 100.")
        );
    }

    if (
        !isValidWeight(midtermWeight) ||
        !isValidWeight(projectWeight)
    ) {
        return callback(
            new Error("Weights must be between 0 and 100.")
        );
    }

    const extraWeightSum = sumExtraGradeWeights(extraGradesList);

    if (midtermWeight + projectWeight + extraWeightSum >= 100) {
        return callback(
            new Error(
                "Midterm, project and extra grade item weights must total less than 100%."
            )
        );
    }

    if (
        !Number.isFinite(passingGrade) ||
        passingGrade < 0 ||
        passingGrade > 100
    ) {
        return callback(
            new Error(
                "Passing grade must be between 0 and 100."
            )
        );
    }

    if (
        projectGrade !== null &&
        projectWeight === 0
    ) {
        return callback(
            new Error(
                "You entered a project grade. Please enter the project weight."
            )
        );
    }

    const extraGradesJson = JSON.stringify(extraGradesList);

    const sql = `
        INSERT INTO courses
        (
            userId,
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
            semester,
            extraGrades,
            listedInGrades,
            createdFrom
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(
        sql,
        [
            userId,
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
            semester,
            extraGradesJson,
            listedInGrades,
            createdFrom
        ],
        function (err) {
            if (err) {
                return callback(err);
            }

            callback(null, {
                id: this.lastID,
                userId,
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
                semester,
                extraGrades: extraGradesList,
                listedInGrades,
                createdFrom
            });
        }
    );
}

function updateCourse(
    id,
    userId,
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
    semester,
    extraGrades,
    listedInGrades,
    createdFrom,
    callback
) {
    if (typeof createdFrom === "function") {
        callback = createdFrom;
        createdFrom = undefined;
    }

    credit = Number(credit);
    listedInGrades = normalizeListedInGrades(listedInGrades, 1);
    createdFrom = normalizeCreatedFrom(createdFrom, listedInGrades);

    midtermGrade = normalizeGrade(midtermGrade);
    projectGrade = normalizeGrade(projectGrade);
    finalGrade = normalizeGrade(finalGrade);
    makeupGrade = normalizeGrade(makeupGrade);

    midtermWeight = normalizeWeight(midtermWeight);
    projectWeight = normalizeWeight(projectWeight);

    passingGrade = passingGrade === undefined || passingGrade === null || passingGrade === ""
        ? 60
        : Number(passingGrade);

    academicYear = normalizeTermField(academicYear);
    semester = normalizeTermField(semester);

    const extra = normalizeExtraGrades(extraGrades);

    if (extra.error) {
        return callback(extra.error);
    }

    const extraGradesList = extra.list;

    courseName = toTitleCase(courseName);
    instructorName = toTitleCase(instructorName);

    if (!courseName || !instructorName || !credit) {
        return callback(
            new Error(
                "Course name, instructor name and credit are required."
            )
        );
    }

    if (credit < 1 || credit > 10) {
        return callback(
            new Error("Credit must be between 1 and 10.")
        );
    }

    if (!isValidTermFormat(academicYear)) {
        return callback(
            new Error(
                `Current term is required, in the format "${TERM_FORMAT_EXAMPLE}" (year-year, space, then Fall/Spring/Summer).`
            )
        );
    }

    if (
        !isValidGrade(midtermGrade) ||
        !isValidGrade(projectGrade) ||
        !isValidGrade(finalGrade) ||
        !isValidGrade(makeupGrade)
    ) {
        return callback(
            new Error("Grades must be between 0 and 100.")
        );
    }

    if (
        !isValidWeight(midtermWeight) ||
        !isValidWeight(projectWeight)
    ) {
        return callback(
            new Error("Weights must be between 0 and 100.")
        );
    }

    const extraWeightSum = sumExtraGradeWeights(extraGradesList);

    if (midtermWeight + projectWeight + extraWeightSum >= 100) {
        return callback(
            new Error(
                "Midterm, project and extra grade item weights must total less than 100%."
            )
        );
    }

    if (
        !Number.isFinite(passingGrade) ||
        passingGrade < 0 ||
        passingGrade > 100
    ) {
        return callback(
            new Error(
                "Passing grade must be between 0 and 100."
            )
        );
    }


    if (
        projectGrade !== null &&
        projectWeight === 0
    ) {
        return callback(
            new Error(
                "You entered a project grade. Please enter the project weight."
            )
        );
    }

    const extraGradesJson = JSON.stringify(extraGradesList);

    const sql = `
        UPDATE courses
        SET
            courseName = ?,
            instructorName = ?,
            credit = ?,
            midtermGrade = ?,
            projectGrade = ?,
            finalGrade = ?,
            midtermWeight = ?,
            projectWeight = ?,
            passingGrade = ?,
            makeupGrade = ?,
            academicYear = ?,
            semester = ?,
            extraGrades = ?,
            listedInGrades = ?,
            createdFrom = ?
        WHERE id = ?
        AND userId = ?
    `;

    db.run(
        sql,
        [
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
            semester,
            extraGradesJson,
            listedInGrades,
            createdFrom,
            id,
            userId
        ],
        function (err) {
            if (err) {
                return callback(err);
            }

            if (this.changes === 0) {
                return callback(
                    new Error("Course not found.")
                );
            }

            callback(null, {
                id,
                userId,
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
                semester,
                extraGrades: extraGradesList,
                listedInGrades,
                createdFrom
            });
        }
    );
}

function deleteCourse(id, userId, callback) {
    db.run(
        "DELETE FROM exams WHERE courseId = ? AND userId = ?",
        [id, userId],
        function () {
            db.run(
                "DELETE FROM projects WHERE courseId = ? AND userId = ?",
                [id, userId],
                function () {
                    db.run(
                        "DELETE FROM study_sessions WHERE courseId = ? AND userId = ?",
                        [id, userId],
                        function () {
                            db.run(
                                "DELETE FROM todos WHERE courseId = ? AND userId = ?",
                                [id, userId],
                                function () {
                                    db.run(
                                        "DELETE FROM courses WHERE id = ? AND userId = ?",
                                        [id, userId],
                                        function (err) {
                                            if (err) {
                                                return callback(err);
                                            }

                                            if (this.changes === 0) {
                                                return callback(
                                                    new Error("Course not found.")
                                                );
                                            }

                                            callback(null, true);
                                        }
                                    );
                                }
                            );
                        }
                    );
                }
            );
        }
    );
}

function searchCourses(keyword, userId, callback) {
    const searchValue = "%" + keyword + "%";

    db.all(
        `
        SELECT *
        FROM courses
        WHERE userId = ?
        AND COALESCE(listedInGrades, 1) = 1
        AND (
            courseName LIKE ?
            OR instructorName LIKE ?
        )
        `,
        [userId, searchValue, searchValue],
        function (err, rows) {
            if (err) return callback(err);
            callback(null, mapCourseRows(rows));
        }
    );
}

function verifyCourseOwnership(
    courseId,
    userId,
    callback
) {
    db.get(
        "SELECT id FROM courses WHERE id = ? AND userId = ?",
        [courseId, userId],
        function (err, row) {
            if (err) {
                return callback(err);
            }

            callback(null, !!row);
        }
    );
}

module.exports = {
    getAllCourses,
    getCourseById,
    createCourse,
    updateCourse,
    deleteCourse,
    searchCourses,
    verifyCourseOwnership,
    isValidTermFormat,
    canonicalizeTermFormat,
    TERM_FORMAT_EXAMPLE
};
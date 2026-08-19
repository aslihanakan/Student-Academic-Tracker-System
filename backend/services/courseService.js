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

/*
 * The term (academicYear) field only accepts one format:
 * "YYYY-YYYY Fall|Spring|Summer" (e.g. "2025-2026 Fall"), with the
 * second year being the first year + 1. The Fall/Spring/Summer part
 * is matched case-insensitively - "fall", "FALL", "fAlL" etc are
 * all accepted and rewritten to the canonical capitalized form
 * below, so however the student types it, it's stored consistently.
 * Kept in sync with the same check on the frontend (isValidTermFormat
 * in app.js).
 */
const TERM_FORMAT_REGEX = /^(\d{4})-(\d{4}) (Fall|Spring|Summer)$/i;
const TERM_FORMAT_EXAMPLE = "2025-2026 Fall";

/*
 * Rewrites a term string typed in any letter-casing into the fixed
 * canonical format ("2025-2026 Fall"). Returns null if the text
 * doesn't match the expected shape at all (wrong year math, missing
 * season, etc.) - callers fall back to the raw trimmed text in that
 * case so the existing "invalid format" validation still catches it.
 */
function canonicalizeTermFormat(text) {
    const match = TERM_FORMAT_REGEX.exec(String(text || "").trim());

    if (!match) return null;

    const startYear = parseInt(match[1], 10);
    const endYear = parseInt(match[2], 10);

    if (endYear !== startYear + 1) return null;

    const season = match[3].toLowerCase();
    const canonicalSeason =
        season.charAt(0).toUpperCase() + season.slice(1);

    return `${match[1]}-${match[2]} ${canonicalSeason}`;
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
    const match = TERM_FORMAT_REGEX.exec(String(text || "").trim());

    if (!match) return false;

    const startYear = parseInt(match[1], 10);
    const endYear = parseInt(match[2], 10);

    return endYear === startYear + 1;
}

/*
 * ─── EXTRA (OPTIONAL) GRADED ITEMS ──────────────────────────────
 *
 * Some instructors also grade on homework, quizzes, attendance,
 * etc. instead of just midterm/project/final. These are stored as
 * a JSON array on the course row:
 *   [{ "label": "Homework 1", "weight": 10, "score": 85 }, ...]
 *
 * "score" may be null (not graded yet), "weight" is always a
 * number between 0 and 100 (exclusive of the total reaching 100
 * together with midterm/project/final weights).
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

/*
 * Normalizes free-text names (extra grade item labels, etc.) to a
 * consistent Title Case, regardless of how the client sent them in
 * ("homework", "HOMEWORK", "homeWORK" all become "Homework"). Kept
 * in sync with the same helper on the frontend (toTitleCase in
 * app.js) so the stored label always looks the same either way.
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

/*
 * Validates and normalizes the extra grades array coming from the
 * client. Returns { list, error }. "list" is ready to store
 * (stringified separately by the caller); "error" is an Error
 * instance when validation fails.
 */
function normalizeExtraGrades(raw) {
    const input = parseExtraGrades(raw);

    const list = [];

    for (let i = 0; i < input.length; i++) {
        const item = input[i] || {};

        const label = toTitleCase(String(item.label ?? "").trim());
        const weight = normalizeWeight(item.weight);
        const score = normalizeGrade(item.score);

        // Skip fully empty rows (e.g. an unused "+" row).
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

/*
 * Parses the raw DB row's extraGrades TEXT column back into an
 * array so callers always receive a usable JS array.
 */
function mapCourseRow(row) {
    if (!row) return row;

    return Object.assign({}, row, {
        extraGrades: parseExtraGrades(row.extraGrades)
    });
}

function mapCourseRows(rows) {
    return (rows || []).map(mapCourseRow);
}

function getAllCourses(userId, callback) {
    db.all(
        "SELECT * FROM courses WHERE userId = ?",
        [userId],
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
    callback
) {
    credit = Number(credit);

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
        midtermGrade === null &&
        projectGrade === null &&
        finalGrade === null &&
        makeupGrade === null &&
        extraGradesList.length === 0
    ) {
        return callback(
            new Error(
                "Please enter at least one grade (midterm, project, final, makeup, or an extra grade item) to save the course."
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
        midtermGrade !== null &&
        midtermWeight === 0
    ) {
        return callback(
            new Error(
                "You entered a midterm grade. Please enter the midterm weight."
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
            extraGrades
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            extraGradesJson
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
                extraGrades: extraGradesList
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
    callback
) {
    credit = Number(credit);

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
        midtermGrade === null &&
        projectGrade === null &&
        finalGrade === null &&
        makeupGrade === null &&
        extraGradesList.length === 0
    ) {
        return callback(
            new Error(
                "Please enter at least one grade (midterm, project, final, makeup, or an extra grade item) to save the course."
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
        midtermGrade !== null &&
        midtermWeight === 0
    ) {
        return callback(
            new Error(
                "You entered a midterm grade. Please enter the midterm weight."
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
            extraGrades = ?
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
                extraGrades: extraGradesList
            });
        }
    );
}

function deleteCourse(id, userId, callback) {
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

function searchCourses(keyword, userId, callback) {
    const searchValue = "%" + keyword + "%";

    db.all(
        `
        SELECT *
        FROM courses
        WHERE userId = ?
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
    verifyCourseOwnership
};
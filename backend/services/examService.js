const { db } = require("../database/database");
const { verifyCourseOwnership } = require("./courseService");

function getAllExams(userId, callback) {
    const sql = `
        SELECT exams.*, courses.courseName
        FROM exams
        JOIN courses ON exams.courseId = courses.id
        WHERE exams.userId = ?
        ORDER BY examDate ASC
    `;

    db.all(sql, [userId], callback);
}

function toTitleCase(value) {
    if (value === null || value === undefined) return value;
    const str = String(value).trim();
    if (!str) return str;
    return str
        .split(/\s+/)
        .map(word => {
            if (!word) return word;
            return word.charAt(0).toLocaleUpperCase("tr-TR") + word.slice(1).toLocaleLowerCase("tr-TR");
        })
        .join(" ");
}

function createExam(userId, courseId, examName, examDate, examType, score, callback) {
    examName = toTitleCase(examName);

    if (!courseId || !examName || !examDate || !examType) {
        return callback(new Error("Course, exam name, exam date and exam type are required."));
    }

    score = score === "" || score === undefined ? null : Number(score);

    if (score !== null && (score < 0 || score > 100)) {
        return callback(new Error("Score must be between 0 and 100."));
    }

    verifyCourseOwnership(courseId, userId, function (ownerErr, isOwner) {
        if (ownerErr) return callback(ownerErr);

        if (!isOwner) {
            return callback(new Error("Course not found."));
        }

        const sql = `
            INSERT INTO exams (userId, courseId, examName, examDate, examType, score)
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        db.run(sql, [userId, courseId, examName, examDate, examType, score], function (err) {
            if (err) return callback(err);

            callback(null, {
                id: this.lastID,
                userId,
                courseId,
                examName,
                examDate,
                examType,
                score
            });
        });
    });
}

function updateExam(id, userId, courseId, examName, examDate, examType, score, callback) {
    examName = toTitleCase(examName);

    if (!courseId || !examName || !examDate || !examType) {
        return callback(new Error("Course, exam name, exam date and exam type are required."));
    }

    score = score === "" || score === undefined ? null : Number(score);

    if (score !== null && (score < 0 || score > 100)) {
        return callback(new Error("Score must be between 0 and 100."));
    }

    verifyCourseOwnership(courseId, userId, function (ownerErr, isOwner) {
        if (ownerErr) return callback(ownerErr);

        if (!isOwner) {
            return callback(new Error("Course not found."));
        }

        const sql = `
            UPDATE exams
            SET courseId = ?, examName = ?, examDate = ?, examType = ?, score = ?
            WHERE id = ? AND userId = ?
        `;

        db.run(sql, [courseId, examName, examDate, examType, score, id, userId], function (err) {
            if (err) return callback(err);

            if (this.changes === 0) {
                return callback(new Error("Exam not found."));
            }

            callback(null, {
                id,
                userId,
                courseId,
                examName,
                examDate,
                examType,
                score
            });
        });
    });
}

function deleteExam(id, userId, callback) {
    db.run("DELETE FROM exams WHERE id = ? AND userId = ?", [id, userId], function (err) {
        if (err) return callback(err);

        if (this.changes === 0) {
            return callback(new Error("Exam not found."));
        }

        callback(null, true);
    });
}

/*
 * Quick toggle used by the checkbox in the exams table: marks an
 * exam done/undone without touching any of its other fields. Once
 * isDone is true the frontend shows a green "Completed" badge;
 * otherwise, if the exam date has passed, it shows a red "Overdue"
 * badge instead of the normal days-left countdown.
 */
function updateExamStatus(id, userId, isDone, callback) {
    const sql = "UPDATE exams SET isDone = ? WHERE id = ? AND userId = ?";

    db.run(sql, [isDone ? 1 : 0, id, userId], function (err) {
        if (err) return callback(err);

        if (this.changes === 0) {
            return callback(new Error("Exam not found."));
        }

        callback(null, { id, isDone: isDone ? 1 : 0 });
    });
}

module.exports = {
    getAllExams,
    createExam,
    updateExam,
    deleteExam,
    updateExamStatus
};
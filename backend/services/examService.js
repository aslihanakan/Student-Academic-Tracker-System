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

function createExam(userId, courseId, examName, examDate, examType, score, callback) {
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

function deleteExam(id, userId, callback) {
    db.run("DELETE FROM exams WHERE id = ? AND userId = ?", [id, userId], function (err) {
        if (err) return callback(err);

        if (this.changes === 0) {
            return callback(new Error("Exam not found."));
        }

        callback(null, true);
    });
}

module.exports = {
    getAllExams,
    createExam,
    deleteExam
};

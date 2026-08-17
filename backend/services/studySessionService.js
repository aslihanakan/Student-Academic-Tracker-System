const { db } = require("../database/database");
const { verifyCourseOwnership } = require("./courseService");

function getAllStudySessions(userId, callback) {
    const sql = `
        SELECT 
            study_sessions.*, 
            COALESCE(courses.courseName, 'Unknown Course') as courseName
        FROM study_sessions
        LEFT JOIN courses ON study_sessions.courseId = courses.id
        WHERE study_sessions.userId = ?
        ORDER BY studyDate DESC
    `;
    db.all(sql, [userId], callback);
}

function createStudySession(userId, courseId, studyDate, hours, note, callback) {
    if (!courseId || !studyDate || !hours) {
        return callback(new Error("Course, study date and hours are required."));
    }

    hours = Number(hours);

    if (!(hours > 0)) {
        return callback(new Error("Hours must be greater than 0."));
    }

    verifyCourseOwnership(courseId, userId, function (ownerErr, isOwner) {
        if (ownerErr) return callback(ownerErr);

        if (!isOwner) {
            return callback(new Error("Course not found."));
        }

        const sql = `
            INSERT INTO study_sessions (userId, courseId, studyDate, hours, note)
            VALUES (?, ?, ?, ?, ?)
        `;
        db.run(sql, [userId, courseId, studyDate, hours, note], function (err) {
            if (err) return callback(err);
            callback(null, { id: this.lastID, userId, courseId, studyDate, hours, note });
        });
    });
}

function deleteStudySession(id, userId, callback) {
    db.run("DELETE FROM study_sessions WHERE id = ? AND userId = ?", [id, userId], function (err) {
        if (err) return callback(err);

        if (this.changes === 0) {
            return callback(new Error("Study session not found."));
        }

        callback(null, true);
    });
}

function getTotalStudyHours(userId, callback) {
    db.get(
        "SELECT COALESCE(SUM(hours), 0) AS totalHours FROM study_sessions WHERE userId = ?",
        [userId],
        callback
    );
}

module.exports = {
    getAllStudySessions,
    createStudySession,
    deleteStudySession,
    getTotalStudyHours
};

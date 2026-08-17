const { db } = require("../database/database");

function getDashboardSummary(userId, callback) {
    const summary = {
        totalCourses: 0,
        totalStudyHours: 0,
        riskyCourses: 0,
        nearestTask: null
    };

    db.get("SELECT COUNT(*) AS totalCourses FROM courses WHERE userId = ?", [userId], function (err, courseResult) {
        if (err) return callback(err);

        summary.totalCourses = courseResult.totalCourses;

        db.get(
            "SELECT COALESCE(SUM(hours), 0) AS totalStudyHours FROM study_sessions WHERE userId = ?",
            [userId],
            function (err, studyResult) {
                if (err) return callback(err);

                summary.totalStudyHours = studyResult.totalStudyHours;

                db.get(
                    "SELECT COUNT(*) AS riskyCourses FROM courses WHERE userId = ? AND credit >= 5",
                    [userId],
                    function (err, riskyResult) {
                        if (err) return callback(err);

                        summary.riskyCourses = riskyResult.riskyCourses;

                        db.get(
                            `
                            SELECT todos.*, courses.courseName
                            FROM todos
                            JOIN courses ON todos.courseId = courses.id
                            WHERE todos.isDone = 0 AND todos.userId = ?
                            ORDER BY date(todos.dueDate) ASC
                            LIMIT 1
                            `,
                            [userId],
                            function (err, taskResult) {
                                if (err) return callback(err);

                                summary.nearestTask = taskResult || null;
                                callback(null, summary);
                            }
                        );
                    }
                );
            }
        );
    });
}

module.exports = {
    getDashboardSummary
};

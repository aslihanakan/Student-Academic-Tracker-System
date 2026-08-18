const { db } = require("../database/database");
const { verifyCourseOwnership } = require("./courseService");

function getAllProjects(userId, callback) {
    const sql = `
        SELECT projects.*, courses.courseName
        FROM projects
        JOIN courses ON projects.courseId = courses.id
        WHERE projects.userId = ?
        ORDER BY dueDate ASC
    `;

    db.all(sql, [userId], callback);
}

function createProject(userId, courseId, projectName, dueDate, description, score, status, callback) {
    if (!courseId || !projectName || !dueDate) {
        return callback(new Error("Course, project name and due date are required."));
    }

    score = score === "" || score === undefined ? null : Number(score);
    status = status || "pending";

    if (score !== null && (score < 0 || score > 100)) {
        return callback(new Error("Score must be between 0 and 100."));
    }

    verifyCourseOwnership(courseId, userId, function (ownerErr, isOwner) {
        if (ownerErr) return callback(ownerErr);

        if (!isOwner) {
            return callback(new Error("Course not found."));
        }

        const sql = `
            INSERT INTO projects (userId, courseId, projectName, dueDate, description, score, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        db.run(sql, [userId, courseId, projectName, dueDate, description, score, status], function (err) {
            if (err) return callback(err);

            callback(null, {
                id: this.lastID,
                userId,
                courseId,
                projectName,
                dueDate,
                description,
                score,
                status
            });
        });
    });
}

function updateProject(id, userId, courseId, projectName, dueDate, description, score, status, callback) {
    if (!courseId || !projectName || !dueDate) {
        return callback(new Error("Course, project name and due date are required."));
    }

    score = score === "" || score === undefined ? null : Number(score);
    status = status || "pending";

    if (score !== null && (score < 0 || score > 100)) {
        return callback(new Error("Score must be between 0 and 100."));
    }

    verifyCourseOwnership(courseId, userId, function (ownerErr, isOwner) {
        if (ownerErr) return callback(ownerErr);

        if (!isOwner) {
            return callback(new Error("Course not found."));
        }

        const sql = `
            UPDATE projects
            SET courseId = ?, projectName = ?, dueDate = ?, description = ?, score = ?, status = ?
            WHERE id = ? AND userId = ?
        `;

        db.run(sql, [courseId, projectName, dueDate, description, score, status, id, userId], function (err) {
            if (err) return callback(err);

            if (this.changes === 0) {
                return callback(new Error("Project not found."));
            }

            callback(null, {
                id,
                userId,
                courseId,
                projectName,
                dueDate,
                description,
                score,
                status
            });
        });
    });
}

function deleteProject(id, userId, callback) {
    db.run("DELETE FROM projects WHERE id = ? AND userId = ?", [id, userId], function (err) {
        if (err) return callback(err);

        if (this.changes === 0) {
            return callback(new Error("Project not found."));
        }

        callback(null, true);
    });
}

module.exports = {
    getAllProjects,
    createProject,
    updateProject,
    deleteProject
};
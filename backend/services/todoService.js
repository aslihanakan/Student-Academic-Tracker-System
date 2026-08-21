const { db } = require("../database/database");
const { verifyCourseOwnership } = require("./courseService");

function getAllTodos(userId, callback) {
    const sql = `
        SELECT todos.*, courses.courseName
        FROM todos
        JOIN courses ON todos.courseId = courses.id
        WHERE todos.userId = ?
        ORDER BY dueDate ASC
    `;
    db.all(sql, [userId], callback);
}

function getNearestTodo(userId, callback) {
    const sql = `
        SELECT todos.*, courses.courseName
        FROM todos
        JOIN courses ON todos.courseId = courses.id
        WHERE todos.isDone = 0 AND todos.userId = ?
        ORDER BY date(todos.dueDate) ASC
        LIMIT 1
    `;
    db.get(sql, [userId], function (err, row) {
        if (err) return callback(err);
        callback(null, row || null);
    });
}

function formatSentenceCase(str) {
    if (!str || typeof str !== "string") return "";
    const trimmed = str.trim().replace(/\s+/g, " ");
    if (!trimmed) return "";
    return trimmed.charAt(0).toLocaleUpperCase("tr-TR") + trimmed.slice(1);
}

function createTodo(userId, courseId, type, title, dueDate, callback) {
    title = formatSentenceCase(title);

    if (!courseId || !type || !title || !dueDate) {
        return callback(new Error("Course, type, title and due date are required."));
    }

    verifyCourseOwnership(courseId, userId, function (ownerErr, isOwner) {
        if (ownerErr) return callback(ownerErr);

        if (!isOwner) {
            return callback(new Error("Course not found."));
        }

        const sql = `
            INSERT INTO todos (userId, courseId, type, title, dueDate)
            VALUES (?, ?, ?, ?, ?)
        `;

        db.run(sql, [userId, courseId, type, title, dueDate], function (err) {
            if (err) return callback(err);

            callback(null, {
                id: this.lastID,
                userId,
                courseId,
                type,
                title,
                dueDate,
                isDone: 0
            });
        });
    });
}

function updateTodoStatus(id, userId, isDone, callback) {
    const sql = "UPDATE todos SET isDone = ? WHERE id = ? AND userId = ?";

    db.run(sql, [isDone ? 1 : 0, id, userId], function (err) {
        if (err) return callback(err);

        if (this.changes === 0) {
            return callback(new Error("Todo not found."));
        }

        callback(null, { id, isDone: isDone ? 1 : 0 });
    });
}

function deleteTodo(id, userId, callback) {
    db.run("DELETE FROM todos WHERE id = ? AND userId = ?", [id, userId], function (err) {
        if (err) return callback(err);

        if (this.changes === 0) {
            return callback(new Error("Todo not found."));
        }

        callback(null, true);
    });
}

module.exports = {
    getAllTodos,
    getNearestTodo,
    createTodo,
    updateTodoStatus,
    deleteTodo
};

const todoService = require("../services/todoService");

function getAllTodos(req, res) {
    todoService.getAllTodos(req.userId, function (err, todos) {
        if (err) {
            return res.status(500).json({ message: err.message });
        }

        res.status(200).json(todos);
    });
}

function createTodo(req, res) {
    const courseId = Number(req.body.courseId);
    const type = req.body.type;
    const title = req.body.title;
    const dueDate = req.body.dueDate;

    todoService.createTodo(req.userId, courseId, type, title, dueDate, function (err, todo) {
        if (err) {
            return res.status(400).json({ message: err.message });
        }

        res.status(201).json(todo);
    });
}

function updateTodoStatus(req, res) {
    const id = Number(req.params.id);
    const isDone = req.body.isDone;

    todoService.updateTodoStatus(id, req.userId, isDone, function (err, result) {
        if (err) {
            return res.status(404).json({ message: err.message });
        }

        res.status(200).json(result);
    });
}

function deleteTodo(req, res) {
    const id = Number(req.params.id);

    todoService.deleteTodo(id, req.userId, function (err) {
        if (err) {
            return res.status(404).json({ message: err.message });
        }

        res.status(200).json({ message: "Todo deleted successfully." });
    });
}

function getNearestTodo(req, res) {
    todoService.getNearestTodo(req.userId, function (err, todo) {
        if (err) {
            return res.status(500).json({ message: err.message });
        }

        res.status(200).json(todo);
    });
}

module.exports = {
    getAllTodos,
    createTodo,
    updateTodoStatus,
    deleteTodo,
    getNearestTodo
};

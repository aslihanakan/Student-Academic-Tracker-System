const projectService = require("../services/projectService");

function getAllProjects(req, res) {
    projectService.getAllProjects(req.userId, function (err, projects) {
        if (err) {
            return res.status(500).json({ message: err.message });
        }
        res.status(200).json(projects);
    });
}

function createProject(req, res) {
    const courseId = Number(req.body.courseId);
    const projectName = req.body.projectName;
    const dueDate = req.body.dueDate;
    const description = req.body.description || "";
    const score = req.body.score;
    const status = req.body.status || "pending";

    projectService.createProject(
        req.userId,
        courseId,
        projectName,
        dueDate,
        description,
        score,
        status,
        function (err, project) {
            if (err) {
                return res.status(400).json({ message: err.message });
            }
            res.status(201).json(project);
        }
    );
}

function deleteProject(req, res) {
    const id = Number(req.params.id);

    projectService.deleteProject(id, req.userId, function (err) {
        if (err) {
            return res.status(404).json({ message: err.message });
        }
        res.status(200).json({ message: "Project deleted successfully." });
    });
}

module.exports = {
    getAllProjects,
    createProject,
    deleteProject
};

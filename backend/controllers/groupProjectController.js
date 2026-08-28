const { db } = require("../database/database");

exports.getGroupProjects = function (req, res) {
    const userId = req.user.id;

    db.all(
        `SELECT DISTINCT gp.id, gp.title, gp.courseName, gp.ownerId, gp.dueDate, gp.description, gp.createdAt,
                (SELECT COUNT(*) FROM group_tasks WHERE projectId = gp.id) as totalTasks,
                (SELECT COUNT(*) FROM group_tasks WHERE projectId = gp.id AND isDone = 1) as completedTasks
         FROM group_projects gp
         LEFT JOIN group_project_members gpm ON gp.id = gpm.projectId
         WHERE gp.ownerId = ? OR gpm.userId = ?
         ORDER BY gp.id DESC`,
        [userId, userId],
        function (err, projects) {
            if (err) {
                console.error("Get Group Projects Error:", err);
                return res.status(500).json({ message: "Could not retrieve group projects." });
            }

            if (!projects || !projects.length) {
                return res.json({ success: true, projects: [] });
            }

            let pending = projects.length;
            const populated = [];

            projects.forEach(p => {
                db.all(
                    `SELECT u.id, u.name, u.email, u.avatar, gpm.role
                     FROM group_project_members gpm
                     JOIN users u ON gpm.userId = u.id
                     WHERE gpm.projectId = ?`,
                    [p.id],
                    function (err, members) {
                        populated.push({
                            ...p,
                            isOwner: p.ownerId === userId,
                            members: members || []
                        });
                        pending--;
                        if (pending === 0) {
                            populated.sort((a, b) => b.id - a.id);
                            res.json({ success: true, projects: populated });
                        }
                    }
                );
            });
        }
    );
};

exports.createGroupProject = function (req, res) {
    const userId = req.user.id;
    const { title, courseName, dueDate, description } = req.body;

    if (!title || !title.trim()) {
        return res.status(400).json({ message: "Project title is required." });
    }

    db.run(
        `INSERT INTO group_projects (title, courseName, ownerId, dueDate, description)
         VALUES (?, ?, ?, ?, ?)`,
        [title.trim(), courseName || "-", userId, dueDate || new Date().toISOString().slice(0, 10), description || ""],
        function (err) {
            if (err) {
                console.error("Create Group Project Error:", err);
                return res.status(500).json({ message: "Could not create group project." });
            }

            const projectId = this.lastID;

            // Add owner to members table
            db.run(
                `INSERT INTO group_project_members (projectId, userId, role) VALUES (?, ?, 'owner')`,
                [projectId, userId],
                function () {
                    res.json({
                        success: true,
                        message: `Group project "${title}" created!`,
                        projectId
                    });
                }
            );
        }
    );
};

function normalizeForSearch(str) {
    if (!str) return "";
    return str
        .trim()
        .toLocaleLowerCase("tr-TR")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/ı/g, "i")
        .replace(/İ/g, "i")
        .replace(/ğ/g, "g")
        .replace(/Ğ/g, "g")
        .replace(/ü/g, "u")
        .replace(/Ü/g, "u")
        .replace(/ş/g, "s")
        .replace(/Ş/g, "s")
        .replace(/ö/g, "o")
        .replace(/Ö/g, "o")
        .replace(/ç/g, "c")
        .replace(/Ç/g, "c")
        .replace(/\s+/g, " ");
}

exports.inviteMember = function (req, res) {
    const projectId = req.params.id;
    const rawInput = (req.body.email || req.body.emailOrName || "").trim();

    if (!rawInput) {
        return res.status(400).json({ message: "Please provide the classmate's email or username." });
    }

    const searchClean = normalizeForSearch(rawInput);

    db.all(`SELECT id, name, email FROM users`, [], function (err, allUsers) {
        if (err || !allUsers || !allUsers.length) {
            return res.status(404).json({ message: "No registered user found with this email/name." });
        }

        const user = allUsers.find(u => {
            if (!u) return false;
            const uEmail = (u.email || "").trim();
            const uName = (u.name || "").trim();

            const uEmailClean = normalizeForSearch(uEmail);
            const uNameClean = normalizeForSearch(uName);

            if (uEmail.toLowerCase() === rawInput.toLowerCase()) return true;
            if (uEmailClean === searchClean) return true;
            if (uNameClean === searchClean) return true;

            if (searchClean.length >= 3) {
                if (uNameClean.includes(searchClean) || searchClean.includes(uNameClean)) return true;
                if (uEmailClean.includes(searchClean)) return true;
            }

            return false;
        });

        if (!user) {
            return res.status(404).json({ message: "No registered user found with this email/name." });
        }

        db.get(
            `SELECT id FROM group_project_members WHERE projectId = ? AND userId = ?`,
            [projectId, user.id],
            function (err, existing) {
                if (existing) {
                    return res.status(400).json({ message: `${user.name} is already a member of this project.` });
                }

                db.run(
                    `INSERT INTO group_project_members (projectId, userId, role) VALUES (?, ?, 'member')`,
                    [projectId, user.id],
                    function (err) {
                        if (err) {
                            console.error("Add Member Error:", err);
                            return res.status(500).json({ message: "Could not add member to project." });
                        }
                        res.json({ success: true, message: `${user.name} was added to the project!` });
                    }
                );
            }
        );
    });
};
exports.addMember = exports.inviteMember;

exports.getTasks = function (req, res) {
    const projectId = req.params.id;

    db.all(
        `SELECT gt.id, gt.projectId, gt.title, gt.isDone, gt.dueDate, gt.assignedUserId,
                u.name as assignedUserName, u.avatar as assignedUserAvatar
         FROM group_tasks gt
         LEFT JOIN users u ON gt.assignedUserId = u.id
         WHERE gt.projectId = ?
         ORDER BY gt.isDone ASC, gt.id DESC`,
        [projectId],
        function (err, tasks) {
            if (err) {
                console.error("Get Group Tasks Error:", err);
                return res.status(500).json({ message: "Could not retrieve tasks." });
            }
            res.json({ success: true, tasks: tasks || [] });
        }
    );
};

exports.addTask = function (req, res) {
    const projectId = req.params.id;
    const { title, dueDate, assignedUserId } = req.body;

    if (!title || !title.trim()) {
        return res.status(400).json({ message: "Task title is required." });
    }

    db.run(
        `INSERT INTO group_tasks (projectId, title, dueDate, assignedUserId, isDone)
         VALUES (?, ?, ?, ?, 0)`,
        [projectId, title.trim(), dueDate || new Date().toISOString().slice(0, 10), assignedUserId || null],
        function (err) {
            if (err) {
                console.error("Add Group Task Error:", err);
                return res.status(500).json({ message: "Could not add task." });
            }
            res.json({ success: true, taskId: this.lastID });
        }
    );
};

exports.toggleTaskDone = function (req, res) {
    const taskId = req.params.taskId;
    const isDone = req.body.isDone ? 1 : 0;

    db.run(`UPDATE group_tasks SET isDone = ? WHERE id = ?`, [isDone, taskId], function (err) {
        if (err) {
            console.error("Toggle Group Task Error:", err);
            return res.status(500).json({ message: "Could not update task." });
        }
        res.json({ success: true, isDone });
    });
};

exports.deleteTask = function (req, res) {
    const taskId = req.params.taskId;

    db.run(`DELETE FROM group_tasks WHERE id = ?`, [taskId], function (err) {
        if (err) {
            console.error("Delete Group Task Error:", err);
            return res.status(500).json({ message: "Could not delete task." });
        }
        res.json({ success: true });
    });
};

exports.deleteGroupProject = function (req, res) {
    const userId = req.user.id;
    const projectId = req.params.id;

    db.get(`SELECT ownerId FROM group_projects WHERE id = ?`, [projectId], function (err, project) {
        if (err || !project) {
            return res.status(404).json({ message: "Project not found." });
        }

        if (project.ownerId !== userId) {
            return res.status(403).json({ message: "Only the project creator can delete this group project." });
        }

        db.run(`DELETE FROM group_projects WHERE id = ?`, [projectId], function (err) {
            if (err) {
                console.error("Delete Group Project Error:", err);
                return res.status(500).json({ message: "Could not delete group project." });
            }
            res.json({ success: true, message: "Group project deleted." });
        });
    });
};

const express = require("express");
const router = express.Router();
const groupProjectController = require("../controllers/groupProjectController");
const { requireAuth } = require("../middleware/authMiddleware");

router.get("/", requireAuth, groupProjectController.getGroupProjects);
router.post("/", requireAuth, groupProjectController.createGroupProject);
router.post("/:id/members", requireAuth, groupProjectController.addMember);
router.delete("/:id", requireAuth, groupProjectController.deleteGroupProject);

router.get("/:id/tasks", requireAuth, groupProjectController.getTasks);
router.post("/:id/tasks", requireAuth, groupProjectController.addTask);
router.patch("/:id/tasks/:taskId", requireAuth, groupProjectController.toggleTaskDone);
router.delete("/:id/tasks/:taskId", requireAuth, groupProjectController.deleteTask);

module.exports = router;

const express = require("express");
const router = express.Router();
const buddyController = require("../controllers/buddyController");
const { requireAuth } = require("../middleware/authMiddleware");

router.get("/", requireAuth, buddyController.getBuddies);
router.post("/", requireAuth, buddyController.addBuddy);
router.patch("/:id/accept", requireAuth, buddyController.acceptBuddy);
router.delete("/:buddyId", requireAuth, buddyController.removeBuddy);

module.exports = router;

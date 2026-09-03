const express = require("express");
const router = express.Router();
const aiController = require("../controllers/aiController");
const { requireAuth } = require("../middleware/authMiddleware");

router.post("/coach", requireAuth, aiController.getCoachAdvice);
router.post("/chat", requireAuth, aiController.askCoachChat);
router.post("/parse-syllabus", requireAuth, aiController.parseSyllabus);
router.post("/import-syllabus", requireAuth, aiController.importSyllabus);

module.exports = router;


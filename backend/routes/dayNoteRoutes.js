const express = require("express");
const router = express.Router();
const dayNoteController = require("../controllers/dayNoteController");

router.get("/", dayNoteController.getAllDayNotes);
router.post("/", dayNoteController.createDayNote);
router.delete("/:id", dayNoteController.deleteDayNote);

module.exports = router;

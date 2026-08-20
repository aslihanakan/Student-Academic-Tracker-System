const dayNoteService = require("../services/dayNoteService");

function getAllDayNotes(req, res) {
    dayNoteService.getAllDayNotes(req.userId, function (err, notes) {
        if (err) {
            return res.status(500).json({ message: err.message });
        }

        res.status(200).json(notes || []);
    });
}

function createDayNote(req, res) {
    const noteDate = req.body.noteDate || req.body.date;
    const text = req.body.text;

    dayNoteService.createDayNote(req.userId, noteDate, text, function (err, note) {
        if (err) {
            return res.status(400).json({ message: err.message });
        }

        res.status(201).json(note);
    });
}

function deleteDayNote(req, res) {
    const id = Number(req.params.id);

    dayNoteService.deleteDayNote(id, req.userId, function (err) {
        if (err) {
            return res.status(404).json({ message: err.message });
        }

        res.status(200).json({ message: "Note deleted successfully." });
    });
}

module.exports = {
    getAllDayNotes,
    createDayNote,
    deleteDayNote
};

const studySessionService = require("../services/studySessionService");

function getAllStudySessions(req, res) {
    studySessionService.getAllStudySessions(req.userId, function (err, sessions) {
        if (err) {
            return res.status(500).json({ message: err.message });
        }

        res.status(200).json(sessions);
    });
}

function createStudySession(req, res) {
    const courseId = Number(req.body.courseId);
    const studyDate = req.body.studyDate;
    const hours = Number(req.body.hours);
    const note = req.body.note;

    studySessionService.createStudySession(
        req.userId,
        courseId,
        studyDate,
        hours,
        note,
        function (err, session) {
            if (err) {
                return res.status(400).json({ message: err.message });
            }

            res.status(201).json(session);
        }
    );
}

function deleteStudySession(req, res) {
    const id = Number(req.params.id);

    studySessionService.deleteStudySession(id, req.userId, function (err) {
        if (err) {
            return res.status(404).json({ message: err.message });
        }

        res.status(200).json({ message: "Study session deleted successfully." });
    });
}

function getTotalStudyHours(req, res) {
    studySessionService.getTotalStudyHours(req.userId, function (err, result) {
        if (err) {
            return res.status(500).json({ message: err.message });
        }

        res.status(200).json(result);
    });
}

module.exports = {
    getAllStudySessions,
    createStudySession,
    deleteStudySession,
    getTotalStudyHours
};

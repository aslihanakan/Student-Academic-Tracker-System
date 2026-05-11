const examService = require("../services/examService");

function getAllExams(req, res) {
    examService.getAllExams(function (err, exams) {
        if (err) {
            return res.status(500).json({ message: err.message });
        }

        res.status(200).json(exams);
    });
}

function createExam(req, res) {
    const courseId = Number(req.body.courseId);
    const examName = req.body.examName;
    const examDate = req.body.examDate;
    const examType = req.body.examType;
    const score = req.body.score;

    examService.createExam(courseId, examName, examDate, examType, score, function (err, exam) {
        if (err) {
            return res.status(400).json({ message: err.message });
        }

        res.status(201).json(exam);
    });
}

function deleteExam(req, res) {
    const id = Number(req.params.id);

    examService.deleteExam(id, function (err) {
        if (err) {
            return res.status(404).json({ message: err.message });
        }

        res.status(200).json({ message: "Exam deleted successfully." });
    });
}

module.exports = {
    getAllExams,
    createExam,
    deleteExam
};
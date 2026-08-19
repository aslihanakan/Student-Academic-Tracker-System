const courseService = require("../services/courseService");

function getAllCourses(req, res) {
    courseService.getAllCourses(req.userId, function (err, courses) {

        if (err) {
            return res.status(500).json({
                message: err.message
            });
        }

        res.status(200).json(courses);
    });
}

function getCourseById(req, res) {

    const id = Number(req.params.id);

    courseService.getCourseById(
        id,
        req.userId,
        function (err, course) {

            if (err) {
                return res.status(500).json({
                    message: err.message
                });
            }

            if (!course) {
                return res.status(404).json({
                    message: "Course not found."
                });
            }

            res.status(200).json(course);
        }
    );
}

function createCourse(req, res) {

    const courseName = req.body.courseName;
    const instructorName = req.body.instructorName;
    const credit = Number(req.body.credit);

    const midtermGrade = req.body.midtermGrade;
    const projectGrade = req.body.projectGrade;
    const finalGrade = req.body.finalGrade;

    // User-defined weights
    const midtermWeight = req.body.midtermWeight;
    const projectWeight = req.body.projectWeight;
    const passingGrade = req.body.passingGrade;

    // Makeup ("büt") exam grade, entered after a course is failed
    const makeupGrade = req.body.makeupGrade;

    // Term info (e.g. "2025-2026" and "Fall")
    const academicYear = req.body.academicYear;
    const semester = req.body.semester;

    // Optional extra graded items (homework, quizzes, attendance...)
    const extraGrades = req.body.extraGrades;

    courseService.createCourse(
        req.userId,
        courseName,
        instructorName,
        credit,
        midtermGrade,
        projectGrade,
        finalGrade,
        midtermWeight,
        projectWeight,
        passingGrade,
        makeupGrade,
        academicYear,
        semester,
        extraGrades,
        function (err, course) {

            if (err) {
                return res.status(400).json({
                    message: err.message
                });
            }

            res.status(201).json(course);
        }
    );
}

function updateCourse(req, res) {

    const id = Number(req.params.id);

    const courseName = req.body.courseName;
    const instructorName = req.body.instructorName;
    const credit = Number(req.body.credit);

    const midtermGrade = req.body.midtermGrade;
    const projectGrade = req.body.projectGrade;
    const finalGrade = req.body.finalGrade;

    // User-defined weights
    const midtermWeight = req.body.midtermWeight;
    const projectWeight = req.body.projectWeight;
    const passingGrade = req.body.passingGrade;

    // Makeup ("büt") exam grade, entered after a course is failed
    const makeupGrade = req.body.makeupGrade;

    // Term info (e.g. "2025-2026" and "Fall")
    const academicYear = req.body.academicYear;
    const semester = req.body.semester;

    // Optional extra graded items (homework, quizzes, attendance...)
    const extraGrades = req.body.extraGrades;

    courseService.updateCourse(
        id,
        req.userId,
        courseName,
        instructorName,
        credit,
        midtermGrade,
        projectGrade,
        finalGrade,
        midtermWeight,
        projectWeight,
        passingGrade,
        makeupGrade,
        academicYear,
        semester,
        extraGrades,
        function (err, course) {

            if (err) {
                return res.status(400).json({
                    message: err.message
                });
            }

            res.status(200).json(course);
        }
    );
}

function deleteCourse(req, res) {

    const id = Number(req.params.id);

    courseService.deleteCourse(
        id,
        req.userId,
        function (err) {

            if (err) {
                return res.status(404).json({
                    message: err.message
                });
            }

            res.status(200).json({
                message: "Course deleted successfully."
            });
        }
    );
}

function searchCourses(req, res) {

    const keyword = req.query.keyword || "";

    courseService.searchCourses(
        keyword,
        req.userId,
        function (err, courses) {

            if (err) {
                return res.status(500).json({
                    message: err.message
                });
            }

            res.status(200).json(courses);
        }
    );
}

module.exports = {
    getAllCourses,
    getCourseById,
    createCourse,
    updateCourse,
    deleteCourse,
    searchCourses
};
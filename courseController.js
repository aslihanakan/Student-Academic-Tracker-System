const courseService = require("../services/courseService");

function getAllCourses(req, res) {
    courseService.getAllCourses(function (err, courses) {

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

    courseService.getCourseById(id, function (err, course) {

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
    });
}

function createCourse(req, res) {

    const courseName = req.body.courseName;
    const instructorName = req.body.instructorName;
    const credit = Number(req.body.credit);
    const midtermGrade = req.body.midtermGrade;
    const projectGrade = req.body.projectGrade;
    const finalGrade = req.body.finalGrade;

    courseService.createCourse(
        courseName,
        instructorName,
        credit,
        midtermGrade,
        projectGrade,
        finalGrade,
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

    courseService.updateCourse(
        id,
        courseName,
        instructorName,
        credit,
        midtermGrade,
        projectGrade,
        finalGrade,
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

    courseService.deleteCourse(id, function (err) {

        if (err) {
            return res.status(404).json({
                message: err.message
            });
        }

        res.status(200).json({
            message: "Course deleted successfully."
        });
    });
}

function searchCourses(req, res) {

    const keyword = req.query.keyword || "";

    courseService.searchCourses(keyword, function (err, courses) {

        if (err) {
            return res.status(500).json({
                message: err.message
            });
        }

        res.status(200).json(courses);
    });
}

module.exports = {
    getAllCourses,
    getCourseById,
    createCourse,
    updateCourse,
    deleteCourse,
    searchCourses
};
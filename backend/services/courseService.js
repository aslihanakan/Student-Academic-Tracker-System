const { db } = require("../database/database");

function isValidGrade(value) {
    return (
        value === null ||
        value === undefined ||
        value === "" ||
        (Number(value) >= 0 && Number(value) <= 100)
    );
}

function normalizeGrade(value) {
    if (value === undefined || value === null || value === "") {
        return null;
    }

    return Number(value);
}

function normalizeWeight(value) {
    if (value === undefined || value === null || value === "") {
        return 0;
    }

    return Number(value);
}

function isValidWeight(value) {
    return Number.isFinite(value) && value >= 0 && value <= 100;
}

function getAllCourses(userId, callback) {
    db.all(
        "SELECT * FROM courses WHERE userId = ?",
        [userId],
        callback
    );
}

function getCourseById(id, userId, callback) {
    db.get(
        "SELECT * FROM courses WHERE id = ? AND userId = ?",
        [id, userId],
        callback
    );
}

function createCourse(
    userId,
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
    callback
) {
    credit = Number(credit);

    midtermGrade = normalizeGrade(midtermGrade);
    projectGrade = normalizeGrade(projectGrade);
    finalGrade = normalizeGrade(finalGrade);
    makeupGrade = normalizeGrade(makeupGrade);

    midtermWeight = normalizeWeight(midtermWeight);
    projectWeight = normalizeWeight(projectWeight);
    passingGrade = passingGrade === undefined || passingGrade === null || passingGrade === ""
        ? 60
        : Number(passingGrade);

    if (!courseName || !instructorName || !credit) {
        return callback(
            new Error(
                "Course name, instructor name and credit are required."
            )
        );
    }

    if (credit < 1 || credit > 10) {
        return callback(
            new Error("Credit must be between 1 and 10.")
        );
    }

    if (
        midtermGrade === null &&
        projectGrade === null &&
        finalGrade === null &&
        makeupGrade === null
    ) {
        return callback(
            new Error(
                "Please enter at least one grade (midterm, project, final or makeup) to save the course."
            )
        );
    }


    if (
        !isValidGrade(midtermGrade) ||
        !isValidGrade(projectGrade) ||
        !isValidGrade(finalGrade) ||
        !isValidGrade(makeupGrade)
    ) {
        return callback(
            new Error("Grades must be between 0 and 100.")
        );
    }

    if (
        !isValidWeight(midtermWeight) ||
        !isValidWeight(projectWeight)
    ) {
        return callback(
            new Error("Weights must be between 0 and 100.")
        );
    }

    if (midtermWeight + projectWeight >= 100) {
        return callback(
            new Error(
                "Midterm and project weights must total less than 100%."
            )
        );
    }

    if (
        !Number.isFinite(passingGrade) ||
        passingGrade < 0 ||
        passingGrade > 100
    ) {
        return callback(
            new Error(
                "Passing grade must be between 0 and 100."
            )
        );
    }

    if (
        midtermGrade !== null &&
        midtermWeight === 0
    ) {
        return callback(
            new Error(
                "You entered a midterm grade. Please enter the midterm weight."
            )
        );
    }

    if (
        projectGrade !== null &&
        projectWeight === 0
    ) {
        return callback(
            new Error(
                "You entered a project grade. Please enter the project weight."
            )
        );
    }

    const sql = `
        INSERT INTO courses
        (
            userId,
            courseName,
            instructorName,
            credit,
            midtermGrade,
            projectGrade,
            finalGrade,
            midtermWeight,
            projectWeight,
            passingGrade,
            makeupGrade
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(
        sql,
        [
            userId,
            courseName,
            instructorName,
            credit,
            midtermGrade,
            projectGrade,
            finalGrade,
            midtermWeight,
            projectWeight,
            passingGrade,
            makeupGrade
        ],
        function (err) {
            if (err) {
                return callback(err);
            }

            callback(null, {
                id: this.lastID,
                userId,
                courseName,
                instructorName,
                credit,
                midtermGrade,
                projectGrade,
                finalGrade,
                midtermWeight,
                projectWeight,
                passingGrade,
                makeupGrade
            });
        }
    );
}

function updateCourse(
    id,
    userId,
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
    callback
) {
    credit = Number(credit);

    midtermGrade = normalizeGrade(midtermGrade);
    projectGrade = normalizeGrade(projectGrade);
    finalGrade = normalizeGrade(finalGrade);
    makeupGrade = normalizeGrade(makeupGrade);

    midtermWeight = normalizeWeight(midtermWeight);
    projectWeight = normalizeWeight(projectWeight);

    passingGrade = passingGrade === undefined || passingGrade === null || passingGrade === ""
        ? 60
        : Number(passingGrade);

    if (!courseName || !instructorName || !credit) {
        return callback(
            new Error(
                "Course name, instructor name and credit are required."
            )
        );
    }

    if (credit < 1 || credit > 10) {
        return callback(
            new Error("Credit must be between 1 and 10.")
        );
    }

    if (
        midtermGrade === null &&
        projectGrade === null &&
        finalGrade === null &&
        makeupGrade === null
    ) {
        return callback(
            new Error(
                "Please enter at least one grade (midterm, project, final or makeup) to save the course."
            )
        );
    }


    if (
        !isValidGrade(midtermGrade) ||
        !isValidGrade(projectGrade) ||
        !isValidGrade(finalGrade) ||
        !isValidGrade(makeupGrade)
    ) {
        return callback(
            new Error("Grades must be between 0 and 100.")
        );
    }

    if (
        !isValidWeight(midtermWeight) ||
        !isValidWeight(projectWeight)
    ) {
        return callback(
            new Error("Weights must be between 0 and 100.")
        );
    }

    if (midtermWeight + projectWeight >= 100) {
        return callback(
            new Error(
                "Midterm and project weights must total less than 100%."
            )
        );
    }

    if (
        !Number.isFinite(passingGrade) ||
        passingGrade < 0 ||
        passingGrade > 100
    ) {
        return callback(
            new Error(
                "Passing grade must be between 0 and 100."
            )
        );
    }

    if (
        midtermGrade !== null &&
        midtermWeight === 0
    ) {
        return callback(
            new Error(
                "You entered a midterm grade. Please enter the midterm weight."
            )
        );
    }

    if (
        projectGrade !== null &&
        projectWeight === 0
    ) {
        return callback(
            new Error(
                "You entered a project grade. Please enter the project weight."
            )
        );
    }

    const sql = `
        UPDATE courses
        SET
            courseName = ?,
            instructorName = ?,
            credit = ?,
            midtermGrade = ?,
            projectGrade = ?,
            finalGrade = ?,
            midtermWeight = ?,
            projectWeight = ?,
            passingGrade = ?,
            makeupGrade = ?
        WHERE id = ?
        AND userId = ?
    `;

    db.run(
        sql,
        [
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
            id,
            userId
        ],
        function (err) {
            if (err) {
                return callback(err);
            }

            if (this.changes === 0) {
                return callback(
                    new Error("Course not found.")
                );
            }

            callback(null, {
                id,
                userId,
                courseName,
                instructorName,
                credit,
                midtermGrade,
                projectGrade,
                finalGrade,
                midtermWeight,
                projectWeight,
                passingGrade,
                makeupGrade
            });
        }
    );
}

function deleteCourse(id, userId, callback) {
    db.run(
        "DELETE FROM courses WHERE id = ? AND userId = ?",
        [id, userId],
        function (err) {
            if (err) {
                return callback(err);
            }

            if (this.changes === 0) {
                return callback(
                    new Error("Course not found.")
                );
            }

            callback(null, true);
        }
    );
}

function searchCourses(keyword, userId, callback) {
    const searchValue = "%" + keyword + "%";

    db.all(
        `
        SELECT *
        FROM courses
        WHERE userId = ?
        AND (
            courseName LIKE ?
            OR instructorName LIKE ?
        )
        `,
        [userId, searchValue, searchValue],
        callback
    );
}

function verifyCourseOwnership(
    courseId,
    userId,
    callback
) {
    db.get(
        "SELECT id FROM courses WHERE id = ? AND userId = ?",
        [courseId, userId],
        function (err, row) {
            if (err) {
                return callback(err);
            }

            callback(null, !!row);
        }
    );
}

module.exports = {
    getAllCourses,
    getCourseById,
    createCourse,
    updateCourse,
    deleteCourse,
    searchCourses,
    verifyCourseOwnership
};
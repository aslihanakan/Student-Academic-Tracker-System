const { db } = require("../database/database");
const aiService = require("../services/aiService");

exports.getCoachAdvice = function (req, res) {
    const userId = req.user.id;
    const targetGpa = parseFloat(req.body.targetGpa) || 3.0;

    db.all("SELECT * FROM courses WHERE userId = ?", [userId], function (err, courses) {
        if (err) {
            console.error("AI Coach Courses Error:", err);
            return res.status(500).json({ message: "Could not retrieve courses for AI analysis." });
        }

        db.get("SELECT COALESCE(SUM(hours), 0) as totalHours FROM study_sessions WHERE userId = ?", [userId], function (err, studyRow) {
            const totalHours = studyRow ? studyRow.totalHours : 0;
            const advice = aiService.generateHeuristicAcademicAdvice(courses || [], targetGpa, totalHours);
            res.json({ success: true, data: advice });
        });
    });
};

exports.parseSyllabus = function (req, res) {
    const text = req.body.text || "";
    if (!text.trim()) {
        return res.status(400).json({ message: "Please provide syllabus text to parse." });
    }

    try {
        const parsed = aiService.parseSyllabusHeuristic(text);
        res.json({ success: true, data: parsed });
    } catch (e) {
        console.error("Syllabus Parse Error:", e);
        res.status(500).json({ message: "Could not parse syllabus text." });
    }
};

exports.importSyllabus = function (req, res) {
    const userId = req.user.id;
    const { courseName, instructorName, credit, passingGrade, midtermWeight, projectWeight, exams, projects, activities, academicYear } = req.body;

    if (!courseName) {
        return res.status(400).json({ message: "Course name is required." });
    }

    const yearTerm = academicYear || "2026-2027 4th Grade Fall Term";
    const cr = parseInt(credit, 10) || 3;
    const mw = Number(midtermWeight) || 30;
    const pw = Number(projectWeight) || 20;
    const passG = Number(passingGrade) || 60;

    db.run(
        `INSERT INTO courses (userId, courseName, instructorName, credit, academicYear, midtermWeight, projectWeight, passingGrade, listedInGrades, createdFrom)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 'syllabus')`,
        [userId, courseName, instructorName || "-", cr, yearTerm, mw, pw, passG],
        function (err) {
            if (err) {
                console.error("Import Course Error:", err);
                return res.status(500).json({ message: "Could not create course from syllabus." });
            }

            const courseId = this.lastID;

            // Insert exams
            (exams || []).forEach(e => {
                if (e.examName) {
                    db.run(
                        `INSERT INTO exams (userId, courseId, examName, examDate, examType)
                         VALUES (?, ?, ?, ?, ?)`,
                        [userId, courseId, e.examName, e.examDate || new Date().toISOString().slice(0, 10), e.examType || "midterm"]
                    );
                }
            });

            // Insert projects
            (projects || []).forEach(p => {
                if (p.projectName) {
                    db.run(
                        `INSERT INTO projects (userId, courseId, projectName, dueDate, description, status)
                         VALUES (?, ?, ?, ?, ?, 'pending')`,
                        [userId, courseId, p.projectName, p.dueDate || new Date().toISOString().slice(0, 10), p.description || "Imported Project"]
                    );
                }
            });

            // Insert activities/homeworks
            (activities || []).forEach(a => {
                if (a.title) {
                    db.run(
                        `INSERT INTO todos (userId, courseId, type, title, dueDate, isDone)
                         VALUES (?, ?, ?, ?, ?, 0)`,
                        [userId, courseId, a.type || "homework", a.title, a.dueDate || new Date().toISOString().slice(0, 10)]
                    );
                }
            });

            res.json({
                success: true,
                message: `"${courseName}" and all associated deadlines were successfully imported!`,
                courseId
            });
        }
    );
};

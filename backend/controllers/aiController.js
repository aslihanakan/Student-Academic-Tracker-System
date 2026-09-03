const { db } = require("../database/database");
const aiService = require("../services/aiService");

exports.getCoachAdvice = function (req, res) {
    const userId = req.user.id;
    const targetGpa = parseFloat(req.body.targetGpa) || 3.0;

    // Only include courses that are part of the actual Grades table (listedInGrades = 1)
    db.all("SELECT * FROM courses WHERE userId = ? AND COALESCE(listedInGrades, 1) = 1", [userId], function (err, courses) {
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

exports.askCoachChat = async function (req, res) {
    const userId = req.user.id;
    const question = req.body.question || "";
    const targetGpa = parseFloat(req.body.targetGpa) || 3.0;

    if (!question.trim()) {
        return res.status(400).json({ message: "Lütfen bir soru giriniz." });
    }

    const history = req.body.history || [];

    // Safe DB query wrappers: if Turso cloud is offline/unreachable, do NOT crash with 500
    const safeGet = (sql, params) => new Promise((resolve) => {
        db.get(sql, params, (err, row) => {
            if (err) console.warn("DB safeGet offline/fail (fallback used):", err.message);
            resolve(row || null);
        });
    });

    const safeAll = (sql, params) => new Promise((resolve) => {
        db.all(sql, params, (err, rows) => {
            if (err) console.warn("DB safeAll offline/fail (fallback used):", err.message);
            resolve(rows || []);
        });
    });

    try {
        const userRow = await safeGet("SELECT name, gradeLevel, department FROM users WHERE id = ?", [userId]);
        const courses = await safeAll("SELECT * FROM courses WHERE userId = ? AND COALESCE(listedInGrades, 1) = 1", [userId]);
        const exams = await safeAll("SELECT * FROM exams WHERE userId = ? ORDER BY examDate ASC", [userId]);
        const todos = await safeAll("SELECT * FROM todos WHERE userId = ? AND isDone = 0 ORDER BY dueDate ASC", [userId]);
        const studyRow = await safeGet("SELECT COALESCE(SUM(hours), 0) as totalHours FROM study_sessions WHERE userId = ?", [userId]);

        const studentInfo = userRow || { name: req.user.name || "Aslıhan", department: "Bilgisayar Mühendisliği", gradeLevel: "4" };
        const totalHours = studyRow ? studyRow.totalHours : 0;

        const lang = req.body.lang || "en";
        const result = await aiService.answerAcademicQuestion({
            student: studentInfo,
            courses: courses || [],
            exams: exams || [],
            todos: todos || [],
            totalHours,
            targetGpa,
            question,
            history,
            lang
        });

        const answerText = typeof result === "object" ? result.answer : result;
        const mode = typeof result === "object" ? result.mode : "offline";
        const provider = typeof result === "object" ? result.provider : "Offline Mood";

        return res.json({ success: true, answer: answerText, mode, provider });
    } catch (chatErr) {
        console.error("AI Chat Controller Fallback:", chatErr.message);
        try {
            const fallbackLocal = aiService.generateRichChatResponse({
                student: { name: req.user.name || "Aslıhan" },
                courses: [],
                exams: [],
                todos: [],
                totalHours: 0,
                targetGpa: 3.0,
                question,
                qLower: question.toLowerCase(),
                history
            });
            return res.json({ success: true, answer: fallbackLocal, mode: "offline", provider: "Offline Mood" });
        } catch (innerErr) {
            return res.status(500).json({ message: "AI Koç yanıt oluştururken bir hata oluştu." });
        }
    }
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

const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.join(__dirname, "academic_tracker.db");

const db = new sqlite3.Database(dbPath, function (err) {
    if (err) {
        console.error(
            "Database connection error:",
            err.message
        );
    } else {
        console.log(
            "Connected to SQLite database."
        );
    }
});


/**
 * Adds a column to an existing table if it does not already exist.
 * This allows older database files to be upgraded
 * without deleting existing data.
 */
function ensureColumn(
    table,
    column,
    definition,
    callback
) {
    db.all(
        `PRAGMA table_info(${table})`,
        [],
        function (err, columns) {

            if (err) {
                return callback(err);
            }

            const alreadyExists =
                columns.some(function (col) {
                    return col.name === column;
                });

            if (alreadyExists) {
                return callback(null);
            }

            db.run(
                `ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`,
                function (err) {

                    if (err) {
                        return callback(err);
                    }

                    console.log(
                        `Added column ${column} to ${table}.`
                    );

                    callback(null);
                }
            );
        }
    );
}


function initializeDatabase() {

    db.serialize(function () {

        db.run(
            "PRAGMA foreign_keys = ON"
        );


        // ─────────────────────────────────────────
        // USERS TABLE
        // ─────────────────────────────────────────

        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                passwordHash TEXT NOT NULL,
                createdAt TEXT NOT NULL
                    DEFAULT (datetime('now'))
            )
        `);


        // ─────────────────────────────────────────
        // COURSES TABLE
        // ─────────────────────────────────────────

        db.run(`
            CREATE TABLE IF NOT EXISTS courses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,

                userId INTEGER NOT NULL,

                courseName TEXT NOT NULL,

                instructorName TEXT NOT NULL,

                credit INTEGER NOT NULL
                    CHECK (credit >= 1 AND credit <= 10),

                midtermGrade INTEGER
                    CHECK (
                        midtermGrade >= 0
                        AND midtermGrade <= 100
                    ),

                projectGrade INTEGER
                    CHECK (
                        projectGrade >= 0
                        AND projectGrade <= 100
                    ),

                finalGrade INTEGER
                    CHECK (
                        finalGrade >= 0
                        AND finalGrade <= 100
                    ),

                midtermWeight REAL
                    DEFAULT 0
                    CHECK (
                        midtermWeight >= 0
                        AND midtermWeight <= 100
                    ),

                projectWeight REAL
                    DEFAULT 0
                    CHECK (
                        projectWeight >= 0
                        AND projectWeight <= 100
                    ),

                passingGrade REAL
                    DEFAULT 60
                    CHECK (
                        passingGrade >= 0
                        AND passingGrade <= 100
                    ),

                makeupGrade INTEGER
                    CHECK (
                        makeupGrade >= 0
                        AND makeupGrade <= 100
                    ),

                FOREIGN KEY (userId)
                    REFERENCES users(id)
                    ON DELETE CASCADE
            )
        `);


        // ─────────────────────────────────────────
        // MIGRATION FOR COURSES
        // ─────────────────────────────────────────

        ensureColumn(
            "courses",
            "midtermWeight",
            "REAL DEFAULT 0",
            function (err) {

                if (err) {
                    console.error(
                        "Migration error:",
                        err.message
                    );
                }
            }
        );

        ensureColumn(
            "courses",
            "projectWeight",
            "REAL DEFAULT 0",
            function (err) {

                if (err) {
                    console.error(
                        "Migration error:",
                        err.message
                    );
                }
            }
        );

        ensureColumn(
            "courses",
            "passingGrade",
            "REAL DEFAULT 60",
            function (err) {

                if (err) {
                    console.error(
                        "Migration error:",
                        err.message
                    );
                }
            }
        );

        ensureColumn(
            "courses",
            "makeupGrade",
            "INTEGER",
            function (err) {

                if (err) {
                    console.error(
                        "Migration error:",
                        err.message
                    );
                }
            }
        );


        // ─────────────────────────────────────────
        // OLD DATABASE USER ID MIGRATION
        // ─────────────────────────────────────────

        const tablesNeedingUserId = [
            "courses",
            "exams",
            "projects",
            "study_sessions",
            "todos"
        ];

        tablesNeedingUserId.forEach(
            function (table) {

                ensureColumn(
                    table,
                    "userId",
                    "INTEGER",
                    function (err) {

                        if (err) {
                            console.error(
                                `Migration error while adding userId to ${table}:`,
                                err.message
                            );
                        }
                    }
                );
            }
        );


        // ─────────────────────────────────────────
        // EXAMS TABLE
        // ─────────────────────────────────────────

        db.run(`
            CREATE TABLE IF NOT EXISTS exams (
                id INTEGER PRIMARY KEY AUTOINCREMENT,

                userId INTEGER NOT NULL,

                courseId INTEGER NOT NULL,

                examName TEXT NOT NULL,

                examDate TEXT NOT NULL,

                examType TEXT NOT NULL
                    CHECK (
                        examType IN (
                            'midterm',
                            'final',
                            'quiz',
                            'other'
                        )
                    ),

                score INTEGER
                    CHECK (
                        score >= 0
                        AND score <= 100
                    ),

                FOREIGN KEY (courseId)
                    REFERENCES courses(id)
                    ON DELETE CASCADE,

                FOREIGN KEY (userId)
                    REFERENCES users(id)
                    ON DELETE CASCADE
            )
        `);


        // ─────────────────────────────────────────
        // PROJECTS TABLE
        // ─────────────────────────────────────────

        db.run(`
            CREATE TABLE IF NOT EXISTS projects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,

                userId INTEGER NOT NULL,

                courseId INTEGER NOT NULL,

                projectName TEXT NOT NULL,

                dueDate TEXT NOT NULL,

                description TEXT,

                score INTEGER
                    CHECK (
                        score >= 0
                        AND score <= 100
                    ),

                status TEXT NOT NULL
                    DEFAULT 'pending'

                    CHECK (
                        status IN (
                            'pending',
                            'in progress',
                            'completed'
                        )
                    ),

                FOREIGN KEY (courseId)
                    REFERENCES courses(id)
                    ON DELETE CASCADE,

                FOREIGN KEY (userId)
                    REFERENCES users(id)
                    ON DELETE CASCADE
            )
        `);


        // ─────────────────────────────────────────
        // STUDY SESSIONS TABLE
        // ─────────────────────────────────────────

        db.run(`
            CREATE TABLE IF NOT EXISTS study_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,

                userId INTEGER NOT NULL,

                courseId INTEGER NOT NULL,

                studyDate TEXT NOT NULL,

                hours REAL NOT NULL
                    CHECK (hours > 0),

                note TEXT,

                FOREIGN KEY (courseId)
                    REFERENCES courses(id)
                    ON DELETE CASCADE,

                FOREIGN KEY (userId)
                    REFERENCES users(id)
                    ON DELETE CASCADE
            )
        `);


        // ─────────────────────────────────────────
        // TODOS TABLE
        // ─────────────────────────────────────────

        db.run(`
            CREATE TABLE IF NOT EXISTS todos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,

                userId INTEGER NOT NULL,

                courseId INTEGER NOT NULL,

                type TEXT NOT NULL
                    CHECK (
                        type IN (
                            'exam',
                            'project'
                        )
                    ),

                title TEXT NOT NULL,

                dueDate TEXT NOT NULL,

                isDone INTEGER NOT NULL
                    DEFAULT 0

                    CHECK (
                        isDone IN (0, 1)
                    ),

                FOREIGN KEY (courseId)
                    REFERENCES courses(id)
                    ON DELETE CASCADE,

                FOREIGN KEY (userId)
                    REFERENCES users(id)
                    ON DELETE CASCADE
            )
        `);


        // ─────────────────────────────────────────
        // DASHBOARD SUMMARY TABLE
        // ─────────────────────────────────────────

        db.run(`
            CREATE TABLE IF NOT EXISTS dashboard_summary (
                id INTEGER PRIMARY KEY AUTOINCREMENT,

                totalStudyHours REAL
                    DEFAULT 0,

                completedTasks INTEGER
                    DEFAULT 0,

                lastUpdated TEXT
            )
        `);

    });
}


module.exports = {
    db,
    initializeDatabase
};
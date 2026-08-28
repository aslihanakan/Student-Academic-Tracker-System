const { createClient } = require("@libsql/client");
const path = require("path");

const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoAuthToken = process.env.TURSO_AUTH_TOKEN;

let client;

if (tursoUrl) {
    client = createClient({
        url: tursoUrl,
        authToken: tursoAuthToken
    });
} else {
    const dbPath =
        process.env.DB_PATH ||
        path.join(__dirname, "academic_tracker.db");

    client = createClient({
        url: `file:${dbPath}`
    });
}

let queue = Promise.resolve();

function enqueue(task) {
    const run = queue.then(task, task);
    queue = run.then(
        function () {},
        function () {}
    );
    return run;
}

function normalizeArgs(params, callback) {
    if (typeof params === "function") {
        return { params: [], callback: params };
    }
    return { params: params || [], callback: callback };
}

const db = {

    run(sql, params, callback) {
        const normalized = normalizeArgs(params, callback);

        enqueue(function () {
            return client.execute({
                sql: sql,
                args: normalized.params
            });
        })
            .then(function (result) {
                if (!normalized.callback) return;

                const context = {
                    lastID:
                        result.lastInsertRowid !== undefined &&
                        result.lastInsertRowid !== null
                            ? Number(result.lastInsertRowid)
                            : undefined,
                    changes: Number(result.rowsAffected || 0)
                };

                normalized.callback.call(context, null);
            })
            .catch(function (err) {
                if (normalized.callback) normalized.callback(err);
            });
    },

    get(sql, params, callback) {
        const normalized = normalizeArgs(params, callback);

        enqueue(function () {
            return client.execute({
                sql: sql,
                args: normalized.params
            });
        })
            .then(function (result) {
                if (!normalized.callback) return;
                normalized.callback(null, result.rows[0]);
            })
            .catch(function (err) {
                if (normalized.callback) normalized.callback(err);
            });
    },

    all(sql, params, callback) {
        const normalized = normalizeArgs(params, callback);

        enqueue(function () {
            return client.execute({
                sql: sql,
                args: normalized.params
            });
        })
            .then(function (result) {
                if (!normalized.callback) return;
                normalized.callback(null, result.rows);
            })
            .catch(function (err) {
                if (normalized.callback) normalized.callback(err);
            });
    },

    serialize(fn) {
        fn();
    }
};

function ensureColumn(table, column, definition, callback) {
    db.all(`PRAGMA table_info(${table})`, [], function (err, columns) {

        if (err) {
            return callback(err);
        }

        const alreadyExists = columns.some(function (col) {
            return col.name === column;
        });

        if (alreadyExists) {
            return callback(null);
        }

        db.run(
            `ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`,
            [],
            function (err) {

                if (err) {
                    return callback(err);
                }

                console.log(`Added column ${column} to ${table}.`);
                callback(null);
            }
        );
    });
}

/*
 * SQLite/libsql can't ALTER a CHECK constraint in place, so for
 * databases created before "homework"/"quiz"/"other" were added to
 * todos.type, we recreate the table with the wider constraint and
 * copy the existing rows across. Safe to run on every boot: it's a
 * no-op once the table already has the new constraint.
 */
function migrateTodosTypeCheck(callback) {
    db.get(
        `SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'todos'`,
        [],
        function (err, row) {
            if (err) return callback(err);

            if (!row || !row.sql || row.sql.indexOf("'homework'") !== -1) {
                return callback(null);
            }

            db.run(`ALTER TABLE todos RENAME TO todos_old_typecheck`, [], function (err) {
                if (err) return callback(err);

                db.run(`
                    CREATE TABLE todos (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        userId INTEGER NOT NULL,
                        courseId INTEGER NOT NULL,
                        type TEXT NOT NULL
                            CHECK (type IN ('exam', 'project', 'homework', 'quiz', 'other')),
                        title TEXT NOT NULL,
                        dueDate TEXT NOT NULL,
                        isDone INTEGER NOT NULL DEFAULT 0
                            CHECK (isDone IN (0, 1)),
                        FOREIGN KEY (courseId)
                            REFERENCES courses(id)
                            ON DELETE CASCADE,
                        FOREIGN KEY (userId)
                            REFERENCES users(id)
                            ON DELETE CASCADE
                    )
                `, [], function (err) {
                    if (err) return callback(err);

                    db.run(
                        `INSERT INTO todos (id, userId, courseId, type, title, dueDate, isDone)
                         SELECT id, userId, courseId, type, title, dueDate, isDone FROM todos_old_typecheck`,
                        [],
                        function (err) {
                            if (err) return callback(err);

                            db.run(`DROP TABLE todos_old_typecheck`, [], function (err) {
                                if (err) return callback(err);

                                console.log("Migrated todos.type check constraint.");
                                callback(null);
                            });
                        }
                    );
                });
            });
        }
    );
}

function initializeDatabase() {

    return new Promise(function (resolve, reject) {

        db.serialize(function () {

            db.run("PRAGMA foreign_keys = ON");

            db.run(`
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    email TEXT NOT NULL UNIQUE,
                    passwordHash TEXT NOT NULL,
                    gradeLevel TEXT,
                    department TEXT,
                    avatar TEXT DEFAULT 'pp.png',
                    createdAt TEXT NOT NULL
                        DEFAULT (datetime('now'))
                )
            `);

            ensureColumn("users", "gradeLevel", "TEXT", function (err) {
                if (err) console.error("Migration error (users.gradeLevel):", err.message);
            });

            ensureColumn("users", "department", "TEXT", function (err) {
                if (err) console.error("Migration error (users.department):", err.message);
            });

            ensureColumn("users", "avatar", "TEXT DEFAULT 'pp.png'", function (err) {
                if (err) {
                    console.error("Migration error (users.avatar):", err.message);
                    return;
                }
                db.run(
                    `UPDATE users SET avatar = 'pp.png' WHERE avatar IS NULL OR avatar = '' OR avatar = 'default'`,
                    [],
                    function (err) {
                        if (err) console.error("Backfill error (users.avatar):", err.message);
                    }
                );
            });

            db.run(`
                CREATE UNIQUE INDEX IF NOT EXISTS
                idx_users_email_lower
                ON users (LOWER(TRIM(email)))
            `, [], function (err) {

                if (err) {
                    console.error("Email unique index error:", err.message);
                } else {
                    console.log("Unique email index is ready.");
                }

            });

            db.run(`
                CREATE TABLE IF NOT EXISTS courses (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    userId INTEGER NOT NULL,
                    courseName TEXT NOT NULL,
                    instructorName TEXT NOT NULL,
                    credit INTEGER NOT NULL
                        CHECK (credit >= 1 AND credit <= 10),
                    midtermGrade INTEGER
                        CHECK (midtermGrade >= 0 AND midtermGrade <= 100),
                    projectGrade INTEGER
                        CHECK (projectGrade >= 0 AND projectGrade <= 100),
                    finalGrade INTEGER
                        CHECK (finalGrade >= 0 AND finalGrade <= 100),
                    midtermWeight REAL DEFAULT 0
                        CHECK (midtermWeight >= 0 AND midtermWeight <= 100),
                    projectWeight REAL DEFAULT 0
                        CHECK (projectWeight >= 0 AND projectWeight <= 100),
                    passingGrade REAL DEFAULT 60
                        CHECK (passingGrade >= 0 AND passingGrade <= 100),
                    makeupGrade INTEGER
                        CHECK (makeupGrade >= 0 AND makeupGrade <= 100),
                    FOREIGN KEY (userId)
                        REFERENCES users(id)
                        ON DELETE CASCADE
                )
            `);

            ensureColumn("courses", "midtermWeight", "REAL DEFAULT 0", function (err) {
                if (err) console.error("Migration error:", err.message);
            });

            ensureColumn("courses", "projectWeight", "REAL DEFAULT 0", function (err) {
                if (err) console.error("Migration error:", err.message);
            });

            ensureColumn("courses", "passingGrade", "REAL DEFAULT 60", function (err) {
                if (err) console.error("Migration error:", err.message);
            });

            ensureColumn("courses", "makeupGrade", "INTEGER", function (err) {
                if (err) console.error("Migration error:", err.message);
            });

            ensureColumn("courses", "academicYear", "TEXT", function (err) {
                if (err) {
                    console.error("Migration error:", err.message);
                    return;
                }

                db.run(
                    `UPDATE courses SET academicYear = 'Unspecified' WHERE academicYear IS NULL`,
                    [],
                    function (err) {
                        if (err) {
                            console.error("Backfill error (academicYear):", err.message);
                        }
                    }
                );
            });

            ensureColumn("courses", "semester", "TEXT", function (err) {
                if (err) {
                    console.error("Migration error:", err.message);
                    return;
                }

                db.run(
                    `UPDATE courses SET semester = 'Unspecified' WHERE semester IS NULL`,
                    [],
                    function (err) {
                        if (err) {
                            console.error("Backfill error (semester):", err.message);
                        }
                    }
                );
            });

            // Optional extra graded items beyond midterm/project/final
            // (e.g. homework, quizzes, attendance). Stored as a JSON
            // array string: [{ "label": "Homework", "weight": 10, "score": 85 }, ...]
            ensureColumn("courses", "extraGrades", "TEXT", function (err) {
                if (err) {
                    console.error("Migration error:", err.message);
                    return;
                }

                db.run(
                    `UPDATE courses SET extraGrades = '[]' WHERE extraGrades IS NULL`,
                    [],
                    function (err) {
                        if (err) {
                            console.error("Backfill error (extraGrades):", err.message);
                        }
                    }
                );
            });

            // Courses created from Study/Deadlines stay hidden on Grades
            ensureColumn("courses", "listedInGrades", "INTEGER DEFAULT 1", function (err) {
                if (err) {
                    console.error("Migration error:", err.message);
                    return;
                }

                db.run(
                    `UPDATE courses SET listedInGrades = 1 WHERE listedInGrades IS NULL`,
                    [],
                    function (err) {
                        if (err) {
                            console.error("Backfill error (listedInGrades):", err.message);
                        }
                    }
                );
            });

            // Tracks which page a course was created from ("grades",
            // "exams" [Deadlines page], or "study" [Study Sessions
            // page]), so a quick-added course only shows up as a
            // suggestion on the page it came from. Grade-registered
            // courses (listedInGrades = 1) and legacy quick-added
            // courses from before this column existed ("shared")
            // remain visible on every page.
            ensureColumn("courses", "createdFrom", "TEXT DEFAULT 'grades'", function (err) {
                if (err) {
                    console.error("Migration error:", err.message);
                    return;
                }

                db.run(
                    `UPDATE courses
                     SET createdFrom = 'shared'
                     WHERE COALESCE(listedInGrades, 1) = 0
                     AND (createdFrom IS NULL OR createdFrom = 'grades')`,
                    [],
                    function (err) {
                        if (err) {
                            console.error("Backfill error (createdFrom):", err.message);
                        }
                    }
                );
            });

            const tablesNeedingUserId = [
                "courses",
                "exams",
                "projects",
                "study_sessions",
                "todos"
            ];

            tablesNeedingUserId.forEach(function (table) {
                ensureColumn(table, "userId", "INTEGER", function (err) {
                    if (err) {
                        console.error(
                            `Migration error while adding userId to ${table}:`,
                            err.message
                        );
                    }
                });
            });

            db.run(`
                CREATE TABLE IF NOT EXISTS exams (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    userId INTEGER NOT NULL,
                    courseId INTEGER NOT NULL,
                    examName TEXT NOT NULL,
                    examDate TEXT NOT NULL,
                    examType TEXT NOT NULL
                        CHECK (examType IN ('midterm', 'final', 'quiz', 'other')),
                    score INTEGER
                        CHECK (score >= 0 AND score <= 100),
                    FOREIGN KEY (courseId)
                        REFERENCES courses(id)
                        ON DELETE CASCADE,
                    FOREIGN KEY (userId)
                        REFERENCES users(id)
                        ON DELETE CASCADE
                )
            `);

            // Tracks whether an exam/quiz has been completed by the
            // student, independent of "score" (a score can be entered
            // later, but isDone lets the UI show a green "Completed"
            // checkmark or a red "Overdue" warning once the date passes).
            ensureColumn("exams", "isDone", "INTEGER DEFAULT 0", function (err) {
                if (err) {
                    console.error("Migration error (exams.isDone):", err.message);
                    return;
                }

                db.run(
                    `UPDATE exams SET isDone = 0 WHERE isDone IS NULL`,
                    [],
                    function (err) {
                        if (err) {
                            console.error("Backfill error (exams.isDone):", err.message);
                        }
                    }
                );
            });

            db.run(`
                CREATE TABLE IF NOT EXISTS projects (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    userId INTEGER NOT NULL,
                    courseId INTEGER NOT NULL,
                    projectName TEXT NOT NULL,
                    dueDate TEXT NOT NULL,
                    description TEXT,
                    score INTEGER
                        CHECK (score >= 0 AND score <= 100),
                    status TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'in progress', 'completed')),
                    FOREIGN KEY (courseId)
                        REFERENCES courses(id)
                        ON DELETE CASCADE,
                    FOREIGN KEY (userId)
                        REFERENCES users(id)
                        ON DELETE CASCADE
                )
            `);

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

            // "todos" now doubles as the lightweight "extra activity"
            // list (homework, quiz reminders, etc.) shown on the Exams
            // page and, in condensed form, on the Dashboard. The type
            // CHECK constraint is widened below via migrateTodosTypeCheck
            // for databases that were created before this change.
            db.run(`
                CREATE TABLE IF NOT EXISTS todos (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    userId INTEGER NOT NULL,
                    courseId INTEGER NOT NULL,
                    type TEXT NOT NULL
                        CHECK (type IN ('exam', 'project', 'homework', 'quiz', 'other')),
                    title TEXT NOT NULL,
                    dueDate TEXT NOT NULL,
                    isDone INTEGER NOT NULL DEFAULT 0
                        CHECK (isDone IN (0, 1)),
                    FOREIGN KEY (courseId)
                        REFERENCES courses(id)
                        ON DELETE CASCADE,
                    FOREIGN KEY (userId)
                        REFERENCES users(id)
                        ON DELETE CASCADE
                )
            `, [], function (err) {
                if (err) {
                    console.error("Todos table creation error:", err.message);
                    return;
                }

                migrateTodosTypeCheck(function (err) {
                    if (err) {
                        console.error("Migration error (todos.type check):", err.message);
                    }
                });
            });

            db.run(`
                CREATE TABLE IF NOT EXISTS day_notes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    userId INTEGER NOT NULL,
                    noteDate TEXT NOT NULL,
                    text TEXT NOT NULL,
                    createdAt TEXT NOT NULL
                        DEFAULT (datetime('now')),
                    FOREIGN KEY (userId)
                        REFERENCES users(id)
                        ON DELETE CASCADE
                )
            `);

            db.run(`
                CREATE TABLE IF NOT EXISTS buddies (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    userId INTEGER NOT NULL,
                    buddyId INTEGER NOT NULL,
                    status TEXT DEFAULT 'accepted',
                    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
                    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY (buddyId) REFERENCES users(id) ON DELETE CASCADE
                )
            `);

            db.run(`
                CREATE TABLE IF NOT EXISTS group_projects (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    courseName TEXT,
                    ownerId INTEGER NOT NULL,
                    dueDate TEXT,
                    description TEXT,
                    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
                    FOREIGN KEY (ownerId) REFERENCES users(id) ON DELETE CASCADE
                )
            `);

            db.run(`
                CREATE TABLE IF NOT EXISTS group_project_members (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    projectId INTEGER NOT NULL,
                    userId INTEGER NOT NULL,
                    role TEXT DEFAULT 'member',
                    FOREIGN KEY (projectId) REFERENCES group_projects(id) ON DELETE CASCADE,
                    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
                )
            `);

            db.run(`
                CREATE TABLE IF NOT EXISTS group_tasks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    projectId INTEGER NOT NULL,
                    assignedUserId INTEGER,
                    title TEXT NOT NULL,
                    isDone INTEGER DEFAULT 0,
                    dueDate TEXT,
                    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
                    FOREIGN KEY (projectId) REFERENCES group_projects(id) ON DELETE CASCADE,
                    FOREIGN KEY (assignedUserId) REFERENCES users(id) ON DELETE SET NULL
                )
            `);

            db.run(`
                CREATE TABLE IF NOT EXISTS dashboard_summary (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    totalStudyHours REAL DEFAULT 0,
                    completedTasks INTEGER DEFAULT 0,
                    lastUpdated TEXT
                )
            `, [], function (err) {

                if (err) {
                    console.error("Database initialization error:", err.message);
                    return reject(err);
                }

                console.log(
                    tursoUrl
                        ? `Connected to Turso database.`
                        : `Connected to local SQLite file (no TURSO_DATABASE_URL set).`
                );

                resolve();
            });

        });

    });
}

module.exports = {
    db,
    initializeDatabase
};
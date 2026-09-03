const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const { db } = require("../database/database");

const JWT_SECRET = process.env.JWT_SECRET || "student-academic-tracker-super-secret-key-2026";

const JWT_EXPIRES_IN =
    process.env.JWT_EXPIRES_IN || "1d";


const AVAILABLE_AVATARS = [
    "indir (4).jpg",
    "indir (2).jpg",
    "14.jpg",
    "1.jpg",
    "2.jpg",
    "3.jpg",
    "4.jpg",
    "5.jpg",
    "6.jpg",
    "7.jpg",
    "8.jpg",
    "9.jpg",
    "10.jpg",
    "11.jpg",
    "12.png",
    "indir (12).jpg",
    "indir (13).jpg",
    "quby 3.jpg"
];

function sanitizeAvatar(avatar) {
    if (!avatar || typeof avatar !== "string") {
        return "pp.png";
    }

    let trimmed = avatar.trim();
    if (trimmed.startsWith("data:image/")) {
        if (trimmed.length > 2 * 1024 * 1024) {
            return "pp.png";
        }
        return trimmed;
    }

    if (trimmed.startsWith("icons/")) {
        trimmed = trimmed.replace(/^icons\//, "");
    }
    if (trimmed.startsWith("photos/")) {
        trimmed = trimmed.replace(/^photos\//, "");
    }

    if (trimmed === "default" || trimmed === "pp.png" || trimmed === "logo.png") {
        return "pp.png";
    }

    if (AVAILABLE_AVATARS.includes(trimmed)) {
        return trimmed;
    }

    return "pp.png";
}

function formatTitleCase(str) {
    if (!str || typeof str !== "string") return "";
    return str
        .trim()
        .replace(/\s+/g, " ")
        .split(" ")
        .map(function (word) {
            if (!word) return "";
            return word.split("-").map(function (sub) {
                if (!sub) return "";
                return sub.charAt(0).toLocaleUpperCase("tr-TR") + sub.slice(1).toLocaleLowerCase("tr-TR");
            }).join("-");
        })
        .join(" ");
}

// =====================================================
// REGISTER
// =====================================================

function registerUser(name, email, password, gradeLevel, department, avatar) {

    return new Promise((resolve, reject) => {

        const normalizedEmail =
            String(email)
                .trim()
                .toLowerCase();

        const normalizedName =
            formatTitleCase(name);

        const normalizedGrade =
            gradeLevel ? String(gradeLevel).trim() : null;

        const normalizedDepartment =
            department ? formatTitleCase(department) : null;

        const selectedAvatar =
            sanitizeAvatar(avatar);

        const checkSql = `
            SELECT id
            FROM users
            WHERE LOWER(TRIM(email)) = ?
            LIMIT 1
        `;

        db.get(
            checkSql,
            [normalizedEmail],
            async function (err, user) {

                if (err) {
                    return reject(err);
                }

                if (user) {
                    return reject(
                        new Error("EMAIL_ALREADY_EXISTS")
                    );
                }

                try {

                    const hashedPassword =
                        await bcrypt.hash(password, 10);

                    const insertSql = `
                        INSERT INTO users
                        (name, email, passwordHash, gradeLevel, department, avatar)
                        VALUES (?, ?, ?, ?, ?, ?)
                    `;

                    db.run(
                        insertSql,
                        [
                            normalizedName,
                            normalizedEmail,
                            hashedPassword,
                            normalizedGrade,
                            normalizedDepartment,
                            selectedAvatar
                        ],
                        function (err) {

                            if (err) {
                                if (
                                    err.code === "SQLITE_CONSTRAINT" ||
                                    err.code === "SQLITE_CONSTRAINT_UNIQUE"
                                ) {
                                    return reject(
                                        new Error(
                                            "EMAIL_ALREADY_EXISTS"
                                        )
                                    );
                                }

                                return reject(err);
                            }

                            const userId = this.lastID;

                            const token = jwt.sign(
                                {
                                    id: userId,
                                    email: normalizedEmail
                                },
                                JWT_SECRET,
                                {
                                    expiresIn: JWT_EXPIRES_IN
                                }
                            );

                            resolve({
                                token,
                                user: {
                                    id: userId,
                                    name: normalizedName,
                                    email: normalizedEmail,
                                    gradeLevel: normalizedGrade,
                                    department: normalizedDepartment,
                                    avatar: selectedAvatar,
                                    theme: "default",
                                    language: "en"
                                }
                            });

                        }
                    );

                } catch (error) {
                    reject(error);
                }

            }
        );

    });

}


// =====================================================
// LOGIN
// =====================================================

function loginUser(email, password) {

    return new Promise((resolve, reject) => {

        const normalizedEmail =
            String(email)
                .trim()
                .toLowerCase();

        const sql = `
            SELECT *
            FROM users
            WHERE LOWER(TRIM(email)) = ?
            LIMIT 1
        `;

        db.get(
            sql,
            [normalizedEmail],
            async function (err, user) {

                if (err) {
                    return reject(err);
                }

                if (!user) {
                    return reject(
                        new Error("INVALID_CREDENTIALS")
                    );
                }

                try {

                    const passwordMatch =
                        await bcrypt.compare(
                            password,
                            user.passwordHash
                        );

                    if (!passwordMatch) {
                        return reject(
                            new Error("INVALID_CREDENTIALS")
                        );
                    }

                    const token =
                        jwt.sign(
                            {
                                id: user.id,
                                email: user.email
                            },
                            JWT_SECRET,
                            {
                                expiresIn:
                                    JWT_EXPIRES_IN
                            }
                        );

                    resolve({
                        token,
                        user: {
                            id: user.id,
                            name: user.name,
                            email: user.email,
                            gradeLevel: user.gradeLevel || "",
                            department: user.department || "",
                            avatar: user.avatar || "default",
                            theme: user.theme || "default",
                            language: user.language || "en"
                        }
                    });

                } catch (error) {
                    reject(error);
                }

            }
        );

    });

}


// =====================================================
// FIND USER BY ID
// =====================================================

function findUserById(userId) {

    return new Promise((resolve, reject) => {

        const sql = `
            SELECT id, name, email, gradeLevel, department, avatar, theme, language, createdAt
            FROM users
            WHERE id = ?
        `;

        db.get(
            sql,
            [userId],
            function (err, user) {

                if (err) {
                    return reject(err);
                }

                if (!user) {
                    return resolve(null);
                }

                resolve({
                    ...user,
                    gradeLevel: user.gradeLevel || "",
                    department: user.department || "",
                    avatar: user.avatar || "default"
                });

            }
        );

    });

}


// =====================================================
// UPDATE USER PROFILE
// =====================================================

function updateUserProfile(userId, updateData) {

    return new Promise((resolve, reject) => {

        const sql = `
            SELECT *
            FROM users
            WHERE id = ?
        `;

        db.get(sql, [userId], async function (err, user) {

            if (err) return reject(err);
            if (!user) return reject(new Error("USER_NOT_FOUND"));

            const name = updateData.name !== undefined ? formatTitleCase(updateData.name) : user.name;
            const gradeLevel = updateData.gradeLevel !== undefined ? String(updateData.gradeLevel).trim() : user.gradeLevel;
            const department = updateData.department !== undefined ? (updateData.department ? formatTitleCase(updateData.department) : "") : user.department;
            const avatar = updateData.avatar !== undefined ? sanitizeAvatar(updateData.avatar) : (user.avatar || "default");

            let email = user.email;
            if (updateData.email) {
                email = String(updateData.email).trim().toLowerCase();
            }

            if (!name) {
                return reject(new Error("Name cannot be empty."));
            }

            // Check if email is being changed and if it already exists
            if (email !== user.email) {
                const emailCheck = await new Promise((res, rej) => {
                    db.get(
                        "SELECT id FROM users WHERE LOWER(TRIM(email)) = ? AND id != ?",
                        [email, userId],
                        (e, r) => (e ? rej(e) : res(r))
                    );
                }).catch(reject);

                if (emailCheck) {
                    return reject(new Error("EMAIL_ALREADY_EXISTS"));
                }
            }

            let passwordHash = user.passwordHash;

            if (updateData.newPassword) {
                if (updateData.newPassword.length < 6) {
                    return reject(new Error("New password must be at least 6 characters long."));
                }

                if (updateData.currentPassword) {
                    const match = await bcrypt.compare(updateData.currentPassword, user.passwordHash);
                    if (!match) {
                        return reject(new Error("Current password is incorrect."));
                    }
                }

                if (user.passwordHash && bcrypt.compareSync(updateData.newPassword, user.passwordHash)) {
                    return reject(new Error("NEW_PASSWORD_SAME_AS_OLD"));
                }

                passwordHash = await bcrypt.hash(updateData.newPassword, 10);
            }

            const updateSql = `
                UPDATE users
                SET
                    name = ?,
                    email = ?,
                    passwordHash = ?,
                    gradeLevel = ?,
                    department = ?,
                    avatar = ?
                WHERE id = ?
            `;

            db.run(
                updateSql,
                [
                    name,
                    email,
                    passwordHash,
                    gradeLevel,
                    department,
                    avatar,
                    userId
                ],
                function (err) {
                    if (err) return reject(err);

                    resolve({
                        id: userId,
                        name,
                        email,
                        gradeLevel: gradeLevel || "",
                        department: department || "",
                        avatar: avatar || "default"
                    });
                }
            );

        });

    });

}

function updateUserPreferences(userId, { theme, language }) {
    return new Promise((resolve, reject) => {
        if (!userId) return reject(new Error("User ID is required."));

        const updates = [];
        const params = [];

        if (theme !== undefined) {
            updates.push("theme = ?");
            params.push(String(theme).trim().toLowerCase());
        }

        if (language !== undefined) {
            updates.push("language = ?");
            params.push(String(language).trim().toLowerCase());
        }

        if (updates.length === 0) {
            return resolve({ success: true, message: "No preferences to update." });
        }

        params.push(userId);
        const sql = `UPDATE users SET ${updates.join(", ")} WHERE id = ?`;

        db.run(sql, params, function (err) {
            if (err) return reject(err);
            resolve({
                success: true,
                theme,
                language
            });
        });
    });
}

const emailService = require("./emailService");

// =====================================================
// FORGOT / RESET PASSWORD
// =====================================================

function requestPasswordReset(email) {
    return new Promise((resolve, reject) => {
        if (!email) {
            return reject(new Error("Email is required."));
        }

        const normalizedEmail = String(email).trim().toLowerCase();

        db.get(
            "SELECT id, name, email FROM users WHERE LOWER(TRIM(email)) = ?",
            [normalizedEmail],
            async function (err, user) {
                if (err) return reject(err);
                if (!user) {
                    return reject(new Error("USER_NOT_FOUND"));
                }

                // Generate secure random 6-digit numeric verification code
                const code = Math.floor(100000 + Math.random() * 900000).toString();
                const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

                // Invalidate any older active reset codes for this email
                db.run(
                    "UPDATE password_resets SET used = 1 WHERE LOWER(TRIM(email)) = ? AND used = 0",
                    [normalizedEmail],
                    function (err) {
                        if (err) console.error("Error invalidating old reset codes:", err);

                        db.run(
                            "INSERT INTO password_resets (userId, email, code, expiresAt, used) VALUES (?, ?, ?, ?, 0)",
                            [user.id, user.email, code, expiresAt],
                            async function (err) {
                                if (err) return reject(err);

                                try {
                                    await emailService.sendPasswordResetEmail(user.email, user.name, code);
                                    resolve({
                                        success: true,
                                        email: user.email,
                                        message: "Verification code sent to your email."
                                    });
                                } catch (emailErr) {
                                    console.error("Email send failed:", emailErr);
                                    resolve({
                                        success: true,
                                        email: user.email,
                                        message: "Verification code sent to your email."
                                    });
                                }
                            }
                        );
                    }
                );
            }
        );
    });
}

function verifyResetCode(email, code) {
    return new Promise((resolve, reject) => {
        if (!email || !code) {
            return reject(new Error("Email and verification code are required."));
        }

        const normalizedEmail = String(email).trim().toLowerCase();
        const normalizedCode = String(code).trim();

        db.get(
            "SELECT * FROM password_resets WHERE LOWER(TRIM(email)) = ? AND code = ? AND used = 0 ORDER BY id DESC LIMIT 1",
            [normalizedEmail, normalizedCode],
            function (err, row) {
                if (err) return reject(err);
                if (!row) {
                    return reject(new Error("INVALID_CODE"));
                }

                if (new Date(row.expiresAt).getTime() < Date.now()) {
                    return reject(new Error("CODE_EXPIRED"));
                }

                resolve({ success: true, message: "Code is valid." });
            }
        );
    });
}

function resetPasswordWithCode(email, code, newPassword) {
    return new Promise((resolve, reject) => {
        if (!email || !code || !newPassword) {
            return reject(new Error("Email, verification code and new password are required."));
        }

        if (String(newPassword).length < 6) {
            return reject(new Error("PASSWORD_TOO_SHORT"));
        }

        const normalizedEmail = String(email).trim().toLowerCase();
        const normalizedCode = String(code).trim();

        db.get(
            "SELECT * FROM password_resets WHERE LOWER(TRIM(email)) = ? AND code = ? AND used = 0 ORDER BY id DESC LIMIT 1",
            [normalizedEmail, normalizedCode],
            async function (err, row) {
                if (err) return reject(err);
                if (!row) {
                    return reject(new Error("INVALID_CODE"));
                }

                if (new Date(row.expiresAt).getTime() < Date.now()) {
                    return reject(new Error("CODE_EXPIRED"));
                }

                db.get(
                    "SELECT id, name, email, passwordHash, gradeLevel, department, avatar FROM users WHERE id = ? OR LOWER(TRIM(email)) = ?",
                    [row.userId || 0, normalizedEmail],
                    function (userErr, existingUser) {
                        if (userErr) return reject(userErr);
                        if (!existingUser) return reject(new Error("USER_NOT_FOUND"));

                        // Strict check: new password cannot match existing password
                        if (existingUser.passwordHash && bcrypt.compareSync(String(newPassword), existingUser.passwordHash)) {
                            return reject(new Error("NEW_PASSWORD_SAME_AS_OLD"));
                        }

                        try {
                            const hashedPassword = bcrypt.hashSync(String(newPassword), 10);

                            db.run(
                                "UPDATE users SET passwordHash = ? WHERE id = ?",
                                [hashedPassword, existingUser.id],
                                function (err) {
                                    if (err) return reject(err);

                                    db.run(
                                        "UPDATE password_resets SET used = 1 WHERE id = ?",
                                        [row.id],
                                        function (err) {
                                            if (err) console.error("Error marking reset code as used:", err);

                                            resolve({
                                                success: true,
                                                message: "Password reset successfully. Please log in with your new password."
                                            });
                                        }
                                    );
                                }
                            );
                        } catch (hashErr) {
                            reject(hashErr);
                        }
                    }
                );
            }
        );
    });
}

function deleteUserAccount(userId) {
    return new Promise(function (resolve, reject) {
        if (!userId) return reject(new Error("User ID is required."));

        db.serialize(function () {
            db.run("DELETE FROM password_resets WHERE userId = ?", [userId]);
            db.run("DELETE FROM day_notes WHERE userId = ?", [userId]);
            db.run("DELETE FROM study_sessions WHERE userId = ?", [userId]);
            db.run("DELETE FROM todos WHERE userId = ?", [userId]);
            db.run("DELETE FROM exams WHERE userId = ?", [userId]);
            db.run("DELETE FROM projects WHERE userId = ?", [userId]);
            db.run("DELETE FROM courses WHERE userId = ?", [userId]);
            db.run("DELETE FROM users WHERE id = ?", [userId], function (err) {
                if (err) return reject(err);
                if (this.changes === 0) return reject(new Error("USER_NOT_FOUND"));
                resolve({ success: true, message: "Account deleted successfully." });
            });
        });
    });
}

function getAvailableAvatars() {
    return AVAILABLE_AVATARS;
}


// =====================================================
// EXPORTS
// =====================================================

module.exports = {
    registerUser,
    loginUser,
    findUserById,
    updateUserProfile,
    deleteUserAccount,
    formatTitleCase,
    getAvailableAvatars,
    requestPasswordReset,
    verifyResetCode,
    resetPasswordWithCode,
    updateUserPreferences,
    JWT_SECRET
};
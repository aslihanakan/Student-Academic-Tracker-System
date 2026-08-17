require("dotenv").config();

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const { db } = require("../database/database");

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error(
        "JWT_SECRET is not defined in environment variables."
    );
}

const JWT_EXPIRES_IN =
    process.env.JWT_EXPIRES_IN || "1d";


// =====================================================
// REGISTER
// =====================================================

function registerUser(name, email, password) {

    return new Promise((resolve, reject) => {

        // Email'i standart hale getiriyoruz.
        // Örnek:
        // " Test@Gmail.com " -> "test@gmail.com"

        const normalizedEmail =
            String(email)
                .trim()
                .toLowerCase();

        const normalizedName =
            String(name).trim();


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


                // =================================================
                // EMAIL ZATEN KAYITLI
                // =================================================

                if (user) {

                    return reject(
                        new Error("EMAIL_ALREADY_EXISTS")
                    );

                }


                try {

                    // =================================================
                    // PASSWORD HASH
                    // =================================================

                    const hashedPassword =
                        await bcrypt.hash(password, 10);


                    // =================================================
                    // CREATE USER
                    // =================================================

                    const insertSql = `
                        INSERT INTO users
                        (name, email, passwordHash)
                        VALUES (?, ?, ?)
                    `;


                    db.run(
                        insertSql,
                        [
                            normalizedName,
                            normalizedEmail,
                            hashedPassword
                        ],
                        function (err) {

                            if (err) {

                                // Veritabanında UNIQUE kısıtı
                                // varsa eşzamanlı kayıt denemelerinde
                                // de ikinci hesabın oluşmasını engeller.

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


                            resolve({

                                id: this.lastID,

                                name: normalizedName,

                                email: normalizedEmail

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

        // Login sırasında da email'i normalize ediyoruz.

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


                    // =================================================
                    // JWT
                    // =================================================

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

                            email: user.email

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
            SELECT id, name, email, createdAt
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

                resolve(user || null);

            }
        );

    });

}


// =====================================================
// EXPORTS
// =====================================================

module.exports = {

    registerUser,

    loginUser,

    findUserById,

    JWT_SECRET

};
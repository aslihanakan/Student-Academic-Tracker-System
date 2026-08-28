const { db } = require("../database/database");

/**
 * Computes consecutive daily study streak for a user
 */
function calculateUserStreak(userId, callback) {
    db.all(
        `SELECT DISTINCT studyDate FROM study_sessions WHERE userId = ? ORDER BY studyDate DESC`,
        [userId],
        function (err, rows) {
            if (err || !rows || !rows.length) return callback(0);

            const dates = rows.map(r => r.studyDate).filter(Boolean);
            if (!dates.length) return callback(0);

            const todayStr = new Date().toISOString().slice(0, 10);
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().slice(0, 10);

            // Streak must include today or yesterday to be active
            if (dates[0] !== todayStr && dates[0] !== yesterdayStr) {
                return callback(0);
            }

            let streak = 1;
            let current = new Date(dates[0]);

            for (let i = 1; i < dates.length; i++) {
                const prev = new Date(dates[i]);
                const diffDays = Math.round((current - prev) / (1000 * 60 * 60 * 24));

                if (diffDays === 1) {
                    streak++;
                    current = prev;
                } else if (diffDays === 0) {
                    // duplicate date
                    continue;
                } else {
                    break;
                }
            }

            callback(streak);
        }
    );
}

exports.getBuddies = function (req, res) {
    const userId = req.user.id;

    // Get current user streak first
    calculateUserStreak(userId, function (myStreak) {
        db.get(
            `SELECT COALESCE(SUM(hours), 0) as myWeeklyHours 
             FROM study_sessions 
             WHERE userId = ? AND studyDate >= date('now', '-7 days')`,
            [userId],
            function (err, myStats) {
                const myWeeklyHours = myStats ? Math.round(myStats.myWeeklyHours * 10) / 10 : 0;

                // Find buddies
                db.all(
                    `SELECT u.id, u.name, u.email, u.avatar, u.department, u.gradeLevel, b.id as friendshipId
                     FROM buddies b
                     JOIN users u ON (u.id = CASE WHEN b.userId = ? THEN b.buddyId ELSE b.userId END)
                     WHERE b.userId = ? OR b.buddyId = ?`,
                    [userId, userId, userId],
                    async function (err, buddies) {
                        if (err) {
                            console.error("Get Buddies Error:", err);
                            return res.status(500).json({ message: "Could not retrieve buddies." });
                        }

                        if (!buddies || !buddies.length) {
                            return res.json({
                                success: true,
                                myStreak,
                                myWeeklyHours,
                                buddies: []
                            });
                        }

                        // Attach streak and weekly hours to each buddy
                        const populated = [];
                        let pending = buddies.length;

                        buddies.forEach(buddy => {
                            calculateUserStreak(buddy.id, function (bStreak) {
                                db.get(
                                    `SELECT COALESCE(SUM(hours), 0) as weeklyHours 
                                     FROM study_sessions 
                                     WHERE userId = ? AND studyDate >= date('now', '-7 days')`,
                                    [buddy.id],
                                    function (err, bStats) {
                                        populated.push({
                                            id: buddy.id,
                                            friendshipId: buddy.friendshipId,
                                            name: buddy.name,
                                            email: buddy.email,
                                            avatar: buddy.avatar || "pp.png",
                                            gradeLevel: buddy.gradeLevel || "-",
                                            streak: bStreak,
                                            weeklyHours: bStats ? Math.round(bStats.weeklyHours * 10) / 10 : 0
                                        });

                                        pending--;
                                        if (pending === 0) {
                                            populated.sort((a, b) => b.weeklyHours - a.weeklyHours);
                                            res.json({
                                                success: true,
                                                myStreak,
                                                myWeeklyHours,
                                                buddies: populated
                                            });
                                        }
                                    }
                                );
                            });
                        });
                    }
                );
            }
        );
    });
};

function normalizeForSearch(str) {
    if (!str) return "";
    return str
        .trim()
        .toLocaleLowerCase("tr-TR")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/ı/g, "i")
        .replace(/İ/g, "i")
        .replace(/ğ/g, "g")
        .replace(/Ğ/g, "g")
        .replace(/ü/g, "u")
        .replace(/Ü/g, "u")
        .replace(/ş/g, "s")
        .replace(/Ş/g, "s")
        .replace(/ö/g, "o")
        .replace(/Ö/g, "o")
        .replace(/ç/g, "c")
        .replace(/Ç/g, "c")
        .replace(/\s+/g, " ");
}

exports.addBuddy = function (req, res) {
    const userId = req.user.id;
    const rawInput = (req.body.emailOrName || "").trim();

    if (!rawInput) {
        return res.status(400).json({ message: "Please provide an email or username." });
    }

    const searchClean = normalizeForSearch(rawInput);

    db.all(
        `SELECT id, name, email FROM users`,
        [],
        function (err, allUsers) {
            if (err || !allUsers || !allUsers.length) {
                return res.status(404).json({ message: "Student could not be found with this email/name." });
            }

            const targetUser = allUsers.find(u => {
                if (!u) return false;
                const uEmail = (u.email || "").trim();
                const uName = (u.name || "").trim();

                const uEmailClean = normalizeForSearch(uEmail);
                const uNameClean = normalizeForSearch(uName);

                if (uEmail.toLowerCase() === rawInput.toLowerCase()) return true;
                if (uEmailClean === searchClean) return true;
                if (uNameClean === searchClean) return true;

                if (searchClean.length >= 3) {
                    if (uNameClean.includes(searchClean) || searchClean.includes(uNameClean)) return true;
                    if (uEmailClean.includes(searchClean)) return true;
                }

                return false;
            });

            if (!targetUser) {
                return res.status(404).json({ message: "Student could not be found with this email/name." });
            }

            if (targetUser.id === userId) {
                return res.status(400).json({ message: "You cannot add yourself as a buddy." });
            }

            // Check if already buddy
            db.get(
                `SELECT id FROM buddies WHERE (userId = ? AND buddyId = ?) OR (userId = ? AND buddyId = ?)`,
                [userId, targetUser.id, targetUser.id, userId],
                function (err, existing) {
                    if (existing) {
                        return res.status(400).json({ message: `${targetUser.name} is already in your buddy list.` });
                    }

                    db.run(
                        `INSERT INTO buddies (userId, buddyId, status) VALUES (?, ?, 'accepted')`,
                        [userId, targetUser.id],
                        function (err) {
                            if (err) {
                                console.error("Add Buddy Error:", err);
                                return res.status(500).json({ message: "Could not add buddy." });
                            }
                            res.json({ success: true, message: `${targetUser.name} was added to your Academi Buddies! 🎉` });
                        }
                    );
                }
            );
        }
    );
};

exports.removeBuddy = function (req, res) {
    const userId = req.user.id;
    const buddyId = req.params.buddyId;

    db.run(
        `DELETE FROM buddies WHERE (userId = ? AND buddyId = ?) OR (userId = ? AND buddyId = ?)`,
        [userId, buddyId, buddyId, userId],
        function (err) {
            if (err) {
                console.error("Remove Buddy Error:", err);
                return res.status(500).json({ message: "Could not remove buddy." });
            }
            res.json({ success: true, message: "Buddy removed." });
        }
    );
};

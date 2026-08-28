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

                // 1. Get accepted buddies
                db.all(
                    `SELECT u.id, u.name, u.email, u.avatar, u.department, u.gradeLevel, b.id as friendshipId
                     FROM buddies b
                     JOIN users u ON (u.id = CASE WHEN b.userId = ? THEN b.buddyId ELSE b.userId END)
                     WHERE (b.userId = ? OR b.buddyId = ?) AND b.status = 'accepted'`,
                    [userId, userId, userId],
                    function (err, buddies) {
                        if (err) {
                            console.error("Get Buddies Error:", err);
                            return res.status(500).json({ message: "Could not retrieve buddies." });
                        }

                        // 2. Get incoming pending requests (others invited me)
                        db.all(
                            `SELECT u.id as senderId, u.name as senderName, u.email as senderEmail, u.avatar, u.department, u.gradeLevel, b.id as invitationId, b.createdAt
                             FROM buddies b
                             JOIN users u ON u.id = b.userId
                             WHERE b.buddyId = ? AND b.status = 'pending'
                             ORDER BY b.id DESC`,
                            [userId],
                            function (err, pendingIncoming) {
                                const incoming = pendingIncoming || [];

                                // 3. Get outgoing pending requests (I invited others)
                                db.all(
                                    `SELECT u.id as recipientId, u.name as recipientName, u.email as recipientEmail, u.avatar, b.id as invitationId, b.createdAt
                                     FROM buddies b
                                     JOIN users u ON u.id = b.buddyId
                                     WHERE b.userId = ? AND b.status = 'pending'
                                     ORDER BY b.id DESC`,
                                    [userId],
                                    function (err, pendingOutgoing) {
                                        const outgoing = pendingOutgoing || [];

                                        if (!buddies || !buddies.length) {
                                            return res.json({
                                                success: true,
                                                myStreak,
                                                myWeeklyHours,
                                                buddies: [],
                                                pendingIncoming: incoming,
                                                pendingOutgoing: outgoing
                                            });
                                        }

                                        // Attach streak and weekly hours to each accepted buddy
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
                                                                buddies: populated,
                                                                pendingIncoming: incoming,
                                                                pendingOutgoing: outgoing
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
                return res.status(400).json({ message: "You cannot send an invitation to yourself." });
            }

            // Check if relationship already exists
            db.get(
                `SELECT id, userId, buddyId, status FROM buddies WHERE (userId = ? AND buddyId = ?) OR (userId = ? AND buddyId = ?)`,
                [userId, targetUser.id, targetUser.id, userId],
                function (err, existing) {
                    if (existing) {
                        if (existing.status === "accepted") {
                            return res.status(400).json({ message: `${targetUser.name} is already in your Academi Buddies.` });
                        }
                        if (existing.status === "pending") {
                            if (existing.userId === userId) {
                                return res.status(400).json({ message: `You already sent an invitation to ${targetUser.name}. Waiting for their response.` });
                            } else {
                                // Other user already invited us, accept it!
                                db.run(`UPDATE buddies SET status = 'accepted' WHERE id = ?`, [existing.id], function () {
                                    return res.json({ success: true, message: `${targetUser.name} had already invited you! You are now buddies! 🎉` });
                                });
                                return;
                            }
                        }
                    }

                    // Insert pending invitation
                    db.run(
                        `INSERT INTO buddies (userId, buddyId, status) VALUES (?, ?, 'pending')`,
                        [userId, targetUser.id],
                        function (err) {
                            if (err) {
                                console.error("Add Buddy Invitation Error:", err);
                                return res.status(500).json({ message: "Could not send buddy invitation." });
                            }
                            res.json({ success: true, message: `Buddy invitation sent to ${targetUser.name}! 📨` });
                        }
                    );
                }
            );
        }
    );
};

exports.acceptBuddy = function (req, res) {
    const userId = req.user.id;
    const invitationId = req.params.id;

    db.get(
        `SELECT b.id, u.name FROM buddies b
         JOIN users u ON u.id = b.userId
         WHERE b.id = ? AND b.buddyId = ? AND b.status = 'pending'`,
        [invitationId, userId],
        function (err, record) {
            if (err || !record) {
                return res.status(404).json({ message: "Invitation not found or already processed." });
            }

            db.run(
                `UPDATE buddies SET status = 'accepted' WHERE id = ?`,
                [invitationId],
                function (err) {
                    if (err) {
                        return res.status(500).json({ message: "Could not accept invitation." });
                    }
                    res.json({ success: true, message: `You and ${record.name} are now Academi Buddies! 🎉` });
                }
            );
        }
    );
};

exports.removeBuddy = function (req, res) {
    const userId = req.user.id;
    const idOrBuddyId = req.params.buddyId;

    db.run(
        `DELETE FROM buddies 
         WHERE (id = ? AND (userId = ? OR buddyId = ?))
            OR ((userId = ? AND buddyId = ?) OR (userId = ? AND buddyId = ?))`,
        [idOrBuddyId, userId, userId, userId, idOrBuddyId, idOrBuddyId, userId],
        function (err) {
            if (err) {
                console.error("Remove Buddy Error:", err);
                return res.status(500).json({ message: "Could not remove buddy or invitation." });
            }
            res.json({ success: true, message: "Buddy or invitation removed." });
        }
    );
};

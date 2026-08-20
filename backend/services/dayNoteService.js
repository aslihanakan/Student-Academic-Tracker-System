const { db } = require("../database/database");

function getAllDayNotes(userId, callback) {
    db.all(
        `
        SELECT id, userId, noteDate, text, createdAt
        FROM day_notes
        WHERE userId = ?
        ORDER BY noteDate ASC, id ASC
        `,
        [userId],
        callback
    );
}

function createDayNote(userId, noteDate, text, callback) {
    const trimmedDate = String(noteDate || "").trim();
    const trimmedText = String(text || "").trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
        return callback(new Error("A valid note date is required."));
    }

    if (!trimmedText) {
        return callback(new Error("Note text is required."));
    }

    const sql = `
        INSERT INTO day_notes (userId, noteDate, text)
        VALUES (?, ?, ?)
    `;

    db.run(sql, [userId, trimmedDate, trimmedText], function (err) {
        if (err) return callback(err);

        callback(null, {
            id: this.lastID,
            userId,
            noteDate: trimmedDate,
            text: trimmedText
        });
    });
}

function deleteDayNote(id, userId, callback) {
    db.run(
        "DELETE FROM day_notes WHERE id = ? AND userId = ?",
        [id, userId],
        function (err) {
            if (err) return callback(err);

            if (this.changes === 0) {
                return callback(new Error("Note not found."));
            }

            callback(null, true);
        }
    );
}

module.exports = {
    getAllDayNotes,
    createDayNote,
    deleteDayNote
};

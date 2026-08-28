const app = require("../backend/app");
const { initializeDatabase } = require("../backend/database/database");

let dbInitPromise = null;

module.exports = async function (req, res) {
    if (!dbInitPromise) {
        dbInitPromise = initializeDatabase().catch((err) => {
            console.error("Vercel DB initialization error:", err);
        });
    }

    await dbInitPromise;
    return app(req, res);
};
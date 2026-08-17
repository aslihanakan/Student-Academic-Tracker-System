const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    console.warn(
        "WARNING: JWT_SECRET is not set in the environment."
    );
}

/**
 * Protects a route by requiring:
 * Authorization: Bearer <token>
 */
function requireAuth(req, res, next) {

    const authHeader = req.headers.authorization || "";

    const [scheme, token] = authHeader.split(" ");

    // Authorization header kontrolü
    if (scheme !== "Bearer" || !token) {
        return res.status(401).json({
            message: "Authentication required. Please log in."
        });
    }

    // JWT kontrolü
    try {

        const payload = jwt.verify(
            token,
            JWT_SECRET
        );

        // Authenticated user information
        req.user = payload;

        // Eski kodlarla uyumluluk
        req.userId = payload.id;

        next();

    } catch (error) {

        return res.status(401).json({
            message: "Invalid or expired session. Please log in again."
        });

    }
}

module.exports = {
    requireAuth
};
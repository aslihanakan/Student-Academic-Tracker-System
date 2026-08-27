const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    console.warn(
        "WARNING: JWT_SECRET is not set in the environment."
    );
}


function requireAuth(req, res, next) {

    const authHeader = req.headers.authorization || "";

    const [scheme, token] = authHeader.split(" ");

    
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
 
        req.user = payload;

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
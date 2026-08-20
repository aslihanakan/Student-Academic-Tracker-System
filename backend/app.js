const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");

const authRoutes = require("./routes/authRoutes");
const courseRoutes = require("./routes/courseRoutes");
const examRoutes = require("./routes/examRoutes");
const projectRoutes = require("./routes/projectRoutes");
const studySessionRoutes = require("./routes/studySessionRoutes");
const todoRoutes = require("./routes/todoRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const dayNoteRoutes = require("./routes/dayNoteRoutes");

const { requireAuth } = require("./middleware/authMiddleware");

const app = express();


// =====================================================
// MIDDLEWARE
// =====================================================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Live Server (port 3000) gibi farklı bir origin'den (ör. bilgisayarın
// yerel ağ IP'si üzerinden mobil erişim) gelen istekler için CORS izni.
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.header("Access-Control-Allow-Credentials", "true");
    res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept, Authorization"
    );
    res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    );
    if (req.method === "OPTIONS") {
        return res.sendStatus(204);
    }
    next();
});


// =====================================================
// STATIC FRONTEND
// =====================================================

app.use(
    express.static(
        path.join(__dirname, "../frontend")
    )
);


// =====================================================
// SWAGGER DOCUMENTATION
// =====================================================

app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec)
);

app.get("/api-docs.json", function (req, res) {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
});


// =====================================================
// PUBLIC AUTH ROUTES
// =====================================================

app.use("/api/auth", authRoutes);


// =====================================================
// HEALTH CHECK
// =====================================================

app.get("/api/health", function (req, res) {

    res.status(200).json({
        status: "ok",
        message: "Student Academic Tracker API is running",
        timestamp: new Date().toISOString()
    });

});


// =====================================================
// PROTECTED API ROUTES
// =====================================================

app.use(
    "/api/courses",
    requireAuth,
    courseRoutes
);

app.use(
    "/api/exams",
    requireAuth,
    examRoutes
);

app.use(
    "/api/projects",
    requireAuth,
    projectRoutes
);

app.use(
    "/api/study-sessions",
    requireAuth,
    studySessionRoutes
);

app.use(
    "/api/todos",
    requireAuth,
    todoRoutes
);

app.use(
    "/api/dashboard",
    requireAuth,
    dashboardRoutes
);

app.use(
    "/api/day-notes",
    requireAuth,
    dayNoteRoutes
);


// =====================================================
// ROOT - FRONTEND
// =====================================================

app.get("/", function (req, res) {

    res.sendFile(
        path.join(
            __dirname,
            "../frontend",
            "index.html"
        )
    );

});


// =====================================================
// 404 HANDLER
// =====================================================

app.use(function (req, res) {

    res.status(404).json({
        message: "Route not found",
        path: req.originalUrl
    });

});


module.exports = app;
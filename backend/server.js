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

const { requireAuth } = require("./middleware/authMiddleware");
const { initializeDatabase } = require("./database/database");

const app = express();
const PORT = process.env.PORT || 5000;


// =====================================================
// DATABASE
// =====================================================

initializeDatabase();


// =====================================================
// MIDDLEWARE
// =====================================================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


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


// =====================================================
// SERVER
// =====================================================

app.listen(PORT, function () {

    console.log(
        `Server running at http://localhost:${PORT}`
    );

    console.log(
        `Swagger Docs: http://localhost:${PORT}/api-docs`
    );

    console.log(
        `Swagger JSON: http://localhost:${PORT}/api-docs.json`
    );

    console.log(
        `Health Check: http://localhost:${PORT}/api/health`
    );

});
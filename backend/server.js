const app = require("./app");
const { initializeDatabase } = require("./database/database");

const PORT = process.env.PORT || 5000;



initializeDatabase()
    .then(function () {

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

    })
    .catch(function (err) {
        console.error("Failed to initialize database:", err);
        process.exit(1);
    });
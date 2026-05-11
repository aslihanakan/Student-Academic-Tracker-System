const dashboardService = require("../services/dashboardService");

function getDashboardSummary(req, res) {
    dashboardService.getDashboardSummary(function (err, summary) {
        if (err) {
            return res.status(500).json({ message: err.message });
        }

        res.status(200).json(summary);
    });
}

module.exports = {
    getDashboardSummary
};
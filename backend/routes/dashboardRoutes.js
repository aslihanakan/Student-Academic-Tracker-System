const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");

/**
 * @swagger
 * /api/dashboard:
 *   get:
 *     summary: Panel için genel özet bilgilerini döndürür
 *     tags: [Dashboard]
 *     responses:
 *       200:
 *         description: Özet bilgiler başarıyla döndürüldü.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DashboardSummary'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get("/", dashboardController.getDashboardSummary);

module.exports = router;

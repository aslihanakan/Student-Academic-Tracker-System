const express = require("express");
const router = express.Router();
const studySessionController = require("../controllers/studySessionController");

/**
 * @swagger
 * /api/study-sessions:
 *   get:
 *     summary: Tüm çalışma seanslarını listeler
 *     tags: [Study Sessions]
 *     responses:
 *       200:
 *         description: Çalışma seansı listesi başarıyla döndürüldü.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/StudySession'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get("/", studySessionController.getAllStudySessions);

/**
 * @swagger
 * /api/study-sessions:
 *   post:
 *     summary: Yeni bir çalışma seansı kaydı oluşturur
 *     tags: [Study Sessions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/StudySessionInput'
 *     responses:
 *       201:
 *         description: Çalışma seansı başarıyla oluşturuldu.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StudySession'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 */
router.post("/", studySessionController.createStudySession);

/**
 * @swagger
 * /api/study-sessions/{id}:
 *   delete:
 *     summary: Bir çalışma seansı kaydını siler
 *     tags: [Study Sessions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Çalışma seansı ID'si
 *     responses:
 *       200:
 *         description: Çalışma seansı başarıyla silindi.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.delete("/:id", studySessionController.deleteStudySession);

/**
 * @swagger
 * /api/study-sessions/total:
 *   get:
 *     summary: Toplam çalışma saatini döndürür (dashboard için)
 *     tags: [Study Sessions]
 *     responses:
 *       200:
 *         description: Toplam çalışma saati başarıyla döndürüldü.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TotalStudyHours'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get("/total", studySessionController.getTotalStudyHours);

module.exports = router;

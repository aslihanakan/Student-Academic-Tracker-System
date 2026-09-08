const express = require("express");
const router = express.Router();
const aiController = require("../controllers/aiController");
const { requireAuth, optionalAuth } = require("../middleware/authMiddleware");

/**
 * @swagger
 * /api/ai/coach:
 *   post:
 *     summary: Öğrencinin dersleri, notları ve çalışma saatlerine göre AI akademik koç tavsiyesi üretir
 *     tags: [AI Assistant]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AiCoachRequest'
 *     responses:
 *       200:
 *         description: Akademik koç tavsiyesi başarıyla oluşturuldu.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AiCoachResponse'
 *       401:
 *         description: Oturum geçersiz veya eksik.
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post("/coach", requireAuth, aiController.getCoachAdvice);

/**
 * @swagger
 * /api/ai/chat:
 *   post:
 *     summary: Yapay zeka akademik asistanı ile etkileşimli sohbet eder
 *     tags: [AI Assistant]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AiChatRequest'
 *     responses:
 *       200:
 *         description: Yapay zeka asistanı yanıtı döndürüldü.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AiChatResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         description: Oturum geçersiz veya eksik.
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post("/chat", optionalAuth, aiController.askCoachChat);

/**
 * @swagger
 * /api/ai/parse-syllabus:
 *   post:
 *     summary: Yüklenen veya yapıştırılan ders izlencesi (syllabus) metnini ayrıştırır
 *     tags: [AI Assistant]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AiParseSyllabusRequest'
 *     responses:
 *       200:
 *         description: Syllabus başarıyla ayrıştırıldı.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AiParseSyllabusResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         description: Oturum geçersiz veya eksik.
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post("/parse-syllabus", requireAuth, aiController.parseSyllabus);

/**
 * @swagger
 * /api/ai/import-syllabus:
 *   post:
 *     summary: Ayrıştırılmış syllabus dersini, sınavlarını ve projelerini tek tıkla veritabanına aktarır
 *     tags: [AI Assistant]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AiImportSyllabusRequest'
 *     responses:
 *       200:
 *         description: Ders ve tüm etkinlikler başarıyla veritabanına aktarıldı.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Software Engineering ve tüm teslim tarihleri başarıyla aktarıldı!
 *                 courseId:
 *                   type: integer
 *                   example: 12
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         description: Oturum geçersiz veya eksik.
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post("/import-syllabus", requireAuth, aiController.importSyllabus);

module.exports = router;


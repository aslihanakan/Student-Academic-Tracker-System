const express = require("express");
const router = express.Router();
const examController = require("../controllers/examController");

/**
 * @swagger
 * /api/exams:
 *   get:
 *     summary: Tüm sınavları listeler
 *     tags: [Exams]
 *     responses:
 *       200:
 *         description: Sınav listesi başarıyla döndürüldü.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Exam'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get("/", examController.getAllExams);

/**
 * @swagger
 * /api/exams:
 *   post:
 *     summary: Yeni bir sınav kaydı oluşturur
 *     tags: [Exams]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ExamInput'
 *     responses:
 *       201:
 *         description: Sınav başarıyla oluşturuldu.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Exam'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 */
router.post("/", examController.createExam);

/**
 * @swagger
 * /api/exams/{id}:
 *   put:
 *     summary: Mevcut bir sınav kaydını günceller
 *     tags: [Exams]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Sınav ID'si
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ExamInput'
 *     responses:
 *       200:
 *         description: Sınav başarıyla güncellendi.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Exam'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 */
router.put("/:id", examController.updateExam);

/**
 * @swagger
 * /api/exams/{id}:
 *   delete:
 *     summary: Bir sınav kaydını siler
 *     tags: [Exams]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Sınav ID'si
 *     responses:
 *       200:
 *         description: Sınav başarıyla silindi.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.delete("/:id", examController.deleteExam);

module.exports = router;
const express = require("express");
const router = express.Router();
const dayNoteController = require("../controllers/dayNoteController");

/**
 * @swagger
 * /api/day-notes:
 *   get:
 *     summary: Kullanıcının tüm günlük notlarını listeler
 *     tags: [Day Notes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Günlük notlar başarıyla döndürüldü.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/DayNote'
 *       401:
 *         description: Oturum geçersiz veya eksik.
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get("/", dayNoteController.getAllDayNotes);

/**
 * @swagger
 * /api/day-notes:
 *   post:
 *     summary: Belirli bir tarih için yeni bir günlük not oluşturur veya günceller
 *     tags: [Day Notes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DayNoteInput'
 *     responses:
 *       201:
 *         description: Günlük not başarıyla kaydedildi.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DayNote'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         description: Oturum geçersiz veya eksik.
 */
router.post("/", dayNoteController.createDayNote);

/**
 * @swagger
 * /api/day-notes/{id}:
 *   delete:
 *     summary: Bir günlük notu siler
 *     tags: [Day Notes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Günlük not ID'si
 *     responses:
 *       200:
 *         description: Günlük not başarıyla silindi.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *       401:
 *         description: Oturum geçersiz veya eksik.
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.delete("/:id", dayNoteController.deleteDayNote);

module.exports = router;

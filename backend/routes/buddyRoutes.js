const express = require("express");
const router = express.Router();
const buddyController = require("../controllers/buddyController");
const { requireAuth } = require("../middleware/authMiddleware");

/**
 * @swagger
 * /api/buddies:
 *   get:
 *     summary: Kullanıcının onaylanmış çalışma arkadaşlarını, davetlerini ve çalışma serisini (streak) getirir
 *     tags: [Study Buddies]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Çalışma arkadaşları listesi ve davetler başarıyla döndürüldü.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BuddiesResponse'
 *       401:
 *         description: Oturum geçersiz veya eksik.
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get("/", requireAuth, buddyController.getBuddies);

/**
 * @swagger
 * /api/buddies:
 *   post:
 *     summary: E-posta adresi veya kullanıcı adına göre yeni bir çalışma arkadaşlığı daveti gönderir
 *     tags: [Study Buddies]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BuddyInviteInput'
 *     responses:
 *       200:
 *         description: Davet başarıyla gönderildi veya otomatik eşleşti.
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
 *                   example: Buddy invitation sent to Burak Demir! 📨
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         description: Oturum geçersiz veya eksik.
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post("/", requireAuth, buddyController.addBuddy);

/**
 * @swagger
 * /api/buddies/{id}/accept:
 *   patch:
 *     summary: Gelen bir çalışma arkadaşlığı davetini kabul eder
 *     tags: [Study Buddies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Davet ID'si (invitationId)
 *     responses:
 *       200:
 *         description: Davet başarıyla kabul edildi.
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
 *                   example: You and Burak Demir are now Academi Buddies! 🎉
 *       401:
 *         description: Oturum geçersiz veya eksik.
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.patch("/:id/accept", requireAuth, buddyController.acceptBuddy);

/**
 * @swagger
 * /api/buddies/{buddyId}:
 *   delete:
 *     summary: Bir çalışma arkadaşını listeden çıkarır veya daveti iptal eder / reddeder
 *     tags: [Study Buddies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: buddyId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Arkadaşın kullanıcı ID'si veya davet ID'si
 *     responses:
 *       200:
 *         description: Arkadaşlık veya davet başarıyla kaldırıldı.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *       401:
 *         description: Oturum geçersiz veya eksik.
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.delete("/:buddyId", requireAuth, buddyController.removeBuddy);

module.exports = router;

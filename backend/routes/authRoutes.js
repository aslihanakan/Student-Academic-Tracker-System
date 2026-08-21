const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { requireAuth } = require("../middleware/authMiddleware");

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Yeni bir kullanıcı hesabı oluşturur
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterInput'
 *     responses:
 *       201:
 *         description: Hesap oluşturuldu, oturum token'ı döndürüldü.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 */
router.post("/register", authController.register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: E-posta ve şifre ile giriş yapar
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginInput'
 *     responses:
 *       200:
 *         description: Giriş başarılı, oturum token'ı döndürüldü.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: E-posta veya şifre hatalı.
 */
router.post("/login", authController.login);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Giriş yapmış kullanıcının bilgilerini döndürür
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Kullanıcı bilgisi.
 *       401:
 *         description: Oturum geçersiz veya eksik.
 */
router.get("/me", requireAuth, authController.getCurrentUser);

/**
 * @swagger
 * /api/auth/profile:
 *   put:
 *     summary: Kullanıcının profil bilgilerini ve avatarını günceller
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateProfileInput'
 *     responses:
 *       200:
 *         description: Profil başarıyla güncellendi.
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         description: Oturum geçersiz veya eksik.
 */
router.put("/profile", requireAuth, authController.updateProfile);

/**
 * @swagger
 * /api/auth/avatars:
 *   get:
 *     summary: Kullanılabilir profil avatar görsellerinin listesini döndürür
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Avatar dosya adları listesi.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: string
 */
router.get("/avatars", authController.getAvatars);

/**
 * @swagger
 * /api/auth/account:
 *   delete:
 *     summary: Kullanıcının hesabını ve tüm verilerini kalıcı olarak siler
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Hesap başarıyla silindi.
 *       401:
 *         description: Oturum geçersiz veya eksik.
 */
router.delete("/account", requireAuth, authController.deleteAccount);
router.delete("/me", requireAuth, authController.deleteAccount);

module.exports = router;

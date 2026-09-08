const express = require("express");
const router = express.Router();
const groupProjectController = require("../controllers/groupProjectController");
const { requireAuth } = require("../middleware/authMiddleware");

/**
 * @swagger
 * /api/group-projects:
 *   get:
 *     summary: Kullanıcının dahil olduğu tüm grup projelerini ve üye listelerini listeler
 *     tags: [Group Projects]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Grup projeleri başarıyla döndürüldü.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 projects:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/GroupProject'
 *       401:
 *         description: Oturum geçersiz veya eksik.
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get("/", requireAuth, groupProjectController.getGroupProjects);

/**
 * @swagger
 * /api/group-projects:
 *   post:
 *     summary: Yeni bir grup projesi oluşturur ve kullanıcıyı proje sahibi yapar
 *     tags: [Group Projects]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GroupProjectInput'
 *     responses:
 *       201:
 *         description: Grup projesi başarıyla oluşturuldu.
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
 *                   example: Group project "Yapay Zeka Dönem Projesi" created!
 *                 projectId:
 *                   type: integer
 *                   example: 4
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         description: Oturum geçersiz veya eksik.
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post("/", requireAuth, groupProjectController.createGroupProject);

/**
 * @swagger
 * /api/group-projects/{id}/members:
 *   post:
 *     summary: Grup projesine e-posta veya kullanıcı adı ile yeni bir üye ekler
 *     tags: [Group Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Grup projesi ID'si
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GroupMemberInput'
 *     responses:
 *       200:
 *         description: Üye projeye eklendi.
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
 *                   example: Burak Demir was added to the project!
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         description: Oturum geçersiz veya eksik.
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post("/:id/members", requireAuth, groupProjectController.addMember);

/**
 * @swagger
 * /api/group-projects/{id}:
 *   delete:
 *     summary: Bir grup projesini ve bağlı tüm görevleri siler (yalnızca proje sahibi silebilir)
 *     tags: [Group Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Grup projesi ID'si
 *     responses:
 *       200:
 *         description: Proje başarıyla silindi.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *       401:
 *         description: Oturum geçersiz veya eksik.
 *       403:
 *         description: Yalnızca proje sahibi projeyi silebilir.
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.delete("/:id", requireAuth, groupProjectController.deleteGroupProject);

/**
 * @swagger
 * /api/group-projects/{id}/tasks:
 *   get:
 *     summary: Belirtilen grup projesinin tüm alt görevlerini listeler
 *     tags: [Group Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Grup projesi ID'si
 *     responses:
 *       200:
 *         description: Görev listesi başarıyla döndürüldü.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 tasks:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/GroupTask'
 *       401:
 *         description: Oturum geçersiz veya eksik.
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get("/:id/tasks", requireAuth, groupProjectController.getTasks);

/**
 * @swagger
 * /api/group-projects/{id}/tasks:
 *   post:
 *     summary: Grup projesine yeni bir ortak görev ekler
 *     tags: [Group Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Grup projesi ID'si
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GroupTaskInput'
 *     responses:
 *       201:
 *         description: Görev başarıyla eklendi.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 taskId:
 *                   type: integer
 *                   example: 18
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         description: Oturum geçersiz veya eksik.
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post("/:id/tasks", requireAuth, groupProjectController.addTask);

/**
 * @swagger
 * /api/group-projects/{id}/tasks/{taskId}:
 *   patch:
 *     summary: Grup projesindeki bir görevin tamamlandı/tamamlanmadı durumunu günceller
 *     tags: [Group Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Grup projesi ID'si
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Görev ID'si
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GroupTaskToggleInput'
 *     responses:
 *       200:
 *         description: Görev durumu güncellendi.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 isDone:
 *                   type: integer
 *                   example: 1
 *       401:
 *         description: Oturum geçersiz veya eksik.
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.patch("/:id/tasks/:taskId", requireAuth, groupProjectController.toggleTaskDone);

/**
 * @swagger
 * /api/group-projects/{id}/tasks/{taskId}:
 *   delete:
 *     summary: Grup projesindeki bir görevi siler
 *     tags: [Group Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Grup projesi ID'si
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Görev ID'si
 *     responses:
 *       200:
 *         description: Görev başarıyla silindi.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *       401:
 *         description: Oturum geçersiz veya eksik.
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.delete("/:id/tasks/:taskId", requireAuth, groupProjectController.deleteTask);

module.exports = router;

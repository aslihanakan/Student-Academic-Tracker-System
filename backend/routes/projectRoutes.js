const express = require("express");
const router = express.Router();
const projectController = require("../controllers/projectController");

/**
 * @swagger
 * /api/projects:
 *   get:
 *     summary: Tüm projeleri listeler
 *     tags: [Projects]
 *     responses:
 *       200:
 *         description: Proje listesi başarıyla döndürüldü.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Project'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get("/", projectController.getAllProjects);

/**
 * @swagger
 * /api/projects:
 *   post:
 *     summary: Yeni bir proje kaydı oluşturur
 *     tags: [Projects]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProjectInput'
 *     responses:
 *       201:
 *         description: Proje başarıyla oluşturuldu.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Project'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 */
router.post("/", projectController.createProject);

/**
 * @swagger
 * /api/projects/{id}:
 *   put:
 *     summary: Mevcut bir proje kaydını günceller
 *     tags: [Projects]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Proje ID'si
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProjectInput'
 *     responses:
 *       200:
 *         description: Proje başarıyla güncellendi.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Project'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 */
router.put("/:id", projectController.updateProject);

/**
 * @swagger
 * /api/projects/{id}/status:
 *   patch:
 *     summary: Bir projenin durumunu (pending/in progress/completed) günceller
 *     tags: [Projects]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Proje ID'si
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Durum başarıyla güncellendi.
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.patch("/:id/status", projectController.updateProjectStatus);

/**
 * @swagger
 * /api/projects/{id}:
 *   delete:
 *     summary: Bir proje kaydını siler
 *     tags: [Projects]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Proje ID'si
 *     responses:
 *       200:
 *         description: Proje başarıyla silindi.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.delete("/:id", projectController.deleteProject);

module.exports = router;
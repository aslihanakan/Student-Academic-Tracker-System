const express = require("express");
const router = express.Router();
const courseController = require("../controllers/courseController");

/**
 * @swagger
 * /api/courses:
 *   get:
 *     summary: Tüm dersleri listeler
 *     tags: [Courses]
 *     responses:
 *       200:
 *         description: Ders listesi başarıyla döndürüldü.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Course'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get("/", courseController.getAllCourses);

/**
 * @swagger
 * /api/courses/search:
 *   get:
 *     summary: Ders adına göre anahtar kelime ile ders arar
 *     tags: [Courses]
 *     parameters:
 *       - in: query
 *         name: keyword
 *         schema:
 *           type: string
 *         description: Aranacak anahtar kelime
 *         example: Web
 *     responses:
 *       200:
 *         description: Arama sonucuna uyan dersler.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Course'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get("/search", courseController.searchCourses);

/**
 * @swagger
 * /api/courses/{id}:
 *   get:
 *     summary: ID'ye göre tek bir ders getirir
 *     tags: [Courses]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Ders ID'si
 *     responses:
 *       200:
 *         description: Ders bulundu.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Course'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get("/:id", courseController.getCourseById);

/**
 * @swagger
 * /api/courses:
 *   post:
 *     summary: Yeni bir ders oluşturur
 *     tags: [Courses]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CourseInput'
 *     responses:
 *       201:
 *         description: Ders başarıyla oluşturuldu.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Course'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 */
router.post("/", courseController.createCourse);

/**
 * @swagger
 * /api/courses/{id}:
 *   put:
 *     summary: Mevcut bir dersi günceller
 *     tags: [Courses]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Ders ID'si
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CourseInput'
 *     responses:
 *       200:
 *         description: Ders başarıyla güncellendi.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Course'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 */
router.put("/:id", courseController.updateCourse);

/**
 * @swagger
 * /api/courses/{id}:
 *   delete:
 *     summary: Bir dersi siler
 *     tags: [Courses]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Ders ID'si
 *     responses:
 *       200:
 *         description: Ders başarıyla silindi.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.delete("/:id", courseController.deleteCourse);

module.exports = router;

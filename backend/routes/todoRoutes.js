const express = require("express");
const router = express.Router();
const todoController = require("../controllers/todoController");

/**
 * @swagger
 * /api/todos:
 *   get:
 *     summary: Tüm yapılacaklar listesini getirir
 *     tags: [Todos]
 *     responses:
 *       200:
 *         description: Yapılacaklar listesi başarıyla döndürüldü.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Todo'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get("/", todoController.getAllTodos);

/**
 * @swagger
 * /api/todos:
 *   post:
 *     summary: Yeni bir yapılacak kaydı oluşturur
 *     tags: [Todos]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TodoInput'
 *     responses:
 *       201:
 *         description: Yapılacak kaydı başarıyla oluşturuldu.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Todo'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 */
router.post("/", todoController.createTodo);

/**
 * @swagger
 * /api/todos/{id}:
 *   put:
 *     summary: Bir yapılacak kaydının durumunu (tamamlandı/bekliyor) günceller
 *     tags: [Todos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Yapılacak kaydı ID'si
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TodoStatusInput'
 *     responses:
 *       200:
 *         description: Durum başarıyla güncellendi.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Todo'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.put("/:id", todoController.updateTodoStatus);

/**
 * @swagger
 * /api/todos/{id}:
 *   delete:
 *     summary: Bir yapılacak kaydını siler
 *     tags: [Todos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Yapılacak kaydı ID'si
 *     responses:
 *       200:
 *         description: Yapılacak kaydı başarıyla silindi.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.delete("/:id", todoController.deleteTodo);

/**
 * @swagger
 * /api/todos/nearest:
 *   get:
 *     summary: Son tarihi en yakın olan yapılacak kaydını döndürür (dashboard için)
 *     tags: [Todos]
 *     responses:
 *       200:
 *         description: En yakın yapılacak kaydı başarıyla döndürüldü.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Todo'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get("/nearest", todoController.getNearestTodo);

module.exports = router;

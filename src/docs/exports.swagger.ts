/**
 * @swagger
 * tags:
 *   name: Export
 *   description: Xuất file
 */

/**
 * @swagger
 * /documents/export-excel:
 *   get:
 *     summary: Xuất Excel danh sách document
 *     tags: [Export]
 *     security:
 *       - bearerAuth: []
 */

/**
 * @swagger
 * /documents/{id}/export-pdf:
 *   get:
 *     summary: Xuất PDF document theo form
 *     tags: [Export]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: File PDF
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 */

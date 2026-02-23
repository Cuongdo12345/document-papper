/**
 * @swagger
 * tags:
 *   name: Documents
 *   description: Quản lý giấy tờ bệnh viện
 */

/**
 * @swagger
 * /documents:
 *   get:
 *     summary: Danh sách document (lọc + phân trang)
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: number }
 *       - in: query
 *         name: limit
 *         schema: { type: number }
 *       - in: query
 *         name: department
 *         schema: { type: string }
 *       - in: query
 *         name: subType
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: fromDate
 *         schema: { type: string }
 *       - in: query
 *         name: toDate
 *         schema: { type: string }
 */

/**
 * @swagger
 * /documents:
 *   post:
 *     summary: Tạo document generic
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 */

/**
 * @swagger
 * /documents/{id}:
 *   get:
 *     summary: Chi tiết document
 *     tags: [Documents]
 */

/**
 * @swagger
 * /documents/{id}:
 *   patch:
 *     summary: Cập nhật document
 *     tags: [Documents]
 */

/**
 * @swagger
 * /documents/{id}:
 *   delete:
 *     summary: Xoá mềm document
 *     tags: [Documents]
 */

/**
 * @swagger
 * /documents/{id}/restore:
 *   patch:
 *     summary: Khôi phục document
 *     tags: [Documents]
 */

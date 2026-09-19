// routes/inventory/inventory.routes.ts
//
// Roadmap B3 (Quản lý vật tư tiêu hao, 2026-09-15). Mounted tại
// `/api/inventory` (app.ts) — module hoàn toàn mới, không có tiền tố nào
// khác cần mount trước (không giống `/api/assets/*`).
import { Router } from "express";
import {
  createConsumableItem,
  getAllConsumableItems,
  getConsumableItemById,
  updateConsumableItem,
  bulkDeleteConsumableItems,
  bulkRestoreConsumableItems,
  createConsumableTransaction,
  getConsumableTransactions,
  runConsumableAlerts,
} from "../../controllers/inventory/consumableItem.controller";
import {
  createConsumableCategory,
  getAllConsumableCategories,
  getConsumableCategoryById,
  updateConsumableCategory,
  deleteConsumableCategory,
  bulkDeleteConsumableCategories,
  restoreConsumableCategory,
  bulkRestoreConsumableCategories,
} from "../../controllers/inventory/consumableCategory.controller";
import {
  createConsumableRequest,
  getAllConsumableRequests,
  getConsumableRequestById,
  updateConsumableRequest,
  fulfillConsumableRequest,
  cancelConsumableRequest,
} from "../../controllers/inventory/consumableRequest.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorizePermission } from "../../middlewares/authorizePermission.middleware";
import { validateBody, validateParams, validateQuery } from "../../middlewares/validate.middleware";
import { IdParamDTO, BulkIdsDTO } from "../../dto/common.dto";
import {
  CreateConsumableItemDTO,
  UpdateConsumableItemDTO,
  CreateConsumableTransactionDTO,
  QueryConsumableItemsDTO,
  QueryConsumableTransactionsDTO,
  CreateConsumableCategoryDTO,
  UpdateConsumableCategoryDTO,
  QueryConsumableCategoryDTO,
  CreateConsumableRequestDTO,
  UpdateConsumableRequestDTO,
  QueryConsumableRequestsDTO,
} from "../../dto/inventory/consumable.dto";

const router = Router();

router.post(
  "/alerts/run",
  authenticate,
  authorizePermission("CONSUMABLE_ALERTS_TRIGGER"),
  runConsumableAlerts,
);

router.post(
  "/items",
  authenticate,
  authorizePermission("CONSUMABLE_CREATE"),
  validateBody(CreateConsumableItemDTO),
  createConsumableItem,
);

router.get(
  "/items",
  authenticate,
  authorizePermission("CONSUMABLE_VIEW"),
  validateQuery(QueryConsumableItemsDTO),
  getAllConsumableItems,
);

/** [MỚI 2026-09-16, DEV-060] PHẢI đăng ký TRƯỚC "GET /items/:id" — static path. */
router.post(
  "/items/bulk-delete",
  authenticate,
  authorizePermission("CONSUMABLE_UPDATE"),
  validateBody(BulkIdsDTO),
  bulkDeleteConsumableItems,
);

/** [MỚI 2026-09-17, DEV-062] PHẢI đăng ký TRƯỚC "GET /items/:id" — static path. */
router.post(
  "/items/bulk-restore",
  authenticate,
  authorizePermission("CONSUMABLE_UPDATE"),
  validateBody(BulkIdsDTO),
  bulkRestoreConsumableItems,
);

router.get(
  "/items/:id",
  authenticate,
  authorizePermission("CONSUMABLE_VIEW"),
  validateParams(IdParamDTO),
  getConsumableItemById,
);

router.put(
  "/items/:id",
  authenticate,
  authorizePermission("CONSUMABLE_UPDATE"),
  validateParams(IdParamDTO),
  validateBody(UpdateConsumableItemDTO),
  updateConsumableItem,
);

router.post(
  "/items/:id/transactions",
  authenticate,
  authorizePermission("CONSUMABLE_TRANSACTION_CREATE"),
  validateParams(IdParamDTO),
  validateBody(CreateConsumableTransactionDTO),
  createConsumableTransaction,
);

router.get(
  "/items/:id/transactions",
  authenticate,
  authorizePermission("CONSUMABLE_VIEW"),
  validateParams(IdParamDTO),
  validateQuery(QueryConsumableTransactionsDTO),
  getConsumableTransactions,
);

/* =====================================================================
   NHÓM VẬT TƯ (ConsumableCategory, 2026-09-16) — mirror `/assets/asset-categories`.
===================================================================== */

router.post(
  "/categories",
  authenticate,
  authorizePermission("CONSUMABLE_CATEGORY_CREATE"),
  validateBody(CreateConsumableCategoryDTO),
  createConsumableCategory,
);

router.get(
  "/categories",
  authenticate,
  authorizePermission("CONSUMABLE_CATEGORY_VIEW"),
  validateQuery(QueryConsumableCategoryDTO),
  getAllConsumableCategories,
);

/** [MỚI 2026-09-16, DEV-060] PHẢI đăng ký TRƯỚC "GET /categories/:id" — static path. */
router.post(
  "/categories/bulk-delete",
  authenticate,
  authorizePermission("CONSUMABLE_CATEGORY_DELETE"),
  validateBody(BulkIdsDTO),
  bulkDeleteConsumableCategories,
);

/** [MỚI 2026-09-17, DEV-062] PHẢI đăng ký TRƯỚC "GET /categories/:id" — static path. */
router.post(
  "/categories/bulk-restore",
  authenticate,
  authorizePermission("CONSUMABLE_CATEGORY_UPDATE"),
  validateBody(BulkIdsDTO),
  bulkRestoreConsumableCategories,
);

router.get(
  "/categories/:id",
  authenticate,
  authorizePermission("CONSUMABLE_CATEGORY_VIEW"),
  validateParams(IdParamDTO),
  getConsumableCategoryById,
);

router.put(
  "/categories/:id",
  authenticate,
  authorizePermission("CONSUMABLE_CATEGORY_UPDATE"),
  validateParams(IdParamDTO),
  validateBody(UpdateConsumableCategoryDTO),
  updateConsumableCategory,
);

router.delete(
  "/categories/:id",
  authenticate,
  authorizePermission("CONSUMABLE_CATEGORY_DELETE"),
  validateParams(IdParamDTO),
  deleteConsumableCategory,
);

router.patch(
  "/categories/:id/restore",
  authenticate,
  authorizePermission("CONSUMABLE_CATEGORY_UPDATE"),
  validateParams(IdParamDTO),
  restoreConsumableCategory,
);

/* =====================================================================
   ĐỀ XUẤT/DỰ TRÙ VẬT TƯ (ConsumableRequest, Roadmap B8, DEV-067, 2026-09-18)
===================================================================== */

router.post(
  "/requests",
  authenticate,
  authorizePermission("CONSUMABLE_REQUEST_CREATE"),
  validateBody(CreateConsumableRequestDTO),
  createConsumableRequest,
);

router.get(
  "/requests",
  authenticate,
  authorizePermission("CONSUMABLE_REQUEST_VIEW"),
  validateQuery(QueryConsumableRequestsDTO),
  getAllConsumableRequests,
);

router.get(
  "/requests/:id",
  authenticate,
  authorizePermission("CONSUMABLE_REQUEST_VIEW"),
  validateParams(IdParamDTO),
  getConsumableRequestById,
);

router.put(
  "/requests/:id",
  authenticate,
  authorizePermission("CONSUMABLE_REQUEST_UPDATE"),
  validateParams(IdParamDTO),
  validateBody(UpdateConsumableRequestDTO),
  updateConsumableRequest,
);

router.patch(
  "/requests/:id/fulfill",
  authenticate,
  authorizePermission("CONSUMABLE_REQUEST_FULFILL"),
  validateParams(IdParamDTO),
  fulfillConsumableRequest,
);

router.patch(
  "/requests/:id/cancel",
  authenticate,
  authorizePermission("CONSUMABLE_REQUEST_UPDATE"),
  validateParams(IdParamDTO),
  cancelConsumableRequest,
);

export default router;

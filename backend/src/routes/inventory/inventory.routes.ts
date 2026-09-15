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
  createConsumableTransaction,
  getConsumableTransactions,
  runConsumableAlerts,
} from "../../controllers/inventory/consumableItem.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorizePermission } from "../../middlewares/authorizePermission.middleware";
import { validateBody, validateParams, validateQuery } from "../../middlewares/validate.middleware";
import { IdParamDTO } from "../../dto/common.dto";
import {
  CreateConsumableItemDTO,
  UpdateConsumableItemDTO,
  CreateConsumableTransactionDTO,
  QueryConsumableItemsDTO,
  QueryConsumableTransactionsDTO,
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

export default router;

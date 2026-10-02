// routes/vendors/contract.routes.ts
//
// Roadmap B4 (2026-09-16). Mounted tại `/api/contracts` (app.ts).
import { Router } from "express";
import {
  createContract,
  getAllContracts,
  getContractsForAsset,
  getContractById,
  updateContract,
  cancelContract,
  restoreContract,
  bulkCancelContracts,
  bulkRestoreContracts,
  runContractAlerts,
} from "../../controllers/vendors/contract.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorizePermission } from "../../middlewares/authorizePermission.middleware";
import { validateBody, validateParams, validateQuery } from "../../middlewares/validate.middleware";
import { IdParamDTO, makeIdParamDTO, BulkIdsDTO } from "../../dto/common.dto";
import {
  CreateContractDTO,
  UpdateContractDTO,
  CancelContractDTO,
  QueryContractsDTO,
  BulkCancelContractsDTO,
} from "../../dto/vendors/contract.dto";

const router = Router();
const assetIdParam = makeIdParamDTO("assetId", "Asset ID không hợp lệ");

router.post(
  "/",
  authenticate,
  authorizePermission("CONTRACT_CREATE"),
  validateBody(CreateContractDTO),
  createContract,
);

router.get(
  "/",
  authenticate,
  authorizePermission("CONTRACT_VIEW"),
  validateQuery(QueryContractsDTO),
  getAllContracts,
);

// PHẢI khai TRƯỚC "/:id" bên dưới — cùng lý do "/asset/:assetId" ở
// `assetMaintenancePlan.routes.ts`: tránh nhầm "asset" là giá trị :id.
router.get(
  "/asset/:assetId",
  authenticate,
  authorizePermission("CONTRACT_VIEW"),
  validateParams(assetIdParam),
  getContractsForAsset,
);

// [DEV-087] Huỷ hàng loạt — cùng permission CONTRACT_UPDATE với huỷ từng dòng
// (`PATCH /:id/cancel`). Static path, khai TRƯỚC các route "/:id".
router.post(
  "/bulk-cancel",
  authenticate,
  authorizePermission("CONTRACT_UPDATE"),
  validateBody(BulkCancelContractsDTO),
  bulkCancelContracts,
);

// [DEV-087] Khôi phục hàng loạt — cùng permission RIÊNG CONTRACT_RESTORE với khôi phục từng dòng.
router.post(
  "/bulk-restore",
  authenticate,
  authorizePermission("CONTRACT_RESTORE"),
  validateBody(BulkIdsDTO),
  bulkRestoreContracts,
);

router.post(
  "/alerts/run",
  authenticate,
  authorizePermission("CONTRACT_ALERTS_TRIGGER"),
  runContractAlerts,
);

router.get(
  "/:id",
  authenticate,
  authorizePermission("CONTRACT_VIEW"),
  validateParams(IdParamDTO),
  getContractById,
);

router.put(
  "/:id",
  authenticate,
  authorizePermission("CONTRACT_UPDATE"),
  validateParams(IdParamDTO),
  validateBody(UpdateContractDTO),
  updateContract,
);

router.patch(
  "/:id/cancel",
  authenticate,
  authorizePermission("CONTRACT_UPDATE"),
  validateParams(IdParamDTO),
  validateBody(CancelContractDTO),
  cancelContract,
);

// [MỚI 2026-09-16, DEV-058] Khôi phục hợp đồng đã huỷ — permission RIÊNG
// (CONTRACT_RESTORE), KHÔNG gộp vào CONTRACT_UPDATE như "cancel" — user chọn
// tách quyền để kiểm soát chặt hơn ai được khôi phục.
router.patch(
  "/:id/restore",
  authenticate,
  authorizePermission("CONTRACT_RESTORE"),
  validateParams(IdParamDTO),
  restoreContract,
);

export default router;

import { Router } from "express";
import {
  createAsset,
  getAllAssets,
  getAssetById,
  updateAsset,
  deleteAsset,
  restoreAsset,
  hardDeleteAsset,
  runAssetAlerts,
  downloadAssetImportTemplate,
  importAssets,
  getAssetQRCode,
  lookupAssetByCode,
  checkInAsset,
} from "../../controllers/assets/asset.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { uploadExcel } from "../../middlewares/upload.middleware";
import { authorizePermission } from "../../middlewares/authorizePermission.middleware";
import {
  validateBody,
  validateQuery,
  validateParams,
} from "../../middlewares/validate.middleware";
import { IdParamDTO } from "../../dto/common.dto";
import {
  CreateAssetDTO,
  UpdateAssetDTO,
  QueryAssetDTO,
  AssignAssetDTO,
  TransferAssetDTO,
  ReturnAssetDTO,
  QueryAssetAssignmentHistoryDTO,
} from "../../dto/assets/assets.dto";

import {
  assignAsset,
  transferAsset,
  returnAsset,
  getAssetAssignmentHistory,
} from "../../controllers/assets/assetAssignment.controller";

const router = Router();

router.post(
  "/",
  authenticate,
  authorizePermission("ASSET_CREATE"),
  validateBody(CreateAssetDTO),
  createAsset,
);

router.get(
  "/",
  authenticate,
  authorizePermission("ASSET_VIEW"),
  // validateQuery(QueryAssetDTO),
  getAllAssets,
);

router.get(
  "/:id",
  authenticate,
  authorizePermission("ASSET_VIEW_DETAIL"),
  validateParams(IdParamDTO),
  getAssetById,
);

router.put(
  "/:id",
  authenticate,
  authorizePermission("ASSET_UPDATE"),
  validateParams(IdParamDTO),
  validateBody(UpdateAssetDTO),
  updateAsset,
);

router.delete(
  "/:id",
  authenticate,
  authorizePermission("ASSET_DELETE"),
  validateParams(IdParamDTO),
  deleteAsset,
);

/**
 * Xoá vĩnh viễn — permission RIÊNG, rủi ro cao, chỉ dùng được sau khi tài
 * sản đã bị xoá mềm (soft delete) qua route DELETE /:id ở trên.
 */
router.delete(
  "/:id/permanent",
  authenticate,
  authorizePermission("ASSET_DELETE_PERMANENT"),
  validateParams(IdParamDTO),
  hardDeleteAsset,
);

/**
 * Khôi phục tài sản đã xoá mềm — cùng permission với ASSET_UPDATE vì bản
 * chất là "sửa lại" trạng thái isActive.
 */
router.patch(
  "/:id/restore",
  authenticate,
  authorizePermission("ASSET_UPDATE"),
  validateParams(IdParamDTO),
  restoreAsset,
);

/* =====================================================================
   GIAI ĐOẠN 2 — Cấp phát / Luân chuyển / Thu hồi (AssetAssignmentHistory)
===================================================================== */

router.post(
  "/:id/assign",
  authenticate,
  authorizePermission("ASSET_ASSIGN"),
  validateParams(IdParamDTO),
  validateBody(AssignAssetDTO),
  assignAsset,
);

router.post(
  "/:id/transfer",
  authenticate,
  authorizePermission("ASSET_ASSIGN"),
  validateParams(IdParamDTO),
  validateBody(TransferAssetDTO),
  transferAsset,
);

router.post(
  "/:id/return",
  authenticate,
  authorizePermission("ASSET_ASSIGN"),
  validateParams(IdParamDTO),
  validateBody(ReturnAssetDTO),
  returnAsset,
);

router.get(
  "/:id/assignment-history",
  authenticate,
  authorizePermission("ASSET_VIEW_DETAIL"),
  validateParams(IdParamDTO),
  // validateQuery(QueryAssetAssignmentHistoryDTO),
  getAssetAssignmentHistory,
);

// * =====================================================================
//    GIAI ĐOẠN 4 — Cảnh báo bảo hành/bảo trì (chạy tay, ngoài lịch cron)
 
//    Đặt route "/alerts/run" TRƯỚC hay sau các route "/:id..." đều không
//    xung đột (khác số lượng segment path), nhưng đặt ở cuối cùng nhóm với
//    nhau cho dễ đọc — theo đúng thứ tự các Giai đoạn đã build.
// ===================================================================== */
 
router.post(
  "/alerts/run",
  authenticate,
  authorizePermission("ASSET_ALERTS_TRIGGER"),
  runAssetAlerts,
);

/* =====================================================================
   GIAI ĐOẠN 5 — Import/export Excel hàng loạt

   ("/export" đã dời lên đầu file, ngay trước "GET /:id" — xem ghi chú ở đó.)
===================================================================== */

router.get(
  "/import/template",
  authenticate,
  authorizePermission("ASSET_EXCEL_IMPORT"),
  downloadAssetImportTemplate,
);

router.post(
  "/import",
  authenticate,
  authorizePermission("ASSET_EXCEL_IMPORT"),
  uploadExcel.single("file"),
  importAssets,
);

/* =====================================================================
   GIAI ĐOẠN 5 — QR code kiểm kê

   "/lookup/:assetCode" đặt TRƯỚC "/:id" cho dễ đọc (không bắt buộc về mặt
   kỹ thuật — khác số lượng segment nên Express không nhầm lẫn dù đặt ở
   đâu, nhưng gom nhóm theo Giai đoạn cho rõ ràng).
===================================================================== */

router.get(
  "/lookup/:assetCode",
  authenticate,
  authorizePermission("ASSET_INVENTORY_CHECK"),
  lookupAssetByCode,
);

router.get(
  "/:id/qrcode",
  authenticate,
  authorizePermission("ASSET_VIEW_DETAIL"),
  validateParams(IdParamDTO),
  getAssetQRCode,
);

router.post(
  "/:id/check-in",
  authenticate,
  authorizePermission("ASSET_INVENTORY_CHECK"),
  validateParams(IdParamDTO),
  checkInAsset,
);


export default router;

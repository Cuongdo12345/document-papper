// routes/assets/assetModule.routes.ts
//
// DEV-115 (tách module Tài sản, Giai đoạn 4 — docs/development/ASSET_MODULE_SPLIT_PLAN.md mục 4.3).
//
// Router factory: một định nghĩa route, dùng cho 2 module
//   - `/api/it-assets`      (IT_ASSET_*, IT_ASSET_CATEGORY_*)
//   - `/api/medical-assets` (MEDICAL_ASSET_*, MEDICAL_ASSET_CATEGORY_* + MEDICAL_DEVICE_*, OPERATOR_CERTIFICATE_*)
// Route cũ `/api/assets*` đã gỡ ở Giai đoạn 8 (DEV-120);
// loại tài sản truyền qua `res.locals` (`setAssetScope`), `requireAssetInScope` & đồng bọn trả 404 khi id thuộc loại khác.
//
// QUY TẮC KHI THÊM ROUTE: mọi route có tham số id PHẢI có một `require*InScope` (test e2e
// `asset-module-routes.e2e-test.ts` duyệt toàn bộ route để chặn sót); static path đăng ký TRƯỚC "/:id".

import { Router } from "express";
import {
  createAsset,
  getAllAssets,
  getAssetById,
  updateAsset,
  deleteAsset,
  bulkDeleteAssets,
  restoreAsset,
  bulkRestoreAssets,
  hardDeleteAsset,
  runAssetAlerts,
  downloadAssetImportTemplate,
  importAssets,
  getAssetQRCode,
  lookupAssetByCode,
  checkInAsset,
  exportAssets,
  getAssetDocuments,
} from "../../controllers/assets/asset.controller";
import {
  assignAsset,
  transferAsset,
  returnAsset,
  getAssetAssignmentHistory,
} from "../../controllers/assets/assetAssignment.controller";
import {
  createAssetCategory,
  getAllAssetCategories,
  getAssetCategoryById,
  updateAssetCategory,
  deleteAssetCategory,
  bulkDeleteAssetCategories,
  hardDeleteAssetCategory,
  restoreAssetCategory,
  bulkRestoreAssetCategories,
} from "../../controllers/assets/assetCategory.controller";
import {
  createMaintenancePlan,
  getMaintenancePlansForAsset,
  updateMaintenancePlan,
  completeMaintenancePlan,
  cancelMaintenancePlan,
  getMaintenanceCalendar,
} from "../../controllers/assets/assetMaintenancePlan.controller";
import {
  createMedicalDeviceProfile,
  getMedicalDeviceProfile,
  updateMedicalDeviceProfile,
  runMedicalDeviceAlerts,
} from "../../controllers/assets/medicalDevice.controller";
import {
  createCalibrationRecord,
  getCalibrationHistory,
  downloadCalibrationCertificate,
  updateCalibrationCertificate,
} from "../../controllers/assets/calibrationRecord.controller";
import {
  createOperatorCertificate,
  getAllOperatorCertificates,
  getCertifiedUsersForCategory,
  updateOperatorCertificate,
  revokeOperatorCertificate,
  deleteOperatorCertificate,
} from "../../controllers/assets/operatorCertificate.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { uploadExcel } from "../../middlewares/upload.middleware";
import { authorizePermission } from "../../middlewares/authorizePermission.middleware";
import {
  setAssetScope,
  requireAssetInScope,
  requireCategoryInScope,
  requireMaintenancePlanInScope,
  requireOperatorCertificateInScope,
} from "../../middlewares/assetScope.middleware";
import { validateBody, validateQuery, validateParams } from "../../middlewares/validate.middleware";
import { IdParamDTO, BulkIdsDTO, makeIdParamDTO } from "../../dto/common.dto";
import {
  CreateAssetDTO,
  UpdateAssetDTO,
  QueryAssetDTO,
  AssignAssetDTO,
  TransferAssetDTO,
  ReturnAssetDTO,
  QueryAssetAssignmentHistoryDTO,
  CreateAssetCategoryDTO,
  UpdateAssetCategoryDTO,
  QueryAssetCategoryDTO,
} from "../../dto/assets/assets.dto";
import {
  CreateMaintenancePlanDTO,
  UpdateMaintenancePlanDTO,
  ResolveMaintenancePlanDTO,
  QueryMaintenancePlanHistoryDTO,
  QueryMaintenanceCalendarDTO,
} from "../../dto/assets/assetMaintenancePlan.dto";
import { CreateMedicalDeviceProfileDTO, UpdateMedicalDeviceProfileDTO } from "../../dto/assets/medicalDevice.dto";
import {
  CreateCalibrationRecordDTO,
  CalibrationCertificateParamsDTO,
  UpdateCalibrationCertificateDTO,
} from "../../dto/assets/calibrationRecord.dto";
import {
  CreateOperatorCertificateDTO,
  QueryOperatorCertificateDTO,
  CertifiedUsersQueryDTO,
  UpdateOperatorCertificateDTO,
  RevokeOperatorCertificateDTO,
} from "../../dto/assets/operatorCertificate.dto";
import { createUploader } from "../../services/upload/upload.middleware";
import { getItDeviceProfile, upsertItDeviceProfile } from "../../controllers/itDevices/itDeviceProfile.controller";
import { UpsertItDeviceProfileDTO } from "../../dto/itDevices/itDeviceProfile.dto";
import { AssetType } from "../../interfaces/assets/asset.interface";
import type { Permission } from "../../shared/constants/permission.constant";

export interface AssetModuleConfig {
  assetType: AssetType;
  /** Tiền tố quyền: `IT_ASSET` hoặc `MEDICAL_ASSET`. */
  permissionPrefix: "IT_ASSET" | "MEDICAL_ASSET";
}

export const IT_ASSET_MODULE: AssetModuleConfig = { assetType: AssetType.IT, permissionPrefix: "IT_ASSET" };
export const MEDICAL_ASSET_MODULE: AssetModuleConfig = { assetType: AssetType.MEDICAL, permissionPrefix: "MEDICAL_ASSET" };

const assetIdParam = makeIdParamDTO("assetId", "Asset ID không hợp lệ");
const planIdParam = makeIdParamDTO("id", "ID kế hoạch bảo trì không hợp lệ");

/** Danh mục của nhánh (`/categories`). */
function buildCategoryRouter(cfg: AssetModuleConfig): Router {
  const router = Router();
  const c = (action: string) => authorizePermission(`${cfg.permissionPrefix}_CATEGORY_${action}` as Permission);

  router.post("/", authenticate, c("CREATE"), validateBody(CreateAssetCategoryDTO), createAssetCategory);
  router.get("/", authenticate, c("VIEW"), validateQuery(QueryAssetCategoryDTO), getAllAssetCategories);
  router.post("/bulk-delete", authenticate, c("DELETE"), validateBody(BulkIdsDTO), bulkDeleteAssetCategories);
  router.post("/bulk-restore", authenticate, c("UPDATE"), validateBody(BulkIdsDTO), bulkRestoreAssetCategories);
  router.get("/:id", authenticate, c("VIEW"), validateParams(IdParamDTO), requireCategoryInScope(), getAssetCategoryById);
  router.put(
    "/:id",
    authenticate,
    c("UPDATE"),
    validateParams(IdParamDTO),
    requireCategoryInScope(),
    validateBody(UpdateAssetCategoryDTO),
    updateAssetCategory,
  );
  router.delete("/:id", authenticate, c("DELETE"), validateParams(IdParamDTO), requireCategoryInScope(), deleteAssetCategory);
  router.delete(
    "/:id/permanent",
    authenticate,
    c("DELETE_PERMANENT"),
    validateParams(IdParamDTO),
    requireCategoryInScope(),
    hardDeleteAssetCategory,
  );
  router.patch("/:id/restore", authenticate, c("UPDATE"), validateParams(IdParamDTO), requireCategoryInScope(), restoreAssetCategory);
  return router;
}

/** Lịch bảo trì chủ động (`/maintenance-plans`). */
function buildMaintenancePlanRouter(cfg: AssetModuleConfig): Router {
  const router = Router();
  const m = (action: string) => authorizePermission(`${cfg.permissionPrefix}_MAINTENANCE_PLAN_${action}` as Permission);

  router.get("/calendar", authenticate, m("VIEW"), validateQuery(QueryMaintenanceCalendarDTO), getMaintenanceCalendar);
  router.post(
    "/asset/:assetId",
    authenticate,
    m("CREATE"),
    validateParams(assetIdParam),
    requireAssetInScope("assetId"),
    validateBody(CreateMaintenancePlanDTO),
    createMaintenancePlan,
  );
  router.get(
    "/asset/:assetId",
    authenticate,
    m("VIEW"),
    validateParams(assetIdParam),
    requireAssetInScope("assetId"),
    validateQuery(QueryMaintenancePlanHistoryDTO),
    getMaintenancePlansForAsset,
  );
  router.put(
    "/:id",
    authenticate,
    m("UPDATE"),
    validateParams(planIdParam),
    requireMaintenancePlanInScope(),
    validateBody(UpdateMaintenancePlanDTO),
    updateMaintenancePlan,
  );
  router.patch(
    "/:id/complete",
    authenticate,
    m("UPDATE"),
    validateParams(planIdParam),
    requireMaintenancePlanInScope(),
    validateBody(ResolveMaintenancePlanDTO),
    completeMaintenancePlan,
  );
  router.patch(
    "/:id/cancel",
    authenticate,
    m("UPDATE"),
    validateParams(planIdParam),
    requireMaintenancePlanInScope(),
    validateBody(ResolveMaintenancePlanDTO),
    cancelMaintenancePlan,
  );
  return router;
}

/** Phần riêng của Thiết bị y tế: hồ sơ, hiệu chuẩn, cảnh báo hiệu chuẩn, chứng chỉ vận hành. Quyền giữ `MEDICAL_DEVICE_*`, `OPERATOR_CERTIFICATE_*` (Q-D). */
function mountMedicalRoutes(router: Router): void {
  const certificateUploader = createUploader({
    maxSize: 10 * 1024 * 1024,
    allowedTypes: ["application/pdf", "image/jpeg", "image/png"],
  });

  // Cảnh báo hiệu chuẩn / giấy phép lưu hành / chứng chỉ vận hành (tách khỏi `/alerts/run` bảo hành/bảo trì).
  router.post("/calibration-alerts/run", authenticate, authorizePermission("MEDICAL_DEVICE_ALERTS_TRIGGER"), runMedicalDeviceAlerts);

  // Chứng chỉ người vận hành (`/operator-certificates`) — gắn theo user + danh mục, không theo 1 tài sản.
  const certs = Router();
  certs.post("/", authenticate, authorizePermission("OPERATOR_CERTIFICATE_CREATE"), validateBody(CreateOperatorCertificateDTO), createOperatorCertificate);
  certs.get("/", authenticate, authorizePermission("OPERATOR_CERTIFICATE_VIEW"), validateQuery(QueryOperatorCertificateDTO), getAllOperatorCertificates);
  certs.get(
    "/certified-users",
    authenticate,
    authorizePermission("OPERATOR_CERTIFICATE_VIEW"),
    validateQuery(CertifiedUsersQueryDTO),
    getCertifiedUsersForCategory,
  );
  certs.patch(
    "/:id",
    authenticate,
    authorizePermission("OPERATOR_CERTIFICATE_UPDATE"),
    validateParams(IdParamDTO),
    requireOperatorCertificateInScope(),
    validateBody(UpdateOperatorCertificateDTO),
    updateOperatorCertificate,
  );
  certs.patch(
    "/:id/revoke",
    authenticate,
    authorizePermission("OPERATOR_CERTIFICATE_REVOKE"),
    validateParams(IdParamDTO),
    requireOperatorCertificateInScope(),
    validateBody(RevokeOperatorCertificateDTO),
    revokeOperatorCertificate,
  );
  certs.delete(
    "/:id",
    authenticate,
    authorizePermission("OPERATOR_CERTIFICATE_REVOKE"),
    validateParams(IdParamDTO),
    requireOperatorCertificateInScope(),
    deleteOperatorCertificate,
  );
  router.use("/operator-certificates", certs);

  // Hồ sơ thiết bị y tế và lịch sử hiệu chuẩn theo tài sản.
  router.post(
    "/:assetId/profile",
    authenticate,
    authorizePermission("MEDICAL_DEVICE_CREATE"),
    validateParams(assetIdParam),
    requireAssetInScope("assetId"),
    validateBody(CreateMedicalDeviceProfileDTO),
    createMedicalDeviceProfile,
  );
  router.get(
    "/:assetId/profile",
    authenticate,
    authorizePermission("MEDICAL_DEVICE_VIEW"),
    validateParams(assetIdParam),
    requireAssetInScope("assetId"),
    getMedicalDeviceProfile,
  );
  router.put(
    "/:assetId/profile",
    authenticate,
    authorizePermission("MEDICAL_DEVICE_UPDATE"),
    validateParams(assetIdParam),
    requireAssetInScope("assetId"),
    validateBody(UpdateMedicalDeviceProfileDTO),
    updateMedicalDeviceProfile,
  );
  router.post(
    "/:assetId/calibration-records",
    authenticate,
    authorizePermission("MEDICAL_DEVICE_CALIBRATE"),
    validateParams(assetIdParam),
    requireAssetInScope("assetId"),
    certificateUploader.single("certificateFile"),
    validateBody(CreateCalibrationRecordDTO),
    createCalibrationRecord,
  );
  router.get(
    "/:assetId/calibration-records",
    authenticate,
    authorizePermission("MEDICAL_DEVICE_VIEW"),
    validateParams(assetIdParam),
    requireAssetInScope("assetId"),
    getCalibrationHistory,
  );
  router.get(
    "/:assetId/calibration-records/:recordId/certificate/download",
    authenticate,
    authorizePermission("MEDICAL_DEVICE_VIEW"),
    validateParams(CalibrationCertificateParamsDTO),
    requireAssetInScope("assetId"),
    downloadCalibrationCertificate,
  );
  router.put(
    "/:assetId/calibration-records/:recordId/certificate",
    authenticate,
    authorizePermission("MEDICAL_DEVICE_CALIBRATE"),
    validateParams(CalibrationCertificateParamsDTO),
    requireAssetInScope("assetId"),
    certificateUploader.single("certificateFile"),
    validateBody(UpdateCalibrationCertificateDTO),
    updateCalibrationCertificate,
  );
}

/**
 * Phần riêng của Thiết bị CNTT (DEV-116): hồ sơ kỹ thuật 1-1 với tài sản. Không tạo quyền riêng — xem dùng
 * `IT_ASSET_VIEW_DETAIL`, ghi dùng `IT_ASSET_UPDATE` (kế hoạch mục 4.4). PUT = tạo nếu chưa có, sửa nếu đã có.
 */
function mountItRoutes(router: Router): void {
  router.get(
    "/:assetId/profile",
    authenticate,
    authorizePermission("IT_ASSET_VIEW_DETAIL"),
    validateParams(assetIdParam),
    requireAssetInScope("assetId"),
    getItDeviceProfile,
  );
  router.put(
    "/:assetId/profile",
    authenticate,
    authorizePermission("IT_ASSET_UPDATE"),
    validateParams(assetIdParam),
    requireAssetInScope("assetId"),
    validateBody(UpsertItDeviceProfileDTO),
    upsertItDeviceProfile,
  );
}

export function buildAssetModuleRouter(cfg: AssetModuleConfig): Router {
  const router = Router();
  const p = (action: string) => authorizePermission(`${cfg.permissionPrefix}_${action}` as Permission);

  router.use(setAssetScope(cfg.assetType));

  // Nhánh con có path tĩnh — đăng ký TRƯỚC "/:id".
  router.use("/categories", buildCategoryRouter(cfg));
  router.use("/maintenance-plans", buildMaintenancePlanRouter(cfg));

  router.post("/", authenticate, p("CREATE"), validateBody(CreateAssetDTO), createAsset);
  router.get("/", authenticate, p("VIEW"), validateQuery(QueryAssetDTO), getAllAssets);
  router.post("/bulk-delete", authenticate, p("DELETE"), validateBody(BulkIdsDTO), bulkDeleteAssets);
  router.post("/bulk-restore", authenticate, p("UPDATE"), validateBody(BulkIdsDTO), bulkRestoreAssets);
  router.get("/export", authenticate, p("EXCEL_EXPORT"), exportAssets);
  router.get("/import/template", authenticate, p("EXCEL_IMPORT"), downloadAssetImportTemplate);
  router.post("/import", authenticate, p("EXCEL_IMPORT"), uploadExcel.single("file"), importAssets);
  router.post("/alerts/run", authenticate, p("ALERTS_TRIGGER"), runAssetAlerts);
  router.get("/lookup/:assetCode", authenticate, p("INVENTORY_CHECK"), lookupAssetByCode);

  if (cfg.assetType === AssetType.MEDICAL) mountMedicalRoutes(router);
  if (cfg.assetType === AssetType.IT) mountItRoutes(router);

  router.get("/:id", authenticate, p("VIEW_DETAIL"), validateParams(IdParamDTO), requireAssetInScope(), getAssetById);
  router.put(
    "/:id",
    authenticate,
    p("UPDATE"),
    validateParams(IdParamDTO),
    requireAssetInScope(),
    validateBody(UpdateAssetDTO),
    updateAsset,
  );
  router.delete("/:id", authenticate, p("DELETE"), validateParams(IdParamDTO), requireAssetInScope(), deleteAsset);
  // Xoá vĩnh viễn — quyền riêng, chỉ dùng được sau khi đã xoá mềm.
  router.delete("/:id/permanent", authenticate, p("DELETE_PERMANENT"), validateParams(IdParamDTO), requireAssetInScope(), hardDeleteAsset);
  router.patch("/:id/restore", authenticate, p("UPDATE"), validateParams(IdParamDTO), requireAssetInScope(), restoreAsset);

  router.post(
    "/:id/assign",
    authenticate,
    p("ASSIGN"),
    validateParams(IdParamDTO),
    requireAssetInScope(),
    validateBody(AssignAssetDTO),
    assignAsset,
  );
  router.post(
    "/:id/transfer",
    authenticate,
    p("ASSIGN"),
    validateParams(IdParamDTO),
    requireAssetInScope(),
    validateBody(TransferAssetDTO),
    transferAsset,
  );
  router.post(
    "/:id/return",
    authenticate,
    p("ASSIGN"),
    validateParams(IdParamDTO),
    requireAssetInScope(),
    validateBody(ReturnAssetDTO),
    returnAsset,
  );
  router.get(
    "/:id/assignment-history",
    authenticate,
    p("VIEW_DETAIL"),
    validateParams(IdParamDTO),
    requireAssetInScope(),
    validateQuery(QueryAssetAssignmentHistoryDTO),
    getAssetAssignmentHistory,
  );
  router.get("/:id/qrcode", authenticate, p("VIEW_DETAIL"), validateParams(IdParamDTO), requireAssetInScope(), getAssetQRCode);
  router.post("/:id/check-in", authenticate, p("INVENTORY_CHECK"), validateParams(IdParamDTO), requireAssetInScope(), checkInAsset);
  // Dữ liệu trả về là Document nên dùng quyền xem Document (như trước khi tách module).
  router.get(
    "/:id/documents",
    authenticate,
    authorizePermission("DOCUMENT_VIEW"),
    validateParams(IdParamDTO),
    requireAssetInScope(),
    getAssetDocuments,
  );

  return router;
}

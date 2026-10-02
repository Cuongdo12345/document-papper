// routes/assets/operatorCertificate.routes.ts
//
// MODULE MỚI (DEV-077) — mounted tại `/api/operator-certificates` (app.ts).
import { Router } from "express";
import {
  createOperatorCertificate,
  getAllOperatorCertificates,
  getCertifiedUsersForCategory,
  updateOperatorCertificate,
  revokeOperatorCertificate,
  deleteOperatorCertificate,
} from "../../controllers/assets/operatorCertificate.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorizePermission } from "../../middlewares/authorizePermission.middleware";
import { validateBody, validateParams, validateQuery } from "../../middlewares/validate.middleware";
import { IdParamDTO } from "../../dto/common.dto";
import {
  CreateOperatorCertificateDTO,
  QueryOperatorCertificateDTO,
  CertifiedUsersQueryDTO,
  UpdateOperatorCertificateDTO,
  RevokeOperatorCertificateDTO,
} from "../../dto/assets/operatorCertificate.dto";

const router = Router();

router.post(
  "/",
  authenticate,
  authorizePermission("OPERATOR_CERTIFICATE_CREATE"),
  validateBody(CreateOperatorCertificateDTO),
  createOperatorCertificate,
);

router.get(
  "/",
  authenticate,
  authorizePermission("OPERATOR_CERTIFICATE_VIEW"),
  validateQuery(QueryOperatorCertificateDTO),
  getAllOperatorCertificates,
);

/**
 * PHẢI đăng ký TRƯỚC "/:id" bên dưới — static path, cùng lý do
 * "/asset/:assetId" ở `assetMaintenancePlan.routes.ts`/`contract.routes.ts`.
 */
router.get(
  "/certified-users",
  authenticate,
  authorizePermission("OPERATOR_CERTIFICATE_VIEW"),
  validateQuery(CertifiedUsersQueryDTO),
  getCertifiedUsersForCategory,
);

/**
 * [MỚI DEV-078] Sửa — CHỈ `certificateNumber` (xem giải thích interface).
 * Permission RIÊNG `OPERATOR_CERTIFICATE_UPDATE` (không dùng chung CREATE)
 * — quyết định user, kiểm soát chặt hơn ai được sửa dữ liệu đã cấp.
 */
router.patch(
  "/:id",
  authenticate,
  authorizePermission("OPERATOR_CERTIFICATE_UPDATE"),
  validateParams(IdParamDTO),
  validateBody(UpdateOperatorCertificateDTO),
  updateOperatorCertificate,
);

/**
 * [MỚI DEV-078] Thu hồi — bắt buộc lý do. Permission RIÊNG
 * `OPERATOR_CERTIFICATE_REVOKE` — DÙNG CHUNG cho cả revoke (bên dưới) VÀ
 * xoá mềm (mirror `CONTRACT_RESTORE`, nhưng gộp 2 hành động "vô hiệu hoá"
 * cùng 1 permission theo quyết định user, khác `UPDATE` ở trên).
 */
router.patch(
  "/:id/revoke",
  authenticate,
  authorizePermission("OPERATOR_CERTIFICATE_REVOKE"),
  validateParams(IdParamDTO),
  validateBody(RevokeOperatorCertificateDTO),
  revokeOperatorCertificate,
);

/** [MỚI DEV-078] Xoá mềm — lỗi nhập liệu, KHÔNG bắt buộc lý do, cùng permission REVOKE ở trên. */
router.delete(
  "/:id",
  authenticate,
  authorizePermission("OPERATOR_CERTIFICATE_REVOKE"),
  validateParams(IdParamDTO),
  deleteOperatorCertificate,
);

export default router;

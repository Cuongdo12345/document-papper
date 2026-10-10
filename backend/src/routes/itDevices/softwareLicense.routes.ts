// routes/itDevices/softwareLicense.routes.ts
//
// DEV-116 (tách module Tài sản, Giai đoạn 5) — `/api/software-licenses`. Quyền `SOFTWARE_LICENSE_*` (DEV-114).
// Static path ("/alerts/run") đăng ký TRƯỚC "/:id".
import { Router } from "express";
import {
  createSoftwareLicense,
  getAllSoftwareLicenses,
  getSoftwareLicenseById,
  updateSoftwareLicense,
  deleteSoftwareLicense,
  restoreSoftwareLicense,
  assignAssetToLicense,
  unassignAssetFromLicense,
  setLicenseProofFile,
  downloadLicenseProofFile,
  runSoftwareLicenseAlerts,
} from "../../controllers/itDevices/softwareLicense.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorizePermission } from "../../middlewares/authorizePermission.middleware";
import { validateBody, validateParams, validateQuery } from "../../middlewares/validate.middleware";
import { IdParamDTO } from "../../dto/common.dto";
import {
  CreateSoftwareLicenseDTO,
  UpdateSoftwareLicenseDTO,
  QuerySoftwareLicenseDTO,
  AssignSoftwareLicenseDTO,
} from "../../dto/itDevices/softwareLicense.dto";
import { createUploader } from "../../services/upload/upload.middleware";

const router = Router();

const proofUploader = createUploader({
  maxSize: 10 * 1024 * 1024,
  maxFiles: 1,
  allowedTypes: ["application/pdf", "image/jpeg", "image/png"],
});

router.post("/", authenticate, authorizePermission("SOFTWARE_LICENSE_CREATE"), validateBody(CreateSoftwareLicenseDTO), createSoftwareLicense);
router.get("/", authenticate, authorizePermission("SOFTWARE_LICENSE_VIEW"), validateQuery(QuerySoftwareLicenseDTO), getAllSoftwareLicenses);
router.post("/alerts/run", authenticate, authorizePermission("SOFTWARE_LICENSE_ALERTS_TRIGGER"), runSoftwareLicenseAlerts);

router.get("/:id", authenticate, authorizePermission("SOFTWARE_LICENSE_VIEW"), validateParams(IdParamDTO), getSoftwareLicenseById);
router.put(
  "/:id",
  authenticate,
  authorizePermission("SOFTWARE_LICENSE_UPDATE"),
  validateParams(IdParamDTO),
  validateBody(UpdateSoftwareLicenseDTO),
  updateSoftwareLicense,
);
router.delete("/:id", authenticate, authorizePermission("SOFTWARE_LICENSE_DELETE"), validateParams(IdParamDTO), deleteSoftwareLicense);
router.patch("/:id/restore", authenticate, authorizePermission("SOFTWARE_LICENSE_UPDATE"), validateParams(IdParamDTO), restoreSoftwareLicense);

router.post(
  "/:id/assign",
  authenticate,
  authorizePermission("SOFTWARE_LICENSE_ASSIGN"),
  validateParams(IdParamDTO),
  validateBody(AssignSoftwareLicenseDTO),
  assignAssetToLicense,
);
router.post(
  "/:id/unassign",
  authenticate,
  authorizePermission("SOFTWARE_LICENSE_ASSIGN"),
  validateParams(IdParamDTO),
  validateBody(AssignSoftwareLicenseDTO),
  unassignAssetFromLicense,
);

// Chứng từ: tải lên thay thế (multipart, trường `proofFile`) và tải xuống qua endpoint có quyền.
router.put(
  "/:id/proof-file",
  authenticate,
  authorizePermission("SOFTWARE_LICENSE_UPDATE"),
  validateParams(IdParamDTO),
  proofUploader.single("proofFile"),
  setLicenseProofFile,
);
router.get("/:id/proof-file/download", authenticate, authorizePermission("SOFTWARE_LICENSE_VIEW"), validateParams(IdParamDTO), downloadLicenseProofFile);

export default router;

// routes/vendors/vendor.routes.ts
//
// Roadmap B4 (Quản lý nhà cung cấp & hợp đồng bảo trì, 2026-09-16). Mounted
// tại `/api/vendors` (app.ts).
import { Router } from "express";
import {
  createVendor,
  getAllVendors,
  getVendorById,
  updateVendor,
  bulkDeleteVendors,
  bulkRestoreVendors,
} from "../../controllers/vendors/vendor.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorizePermission } from "../../middlewares/authorizePermission.middleware";
import { validateBody, validateParams, validateQuery } from "../../middlewares/validate.middleware";
import { IdParamDTO, BulkIdsDTO } from "../../dto/common.dto";
import { CreateVendorDTO, UpdateVendorDTO, QueryVendorsDTO } from "../../dto/vendors/vendor.dto";

const router = Router();

router.post(
  "/",
  authenticate,
  authorizePermission("VENDOR_CREATE"),
  validateBody(CreateVendorDTO),
  createVendor,
);

router.get(
  "/",
  authenticate,
  authorizePermission("VENDOR_VIEW"),
  validateQuery(QueryVendorsDTO),
  getAllVendors,
);

/** [MỚI 2026-09-16, DEV-060] PHẢI đăng ký TRƯỚC "GET /:id" — static path. */
router.post(
  "/bulk-delete",
  authenticate,
  authorizePermission("VENDOR_UPDATE"),
  validateBody(BulkIdsDTO),
  bulkDeleteVendors,
);

/** [MỚI 2026-09-17, DEV-062] PHẢI đăng ký TRƯỚC "GET /:id" — static path. */
router.post(
  "/bulk-restore",
  authenticate,
  authorizePermission("VENDOR_UPDATE"),
  validateBody(BulkIdsDTO),
  bulkRestoreVendors,
);

router.get(
  "/:id",
  authenticate,
  authorizePermission("VENDOR_VIEW"),
  validateParams(IdParamDTO),
  getVendorById,
);

router.put(
  "/:id",
  authenticate,
  authorizePermission("VENDOR_UPDATE"),
  validateParams(IdParamDTO),
  validateBody(UpdateVendorDTO),
  updateVendor,
);

export default router;

import { Router } from "express";
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
import { authenticate } from "../../middlewares/auth.middleware";
import { authorizePermission } from "../../middlewares/authorizePermission.middleware";
import {
  validateBody,
  validateQuery,
  validateParams,
} from "../../middlewares/validate.middleware";
import { IdParamDTO, BulkIdsDTO } from "../../dto/common.dto";
import {
  CreateAssetCategoryDTO,
  UpdateAssetCategoryDTO,
  QueryAssetCategoryDTO,
} from "../../dto/assets/assets.dto";

const router = Router();

router.post(
  "/",
  authenticate,
  authorizePermission("ASSET_CATEGORY_CREATE"),
  validateBody(CreateAssetCategoryDTO),
  createAssetCategory,
);

router.get(
  "/",
  authenticate,
  authorizePermission("ASSET_CATEGORY_VIEW"),
  validateQuery(QueryAssetCategoryDTO),
  getAllAssetCategories,
);

/** [MỚI 2026-09-16, DEV-060] PHẢI đăng ký TRƯỚC "GET /:id" — static path. */
router.post(
  "/bulk-delete",
  authenticate,
  authorizePermission("ASSET_CATEGORY_DELETE"),
  validateBody(BulkIdsDTO),
  bulkDeleteAssetCategories,
);

/** [MỚI 2026-09-17, DEV-062] PHẢI đăng ký TRƯỚC "GET /:id" — static path. */
router.post(
  "/bulk-restore",
  authenticate,
  authorizePermission("ASSET_CATEGORY_UPDATE"),
  validateBody(BulkIdsDTO),
  bulkRestoreAssetCategories,
);

router.get(
  "/:id",
  authenticate,
  authorizePermission("ASSET_CATEGORY_VIEW"),
  validateParams(IdParamDTO),
  getAssetCategoryById,
);

router.put(
  "/:id",
  authenticate,
  authorizePermission("ASSET_CATEGORY_UPDATE"),
  validateParams(IdParamDTO),
  validateBody(UpdateAssetCategoryDTO),
  updateAssetCategory,
);

router.delete(
  "/:id",
  authenticate,
  authorizePermission("ASSET_CATEGORY_DELETE"),
  validateParams(IdParamDTO),
  deleteAssetCategory,
);

router.delete(
  "/:id/permanent",
  authenticate,
  authorizePermission("ASSET_CATEGORY_DELETE_PERMANENT"),
  validateParams(IdParamDTO),
  hardDeleteAssetCategory,
);

router.patch(
  "/:id/restore",
  authenticate,
  authorizePermission("ASSET_CATEGORY_UPDATE"),
  validateParams(IdParamDTO),
  restoreAssetCategory,
);


export default router;

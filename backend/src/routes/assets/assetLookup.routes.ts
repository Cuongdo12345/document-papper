import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorizePermission } from "../../middlewares/authorizePermission.middleware";
import { validateParams, validateQuery } from "../../middlewares/validate.middleware";
import { IdParamDTO } from "../../dto/common.dto";
import { QueryAssetLookupDTO } from "../../dto/assets/assets.dto";
import { getAssetLookupOptionById, getAssetLookupOptions } from "../../controllers/assets/assetLookup.controller";

const router = Router();

/**
 * Tra cứu tài sản dùng chung cho cả hai loại (ô chọn tài sản ở Tài liệu / Hợp đồng) — Giai đoạn 6.
 * Mount ở `/api/assets/lookup-options`, TRƯỚC `/api/assets` (xem app.ts). Đây là route dùng chung, KHÔNG thuộc lớp
 * tương thích cũ nên được giữ lại khi gỡ `/api/assets*` ở Giai đoạn 8.
 *
 * Quyền: một trong hai quyền xem (IT_ASSET_VIEW | MEDICAL_ASSET_VIEW) — service lọc tiếp theo loại người gọi xem được.
 */
router.get(
  "/",
  authenticate,
  authorizePermission(["IT_ASSET_VIEW", "MEDICAL_ASSET_VIEW"]),
  validateQuery(QueryAssetLookupDTO),
  getAssetLookupOptions,
);

/**
 * Một tài sản theo id (kèm loại) — để frontend dẫn từ link thông báo / tài liệu / hợp đồng tới đúng trang chi tiết.
 * Cùng quyền với danh sách; tài sản thuộc loại người gọi không xem được -> 404.
 */
router.get(
  "/:id",
  authenticate,
  authorizePermission(["IT_ASSET_VIEW", "MEDICAL_ASSET_VIEW"]),
  validateParams(IdParamDTO),
  getAssetLookupOptionById,
);

export default router;

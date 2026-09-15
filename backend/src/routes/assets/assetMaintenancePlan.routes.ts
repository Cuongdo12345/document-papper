// routes/assets/assetMaintenancePlan.routes.ts
//
// Roadmap B2 (Lịch bảo trì chủ động, 2026-09-15). Mounted riêng tại
// `/api/assets/maintenance-plans` (app.ts) — mirror đúng cách
// `medicalDeviceRoutes` được mount tách khỏi `assetRoutes`.
import { Router } from "express";
import {
  createMaintenancePlan,
  getMaintenancePlansForAsset,
  updateMaintenancePlan,
  completeMaintenancePlan,
  cancelMaintenancePlan,
  getMaintenanceCalendar,
} from "../../controllers/assets/assetMaintenancePlan.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorizePermission } from "../../middlewares/authorizePermission.middleware";
import { validateBody, validateParams, validateQuery } from "../../middlewares/validate.middleware";
import { makeIdParamDTO } from "../../dto/common.dto";
import {
  CreateMaintenancePlanDTO,
  UpdateMaintenancePlanDTO,
  ResolveMaintenancePlanDTO,
  QueryMaintenancePlanHistoryDTO,
  QueryMaintenanceCalendarDTO,
} from "../../dto/assets/assetMaintenancePlan.dto";

const router = Router();

const assetIdParam = makeIdParamDTO("assetId", "Asset ID không hợp lệ");
const planIdParam = makeIdParamDTO("id", "ID kế hoạch bảo trì không hợp lệ");

// PHẢI khai TRƯỚC "/asset/:assetId"/"/:id" bên dưới — cùng lý do
// "/pending"/"/templates" ở `workflow.routes.ts`: nếu không, 1 route
// GET "/:id"-dạng sẽ khớp nhầm "calendar" là giá trị :id/param khác.
// (Ở đây thực ra không xung đột segment-count với "/asset/:assetId" hay
// "/:id/complete", nhưng giữ quy ước đặt route tĩnh trước route động để
// nhất quán/dễ đọc toàn dự án.)
router.get(
  "/calendar",
  authenticate,
  authorizePermission("ASSET_MAINTENANCE_PLAN_VIEW"),
  validateQuery(QueryMaintenanceCalendarDTO),
  getMaintenanceCalendar,
);

router.post(
  "/asset/:assetId",
  authenticate,
  authorizePermission("ASSET_MAINTENANCE_PLAN_CREATE"),
  validateParams(assetIdParam),
  validateBody(CreateMaintenancePlanDTO),
  createMaintenancePlan,
);

router.get(
  "/asset/:assetId",
  authenticate,
  authorizePermission("ASSET_MAINTENANCE_PLAN_VIEW"),
  validateParams(assetIdParam),
  validateQuery(QueryMaintenancePlanHistoryDTO),
  getMaintenancePlansForAsset,
);

router.put(
  "/:id",
  authenticate,
  authorizePermission("ASSET_MAINTENANCE_PLAN_UPDATE"),
  validateParams(planIdParam),
  validateBody(UpdateMaintenancePlanDTO),
  updateMaintenancePlan,
);

router.patch(
  "/:id/complete",
  authenticate,
  authorizePermission("ASSET_MAINTENANCE_PLAN_UPDATE"),
  validateParams(planIdParam),
  validateBody(ResolveMaintenancePlanDTO),
  completeMaintenancePlan,
);

router.patch(
  "/:id/cancel",
  authenticate,
  authorizePermission("ASSET_MAINTENANCE_PLAN_UPDATE"),
  validateParams(planIdParam),
  validateBody(ResolveMaintenancePlanDTO),
  cancelMaintenancePlan,
);

export default router;

import { Router } from "express";
import {
  createDepartment,
  getAllDepartments,
  updateDepartment,
  deleteDepartment,
  getDepartmentById,
  bulkDeleteDepartments,
  restoreDepartment,
  bulkRestoreDepartments,
} from "../../controllers/departments/department.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorizePermission } from "../../middlewares/authorizePermission.middleware";
import { validateBody, validateParams, validateQuery } from "../../middlewares/validate.middleware";
import { IdParamDTO, BulkIdsDTO } from "../../dto/common.dto";
import { CreateDepartmentDTO, UpdateDepartmentDTO, QueryDepartmentDTO } from "../../dto/departments/departments.dto";

const router = Router();

// DEV-013/ARCH-29: `department.routes.ts` trước đây KHÔNG có validateParams
// ở BẤT KỲ route nào (khác RBAC/Documents/Assets đã có ở route GET :id) —
// `:id` sai định dạng ObjectId rơi thẳng xuống Mongoose CastError thay vì
// 400 chuẩn hoá ở tầng route. Thêm validateParams(IdParamDTO) cho cả 3 route
// dùng `:id`.
// DEV-021/SEC-11: thêm validateBody(CreateDepartmentDTO/UpdateDepartmentDTO)
// — trước đây route này hoàn toàn không có bất kỳ validate shape nào cho
// body, khác mọi domain khác đã có DTO.
router.post("/", authenticate, authorizePermission("DEPARTMENT_CREATE"), validateBody(CreateDepartmentDTO), createDepartment);
// [DEV-086] Thêm validateQuery(QueryDepartmentDTO) — trước đây route này
// không validate query, `isActive` mới thêm cần qua DTO để coerce string
// "true"/"false" -> boolean trước khi tới service.
router.get("/", authenticate, authorizePermission("DEPARTMENT_VIEW"), validateQuery(QueryDepartmentDTO), getAllDepartments);

/** [DEV-086] PHẢI đăng ký TRƯỚC "GET /:id" — static path, cùng lý do AssetCategory. */
router.post(
  "/bulk-delete",
  authenticate,
  authorizePermission("DEPARTMENT_DELETE"),
  validateBody(BulkIdsDTO),
  bulkDeleteDepartments,
);

/** [DEV-086] PHẢI đăng ký TRƯỚC "GET /:id" — static path. */
router.post(
  "/bulk-restore",
  authenticate,
  authorizePermission("DEPARTMENT_RESTORE"),
  validateBody(BulkIdsDTO),
  bulkRestoreDepartments,
);

router.get("/:id", authenticate, authorizePermission("DEPARTMENT_VIEW_DETAIL"), validateParams(IdParamDTO), getDepartmentById);
router.put("/:id", authenticate, authorizePermission("DEPARTMENT_UPDATE"), validateParams(IdParamDTO), validateBody(UpdateDepartmentDTO), updateDepartment);
router.delete("/:id", authenticate, authorizePermission("DEPARTMENT_DELETE"), validateParams(IdParamDTO), deleteDepartment);

// [DEV-086] Khôi phục khoa/phòng đã xoá mềm — quyền RIÊNG DEPARTMENT_RESTORE.
router.patch(
  "/:id/restore",
  authenticate,
  authorizePermission("DEPARTMENT_RESTORE"),
  validateParams(IdParamDTO),
  restoreDepartment,
);

export default router;

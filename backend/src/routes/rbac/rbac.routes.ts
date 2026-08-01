/**
 * Role refactoring:
 */

import express from "express";
import {
  createPermission,
  getPermissions,
  getPermissionById,
  updatePermission,
  deletePermission,
  createRole,
  getRoles,
  getRoleById,
  updateRole,
  deleteRole,
  assignPermissionsToRole,
  createPolicy,
  getPolicies,
  getPolicyById,
  updatePolicy,
  deletePolicy,
} from "../../controllers/rbac/rbac.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorizePermission } from "../../middlewares/authorizePermission.middleware";
import { validateBody, validateQuery, validateParams } from "../../middlewares/validate.middleware";
import { IdParamDTO } from "../../dto/common.dto";
import {
  GetPermissionsQueryDTO,
  GetRolesQueryDTO,
  GetPoliciesQueryDTO,
  CreatePermissionDTO,
  UpdatePermissionDTO,
  CreateRoleDTO,
  UpdateRoleDTO,
  AssignPermissionsDTO,
  CreatePolicyDTO,
  UpdatePolicyDTO,
} from "../../dto/rbac/rbac.dto";

// ⚠️ SỬA (review RBAC module — B13, mass assignment): TẤT CẢ route POST/PUT
// dưới đây TRƯỚC ĐÂY không có `validateBody` nào — đây là nguyên nhân gốc
// cho phép gửi field lạ (đặc biệt `permissions` ở Role) lọt thẳng xuống
// service. Đã gắn đủ `validateBody` với DTO tương ứng cho từng route (lớp
// phòng thủ thứ 1 — lớp thứ 2 là whitelist ở tầng service, xem
// `rbac.constants.ts`/`rbac.service.ts`).
const router = express.Router();

// Permission
router.post(
  "/permissions",
  authenticate,
  authorizePermission("PERMISSION_CREATE"),
  validateBody(CreatePermissionDTO),
  createPermission,
);
router.get(
  "/permissions",
  authenticate,
  authorizePermission("PERMISSION_VIEW"),
  // validateQuery(GetPermissionsQueryDTO),
  getPermissions,
);
// ⚠️ MỚI: GET permission detail — dùng chung permission "PERMISSION_VIEW"
// với route list, và validateParams(IdParamDTO) để chặn `:id` sai định dạng
// ObjectId ngay ở tầng route (tránh lỗi cast không chuẩn hoá rơi xuống service).
router.get(
  "/permissions/:id",
  authenticate,
  authorizePermission("PERMISSION_VIEW"),
  validateParams(IdParamDTO),
  getPermissionById,
);
router.put(
  "/permissions/:id",
  authenticate,
  authorizePermission("PERMISSION_UPDATE"),
  validateBody(UpdatePermissionDTO),
  updatePermission,
);
router.delete(
  "/permissions/:id",
  authenticate,
  authorizePermission("PERMISSION_DELETE"),
  deletePermission,
);

// Role
router.post(
  "/roles",
  authenticate,
  authorizePermission("ROLE_CREATE"),
  validateBody(CreateRoleDTO),
  createRole,
);
router.get(
  "/roles",
  authenticate,
  authorizePermission("ROLE_VIEW"),
  // validateQuery(GetRolesQueryDTO),
  getRoles,
);
// ⚠️ MỚI: GET role detail (kèm populate permissions).
router.get(
  "/roles/:id",
  authenticate,
  authorizePermission("ROLE_VIEW"),
  validateParams(IdParamDTO),
  getRoleById,
);
router.put(
  "/roles/:id",
  authenticate,
  authorizePermission("ROLE_UPDATE"),
  validateBody(UpdateRoleDTO), // ⚠️ CHỈ cho phép `name` — xem rbac.dto.ts
  updateRole,
);
router.delete(
  "/roles/:id",
  authenticate,
  authorizePermission("ROLE_DELETE"),
  deleteRole,
);
router.post(
  "/roles/:id/assign-permissions",
  authenticate,
  authorizePermission("ROLE_ASSIGN_PERMISSIONS"), // permission riêng, không dùng chung ROLE_UPDATE
  validateBody(AssignPermissionsDTO),
  assignPermissionsToRole,
);

// Policy
router.post(
  "/policies",
  authenticate,
  authorizePermission("POLICY_CREATE"),
  validateBody(CreatePolicyDTO),
  createPolicy,
);
router.get(
  "/policies",
  authenticate,
  authorizePermission("POLICY_VIEW"),
  // validateQuery(GetPoliciesQueryDTO),
  getPolicies,
);
// ⚠️ MỚI: GET policy detail.
router.get(
  "/policies/:id",
  authenticate,
  authorizePermission("POLICY_VIEW"),
  validateParams(IdParamDTO),
  getPolicyById,
);
router.put(
  "/policies/:id",
  authenticate,
  authorizePermission("POLICY_UPDATE"),
  validateBody(UpdatePolicyDTO),
  updatePolicy,
);
router.delete(
  "/policies/:id",
  authenticate,
  authorizePermission("POLICY_DELETE"),
  deletePolicy,
);

export default router;
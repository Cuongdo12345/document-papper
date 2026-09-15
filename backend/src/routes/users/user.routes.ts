/**
 * user routes.ts refactored
 */

import { Router } from "express";
import {
  createUser,
  getUsers,
  deleteUser,
  getUserById,
  updateUser,
  restoreUser,
  changePasswordUser,
  resetPasswordByAdmin,
  getMe,
  updateMe,
  assignUserRole,
} from "../../controllers/users/user.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorizePermission } from "../../middlewares/authorizePermission.middleware";
import {
  validateBody,
  validateQuery,
} from "../../middlewares/validate.middleware";
import {
  CreateUserDTO,
  UpdateUserDTO,
  ChangePasswordDTO,
  GetUsersQueryDTO,
  AssignRoleDTO,
  ResetPasswordByAdminDTO,
} from "../../dto/users/users.dto";

const router = Router();

router.post(
  "/",
  authenticate,
  authorizePermission("USER_CREATE"),
  validateBody(CreateUserDTO),
  createUser,
);

router.get(
  "/",
  authenticate,
  // DEV-013/MEDIUM-04/ARCH-25: "USER_READ" KHÔNG tồn tại trong permission
  // catalog (permission.constant.ts) — sửa đúng thành USER_VIEW.
  authorizePermission("USER_VIEW"),
  validateQuery(GetUsersQueryDTO),
  getUsers,
);

router.get("/me", authenticate, getMe);

router.get(
  "/:id",
  authenticate,
  // DEV-013/MEDIUM-04/ARCH-25: "USER_DETAIL" KHÔNG tồn tại trong permission
  // catalog — sửa đúng thành USER_VIEW_DETAIL.
  authorizePermission("USER_VIEW_DETAIL"),
  getUserById,
);

router.patch("/me", authenticate, validateBody(UpdateUserDTO), updateMe);

router.put(
  "/:id",
  authenticate,
  authorizePermission("USER_UPDATE"),
  validateBody(UpdateUserDTO),
  updateUser,
);

// TASK-002 (Việc 2): endpoint riêng để gán role cho user, wire lại
// assignRole() (vốn trước đây là dead code) — dùng permission RIÊNG
// "USER_ASSIGN_ROLE", tách khỏi "USER_UPDATE" (không cho phép đổi role qua
// PUT /:id nữa kể từ TASK-001). assignRole() tự chặn gán ADMIN + chặn tự đổi
// role chính mình + tự clear permission cache.
router.patch(
  "/:id/role",
  authenticate,
  authorizePermission("USER_ASSIGN_ROLE"),
  validateBody(AssignRoleDTO),
  assignUserRole,
);

router.delete(
  "/:id",
  authenticate,
  authorizePermission("USER_DELETE"),
  deleteUser,
);

router.patch(
  "/restore/:id",
  authenticate,
  authorizePermission("USER_RESTORE"),
  restoreUser,
);

router.patch(
  "/change-password",
  authenticate,
  authorizePermission("USER_CHANGE_PASSWORD"),
  validateBody(ChangePasswordDTO),
  changePasswordUser,
);

router.patch(
  "/reset-password/:id",
  authenticate,
  authorizePermission("USER_RESET_PASSWORD"),
  // DEV-021/SEC-02: trước đây route này KHÔNG có validateBody nào —
  // `req.body.newPassword` không giới hạn độ dài/kiểu dữ liệu.
  validateBody(ResetPasswordByAdminDTO),
  resetPasswordByAdmin,
);

export default router;


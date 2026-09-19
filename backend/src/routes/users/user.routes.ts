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
  bulkDeleteUsers,
  bulkRestoreUsers,
  changePasswordUser,
  resetPasswordByAdmin,
  resetTwoFactorByAdmin,
  listUserSessionsByAdmin,
  revokeUserSessionByAdmin,
  listAllSessionsByAdmin,
  getMe,
  updateMe,
  assignUserRole,
} from "../../controllers/users/user.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorizePermission } from "../../middlewares/authorizePermission.middleware";
import {
  validateBody,
  validateQuery,
  validateParams,
} from "../../middlewares/validate.middleware";
import { BulkIdsDTO, IdParamDTO } from "../../dto/common.dto";
import {
  CreateUserDTO,
  UpdateUserDTO,
  ChangePasswordDTO,
  GetUsersQueryDTO,
  AssignRoleDTO,
  ResetPasswordByAdminDTO,
  UserSessionParamDTO,
  GetAllSessionsQueryDTO,
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

/** [MỚI 2026-09-16, DEV-060] PHẢI đăng ký TRƯỚC "GET /:id" — static path. */
router.post(
  "/bulk-delete",
  authenticate,
  authorizePermission("USER_DELETE"),
  validateBody(BulkIdsDTO),
  bulkDeleteUsers,
);

/**
 * [MỚI 2026-09-17, DEV-062] PHẢI đăng ký TRƯỚC "GET /:id" — static path.
 * Dùng lại permission USER_RESTORE y hệt khôi phục từng dòng (`PATCH
 * /restore/:id` bên dưới) — permission RIÊNG, khác `USER_DELETE`/`USER_UPDATE`.
 */
router.post(
  "/bulk-restore",
  authenticate,
  authorizePermission("USER_RESTORE"),
  validateBody(BulkIdsDTO),
  bulkRestoreUsers,
);

/**
 * Roadmap C3 (Giám sát phiên đăng nhập toàn hệ thống, DEV-070, 2026-09-19)
 * — PHẢI đăng ký TRƯỚC "GET /:id" (static path, cùng lý do với
 * /bulk-delete, /bulk-restore ở trên) — nếu không Express sẽ match
 * "sessions" vào tham số `:id`. Dùng LẠI permission `SESSION_VIEW_ALL` đã có
 * từ C2 (DEV-069) — xem giải thích ở `users.service.ts::listAllSessions`.
 */
router.get(
  "/sessions",
  authenticate,
  authorizePermission("SESSION_VIEW_ALL"),
  validateQuery(GetAllSessionsQueryDTO),
  listAllSessionsByAdmin,
);

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

// Roadmap C1 (Xác thực 2 lớp qua email OTP, DEV-068, 2026-09-19) — không có
// body (chỉ tắt cờ + xoá OTP đang chờ), khác reset-password ở trên.
router.patch(
  "/reset-2fa/:id",
  authenticate,
  authorizePermission("USER_RESET_2FA"),
  resetTwoFactorByAdmin,
);

/* =====================================================================
   QUẢN LÝ PHIÊN ĐĂNG NHẬP CỦA USER KHÁC (Roadmap C2, DEV-069, 2026-09-19)
   — VIEW/REVOKE tách permission riêng (xem giải thích ở permission.constant.ts).
===================================================================== */
router.get(
  "/:id/sessions",
  authenticate,
  authorizePermission("SESSION_VIEW_ALL"),
  validateParams(IdParamDTO),
  listUserSessionsByAdmin,
);

router.delete(
  "/:id/sessions/:sessionId",
  authenticate,
  authorizePermission("SESSION_REVOKE_ALL"),
  validateParams(UserSessionParamDTO),
  revokeUserSessionByAdmin,
);

export default router;



/**
 * User controller refactor
 */

import { Request, Response } from "express";
import { catchAsync } from "../../shared/utils/catchAsync";
import {
  create,
  getList,
  getById,
  getMeService,
  update,
  updateMeService,
  disable,
  bulkDisable,
  restore,
  bulkRestore,
  resetPassword,
  resetTwoFactor,
  listUserSessions,
  revokeUserSession,
  listAllSessions,
  changePassword,
  assignRole,
} from "../../services/users/users.service";

// CONTROLLER LÀ NƠI XỬ LÝ LOGIC LIÊN QUAN ĐẾN REQUEST/RESPONSE
// Ví dụ: validate dữ liệu đầu vào, gọi service để xử lý nghiệp vụ, trả response về client
// Controller nên gọn nhẹ, không nên chứa quá nhiều logic phức tạp
// Logic phức tạp nên được chuyển vào service để dễ bảo trì, test và tái sử dụng
// Toàn bộ try/catch thủ công đã được loại bỏ. Lỗi (ApiError hoặc lỗi bất kỳ) được
// catchAsync forward tự động tới next(error) -> errorHandler middleware xử lý
// và trả đúng HTTP status (err.status) đã được ApiError gán sẵn.
// ==============================================================================================================
export const createUser = catchAsync(async (req: Request, res: Response) => {
  const user = await create(req.body, req.user!._id);

  res.json({
    message: "Tạo user thành công",
    data: {
      id: user._id,
      username: user.username,
      role: user.role,
      department: user.department,
    },
  });
});

// GET USERS (ADMIN)
export const getUsers = catchAsync(async (req: Request, res: Response) => {
  const result = await getList(req.query);
  res.json({ message: true, data: result.users, pagination: result.pagination });
});

// GET USER BY ID
export const getUserById = catchAsync(async (req: Request, res: Response) => {
  const user = await getById(req.params.id);
  res.json({ message: "Lấy thông tin user thành công", data: user });
});

// UPDATE USER
export const updateUser = catchAsync(async (req: Request, res: Response) => {
  const updated = await update(req.params.id, req.body, req.user!._id);

  res.json({ message: "Cập nhật user thành công", data: updated });
});

// ASSIGN ROLE (TASK-002, Việc 2) — wire lại assignRole() vốn trước đây là
// dead code, dùng permission riêng USER_ASSIGN_ROLE (xem user.routes.ts).
export const assignUserRole = catchAsync(async (req: Request, res: Response) => {
  const updated = await assignRole(
    req.params.id,
    req.body.roleId,
    req.user!._id,
    req.body.resetPermissions,
  );

  res.json({ message: "Gán role thành công", data: updated });
});

// DELETE USER
export const deleteUser = catchAsync(async (req: Request, res: Response) => {
  await disable(req.params.id, req.user!._id);
  res.json({ message: "User đã bị vô hiệu hóa" });
});

export const restoreUser = catchAsync(async (req: Request, res: Response) => {
  await restore(req.params.id, req.user!._id);
  res.json({ message: "Khôi phục user thành công" });
});

// BULK DELETE (xoá mềm hàng loạt — DEV-060, 2026-09-16)
export const bulkDeleteUsers = catchAsync(async (req: Request, res: Response) => {
  const result = await bulkDisable(req.body.ids, req.user!._id);

  res.json({
    message: `Đã vô hiệu hoá ${result.deletedIds.length}/${req.body.ids.length} user`,
    data: result,
  });
});

// BULK RESTORE (khôi phục hàng loạt — DEV-062, 2026-09-17)
export const bulkRestoreUsers = catchAsync(async (req: Request, res: Response) => {
  const result = await bulkRestore(req.body.ids, req.user!._id);

  res.json({
    message: `Đã khôi phục ${result.deletedIds.length}/${req.body.ids.length} user`,
    data: result,
  });
});

// CHANGE PASSWORD
export const changePasswordUser = catchAsync(
  async (req: Request, res: Response) => {
    await changePassword(
      req.user!._id,
      req.body.oldPassword,
      req.body.newPassword,
    );

    res.json({ message: "Đổi mật khẩu thành công" });
  },
);

// ADMIN RESET PASSWORD
export const resetPasswordByAdmin = catchAsync(
  async (req: Request, res: Response) => {
    await resetPassword(req.params.id, req.body.newPassword, req.user!._id);

    res.json({ message: "Reset mật khẩu thành công" });
  },
);

// ADMIN RESET 2FA — Roadmap C1 (DEV-068, 2026-09-19)
export const resetTwoFactorByAdmin = catchAsync(
  async (req: Request, res: Response) => {
    await resetTwoFactor(req.params.id, req.user!._id);

    res.json({ message: "Đã tắt xác thực 2 lớp cho user" });
  },
);

// ADMIN — QUẢN LÝ PHIÊN ĐĂNG NHẬP CỦA USER KHÁC — Roadmap C2 (DEV-069, 2026-09-19)
export const listUserSessionsByAdmin = catchAsync(
  async (req: Request, res: Response) => {
    const sessions = await listUserSessions(req.params.id);

    res.json({ message: "Lấy danh sách phiên đăng nhập thành công", data: sessions });
  },
);

export const revokeUserSessionByAdmin = catchAsync(
  async (req: Request, res: Response) => {
    await revokeUserSession(req.params.id, req.params.sessionId, req.user!._id);

    res.json({ message: "Đã thu hồi phiên đăng nhập của user" });
  },
);

// ADMIN — GIÁM SÁT TOÀN BỘ PHIÊN ĐĂNG NHẬP — Roadmap C3 (DEV-070, 2026-09-19)
export const listAllSessionsByAdmin = catchAsync(
  async (req: Request, res: Response) => {
    const result = await listAllSessions(req.query as any);

    res.json({ message: true, data: result.data, pagination: result.pagination });
  },
);

// GET ME
export const getMe = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!._id;
  const user = await getMeService(userId);

  res.json({
    success: "Lấy thông tin cá nhân thành công",
    data: user,
  });
});

// UPDATE ME
export const updateMe = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!._id;
  const updatedUser = await updateMeService(userId, req.body);

  res.json({
    success: true,
    message: "Cập nhật thông tin cá nhân thành công",
    data: updatedUser,
  });
});


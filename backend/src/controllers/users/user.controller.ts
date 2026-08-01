
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
  restore,
  resetPassword,
  changePassword,
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

// DELETE USER
export const deleteUser = catchAsync(async (req: Request, res: Response) => {
  await disable(req.params.id, req.user!._id);
  res.json({ message: "User đã bị vô hiệu hóa" });
});

export const restoreUser = catchAsync(async (req: Request, res: Response) => {
  await restore(req.params.id, req.user!._id);
  res.json({ message: "Khôi phục user thành công" });
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


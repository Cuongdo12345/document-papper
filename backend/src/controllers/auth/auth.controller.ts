import { Request, Response } from "express";
import * as AuthService from "../../services/auth/auths.service";
import { catchAsync } from "../../shared/utils/catchAsync";
// ================================ CONTROLLER MỚI SỬ DỤNG SERVICE ================================
// Controller chỉ còn nhiệm vụ nhận request, gọi service và trả response
// Còn logic xử lý sẽ được chuyển hết vào service để dễ bảo trì, test và tái sử dụng
//
// ⚠️ SỬA (theo yêu cầu): `auths.service.ts` đã chuyển từ `class AuthService`
// (static methods) sang named function export thuần. Đổi
// `import { AuthService } from "..."` sang `import * as AuthService from "..."`
// (namespace import) — cách gọi `AuthService.login(...)`,
// `AuthService.refresh(...)`... ở dưới KHÔNG cần đổi gì thêm.
// ==========================================================================================================

// ⚠️ MỚI: handler cho tính năng register — trước đây không tồn tại trong
// controller (dù service đã có `register()`).
export const register = catchAsync(async (req: Request, res: Response) => {
  const { username, email, password, fullName } = req.body;

  const result = await AuthService.register({
    username,
    email,
    password,
    fullName,
  });

  res.status(201).json({
    message: "Đăng ký tài khoản thành công",
    user: result,
  });
});

export const login = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.login(req.body.username, req.body.password);

  res.json({
    message: "Đăng nhập thành công",
    data: result,
  });
});

export const refreshAccessToken = catchAsync(
  async (req: Request, res: Response) => {
    const result = await AuthService.refresh(req.body.refreshToken);
    res.json(result);
  },
);

export const logout = catchAsync(async (req: Request, res: Response) => {
  await AuthService.logout(req.body.refreshToken, req.user!._id);
  res.json({ message: "Đăng xuất thành công" });
});

// ⚠️ SỬA (nâng cấp gửi mail): `AuthService.forgotPassword` giờ LUÔN trả
// `{ silent: true }` cho cả 2 nhánh (user tồn tại/không tồn tại) — token reset
// được gửi qua EMAIL thay vì trả trong response. Response luôn là 1 message
// chung, không còn field `resetToken`.
export const forgotPassword = catchAsync(
  async (req: Request, res: Response) => {
    await AuthService.forgotPassword(req.body.username);

    res.json({
      message:
        "Nếu tài khoản tồn tại, hệ thống đã gửi email hướng dẫn đặt lại mật khẩu",
    });
  },
);

export const resetPassword = catchAsync(async (req: Request, res: Response) => {
  await AuthService.resetPassword(req.body.token, req.body.newPassword);

  res.json({ message: "Đặt lại mật khẩu thành công" });
});

// ==========================================================================================================

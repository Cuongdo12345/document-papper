import { Request, Response } from "express";
import * as AuthService from "../../services/auth/auths.service";
import { catchAsync } from "../../shared/utils/catchAsync";

/**
 * Roadmap C2 (Quản lý phiên đăng nhập, DEV-069, 2026-09-19) — đọc User-Agent
 * + IP của request HIỆN TẠI để đính kèm khi cấp token (`login`/
 * `verifyLoginOtp`) hoặc để so khớp "phiên hiện tại" (`listSessions`).
 */
const getSessionMeta = (req: Request) => ({
  userAgent: req.headers["user-agent"],
  ip: req.ip,
});
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
  const result = await AuthService.login(req.body.username, req.body.password, getSessionMeta(req));

  // Roadmap C1 (DEV-068, 2026-09-19) — user đã bật 2FA: `result` chỉ có
  // `{requiresTwoFactor, username}`, CHƯA có token — message phải phản ánh
  // đúng bước tiếp theo, không nói "đăng nhập thành công" khi chưa xong.
  res.json({
    message: "requiresTwoFactor" in result ? "Đã gửi mã xác thực qua email, vui lòng nhập mã để hoàn tất đăng nhập" : "Đăng nhập thành công",
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

// Roadmap C1 (Xác thực 2 lớp qua email OTP, DEV-068, 2026-09-19)

export const verifyLoginOtp = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.verifyLoginOtp(req.body.username, req.body.code, getSessionMeta(req));

  res.json({
    message: "Đăng nhập thành công",
    data: result,
  });
});

export const enableTwoFactor = catchAsync(async (req: Request, res: Response) => {
  await AuthService.enableTwoFactor(req.user!._id);

  res.json({ message: "Đã gửi mã xác thực qua email, vui lòng nhập mã để hoàn tất bật xác thực 2 lớp" });
});

export const confirmTwoFactor = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.confirmEnableTwoFactor(req.user!._id, req.body.code);

  res.json({ message: "Đã bật xác thực 2 lớp", data: result });
});

export const disableTwoFactor = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.disableTwoFactor(req.user!._id, req.body.password);

  res.json({ message: "Đã tắt xác thực 2 lớp", data: result });
});

// Roadmap C2 (Quản lý phiên đăng nhập, DEV-069, 2026-09-19)

export const listMySessions = catchAsync(async (req: Request, res: Response) => {
  const sessions = await AuthService.listMySessions(req.user!._id, getSessionMeta(req));

  res.json({ message: "Lấy danh sách phiên đăng nhập thành công", data: sessions });
});

export const revokeMySession = catchAsync(async (req: Request, res: Response) => {
  await AuthService.revokeMySession(req.user!._id, req.params.id);

  res.json({ message: "Đã thu hồi phiên đăng nhập" });
});

// ==========================================================================================================

import { Router } from "express";
import {
  register,
  login,
  refreshAccessToken,
  logout,
  forgotPassword,
  resetPassword,
  verifyLoginOtp,
  enableTwoFactor,
  confirmTwoFactor,
  disableTwoFactor,
  listMySessions,
  revokeMySession
} from "../../controllers/auth/auth.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { validateBody, validateParams } from "../../middlewares/validate.middleware";
import { authRateLimiter } from "../../middlewares/authRateLimiter.middleware";
import { IdParamDTO } from "../../dto/common.dto";
import {
  RegisterDTO,
  LoginDTO,
  RefreshTokenDTO,
  ForgotPasswordDTO,
  ResetPasswordDTO,
  VerifyLoginOtpDTO,
  ConfirmTwoFactorDTO,
  DisableTwoFactorDTO
} from "../../dto/auth/auths.dto";

// ⚠️ SỬA (review Auth module):
//  1. Gắn `authRateLimiter` cho "/login" và "/refresh-token" — trước đây 2
//     route này không có bất kỳ giới hạn nào, chỉ "/forgot-password" có limiter
//     riêng ở tầng service. Brute-force login/refresh trước đó không bị chặn.
//  2. Gắn `validateBody` cho tất cả route nhận body — DTO trước đây đã được
//     viết nhưng chưa từng "nối dây" vào route nào.
//  3. Bỏ import `performanceMiddleware`/`authorizePermission` — cả 2 được
//     import ở bản gốc nhưng KHÔNG dùng ở route nào trong file này (dead
//     import). Nếu có ý định dùng, cần gắn tường minh vào route tương ứng.
//  4. MỚI: thêm route "/register" — dùng chung `authRateLimiter` (chống tạo
//     hàng loạt tài khoản ảo bằng script), vì trước đây route này không tồn
//     tại dù đã có sẵn `RegisterDTO`. ⚠️ Cân nhắc lại xem có nên để route này
//     PUBLIC hay không — xem ghi chú chi tiết ở `AuthService.register()`.
const router = Router();

router.post("/register", authRateLimiter, validateBody(RegisterDTO), register);
router.post("/login", authRateLimiter, validateBody(LoginDTO), login);
router.post("/refresh-token", authRateLimiter, validateBody(RefreshTokenDTO), refreshAccessToken);
// ⚠️ FIX (2026-09-06): trước đây route này KHÔNG có `validateBody` — controller
// đọc thẳng `req.body.refreshToken` không guard. Khi client gọi thiếu body
// (đúng bug ở `frontend/src/api/auth.api.ts::logout()` trước bản vá), `req.body`
// là `undefined` (không có Content-Type vì không gửi data) => truy cập
// `.refreshToken` ném TypeError chưa được nhận diện => rơi vào nhánh 500 của
// error.middleware.ts thay vì 400 rõ ràng. Tái dùng `RefreshTokenDTO` có sẵn
// (cùng shape `{refreshToken}` như "/refresh-token") — không tạo DTO mới.
router.post("/logout", authenticate, validateBody(RefreshTokenDTO), logout);
router.post("/forgot-password", validateBody(ForgotPasswordDTO), forgotPassword);
// DEV-023/ARCH-26: `authLimiter` chung (app.ts) đã bị gỡ (hợp nhất 2
// rate-limiter trùng cấu hình) — route này trước đây CHỈ được bảo vệ NGẦM
// qua limiter chung đó (không có limiter riêng nào ở đây, khác
// register/login/refresh-token). Gắn tường minh `authRateLimiter` để không
// mất bảo vệ IP-based khi bỏ mount rộng.
router.post("/reset-password", authRateLimiter, validateBody(ResetPasswordDTO), resetPassword);

/* =====================================================================
   XÁC THỰC 2 LỚP (2FA qua email OTP, Roadmap C1, DEV-068, 2026-09-19)
===================================================================== */

// PUBLIC (chưa có access token — đang ở giữa luồng đăng nhập), cùng
// `authRateLimiter` với "/login" (chống brute-force mã OTP theo IP, bổ sung
// cho giới hạn 5-lần-sai theo OTP đã có ở tầng service).
router.post("/login/verify-otp", authRateLimiter, validateBody(VerifyLoginOtpDTO), verifyLoginOtp);

// Self-service — user đã đăng nhập, tự bật/tắt 2FA cho chính mình.
router.post("/2fa/enable", authenticate, authRateLimiter, enableTwoFactor);
router.post("/2fa/confirm", authenticate, authRateLimiter, validateBody(ConfirmTwoFactorDTO), confirmTwoFactor);
router.post("/2fa/disable", authenticate, validateBody(DisableTwoFactorDTO), disableTwoFactor);

/* =====================================================================
   QUẢN LÝ PHIÊN ĐĂNG NHẬP (Roadmap C2, DEV-069, 2026-09-19) — self-service,
   KHÔNG cần permission riêng (action tự-scope qua req.user!._id, giống
   2fa/enable ở trên).
===================================================================== */

router.get("/sessions", authenticate, listMySessions);
router.delete("/sessions/:id", authenticate, validateParams(IdParamDTO), revokeMySession);

export default router;



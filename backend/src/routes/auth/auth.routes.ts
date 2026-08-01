import { Router } from "express";
import {
  register,
  login,
  refreshAccessToken,
  logout,
  forgotPassword,
  resetPassword
} from "../../controllers/auth/auth.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { validateBody } from "../../middlewares/validate.middleware";
import { authRateLimiter } from "../../middlewares/authRateLimiter.middleware";
import {
  RegisterDTO,
  LoginDTO,
  RefreshTokenDTO,
  ForgotPasswordDTO,
  ResetPasswordDTO
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
router.post("/logout", authenticate, logout);
router.post("/forgot-password", validateBody(ForgotPasswordDTO), forgotPassword);
router.post("/reset-password", validateBody(ResetPasswordDTO), resetPassword);

export default router;


// import { Router } from "express";
// import {
//   login,
//   refreshAccessToken,
//   logout,
//   forgotPassword,
//   resetPassword
// } from "../controllers/auth.controller";
// import { authenticate } from "../middlewares/auth.middleware";
// import { validateBody } from "../middlewares/validate.middleware";
// import { authRateLimiter } from "../middlewares/authRateLimiter.middleware";
// import {
//   LoginDTO,
//   RefreshTokenDTO,
//   ForgotPasswordDTO,
//   ResetPasswordDTO
// } from "../dto/auths.dto";

// // ⚠️ SỬA (review Auth module):
// //  1. Gắn `authRateLimiter` cho "/login" và "/refresh-token" — trước đây 2
// //     route này không có bất kỳ giới hạn nào, chỉ "/forgot-password" có limiter
// //     riêng ở tầng service. Brute-force login/refresh trước đó không bị chặn.
// //  2. Gắn `validateBody` cho cả 4 route nhận body — DTO (`LoginDTO`,
// //     `RefreshTokenDTO`, và 2 DTO MỚI `ForgotPasswordDTO`/`ResetPasswordDTO`)
// //     trước đây đã được viết nhưng chưa từng "nối dây" vào route nào.
// //  3. Bỏ import `performanceMiddleware`/`authorizePermission` — cả 2 được
// //     import ở bản gốc nhưng KHÔNG dùng ở route nào trong file này (dead
// //     import). Nếu có ý định dùng, cần gắn tường minh vào route tương ứng.

// const router = Router();

// router.post("/login", authRateLimiter, validateBody(LoginDTO), login);
// router.post("/refresh-token", authRateLimiter, validateBody(RefreshTokenDTO), refreshAccessToken);
// router.post("/logout", authenticate, logout);
// router.post("/forgot-password", validateBody(ForgotPasswordDTO), forgotPassword);
// router.post("/reset-password", validateBody(ResetPasswordDTO), resetPassword);

// export default router;
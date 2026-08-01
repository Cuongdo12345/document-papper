import rateLimit from "express-rate-limit";
import ApiError from "../shared/errors/ApiError";

/**
 * Rate limit cho /login và /refresh-token — khớp với AUTH_MODULE_ANALYSIS.md
 * §10.4 ("20 request / 15 phút"). `/forgot-password` đã có giới hạn riêng ở
 * tầng service (3 req/15 phút/user, dựa trên DB) nên KHÔNG dùng chung limiter
 * này — 2 cơ chế phục vụ 2 mục đích khác nhau (IP-based chống brute-force vs
 * user-based chống spam email) và không nên gộp.
 *
 * ⚠️ Đây là in-memory limiter (per-process). Nếu hệ thống chạy nhiều instance
 * (cluster/PM2/nhiều pod), cần thay `store` bằng 1 store dùng chung (Redis...)
 * để giới hạn có hiệu lực trên toàn cụm, không phải tính riêng từng instance.
 * Nếu project đã có middleware rate-limit dùng chung, NÊN DÙNG LẠI thay vì
 * file này để tránh 2 nguồn đếm request khác nhau.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(ApiError.tooManyRequests("Quá nhiều yêu cầu, vui lòng thử lại sau 15 phút"));
  },
});
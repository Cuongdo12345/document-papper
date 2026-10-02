// shared/utils/trustProxy.util.ts
//
// BR-08 (docs/31_BACKEND_CODE_REVIEW.md, DEV-096, 2026-09-29): parse ENV
// `TRUST_PROXY` cho `app.set("trust proxy", ...)`.
//
// Vì sao cần: khi chạy sau reverse proxy (kế hoạch deploy: Cloudflare →
// Nginx → Node, xem `docs/development/PRODUCTION_DEPLOYMENT_PLAN.md`),
// không bật trust proxy thì `req.ip` là IP của proxy → rate limit đăng
// nhập/refresh/OTP (`authRateLimiter`, đếm theo IP) DÙNG CHUNG cho mọi người
// dùng, và IP lưu ở "Phiên đăng nhập" (DEV-069) sai.
//
// Quy ước (user chọn ENV, mặc định TẮT):
//   - bỏ trống / "0" / "false"  → `false` (tắt — dev chạy trực tiếp).
//   - số nguyên N ≥ 1           → N = số lớp proxy đứng trước Node. Express
//     lấy IP cách N bước từ phải sang trong `X-Forwarded-For`. Cloudflare +
//     Nginx = 2.
//   - "true" hoặc giá trị khác  → throw (fail-fast lúc khởi động). `true` tin
//     MỌI hop → client tự gửi `X-Forwarded-For` giả là lách được rate limit
//     (express-rate-limit v8 cũng cảnh báo ERR_ERL_PERMISSIVE_TRUST_PROXY).
//     Danh sách IP/subnet (Express có hỗ trợ) chưa cần — thêm khi có nhu cầu.

export const parseTrustProxy = (raw: string | undefined): false | number => {
  const value = (raw ?? "").trim().toLowerCase();

  if (value === "" || value === "0" || value === "false") return false;

  if (/^\d+$/.test(value)) return Number(value);

  throw new Error(
    `❌ TRUST_PROXY không hợp lệ: "${raw}". Chỉ nhận số lớp proxy (vd 2 cho Cloudflare + Nginx), ` +
      `hoặc bỏ trống/0/false để tắt. KHÔNG dùng "true" (cho phép giả IP qua X-Forwarded-For).`,
  );
};

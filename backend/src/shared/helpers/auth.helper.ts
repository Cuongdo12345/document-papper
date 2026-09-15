import jwt from "jsonwebtoken";
import crypto from "crypto";

/// 🎯 Helper functions related to authentication (token generation, hashing, etc.)
// Các hàm helper liên quan đến xác thực (tạo token, hash, v.v.)
// Ví dụ: generateAccessToken, generateRefreshToken, hashResetToken, generateResetToken, v.v.
// Các hàm này sẽ được sử dụng trong các service như AuthService, UserService, v.v. để thực hiện các chức năng liên quan
// đến xác thực và bảo mật

/**
 * 🎯 Generate Access Token
 *
 * ⚠️ CẬP NHẬT: mọi nơi sinh access token (login, refresh) BẮT BUỘC đi qua hàm
 * này — không tự `jwt.sign(...)` riêng lẻ nữa. Trước đây `auths.service.ts` →
 * `refresh()` tự viết lại `jwt.sign` với payload khác (`{ id, role, department }`)
 * và hard-code lại `expiresIn: "8h"` trùng lặp, khiến token từ refresh có shape
 * khác token từ login và không tự đồng bộ khi đổi thời hạn ở đây. Payload
 * chỉ gồm `{ id }` — giữ đúng logic gốc của `login()` (role/department đã được
 * cố tình bỏ khỏi token, client luôn phải đọc từ `user` object trả về, không
 * decode JWT).
 * Thêm tường minh `algorithm: "HS256"` để khớp rõ ràng với whitelist
 * `algorithms: ["HS256"]` ở `authenticate` middleware (trước đây phụ thuộc vào
 * default ngầm định của thư viện).
 *
 * DEV-021/SEC-04: comment ở trên ĐÃ nói đúng ý định "chỉ gồm {id}" từ trước,
 * nhưng chữ ký hàm (`payload: {id; role?; department?}`) vẫn CHO PHÉP truyền
 * thêm `role`/`department`, và CẢ 2 nơi gọi thực tế (`login()`,`refresh()`
 * trong `auths.service.ts`) ĐỀU truyền đủ — comment và code không khớp
 * nhau. JWT chỉ ký (sign), không mã hoá, nên `role`/`department` object đầy
 * đủ (đã populate) bị lộ cho bất kỳ ai `base64-decode` access token, dù
 * `authenticate` middleware (`auth.middleware.ts`) xác nhận CHỈ dùng
 * `decoded.id` để load lại user/role/department từ DB — phần payload dư
 * thừa không phục vụ mục đích gì. Đã siết lại chữ ký hàm còn đúng `{id}`
 * và sửa 2 nơi gọi để khớp thật với comment.
 */
export const generateAccessToken = (payload: { id: any }) => {
  return jwt.sign(payload, process.env.JWT_SECRET as string, {
    expiresIn: "8h",
    algorithm: "HS256",
  });
};

/**
 * 🎯 Generate Refresh Token
 */
export const generateRefreshToken = (userId: any) => {
  return jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET as string, {
    expiresIn: "7d",
    algorithm: "HS256",
  });
};

/**
 * 🎯 Hash Token (SHA256)
 *
 * Dùng cho forgot/reset password (`PasswordResetToken.token`), và từ
 * DEV-014/MEDIUM-05, dùng lại cho refresh token (`RefreshToken.token`) —
 * trước đây refresh token lưu PLAINTEXT trong DB, khác hẳn quy ước hash đã
 * áp dụng cho reset token. Cùng 1 hàm hash (SHA-256, không salt — chấp nhận
 * được vì input luôn là token ngẫu nhiên entropy cao do server tự sinh,
 * không phải password người dùng chọn) để tránh 2 hàm hash trùng logic.
 */
export const hashResetToken = (token: string) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

/**
 * 🎯 Generate Raw Reset Token
 */
export const generateResetToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

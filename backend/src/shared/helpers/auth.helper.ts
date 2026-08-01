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
 * khác token từ login và không tự đồng bộ khi đổi thời hạn ở đây. Payload vẫn
 * chỉ gồm `{ id }` — giữ đúng logic gốc của `login()` (role/department đã được
 * cố tình bỏ khỏi token, client luôn phải đọc từ `user` object trả về, không
 * decode JWT).
 * Thêm tường minh `algorithm: "HS256"` để khớp rõ ràng với whitelist
 * `algorithms: ["HS256"]` ở `authenticate` middleware (trước đây phụ thuộc vào
 * default ngầm định của thư viện).
 */
export const generateAccessToken = (payload: {
  id: any;
  role?: any;
  department?: any;
}) => {
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
 * 🎯 Hash Reset Token (SHA256)
 * dùng cho forgot/reset password
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

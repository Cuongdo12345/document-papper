import jwt from "jsonwebtoken";
import crypto from "crypto";

/// 🎯 Helper functions related to authentication (token generation, hashing, etc.)
// Các hàm helper liên quan đến xác thực (tạo token, hash, v.v.)
// Ví dụ: generateAccessToken, generateRefreshToken, hashResetToken, generateResetToken, v.v.
// Các hàm này sẽ được sử dụng trong các service như AuthService, UserService, v.v. để thực hiện các chức năng liên quan 
// đến xác thực và bảo mật

/**
 * 🎯 Generate Access Token
 */
export const generateAccessToken = (payload: {
  id: any;
  role: string;
  department: any;
}) => {
  return jwt.sign(
    payload,
    process.env.JWT_SECRET as string,
    { expiresIn: "8h" }
  );
};

/**
 * 🎯 Generate Refresh Token
 */
export const generateRefreshToken = (userId: any) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_REFRESH_SECRET as string,
    { expiresIn: "7d" }
  );
};

/**
 * 🎯 Hash Reset Token (SHA256)
 * dùng cho forgot/reset password
 */
export const hashResetToken = (token: string) => {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
};

/**
 * 🎯 Generate Raw Reset Token
 */
export const generateResetToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

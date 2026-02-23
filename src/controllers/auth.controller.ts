import { Request, Response } from "express";
import { AuthService } from "../services/auths.service";

// ================================ CONTROLLER MỚI SỬ DỤNG SERVICE ================================
// Controller chỉ còn nhiệm vụ nhận request, gọi service và trả response
// Còn logic xử lý sẽ được chuyển hết vào service để dễ bảo trì, test và tái sử dụng
// Ví dụ: logic login sẽ được chuyển hết vào AuthService.login
// Controller chỉ cần gọi AuthService.login và trả kết quả về cho client
// ==========================================================================================================
export const login = async (req: Request, res: Response) => {
  try {
    const result = await AuthService.login(
      req.body.username,
      req.body.password
    );

    res.json(result);
  } catch (error: any) {
    res.status(401).json({ message: error.message });
  }
};

export const refreshAccessToken = async (req: Request, res: Response) => {
  try {
    const result = await AuthService.refresh(req.body.refreshToken);
    res.json(result);
  } catch (error: any) {
    res.status(401).json({ message: error.message });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    await AuthService.logout(req.body.refreshToken, req.user!.id);
    res.json({ message: "Đăng xuất thành công" });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const result = await AuthService.forgotPassword(req.body.username);

    if (result.silent) {
      return res.json({
        message: "Nếu tài khoản tồn tại, hệ thống sẽ xử lý yêu cầu"
      });
    }

    res.json({
      message: "Yêu cầu reset mật khẩu đã được tạo",
      resetToken: result.resetToken
    });

  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    await AuthService.resetPassword(
      req.body.token,
      req.body.newPassword
    );

    res.json({ message: "Đặt lại mật khẩu thành công" });

  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// ==========================================================================================================

// import { Request, Response } from "express";
// import jwt from "jsonwebtoken";
// import bcrypt from "bcrypt";
// import User from "../models/user.model";
// import RefreshToken from "../models/refreshToken.model";
// import UserAudit from "../models/userAudit.model";
// import PasswordResetToken from "../models/passwordResetToken.model";
// import crypto from "crypto";


// /**
//  * LOGIN
//  */
// export const login = async (req: Request, res: Response) => {
//   try {
//     const { username, password } = req.body;

//     const user = await User.findOne({ username }).select("+password");

//     if (!user || !user.isActive) {
//       return res.status(401).json({
//         message: "Tài khoản không hợp lệ hoặc đã bị khóa"
//       });
//     }

//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) {
//       return res.status(401).json({
//         message: "Sai tài khoản hoặc mật khẩu"
//       });
//     }

//     // ACCESS TOKEN
//     const accessToken = jwt.sign(
//       {
//         id: user._id.toString(),
//         role: user.role,
//         department: user.department
//       },
//       process.env.JWT_SECRET as string,
//       { expiresIn: "8h" }
//     );

//     // REFRESH TOKEN
//     const refreshToken = jwt.sign(
//       { id: user._id.toString() },
//       process.env.JWT_REFRESH_SECRET as string,
//       { expiresIn: "7d" }
//     );

//     await RefreshToken.create({
//       user: user._id,
//       token: refreshToken,
//       expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
//     });

//     await UserAudit.create({
//       user: user._id,
//       action: "LOGIN",
//       performedBy: user._id,
//       note: "User đăng nhập hệ thống"
//     });

//     res.json({
//       accessToken,
//       refreshToken,
//       user: {
//         id: user._id,
//         username: user.username,
//         role: user.role,
//         department: user.department
//       }
//     });
//   } catch (error) {
//     res.status(500).json({
//       message: "Lỗi đăng nhập",
//       error
//     });
//   }
// };

// /**
//  * REFRESH ACCESS TOKEN
//  */
// export const refreshAccessToken = async (req: Request, res: Response) => {
//   try {
//     const { refreshToken } = req.body;

//     if (!refreshToken) {
//       return res.status(401).json({
//         message: "Thiếu refresh token"
//       });
//     }

//     const storedToken = await RefreshToken.findOne({
//       token: refreshToken,
//       revoked: false
//     }).populate("user");

//     if (!storedToken) {
//       return res.status(401).json({
//         message: "Refresh token không hợp lệ"
//       });
//     }

//     const user = storedToken.user as any;

//     if (!user.isActive) {
//       return res.status(403).json({
//         message: "Tài khoản đã bị vô hiệu hóa"
//       });
//     }

//     // verify refresh token
//     jwt.verify(
//       refreshToken,
//       process.env.JWT_REFRESH_SECRET as string
//     );

//     const newAccessToken = jwt.sign(
//       {
//         id: user._id.toString(),
//         role: user.role,
//         department: user.department
//       },
//       process.env.JWT_SECRET as string,
//       { expiresIn: "8h" }
//     );

//     res.json({
//       accessToken: newAccessToken
//     });
//   } catch (error) {
//     res.status(401).json({
//       message: "Refresh token hết hạn hoặc không hợp lệ"
//     });
//   }
// };

// /**
//  * LOGOUT (REVOKE REFRESH TOKEN)
//  */
// export const logout = async (req: Request, res: Response) => {
//   try {
//     const { refreshToken } = req.body;

//     if (!refreshToken) {
//       return res.status(400).json({
//         message: "Thiếu refresh token"
//       });
//     }

//     await RefreshToken.findOneAndUpdate(
//       { token: refreshToken },
//       { revoked: true }
//     );

//     await UserAudit.create({
//       user: req.user!.id,
//       action: "LOGOUT",
//       performedBy: req.user!.id,
//       note: "User đăng xuất"
//     });

//     res.json({
//       message: "Đăng xuất thành công"
//     });
//   } catch (error) {
//     res.status(500).json({
//       message: "Lỗi logout",
//       error
//     });
//   }
// };


// // 🎯 TỔNG QUAN LUỒNG MỚI
// // Khi user gọi forgot-password:
// // Check user tồn tại + isActive
// // Kiểm tra rate limit (3 lần / 15 phút)
// // token reset cũ
// // Sinh token random
// // Hash token → lưu DB
// // Ghi Audit
// // Trả token (test / IT nội bộ

// /**
//  * FORGOT PASSWORD
//  * - Hash token
//  * - Limit 3 request / 15 phút
//  * - Xóa token cũ
//  */
// export const forgotPassword = async (req: Request, res: Response) => {
//   try {
//     const { username } = req.body;

//     if (!username) {
//       return res.status(400).json({
//         message: "Vui lòng nhập username"
//       });
//     }

//     const user = await User.findOne({ username });

//     // Không tiết lộ user có tồn tại hay không
//     if (!user || !user.isActive) {
//       return res.json({
//         message: "Nếu tài khoản tồn tại, hệ thống sẽ xử lý yêu cầu"
//       });
//     }

//     const now = new Date();
//     const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);

//     // 🔐 LIMIT 3 REQUEST / 15 PHÚT
//     const requestCount = await PasswordResetToken.countDocuments({
//       user: user._id,
//       createdAt: { $gte: fifteenMinutesAgo }
//     });

//     if (requestCount >= 3) {
//       return res.status(429).json({
//         message: "Bạn đã yêu cầu quá nhiều lần. Vui lòng thử lại sau 15 phút."
//       });
//     }

//     // ❌ XÓA TOKEN RESET CŨ
//     await PasswordResetToken.deleteMany({
//       user: user._id
//     });

//     // 🔑 TẠO TOKEN
//     const rawToken = crypto.randomBytes(32).toString("hex");

//     // 🔐 HASH TOKEN TRƯỚC KHI LƯU
//     const hashedToken = crypto
//       .createHash("sha256")
//       .update(rawToken)
//       .digest("hex");

//     await PasswordResetToken.create({
//       user: user._id,
//       token: hashedToken,
//       expiresAt: new Date(now.getTime() + 15 * 60 * 1000) // 15 phút
//     });

//     // 🧾 AUDIT
//     await UserAudit.create({
//       user: user._id,
//       action: "FORGOT_PASSWORD",
//       performedBy: user._id,
//       note: "User yêu cầu reset mật khẩu"
//     });

//     /**
//      * ⚠️ THỰC TẾ:
//      * - Production: gửi rawToken qua email nội bộ
//      * - Test / IT: trả token để test Postman
//      */
//     res.json({
//       message: "Yêu cầu reset mật khẩu đã được tạo",
//       resetToken: rawToken
//     });
//   } catch (error) {
//     res.status(500).json({
//       message: "Lỗi quên mật khẩu",
//       error
//     });
//   }
// };

// /**
//  * RESET PASSWORD BY TOKEN
//  */
// export const resetPassword = async (req: Request, res: Response) => {
//   try {
//     const { token, newPassword } = req.body;

//     if (!token || !newPassword) {
//       return res.status(400).json({
//         message: "Thiếu token hoặc mật khẩu mới"
//       });
//     }

//     // 🔐 HASH TOKEN ĐỂ SO SÁNH
//     const hashedToken = crypto
//       .createHash("sha256")
//       .update(token)
//       .digest("hex");

//     const resetToken = await PasswordResetToken.findOne({
//       token: hashedToken,
//       used: false,
//       expiresAt: { $gt: new Date() }
//     }).populate("user");

//     if (!resetToken) {
//       return res.status(400).json({
//         message: "Token không hợp lệ hoặc đã hết hạn"
//       });
//     }

//     const user = resetToken.user as any;

//     if (!user.isActive) {
//       return res.status(403).json({
//         message: "Tài khoản đã bị vô hiệu hóa"
//       });
//     }

//     user.password = await bcrypt.hash(newPassword, 10);
//     await user.save();

//     resetToken.used = true;
//     await resetToken.save();

//     // 🔥 FORCE LOGOUT
//     await RefreshToken.updateMany(
//       { user: user._id },
//       { revoked: true }
//     );

//     await UserAudit.create({
//       user: user._id,
//       action: "RESET_PASSWORD",
//       performedBy: user._id,
//       note: "User reset mật khẩu bằng token"
//     });

//     res.json({
//       message: "Đặt lại mật khẩu thành công"
//     });
//   } catch (error) {
//     res.status(500).json({
//       message: "Lỗi reset mật khẩu",
//       error
//     });
//   }
// };




import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import crypto from "crypto";
import User from "../models/user.model";
import RefreshToken from "../models/refreshToken.model";
import UserAudit from "../models/userAudit.model";
import PasswordResetToken from "../models/passwordResetToken.model";
import ApiError from "../shared/errors/ApiError";
import {
  generateAccessToken,
  generateRefreshToken,
  hashResetToken,
  generateResetToken
} from "../shared/helpers/auth.helper";

export class AuthService {

  /**
   * LOGIN
   * Kiểm tra username + password
   * Kiểm tra isActive
   * Gộp permissions từ role + user vào token
   * Lưu refresh token vào DB để quản lý
   * Ghi log audit
   * Trả về access token + refresh token + thông tin user (không bao gồm password)
   */
  static async login(username: string, password: string) {
    const user = await User.findOne({ username }).select("+password");

    if (!user || !user.isActive) {
      throw ApiError.unauthorized("Tài khoản không hợp lệ hoặc đã bị khóa");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw ApiError.badRequest("Mật khẩu không đúng");
    }

    // const accessToken = jwt.sign(
    //   {
    //     id: user._id.toString(),
    //     role: user.role,
    //     department: user.department
    //   },
    //   process.env.JWT_SECRET as string,
    //   { expiresIn: "8h" }
    // );

    // const refreshToken = jwt.sign(
    //   { id: user._id.toString() },
    //   process.env.JWT_REFRESH_SECRET as string,
    //   { expiresIn: "7d" }
    // );

    const accessToken = generateAccessToken({
        id: user._id.toString(),
        role: user.role,
        department: user.department
      });

    const refreshToken = generateRefreshToken(user._id.toString());
    
    // Lưu refresh token vào database để quản lý (có thể thêm trường revoked để thu hồi token khi cần)
    await RefreshToken.create({
      user: user._id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });
    
    // Ghi log audit
    await UserAudit.create({
      user: user._id,
      action: "LOGIN",
      performedBy: user._id,
      note: "User đăng nhập hệ thống"
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        department: user.department
      }
    };
  }

  /**
   * REFRESH ACCESS TOKEN
   * Kiểm tra refresh token có tồn tại trong DB và chưa bị thu hồi
   * Kiểm tra user liên quan đến token có tồn tại và isActive
   * Nếu hợp lệ, tạo mới access token và trả về
   * Nếu không hợp lệ, trả về lỗi
   * Không cần tạo refresh token mới, vẫn dùng token cũ cho đến khi hết hạn hoặc bị thu hồi
   */
  static async refresh(refreshToken: string) {
    if (!refreshToken) {
      throw ApiError.badRequest("REFRESH_TOKEN_REQUIRED");
    }

    const storedToken = await RefreshToken.findOne({
      token: refreshToken,
      revoked: false
    }).populate("user");

    if (!storedToken) {
      throw ApiError.badRequest("Refresh token không hợp lệ hoặc đã bị thu hồi");
    }

    const user: any = storedToken.user;

    if (!user.isActive) {
      throw ApiError.badRequest("Tài khoản đã bị khóa");
    }

    jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET as string
    );

    const newAccessToken = jwt.sign(
      {
        id: user._id.toString(),
        role: user.role,
        department: user.department
      },
      process.env.JWT_SECRET as string,
      { expiresIn: "8h" }
    );

    return { accessToken: newAccessToken };
  }

  /**
   * LOGOUT
   * Kiểm tra refresh token có tồn tại trong DB
   * Đánh dấu token là revoked để không thể sử dụng lại
   * Ghi log audit
   * Trả về thành công
   * Nếu không có token hoặc token không hợp lệ, vẫn trả về thành công để tránh leak thông tin về token hợp lệ hay không
   */
  static async logout(refreshToken: string, userId: any) {
    if (!refreshToken) {
      throw ApiError.badRequest("token đăng xuất không được cung cấp");
    }

    await RefreshToken.findOneAndUpdate(
      { token: refreshToken },
      { revoked: true }
    );

    await UserAudit.create({
      user: userId,
      action: "LOGOUT",
      performedBy: userId,
      note: "User đăng xuất"
    });

    return true;
  }

  /**
   * FORGOT PASSWORD
   * Kiểm tra username có tồn tại và isActive
   * Giới hạn số lần yêu cầu reset password trong 15 phút (ví dụ: 3 lần)
   * Tạo token reset password (có thể dùng crypto.randomBytes + hash để tăng bảo mật)
   * Lưu token vào DB với thông tin user và thời gian hết hạn (ví dụ: 15 phút)
   * Gửi email cho user với link chứa token reset password (ví dụ: https://yourapp.com/reset-password?token=xxx)
   * Ghi log audit
   * Trả về thành công (không leak thông tin về username có tồn tại hay không)
   * Nếu username không tồn tại hoặc tài khoản bị khóa, vẫn trả về thành công để tránh leak thông tin về user hợp lệ hay không
   * Nếu quá nhiều yêu cầu reset password trong 15 phút, trả về lỗi để tránh spam và tấn công từ chối dịch vụ (DoS)
   * Xóa các token reset password cũ chưa sử dụng để tránh tồn tại nhiều token cùng
   * Có thể thêm trường used vào token để đánh dấu đã sử dụng, tránh dùng lại token cũ nếu user yêu cầu reset password nhiều lần trong thời gian ngắn
   * Sử dụng hash để lưu token reset password trong DB để tăng bảo mật, tránh trường hợp token bị lộ ra ngoài có thể sử dụng trực tiếp để reset password
    * Khi user reset password thành công, đánh dấu token là đã sử dụng hoặc xóa token để tránh dùng lại
    * Khi user reset password thành công, thu hồi tất cả refresh token hiện tại của user để buộc đăng nhập lại với mật khẩu mới
    * Ghi log audit khi user yêu cầu reset password và khi user reset password thành công để theo dõi hoạt động liên quan đến bảo mật của user
   */
  static async forgotPassword(username: string) {

    if (!username) throw ApiError.badRequest("Username không được để trống");

    const user = await User.findOne({ username });

    // không leak info user
    if (!user || !user.isActive) {
      return { silent: true };
    }

    const now = new Date();
    const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);

    const requestCount = await PasswordResetToken.countDocuments({
      user: user._id,
      createdAt: { $gte: fifteenMinutesAgo }
    });

    if (requestCount >= 3) {
      throw ApiError.badRequest("Quá nhiều yêu cầu reset mật khẩu trong khoảng thời gian 15 phút");
    }

    await PasswordResetToken.deleteMany({ user: user._id });
    
    const rawToken = generateResetToken();
    const hashedToken = hashResetToken(rawToken);
    // const rawToken = crypto.randomBytes(32).toString("hex");

    // const hashedToken = crypto
    //   .createHash("sha256")
    //   .update(rawToken)
    //   .digest("hex");

    await PasswordResetToken.create({
      user: user._id,
      token: hashedToken,
      expiresAt: new Date(now.getTime() + 15 * 60 * 1000)
    });

    await UserAudit.create({
      user: user._id,
      action: "FORGOT_PASSWORD",
      performedBy: user._id,
      note: "User yêu cầu reset mật khẩu"
    });

    return { resetToken: rawToken };
  }

  /**
   * RESET PASSWORD BY TOKEN
   * Kiểm tra token có tồn tại trong DB, chưa bị sử dụng và chưa hết hạn
   * Kiểm tra user liên quan đến token có tồn tại và isActive
   * Hash mật khẩu mới và cập nhật cho user 
   * Đánh dấu token là đã sử dụng để tránh dùng lại
   * Thu hồi tất cả refresh token hiện tại của user để buộc đăng nhập lại với mật khẩu mới
   * Ghi log audit
   * Trả về thành công nếu reset password thành công
   * Nếu token không hợp lệ, đã được sử dụng hoặc đã hết hạn, trả về lỗi
   * Nếu user liên quan đến token không tồn tại hoặc đã bị khóa, trả về lỗi
   * Sử dụng hash để so sánh token reset password để tăng bảo mật, tránh trường hợp token bị lộ ra ngoài có thể sử dụng trực tiếp để reset password
   * Khi user reset password thành công, đánh dấu token là đã sử dụng hoặc xóa token để tránh dùng lại
   * Khi user reset password thành công, thu hồi tất cả refresh token hiện tại của user để buộc đăng nhập lại với mật khẩu mới
   * Ghi log audit khi user reset password thành công để theo dõi hoạt động liên quan đến bảo mật của user

   */
  static async resetPassword(token: string, newPassword: string) {

    if (!token || !newPassword) {
      throw ApiError.badRequest("Token hoặc mật khẩu mới không được để trống");
    }

    // const hashedToken = crypto
    //   .createHash("sha256")
    //   .update(token)
    //   .digest("hex");
    const hashedToken = hashResetToken(token);
    const resetToken = await PasswordResetToken.findOne({
      token: hashedToken,
      used: false,
      expiresAt: { $gt: new Date() }
    }).populate("user");

    if (!resetToken) {
      throw ApiError.badRequest("Token reset mật khẩu không hợp lệ");
    }

    const user: any = resetToken.user;

    if (!user.isActive) {
      throw ApiError.badRequest("Tài khoản đã bị khóa");
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    resetToken.used = true;
    await resetToken.save();

    await RefreshToken.updateMany(
      { user: user._id },
      { revoked: true }
    );

    await UserAudit.create({
      user: user._id,
      action: "RESET_PASSWORD",
      performedBy: user._id,
      note: "User reset mật khẩu bằng token"
    });

    return true;
  }
}

import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { Types } from "mongoose";
import { User } from "../models/users/user.model";
import ApiError from "../shared/errors/ApiError";

/**
 * AUTHENTICATE (RBAC READY)
 *
 * Permission KHÔNG được load ở đây — `authorizePermission.middleware.ts`
 * (chạy sau) tự load permission qua cache, giúp middleware này không phải
 * query permission mỗi request.
 *
 * (Không đổi logic so với bản trước — chỉ dọn hẳn 3 phiên bản `authenticate`
 * cũ từng để dạng comment ~150 dòng bên dưới file này. Lịch sử/lý do các
 * phiên bản cũ đã được ghi trong git log; giữ code chết dạng comment dễ gây
 * hiểu nhầm khi audit lại sau này hơn là hữu ích.)
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1. Lấy token
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      throw ApiError.unauthorized("Chưa đăng nhập");
    }

    // 2. Verify token.
    // Sửa A1 (DOCUMENT_SECURITY_ANALYSIS.md — "Trung bình-Cao"): whitelist
    // tường minh thuật toán ký, chỉ chấp nhận HS256 — tránh "algorithm
    // confusion" (đổi giá trị này nếu hệ thống thực tế dùng thuật toán khác).
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!, {
      algorithms: ["HS256"],
    });

    // Sửa A2: validate cấu trúc payload sau khi giải mã trước khi dùng để
    // truy vấn DB — id sai định dạng có thể gây lỗi cast không chuẩn hoá ở
    // tầng dưới.
    if (!decoded?.id || !Types.ObjectId.isValid(decoded.id)) {
      throw ApiError.unauthorized("Token không hợp lệ");
    }

    // 3. Load user từ DB (KHÔNG load permission ở đây)
    const user = await User.findById(decoded.id)
      .select("_id role department isActive")
      .populate("role", "name");

    if (!user || !user.isActive) {
      throw ApiError.unauthorized("User không hợp lệ");
    }

    // 4. Attach vào req (KHÔNG attach permissions)
    req.user = {
      _id: user._id,
      role: user.role as any, // populated
      department: user.department,
      isActive: user.isActive,
      permissions: [], // để authorize xử lý sau
    };

    next();
  } catch (error) {
    // Sửa A4: log lỗi GỐC ở server (giúp phân biệt lỗi hạ tầng như DB down/
    // JWT_SECRET bị undefined với lỗi token thật sự sai/hết hạn), nhưng vẫn
    // trả về đúng 1 message chung cho client — không lộ chi tiết lỗi ra ngoài.
    console.error("[authenticate] Lỗi xác thực:", error);
    next(ApiError.unauthorized("Token không hợp lệ"));
  }
};


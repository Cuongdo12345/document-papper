import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/users/user.model"
import { ROLE_PERMISSIONS } from "../shared/constants/rolePermission.map";
import ApiError from "../shared/errors/ApiError";

/**
 * 
 * COde phân quyền mới
✔ Gộp role permission + user permission
✔ Không query DB mỗi request
✔ Performance tốt
 */
// export const authenticate = (
//   req: Request,
//   res: Response,
//   next: NextFunction,
// ) => {
//   try {
//     //kiểm tra token
//     const token = req.headers.authorization?.split(" ")[1];
//     if (!token) {
//       return res.status(401).json({ message: "Chưa đăng nhập" });
//     }

//     // Giải mã tokenvà lấy thông tin user
//     const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

//     // Lấy permissions từ role + permissions riêng của user
//     const rolePermissions = ROLE_PERMISSIONS[decoded.role] || [];

//     // Gắn thông tin user + permissions vào req
//     req.user = {
//       id: decoded.id,
//       role: decoded.role,
//       permissions: [
//         ...new Set([...rolePermissions, ...(decoded.permissions || [])]),
//       ],
//     };

//     next();
//   } catch {
//     res.status(401).json({ message: "Token không hợp lệ" });
//   }
// };


/**
 * 
 * @param req 
 * @param res 
 * @param next 
 * AUTHENTICATE (RBAC READY)
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // 🔥 1. Lấy token
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      throw ApiError.unauthorized("Chưa đăng nhập");
    }

    // 🔥 2. Verify token
    const decoded: any = jwt.verify(
      token,
      process.env.JWT_SECRET!
    );

    // 🔥 3. Load user từ DB (KHÔNG load permission ở đây)
    const user = await User.findById(decoded.id)
      .select("_id role department isActive")
      .populate("role", "name");

    if (!user || !user.isActive) {
      throw ApiError.unauthorized("User không hợp lệ");
    }

    // 🔥 4. Attach vào req (KHÔNG attach permissions)
    req.user = {
      _id: user._id,
      role: user.role as any, // populated
      department: user.department,
      isActive: user.isActive,
      permissions: [], // để authorize xử lý sau
    };

    next();
  } catch (error) {
    next(ApiError.unauthorized("Token không hợp lệ"));
  }
};


/**
 * 🚀 Mục tiêu refactor
   Chúng ta sẽ chuyển sang:
    ✅ JWT chỉ chứa:
    userId
    roleId
    ✅ Permission sẽ được:
    load từ DB (hoặc cache)
    merge:
    role.permissions
    extraPermissions
    denyPermissions
 */

/**
 * AUTHENTICATE (RBAC READY)
 */
// export const authenticate = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     const token = req.headers.authorization?.split(" ")[1];

//     if (!token) {
//       throw ApiError.unauthorized("Chưa đăng nhập");
//     }

//     const decoded: any = jwt.verify(
//       token,
//       process.env.JWT_SECRET!
//     );

//     // 🔥 Load user + RBAC
//     const user = await User.findById(decoded.id)
//       .populate({
//         path: "role",
//         populate: {
//           path: "permissions",
//         },
//       })
//       .populate("extraPermissions")
//       .populate("denyPermissions");

//     if (!user || !user.isActive) {
//       throw ApiError.unauthorized("User không hợp lệ");
//     }

//     // 🔥 Merge permission
//     const role = user.role as any;
//     const rolePermissions =
//       user.role?.permissions?.map((p: any) => p.name) || [];

//     const extraPermissions =
//       user.extraPermissions?.map((p: any) => p.name) || [];

//     const denyPermissions =
//       user.denyPermissions?.map((p: any) => p.name) || [];

//     // 👉 final permissions
//     const finalPermissions = [
//       ...new Set([
//         ...rolePermissions,
//         ...extraPermissions,
//       ]),
//     ].filter(p => !denyPermissions.includes(p));

//     // 🔥 attach vào req
//     req.user = {
//       _id: user._id,
//       role: user.role,
//       permissions: finalPermissions,
//       department: user.department,
//     };

//     next();
//   } catch (error) {
//     next(ApiError.unauthorized("Token không hợp lệ"));
//   }
// };
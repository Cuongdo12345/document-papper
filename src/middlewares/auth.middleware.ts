import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { ROLE_PERMISSIONS } from "../shared/constants/rolePermission.map";

/**
 * 
 * COde phân quyền mới
✔ Gộp role permission + user permission
✔ Không query DB mỗi request
✔ Performance tốt
 */
export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    //kiểm tra token
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Chưa đăng nhập" });
    }
    
    // Giải mã tokenvà lấy thông tin user
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    
    // Lấy permissions từ role + permissions riêng của user
    const rolePermissions =
      ROLE_PERMISSIONS[decoded.role] || [];

    // Gắn thông tin user + permissions vào req
    req.user = {
      id: decoded.id,
      role: decoded.role,
      permissions: [
        ...new Set([
          ...rolePermissions,
          ...(decoded.permissions || []),
        ]),
      ],
    };

    next();
  } catch {
    res.status(401).json({ message: "Token không hợp lệ" });
  }
};


// interface JwtPayload {
//   id: string;
//   role: "ADMIN" | "USER" | "IT";
//   department?: string;
// }

/**
 * AUTHENTICATE
 * Kiểm tra token + gắn user vào req
 */
// export const authenticate = (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   const authHeader = req.headers.authorization;

//   if (!authHeader || !authHeader.startsWith("Bearer ")) {
//     return res.status(401).json({
//       message: "Unauthorized"
//     });
//   }

//   const token = authHeader.split(" ")[1];

//   try {
//     const decoded = jwt.verify(
//       token,
//       process.env.JWT_SECRET as string
//     ) as JwtPayload;

//     req.user = {
//       id: decoded.id,
//       role: decoded.role,
//       department: decoded.department
//     };

//     next();
//   } catch (error) {
//     return res.status(401).json({
//       message: "Token không hợp lệ hoặc đã hết hạn"
//     });
//   }
// };



import { Request, Response, NextFunction } from "express";
import ApiError from "../shared/errors/ApiError";
import { getCachedPermissions } from "../services/rbac/permission.cache";
/**
 *  AUTHORIZE PERMISSION
 * Kiểm tra quyền truy cập dựa trên permission
 * Quyền cần có để truy cập route
 * Gộp permissions từ role + user
 * Nếu thiếu permission => 403
 * Nếu không có token => 401
 * @param permission
 * @returns
 */
// export const authorizePermission =
//   (permission: string) => (req: Request, res: Response, next: NextFunction) => {
//     if (!req.user) {
//       return res.status(401).json({ message: "Chưa đăng nhập" });
//     }

//     if (!req.user.permissions.includes(permission)) {
//       return res.status(403).json({
//         message: "Không có quyền truy cập",
//         permissionRequired: permission,
//       });
//     }

//     next();
//   };


type AuthorizeOptions = {
  requireAll?: boolean;
};

export const authorizePermission =
  (permissions: string | string[], options?: AuthorizeOptions) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user;

      if (!user) {
        throw ApiError.unauthorized("Chưa đăng nhập");
      }

      // 🔥 SUPER ADMIN BYPASS
      if (user.role?.name === "ADMIN") {
        return next();
      }

      // 🔥 Load permissions từ cache/service
      const userPermissions = await getCachedPermissions(
        user._id.toString()
      );

      const requiredPermissions = Array.isArray(permissions)
        ? permissions
        : [permissions];

      const hasPermission = options?.requireAll
        ? requiredPermissions.every(p =>
            userPermissions.includes(p)
          )
        : requiredPermissions.some(p =>
            userPermissions.includes(p)
          );

      if (!hasPermission) {
        throw ApiError.forbidden("Không có quyền truy cập");
      }

      next();
    } catch (error) {
      next(error);
    }
  };
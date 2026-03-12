import { Request, Response, NextFunction } from "express";

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
export const authorizePermission =
  (permission: string) => (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Chưa đăng nhập" });
    }

    if (!req.user.permissions.includes(permission)) {
      return res.status(403).json({
        message: "Không có quyền truy cập",
        permissionRequired: permission,
      });
    }

    next();
  };

import { Request, Response, NextFunction } from "express";
import ApiError from "../shared/errors/ApiError";
import { getCachedPermissions } from "../services/rbac/permission.cache";
import { Policy } from "../models/rbac/policy.model";

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

/**
 * phần code role-permissions
 */
// type AuthorizeOptions = {
//   requireAll?: boolean;
// };

// export const authorizePermission =
//   (permissions: string | string[], options?: AuthorizeOptions) =>
//   async (req: Request, res: Response, next: NextFunction) => {
//     try {
//       const user = req.user;

//       if (!user) {
//         throw ApiError.unauthorized("Chưa đăng nhập");
//       }

//       // 🔥 SUPER ADMIN BYPASS
//       if (user.role?.name === "ADMIN") {
//         return next();
//       }

//       // 🔥 Load permissions từ cache/service
//       const userPermissions = await getCachedPermissions(
//         user._id.toString()
//       );

//       const requiredPermissions = Array.isArray(permissions)
//         ? permissions
//         : [permissions];

//       const hasPermission = options?.requireAll
//         ? requiredPermissions.every(p =>
//             userPermissions.includes(p)
//           )
//         : requiredPermissions.some(p =>
//             userPermissions.includes(p)
//           );

//       if (!hasPermission) {
//         throw ApiError.forbidden("Không có quyền truy cập");
//       }

//       next();
//     } catch (error) {
//       next(error);
//     }
//   };

/**
 * Phần có role-permission-policies
 */

type AuthorizeOptions = {
  requireAll?: boolean;

  resource?: string;

  action?: string;

  enablePolicies?: boolean;
};

export const authorizePermission =
  (
    permissions: string | string[],
    options?: AuthorizeOptions
  ) =>
  async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const user = req.user;

      // =================================================
      // 1. CHECK LOGIN
      // =================================================

      if (!user) {
        throw ApiError.unauthorized(
          "Chưa đăng nhập"
        );
      }

      // =================================================
      // 2. SUPER ADMIN BYPASS
      // =================================================

      if (user.role?.name === "ADMIN") {
        return next();
      }

      // =================================================
      // 3. LOAD USER PERMISSIONS
      // =================================================

      const userPermissions =
        await getCachedPermissions(
          user._id.toString()
        );

      const requiredPermissions =
        Array.isArray(permissions)
          ? permissions
          : [permissions];

      // =================================================
      // 4. CHECK RBAC PERMISSION
      // =================================================

      const hasPermission =
        options?.requireAll
          ? requiredPermissions.every(p =>
              userPermissions.includes(p)
            )
          : requiredPermissions.some(p =>
              userPermissions.includes(p)
            );

      // =================================================
      // 5. IF HAS RBAC → PASS
      // =================================================

      if (hasPermission) {
        return next();
      }

      // =================================================
      // 6. ABAC POLICY CHECK
      // =================================================

      if (
        options?.enablePolicies &&
        options.resource &&
        options.action
      ) {
        const resource = req.resource;

        const policies = await Policy.find({
          resource: options.resource,
          action: options.action,
        });

        for (const policy of policies) {
          try {
            const fn = new Function(
              "user",
              "resource",
              `
              return ${policy.condition}
            `
            );

            const passed = fn(user, resource);

            if (passed) {
              return next();
            }
          } catch (err) {
            console.error(
              "Policy execute error:",
              err
            );
          }
        }
      }

      // =================================================
      // 7. FORBIDDEN
      // =================================================

      throw ApiError.forbidden(
        "Không có quyền truy cập"
      );
    } catch (error) {
      next(error);
    }
  };
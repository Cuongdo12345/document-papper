import { Request, Response, NextFunction } from "express";
import ApiError from "../shared/errors/ApiError";
import { getCachedPermissions } from "../services/rbac/permission.cache";
import { Policy } from "../models/rbac/policy.model";
import UserAudit from "../models/users/userAudit.model";
import { evaluatePolicyConditionSafely } from "../shared/utils/Policycondition.evaluator";

/**
 *  AUTHORIZE PERMISSION
 * Kiểm tra quyền truy cập dựa trên permission
 * Quyền cần có để truy cập route
 * Gộp permissions từ role + user
 * Nếu thiếu permission => 403
 * Nếu không có token => 401
 * @param permission
 * @returns
 *
 * ⚠️ CẬP NHẬT: bộ "SAFE POLICY CONDITION EVALUATOR" (tokenizer/parser/
 * evaluator chống RCE — B1) đã được TÁCH ra file dùng chung
 * `shared/utils/policyCondition.evaluator.ts`, vì `rbac.service.ts`
 * (createPolicy/updatePolicy) giờ cần dùng lại chính evaluator này để
 * validate cú pháp `condition` NGAY LÚC TẠO/SỬA Policy — tránh 2 bản logic
 * parse điều kiện khác nhau nằm ở 2 nơi. Không đổi hành vi runtime của
 * middleware này so với bản trước.
 */

type AuthorizeOptions = {
  requireAll?: boolean;
  resource?: string;
  action?: string;
  enablePolicies?: boolean;
};

/**
 * Ghi audit khi SUPER ADMIN BYPASS được kích hoạt (Sửa #4, B2 —
 * DOCUMENT_SECURITY_ANALYSIS.md): ghi best-effort (không chặn request nếu
 * ghi audit lỗi) vì đây là thao tác phụ, không phải điều kiện bắt buộc để
 * request tiếp tục.
 *
 * LƯU Ý CHƯA GIẢI QUYẾT HẾT (B2): bypass vẫn dựa trên so khớp CHUỖI
 * `role.name === "ADMIN"` thay vì 1 cờ hệ thống riêng (`isSystemAdmin`) —
 * việc đổi sang cờ riêng đòi hỏi sửa schema `Role`/`User` (ngoài phạm vi
 * file được cung cấp ở lượt này). Ghi rõ TODO để xử lý khi có model đó.
 */
const auditAdminBypass = (userId: any, permissions: string | string[]) => {
  UserAudit.create({
    user: userId,
    action: "AUDIT_DASHBOARD_VIEW", // Không có action riêng cho "PERMISSION_BYPASS" trong
                                     // enum hiện tại (userAudit.model.ts) — TODO: thêm action
                                     // chuyên dụng (vd "ADMIN_BYPASS") khi sửa model UserAudit.
    performedBy: userId,
    note: `ADMIN bypass permission check: ${Array.isArray(permissions) ? permissions.join(",") : permissions}`,
  }).catch((err) => {
    console.error("[authorizePermission] Ghi audit ADMIN bypass thất bại:", err);
  });
};

export const authorizePermission =
  (permissions: string | string[], options?: AuthorizeOptions) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user;

      // =================================================
      // 1. CHECK LOGIN
      // =================================================
      if (!user) {
        throw ApiError.unauthorized("Chưa đăng nhập");
      }

      // =================================================
      // 2. SUPER ADMIN BYPASS
      // =================================================
      if (user.role?.name === "ADMIN") {
        auditAdminBypass(user._id, permissions);
        return next();
      }

      // =================================================
      // 3. LOAD USER PERMISSIONS
      // =================================================
      const userPermissions = await getCachedPermissions(user._id.toString());

      const requiredPermissions = Array.isArray(permissions) ? permissions : [permissions];

      // =================================================
      // 4. CHECK RBAC PERMISSION
      // =================================================
      const hasPermission = options?.requireAll
        ? requiredPermissions.every((p) => userPermissions.includes(p))
        : requiredPermissions.some((p) => userPermissions.includes(p));

      // =================================================
      // 5. IF HAS RBAC → PASS
      // =================================================
      if (hasPermission) {
        return next();
      }

      // =================================================
      // 6. ABAC POLICY CHECK
      // =================================================
      if (options?.enablePolicies && options.resource && options.action) {
        const resource = req.resource;

        const policies = await Policy.find({
          resource: options.resource,
          action: options.action,
        });

        for (const policy of policies) {
          // Guard: `IPolicy.condition` là `string | undefined` (field optional
          // trong schema) — bỏ qua policy không có condition thay vì để lọt
          // xuống evaluator (vốn yêu cầu `string` bắt buộc).
          if (!policy.condition) {
            continue;
          }

          try {
            // Sửa B1: dùng evaluator an toàn dùng chung (không còn định nghĩa
            // trùng lặp ở file này).
            const passed = evaluatePolicyConditionSafely(policy.condition, { user, resource });

            if (passed) {
              return next();
            }
          } catch (err) {
            console.error("Policy execute error:", err);
          }
        }
      }

      // =================================================
      // 7. FORBIDDEN
      // =================================================
      throw ApiError.forbidden("Không có quyền truy cập");
    } catch (error) {
      next(error);
    }
  };


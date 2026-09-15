import { Request, Response, NextFunction } from "express";
import ApiError from "../shared/errors/ApiError";
import { getCachedPermissions } from "../services/rbac/permission.cache";
import { Policy } from "../models/rbac/policy.model";
import UserAudit from "../models/users/userAudit.model";
import { evaluatePolicyConditionSafely } from "../shared/utils/Policycondition.evaluator";
import type { Permission } from "../shared/constants/permission.constant";

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
 * 🔒 DEV-001A Phase B HOÀN TẤT (DEV-047, 2026-09-12): Super-Admin bypass giờ
 * CHỈ đọc cờ security identity bất biến `role.isSystemRole` — đã gỡ bỏ hoàn
 * toàn nhánh so khớp CHUỖI `role.name === "ADMIN"` (lưới đỡ "Phase A") sau
 * khi xác nhận migration `isSystemRole:true` đã chạy xong cho role ADMIN
 * (môi trường DUY NHẤT đang tồn tại của dự án tại thời điểm này — CHƯA có
 * production riêng, xem `docs/development/tasks/DEV-047.md`). Đổi tên role
 * khác thành chuỗi "ADMIN" (nếu vượt qua được guard ở `updateRoleService()`)
 * giờ KHÔNG còn cấp bypass — đóng dứt điểm RV02-01 (role rename hijack).
 */
const auditAdminBypass = (userId: any, permissions: Permission | Permission[]) => {
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
  // DEV-013/ARCH-25: đổi từ `string | string[]` (không ràng buộc kiểu, cho
  // phép drift permission string không bị bắt ở compile-time) sang union
  // type `Permission` lấy trực tiếp từ `PERMISSIONS` catalog
  // (`permission.constant.ts`) — mọi lệnh gọi dùng chuỗi KHÔNG tồn tại
  // trong catalog giờ là lỗi biên dịch, không còn "âm thầm luôn 403".
  (permissions: Permission | Permission[], options?: AuthorizeOptions) =>
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
      // ⚠️ DEV-022/RV02-02: bypass này chạy TRƯỚC bước 3 (nơi
      // `user.denyPermissions` được áp dụng, qua `getUserEffectivePermissions()`
      // ở `permission.service.ts`) — nghĩa là `denyPermissions` KHÔNG có bất
      // kỳ tác dụng nào với user đang giữ role ADMIN, dù field này tồn tại
      // đầy đủ và có API quản lý. Xem thêm comment ở `user.model.ts`.
      if (user.role?.isSystemRole === true) {
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


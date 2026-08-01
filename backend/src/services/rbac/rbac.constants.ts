/**
 * rbac.constants.ts — whitelist field cho phép sửa ở từng entity RBAC.
 *
 * ⚠️ MỚI: đây là lớp phòng thủ thứ 2 (defense-in-depth) cho lỗ hổng mass
 * assignment RBAC đã ghi nhận (B13) — lớp thứ 1 là DTO ở tầng route
 * (`rbac.dto.ts`, Zod tự strip field lạ). Whitelist ở TẦNG SERVICE này đảm
 * bảo dù route có lỡ gắn sai DTO/thiếu validate ở 1 điểm nào đó trong tương
 * lai, service vẫn tự chặn field ngoài whitelist — không dựa 100% vào 1 lớp
 * validate duy nhất. Cùng pattern đã dùng ở `documents.constants.ts`
 * (`DOCUMENT_UPDATE_WHITELIST`).
 *
 * QUAN TRỌNG NHẤT: `permissions` (Role) CỐ TÌNH KHÔNG nằm trong
 * `ROLE_UPDATE_WHITELIST` — đây chính là field mà lỗ hổng B13 lợi dụng
 * (dùng chung `ROLE_UPDATE` để tự gán permission, bypass permission riêng
 * `ROLE_ASSIGN_PERMISSIONS`). Muốn đổi `permissions` của 1 role, BẮT BUỘC
 * phải qua `assignPermissionsToRoleService` (route riêng, permission riêng).
 */

export const ROLE_UPDATE_WHITELIST = ["name"] as const;
export const ROLE_CREATE_WHITELIST = ["name"] as const;

export const PERMISSION_UPDATE_WHITELIST = ["name", "resource", "action", "description"] as const;
export const PERMISSION_CREATE_WHITELIST = ["name", "resource", "action", "description"] as const;

export const POLICY_UPDATE_WHITELIST = ["name", "resource", "action", "condition"] as const;
export const POLICY_CREATE_WHITELIST = ["name", "resource", "action", "condition"] as const;

/**
 * pickWhitelisted — helper dùng chung: chỉ lấy các field nằm trong whitelist
 * từ `payload`, bỏ qua mọi field khác (không throw — route/DTO đã throw 400
 * cho field lạ trước khi tới đây; ở service chỉ cần lọc âm thầm cho chắc).
 */
export const pickWhitelisted = <T extends readonly string[]>(
  payload: Record<string, any>,
  whitelist: T
): Record<string, any> => {
  const result: Record<string, any> = {};
  for (const key of whitelist) {
    if (key in payload) result[key] = payload[key];
  }
  return result;
};
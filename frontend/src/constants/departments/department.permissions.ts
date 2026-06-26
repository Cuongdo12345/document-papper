// src/constants/department.permissions.ts
//
// Nguồn: DEPARTMENT_MODULE_ANALYSIS.md §2, §3 · DEPARTMENT_UI_SPEC.md §11
// Nguyên tắc: KHÔNG check permission string — chỉ check role (hệ thống-wide rule)
// Department permissions KHÔNG có bug mismatch (khác DOCUMENT_READ, USER_READ...)

// ─── Permission Constants (tham khảo — không dùng trực tiếp ở FE) ──────────────

/**
 * Backend permission names — chỉ để tham chiếu/documentation
 * FE KHÔNG check các string này — dùng role-based check qua PrivateRoute + usePermission()
 * Department là module không có bug permission mismatch — RBAC hoạt động đúng
 * Nguồn: DEPARTMENT_MODULE_ANALYSIS.md §3
 */
export const DEPARTMENT_PERMISSIONS = {
  VIEW:        'DEPARTMENT_VIEW',        // GET /api/departments
  VIEW_DETAIL: 'DEPARTMENT_VIEW_DETAIL', // GET /api/departments/:id
  CREATE:      'DEPARTMENT_CREATE',      // POST /api/departments
  UPDATE:      'DEPARTMENT_UPDATE',      // PUT /api/departments/:id
  DELETE:      'DEPARTMENT_DELETE',      // DELETE /api/departments/:id
} as const;

// ─── Role-Based Access (FE strategy) ──────────────────────────────────────────

/**
 * Roles được phép truy cập Department Module
 * Nguồn: DEPARTMENT_MODULE_ANALYSIS.md §2 · FRONTEND_MEMORY_v2.md §19
 *
 * Dùng trong: PrivateRoute allowedRoles={DEPARTMENT_ALLOWED_ROLES}
 */
export const DEPARTMENT_ALLOWED_ROLES = ['ADMIN', 'IT'] as const;

/**
 * Action "Xóa" (Delete) — quyền hạn IT vs ADMIN chưa xác nhận
 * NEED MORE ANALYSIS: DEPARTMENT_MODULE_ANALYSIS.md §2, Tổng kết #1
 *
 * Phương án A (mặc định tạm): Cả ADMIN + IT đều Delete được
 * Phương án B: Chỉ ADMIN Delete — dùng TableAction.hidden: () => roleName !== 'ADMIN'
 *
 * ⚠️ KHÔNG dùng PermissionGate bao quanh DataTable.actions (là render function)
 *    Đúng cách: DataTable actions[].hidden = (record) => !isAdmin
 *    Nguồn: DEPARTMENT_UI_SPEC.md §11
 */
export const DEPARTMENT_DELETE_ROLES = ['ADMIN'] as const; // Tạm thời restrict về ADMIN — cập nhật sau khi xác nhận

// ─── Permission Strategy Summary ─────────────────────────────────────────────
//
// Lớp 1 — Route level:
//   PrivateRoute allowedRoles={['ADMIN', 'IT']}
//   → /departments (SCR-14), /departments/:id (SCR-15)
//   → USER bị chặn tại đây, redirect /403
//
// Lớp 2 — Action level (trong DataTable.actions):
//   actions[].hidden = (record) => !isAdmin  ← Phương án B nếu Delete chỉ ADMIN
//   Không dùng PermissionGate bao quanh DataTable
//
// Lớp 3 — Không cần PermissionGate:
//   Toàn bộ page ADMIN+IT đều truy cập — không có section nào chỉ ADMIN xem được
//   PermissionGate (CMP-08) KHÔNG dùng trong Department Module
//   Nguồn: DEPARTMENT_UI_SPEC.md §13

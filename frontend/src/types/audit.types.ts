/**
 * Audit Logs UI (roadmap Mục 17). Copy TRỰC TIẾP enum `action` từ
 * `userAudit.model.ts` (Mongoose schema — nguồn sự thật runtime, ĐẦY ĐỦ hơn
 * `userAudit.interface.ts` — interface đó THIẾU `REGISTER`/`ASSIGN_ROLE`,
 * lệch với schema thật, không dùng làm nguồn — CLAUDE.md Mục 11).
 */
export const AUDIT_ACTIONS = [
  "CREATE",
  "UPDATE",
  "DISABLE",
  "RESTORE",
  "LOGIN",
  "LOGOUT",
  "RESET_PASSWORD",
  "CHANGE_PASSWORD",
  "FORGOT_PASSWORD",
  "AUDIT_DASHBOARD_VIEW",
  "ADMIN_BYPASS",
  "VIEW_DETAIL",
  "DELETE",
  "REGISTER",
  "ASSIGN_ROLE",
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

/** `.populate("performedBy"/"user", "username email ...")` — lite, KHÔNG có `fullName` (chưa populate field đó, xem `userAudits.service.ts`). */
export interface AuditLogUserRef {
  _id: string;
  username: string;
  email?: string;
}

/** Khớp `IUserAudit` + populate lite ở `getAuditLogsService`. */
export interface AuditLogItem {
  _id: string;
  action: AuditAction;
  performedBy?: AuditLogUserRef | null;
  user?: AuditLogUserRef | null;
  note?: string;
  createdAt: string;
}

/** Khớp `GetAuditLogsQueryDTO`. `action` chỉ hỗ trợ chọn ĐƠN ở UI (dù backend nhận multi-value CSV) — không tự bịa multi-select UI khi chưa có nhu cầu thật (CLAUDE.md Mục 12). */
export interface GetAuditLogsParams {
  page?: number;
  limit?: number;
  action?: AuditAction;
  performedBy?: string;
  user?: string;
  fromDate?: string;
  toDate?: string;
}

/** Khớp `GetAuditDashboardQueryDTO`. */
export interface AuditDashboardParams {
  fromDate?: string;
  toDate?: string;
}

/**
 * Khớp response THẬT `getAuditDashboardService` — `res.json(result)` trả
 * THẲNG `{total, byAction, byDay}`, KHÔNG bọc `{message, data}` (xem
 * `audit.api.ts`).
 */
export interface AuditDashboardResponse {
  total: number;
  byAction: { _id: AuditAction; count: number }[];
  byDay: { _id: string; count: number }[];
}

export type AuditExportFormat = "xlsx" | "csv";

/** Khớp `ExportAuditLogsQueryDTO` — mở rộng `GetAuditLogsQueryDTO` + `format`. */
export interface ExportAuditLogsParams extends GetAuditLogsParams {
  format?: AuditExportFormat;
}

import { StatusBadge } from "@/components/shared/StatusBadge";
import type { AuditAction } from "@/types/audit.types";

type BadgeVariant = "default" | "success" | "warning" | "destructive" | "info" | "primary";

/** Mapping RIÊNG cho `AuditAction` (15 giá trị, xem `audit.types.ts`) — KHÔNG dùng chung bảng màu với `AssetStatus`/`workflowStatus` (FE_UI_DEVELOPMENT_ROADMAP.md Mục 3). */
const AUDIT_ACTION_MAP: Record<AuditAction, { label: string; variant: BadgeVariant }> = {
  CREATE: { label: "Tạo mới", variant: "success" },
  UPDATE: { label: "Cập nhật", variant: "info" },
  DISABLE: { label: "Vô hiệu hoá", variant: "warning" },
  RESTORE: { label: "Khôi phục", variant: "success" },
  LOGIN: { label: "Đăng nhập", variant: "default" },
  LOGOUT: { label: "Đăng xuất", variant: "default" },
  RESET_PASSWORD: { label: "Đặt lại mật khẩu", variant: "warning" },
  CHANGE_PASSWORD: { label: "Đổi mật khẩu", variant: "warning" },
  FORGOT_PASSWORD: { label: "Quên mật khẩu", variant: "warning" },
  AUDIT_DASHBOARD_VIEW: { label: "Xem thống kê audit", variant: "default" },
  ADMIN_BYPASS: { label: "ADMIN bỏ qua kiểm tra quyền", variant: "primary" },
  VIEW_DETAIL: { label: "Xem chi tiết", variant: "default" },
  DELETE: { label: "Xoá", variant: "destructive" },
  REGISTER: { label: "Đăng ký tài khoản", variant: "success" },
  ASSIGN_ROLE: { label: "Gán vai trò", variant: "info" },
  // Roadmap C1 (Xác thực 2 lớp qua email OTP, DEV-068, 2026-09-19).
  ENABLE_2FA: { label: "Bật xác thực 2 lớp", variant: "success" },
  DISABLE_2FA: { label: "Tắt xác thực 2 lớp", variant: "warning" },
  RESET_2FA: { label: "Admin reset xác thực 2 lớp", variant: "warning" },
  // Roadmap C2 (Quản lý phiên đăng nhập, DEV-069, 2026-09-19).
  REVOKE_SESSION: { label: "Admin thu hồi phiên đăng nhập", variant: "warning" },
};

export function AuditActionBadge({ action }: { action: AuditAction }) {
  const config = AUDIT_ACTION_MAP[action];
  // Fallback phòng backend thêm action mới chưa kịp cập nhật map ở FE (schema Mongoose không ép FE build lại).
  if (!config) return <StatusBadge variant="default">{action}</StatusBadge>;
  return <StatusBadge variant={config.variant}>{config.label}</StatusBadge>;
}

/** Dùng lại nhãn tiếng Việt ở nơi không cần badge (dropdown filter, nhãn trục biểu đồ `AuditStatsTab`). */
export function getAuditActionLabel(action: AuditAction): string {
  return AUDIT_ACTION_MAP[action]?.label ?? action;
}

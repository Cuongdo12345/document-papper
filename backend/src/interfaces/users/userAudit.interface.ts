import type mongoose from "mongoose";
import type { Document } from "mongoose";

export interface IUserAudit extends Document {
  user?: mongoose.Types.ObjectId;
  action:
    | "CREATE"
    | "UPDATE"
    | "DISABLE"
    | "RESTORE"
    | "LOGIN"
    | "LOGOUT"
    | "RESET_PASSWORD"
    | "CHANGE_PASSWORD"
    | "FORGOT_PASSWORD"
    | "AUDIT_DASHBOARD_VIEW"
    | "ADMIN_BYPASS"
    | "VIEW_DETAIL"
    | "DELETE"
    // Roadmap C1 (Xác thực 2 lớp qua email OTP, DEV-068, 2026-09-19).
    | "ENABLE_2FA"
    | "DISABLE_2FA"
    | "RESET_2FA"
    // Roadmap C2 (Quản lý phiên đăng nhập, DEV-069, 2026-09-19).
    | "REVOKE_SESSION";
  performedBy?: mongoose.Types.ObjectId;
  note?: string;
  createdAt: Date;
}

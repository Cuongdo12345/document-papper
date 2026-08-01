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
    | "DELETE";
  performedBy?: mongoose.Types.ObjectId;
  note?: string;
  createdAt: Date;
}

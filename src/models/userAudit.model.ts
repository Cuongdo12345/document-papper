import mongoose, { Schema, Document } from "mongoose";

export interface IUserAudit extends Document {
  user?: mongoose.Types.ObjectId;
  action: "CREATE" | "UPDATE" | "DISABLE" | "RESTORE"| "LOGIN" | "LOGOUT" | "RESET_PASSWORD" | "CHANGE_PASSWORD" | "FORGOT_PASSWORD" | "AUDIT_DASHBOARD_VIEW" | "VIEW_DETAIL" | "DELETE";
  performedBy: mongoose.Types.ObjectId;
  note?: string;
  createdAt: Date;
}

const UserAuditSchema = new Schema<IUserAudit>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      // required: false
    },
    action: {
      type: String,
      enum: ["CREATE", "UPDATE", "DISABLE", "RESTORE", "LOGIN", "LOGOUT","RESET_PASSWORD","CHANGE_PASSWORD","FORGOT_PASSWORD","AUDIT_DASHBOARD_VIEW","VIEW_DETAIL", "DELETE"],
      required: true
    },
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    note: String,
    createdAt: { type: Date, default: Date.now },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

// UserAuditSchema.index({ performedBy: 1 });
// UserAuditSchema.index({ action: 1 });
// UserAuditSchema.index({ createdAt: -1 });
/**
 * 🎯 TÁC DỤNG
Query	Index
audit list	compound index
dashboard	createdAt
user history	user
admin activity	performedBy
 */
UserAuditSchema.index({ user: 1 });
UserAuditSchema.index({ performedBy: 1 });
UserAuditSchema.index({ action: 1 });

/**
 * LIST FILTER INDEX
 */
UserAuditSchema.index({
  action: 1,
  performedBy: 1,
  user: 1,
  createdAt: -1,
});

/**
 * DASHBOARD DATE RANGE
 */
UserAuditSchema.index({ createdAt: -1 });

export default mongoose.model<IUserAudit>("UserAudit", UserAuditSchema);

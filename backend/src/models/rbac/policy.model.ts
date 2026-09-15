import { Schema, model } from "mongoose";
import type { IPolicy } from "../../interfaces/rbac/policy.interface";

const PolicySchema =  new Schema<IPolicy>(
  {
    name: { type: String, required: true },
    resource: { type: String, required: true },
    action: { type: String, required: true },
    condition: { type: String, required: true }, // JS expression
  },
  { timestamps: true }
);

// DEV-009A/RV02-05: nhánh ABAC (`authorizePermission.middleware.ts` bước 6)
// query `Policy.find({resource, action})` trên MỌI request rơi vào nhánh
// này (RBAC không đủ quyền) — trước đây KHÔNG có index nào ngoài `_id`,
// COLLSCAN toàn collection mỗi lần. Thêm compound index đúng shape query.
PolicySchema.index({ resource: 1, action: 1 });

export const Policy = model<IPolicy>("Policy", PolicySchema);
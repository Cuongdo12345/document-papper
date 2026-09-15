import { Schema, model, Types } from "mongoose";
import type { IRole } from "../../interfaces/rbac/role.interface";

const RoleSchema = new Schema<IRole>(
  {
    name: { type: String, required: true, unique: true },
    permissions: [{ type: Schema.Types.ObjectId, ref: "Permission" }],
    // 🔒 DEV-001A — cờ security identity bất biến, default false (an toàn).
    // KHÔNG thêm field này vào CreateRoleDTO/UpdateRoleDTO whitelist —
    // client không có cách nào set/update field này qua API.
    isSystemRole: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const Role = model<IRole>("Role", RoleSchema);

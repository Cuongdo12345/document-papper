import { Schema, model, Types } from "mongoose";
import type { IRole } from "../../interfaces/rbac/role.interface";

const RoleSchema = new Schema<IRole>(
  {
    name: { type: String, required: true, unique: true },
    permissions: [{ type: Schema.Types.ObjectId, ref: "Permission" }],
  },
  { timestamps: true },
);

export const Role = model<IRole>("Role", RoleSchema);

import { Schema, model } from "mongoose";
import type { IPermission } from "../../interfaces/rbac/permission.interface";

const PermissionSchema = new Schema<IPermission>(
  {
    name: { type: String, required: true, unique: true },
    resource: { type: String, required: true },
    action: { type: String, required: true },
    description: {
      type: String,
    },
  },
  { timestamps: true }
);

export const Permission = model<IPermission>("Permission", PermissionSchema);

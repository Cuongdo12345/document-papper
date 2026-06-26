import { Schema, model } from "mongoose";

export interface IPermission {
  name: string;
  resource: string;
  action: string;
  description:string
}

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

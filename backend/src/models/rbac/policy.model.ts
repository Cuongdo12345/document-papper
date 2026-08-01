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

export const Policy = model<IPolicy>("Policy", PolicySchema);
import { Schema, model } from "mongoose";

export interface IPolicy {
  name: string;
  resource: string;
  action: string;
  condition:string
}

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
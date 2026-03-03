/**
 * Function couter 
 * MongoDB đảm bảo $inc là atomic → không bao giờ trùng.
 */
import { Schema, model } from "mongoose";

interface ICounter {
  key: string;
  seq: number;
}

const counterSchema = new Schema<ICounter>(
  {
    key: { type: String, required: true, unique: true },
    seq: { type: Number, default: 0 },
  },
  { timestamps: false }
);

export const Counter = model<ICounter>("Counter", counterSchema);
import { Schema, model } from "mongoose";

const ApiPerformanceSchema = new Schema(
  {
    method: String,
    endpoint: String,

    status: Number,

    totalTime: Number,
    dbTime: Number,
    serviceTime: Number,
    controllerTime: Number,

    user: { type: Schema.Types.ObjectId, ref: "User" },

    isSlow: Boolean,
  },
  { timestamps: true }
);

ApiPerformanceSchema.index({ endpoint: 1 });
ApiPerformanceSchema.index({ createdAt: -1 });

export const ApiPerformanceModel = model(
  "ApiPerformance",
  ApiPerformanceSchema
);
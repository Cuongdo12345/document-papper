import { Schema, model, Types } from "mongoose";

const refreshTokenSchema = new Schema(
  {
    user: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },
    token: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    revoked: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

export default model("RefreshToken", refreshTokenSchema);

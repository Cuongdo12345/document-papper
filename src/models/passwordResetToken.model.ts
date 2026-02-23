import { Schema, model, Document, Types } from "mongoose";

/**
 * Interface cho Password Reset Token
 */
export interface IPasswordResetToken extends Document {
  user: Types.ObjectId;
  token: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Schema
 */
const passwordResetTokenSchema = new Schema<IPasswordResetToken>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true
    },
    used: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

/**
 * Tự động xoá token hết hạn (TTL index)
 * MongoDB sẽ dọn sau ~60s
 */
passwordResetTokenSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

export default model<IPasswordResetToken>(
  "PasswordResetToken",
  passwordResetTokenSchema
);

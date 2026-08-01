import type { Document, Types } from "mongoose";

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

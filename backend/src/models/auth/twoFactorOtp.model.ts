import { Schema, model } from "mongoose";
import type { ITwoFactorOtp } from "../../interfaces/auth/twoFactorOtp.interface";

/**
 * Roadmap C1 (DEV-068, 2026-09-19) — xem giải thích đầy đủ ở
 * `interfaces/auth/twoFactorOtp.interface.ts`. Mirror index/TTL của
 * `passwordResetToken.model.ts`.
 */
const twoFactorOtpSchema = new Schema<ITwoFactorOtp>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    used: { type: Boolean, default: false },
    attempts: { type: Number, default: 0 },
  },
  { timestamps: true },
);

/** Tự động xoá OTP hết hạn (TTL index) — cùng cơ chế `passwordResetToken.model.ts`. */
twoFactorOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
/** `verifyLoginOtpService()`/`confirmEnableTwoFactorService()` luôn tìm OTP MỚI NHẤT chưa dùng của 1 user. */
twoFactorOtpSchema.index({ user: 1, createdAt: -1 });

export default model<ITwoFactorOtp>("TwoFactorOtp", twoFactorOtpSchema);

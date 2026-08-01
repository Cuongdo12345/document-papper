import { Schema, model, Document, Types } from "mongoose";
import type { IPasswordResetToken } from "../../interfaces/auth/passwordResetToken.interface";


/**
 * Schema
 */
const passwordResetTokenSchema = new Schema<IPasswordResetToken>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      // index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      // index: true,
    },
    used: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

/**
 * Tự động xoá token hết hạn (TTL index)
 * MongoDB sẽ dọn sau ~60s
 */
passwordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

/**
 * ⚠️ MỚI — 2 INDEX ĐỀ XUẤT (review hiệu suất `forgotPassword()`/`resetPassword()`):
 *
 * 1. `{ token: 1 }` UNIQUE:
 *    - Dùng bởi `resetPassword()`: `PasswordResetToken.findOne({ token: hashedToken, ... })`.
 *      Không có index này, MongoDB phải collection scan toàn bộ bảng mỗi lần
 *      user bấm link reset — chậm dần khi bảng lớn lên theo thời gian.
 *    - `unique: true` giúp DB tự đảm bảo không bao giờ có 2 bản ghi trùng
 *      token (token đã hash SHA-256 nên xác suất trùng gần như bằng 0, nhưng
 *      thêm ràng buộc DB vẫn là lớp phòng thủ rẻ, không tốn thêm gì).
 *
 * 2. `{ user: 1, createdAt: -1 }` (compound):
 *    - Dùng bởi `forgotPassword()` ở 2 chỗ:
 *      a. `countDocuments({ user, createdAt: { $gte: fifteenMinutesAgo } })`
 *         — check rate-limit "tối đa 3 request/15 phút".
 *      b. `deleteMany({ user })` — xoá token cũ trước khi tạo token mới.
 *    - Không có index này, mỗi lần user (dù hợp lệ hay giả mạo) gọi
 *      forgot-password đều phải quét toàn bộ bản ghi của user đó (hoặc toàn
 *      bảng nếu cũng thiếu index `user`) — ảnh hưởng trực tiếp tới đúng
 *      endpoint vừa được tối ưu tốc độ phản hồi ở bước trước, nên cần khớp
 *      cả 2 phía (code tối ưu + DB có index tương ứng) mới phát huy hết tác
 *      dụng.
 */
passwordResetTokenSchema.index({ token: 1 }, { unique: true });
passwordResetTokenSchema.index({ user: 1, createdAt: -1 });

export default model<IPasswordResetToken>(
  "PasswordResetToken",
  passwordResetTokenSchema,
);

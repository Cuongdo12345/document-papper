/**Refactor */
import { Schema, model, Types } from "mongoose";
import type { IUser } from "../../interfaces/users/user.interface";

const UserSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      // lowercase: true,
      trim: true,
    },

    // 🔒 password mặc định KHÔNG được trả về trong bất kỳ query nào.
    // Muốn lấy password (vd: changePassword cần so sánh hash cũ) phải
    // gọi tường minh .select("+password").
    password: {
      type: String,
      required: true,
      select: false,
    },

    fullName: {
      type: String,
      required: true,
    },

    /**
     * ⚠️ MỚI: field `email` — TRƯỚC ĐÂY MODEL NÀY KHÔNG CÓ FIELD NÀY.
     * Bắt buộc phải thêm vì 2 tính năng vừa được build cho module Auth cần
     * `user.email` để hoạt động:
     *   - `AuthService.register()` — thu thập email lúc đăng ký.
     *   - `AuthService.forgotPassword()` — gửi link reset mật khẩu qua email
     *     thật (trước đây trả thẳng token qua response vì chưa tích hợp mail).
     *
     * `required: false` + `sparse: true` (thay vì `required: true`) vì đây là
     * MIGRATION cho collection đã có dữ liệu — user cũ (tạo trước khi có field
     * này) sẽ không có email. `unique: true` KHÔNG dùng kèm `sparse: true` sẽ
     * chặn nhiều document cùng thiếu email (nhiều `null`/`undefined` bị coi là
     * trùng) — dùng `sparse` để cho phép nhiều user không có email tồn tại
     * song song, chỉ chặn trùng khi 2 user CÙNG có giá trị email giống nhau.
     *
     * ⚠️ CẦN LÀM THÊM (ngoài phạm vi code): với user cũ đã tồn tại trước khi
     * thêm field này, cân nhắc chạy 1 script backfill email (nếu có nguồn dữ
     * liệu khác để đối chiếu) hoặc yêu cầu họ tự cập nhật email qua màn hình
     * Profile — nếu không, user cũ sẽ KHÔNG dùng được tính năng quên mật khẩu
     * cho tới khi có email.
     */
    email: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },

    // // 🔐 RBAC
    role: {
      type: Schema.Types.ObjectId,
      ref: "Role",
      required: true,
    },

    // 🔥 override thêm
      extraPermissions: {
      type: [Schema.Types.ObjectId],
      ref: "Permission",
      default: [],
    },

  // 🔥 block permission
      denyPermissions: {
      type: [Schema.Types.ObjectId],
      ref: "Permission",
      default: [],
    },

    department: {
      type: Schema.Types.ObjectId,
      ref: "Department",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

/**
 * 🔥 INDEX PHỤC VỤ FILTER & SEARCH
 * 📌 Vì sao nên index như vậy
username: search / check tồn tại
department + role: filter admin cực nhiều
createdAt: phân trang + lọc theo ngày rất nhanh
🎯 TÁC DỤNG
Query	Index chạy
login	username
filter user list	compound index
keyword search	text index
sort createdAt	compound index
 */


UserSchema.index({ department: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ isActive: 1 });

/**
 * Filter + pagination index (rất quan trọng)
 */
UserSchema.index({
  isActive: 1,
  role: 1,
  department: 1,
  createdAt: -1,
});

/**
 * Keyword search username
 */
UserSchema.index({ username: "text" });

// export default mongoose.model<IUser>("User", UserSchema);
export const User = model<IUser>("User", UserSchema);
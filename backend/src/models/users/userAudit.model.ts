import mongoose, { Schema, Document } from "mongoose";
import type { IUserAudit } from "../../interfaces/users/userAudit.interface";

const UserAuditSchema = new Schema<IUserAudit>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      // required: false
    },
    action: {
      type: String,
      enum: [
        "CREATE",
        "UPDATE",
        "DISABLE",
        "RESTORE",
        "LOGIN",
        "LOGOUT",
        "RESET_PASSWORD",
        "CHANGE_PASSWORD",
        "FORGOT_PASSWORD",
        "AUDIT_DASHBOARD_VIEW",
        // ⚠️ MỚI: action riêng cho ADMIN bypass permission check — trước đây
        // `authorizePermission.middleware.ts` phải "mượn tạm"
        // `AUDIT_DASHBOARD_VIEW` để ghi log (đã tự ghi TODO trong code lúc
        // đó vì enum chưa có action phù hợp) — 2 hành động khác hẳn nhau
        // nhưng bị gộp chung 1 nhãn, gây khó tra cứu khi audit. Xem
        // `authorizePermission.middleware.ts` đã cập nhật dùng đúng action
        // này thay vì `AUDIT_DASHBOARD_VIEW`.
        "ADMIN_BYPASS",
        "VIEW_DETAIL",
        "DELETE",
        "REGISTER",
        "ASSIGN_ROLE"
      ],
      required: true,
    },
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      // required: true,
    },
    note: String,
  },
  {
    // ⚠️ SỬA: trước đây vừa tự khai `createdAt: { type: Date, default:
    // Date.now }` thủ công VỪA bật `timestamps: { createdAt: true }` — 2 cơ
    // chế cùng quản lý 1 field, dư thừa (không sai nhưng dễ gây nhầm lẫn khi
    // bảo trì). Nay chỉ dùng `timestamps`, bỏ khai báo field thủ công — hành
    // vi cuối cùng KHÔNG đổi (`createdAt` vẫn tự động set khi tạo document).
    timestamps: { createdAt: true, updatedAt: false },
  },
);

/**
 * 🎯 TÁC DỤNG — ĐÃ SỬA LẠI CHO KHỚP ĐÚNG PATTERN TRUY VẤN THỰC TẾ
 *
 * ⚠️ SỬA (review UserAudit module): `getAuditLogsService` luôn lọc theo
 * TỐI ĐA 1 trong 3 field (`user`/`performedBy`/`action`) rồi SORT theo
 * `createdAt: -1`. 3 index đơn trước đây (`{user:1}`, `{performedBy:1}`,
 * `{action:1}`) không kèm `createdAt` nên MongoDB phải sort kết quả TRONG BỘ
 * NHỚ sau khi filter — chậm dần và có thể chạm giới hạn 32MB sort mặc định
 * khi 1 user/action có nhiều bản ghi. Compound index 4 field cũ
 * (`{action, performedBy, user, createdAt}`) cũng không giải quyết được vấn
 * đề này vì chỉ tối ưu khi filter ĐỒNG THỜI cả 3 field theo đúng thứ tự —
 * trường hợp hiếm gặp trong thực tế.
 *
 * Thay bằng 3 compound 2-field, khớp đúng pattern "lọc 1 field + sort
 * createdAt" — cho phép MongoDB dùng thẳng thứ tự index, không cần sort
 * trong bộ nhớ:
 */
UserAuditSchema.index({ user: 1, createdAt: -1 });
UserAuditSchema.index({ performedBy: 1, createdAt: -1 });
UserAuditSchema.index({ action: 1, createdAt: -1 });

/**
 * DASHBOARD DATE RANGE — giữ nguyên, phục vụ `getAuditDashboardService` khi
 * chỉ filter theo khoảng `createdAt` (không kèm field nào khác).
 */
UserAuditSchema.index({ createdAt: -1 });

export default mongoose.model<IUserAudit>("UserAudit", UserAuditSchema);
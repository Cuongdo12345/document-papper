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
    // Roadmap C2 (Quản lý phiên đăng nhập, DEV-069, 2026-09-19) — ghi lại lúc
    // `login()`/`verifyLoginOtp()` cấp token, phục vụ "danh sách thiết bị"
    // (xem `userAgent.helper.ts::parseUserAgent`). TUỲ CHỌN (không
    // `required`) — token cấp TRƯỚC khi có trường này (nếu còn hiệu lực,
    // hiếm khi xảy ra vì hạn 7 ngày) sẽ hiển thị "Không xác định", không cần
    // migration dữ liệu cũ.
    userAgent: { type: String },
    // ⚠️ `req.ip` phản ánh ĐÚNG địa chỉ kết nối tới Express — nếu deploy sau
    // reverse proxy (Nginx...) thì PHẢI đặt ENV `TRUST_PROXY` = số lớp proxy
    // (BR-08/DEV-096, `app.ts` + `trustProxy.util.ts`), nếu không giá trị này
    // sẽ là IP của proxy, không phải IP thật của client.
    ip: { type: String },
  },
  { timestamps: true },
);

// Roadmap C2 — truy vấn "danh sách phiên đang hoạt động của 1 user"
// (`listMySessions`/`listUserSessions`) lọc theo `user` + `revoked`, sort
// theo `createdAt` — trước đây model này KHÔNG có index nào (kể cả `user`),
// mỗi lần refresh()/revoke cũng phải collection-scan.
refreshTokenSchema.index({ user: 1, revoked: 1, createdAt: -1 });

// Roadmap C3 (Giám sát phiên đăng nhập toàn hệ thống, DEV-070, 2026-09-19) —
// `listAllSessions()` truy vấn CROSS-USER (không lọc theo `user`), index trên
// chỉ tồn tại ở trên (dẫn đầu bằng `user`) không giúp được truy vấn này.
refreshTokenSchema.index({ revoked: 1, expiresAt: 1, createdAt: -1 });

// BR-13 (DEV-110, 2026-09-30) — TTL: MongoDB tự xoá token ĐÚNG lúc `expiresAt`
// (`expireAfterSeconds: 0`, cùng cách `TwoFactorOtp`). Trước đây 520/526 token
// đã hết hạn vẫn nằm mãi trong DB. An toàn vì mọi nơi đọc đều chỉ lấy token
// `revoked:false` VÀ `expiresAt > now` (`listMySessions`/`listUserSessions`/
// `listAllSessions`), còn `refresh()` vẫn tự `jwt.verify` kiểm hạn. TTL chỉ chạy
// trên index ĐƠN — không dùng được 2 index kép ở trên. Token bị thu hồi nhưng chưa
// hết hạn vẫn nằm đến `expiresAt` rồi mới bị xoá.
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default model("RefreshToken", refreshTokenSchema);


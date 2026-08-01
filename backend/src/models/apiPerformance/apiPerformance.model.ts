
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
  { timestamps: true },
);

ApiPerformanceSchema.index({ endpoint: 1 });
ApiPerformanceSchema.index({ createdAt: -1 });

/**
 * ⚠️ MỚI (TTL — theo yêu cầu, tự động xoá sau 30 ngày):
 * Khác với `UserAudit` (log tuân thủ/audit trail cần lưu lâu dài để tra
 * cứu/đối chiếu khi có sự cố), `ApiPerformance` là log HIỆU NĂNG — giá trị
 * sử dụng giảm dần rất nhanh theo thời gian (không ai cần biết endpoint nào
 * chậm cách đây 6 tháng để debug hiệu năng HIỆN TẠI), nên phù hợp để tự
 * động xoá bằng TTL index thay vì giữ vĩnh viễn.
 *
 * `expireAfterSeconds: 60 * 60 * 24 * 30` = 30 ngày. MongoDB sẽ tự chạy 1
 * background task (mặc định mỗi 60s) quét và xoá các document có
 * `createdAt` cũ hơn mốc này — KHÔNG cần cron job/script dọn dẹp thủ công.
 *
 * ⚠️ LƯU Ý QUAN TRỌNG khi deploy lên collection ĐÃ CÓ SẴN DỮ LIỆU:
 * TTL index chỉ có tác dụng dọn dẹp document mới thêm SAU KHI index được
 * tạo — nhưng field `createdAt` là field CÓ SẴN (từ `timestamps: true`), nên
 * MongoDB sẽ áp TTL cho TẤT CẢ document hiện có ngay khi tạo index, bao gồm
 * cả những document cũ hơn 30 ngày → sẽ bị xoá NGAY LẦN QUÉT ĐẦU TIÊN sau
 * khi deploy (không phải đợi thêm 30 ngày nữa). Nếu bạn cần backup dữ liệu
 * performance cũ trước khi index này có hiệu lực, hãy export trước khi
 * deploy thay đổi này lên production.
 *
 * Nếu Mongoose tự động sync index (`autoIndex: true`, thường bật ở dev) thì
 * index sẽ được tạo ngay khi app khởi động; ở production nên tạo index này
 * thủ công qua migration/`mongosh` có kiểm soát thời điểm, tránh việc job
 * TTL bất ngờ xoá dữ liệu ngay lúc peak traffic.
 */
ApiPerformanceSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 30 },
);

export const ApiPerformanceModel = model(
  "ApiPerformance",
  ApiPerformanceSchema,
);
import { z } from "zod";
import { objectId } from "../common.dto";

/**
 * ⚠️ MỚI — file này TRƯỚC ĐÂY CHƯA TỪNG TỒN TẠI, dù đã được lên kế hoạch
 * (`userAudit.routes.ts` có dòng comment `import { getAuditLogsQuerySchema }
 * from "../dtos/userAudit.dto"` nhưng chưa từng tạo file thật). Đây là
 * nguyên nhân gốc khiến `page`/`limit` không được ép kiểu Number, không có
 * giới hạn `limit` tối đa, và `fromDate`/`toDate` không được validate format
 * trước khi đưa vào query.
 */

const paginationBase = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
};

const dateRangeBase = {
  fromDate: z
    .string()
    .optional()
    .refine((v) => v === undefined || !isNaN(Date.parse(v)), {
      message: "fromDate không hợp lệ",
    }),
  toDate: z
    .string()
    .optional()
    .refine((v) => v === undefined || !isNaN(Date.parse(v)), {
      message: "toDate không hợp lệ",
    }),
};

/**
 * ⚠️ MỚI (multi-action filter): cho phép truyền nhiều `action` cùng lúc để
 * điều tra audit trên nhiều loại hành động 1 lần, thay vì chỉ match đúng 1
 * giá trị. Hỗ trợ 2 cách truyền query phổ biến:
 *   - Comma-separated:      ?action=LOGIN,LOGOUT,RESET_PASSWORD
 *   - Repeated key (Express tự parse thành mảng): ?action=LOGIN&action=LOGOUT
 *
 * Output CHUẨN HOÁ: nếu chỉ có 1 giá trị hợp lệ → trả về string (giữ
 * NGUYÊN behavior cũ, service dùng match đơn `filter.action = action`);
 * nếu có ≥2 giá trị → trả về string[] (service sẽ tự chuyển thành
 * `{ $in: [...] }`). Nhờ vậy KHÔNG cần đổi gì ở phía client đang dùng API
 * cũ với 1 action.
 *
 * Chỉ validate là chuỗi hợp lệ (trim, giới hạn độ dài) — KHÔNG whitelist
 * cứng theo enum của model để tránh phải đồng bộ 2 nơi mỗi khi thêm action
 * mới; giá trị sai enum sẽ tự nhiên không match record nào ở tầng Mongo,
 * không phải lỗ hổng bảo mật.
 */
const actionSchema = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((raw) => {
    if (raw === undefined) return undefined;

    const arr = Array.isArray(raw) ? raw : raw.split(",");
    const cleaned = arr
      .map((a) => a.trim())
      .filter(Boolean)
      .slice(0, 20); // chặn payload action list quá dài (phòng lạm dụng)

    if (cleaned.length === 0) return undefined;
    return cleaned.length === 1 ? cleaned[0] : cleaned;
  });

export const GetAuditLogsQueryDTO = z.object({
  ...paginationBase,
  ...dateRangeBase,
  action: actionSchema,
  performedBy: objectId("performedBy ID không hợp lệ").optional(),
  user: objectId("user ID không hợp lệ").optional(),
});

export const GetAuditDashboardQueryDTO = z.object({
  ...dateRangeBase,
});

/**
 * ⚠️ MỚI (export audit log): DTO RIÊNG cho `GET /audit/export`, mở rộng từ
 * `GetAuditLogsQueryDTO` + field `format`.
 *
 * KHÔNG dùng chung `GetAuditLogsQueryDTO` cho route export — lý do: Zod mặc
 * định STRIP (loại bỏ) mọi field không được khai báo trong schema. Nếu
 * `validate.middleware.ts` ghi đè `req.query` bằng kết quả đã parse (pattern
 * phổ biến để đảm bảo `req.query` luôn đúng type sau validate), thì
 * `?format=csv` sẽ bị strip mất trước khi tới controller — export luôn ra
 * Excel bất kể client chọn gì, lỗi âm thầm rất khó phát hiện khi test thủ
 * công (vì endpoint vẫn trả file thành công, chỉ sai định dạng).
 */
export const ExportAuditLogsQueryDTO = GetAuditLogsQueryDTO.extend({
  format: z.enum(["xlsx", "csv"]).optional(),
});
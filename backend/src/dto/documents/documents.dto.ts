import { z } from "zod";
import { DocumentCategory, DocumentSubType } from "../../models/documents/document.model";
import { objectId } from "../common.dto";

export const CreateDocumentDTO = z.object({
  category: z.enum(Object.values(DocumentCategory) as [string, ...string[]]),
  subType: z.enum(Object.values(DocumentSubType) as [string, ...string[]]),
  title: z.string().min(1),
  department: objectId("Department ID không hợp lệ"),
  // ✅ ĐÃ CHỐT (trước đây để ngỏ chờ quyết định nghiệp vụ, xem
  // MODULE_P1_CRITICAL_PLAN.md P0-2): mỗi REPORT chỉ tham chiếu ĐÚNG 1
  // PROPOSAL (quan hệ 1-1). DTO giữ nguyên `z.string().optional()` (1 giá
  // trị đơn) — đồng bộ với `documents.validator.ts` (`validateReference`) và
  // `documents.mapper.ts` (`buildReferenceArray`), cả 2 đã được sửa để chỉ
  // chấp nhận 1 ID đơn và throw lỗi rõ ràng nếu nhận mảng nhiều phần tử. DB
  // vẫn giữ kiểu mảng `[ObjectId]` (không migrate schema) nhưng bị ràng buộc
  // tối đa 1 phần tử ở tầng application.
  referenceTo: z.string().optional(),
  meta: z.record(z.string(), z.unknown()).optional(),

  /**
   * 🔗 GIAI ĐOẠN 3 (module Asset) — BẮT BUỘC khi `subType === PROPOSE_REPAIR`
   * (validate ở `document.service.ts`, không validate chéo field được ở Zod
   * cấp DTO này vì phụ thuộc giá trị `subType`). Bỏ qua/không cần với các
   * subType khác.
   */
  relatedAsset: objectId("relatedAsset không hợp lệ").optional(),
});

export const UpdateDocumentDTO = z
  .object({
    title: z.string().min(1).optional(),
    // Đã BỎ field `department` khỏi DTO Update (khác bản gốc).
    // Lý do: `DOCUMENT_UPDATE_WHITELIST` (documents.constants.ts) chỉ cho phép
    // sửa "title"/"meta" ở tầng service — giữ `department` trong DTO tạo ảo giác
    // client có thể đổi department qua Update, trong khi thực tế field này luôn bị
    // service lọc bỏ (forbidden field check sẽ throw nếu client cố truyền). Xoá ở
    // DTO để hợp đồng API phản ánh đúng hành vi thực tế, tránh 1 field "tồn tại
    // nhưng không bao giờ có tác dụng".
    meta: z.record(z.string(), z.unknown()).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Cần ít nhất 1 field để cập nhật",
  });

/**
 * QueryDocumentDTO — viết lại toàn bộ để khớp 1-1 với tập field mà
 * `getAllDocumentsService` (document.service.ts) thực sự xử lý.
 *
 * So với bản gốc, các thay đổi:
 *  1. `category`/`subType`: required → optional (bug P1-1a — DTO cũ chặn mọi
 *     request list không kèm filter).
 *  2. Bổ sung đầy đủ field còn thiếu mà service đang dùng: `isActive`,
 *     `department`, `workflowStatus` (đổi tên từ `status` sai — field thật trong
 *     schema Document là `workflowStatus`), `createdBy`, `fromDate`, `toDate`.
 *  3. `page`/`limit`: dùng `z.coerce.number()` + `.default()` thay vì
 *     `z.string().optional()` — Zod tự parse + validate, tránh `NaN` lọt xuống
 *     service khi client gửi giá trị không phải số (P2-Query#3).
 *  4. Bổ sung `sortBy` (whitelist field cho phép sort — enum tường minh, không
 *     cho client sort theo field tuỳ ý) và `order` (P2-Query#4).
 *  5. `keyword`: giới hạn độ dài tối đa 100 ký tự — giảm bề mặt tấn công ReDoS
 *     cho `$regex` search ở service (P2-Query#1). Việc escape ký tự regex đặc
 *     biệt vẫn cần sửa ở service (ngoài phạm vi DTO/Validation của task này).
 *
 * Lưu ý quan trọng (bàn giao cho task Business Logic riêng, KHÔNG sửa ở đây):
 * DTO này chỉ đảm bảo dữ liệu ĐI VÀO service đúng kiểu/hợp lệ. Các bug hiện có
 * trong `getAllDocumentsService` (gán nhầm biến khiến `filter.isActive` luôn
 * `true`, dùng sai tên field `status` thay vì `workflowStatus`, và
 * `Object.assign(filter, filters)` không whitelist) VẪN CÒN NGUYÊN cho tới khi
 * service được sửa riêng — DTO chuẩn hoá input nhưng không tự sửa logic xử lý
 * input đó bên trong service.
 */
export const QueryDocumentDTO = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),

  sortBy: z
    .enum(["createdAt", "updatedAt", "title", "documentCode", "serviceDate", "actualCost"])
    .default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),

  keyword: z.string().max(100).optional(),

  // [MỚI 2026-09-18, DEV-063 — Roadmap B6] Tìm kiếm toàn văn (title +
  // documentCode + nội dung/ghi chú trong `meta`) qua MongoDB `$text` —
  // TÁCH RIÊNG khỏi `keyword` phía trên (khớp chuỗi con `$regex`, giữ
  // nguyên hành vi cũ). MongoDB không cho phép gộp `$text` vào cùng 1 mệnh
  // đề `$or` với field khác nên đây PHẢI là param riêng, không "vá" chung
  // vào `keyword`. `min(2)` — tránh quét toàn bộ collection với truy vấn 1
  // ký tự gần như vô nghĩa.
  fullTextSearch: z.string().min(2).max(200).optional(),

  // "true"/"false" dạng string (query string luôn là string) → convert thành
  // boolean thật, hoặc `undefined` nếu client không truyền (để service tự quyết
  // định giá trị mặc định, KHÔNG áp default cứng ở DTO vì đây là 1 phần bug cần
  // service tự sửa lại logic mặc định của nó).
  isActive: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),

  category: z.enum(Object.values(DocumentCategory) as [string, ...string[]]).optional(),
  subType: z.enum(Object.values(DocumentSubType) as [string, ...string[]]).optional(),

  department: objectId("Department ID không hợp lệ").optional(),
  createdBy: objectId("CreatedBy ID không hợp lệ").optional(),
  // 🔗 Giai đoạn 3 (module Asset)
  relatedAsset: objectId("relatedAsset không hợp lệ").optional(),

  // Đổi tên từ `status` (không tồn tại trong schema Document) sang đúng tên
  // field thật `workflowStatus`, đồng bộ enum với `document.model.ts`.
  workflowStatus: z.enum(["pending", "approved", "rejected", "cancelled", "completed"]).optional(),

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
});

/**
 * DELETE-BY-MONTH (DEV-021/SEC-12) — `DELETE /api/documents/delete-by-month`
 * trước đây KHÔNG có `validateBody` nào (route tự comment "chưa xử lý
 * validation ở đây") — controller chỉ check `!month || !year` (falsy), không
 * ép kiểu/giới hạn khoảng giá trị. Kết hợp `deleteDocumentsByMonthService`
 * dùng `new Date(year, month - 1, 1)` trực tiếp (không tự validate), input
 * bất thường (chuỗi không phải số, object qua NoSQL-style body) có thể tạo
 * `Invalid Date`/`NaN` trong filter của 1 thao tác xoá hàng loạt.
 */
export const DeleteDocumentsByMonthDTO = z.object({
  month: z.coerce.number().int().min(1, "month phải từ 1-12").max(12, "month phải từ 1-12"),
  year: z.coerce.number().int().min(2000, "year không hợp lệ").max(2100, "year không hợp lệ"),
  category: z.enum(Object.values(DocumentCategory) as [string, ...string[]]).optional(),
  subType: z.enum(Object.values(DocumentSubType) as [string, ...string[]]).optional(),
  department: objectId("Department ID không hợp lệ").optional(),
});
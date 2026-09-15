// dto/uploadFiles/upload.dto.ts
import { z } from "zod";
import { objectId } from "../common.dto";

/**
 * QueryUploadDTO — `GET /api/upload` (tính năng tìm kiếm/lọc, theo yêu cầu
 * user 2026-09-12). Trước đây `getFiles()` (`upload.controller.ts`) không
 * qua `validateQuery` nào — tự `parseInt(req.query.page/limit)` thủ công,
 * không có field search/filter nào khác ngoài phân trang. Viết theo ĐÚNG
 * pattern `QueryDocumentDTO` (`dto/documents/documents.dto.ts`, khuyến nghị
 * nhất trong project): `sortBy` whitelist enum tường minh (không cho client
 * sort theo field tuỳ ý), `keyword` giới hạn 100 ký tự (giảm bề mặt ReDoS
 * cho `$regex` ở service), `fromDate`/`toDate` refine parse được trước khi
 * vào service.
 *
 * `mimeType`: CHỦ Ý không giới hạn theo enum — schema `Upload.mimeType` là
 * `String` thường (không phải field enum trong model), và
 * `createUploader({allowedTypes:[...]})` (`upload.routes.ts`) có thể đổi
 * danh sách cho phép trong tương lai mà không cần sửa lại DTO này. FE tự
 * gợi ý đúng 5 giá trị đang cho phép qua `<select>` (xem
 * `frontend/src/features/files/pages/FilesListPage.tsx`).
 *
 * `uploadedBy`: chỉ có ý nghĩa lọc thật khi caller là ADMIN — non-admin
 * luôn bị `getFiles()` ghi đè `filter.uploadedBy` bằng chính họ (DEV-007/
 * IMP-009), truyền field này không tác dụng nhưng vẫn validate ObjectId ở
 * đây cho MỌI caller để nhất quán (không cần biết caller là ai ở tầng DTO).
 *
 * `storage` (field có sẵn trong model, enum "local"/"s3"): CHỦ Ý KHÔNG thêm
 * filter cho field này — grep toàn backend xác nhận KHÔNG nơi nào từng ghi
 * giá trị "s3" (100% record hiện tại là "local"), thêm bộ lọc cho field
 * không có biến thiên thực tế nào là over-engineering (CLAUDE.md Mục 12).
 */
export const QueryUploadDTO = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),

  sortBy: z.enum(["createdAt", "fileName", "fileSize"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),

  keyword: z.string().trim().max(100).optional(),

  mimeType: z.string().trim().optional(),

  uploadedBy: objectId("uploadedBy không hợp lệ").optional(),

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

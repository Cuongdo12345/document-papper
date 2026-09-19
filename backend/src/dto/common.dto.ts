// dto/common.dto.ts
// Vị trí giả định: src/dto/common.dto.ts (ngang hàng documents.dto.ts, workflow.dto.ts)
//
// Mục đích: cung cấp validate ObjectId dùng chung cho mọi route-param dạng ":id",
// thay vì mỗi module tự viết lại (nguồn: MODULE_P1_CRITICAL_PLAN.md — P1-5 "Thiếu
// IdParamDTO/validateObjectId nhất quán cho toàn bộ route :id").
import { z } from "zod";

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

/**
 * Zod schema cho 1 giá trị ObjectId dạng string (dùng cho param, hoặc field
 * tham chiếu trong body/query như `department`, `createdBy`).
 */
export const objectId = (message = "ID không hợp lệ") =>
  z.string().regex(OBJECT_ID_REGEX, message);

/**
 * Tạo Zod schema cho route param dạng ObjectId với tên field tuỳ ý.
 * Dùng khi tên param không phải "id" mặc định (vd ":proposalId").
 *
 * Ví dụ: validateParams(makeIdParamDTO("proposalId", "Proposal id không hợp lệ"))
 */
export const makeIdParamDTO = (paramName: string, message = "ID không hợp lệ") =>
  z.object({ [paramName]: objectId(message) });

/** Schema mặc định cho route dùng đúng tên param ":id". */
export const IdParamDTO = makeIdParamDTO("id");

/**
 * [MỚI 2026-09-16, DEV-060] Body chung cho mọi endpoint "xoá mềm hàng loạt"
 * (`POST .../bulk-delete`) — dùng chung cho 6 domain đã có sẵn xoá mềm/toggle
 * `isActive` từng dòng (Asset/AssetCategory/ConsumableItem/ConsumableCategory/
 * Vendor/User). Giới hạn tối đa 100 phần tử/lần — khớp đúng ngữ nghĩa "chọn
 * toàn bộ dữ liệu ĐANG HIỂN THỊ" (trang hiện tại, không phải toàn bộ kết quả
 * lọc), page size UI hiện tại luôn ≤ 100 nên không cần phân trang cho batch.
 */
export const BulkIdsDTO = z.object({
  ids: z.array(objectId("id trong danh sách không hợp lệ")).min(1, "Chọn ít nhất 1 mục").max(100, "Tối đa 100 mục mỗi lần"),
});
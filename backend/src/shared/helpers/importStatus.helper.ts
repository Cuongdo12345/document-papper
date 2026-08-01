import { ImportHistoryStatus } from "../../models/importAudit/importhistory.model";

/**
 * Suy ra status audit trail từ kết quả xử lý import:
 * - "failed": mọi dòng đều lỗi (không tạo/cập nhật được gì) — thường do sai
 *   định dạng hàng loạt dù đã qua được validate header.
 * - "partial": có ít nhất 1 dòng lỗi NHƯNG vẫn có dòng xử lý thành công.
 * - "success": không có dòng nào lỗi.
 */
export const resolveImportStatus = (result: {
  errors: any[];
  created: number;
  updated: number;
}): ImportHistoryStatus => {
  if (!result.errors.length) return "success";
  return result.created + result.updated > 0 ? "partial" : "failed";
};
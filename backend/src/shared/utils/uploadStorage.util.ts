// shared/utils/uploadStorage.util.ts
//
// (A2, 2026-09-15) Tách từ `upload.controller.ts:downloadFile` (FE-15) — nơi
// THỨ 2 giờ cần tính lại đúng đường dẫn đĩa từ `Upload.fileUrl` là
// `calibrationRecord.service.ts` (tải giấy chứng nhận kiểm định). Gom về 1
// chỗ để không lặp lại (và có nguy cơ lệch số cấp `../`) logic path-traversal
// safety này ở nhiều nơi.
import path from "path";

// `uploads/` nằm ở gốc `backend/` (sibling của `src/`), cố định bởi
// multer storage (`services/upload/upload.middleware.ts`). File này nằm ở
// `src/shared/utils/` — CÙNG độ sâu với `src/services/upload/`
// (2 cấp dưới `src/`) nên dùng chung đúng 3 cấp `../../../`.
const UPLOAD_DIR = path.join(__dirname, "../../../uploads");

/**
 * Quy đổi `fileUrl` đã lưu trong DB (dạng `/uploads/<filename>` — ĐƯỜNG DẪN
 * CHẾT khi dùng trực tiếp trên trình duyệt, không có `express.static` phục
 * vụ, xem comment gốc `upload.controller.ts:downloadFile`) thành đường dẫn
 * thật trên đĩa để đọc file bằng `fs`.
 *
 * `path.basename()` — `fileUrl` là dữ liệu ĐÃ LƯU trong DB (không phải input
 * trực tiếp từ request hiện tại), nhưng vẫn basename lại cho chắc trước khi
 * ghép đường dẫn đọc file (path traversal defense-in-depth, cùng lý do đã áp
 * dụng khi LƯU file ở `upload.middleware.ts`).
 */
export function resolveUploadedFilePath(fileUrl: string): string {
  return path.join(UPLOAD_DIR, path.basename(fileUrl));
}

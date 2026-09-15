/**
 * Khớp `Upload` model (`backend/src/models/uploadFiles/upload.model.ts`) —
 * thư viện file ĐỘC LẬP, KHÔNG có field liên kết tới Document/Asset nào
 * (`resourceId`/`documentId` không tồn tại) — xác nhận qua đọc trực tiếp
 * schema + grep toàn backend (0 nơi nào set `isUsed`/liên kết ngược từ
 * Document/Asset). "File đính kèm" gắn liền với 1 Document/Asset cụ thể
 * (concept nêu ở CLAUDE.md Mục 1) CHƯA được backend hiện thực — đây chỉ là
 * "danh sách file tôi đã tải lên", không phải "file đính kèm của tài liệu
 * X". Xem `docs/frontend/tasks/FE-15.md` Mục 1.
 */
export interface UploadedFile {
  _id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  storage: "local" | "s3";
  uploadedBy?: string;
  isUsed: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * [MỚI 2026-09-12, theo yêu cầu user] Tìm kiếm/lọc — khớp `QueryUploadDTO`
 * (`backend/src/dto/uploadFiles/upload.dto.ts`). `uploadedBy` chỉ có tác
 * dụng lọc thật khi caller là ADMIN (non-admin luôn bị backend ghi đè bằng
 * chính họ, `getFiles()`/DEV-007 IMP-009) — FE chỉ hiện dropdown này khi
 * `useIsAdmin()` (`FilesListPage.tsx`).
 */
export interface GetFilesParams {
  page?: number;
  limit?: number;
  keyword?: string;
  mimeType?: string;
  uploadedBy?: string;
  fromDate?: string;
  toDate?: string;
  sortBy?: "createdAt" | "fileName" | "fileSize";
  order?: "asc" | "desc";
}

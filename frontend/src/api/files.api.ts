import type { AxiosProgressEvent, AxiosResponse } from "axios";
import { axiosInstance } from "@/api/axios";
import type { Pagination } from "@/types/shared.types";
import type { GetFilesParams, UploadedFile } from "@/types/file.types";

/**
 * API layer domain Upload (mount `/api/upload`, `upload.routes.ts`).
 * Response envelope `{success:true, message?, data, pagination?}` cho MỌI
 * endpoint (DEV-025/ARCH-23 đã đồng bộ hoá lại, xem `upload.controller.ts`)
 * — dùng thẳng `unwrapResponse<T>()` chung, KHÔNG cần hàm riêng như
 * `FE_FOUNDATION_SPEC.md` Mục 5 từng dự trù (viết trước khi domain này có
 * code thật, shape lúc đó khác — đã verify lại qua source hiện tại).
 */
export function uploadFiles(
  files: File[],
  onUploadProgress?: (e: AxiosProgressEvent) => void,
): Promise<AxiosResponse<{ success: boolean; message: string; data: UploadedFile[] }>> {
  const formData = new FormData();
  files.forEach((f) => formData.append("files", f));
  return axiosInstance.post("/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress,
    // File có thể lớn (tối đa 10MB, xem `upload.middleware.ts`) — nới timeout
    // riêng cho request này, tránh timeout mặc định 15s của `axiosInstance`.
    timeout: 60_000,
  });
}

export function getFiles(
  params: GetFilesParams,
): Promise<AxiosResponse<{ success: boolean; data: UploadedFile[]; pagination: Pagination }>> {
  return axiosInstance.get("/upload", { params });
}

export function getFileDetail(id: string): Promise<AxiosResponse<{ success: boolean; data: UploadedFile }>> {
  return axiosInstance.get(`/upload/${id}`);
}

/**
 * [FE-15] Tải nội dung file thật (endpoint MỚI, xem `upload.routes.ts`) —
 * `fileUrl` trả về từ `getFiles`/`getFileDetail` KHÔNG dùng được trực tiếp
 * (đường dẫn chết, không có `express.static` phục vụ) — LUÔN dùng hàm này.
 */
export function downloadFile(id: string): Promise<AxiosResponse<Blob>> {
  return axiosInstance.get(`/upload/${id}/download`, { responseType: "blob" });
}

export function deleteFile(id: string): Promise<AxiosResponse<{ success: boolean; message: string }>> {
  return axiosInstance.delete(`/upload/${id}`);
}

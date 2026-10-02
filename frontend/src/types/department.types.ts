/**
 * Khớp `department.model.ts` thật — CHỈ `code`+`name` (KHÔNG có `description`
 * như `UI_REQUIREMENTS.md` từng suy đoán — xác nhận qua source, DEV-027/FE-03,
 * 2026-09-05). `GET /departments` KHÔNG có pagination server thật sự theo
 * trang UI dùng (route không có `validateQuery`, trả toàn bộ mảng — đọc kỹ
 * `getAllDepartmentsService`, `page`/`limit` chỉ default, FE vẫn nên gửi kèm
 * cho đúng contract nhưng không phụ thuộc để giới hạn số lượng vì danh sách
 * khoa/phòng nhỏ, quy mô ~20 bản ghi).
 * [DEV-086] Thêm `isActive`/`deletedAt`/`deletedBy` — xoá mềm, cùng convention `AssetCategory`.
 */
export interface Department {
  _id: string;
  code: string;
  name: string;
  isActive?: boolean;
  deletedAt?: string | null;
  deletedBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface GetDepartmentsParams {
  page?: number;
  limit?: number;
  keyword?: string;
  code?: string;
  name?: string;
  sortBy?: string;
  order?: "asc" | "desc";
  /** [DEV-086] Không truyền -> mặc định chỉ khoa đang hoạt động (server tự map). */
  isActive?: boolean;
}

/** Khớp `CreateDepartmentDTO`. */
export interface CreateDepartmentRequest {
  name: string;
  code: string;
}

/** [DEV-089] 1 khoa/phòng trong kết quả "Đồng bộ từ Excel". */
export interface DepartmentSyncItem {
  name: string;
  code: string;
}

export interface DepartmentSyncIssue {
  name: string;
  reason: string;
}

/** [DEV-089] Khớp response `POST /export/departments/sync-from-excel` (cả xem trước lẫn tạo thật). */
export interface DepartmentSyncResult {
  dryRun: boolean;
  /** Cột đã đọc (tìm theo tiêu đề "Khoa"/"Khoa/Phòng" ở dòng 1). */
  column: { index: number; header: string };
  totalInFile: number;
  toCreate: DepartmentSyncItem[];
  existed: DepartmentSyncItem[];
  /** Trùng tên khoa đang ẩn (xoá mềm) — KHÔNG tự khôi phục. */
  inactive: DepartmentSyncItem[];
  invalid: DepartmentSyncIssue[];
  created: DepartmentSyncItem[];
  failed: DepartmentSyncIssue[];
}

/** Khớp `UpdateDepartmentDTO` — ít nhất 1 field. */
export interface UpdateDepartmentRequest {
  name?: string;
  code?: string;
}

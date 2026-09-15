/**
 * Khớp `department.model.ts` thật — CHỈ `code`+`name` (KHÔNG có `description`/
 * `isActive` như `UI_REQUIREMENTS.md` từng suy đoán — xác nhận qua source,
 * DEV-027/FE-03, 2026-09-05). `GET /departments` KHÔNG có pagination server
 * thật sự theo trang UI dùng (route không có `validateQuery`, trả toàn bộ
 * mảng — đọc kỹ `getAllDepartmentsService`, `page`/`limit` chỉ default, FE
 * vẫn nên gửi kèm cho đúng contract nhưng không phụ thuộc để giới hạn số
 * lượng vì danh sách khoa/phòng nhỏ, quy mô ~20 bản ghi).
 */
export interface Department {
  _id: string;
  code: string;
  name: string;
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
}

/** Khớp `CreateDepartmentDTO`. */
export interface CreateDepartmentRequest {
  name: string;
  code: string;
}

/** Khớp `UpdateDepartmentDTO` — ít nhất 1 field. */
export interface UpdateDepartmentRequest {
  name?: string;
  code?: string;
}

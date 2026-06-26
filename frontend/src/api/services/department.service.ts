// // src/api/services/department.service.ts
// //
// // Nguồn: DEPARTMENT_MODULE_ANALYSIS.md §13 · API_LAYER_SPEC.md §1, §2.3, §8
// // STATE_MAPPING_v2.md §7.4 (Audit — bản cập nhật)
// //
// // Nguyên tắc (API_LAYER_SPEC.md §1.2):
// //   ✅ 1 service file = 1 backend module
// //   ✅ Chỉ gọi API — không business logic
// //   ✅ Không dùng try/catch tại service — lỗi được xử lý ở interceptor + React Query
// //   ✅ Return raw AxiosResponse — hook layer tự extract .data
// //   ✅ Dùng ENDPOINTS constants — không hardcode URL
// //   ✅ HTTP method Update = PUT (không phải PATCH)
// //
// // ⚠️ Bug status code (STATE_MAPPING_v2.md §7.4 Changelog #10):
// //   GET /api/departments/:id  → luôn trả HTTP 404 cho MỌI loại lỗi
// //   POST / PUT / DELETE       → luôn trả HTTP 400 cho MỌI loại lỗi
// //   Hook layer phải đọc error.response?.data?.message — không phân loại theo status

// import type { AxiosResponse } from 'axios';
// import { apiClient } from '../client';
// import { DEPARTMENT_ENDPOINTS } from '../endpoints';
// import type {
//   GetDepartmentsParams,
//   CreateDepartmentPayload,
//   UpdateDepartmentPayload,
// } from '../../types/department/department.dto';
// import type {
//   DepartmentListResponse,
//   DepartmentDetailResponse,
//   DepartmentCreateResponse,
//   DepartmentUpdateResponse,
//   DepartmentDeleteResponse,
// } from '../../types/department/department.types';

// // ─── Service Object ────────────────────────────────────────────────────────────

// export const departmentService = {
//   // ── API 1: GET /api/departments ─────────────────────────────────────────────
//   //
//   // Permission: DEPARTMENT_VIEW (không bug mismatch)
//   // Response: { data: Department[], pagination: { page, limit, total, totalPages } }
//   //
//   // ⚠️ Audit correction: API_LAYER_SPEC.md §2.3 gốc ghi "không có pagination" — SAI.
//   // STATE_MAPPING_v2.md §7.4 xác nhận CÓ pagination + filter/sort đầy đủ.
//   // Response shape đúng là DepartmentListResponse — không phải { data, total } cũ.
//   //
//   // Query params: keyword?, code?, name?, page?, limit?, sortBy?, order?
//   // Axios tự bỏ key undefined — an toàn khi truyền object có field thiếu
//   listDepartments(
//     params: GetDepartmentsParams = {},
//   ): Promise<AxiosResponse<DepartmentListResponse>> {
//     return apiClient.get(DEPARTMENT_ENDPOINTS.list, { params });
//   },

//   // ── API 2: GET /api/departments/:id ─────────────────────────────────────────
//   //
//   // Permission: DEPARTMENT_VIEW_DETAIL (không bug mismatch)
//   // Response: Department object trực tiếp
//   //
//   // ⚠️ Bug: luôn trả HTTP 404 kể cả khi lỗi thực chất là 400 (invalid ObjectId)
//   // Hook layer: đọc error.response?.data?.message, không dựa vào status code
//   getDepartmentById(
//     id: string,
//   ): Promise<AxiosResponse<DepartmentDetailResponse>> {
//     return apiClient.get(DEPARTMENT_ENDPOINTS.detail(id));
//   },

//   // ── API 3: POST /api/departments ────────────────────────────────────────────
//   //
//   // Permission: DEPARTMENT_CREATE (không bug mismatch)
//   // Body: { code: string, name: string }
//   // Response: { message: string, data: Department }
//   //
//   // ⚠️ code phải được toUpperCase() tại onChange input trước khi submit
//   // ⚠️ Bug: luôn trả HTTP 400 kể cả khi lỗi thực chất là 409 (duplicate code)
//   createDepartment(
//     payload: CreateDepartmentPayload,
//   ): Promise<AxiosResponse<DepartmentCreateResponse>> {
//     return apiClient.post(DEPARTMENT_ENDPOINTS.create, payload);
//   },

//   // ── API 4: PUT /api/departments/:id ─────────────────────────────────────────
//   //
//   // Permission: DEPARTMENT_UPDATE (không bug mismatch)
//   // Body: { code?: string, name?: string } — partial update
//   // Response: Department object trực tiếp
//   //
//   // ⚠️ HTTP method = PUT — không phải PATCH
//   //    (FRONTEND_MEMORY_v2.md ghi nhầm PATCH — không áp dụng)
//   // ⚠️ Bug: luôn trả HTTP 400 kể cả khi lỗi thực chất là 404 (not found)
//   updateDepartment(
//     id: string,
//     payload: UpdateDepartmentPayload,
//   ): Promise<AxiosResponse<DepartmentUpdateResponse>> {
//     return apiClient.put(DEPARTMENT_ENDPOINTS.update(id), payload);
//   },

//   // ── API 5: DELETE /api/departments/:id ──────────────────────────────────────
//   //
//   // Permission: DEPARTMENT_DELETE (không bug mismatch)
//   //   ✅ Đã xác nhận: cả ADMIN và IT đều có quyền Delete
//   // Response: { message: string }
//   //
//   // ⚠️ HARD DELETE — không restore được
//   // ⚠️ Server-side guard: trả 400 nếu phòng ban còn user/document tham chiếu
//   //    Message lỗi 400 cụ thể: NEED MORE ANALYSIS (chưa xác nhận text)
//   //    Hook layer fallback: đọc error.response?.data?.message để hiển thị toast
//   // ⚠️ Bug: luôn trả HTTP 400 kể cả khi lỗi thực chất là 404 (not found)
//   deleteDepartment(
//     id: string,
//   ): Promise<AxiosResponse<DepartmentDeleteResponse>> {
//     return apiClient.delete(DEPARTMENT_ENDPOINTS.delete(id));
//   },
// };


// src/api/services/department.service.ts
//
// Nguồn:
//   DEPARTMENT_MODULE_ANALYSIS.md §13 (Audit confirmed endpoints + response shapes)
//   API_LAYER_SPEC.md §1.2 (Service layer principles)
//   DEPARTMENT_FOUNDATION.md §2, §3, §4 (Types, DTOs, Response interfaces)
//
// ═══ NGUYÊN TẮC (API_LAYER_SPEC.md §1.2) ════════════════════════════════════
//   ✅ 1 service file = 1 backend module — 5 hàm CRUD trong file này
//   ✅ Chỉ gọi API — không business logic, không transform data
//   ✅ Không dùng try/catch — lỗi đẩy lên Axios interceptor + React Query onError
//   ✅ Return raw AxiosResponse — hook layer chịu trách nhiệm extract .data
//   ✅ Dùng DEPARTMENT_ENDPOINTS constants — không hardcode URL string
//   ✅ Timeout: 15000ms default — không override (Dashboard mới cần 20s)
//
// ═══ AUDIT CORRECTIONS (ưu tiên STATE_MAPPING_v2.md vs API_LAYER_SPEC.md gốc) ══
//   ⚠️ API_LAYER_SPEC.md §2.3 ghi "GET /departments không có pagination" → SAI
//      Audit xác nhận: CÓ đầy đủ page/limit/sortBy/order + filter keyword/code/name
//   ⚠️ API_LAYER_SPEC.md §2.3 ghi response là { data, total } → SAI
//      Audit xác nhận: { data, pagination: { page, limit, total, totalPages } }
//   ⚠️ FRONTEND_MEMORY_v2.md §19 dùng apiClient.patch() cho update → SAI
//      Xác nhận: HTTP method = PUT (không phải PATCH)
//
// ═══ BUG STATUS CODE (STATE_MAPPING_v2.md §7.4) ═════════════════════════════
//   GET /api/departments/:id → LUÔN trả HTTP 404 cho mọi lỗi (kể cả 400 invalid ObjectId)
//   POST / PUT / DELETE      → LUÔN trả HTTP 400 cho mọi lỗi (kể cả 404 not found)
//   → Hook layer / component KHÔNG phân loại lỗi theo status code
//   → Luôn đọc error.response?.data?.message để lấy mô tả lỗi

import type { AxiosResponse } from 'axios';
import { apiClient } from '../client';
import { DEPARTMENT_ENDPOINTS } from '../endpoints';
import type {
  GetDepartmentsParams,
  CreateDepartmentPayload,
  UpdateDepartmentPayload,
} from '../../types/department/department.dto';
import type {
  DepartmentListResponse,
  DepartmentDetailResponse,
  DepartmentCreateResponse,
  DepartmentUpdateResponse,
  DepartmentDeleteResponse,
} from '../../types/department/department.types';

// ─── Service Object ───────────────────────────────────────────────────────────

export const departmentService = {

  // ── API 1: GET /api/departments ─────────────────────────────────────────────
  //
  // Permission: DEPARTMENT_VIEW ✅ (không bug mismatch)
  // Response: { data: Department[], pagination: { page, limit, total, totalPages } }
  //
  // ⚠️ AUDIT CORRECTION: API_LAYER_SPEC.md §2.3 ghi "không có pagination — trả toàn bộ"
  //    Audit source code xác nhận CÓ pagination + filter/sort đầy đủ.
  //    Response shape đúng: DepartmentListResponse (không phải { data, total })
  //
  // Query params (tất cả optional, Axios tự bỏ key undefined):
  //   keyword  — tìm theo cả code + name (regex $or, case-insensitive, substring)
  //   code     — filter riêng theo mã phòng ban
  //   name     — filter riêng theo tên phòng ban
  //   page     — default 1
  //   limit    — default từ preference.store.defaultPageSize (20)
  //   sortBy   — default 'code'
  //   order    — default 'asc'
  listDepartments(
    params: GetDepartmentsParams = {},
  ): Promise<AxiosResponse<DepartmentListResponse>> {
    return apiClient.get(DEPARTMENT_ENDPOINTS.list, { params });
  },

  // ── API 2: GET /api/departments/:id ─────────────────────────────────────────
  //
  // Permission: DEPARTMENT_VIEW_DETAIL ✅ (không bug mismatch)
  // Response: Department object trực tiếp (không bọc thêm wrapper)
  //
  // ⚠️ BUG STATUS CODE:
  //    Mọi lỗi (400 invalid ObjectId, 404 not found...) → controller trả HTTP 404
  //    Hook layer dùng isError flag, không switch theo error.response?.status
  getDepartmentById(
    id: string,
  ): Promise<AxiosResponse<DepartmentDetailResponse>> {
    return apiClient.get(DEPARTMENT_ENDPOINTS.detail(id));
  },

  // ── API 3: POST /api/departments ────────────────────────────────────────────
  //
  // Permission: DEPARTMENT_CREATE ✅ (không bug mismatch)
  // Body: { code: string, name: string } — cả 2 required
  // Response: { message: string, data: Department }
  //
  // ⚠️ code PHẢI được toUpperCase() tại onChange input trước khi submit
  //    KHÔNG transform tại service — service chỉ gửi đúng payload nhận được
  // ⚠️ BUG STATUS CODE:
  //    Duplicate code (409), missing field (400)... → controller trả HTTP 400
  createDepartment(
    payload: CreateDepartmentPayload,
  ): Promise<AxiosResponse<DepartmentCreateResponse>> {
    return apiClient.post(DEPARTMENT_ENDPOINTS.create, payload);
  },

  // ── API 4: PUT /api/departments/:id ─────────────────────────────────────────
  //
  // Permission: DEPARTMENT_UPDATE ✅ (không bug mismatch)
  // Body: { code?: string, name?: string } — partial update, cả 2 optional
  // Response: Department object trực tiếp
  //
  // ⚠️ HTTP METHOD = PUT — không phải PATCH
  //    FRONTEND_MEMORY_v2.md §19 dùng apiClient.patch() là SAI — không áp dụng
  // ⚠️ BUG STATUS CODE:
  //    Not found (404), invalid id (400)... → controller trả HTTP 400
  updateDepartment(
    id: string,
    payload: UpdateDepartmentPayload,
  ): Promise<AxiosResponse<DepartmentUpdateResponse>> {
    return apiClient.put(DEPARTMENT_ENDPOINTS.update(id), payload);
  },

  // ── API 5: DELETE /api/departments/:id ──────────────────────────────────────
  //
  // Permission: DEPARTMENT_DELETE ✅ (không bug mismatch)
  //   ✅ Đã xác nhận: cả ADMIN và IT đều có quyền Delete
  // Response: { message: string }
  //
  // ⚠️ HARD DELETE — không restore được
  // ⚠️ Server-side guard: trả HTTP 400 nếu phòng ban còn user/document tham chiếu
  //    Hook layer đọc error.response?.data?.message để hiển thị toast
  //    Text message cụ thể của guard error: NEED MORE ANALYSIS (chưa xác nhận)
  // ⚠️ BUG STATUS CODE:
  //    Mọi lỗi (còn ràng buộc, not found...) → controller trả HTTP 400
  deleteDepartment(
    id: string,
  ): Promise<AxiosResponse<DepartmentDeleteResponse>> {
    return apiClient.delete(DEPARTMENT_ENDPOINTS.delete(id));
  },
};
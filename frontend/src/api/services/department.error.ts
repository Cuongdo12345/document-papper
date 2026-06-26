// src/api/services/department.error.ts
//
// Error Handling Strategy cho Department API Layer
// Nguồn: API_LAYER_SPEC.md §8 · STATE_MAPPING_v2.md §7.4 Changelog #10
//
// ─── Phân tầng xử lý lỗi ──────────────────────────────────────────────────────
//
// Tầng 1 — Axios Interceptor (global, đã có sẵn trong client.ts):
//   401 → refresh token flow (transparent, không liên quan Department)
//   403 → redirect /403 (route guard ngăn trước — không xảy ra trong module này)
//   500 → toast toàn cục "Hệ thống đang gặp sự cố"
//   Network → toast "Không có kết nối internet"
//
// Tầng 2 — React Query onError (per-hook, build ở FE-09B):
//   400 → toast error đọc error.response?.data?.message
//   404 → toast error đọc error.response?.data?.message
//
// Tầng 3 — department.service.ts:
//   Không xử lý gì — không try/catch — forward lỗi lên tầng trên

import { isAxiosError } from 'axios';
// import type { DEPARTMENT_ERROR_MESSAGES } from '../../constants/department.constants';

// ─── Error Response Shape ──────────────────────────────────────────────────────

/**
 * Shape lỗi từ Department API
 * ⚠️ BUG STATUS CODE (STATE_MAPPING_v2.md §7.4 Changelog #10):
 *   - GET /api/departments/:id  → LUÔN trả HTTP 404 cho MỌI loại lỗi
 *   - POST / PUT / DELETE       → LUÔN trả HTTP 400 cho MỌI loại lỗi
 * → KHÔNG phân loại lỗi theo status code, luôn đọc message từ response body
 */
export interface DepartmentApiError {
  message: string;
}

// ─── Error Message Extractor ───────────────────────────────────────────────────

/**
 * Extract error message từ Department API response
 * Xử lý được cả 2 format lỗi backend:
 *   Format A: { message: "..." }          — hầu hết endpoints
 *   Format B: { success: false, message } — một số endpoints
 *
 * Dùng trong hook layer (FE-09B) tại onError callback:
 *   notification.push('error', extractDepartmentError(error))
 */
export function extractDepartmentError(
  error: unknown,
  fallback: string = 'Có lỗi xảy ra, vui lòng thử lại',
): string {
  if (isAxiosError<DepartmentApiError>(error)) {
    return (
      error.response?.data?.message ??
      fallback
    );
  }
  return fallback;
}

// ─── Bảng lỗi đặc thù theo endpoint ──────────────────────────────────────────
//
// | Endpoint           | Tình huống                  | HTTP (thực tế) | HTTP (nhận được) | Message                        |
// |--------------------|-----------------------------|-----------------|--------------------|-------------------------------|
// | GET /departments   | Token hết hạn               | 401             | Interceptor xử lý  | Transparent refresh            |
// | GET /departments   | Server error                | 500             | 500                | Global toast                   |
// | GET /departments/:id | id không phải ObjectId   | 400             | 404 ⚠️ bug         | Đọc message từ body            |
// | GET /departments/:id | id hợp lệ nhưng không tồn tại | 404        | 404                | Đọc message từ body            |
// | POST /departments  | code/name thiếu             | 400             | 400 ⚠️ bug         | Đọc message từ body            |
// | POST /departments  | code đã tồn tại (duplicate) | 409             | 400 ⚠️ bug         | Đọc message từ body            |
// | PUT /departments/:id | id không tồn tại          | 404             | 400 ⚠️ bug         | Đọc message từ body            |
// | DELETE /departments/:id | còn user/doc tham chiếu | 400           | 400 ⚠️ bug         | NEED MORE ANALYSIS (text cụ thể) |
// | DELETE /departments/:id | id không tồn tại        | 404             | 400 ⚠️ bug         | Đọc message từ body            |
//
// ⚠️ NEED MORE ANALYSIS: Message cụ thể backend trả khi DELETE bị từ chối (còn ràng buộc)
// chưa được xác nhận. Hook layer sẽ dùng extractDepartmentError() làm fallback.

// ─── Retry Policy ─────────────────────────────────────────────────────────────
//
// Kế thừa global React Query config (API_LAYER_SPEC.md §8.5):
//   queries:   retry: 1, retryDelay: 1000 — retry 1 lần cho lỗi GET 5xx
//   mutations: retry: 0 — không retry, user phải re-submit
//
// Department module không override retry — dùng default là đủ.
// Không có rate-limit riêng (429) cho Department endpoints.

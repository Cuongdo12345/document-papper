import type { AxiosResponse } from "axios";
import type { Pagination } from "@/types/shared.types";

/**
 * Chuẩn hoá response THÀNH CÔNG về {data, pagination?} — dùng ở Hook Layer,
 * KHÔNG dùng trong api/*.api.ts (API layer trả nguyên AxiosResponse).
 *
 * CHỈ xử lý 2 shape phổ biến (ERROR_HANDLING.md, FE_FOUNDATION_SPEC.md Mục 5):
 *   1. {success:true, message?, data, pagination?}
 *   2. {message, data} — không có `success` (vd POST /auths/register)
 *
 * KHÔNG dùng cho:
 *   - Domain Auth login/refresh-token (response phẳng, không bọc `data` —
 *     đọc trực tiếp field, không qua hàm này).
 *   - Domain Upload (dùng `unwrapUploadResponse` riêng — Mục 5 FE_FOUNDATION_SPEC.md).
 *   - Response blob (export/download) — dùng trực tiếp `response.data`.
 */
export function unwrapResponse<T>(
  // `success`/`message` KHÔNG dùng ở đây (đọc parseApiError.ts khi lỗi) —
  // kiểu `unknown` vì response THẬT của nhiều domain lệch quy ước chuẩn:
  // `GET /users/me` trả `success` dạng STRING (không phải boolean, xem
  // api/auth.api.ts:getMe), `GET /departments` trả `success` dạng STRING
  // tương tự, `GET /users` trả `message` dạng BOOLEAN (`true`, không phải
  // string) thay vì `success`. Hàm này chỉ đọc `data`/`pagination`, không
  // bao giờ đọc `success`/`message` nên nới lỏng type không đổi runtime.
  response: AxiosResponse<{ success?: unknown; message?: unknown; data: T; pagination?: Pagination }>,
): { data: T; pagination?: Pagination } {
  const body = response.data;
  return { data: body.data, pagination: body.pagination };
}

import axios from "axios";
import type { ApiErrorResponseStandard, ParsedApiError, ZodIssueLike } from "@/types/shared.types";

const GENERIC_NETWORK_MESSAGE = "Không thể kết nối máy chủ, vui lòng kiểm tra kết nối mạng";

function isZodIssueArray(details: unknown): details is ZodIssueLike[] {
  return Array.isArray(details) && details.length > 0 && typeof details[0] === "object" && details[0] !== null && "path" in details[0];
}

/**
 * Chuẩn hoá MỌI lỗi API về 1 shape duy nhất cho UI dùng — KHÔNG giả định
 * response lỗi luôn có `success`/`errorCode` (domain Upload là ngoại lệ đã
 * xác nhận qua source — ERROR_HANDLING.md Mục 4).
 *
 * 3 nhánh (đã verify runtime thật với backend đang chạy — 2026-09-05):
 *   1. response.data.success === false -> shape chuẩn qua error.middleware.ts
 *   2. response.data chỉ có {message} (domain Upload, không `success`)
 *   3. Không có response (network error/timeout) -> message tự đặt phía FE
 */
export function parseApiError(err: unknown): ParsedApiError {
  if (!axios.isAxiosError(err)) {
    return { message: GENERIC_NETWORK_MESSAGE, errorCode: "UNKNOWN" };
  }

  if (!err.response) {
    // Network error / timeout / CORS / server không phản hồi.
    return { message: GENERIC_NETWORK_MESSAGE, errorCode: "NETWORK_ERROR" };
  }

  const status = err.response.status;
  const body = err.response.data as Partial<ApiErrorResponseStandard> | undefined;

  if (body && body.success === false) {
    const { message, errorCode = "UNKNOWN", details } = body;

    if (errorCode === "BAD_REQUEST" && isZodIssueArray(details)) {
      return {
        message: message ?? "Dữ liệu không hợp lệ",
        errorCode,
        status,
        fieldErrors: details.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
      };
    }

    if (errorCode === "VALIDATION_ERROR" && Array.isArray(details)) {
      return {
        message: message ?? "Dữ liệu không hợp lệ",
        errorCode,
        status,
        messages: details as string[],
      };
    }

    return { message: message ?? "Đã có lỗi xảy ra, vui lòng thử lại sau", errorCode, status };
  }

  // Không có field `success` — domain Upload (getFileDetail/deleteFile) hoặc lỗi không xác định
  // khác chỉ trả {message} (ERROR_HANDLING.md Mục 4).
  const fallbackMessage =
    (body as { message?: string } | undefined)?.message ?? "Đã có lỗi xảy ra, vui lòng thử lại sau";
  return { message: fallbackMessage, errorCode: "UNKNOWN", status };
}

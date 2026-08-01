/**
 * Error handling middleware for Express applications — Refactored
 */
import { Request, Response, NextFunction } from "express";
import ApiError from "../shared/errors/ApiError";

/**
 * Validate `err.status` trước khi dùng làm HTTP status trong nhánh fallback.
 * Sửa #6 (DOCUMENT_ERROR_ANALYSIS.md, "Low"): trước đây `err.status || 500`
 * tin tưởng mù quáng `err.status` trên bất kỳ object nào được throw — nếu 1
 * lỗi không phải `ApiError` (vd lỗi từ thư viện ngoài như Axios) tình cờ có
 * field `status` không hợp lệ (không phải số nguyên, hoặc ngoài range HTTP),
 * giá trị đó vẫn được dùng trực tiếp làm status code, có thể gây lỗi ở tầng
 * dưới (Express/http) khi set status với giá trị không hợp lệ.
 */
const getSafeStatus = (err: any): number => {
  const status = err?.status;
  const isValidHttpStatus =
    Number.isInteger(status) && status >= 400 && status < 600;
  return isValidHttpStatus ? status : 500;
};

/**
 * Log lỗi có cấu trúc tối thiểu (timestamp, method, path, request-id nếu có,
 * status, message, stack) thay vì `console.error("❌ ERROR:", err)` không có
 * ngữ cảnh.
 *
 * Sửa #5 (DOCUMENT_ERROR_ANALYSIS.md, "Medium"): đây KHÔNG phải structured
 * logger thực thụ (winston/pino) — vẫn dùng `console.error`, chỉ đổi
 * FORMAT để có đủ trường cần thiết cho việc grep/log aggregation cơ bản.
 * TODO: thay bằng winston/pino thực sự khi hạ tầng logging tập trung sẵn
 * sàng (ngoài phạm vi 1 middleware đơn lẻ).
 *
 * `req.id` được đọc từ request-id middleware mới thêm ở `app.ts` (chạy
 * TRƯỚC mọi route) — nếu middleware đó chưa được thêm, `req.id` sẽ là
 * `undefined` và log vẫn hoạt động bình thường (không throw).
 */
const logError = (err: any, req: Request, status: number) => {
  console.error(
    JSON.stringify({
      level: "error",
      timestamp: new Date().toISOString(),
      requestId: (req as any).id,
      method: req.method,
      path: req.originalUrl,
      status,
      errorCode: err?.errorCode,
      message: err?.message,
      stack: err?.stack,
    })
  );
};

/**
 * GLOBAL ERROR HANDLER — duy nhất cho toàn bộ app.
 *
 * Mapping HTTP status:
 *   ApiError (badRequest/notFound/conflict/...) -> err.status đã được gán sẵn khi throw
 *   Mongoose CastError                          -> 400 (id sai format / sai type)
 *   Mongoose ValidationError                    -> 400 (validate schema thất bại)
 *   Lỗi không xác định khác                     -> 500 (hoặc err.status nếu hợp lệ)
 */
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // 1. ApiError — status/errorCode/details đã được gán sẵn khi throw trong service
  if (err instanceof ApiError) {
    logError(err, req, err.status);
    return res.status(err.status).json({
      success: false,
      message: err.message,
      errorCode: err.errorCode || "UNKNOWN_ERROR",
      ...(err.details && { details: err.details }),
    });
  }

  // 2. Mongoose CastError (ví dụ: id không đúng ObjectId format) => 400
  if (err?.name === "CastError") {
    logError(err, req, 400);
    return res.status(400).json({
      success: false,
      message: `Giá trị không hợp lệ cho field '${err.path}'`,
      errorCode: "BAD_REQUEST",
    });
  }

  // 3. Mongoose ValidationError (schema validation thất bại) => 400
  if (err?.name === "ValidationError") {
    const details = Object.values(err.errors || {}).map((e: any) => e.message);
    logError(err, req, 400);
    return res.status(400).json({
      success: false,
      message: "Dữ liệu không hợp lệ",
      errorCode: "VALIDATION_ERROR",
      details,
    });
  }

  // 4. Lỗi không xác định => dùng `getSafeStatus` thay vì tin `err.status` mù quáng
  const status = getSafeStatus(err);
  logError(err, req, status);
  res.status(status).json({
    success: false,
    message: err.message || "Internal Server Error",
    errorCode: err.errorCode || "UNKNOWN_ERROR",
  });
};


/**
 * Error handling middleware for Express applications — Refactored
 */
import { Request, Response, NextFunction } from "express";
import multer from "multer";
import ApiError from "../shared/errors/ApiError";

/**
 * DEV-017/MEDIUM-13 (RV08-01): mô tả tiếng Việt rõ nghĩa cho từng
 * `MulterError.code` — trước đây lỗi Multer (vượt kích thước/số lượng file)
 * không được nhận diện riêng, rơi vào nhánh 500 "lỗi không xác định" (message
 * gốc của thư viện, không thân thiện). Áp dụng cho MỌI route dùng
 * `uploadExcel` (Document import, Department sync, Asset import) và
 * `createUploader()` (Upload module, Calibration certificate).
 */
const MULTER_ERROR_MESSAGES: Record<string, string> = {
  LIMIT_PART_COUNT: "Vượt quá số lượng phần (part) cho phép trong request",
  LIMIT_FILE_SIZE: "File vượt quá kích thước cho phép",
  LIMIT_FILE_COUNT: "Vượt quá số lượng file cho phép",
  LIMIT_FIELD_KEY: "Tên field vượt quá độ dài cho phép",
  LIMIT_FIELD_VALUE: "Giá trị field vượt quá độ dài cho phép",
  LIMIT_FIELD_COUNT: "Vượt quá số lượng field cho phép",
  LIMIT_UNEXPECTED_FILE:
    "Field file không đúng như kỳ vọng (sai tên field hoặc thừa file)",
  MISSING_FIELD_NAME: "Thiếu tên field cho file",
};

/**
 * MongoDB duplicate key error (E11000, vi phạm unique index) — nhãn tiếng
 * Việt cho từng field CÓ `unique: true`/unique index trong toàn bộ models
 * (grep xác nhận: user.username/email, department.code, assetCategory.code,
 * asset.assetCode, document.documentCode, role.name, permission.name).
 * "code"/"name" dùng chung cho nhiều model khác nhau — chấp nhận nhãn hơi
 * chung chung ("Mã"/"Tên") ở 2 trường hợp này, message vẫn kèm giá trị cụ
 * thể nên đủ rõ nghĩa với user.
 */
const DUPLICATE_KEY_FIELD_LABELS: Record<string, string> = {
  username: "Tên đăng nhập",
  email: "Email",
  code: "Mã",
  name: "Tên",
  documentCode: "Mã tài liệu",
  assetCode: "Mã tài sản",
};

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
 *   Multer MulterError (vượt kích thước/số lượng file)  -> 400 (DEV-017/MEDIUM-13)
 *   MongoDB duplicate key (E11000, unique index) -> 409 (lưới đỡ, xem nhánh 2.5)
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

  // 2. Multer MulterError (DEV-017/MEDIUM-13, RV08-01) — trước đây rơi vào
  // nhánh 500 "lỗi không xác định" (nhánh 5 bên dưới), message gốc thư viện
  // không thân thiện. Lưu ý: lỗi sai ĐỊNH DẠNG file (ném từ `fileFilter`)
  // KHÔNG phải instance `MulterError` — đã sửa riêng ở nơi ném lỗi
  // (`upload.middleware.ts`/`services/upload/upload.middleware.ts`) để dùng
  // `ApiError.badRequest` thay vì `Error` thô, xử lý bởi nhánh 1 ở trên.
  if (err instanceof multer.MulterError) {
    const message = MULTER_ERROR_MESSAGES[err.code] || err.message;
    logError(err, req, 400);
    return res.status(400).json({
      success: false,
      message,
      errorCode: `MULTER_${err.code}`,
    });
  }

  // 2.5. MongoDB duplicate key (E11000, vi phạm unique index) => 409 Conflict
  //
  // ⚠️ SỬA (2026-09-10, DEV note FE-14 #24): trước đây KHÔNG có nhánh nhận
  // diện riêng — lỗi driver thô (ví dụ trùng `username` khi service thiếu
  // pre-check) rơi vào nhánh 5 "lỗi không xác định", trả 500 generic. Hầu
  // hết service ĐÃ tự check trùng trước khi ghi (`ApiError.conflict`, xem
  // `users.service.ts` `create()`/`update()`) — nhánh này là LƯỚI ĐỠ cho
  // (a) chỗ nào lỡ thiếu pre-check tương tự, (b) race condition thật giữa
  // 2 request đồng thời cùng qua được pre-check trước khi 1 trong 2 ghi
  // xong (chỉ unique index ở DB mới là ràng buộc cứng tuyệt đối). CÙNG
  // pattern đã áp dụng cho MulterError ở nhánh 2 — map lỗi driver/thư viện
  // sang message thân thiện thay vì để lộ message gốc.
  if (err?.code === 11000) {
    const duplicatedField = Object.keys(err.keyValue || {})[0];
    const label = duplicatedField
      ? DUPLICATE_KEY_FIELD_LABELS[duplicatedField] || duplicatedField
      : "Dữ liệu";
    const value = duplicatedField ? err.keyValue[duplicatedField] : undefined;
    logError(err, req, 409);
    return res.status(409).json({
      success: false,
      message: value !== undefined ? `${label} "${value}" đã tồn tại` : `${label} đã tồn tại`,
      errorCode: "DUPLICATE_KEY",
    });
  }

  // 3. Mongoose CastError (ví dụ: id không đúng ObjectId format) => 400
  if (err?.name === "CastError") {
    logError(err, req, 400);
    return res.status(400).json({
      success: false,
      message: `Giá trị không hợp lệ cho field '${err.path}'`,
      errorCode: "BAD_REQUEST",
    });
  }

  // 4. Mongoose ValidationError (schema validation thất bại) => 400
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

  // 5. Lỗi không xác định => dùng `getSafeStatus` thay vì tin `err.status` mù quáng
  //
  // DEV-021/SEC-23: trước đây trả thẳng `err.message` gốc cho client ở nhánh
  // này — vì đây là lỗi KHÔNG được nhận diện bởi bất kỳ nhánh nào ở trên
  // (không phải ApiError/MulterError/CastError/ValidationError), message gốc
  // có thể lộ chi tiết nội bộ (driver MongoDB, thư viện ngoài...). Log đầy đủ
  // `err.message`/stack ở server qua `logError()` như cũ, nhưng CHỈ trả
  // message generic cho client khi status thật sự là 500 (lỗi nội bộ không
  // xác định) — giữ nguyên `err.message` cho trường hợp hiếm err có `status`
  // 4xx hợp lệ nhưng không khớp bất kỳ nhánh nào ở trên (không phải lỗi nội
  // bộ, không cần ẩn).
  const status = getSafeStatus(err);
  logError(err, req, status);
  res.status(status).json({
    success: false,
    message:
      status === 500
        ? "Đã có lỗi xảy ra, vui lòng thử lại sau"
        : err.message || "Internal Server Error",
    errorCode: err.errorCode || "UNKNOWN_ERROR",
  });
};


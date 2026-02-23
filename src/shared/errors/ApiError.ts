// ApiError.ts
// src/shared/errors/ApiError.ts

//Cấu hình mẫu lỗi API dùng chung trong project
///Giúp chuẩn hóa cách tạo và xử lý lỗi
export default class ApiError extends Error {
  public status: number;
  public errorCode?: string;
  public details?: any;
//✅ Thêm thuộc tính details để cung cấp thông tin chi tiết về lỗi
  constructor(
    status: number,
    message: string,
    errorCode?: string,
    details?: any
  ) {
    super(message);

    this.status = status;
    this.errorCode = errorCode;
    this.details = details;

    Object.setPrototypeOf(this, ApiError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  // ===== Common Errors =====
  //✅ Cập nhật các phương thức tĩnh để sử dụng ApiError mới
  static badRequest(message = "Bad request", details?: any) {
    return new ApiError(400, message, "BAD_REQUEST", details);
  }
//✅ Thêm phương thức 401 Unauthorized
  static unauthorized(message = "Unauthorized") {
    return new ApiError(401, message, "UNAUTHORIZED");
  }
//✅ Thêm phương thức 403 Forbidden
  static forbidden(message = "Forbidden") {
    return new ApiError(403, message, "FORBIDDEN");
  }
//✅ Thêm phương thức 404 Not Found
  static notFound(message = "Not found") {
    return new ApiError(404, message, "NOT_FOUND");
  }
//✅ Thêm phương thức 409 Conflict
  static conflict(message = "Conflict") {
    return new ApiError(409, message, "CONFLICT");
  }
//✅ Thêm phương thức 429 Too Many Requests
  static internal(message = "Internal server error", details?: any) {
    return new ApiError(500, message, "INTERNAL_ERROR", details);
  }

  // ✅ THÊM CÁI NÀY
  static tooManyRequests(message = "Too many requests") {
    return new ApiError(429, message);
  }

    // ✅ THÊM CÁI NÀY
}

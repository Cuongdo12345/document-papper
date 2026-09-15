/**
 * Validate refactored
 * @param schema ZodSchema
 * @returns middleware function
 */

import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";
import ApiError from "../shared/errors/ApiError";

/**
 * Validate req.body theo schema Zod.
 * Nếu fail -> throw ApiError.badRequest(...) -> đi qua next(error) -> errorHandler
 * (KHÔNG res.status() trực tiếp ở đây, để giữ error flow thống nhất toàn app).
 */
export const validateBody =
  (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return next(
        ApiError.badRequest("Dữ liệu gửi lên không hợp lệ", result.error.issues)
      );
    }

    req.body = result.data;
    next();
  };

/**
 * Validate req.query theo schema Zod.
 * Sau khi parse thành công, req.query được gán lại bằng data đã coerce/transform
 * (page, limit thành number; isActive/order/sortBy đã enum-checked, v.v.)
 * để service phía sau nhận đúng type, không cần parse/validate lại.
 *
 * ⚠️ SỬA (BUG NGHIÊM TRỌNG — phát hiện khi code FE-03, 2026-09-05): Express 5
 * định nghĩa `req.query` là accessor CHỈ CÓ getter, KHÔNG setter
 * (`express/lib/request.js` — `defineGetter(req, 'query', ...)`, không có
 * `set`). Gán trực tiếp `req.query = ...` throw
 * `TypeError: Cannot set property query which has only a getter` — crash
 * MỌI route dùng `validateQuery` (đã verify: `/users`, `/documents`,
 * `/rbac/roles` đều 500 "UNKNOWN_ERROR" trước bản vá này — bug hệ thống, ảnh
 * hưởng toàn bộ endpoint list/pagination/filter có `validateQuery`, không
 * chỉ 1 domain). Fix: dùng `Object.defineProperty` để THAY THẾ accessor
 * bằng 1 data property ghi được (an toàn vì Express khai báo
 * `configurable: true` cho property này) — thay vì gán `=` trực tiếp.
 * `req.params`/`req.body` KHÔNG bị lỗi này (không phải accessor, đã verify
 * riêng), nên `validateParams`/`validateBody` giữ nguyên không đổi.
 */
export const validateQuery =
  (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      return next(
        ApiError.badRequest("Query không hợp lệ", result.error.issues)
      );
    }

    Object.defineProperty(req, "query", {
      value: result.data,
      writable: true,
      configurable: true,
      enumerable: true,
    });
    next();
  };

/**
 * Validate req.params theo schema Zod (ví dụ kiểm tra :id đúng ObjectId format).
 * Giúp tránh Mongoose CastError thô khi id sai format.
 */
export const validateParams =
  (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);

    if (!result.success) {
      return next(
        ApiError.badRequest("Tham số đường dẫn không hợp lệ", result.error.issues)
      );
    }

    req.params = result.data as any;
    next();
  };
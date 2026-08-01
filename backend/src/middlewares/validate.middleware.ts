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
 */
export const validateQuery =
  (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      return next(
        ApiError.badRequest("Query không hợp lệ", result.error.issues)
      );
    }

    req.query = result.data as any;
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
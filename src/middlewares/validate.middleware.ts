import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";

export const validateQuery =
  (schema: ZodSchema) =>
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req.query);
      req.query = parsed as any;
      next();
    } catch (error: any) {
      return res.status(400).json({
        message: "Query không hợp lệ",
        errors: error.errors,
      });
    }
  };

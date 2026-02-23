// errorHandler.ts
import { Request, Response, NextFunction } from "express";
import ApiError from "./ApiError";

//Hàm lỗi xử lý trung gian cho Express
export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ message: err.message });
  }
// Handle other unexpected errors
  res.status(500).json({
    message: "Internal server error"
  });
};

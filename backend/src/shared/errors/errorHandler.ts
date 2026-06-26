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


// // errorHandler.ts
// import logger from './logger'; // import logger instance (winston, pino, ...)

// export const errorHandler = (err: any, _req: Request, res: Response, _next: NextFunction) => {
//   // Log đầy đủ thông tin lỗi, kèm request ID nếu có
//   logger.error({
//     message: err.message,
//     stack: err.stack,
//     status: err.status || 500,
//     errorCode: err.errorCode,
//     // Có thể thêm request path, method, user id...
//   });

//   if (err instanceof ApiError) {
//     return res.status(err.status).json({
//       message: err.message,
//       errorCode: err.errorCode, // <<< QUAN TRỌNG: thêm errorCode vào response
//       details: err.details,
//     });
//   }

//   // Log lỗi không xác định với mức độ ưu tiên cao hơn
//   logger.fatal('Unexpected error', err);
//   res.status(500).json({
//     message: 'Internal server error',
//     errorCode: 'INTERNAL_ERROR'
//   });
// };
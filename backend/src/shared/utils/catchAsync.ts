import { Request, Response, NextFunction, RequestHandler } from "express";

/**
 * catchAsync — bọc handler async, tự forward exception vào `next(err)` thay vì
 * để unhandled rejection hoặc phải try/catch thủ công trong từng controller.
 *
 * ⚠️ LƯU Ý: nếu project đã có sẵn 1 file `catchAsync` dùng chung (ví dụ đã áp
 * dụng cho Document module), hãy DÙNG LẠI file đó thay vì file này — chỉ thêm
 * file này nếu chưa tồn tại, để tránh 2 nguồn `catchAsync` khác nhau trong
 * cùng hệ thống.
 */
export const catchAsync =
  (fn: RequestHandler) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
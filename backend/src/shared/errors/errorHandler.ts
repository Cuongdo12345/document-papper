// errorHandler.ts
//
// ⚠️ @deprecated — KHÔNG dùng file này. Đây là phiên bản error handler CŨ,
// không được `app.ts` import (`app.ts` dùng `middlewares/error.middleware.ts`
// làm global error handler duy nhất — xem `error.middleware.ts`).
//
// Sửa #4 (DOCUMENT_ERROR_ANALYSIS.md, "Medium"): 2 file cùng export tên
// `errorHandler` ở 2 thư mục khác nhau (`shared/errors/errorHandler.ts` vs
// `middlewares/error.middleware.ts`) là 1 "footgun" — 1 lần refactor hoặc
// IDE auto-import nhầm có thể vô tình wire lại file YẾU HƠN này vào `app.ts`,
// âm thầm làm mất `errorCode`/`details`/xử lý Mongoose CastError/
// ValidationError mà bản đang chạy đã có.
//
// Không xoá hẳn file trong lượt sửa này (rủi ro nếu có import ẩn nào khác
// trong repo chưa được rà soát hết) — thay vào đó:
//   1. Đánh dấu @deprecated rõ ràng ở đầu file (comment này).
//   2. Thêm `console.warn` khi hàm thực sự được gọi, để nếu vô tình bị wire
//      lại vào `app.ts`, lỗi sẽ hiện ngay trong log thay vì âm thầm mất tính
//      năng.
// TODO: xác nhận không còn import nào khác trỏ tới file này rồi xoá hẳn.
import { Request, Response, NextFunction } from "express";
import ApiError from "./ApiError";

/** @deprecated Dùng `middlewares/error.middleware.ts` thay thế. */
export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  console.warn(
    "[DEPRECATED] shared/errors/errorHandler.ts đang được gọi — " +
    "file này KHÔNG nên được wire vào app.ts. Dùng middlewares/error.middleware.ts thay thế."
  );

  if (err instanceof ApiError) {
    return res.status(err.status).json({ message: err.message });
  }

  res.status(500).json({
    message: "Internal server error",
  });
};


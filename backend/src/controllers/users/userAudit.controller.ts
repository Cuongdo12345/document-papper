// import { Request, Response } from "express";
// import { getAuditLogsService, getAuditDashboardService } from "../services/users/userAudits.service";

// // GET USER AUDIT LOGS (ADMIN)
// // I️⃣ AUDIT LÀ GÌ TRONG BÀI TOÁN NÀY?
// // 👉 Audit = ghi lại lịch sử thao tác trên giấy
// // Ví dụ:
// // Ai tạo giấy
// // Ai cập nhật
// // Ai duyệt
// // Ai từ chối
// // Thời điểm
// // Trạng thái trước & sau


// /**
//  * 📌 GET ALL AUDIT LOGS (ADMIN)
//  */
// export const getAuditLogs = async (req: Request, res: Response) => {
//   try {
//     const result = await getAuditLogsService(req.query as any);
//     res.json(result);
//   } catch (error) {
//     res.status(500).json({
//       message: "Lỗi lấy audit log",
//       error,
//     });
//   }
// };


// /**
//  * 📊 GET AUDIT DASHBOARD
//  */
// export const getAuditDashboard = async (
//   req: Request,
//   res: Response
// ) => {
//   try {
//     const result = await getAuditDashboardService(req.query as any);
//     res.json(result);
//   } catch (error) {
//     res.status(500).json({
//       message: "Lỗi lấy dashboard audit",
//       error,
//     });
//   }
// };

import { Request, Response } from "express";
import {
  getAuditLogsService,
  getAuditDashboardService,
  exportAuditLogsExcel,
  exportAuditLogsCSV,
} from "../../services/users/userAudits.service";
import { catchAsync } from "../../shared/utils/catchAsync";

// GET USER AUDIT LOGS (ADMIN)
// I️⃣ AUDIT LÀ GÌ TRONG BÀI TOÁN NÀY?
// 👉 Audit = ghi lại lịch sử thao tác trên giấy
// Ví dụ:
// Ai tạo giấy
// Ai cập nhật
// Ai duyệt
// Ai từ chối
// Thời điểm
// Trạng thái trước & sau

/**
 * ⚠️ SỬA (review UserAudit module):
 *  1. BUG RÒ RỈ THÔNG TIN ĐÃ SỬA: trước đây `res.status(500).json({message,
 *     error})` trả THẲNG object `error` gốc ra client — có thể lộ stack
 *     trace/chi tiết driver MongoDB. Đã bỏ hẳn, chỉ để `errorHandler` tập
 *     trung xử lý (đã tự log có cấu trúc, không lộ chi tiết ra response).
 *  2. Chuyển sang `catchAsync` — đồng bộ convention Document/Workflow/RBAC/
 *     Auth/Excel.
 */

/**
 * 📌 GET ALL AUDIT LOGS (ADMIN)
 */
export const getAuditLogs = catchAsync(async (req: Request, res: Response) => {
  const result = await getAuditLogsService(req.query as any);
  res.json(result);
});

/**
 * 📊 GET AUDIT DASHBOARD
 */
export const getAuditDashboard = catchAsync(async (req: Request, res: Response) => {
  const result = await getAuditDashboardService(req.query as any);
  res.json(result);
});

/**
 * 📤 EXPORT AUDIT LOGS — GET /audit/export?format=xlsx|csv
 *
 * ⚠️ MỚI — giống hệt `exportDocumentsExcel` bên `excel.controller.ts`:
 * `exportAuditLogsExcel`/`exportAuditLogsCSV` tự lo TOÀN BỘ response (stream
 * file trực tiếp + `res.end()` bên trong) — KHÔNG gọi `res.json/status/send`
 * ở đây sau khi hàm chạy xong.
 *
 * `format` mặc định là `xlsx` nếu không truyền hoặc truyền giá trị khác
 * `csv`/`xlsx` — tránh trường hợp client gõ sai query param rồi nhận lỗi
 * khó hiểu, ưu tiên trả về định dạng phổ biến nhất thay vì reject cứng.
 */
export const exportAuditLogs = catchAsync(async (req: Request, res: Response) => {
  const { format, ...filterQuery } = req.query as Record<string, any>;

  if (format === "csv") {
    await exportAuditLogsCSV(filterQuery, res);
    return;
  }

  await exportAuditLogsExcel(filterQuery, res);
});
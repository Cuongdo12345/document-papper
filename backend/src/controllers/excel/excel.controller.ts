import {
  exportDocumentsExcelPRO,
  importDocumentsExcel,
  syncDepartmentFromExcel,
  getImportExcelTemplate,
  listImportHistory,
} from "../../services/excel/excel.service";
import { Request, Response } from "express";
import { catchAsync } from "../../shared/utils/catchAsync";
import ApiError from "../../shared/errors/ApiError";

/**
 *  EXPORT DOCUMENTS TO EXCEL
 * ⚠️ `exportDocumentsExcelPRO` tự lo TOÀN BỘ response (stream Excel trực
 * tiếp + `res.end()` bên trong) — KHÔNG gọi `res.json/status/send` sau khi
 * hàm chạy xong.
 *
 * 🟡 DEPARTMENT-SCOPED EXPORT: dùng cùng quy ước "SUPER ADMIN BYPASS" như
 * `authorizePermission.middleware.ts` (`role.name === "ADMIN"`), KHÔNG phải
 * 1 permission riêng — để đồng bộ đúng 1 khái niệm "ADMIN" duy nhất trong hệ
 * thống thay vì tạo thêm khái niệm phân quyền song song.
 *
 * - ADMIN: `department` là filter TUỲ CHỌN — có thể truyền hoặc bỏ trống để
 *   export toàn công ty.
 * - Không phải ADMIN: `department` trên query bị GHI ĐÈ bằng
 *   `req.user.department` — không phải "filter mặc định" mà là RÀNG BUỘC
 *   bắt buộc, user không thể tự ý export khoa khác bằng cách sửa query string.
 */
export const exportDocumentsExcel = catchAsync(async (req: Request, res: Response) => {
  const isAdmin = req.user?.role?.name === "ADMIN";

  if (!isAdmin && !req.user?.department) {
    throw ApiError.forbidden("Tài khoản của bạn chưa được gán khoa nên không thể export");
  }

  const department = isAdmin ? req.query.department : req.user!.department!.toString();

  await exportDocumentsExcelPRO({ ...req.query, department }, res);
});

/**
 * 🟠 FILE MẪU IMPORT (GET /excel/template)
 * Trả về file Excel có sẵn header đúng chuẩn — giảm lỗi sai định dạng cột
 * từ phía user, dùng kết hợp với validate header ở `importDocumentsExcel`.
 */
export const downloadImportTemplate = catchAsync(async (req: Request, res: Response) => {
  await getImportExcelTemplate(res);
});

/**
 * API importExcel data
 *
 * 🟠 DRY-RUN: `?dryRun=true` → chạy toàn bộ validate + đối chiếu proposal/
 * report trùng lặp, nhưng KHÔNG ghi DB. Trả về preview
 * `{ created, updated, reportsCreated, preview: [...], errors }` để user xác
 * nhận trước khi import thật (gọi lại đúng request nhưng bỏ `dryRun`).
 */
export const importDocumentsExcelData = catchAsync(async (req: Request, res: Response) => {
  if (!req.file) {
    throw ApiError.badRequest("Vui lòng chọn file Excel");
  }

  const dryRun = String(req.query.dryRun).toLowerCase() === "true";

  const result = await importDocumentsExcel(req.file.buffer, req.user!._id, {
    dryRun,
    fileName: req.file.originalname,
  });

  res.json({
    success: true,
    message: dryRun ? "Xem trước import thành công (chưa lưu dữ liệu)" : "Import thành công",
    data: result,
  });
});

/**
 * 🟢 LỊCH SỬ IMPORT (audit trail) — GET /excel/import-history
 *
 * Cùng quy ước phân quyền với department-scoped export ở trên: ADMIN xem
 * TOÀN BỘ lịch sử import của mọi user; không phải ADMIN chỉ xem được lịch
 * sử của CHÍNH MÌNH — `importedBy` không phải filter tuỳ chọn cho user
 * thường, mà là ràng buộc bắt buộc áp trước khi vào service.
 */
export const getImportHistory = catchAsync(async (req: Request, res: Response) => {
  const isAdmin = req.user?.role?.name === "ADMIN";

  const data = await listImportHistory(req.query, {
    importedBy: isAdmin ? undefined : req.user!._id,
  });

  res.json({ success: true, data });
});

/**
 * API đồng bộ name department
 */
export const syncDepartmentData = catchAsync(async (req: Request, res: Response) => {
  if (!req.file) {
    throw ApiError.badRequest("Vui lòng chọn file Excel");
  }

  const result = await syncDepartmentFromExcel(req.file.buffer);

  res.json({
    success: true,
    message: "Đồng bộ dữ liệu khoa thành công",
    data: result,
  });
});



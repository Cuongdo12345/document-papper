import { Request, Response, NextFunction } from "express";
import {
  adminDashboardSummaryService,
  departmentDashboardService,
  proposalConversionByDepartmentService,
  deviceDamageTrendByMonthService,
  topDamagedDevicesService,
  getDashboardDeviceStats,
  topDamagedInkService,
} from "../../services/dashboard/dashboard.service";
import {
  getAssetDashboardSummaryService,
  getWarrantyExpiringListService,
  getMaintenanceOverdueListService,
} from "../../services/assets/assetDashboard.service";
import ApiError from "../../shared/errors/ApiError";
import { parsePaginationQuery, parseOptionalDate } from "../../shared/utils/Queryparsing.util";
import { catchAsync } from "../../shared/utils/catchAsync"; 

/* =====================================================================
   GHI CHÚ REFACTOR:
   1. Toàn bộ controller giờ dùng `parsePaginationQuery()` thay vì tự parse
      page/limit/sortBy/sortOrder bằng tay ở từng hàm — có whitelist
      sortBy + clamp limit tối đa (chặn client truyền field/limit tuỳ ý).
   2. `getDashboardDeviceStatsData` trước đây tự bắt lỗi và trả res.status(500)
      thủ công, KHÔNG đi qua error middleware chung như các controller khác
      → nay dùng `next(error)` nhất quán toàn bộ file.
   3. fromDate/toDate được validate qua `parseOptionalDate()` — throw 400 rõ
      ràng nếu client truyền ngày không hợp lệ, thay vì tạo `Invalid Date`
      âm thầm lọt vào query.
===================================================================== */
// ⚠️ chỉnh lại path cho đúng vị trí file catchAsync thực tế trong project

/* =====================================================================
   GHI CHÚ REFACTOR (catchAsync):
   1. Toàn bộ controller bỏ try/catch + next(error) thủ công, thay bằng
      catchAsync() bọc ngoài — mọi exception (kể cả throw đồng bộ trong
      hàm async) tự động được Promise.resolve().catch(next) forward vào
      error middleware. Không còn nguy cơ quên catch ở handler nào.
   2. Logic nghiệp vụ bên trong giữ NGUYÊN 100% — chỉ đổi phần bọc handler,
      không đổi hành vi.
   3. Không cần import NextFunction nữa vì catchAsync tự quản lý ký hiệu
      (req, res, next) ở tầng wrapper.
===================================================================== */

// 🏥 ADMIN DASHBOARD SUMMARY
export const adminDashboardSummary = catchAsync(async (req: Request, res: Response) => {
  // Lưu ý: đây là rule NGHIÊM NGẶT HƠN route-level `authorizePermission`.
  // Route cho phép ADMIN (bypass) HOẶC bất kỳ user nào có quyền
  // DASHBOARD_READ; endpoint admin-summary business yêu cầu CHỈ ADMIN mới
  // được xem — nên vẫn cần check thêm ở đây, không phải logic thừa.
  if (req.user!.role.name !== "ADMIN") {
    throw ApiError.forbidden("Chỉ ADMIN được truy cập dashboard");
  }

  const data = await adminDashboardSummaryService();

  res.json({ success: true, data });
});

// 🏢 DEPARTMENT DASHBOARD
export const getDepartmentDashboard = catchAsync(async (req: Request, res: Response) => {
  const { departmentId } = req.params;

  const data = await departmentDashboardService(departmentId);

  res.json({ success: true, data });
});

// 📊 PROPOSAL CONVERSION BY DEPARTMENT
export const getProposalConversionByDepartment = catchAsync(async (req: Request, res: Response) => {
  const { page, limit, sortBy, sortOrder } = parsePaginationQuery(req.query, {
    allowedSortBy: ["conversionRate", "totalProposals", "converted", "departmentName"],
    defaultSortBy: "conversionRate",
    defaultLimit: 10,
    maxLimit: 100,
  });

  const data = await proposalConversionByDepartmentService({ page, limit, sortBy, sortOrder });

  res.json({ success: true, data });
});

// 📉 DEVICE DAMAGE TREND BY MONTH
export const getDeviceDamageTrend = catchAsync(async (req: Request, res: Response) => {
  const { page, limit, sortBy, sortOrder } = parsePaginationQuery(req.query, {
    allowedSortBy: ["monthLabel", "year", "month", "totalReports"],
    defaultSortBy: "monthLabel",
    defaultLimit: 12,
    maxLimit: 60,
  });

  const data = await deviceDamageTrendByMonthService({ page, limit, sortBy, sortOrder });

  res.json({ success: true, data });
});

// 🔝 TOP DAMAGED DEVICES
export const getTopDamagedDevices = catchAsync(async (req: Request, res: Response) => {
  const { department, fromDate, toDate } = req.query;
  const { page, limit, sortBy, sortOrder } = parsePaginationQuery(req.query, {
    allowedSortBy: ["totalBroken", "totalReports", "deviceName"],
    defaultSortBy: "totalBroken",
    defaultLimit: 10,
    maxLimit: 100,
  });

  const data = await topDamagedDevicesService({
    department,
    fromDate: parseOptionalDate(fromDate, "fromDate"),
    toDate: parseOptionalDate(toDate, "toDate"),
    page,
    limit,
    sortBy,
    sortOrder,
  });

  res.json({ success: true, data });
});

// 🔝 TOP DAMAGED INK
export const getTopDamagedInk = catchAsync(async (req: Request, res: Response) => {
  const { department, fromDate, toDate } = req.query;
  const { page, limit, sortBy, sortOrder } = parsePaginationQuery(req.query, {
    allowedSortBy: ["totalBroken", "totalReports", "deviceName"],
    defaultSortBy: "totalBroken",
    defaultLimit: 10,
    maxLimit: 100,
  });

  const data = await topDamagedInkService({
    department,
    fromDate: parseOptionalDate(fromDate, "fromDate"),
    toDate: parseOptionalDate(toDate, "toDate"),
    page,
    limit,
    sortBy,
    sortOrder,
  });

  res.json({ success: true, data });
});

/**
 * Thống kê tổng số lượng mực, sửa chữa, dự trù theo tháng/năm (PROPOSAL).
 */
export const getDashboardDeviceStatsData = catchAsync(async (req: Request, res: Response) => {
  const { month, year } = req.query;
  const { page, limit, sortBy, sortOrder } = parsePaginationQuery(req.query, {
    allowedSortBy: ["totalQuantity", "deviceName"],
    defaultSortBy: "totalQuantity",
    defaultLimit: 20,
    maxLimit: 100,
  });

  const data = await getDashboardDeviceStats({
    month: month as string,
    year: year as string,
    page,
    limit,
    sortBy,
    sortOrder,
  });

  res.status(200).json({ success: true, data });
});

/* =====================================================================
   GIAI ĐOẠN 4 (module Asset) — Dashboard thống kê tài sản
===================================================================== */

// 💻 ASSET SUMMARY — đếm theo status/category/department + tổng giá trị mua
export const getAssetDashboardSummary = catchAsync(async (req: Request, res: Response) => {
  const data = await getAssetDashboardSummaryService();

  res.json({ success: true, data });
});

// ⚠️ ASSET SẮP HẾT HẠN BẢO HÀNH
export const getAssetWarrantyExpiring = catchAsync(async (req: Request, res: Response) => {
  const parsedDaysAhead = Number(req.query.daysAhead);
  const daysAhead = Number.isFinite(parsedDaysAhead) && parsedDaysAhead >= 0 ? parsedDaysAhead : 30;
  const data = await getWarrantyExpiringListService(daysAhead, req.query);

  res.json({ success: true, ...data });
});

// 🔧 ASSET BẢO TRÌ QUÁ HẠN
export const getAssetMaintenanceOverdue = catchAsync(async (req: Request, res: Response) => {
  const parsedDaysThreshold = Number(req.query.daysThreshold);
  const daysThreshold = Number.isFinite(parsedDaysThreshold) && parsedDaysThreshold >= 0 ? parsedDaysThreshold : 7;
  const data = await getMaintenanceOverdueListService(daysThreshold, req.query);

  res.json({ success: true, ...data });
});

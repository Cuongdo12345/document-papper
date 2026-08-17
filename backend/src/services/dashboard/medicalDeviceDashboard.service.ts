// services/assets/medicalDeviceDashboard.service.ts
//
// GIAI ĐOẠN 4 (module Quản lý Thiết bị Y tế) — Dashboard compliance. Đặt
// trong `services/assets/` (không phải `services/dashboard/`) — mirror
// đúng quyết định đã có ở `assetDashboard.service.ts` (Giai đoạn 4 module
// Asset): giữ toàn bộ logic của module tập trung 1 chỗ,
// `dashboard.controller.ts`/`dashboard.route.ts` chỉ import và expose ra.
//
// KHÁC 1 ĐIỂM so với `assetDashboard.service.ts`: dùng
// `runPaginatedAggregate` (tiện ích dùng chung ở `Queryparsing.util.ts`)
// thay vì tự viết lại `$facet` phân trang bằng tay — đây là pattern MỚI
// HƠN, đã được ghi nhận là hướng refactor đúng trong
// `dashboard.controller.ts` (xem "GHI CHÚ REFACTOR" ở đầu file đó).
// `assetDashboard.service.ts` viết trước khi có tiện ích này nên chưa dùng
// — không sửa lại file đó ở đây (ngoài phạm vi Giai đoạn 4 module Thiết bị
// Y tế), nhưng code MỚI nên theo pattern tốt hơn thay vì copy pattern cũ.

import { PipelineStage } from "mongoose";
import { MedicalDeviceProfile } from "../../models/assets/medicalDeviceProfile.model";
import {
  runPaginatedAggregate,
  SortOrder,
} from "../../shared/utils/Queryparsing.util";

/**
 * 📌 TỔNG QUAN — tổng số thiết bị theo class (A/B/C/D) + tỷ lệ đã/chưa
 * kiểm định đúng hạn. Đúng yêu cầu §5 tài liệu thiết kế gốc:
 * "Tổng số thiết bị theo class, tỷ lệ đã/chưa kiểm định đúng hạn".
 *
 * TRONG 1 LẦN aggregate duy nhất (dùng `$facet`) — cùng pattern hiệu năng
 * đã áp dụng ở `getAssetDashboardSummaryService`.
 *
 * Chỉ tính profile có Asset liên kết đang `isActive: true` — nhất quán với
 * quyết định đã chốt ở Giai đoạn 2/3 (Asset đã DISPOSED/xoá mềm thì không
 * còn được coi là "đang quản lý").
 */
export const getMedicalDeviceDashboardSummaryService = async () => {
  const now = new Date();

  const pipeline: PipelineStage[] = [
    {
      $lookup: {
        from: "assets",
        localField: "asset",
        foreignField: "_id",
        as: "assetDoc",
      },
    },
    { $unwind: "$assetDoc" },
    { $match: { "assetDoc.isActive": true } },
    {
      $facet: {
        byClass: [
          { $group: { _id: "$deviceClass", count: { $sum: 1 } } },
          { $project: { _id: 0, deviceClass: "$_id", count: 1 } },
          { $sort: { deviceClass: 1 } },
        ],
        calibrationCompliance: [
          { $match: { requiresCalibration: true } },
          {
            $group: {
              _id: null,
              totalRequiresCalibration: { $sum: 1 },
              overdue: {
                $sum: {
                  $cond: [{ $lt: ["$nextCalibrationDueDate", now] }, 1, 0],
                },
              },
            },
          },
          {
            $project: {
              _id: 0,
              totalRequiresCalibration: 1,
              overdue: 1,
            },
          },
        ],
        totals: [{ $count: "totalProfiles" }],
      },
    },
  ];

  const [result] = await MedicalDeviceProfile.aggregate(pipeline);

  const compliance = result?.calibrationCompliance?.[0] ?? {
    totalRequiresCalibration: 0,
    overdue: 0,
  };
  const onTime = compliance.totalRequiresCalibration - compliance.overdue;
  // `complianceRate = null` (KHÔNG phải 0) khi không có thiết bị nào cần
  // kiểm định — trả 0% sẽ khiến FE hiểu nhầm "toàn bộ thiết bị đều trễ
  // hạn" trong khi thực ra không có dữ liệu để tính tỷ lệ.
  const complianceRate =
    compliance.totalRequiresCalibration > 0
      ? Number((onTime / compliance.totalRequiresCalibration).toFixed(4))
      : null;

  return {
    byClass: result?.byClass ?? [],
    totalProfiles: result?.totals?.[0]?.totalProfiles ?? 0,
    calibrationCompliance: {
      totalRequiresCalibration: compliance.totalRequiresCalibration,
      onTime,
      overdue: compliance.overdue,
      complianceRate,
    },
  };
};

// ⚠️ SỬA (phát hiện khi review lại): export constant này ra để
// `dashboard.controller.ts` import dùng chung cho `allowedSortBy` — trước
// đây controller khai 1 mảng RIÊNG `["nextCalibrationDueDate",
// "deviceClass"]` giống hệt giá trị ở đây nhưng độc lập hoàn toàn (2 nguồn
// "sự thật" trùng lặp). Nếu sau này chỉ sửa 1 trong 2 chỗ (VD thêm sortBy
// mới ở service mà quên thêm ở controller), client sẽ luôn nhận lỗi 400
// "sortBy không hợp lệ" dù service đã hỗ trợ — cùng LOẠI lỗi (2 nguồn dữ
// liệu trùng lặp, dễ trôi lệch) đã gây ra hàng loạt bug permission-string
// trong dự án này trước đó.
export const CALIBRATION_DUE_ALLOWED_SORT_BY = [
  "nextCalibrationDueDate",
  "deviceClass",
] as const;

/**
 * 📌 DANH SÁCH SẮP/ĐÃ QUÁ HẠN KIỂM ĐỊNH — đúng yêu cầu §5 tài liệu thiết
 * kế gốc. Cùng ngưỡng mặc định 30 ngày với `medicalDeviceAlerts.service.ts`
 * (Giai đoạn 3), NHƯNG KHÔNG lọc theo `calibrationAlertSentAt` như cron —
 * đây là danh sách XEM TOÀN BỘ cho dashboard, không phải danh sách "chưa
 * được thông báo" (mirror đúng nguyên tắc đã ghi ở
 * `getWarrantyExpiringListService`, module Asset).
 */
export const getCalibrationDueListService = async (
  daysAhead: number,
  params: {
    page: number;
    limit: number;
    sortBy: string;
    sortOrder: SortOrder;
  },
) => {
  const now = new Date();
  const threshold = new Date(now);
  threshold.setDate(threshold.getDate() + daysAhead);

  const sortBy = CALIBRATION_DUE_ALLOWED_SORT_BY.includes(
    params.sortBy as (typeof CALIBRATION_DUE_ALLOWED_SORT_BY)[number],
  )
    ? params.sortBy
    : "nextCalibrationDueDate";
  const sortStage: Record<string, 1 | -1> = {
    [sortBy]: params.sortOrder === "asc" ? 1 : -1,
  };

  const basePipeline: PipelineStage[] = [
    {
      $match: {
        requiresCalibration: true,
        nextCalibrationDueDate: { $lte: threshold },
      },
    },
    {
      $lookup: {
        from: "assets",
        localField: "asset",
        foreignField: "_id",
        as: "assetDoc",
      },
    },
    { $unwind: "$assetDoc" },
    { $match: { "assetDoc.isActive": true } },
    {
      $lookup: {
        from: "departments",
        localField: "assetDoc.department",
        foreignField: "_id",
        as: "departmentDoc",
      },
    },
    { $unwind: { path: "$departmentDoc", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        deviceClass: 1,
        registrationNumber: 1,
        requiresCalibration: 1,
        calibrationIntervalMonths: 1,
        lastCalibrationDate: 1,
        nextCalibrationDueDate: 1,
        isOverdue: { $lt: ["$nextCalibrationDueDate", now] },
        asset: {
          _id: "$assetDoc._id",
          name: "$assetDoc.name",
          assetCode: "$assetDoc.assetCode",
          department: {
            _id: "$departmentDoc._id",
            code: "$departmentDoc.code",
            name: "$departmentDoc.name",
          },
        },
      },
    },
  ];

  const { items, pagination } = await runPaginatedAggregate(
    MedicalDeviceProfile,
    basePipeline,
    { page: params.page, limit: params.limit, sortStage },
  );

  return { data: items, pagination };
};

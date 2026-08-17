// services/assets/assetDashboard.service.ts
//
// GIAI ĐOẠN 4 — Dashboard thống kê Asset. Đặt trong `services/assets/`
// (không phải `services/dashboard/`) để giữ toàn bộ logic module Asset
// tập trung 1 chỗ — `dashboard.controller.ts`/`dashboard.route.ts` chỉ
// import và expose ra, không chứa business logic của module Asset.

import { Asset, AssetStatus } from "../../models/assets/asset.model";
import { PipelineStage } from "mongoose";

/**
 * 📌 TỔNG QUAN — đếm theo status/category/department + tổng giá trị mua,
 * TRONG 1 LẦN aggregate duy nhất (dùng `$facet`, cùng pattern hiệu năng đã
 * áp dụng ở `dashboard.service.ts` — quét collection 1 lần thay vì N lần
 * cho N nhóm thống kê khác nhau).
 */
export const getAssetDashboardSummaryService = async () => {
  const pipeline: PipelineStage[] = [
    { $match: { isActive: true } },
    {
      $facet: {
        byStatus: [
          { $group: { _id: "$status", count: { $sum: 1 } } },
          { $project: { _id: 0, status: "$_id", count: 1 } },
        ],
        byCategory: [
          {
            $group: {
              _id: "$category",
              count: { $sum: 1 },
            },
          },
          {
            $lookup: {
              from: "assetcategories",
              localField: "_id",
              foreignField: "_id",
              as: "category",
            },
          },
          { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
          {
            $project: {
              _id: 0,
              categoryId: "$_id",
              categoryCode: "$category.code",
              categoryName: "$category.name",
              count: 1,
            },
          },
          { $sort: { count: -1 } },
        ],
        byDepartment: [
          {
            $group: {
              _id: "$department",
              count: { $sum: 1 },
            },
          },
          {
            $lookup: {
              from: "departments",
              localField: "_id",
              foreignField: "_id",
              as: "department",
            },
          },
          {
            $unwind: {
              path: "$department",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $project: {
              _id: 0,
              departmentId: "$_id",
              departmentCode: "$department.code",
              departmentName: "$department.name",
              count: 1,
            },
          },
          { $sort: { count: -1 } },
        ],
        totalValue: [
          {
            $group: {
              _id: null,
              totalAssets: { $sum: 1 },
              totalPurchaseValue: { $sum: { $ifNull: ["$purchasePrice", 0] } },
            },
          },
          { $project: { _id: 0, totalAssets: 1, totalPurchaseValue: 1 } },
        ],
      },
    },
  ];

  const [result] = await Asset.aggregate(pipeline);

  return {
    byStatus: result?.byStatus ?? [],
    byCategory: result?.byCategory ?? [],
    byDepartment: result?.byDepartment ?? [],
    totalAssets: result?.totalValue?.[0]?.totalAssets ?? 0,
    totalPurchaseValue: result?.totalValue?.[0]?.totalPurchaseValue ?? 0,
  };
};

/**
 * 📌 DANH SÁCH SẮP HẾT HẠN BẢO HÀNH — cùng ngưỡng 30 ngày với
 * `assetAlerts.service.ts` (KHÔNG lọc theo `warrantyAlertSentAt` như cron —
 * đây là danh sách XEM TOÀN BỘ cho dashboard, không phải danh sách "chưa
 * được thông báo").
 */
export const getWarrantyExpiringListService = async (
  daysAhead = 30,
  query: any = {},
) => {
  const { page = 1, limit = 10 } = query;
  const pageNumber = Math.max(parseInt(page, 10), 1);
  const pageSize = Math.max(parseInt(limit, 10), 1);
  const skip = (pageNumber - 1) * pageSize;

  const threshold = new Date();
  threshold.setDate(threshold.getDate() + Number(daysAhead));

  const filter = {
    isActive: true,
    warrantyExpiredAt: { $lte: threshold },
    status: { $nin: [AssetStatus.DISPOSED, AssetStatus.LOST] },
  };

  const [data, total] = await Promise.all([
    Asset.find(filter)
      .populate("category", "code name")
      .populate("department", "code name")
      .sort({ warrantyExpiredAt: 1 }) // sắp hết hạn SỚM NHẤT lên đầu
      .skip(skip)
      .limit(pageSize),
    Asset.countDocuments(filter),
  ]);

  return {
    data,
    pagination: {
      page: pageNumber,
      limit: pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
};

/**
 * 📌 DANH SÁCH BẢO TRÌ QUÁ HẠN — cùng ngưỡng 7 ngày với
 * `assetAlerts.service.ts`. Kèm `daysInMaintenance` tính sẵn cho FE khỏi
 * phải tự tính lại.
 */
export const getMaintenanceOverdueListService = async (
  daysThreshold = 7,
  query: any = {},
) => {
  const { page = 1, limit = 10 } = query;
  const pageNumber = Math.max(parseInt(page, 10), 1);
  const pageSize = Math.max(parseInt(limit, 10), 1);
  const skip = (pageNumber - 1) * pageSize;

  const threshold = new Date();
  threshold.setDate(threshold.getDate() - Number(daysThreshold));

  const filter = {
    isActive: true,
    status: AssetStatus.UNDER_MAINTENANCE,
    maintenanceStartedAt: { $lte: threshold },
  };

  const [assets, total] = await Promise.all([
    Asset.find(filter)
      .populate("category", "code name")
      .populate("department", "code name")
      .sort({ maintenanceStartedAt: 1 }) // bảo trì LÂU NHẤT lên đầu
      .skip(skip)
      .limit(pageSize),
    Asset.countDocuments(filter),
  ]);

  const now = Date.now();
  const data = assets.map((asset) => {
    const obj = asset.toObject();
    return {
      ...obj,
      daysInMaintenance: asset.maintenanceStartedAt
        ? Math.floor((now - asset.maintenanceStartedAt.getTime()) / (1000 * 60 * 60 * 24))
        : null,
    };
  });

  return {
    data,
    pagination: {
      page: pageNumber,
      limit: pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
};

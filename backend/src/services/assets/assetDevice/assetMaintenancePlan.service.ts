// services/assets/assetDevice/assetMaintenancePlan.service.ts
//
// Roadmap B2 (Lịch bảo trì chủ động, 2026-09-15, user chỉ định implement
// sau khi xác nhận đây LÀ nhu cầu thật, khác lựa chọn nhẹ hơn "chỉ xem lại
// hạn kiểm định đã có sẵn dạng calendar"). Xem giải thích thiết kế đầy đủ ở
// `interfaces/assets/assetMaintenancePlan.interface.ts` — ĐỘC LẬP hoàn
// toàn với `assetMaintenance.service.ts` (luồng PHẢN ỨNG qua Document
// PROPOSE_REPAIR) — 2 khái niệm "bảo trì" khác nhau, không dùng chung field
// `Asset.maintenanceStartedAt`/`status`.

import mongoose from "mongoose";
import { Asset } from "../../../models/assets/asset.model";
import {
  AssetMaintenancePlan,
} from "../../../models/assets/assetMaintenancePlan.model";
import { MaintenancePlanStatus } from "../../../interfaces/assets/assetMaintenancePlan.interface";
import ApiError from "../../../shared/errors/ApiError";

const PLAN_POPULATE = [
  { path: "createdBy", select: "username fullName" },
  { path: "completedBy", select: "username fullName" },
  { path: "cancelledBy", select: "username fullName" },
];

/** Gắn `isOverdue` (TÍNH THÊM, không lưu DB) — kế hoạch còn "planned" nhưng đã qua `scheduledDate`. Dùng cho cả lịch sử theo asset lẫn calendar, để FE không phải tự tính lại. */
const withIsOverdue = (plan: any) => {
  const obj = plan.toObject ? plan.toObject() : plan;
  return {
    ...obj,
    isOverdue: obj.status === MaintenancePlanStatus.PLANNED && obj.scheduledDate < new Date(),
  };
};

/**
 * 📌 CREATE — lên lịch bảo trì mới cho 1 Asset. Không giới hạn số lượng
 * plan "planned" cùng lúc cho 1 asset (có thể lên kế hoạch cho nhiều hạng
 * mục khác nhau, VD "Bảo trì định kỳ quý 1" + "Vệ sinh bộ lọc").
 */
export const createMaintenancePlanService = async (
  assetId: any,
  payload: any,
  userId?: any,
) => {
  if (!mongoose.Types.ObjectId.isValid(assetId)) {
    throw ApiError.badRequest("ID tài sản không hợp lệ");
  }

  const asset = await Asset.findOne({ _id: assetId, isActive: true });
  if (!asset) {
    throw ApiError.notFound("Không tìm thấy tài sản");
  }

  const plan = await AssetMaintenancePlan.create({
    asset: assetId,
    title: payload.title,
    description: payload.description,
    scheduledDate: payload.scheduledDate,
    status: MaintenancePlanStatus.PLANNED,
    createdBy: userId,
  });

  return withIsOverdue(await plan.populate(PLAN_POPULATE));
};

/**
 * 📌 GET — lịch sử kế hoạch bảo trì theo 1 asset, mới nhất trước, có phân
 * trang. Mirror đúng pattern `getCalibrationHistoryService`.
 */
export const getMaintenancePlansForAssetService = async (
  assetId: any,
  query: any,
) => {
  if (!mongoose.Types.ObjectId.isValid(assetId)) {
    throw ApiError.badRequest("ID tài sản không hợp lệ");
  }

  const asset = await Asset.findOne({ _id: assetId, isActive: true });
  if (!asset) {
    throw ApiError.notFound("Không tìm thấy tài sản");
  }

  const { page = 1, limit = 20 } = query;
  const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
  const pageSize = Math.max(parseInt(limit, 10) || 20, 1);
  const skip = (pageNumber - 1) * pageSize;

  const filter = { asset: assetId };

  const [plans, total] = await Promise.all([
    AssetMaintenancePlan.find(filter)
      .populate(PLAN_POPULATE)
      .sort({ scheduledDate: -1 })
      .skip(skip)
      .limit(pageSize),
    AssetMaintenancePlan.countDocuments(filter),
  ]);

  return {
    data: plans.map(withIsOverdue),
    pagination: {
      page: pageNumber,
      limit: pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
};

/** Tìm 1 plan còn "planned" — dùng chung cho update/complete/cancel (đều chỉ áp dụng khi còn planned). */
const findPlannedPlanOrFail = async (planId: any) => {
  if (!mongoose.Types.ObjectId.isValid(planId)) {
    throw ApiError.badRequest("ID kế hoạch bảo trì không hợp lệ");
  }

  const plan = await AssetMaintenancePlan.findById(planId);
  if (!plan) {
    throw ApiError.notFound("Không tìm thấy kế hoạch bảo trì");
  }
  if (plan.status !== MaintenancePlanStatus.PLANNED) {
    throw ApiError.badRequest(
      `Kế hoạch đã ở trạng thái "${plan.status}", không thể sửa/xử lý tiếp — kế hoạch đã hoàn tất/huỷ được giữ nguyên làm lịch sử.`,
    );
  }
  return plan;
};

/**
 * 📌 UPDATE — sửa thông tin (tên/mô tả/ngày dự kiến) khi CÒN "planned".
 * KHÔNG cho sửa plan đã completed/cancelled — giữ đúng lịch sử đã xảy ra
 * (cùng triết lý `CalibrationRecord`/`DocumentVersion` trong dự án: bản ghi
 * đã đóng thì bất biến).
 */
export const updateMaintenancePlanService = async (
  planId: any,
  payload: any,
  userId?: any,
) => {
  const plan = await findPlannedPlanOrFail(planId);

  if (payload.title !== undefined) plan.title = payload.title;
  if (payload.description !== undefined) plan.description = payload.description;
  if (payload.scheduledDate !== undefined) plan.scheduledDate = payload.scheduledDate;
  plan.updatedBy = userId;

  await plan.save();
  return withIsOverdue(await plan.populate(PLAN_POPULATE));
};

/** 📌 COMPLETE — đánh dấu đã thực hiện xong. */
export const completeMaintenancePlanService = async (
  planId: any,
  userId?: any,
  resolutionNote?: string,
) => {
  const plan = await findPlannedPlanOrFail(planId);

  plan.status = MaintenancePlanStatus.COMPLETED;
  plan.completedAt = new Date();
  plan.completedBy = userId;
  plan.resolutionNote = resolutionNote;

  await plan.save();
  return withIsOverdue(await plan.populate(PLAN_POPULATE));
};

/** 📌 CANCEL — huỷ kế hoạch (VD thiết bị đã thanh lý, kế hoạch không còn cần thiết). */
export const cancelMaintenancePlanService = async (
  planId: any,
  userId?: any,
  resolutionNote?: string,
) => {
  const plan = await findPlannedPlanOrFail(planId);

  plan.status = MaintenancePlanStatus.CANCELLED;
  plan.cancelledAt = new Date();
  plan.cancelledBy = userId;
  plan.resolutionNote = resolutionNote;

  await plan.save();
  return withIsOverdue(await plan.populate(PLAN_POPULATE));
};

/**
 * 📌 CALENDAR — TOÀN BỘ kế hoạch (mọi trạng thái — FE tự phân biệt qua
 * `status`/`isOverdue` để tô màu) có `scheduledDate` rơi trong 1 tháng cụ
 * thể, xuyên suốt MỌI asset (không department-scope, cùng nguyên tắc RBAC
 * đơn giản đã áp dụng cho toàn bộ domain Asset — xem `asset.routes.ts`,
 * không có nhánh ABAC nào). `department` filter TUỲ CHỌN lọc theo khoa của
 * asset — filter TRONG BỘ NHỚ sau khi populate (số lượng plan/tháng dự
 * kiến nhỏ, không cần `$lookup` aggregation).
 */
export const getMaintenanceCalendarService = async (query: any) => {
  const { month, year, department } = query;

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 1); // đầu tháng kế tiếp — dùng $lt, tránh lỗi timezone khi tính "cuối tháng"

  const plans = await AssetMaintenancePlan.find({
    scheduledDate: { $gte: monthStart, $lt: monthEnd },
  })
    .populate({
      path: "asset",
      select: "assetCode name department",
      populate: { path: "department", select: "code name" },
    })
    .populate(PLAN_POPULATE)
    .sort({ scheduledDate: 1 });

  const filtered = department
    ? plans.filter((p: any) => p.asset?.department?._id?.toString() === department)
    : plans;

  return filtered.map(withIsOverdue);
};

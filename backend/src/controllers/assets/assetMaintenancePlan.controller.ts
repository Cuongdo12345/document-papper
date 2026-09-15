// controllers/assets/assetMaintenancePlan.controller.ts
//
// Roadmap B2 (Lịch bảo trì chủ động, 2026-09-15).
import { Request, Response } from "express";
import {
  createMaintenancePlanService,
  getMaintenancePlansForAssetService,
  updateMaintenancePlanService,
  completeMaintenancePlanService,
  cancelMaintenancePlanService,
  getMaintenanceCalendarService,
} from "../../services/assets/assetDevice/assetMaintenancePlan.service";
import { catchAsync } from "../../shared/utils/catchAsync";

export const createMaintenancePlan = catchAsync(async (req: Request, res: Response) => {
  const plan = await createMaintenancePlanService(req.params.assetId, req.body, req.user?._id);

  res.status(201).json({
    message: "Tạo kế hoạch bảo trì thành công",
    data: plan,
  });
});

export const getMaintenancePlansForAsset = catchAsync(async (req: Request, res: Response) => {
  const result = await getMaintenancePlansForAssetService(req.params.assetId, req.query);

  res.json({
    message: "Lấy lịch sử kế hoạch bảo trì thành công",
    ...result,
  });
});

export const updateMaintenancePlan = catchAsync(async (req: Request, res: Response) => {
  const plan = await updateMaintenancePlanService(req.params.id, req.body, req.user?._id);

  res.json({
    message: "Cập nhật kế hoạch bảo trì thành công",
    data: plan,
  });
});

export const completeMaintenancePlan = catchAsync(async (req: Request, res: Response) => {
  const plan = await completeMaintenancePlanService(req.params.id, req.user?._id, req.body.resolutionNote);

  res.json({
    message: "Đánh dấu hoàn tất kế hoạch bảo trì thành công",
    data: plan,
  });
});

export const cancelMaintenancePlan = catchAsync(async (req: Request, res: Response) => {
  const plan = await cancelMaintenancePlanService(req.params.id, req.user?._id, req.body.resolutionNote);

  res.json({
    message: "Huỷ kế hoạch bảo trì thành công",
    data: plan,
  });
});

export const getMaintenanceCalendar = catchAsync(async (req: Request, res: Response) => {
  const plans = await getMaintenanceCalendarService(req.query);

  res.json({
    message: "Lấy lịch bảo trì thành công",
    data: plans,
  });
});

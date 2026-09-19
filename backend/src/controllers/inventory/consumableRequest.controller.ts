// controllers/inventory/consumableRequest.controller.ts
//
// Roadmap B8 (Dự trù/đề xuất mua vật tư tiêu hao hàng tháng, DEV-067, 2026-09-18).
import { Request, Response } from "express";
import {
  createConsumableRequestService,
  getAllConsumableRequestsService,
  getConsumableRequestByIdService,
  updateConsumableRequestService,
  fulfillConsumableRequestService,
  cancelConsumableRequestService,
} from "../../services/inventory/consumableRequest.service";
import { catchAsync } from "../../shared/utils/catchAsync";

export const createConsumableRequest = catchAsync(async (req: Request, res: Response) => {
  const request = await createConsumableRequestService(req.body, req.user?._id);

  res.status(201).json({
    message: "Ghi nhận đề xuất vật tư thành công",
    data: request,
  });
});

export const getAllConsumableRequests = catchAsync(async (req: Request, res: Response) => {
  const result = await getAllConsumableRequestsService(req.query);

  res.json({
    message: "Lấy danh sách đề xuất vật tư thành công",
    ...result,
  });
});

export const getConsumableRequestById = catchAsync(async (req: Request, res: Response) => {
  const request = await getConsumableRequestByIdService(req.params.id);

  res.json({
    message: "Lấy chi tiết đề xuất vật tư thành công",
    data: request,
  });
});

export const updateConsumableRequest = catchAsync(async (req: Request, res: Response) => {
  const request = await updateConsumableRequestService(req.params.id, req.body, req.user?._id);

  res.json({
    message: "Cập nhật đề xuất vật tư thành công",
    data: request,
  });
});

export const fulfillConsumableRequest = catchAsync(async (req: Request, res: Response) => {
  const request = await fulfillConsumableRequestService(req.params.id, req.user?._id);

  res.json({
    message: "Đã đánh dấu đề xuất là đã mua",
    data: request,
  });
});

export const cancelConsumableRequest = catchAsync(async (req: Request, res: Response) => {
  const request = await cancelConsumableRequestService(req.params.id, req.user?._id);

  res.json({
    message: "Đã huỷ đề xuất vật tư",
    data: request,
  });
});

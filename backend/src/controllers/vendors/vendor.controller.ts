// controllers/vendors/vendor.controller.ts
//
// Roadmap B4 (Quản lý nhà cung cấp & hợp đồng bảo trì, 2026-09-16).
import { Request, Response } from "express";
import {
  createVendorService,
  getAllVendorsService,
  getVendorByIdService,
  updateVendorService,
  bulkDeleteVendorService,
  bulkRestoreVendorService,
} from "../../services/vendors/vendor.service";
import { catchAsync } from "../../shared/utils/catchAsync";

export const createVendor = catchAsync(async (req: Request, res: Response) => {
  const vendor = await createVendorService(req.body, req.user?._id);

  res.status(201).json({
    message: "Tạo nhà cung cấp thành công",
    data: vendor,
  });
});

export const getAllVendors = catchAsync(async (req: Request, res: Response) => {
  const result = await getAllVendorsService(req.query);

  res.json({
    message: "Lấy danh sách nhà cung cấp thành công",
    ...result,
  });
});

export const getVendorById = catchAsync(async (req: Request, res: Response) => {
  const vendor = await getVendorByIdService(req.params.id);

  res.json({
    message: "Lấy chi tiết nhà cung cấp thành công",
    data: vendor,
  });
});

export const updateVendor = catchAsync(async (req: Request, res: Response) => {
  const vendor = await updateVendorService(req.params.id, req.body, req.user?._id);

  res.json({
    message: "Cập nhật nhà cung cấp thành công",
    data: vendor,
  });
});

export const bulkDeleteVendors = catchAsync(async (req: Request, res: Response) => {
  const result = await bulkDeleteVendorService(req.body.ids, req.user?._id);

  res.json({
    message: `Đã xoá ${result.deletedIds.length}/${req.body.ids.length} nhà cung cấp`,
    data: result,
  });
});

export const bulkRestoreVendors = catchAsync(async (req: Request, res: Response) => {
  const result = await bulkRestoreVendorService(req.body.ids, req.user?._id);

  res.json({
    message: `Đã khôi phục ${result.deletedIds.length}/${req.body.ids.length} nhà cung cấp`,
    data: result,
  });
});

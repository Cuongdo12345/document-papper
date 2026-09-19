// controllers/inventory/consumableCategory.controller.ts
import { Request, Response } from "express";
import {
  createConsumableCategoryService,
  getAllConsumableCategoriesService,
  getConsumableCategoryByIdService,
  updateConsumableCategoryService,
  deleteConsumableCategoryService,
  bulkDeleteConsumableCategoryService,
  restoreConsumableCategoryService,
  bulkRestoreConsumableCategoryService,
} from "../../services/inventory/consumableCategory.service";
import { catchAsync } from "../../shared/utils/catchAsync";

export const createConsumableCategory = catchAsync(async (req: Request, res: Response) => {
  const category = await createConsumableCategoryService(req.body);

  res.status(201).json({
    message: "Tạo nhóm vật tư thành công",
    data: category,
  });
});

export const getAllConsumableCategories = catchAsync(async (req: Request, res: Response) => {
  const result = await getAllConsumableCategoriesService(req.query);

  res.json({
    message: "Lấy danh sách nhóm vật tư thành công",
    ...result,
  });
});

export const getConsumableCategoryById = catchAsync(async (req: Request, res: Response) => {
  const category = await getConsumableCategoryByIdService(req.params.id);

  res.json({
    message: "Lấy chi tiết nhóm vật tư thành công",
    data: category,
  });
});

export const updateConsumableCategory = catchAsync(async (req: Request, res: Response) => {
  const category = await updateConsumableCategoryService(req.params.id, req.body);

  res.json({
    message: "Cập nhật nhóm vật tư thành công",
    data: category,
  });
});

export const deleteConsumableCategory = catchAsync(async (req: Request, res: Response) => {
  await deleteConsumableCategoryService(req.params.id, req.user?._id);

  res.json({
    message: "Xoá nhóm vật tư thành công",
  });
});

export const bulkDeleteConsumableCategories = catchAsync(async (req: Request, res: Response) => {
  const result = await bulkDeleteConsumableCategoryService(req.body.ids, req.user?._id);

  res.json({
    message: `Đã xoá ${result.deletedIds.length}/${req.body.ids.length} nhóm vật tư`,
    data: result,
  });
});

export const restoreConsumableCategory = catchAsync(async (req: Request, res: Response) => {
  const category = await restoreConsumableCategoryService(req.params.id);

  res.json({
    message: "Khôi phục nhóm vật tư thành công",
    data: category,
  });
});

export const bulkRestoreConsumableCategories = catchAsync(async (req: Request, res: Response) => {
  const result = await bulkRestoreConsumableCategoryService(req.body.ids);

  res.json({
    message: `Đã khôi phục ${result.deletedIds.length}/${req.body.ids.length} nhóm vật tư`,
    data: result,
  });
});

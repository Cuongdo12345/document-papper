// controllers/inventory/consumableItem.controller.ts
//
// Roadmap B3 (Quản lý vật tư tiêu hao, 2026-09-15).
import { Request, Response } from "express";
import {
  createConsumableItemService,
  getAllConsumableItemsService,
  getConsumableItemByIdService,
  updateConsumableItemService,
  bulkDeleteConsumableItemService,
  bulkRestoreConsumableItemService,
  createConsumableTransactionService,
  getConsumableTransactionsService,
} from "../../services/inventory/consumableItem.service";
import { runConsumableAlertsService } from "../../services/inventory/consumableAlerts.service";
import { catchAsync } from "../../shared/utils/catchAsync";

export const createConsumableItem = catchAsync(async (req: Request, res: Response) => {
  const item = await createConsumableItemService(req.body, req.user?._id);

  res.status(201).json({
    message: "Tạo vật tư thành công",
    data: item,
  });
});

export const getAllConsumableItems = catchAsync(async (req: Request, res: Response) => {
  const result = await getAllConsumableItemsService(req.query);

  res.json({
    message: "Lấy danh sách vật tư thành công",
    ...result,
  });
});

export const getConsumableItemById = catchAsync(async (req: Request, res: Response) => {
  const item = await getConsumableItemByIdService(req.params.id);

  res.json({
    message: "Lấy chi tiết vật tư thành công",
    data: item,
  });
});

export const updateConsumableItem = catchAsync(async (req: Request, res: Response) => {
  const item = await updateConsumableItemService(req.params.id, req.body, req.user?._id);

  res.json({
    message: "Cập nhật vật tư thành công",
    data: item,
  });
});

export const bulkDeleteConsumableItems = catchAsync(async (req: Request, res: Response) => {
  const result = await bulkDeleteConsumableItemService(req.body.ids, req.user?._id);

  res.json({
    message: `Đã xoá ${result.deletedIds.length}/${req.body.ids.length} vật tư`,
    data: result,
  });
});

export const bulkRestoreConsumableItems = catchAsync(async (req: Request, res: Response) => {
  const result = await bulkRestoreConsumableItemService(req.body.ids, req.user?._id);

  res.json({
    message: `Đã khôi phục ${result.deletedIds.length}/${req.body.ids.length} vật tư`,
    data: result,
  });
});

export const createConsumableTransaction = catchAsync(async (req: Request, res: Response) => {
  const transaction = await createConsumableTransactionService(req.params.id, req.body, req.user?._id);

  res.status(201).json({
    message: "Ghi nhận giao dịch kho thành công",
    data: transaction,
  });
});

export const getConsumableTransactions = catchAsync(async (req: Request, res: Response) => {
  const result = await getConsumableTransactionsService(req.params.id, req.query);

  res.json({
    message: "Lấy lịch sử giao dịch kho thành công",
    ...result,
  });
});

export const runConsumableAlerts = catchAsync(async (_req: Request, res: Response) => {
  const result = await runConsumableAlertsService();

  res.json({
    message: "Đã chạy kiểm tra cảnh báo tồn kho thấp",
    data: result,
  });
});

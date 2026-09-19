// controllers/vendors/contract.controller.ts
//
// Roadmap B4 (2026-09-16).
import { Request, Response } from "express";
import {
  createContractService,
  getAllContractsService,
  getContractsForAssetService,
  getContractByIdService,
  updateContractService,
  cancelContractService,
  restoreContractService,
} from "../../services/vendors/contract.service";
import { runContractAlertsService } from "../../services/vendors/contractAlerts.service";
import { catchAsync } from "../../shared/utils/catchAsync";

export const createContract = catchAsync(async (req: Request, res: Response) => {
  const contract = await createContractService(req.body, req.user?._id);

  res.status(201).json({
    message: "Tạo hợp đồng thành công",
    data: contract,
  });
});

export const getAllContracts = catchAsync(async (req: Request, res: Response) => {
  const result = await getAllContractsService(req.query);

  res.json({
    message: "Lấy danh sách hợp đồng thành công",
    ...result,
  });
});

export const getContractsForAsset = catchAsync(async (req: Request, res: Response) => {
  const contracts = await getContractsForAssetService(req.params.assetId);

  res.json({
    message: "Lấy danh sách hợp đồng theo tài sản thành công",
    data: contracts,
  });
});

export const getContractById = catchAsync(async (req: Request, res: Response) => {
  const contract = await getContractByIdService(req.params.id);

  res.json({
    message: "Lấy chi tiết hợp đồng thành công",
    data: contract,
  });
});

export const updateContract = catchAsync(async (req: Request, res: Response) => {
  const contract = await updateContractService(req.params.id, req.body, req.user?._id);

  res.json({
    message: "Cập nhật hợp đồng thành công",
    data: contract,
  });
});

export const cancelContract = catchAsync(async (req: Request, res: Response) => {
  const contract = await cancelContractService(req.params.id, req.user?._id, req.body.cancelReason);

  res.json({
    message: "Huỷ hợp đồng thành công",
    data: contract,
  });
});

export const restoreContract = catchAsync(async (req: Request, res: Response) => {
  const contract = await restoreContractService(req.params.id, req.user?._id);

  res.json({
    message: "Khôi phục hợp đồng thành công",
    data: contract,
  });
});

export const runContractAlerts = catchAsync(async (_req: Request, res: Response) => {
  const result = await runContractAlertsService();

  res.json({
    message: "Đã chạy kiểm tra cảnh báo hợp đồng sắp hết hạn",
    data: result,
  });
});

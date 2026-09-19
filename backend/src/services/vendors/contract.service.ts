// services/vendors/contract.service.ts
//
// Roadmap B4 (2026-09-16) — CRUD hợp đồng bảo trì/bảo hành, xem giải thích
// thiết kế đầy đủ ở `interfaces/vendors/contract.interface.ts`.

import mongoose from "mongoose";
import { Vendor } from "../../models/vendors/vendor.model";
import { Contract } from "../../models/vendors/contract.model";
import { Asset } from "../../models/assets/asset.model";
import { ContractStatus } from "../../interfaces/vendors/contract.interface";
import ApiError from "../../shared/errors/ApiError";

const CONTRACT_POPULATE = [
  { path: "vendor", select: "name contactPerson phone email" },
  { path: "assets", select: "assetCode name department", populate: { path: "department", select: "code name" } },
  { path: "createdBy", select: "username fullName" },
  { path: "cancelledBy", select: "username fullName" },
];

/** `isExpired` — TÍNH THÊM (không lưu DB), cùng pattern `isOverdue`/`isLowStock` ở B2/B3. */
const withIsExpired = (contract: any) => {
  const obj = contract.toObject ? contract.toObject() : contract;
  return {
    ...obj,
    isExpired: obj.status === ContractStatus.ACTIVE && obj.endDate < new Date(),
  };
};

/** Kiểm tra vendor tồn tại + đang hoạt động — dùng cho create. */
const validateVendorActive = async (vendorId: any) => {
  const vendor = await Vendor.findOne({ _id: vendorId, isActive: true });
  if (!vendor) {
    throw ApiError.notFound("Không tìm thấy nhà cung cấp, hoặc nhà cung cấp đã ngừng hợp tác");
  }
};

/** Kiểm tra TOÀN BỘ asset trong danh sách đều tồn tại + đang active — 1 query duy nhất, không N+1. */
const validateAssetsActive = async (assetIds: string[]) => {
  const uniqueIds = [...new Set(assetIds)];
  const count = await Asset.countDocuments({ _id: { $in: uniqueIds }, isActive: true });
  if (count !== uniqueIds.length) {
    throw ApiError.badRequest("Có tài sản không tồn tại hoặc không còn hoạt động trong danh sách đã chọn");
  }
};

/** 📌 CREATE — tạo hợp đồng mới, áp dụng cho 1 hoặc nhiều tài sản. */
export const createContractService = async (payload: any, userId?: any) => {
  await validateVendorActive(payload.vendor);
  await validateAssetsActive(payload.assets);

  const contract = await Contract.create({
    vendor: payload.vendor,
    assets: payload.assets,
    contractNumber: payload.contractNumber,
    title: payload.title,
    description: payload.description,
    startDate: payload.startDate,
    endDate: payload.endDate,
    status: ContractStatus.ACTIVE,
    createdBy: userId,
  });

  return withIsExpired(await contract.populate(CONTRACT_POPULATE));
};

/**
 * 📌 LIST — danh sách hợp đồng, phân trang. Filter tuỳ chọn theo
 * `vendor`/`asset` (hợp đồng có chứa asset này trong `assets[]`)/`status`/
 * `expiringWithinDays` (còn hiệu lực VÀ hết hạn trong N ngày tới).
 */
export const getAllContractsService = async (query: any) => {
  const { page = 1, limit = 20, vendor, asset, status, expiringWithinDays } = query;

  const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
  const pageSize = Math.max(parseInt(limit, 10) || 20, 1);
  const skip = (pageNumber - 1) * pageSize;

  const filter: Record<string, unknown> = {};
  if (vendor) filter.vendor = vendor;
  if (asset) filter.assets = asset; // Mongoose tự match "asset nằm trong mảng assets[]"
  // "expired" KHÔNG phải giá trị enum thật của `Contract.status` — dịch sang
  // đúng 2 field DB thật (status="active" VÀ endDate đã qua), khớp chính xác
  // định nghĩa `isExpired` ở `withIsExpired()`. "active" ở đây cũng đổi nghĩa
  // thành "còn hiệu lực thật sự" (loại trừ luôn phần đã hết hạn), khớp đúng
  // badge "Còn hiệu lực" hiển thị trên UI — KHÔNG còn trả về hợp đồng đã hết
  // hạn khi lọc "active" như trước (2026-09-16, user báo lọc bị lẫn dữ liệu).
  if (status === "expired") {
    filter.status = ContractStatus.ACTIVE;
    filter.endDate = { $lt: new Date() };
  } else if (status === ContractStatus.ACTIVE) {
    filter.status = ContractStatus.ACTIVE;
    filter.endDate = { $gte: new Date() };
  } else if (status) {
    filter.status = status;
  }
  if (expiringWithinDays) {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() + parseInt(expiringWithinDays, 10));
    filter.status = ContractStatus.ACTIVE;
    filter.endDate = { $lte: threshold };
  }

  const [contracts, total] = await Promise.all([
    Contract.find(filter)
      .populate(CONTRACT_POPULATE)
      .sort({ endDate: 1 })
      .skip(skip)
      .limit(pageSize),
    Contract.countDocuments(filter),
  ]);

  return {
    data: contracts.map(withIsExpired),
    pagination: {
      page: pageNumber,
      limit: pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
};

/** 📌 THEO ASSET — mọi hợp đồng (mọi trạng thái) có chứa asset này, dùng cho section trong `AssetDetailPage`. */
export const getContractsForAssetService = async (assetId: any) => {
  if (!mongoose.Types.ObjectId.isValid(assetId)) {
    throw ApiError.badRequest("ID tài sản không hợp lệ");
  }

  const contracts = await Contract.find({ assets: assetId })
    .populate(CONTRACT_POPULATE)
    .sort({ endDate: -1 });

  return contracts.map(withIsExpired);
};

/** Tìm 1 contract theo ID hoặc throw — dùng chung cho getById/update/cancel. */
const findContractOrFail = async (contractId: any) => {
  if (!mongoose.Types.ObjectId.isValid(contractId)) {
    throw ApiError.badRequest("ID hợp đồng không hợp lệ");
  }

  const contract = await Contract.findById(contractId);
  if (!contract) {
    throw ApiError.notFound("Không tìm thấy hợp đồng");
  }
  return contract;
};

export const getContractByIdService = async (contractId: any) => {
  const contract = await findContractOrFail(contractId);
  return withIsExpired(await contract.populate(CONTRACT_POPULATE));
};

/**
 * 📌 UPDATE — sửa thông tin hợp đồng CÒN "active". KHÔNG cho sửa hợp đồng
 * đã "cancelled" — giữ đúng lịch sử (cùng triết lý `AssetMaintenancePlan`).
 * KHÔNG cho sửa `vendor` (đổi NCC = ký hợp đồng khác, tạo mới thay vì sửa).
 */
export const updateContractService = async (contractId: any, payload: any, userId?: any) => {
  const contract = await findContractOrFail(contractId);
  if (contract.status !== ContractStatus.ACTIVE) {
    throw ApiError.badRequest(
      `Hợp đồng đã ở trạng thái "${contract.status}", không thể sửa — hợp đồng đã huỷ được giữ nguyên làm lịch sử.`,
    );
  }

  if (payload.assets !== undefined) {
    await validateAssetsActive(payload.assets);
    contract.assets = payload.assets;
  }
  if (payload.contractNumber !== undefined) contract.contractNumber = payload.contractNumber;
  if (payload.title !== undefined) contract.title = payload.title;
  if (payload.description !== undefined) contract.description = payload.description;
  if (payload.startDate !== undefined) contract.startDate = payload.startDate;
  if (payload.endDate !== undefined) {
    contract.endDate = payload.endDate;
    // Đổi ngày hết hạn → reset cờ cảnh báo, cùng pattern `warrantyAlertSentAt`.
    contract.expiryAlertSentAt = null;
  }
  contract.updatedBy = userId;

  await contract.save();
  return withIsExpired(await contract.populate(CONTRACT_POPULATE));
};

/** 📌 CANCEL — huỷ hợp đồng trước hạn (VD chấm dứt hợp tác với NCC). */
export const cancelContractService = async (contractId: any, userId?: any, cancelReason?: string) => {
  const contract = await findContractOrFail(contractId);
  if (contract.status !== ContractStatus.ACTIVE) {
    throw ApiError.badRequest(`Hợp đồng đã ở trạng thái "${contract.status}", không thể huỷ lại.`);
  }

  contract.status = ContractStatus.CANCELLED;
  contract.cancelledAt = new Date();
  contract.cancelledBy = userId;
  contract.cancelReason = cancelReason;

  await contract.save();
  return withIsExpired(await contract.populate(CONTRACT_POPULATE));
};

/**
 * 📌 RESTORE — khôi phục hợp đồng đã huỷ nhầm về "active" (DEV-058,
 * 2026-09-16, user yêu cầu). Xoá (unset) `cancelledAt/cancelledBy/
 * cancelReason` — mirror đúng UX Vendor/ConsumableItem "khôi phục sau khi
 * xoá mềm". CHỈ áp dụng cho hợp đồng đang "cancelled" — không có tác dụng
 * (và không cần) với hợp đồng "active".
 */
export const restoreContractService = async (contractId: any, userId?: any) => {
  const contract = await findContractOrFail(contractId);
  if (contract.status !== ContractStatus.CANCELLED) {
    throw ApiError.badRequest(`Hợp đồng đang ở trạng thái "${contract.status}", không thể khôi phục.`);
  }

  contract.status = ContractStatus.ACTIVE;
  contract.cancelledAt = undefined;
  contract.cancelledBy = undefined;
  contract.cancelReason = undefined;
  contract.updatedBy = userId;

  await contract.save();
  return withIsExpired(await contract.populate(CONTRACT_POPULATE));
};

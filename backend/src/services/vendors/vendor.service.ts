// services/vendors/vendor.service.ts
//
// Roadmap B4 (Quản lý nhà cung cấp & hợp đồng bảo trì, 2026-09-16, user chỉ
// định implement phương án ĐẦY ĐỦ sau khi xác nhận qua AskUserQuestion: xây
// domain Vendor + Contract riêng, KHÔNG chỉ thêm field nhẹ vào Asset).

import mongoose from "mongoose";
import { Vendor } from "../../models/vendors/vendor.model";
import ApiError from "../../shared/errors/ApiError";
import { escapeRegex } from "../../shared/utils/regex.util";
import { runBulkDelete } from "../../shared/utils/bulkDelete.util";

/** 📌 CREATE — tạo nhà cung cấp mới. */
export const createVendorService = async (payload: any, userId?: any) => {
  const vendor = await Vendor.create({
    name: payload.name,
    contactPerson: payload.contactPerson,
    phone: payload.phone,
    email: payload.email || undefined,
    address: payload.address,
    taxCode: payload.taxCode,
    notes: payload.notes,
    createdBy: userId,
  });

  return vendor;
};

/** 📌 LIST — danh sách nhà cung cấp, phân trang. Mặc định chỉ trả `isActive=true`. */
export const getAllVendorsService = async (query: any) => {
  const { page = 1, limit = 20, search, isActive } = query;

  const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
  const pageSize = Math.max(parseInt(limit, 10) || 20, 1);
  const skip = (pageNumber - 1) * pageSize;

  const filter: Record<string, unknown> = {};
  filter.isActive = isActive !== undefined ? isActive : true;

  if (search) {
    const safeKeyword = escapeRegex(search);
    filter.name = { $regex: safeKeyword, $options: "i" };
  }

  const [vendors, total] = await Promise.all([
    Vendor.find(filter).sort({ name: 1 }).skip(skip).limit(pageSize),
    Vendor.countDocuments(filter),
  ]);

  return {
    data: vendors,
    pagination: {
      page: pageNumber,
      limit: pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
};

/** Tìm 1 vendor theo ID hoặc throw — dùng chung cho getById/update. */
const findVendorOrFail = async (vendorId: any) => {
  if (!mongoose.Types.ObjectId.isValid(vendorId)) {
    throw ApiError.badRequest("ID nhà cung cấp không hợp lệ");
  }

  const vendor = await Vendor.findById(vendorId);
  if (!vendor) {
    throw ApiError.notFound("Không tìm thấy nhà cung cấp");
  }
  return vendor;
};

export const getVendorByIdService = async (vendorId: any) => {
  return findVendorOrFail(vendorId);
};

/** 📌 UPDATE — sửa thông tin nhà cung cấp, bao gồm bật/tắt `isActive`. */
export const updateVendorService = async (vendorId: any, payload: any, userId?: any) => {
  const vendor = await findVendorOrFail(vendorId);

  if (payload.name !== undefined) vendor.name = payload.name;
  if (payload.contactPerson !== undefined) vendor.contactPerson = payload.contactPerson;
  if (payload.phone !== undefined) vendor.phone = payload.phone;
  if (payload.email !== undefined) vendor.email = payload.email || undefined;
  if (payload.address !== undefined) vendor.address = payload.address;
  if (payload.taxCode !== undefined) vendor.taxCode = payload.taxCode;
  if (payload.notes !== undefined) vendor.notes = payload.notes;
  if (payload.isActive !== undefined) vendor.isActive = payload.isActive;
  vendor.updatedBy = userId;

  await vendor.save();
  return vendor;
};

/**
 * 📌 BULK DELETE (xoá mềm hàng loạt — DEV-060, 2026-09-16). Nhà cung cấp
 * KHÔNG có service delete riêng — "ngừng hợp tác" từng dòng vốn đã là gọi
 * `updateVendorService(id, {isActive:false})` (xem `VendorsListPage` FE),
 * nên bulk cũng gọi lại đúng hàm UPDATE này, KHÔNG viết logic mới.
 */
export const bulkDeleteVendorService = async (ids: string[], userId?: any) => {
  return runBulkDelete(ids, (id) => updateVendorService(id, { isActive: false }, userId));
};

/**
 * 📌 BULK RESTORE (khôi phục hàng loạt — DEV-062, 2026-09-17). Cùng lý do
 * `bulkDeleteVendorService` ở trên — Vendor chưa có route/service restore
 * đơn lẻ, frontend tự khôi phục qua `updateVendorService(id,
 * {isActive:true})` (permission VENDOR_UPDATE). Bulk restore tái dùng ĐÚNG
 * cách đó.
 */
export const bulkRestoreVendorService = async (ids: string[], userId?: any) => {
  return runBulkDelete(ids, (id) => updateVendorService(id, { isActive: true }, userId), "Khôi phục thất bại");
};

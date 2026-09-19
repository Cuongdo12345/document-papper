// services/inventory/consumableRequest.service.ts
//
// Roadmap B8 (Dự trù/đề xuất mua vật tư tiêu hao hàng tháng, DEV-067,
// 2026-09-18) — xem giải thích thiết kế đầy đủ ở
// `interfaces/inventory/consumableRequest.interface.ts`. Domain TÁCH BIỆT
// hoàn toàn với `consumableItem.service.ts`/`ConsumableTransaction` — chỉ
// ĐỌC `ConsumableItem` để validate item hợp lệ, KHÔNG ghi/sửa tồn kho.

import mongoose from "mongoose";
import Department from "../../models/departments/department.model";
import { ConsumableItem } from "../../models/inventory/consumableItem.model";
import { ConsumableRequest } from "../../models/inventory/consumableRequest.model";
import { ConsumableRequestStatus } from "../../interfaces/inventory/consumableRequest.interface";
import ApiError from "../../shared/errors/ApiError";

const REQUEST_POPULATE = [
  { path: "department", select: "code name" },
  { path: "items.consumableItem", select: "name unit" },
  { path: "createdBy", select: "username fullName" },
  { path: "updatedBy", select: "username fullName" },
];

/**
 * Validate từng item: `ConsumableItem` phải tồn tại, đang hoạt động (`isActive`),
 * VÀ thuộc ĐÚNG `departmentId` của request (không cho đề xuất vật tư của
 * khoa/phòng khác — mỗi khoa/phòng chỉ dự trù cho chính danh mục của mình,
 * cùng nguyên tắc "tồn kho theo TỪNG khoa/phòng" đã xác lập ở B3). Trả về
 * items đã gắn `totalPrice` + tổng `totalAmount` toàn bộ request.
 */
async function buildItemsWithTotals(items: any[], departmentId: any) {
  const itemIds = items.map((i) => i.consumableItem);
  const found = await ConsumableItem.find({ _id: { $in: itemIds } });
  const foundById = new Map(found.map((i) => [i._id.toString(), i]));

  let totalAmount = 0;
  const built = items.map((i) => {
    const item = foundById.get(String(i.consumableItem));
    if (!item) {
      throw ApiError.notFound(`Không tìm thấy vật tư (id: ${i.consumableItem})`);
    }
    if (!item.isActive) {
      throw ApiError.badRequest(`Vật tư "${item.name}" đã ngừng theo dõi, không thể đề xuất`);
    }
    if (item.department.toString() !== departmentId.toString()) {
      throw ApiError.badRequest(`Vật tư "${item.name}" không thuộc khoa/phòng đang đề xuất`);
    }

    const totalPrice = i.quantity * i.unitPrice;
    totalAmount += totalPrice;
    return {
      consumableItem: i.consumableItem,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      totalPrice,
    };
  });

  return { items: built, totalAmount };
}

/** 📌 CREATE — ghi nhận 1 đề xuất/dự trù mới. KHÔNG có bước duyệt (user xác nhận B8) — trạng thái luôn bắt đầu PENDING. */
export const createConsumableRequestService = async (payload: any, userId?: any) => {
  const department = await Department.findById(payload.department);
  if (!department) {
    throw ApiError.notFound("Không tìm thấy phòng ban");
  }

  const { items, totalAmount } = await buildItemsWithTotals(payload.items, payload.department);

  const request = await ConsumableRequest.create({
    department: payload.department,
    requestMonth: payload.requestMonth,
    items,
    totalAmount,
    status: ConsumableRequestStatus.PENDING,
    note: payload.note,
    createdBy: userId,
  });

  return (await request.populate(REQUEST_POPULATE)).toObject();
};

/**
 * 📌 LIST — danh sách đề xuất, phân trang. Không tự động giới hạn theo
 * phòng ban của người gọi (CÙNG nguyên tắc RBAC đơn giản đã áp dụng cho
 * domain Asset/ConsumableItem — FE tự lọc `?department=` theo nhu cầu).
 */
export const getAllConsumableRequestsService = async (query: any) => {
  const { page = 1, limit = 20, department, status, requestMonth } = query;

  const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
  const pageSize = Math.max(parseInt(limit, 10) || 20, 1);
  const skip = (pageNumber - 1) * pageSize;

  const filter: Record<string, unknown> = {};
  if (department) filter.department = department;
  if (status) filter.status = status;
  if (requestMonth) filter.requestMonth = requestMonth;

  const [requests, total] = await Promise.all([
    ConsumableRequest.find(filter)
      .populate(REQUEST_POPULATE)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize),
    ConsumableRequest.countDocuments(filter),
  ]);

  return {
    data: requests,
    pagination: {
      page: pageNumber,
      limit: pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
};

const findConsumableRequestOrFail = async (requestId: any) => {
  if (!mongoose.Types.ObjectId.isValid(requestId)) {
    throw ApiError.badRequest("ID đề xuất không hợp lệ");
  }

  const request = await ConsumableRequest.findById(requestId);
  if (!request) {
    throw ApiError.notFound("Không tìm thấy đề xuất");
  }
  return request;
};

export const getConsumableRequestByIdService = async (requestId: any) => {
  const request = await findConsumableRequestOrFail(requestId);
  return (await request.populate(REQUEST_POPULATE)).toObject();
};

/**
 * 📌 UPDATE — CHỈ sửa được khi đang `PENDING` (đã "chốt" thì không cho sửa
 * ngầm — muốn đổi phải Huỷ rồi tạo lại, giữ lịch sử rõ ràng, cùng triết lý
 * bất biến sau khi khoá trạng thái đã dùng cho Document/DocumentVersion).
 */
export const updateConsumableRequestService = async (requestId: any, payload: any, userId?: any) => {
  const request = await findConsumableRequestOrFail(requestId);

  if (request.status !== ConsumableRequestStatus.PENDING) {
    throw ApiError.badRequest("Chỉ có thể sửa đề xuất đang ở trạng thái chờ xử lý (PENDING)");
  }

  if (payload.items !== undefined) {
    const { items, totalAmount } = await buildItemsWithTotals(payload.items, request.department);
    request.items = items;
    request.totalAmount = totalAmount;
  }
  if (payload.note !== undefined) request.note = payload.note;

  request.updatedBy = userId;
  await request.save();

  return (await request.populate(REQUEST_POPULATE)).toObject();
};

/** 📌 ĐÁNH DẤU ĐÃ MUA — thao tác tay của Phòng Vật tư-TTB/IT sau khi mua thực tế xong. CHỦ Ý KHÔNG tự sinh `ConsumableTransaction` (xem giải thích ở interface). */
export const fulfillConsumableRequestService = async (requestId: any, userId?: any) => {
  const request = await findConsumableRequestOrFail(requestId);

  if (request.status !== ConsumableRequestStatus.PENDING) {
    throw ApiError.badRequest("Chỉ có thể đánh dấu đã mua cho đề xuất đang ở trạng thái chờ xử lý (PENDING)");
  }

  request.status = ConsumableRequestStatus.FULFILLED;
  request.updatedBy = userId;
  await request.save();

  return (await request.populate(REQUEST_POPULATE)).toObject();
};

/** 📌 HUỶ — nhu cầu không còn cần nữa. Giữ lại bản ghi (không xoá cứng), cùng nguyên tắc audit-trail xuyên suốt dự án. */
export const cancelConsumableRequestService = async (requestId: any, userId?: any) => {
  const request = await findConsumableRequestOrFail(requestId);

  if (request.status !== ConsumableRequestStatus.PENDING) {
    throw ApiError.badRequest("Chỉ có thể huỷ đề xuất đang ở trạng thái chờ xử lý (PENDING)");
  }

  request.status = ConsumableRequestStatus.CANCELLED;
  request.updatedBy = userId;
  await request.save();

  return (await request.populate(REQUEST_POPULATE)).toObject();
};

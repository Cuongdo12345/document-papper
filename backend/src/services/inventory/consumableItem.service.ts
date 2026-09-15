// services/inventory/consumableItem.service.ts
//
// Roadmap B3 (Quản lý vật tư tiêu hao, 2026-09-15, user chỉ định implement
// phương án ĐẦY ĐỦ sau khi xác nhận qua AskUserQuestion: tồn kho theo TỪNG
// khoa/phòng ban, ĐẦY ĐỦ lịch sử giao dịch, CÓ cảnh báo tồn kho thấp tự
// động). Xem giải thích thiết kế đầy đủ ở
// `interfaces/inventory/consumableItem.interface.ts`.

import mongoose from "mongoose";
import Department from "../../models/departments/department.model";
import { ConsumableItem } from "../../models/inventory/consumableItem.model";
import {
  ConsumableTransaction,
} from "../../models/inventory/consumableTransaction.model";
import { ConsumableTransactionType } from "../../interfaces/inventory/consumableTransaction.interface";
import ApiError from "../../shared/errors/ApiError";
import { escapeRegex } from "../../shared/utils/regex.util";
import { withTransaction } from "../../shared/utils/withTransaction";

const ITEM_POPULATE = [
  { path: "department", select: "code name" },
  { path: "createdBy", select: "username fullName" },
  { path: "updatedBy", select: "username fullName" },
];

/** `isLowStock` — TÍNH THÊM (không lưu DB), cùng pattern `isOverdue` ở `assetMaintenancePlan.service.ts`. */
const withIsLowStock = (item: any) => {
  const obj = item.toObject ? item.toObject() : item;
  return {
    ...obj,
    isLowStock: obj.isActive && obj.quantityOnHand <= obj.minStockThreshold,
  };
};

/**
 * 📌 CREATE — tạo 1 vật tư mới cho 1 phòng ban. Nếu có `initialQuantity` >
 * 0, tự tạo kèm 1 giao dịch NHẬP "Tồn kho ban đầu" trong CÙNG transaction —
 * không cho phép `quantityOnHand` khác 0 mà không có giao dịch tương ứng
 * (giữ đúng bất biến "quantityOnHand luôn khớp SUM(transactions)").
 */
export const createConsumableItemService = async (payload: any, userId?: any) => {
  const department = await Department.findById(payload.department);
  if (!department) {
    throw ApiError.notFound("Không tìm thấy phòng ban");
  }

  const duplicated = await ConsumableItem.findOne({
    department: payload.department,
    name: payload.name,
  });
  if (duplicated) {
    throw ApiError.conflict(
      `Phòng ban "${department.name}" đã có vật tư tên "${payload.name}" — sửa vật tư hiện có thay vì tạo trùng.`,
    );
  }

  const initialQuantity = payload.initialQuantity ?? 0;

  const item = await withTransaction(async (session) => {
    const [created] = await ConsumableItem.create(
      [
        {
          name: payload.name,
          unit: payload.unit,
          category: payload.category,
          department: payload.department,
          quantityOnHand: initialQuantity,
          minStockThreshold: payload.minStockThreshold ?? 0,
          createdBy: userId,
        },
      ],
      { session },
    );

    if (initialQuantity > 0) {
      await ConsumableTransaction.create(
        [
          {
            consumableItem: created._id,
            type: ConsumableTransactionType.IN,
            quantity: initialQuantity,
            balanceAfter: initialQuantity,
            reason: "Tồn kho ban đầu",
            performedBy: userId,
          },
        ],
        { session },
      );
    }

    return created;
  });

  return withIsLowStock(await item.populate(ITEM_POPULATE));
};

/**
 * 📌 LIST — danh sách vật tư, phân trang. Không tự động giới hạn theo
 * phòng ban của người gọi (cùng nguyên tắc RBAC đơn giản đã áp dụng cho
 * domain Asset — `getAllAssetsService` chỉ lọc `department` khi FE CHỦ ĐỘNG
 * truyền `?department=`, xem `asset.service.ts`); FE tự lọc theo nhu cầu.
 */
export const getAllConsumableItemsService = async (query: any) => {
  const {
    page = 1,
    limit = 20,
    search,
    department,
    isActive,
    lowStockOnly,
  } = query;

  const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
  const pageSize = Math.max(parseInt(limit, 10) || 20, 1);
  const skip = (pageNumber - 1) * pageSize;

  const filter: Record<string, unknown> = {};
  if (department) filter.department = department;
  filter.isActive = isActive !== undefined ? isActive : true;

  if (search) {
    const safeKeyword = escapeRegex(search);
    filter.name = { $regex: safeKeyword, $options: "i" };
  }

  if (lowStockOnly) {
    filter.$expr = { $lte: ["$quantityOnHand", "$minStockThreshold"] };
  }

  const [items, total] = await Promise.all([
    ConsumableItem.find(filter)
      .populate(ITEM_POPULATE)
      .sort({ name: 1 })
      .skip(skip)
      .limit(pageSize),
    ConsumableItem.countDocuments(filter),
  ]);

  return {
    data: items.map(withIsLowStock),
    pagination: {
      page: pageNumber,
      limit: pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
};

/** Tìm 1 item theo ID hoặc throw — dùng chung cho getById/update/transaction. */
const findConsumableItemOrFail = async (itemId: any) => {
  if (!mongoose.Types.ObjectId.isValid(itemId)) {
    throw ApiError.badRequest("ID vật tư không hợp lệ");
  }

  const item = await ConsumableItem.findById(itemId);
  if (!item) {
    throw ApiError.notFound("Không tìm thấy vật tư");
  }
  return item;
};

export const getConsumableItemByIdService = async (itemId: any) => {
  const item = await findConsumableItemOrFail(itemId);
  return withIsLowStock(await item.populate(ITEM_POPULATE));
};

/**
 * 📌 UPDATE — sửa thông tin cơ bản (tên/đơn vị/nhóm/ngưỡng cảnh báo/trạng
 * thái hoạt động). CHỦ Ý KHÔNG cho sửa `department` (đổi phòng ban thực
 * chất là "chuyển kho" — nghiệp vụ khác hẳn, chưa có yêu cầu, không tự suy
 * đoán) và KHÔNG cho sửa `quantityOnHand` trực tiếp (chỉ qua giao dịch).
 */
export const updateConsumableItemService = async (
  itemId: any,
  payload: any,
  userId?: any,
) => {
  const item = await findConsumableItemOrFail(itemId);

  if (payload.name !== undefined) {
    const duplicated = await ConsumableItem.findOne({
      _id: { $ne: item._id },
      department: item.department,
      name: payload.name,
    });
    if (duplicated) {
      throw ApiError.conflict(
        `Phòng ban đã có vật tư khác tên "${payload.name}".`,
      );
    }
    item.name = payload.name;
  }
  if (payload.unit !== undefined) item.unit = payload.unit;
  if (payload.category !== undefined) item.category = payload.category;
  if (payload.isActive !== undefined) item.isActive = payload.isActive;

  // Đổi ngưỡng cảnh báo → reset cờ "đã gửi cảnh báo", cùng pattern
  // `warrantyAlertSentAt` reset khi `warrantyExpiredAt` đổi ở
  // `updateAssetService`: để cron tự đánh giá lại đúng theo ngưỡng MỚI ở
  // lần chạy kế tiếp, tránh vừa lỡ 1 lần cảnh báo do dùng ngưỡng cũ.
  if (
    payload.minStockThreshold !== undefined &&
    payload.minStockThreshold !== item.minStockThreshold
  ) {
    item.minStockThreshold = payload.minStockThreshold;
    item.lowStockAlertSentAt = null;
  }

  item.updatedBy = userId;
  await item.save();

  return withIsLowStock(await item.populate(ITEM_POPULATE));
};

/**
 * 📌 NHẬP/XUẤT KHO — tạo 1 giao dịch, cập nhật `quantityOnHand` ATOMIC
 * trong CÙNG 1 Mongo transaction (tránh race condition khi 2 người nhập/xuất
 * cùng lúc 1 item — `ConsumableItem`/`ConsumableTransaction` PHẢI ghi cùng
 * lúc hoặc không ghi gì cả).
 */
export const createConsumableTransactionService = async (
  itemId: any,
  payload: any,
  userId?: any,
) => {
  if (!mongoose.Types.ObjectId.isValid(itemId)) {
    throw ApiError.badRequest("ID vật tư không hợp lệ");
  }

  const transaction = await withTransaction(async (session) => {
    const item = await ConsumableItem.findById(itemId).session(session);
    if (!item) {
      throw ApiError.notFound("Không tìm thấy vật tư");
    }
    if (!item.isActive) {
      throw ApiError.badRequest("Vật tư đã ngừng theo dõi, không thể nhập/xuất kho");
    }

    const delta = payload.type === ConsumableTransactionType.IN ? payload.quantity : -payload.quantity;
    const newQuantity = item.quantityOnHand + delta;

    if (newQuantity < 0) {
      throw ApiError.badRequest(
        `Không đủ tồn kho — hiện có ${item.quantityOnHand} ${item.unit}, không thể xuất ${payload.quantity} ${item.unit}.`,
      );
    }

    item.quantityOnHand = newQuantity;
    // Đã nhập vượt lại ngưỡng → reset cờ cảnh báo để lần tới xuống thấp lại
    // được cảnh báo mới, không bị "kẹt" ở trạng thái đã gửi 1 lần rồi thôi.
    if (newQuantity > item.minStockThreshold) {
      item.lowStockAlertSentAt = null;
    }
    await item.save({ session });

    const [created] = await ConsumableTransaction.create(
      [
        {
          consumableItem: item._id,
          type: payload.type,
          quantity: payload.quantity,
          balanceAfter: newQuantity,
          reason: payload.reason,
          performedBy: userId,
        },
      ],
      { session },
    );

    return created;
  });

  return transaction.populate({ path: "performedBy", select: "username fullName" });
};

/** 📌 LỊCH SỬ GIAO DỊCH theo 1 item, mới nhất trước, phân trang. */
export const getConsumableTransactionsService = async (itemId: any, query: any) => {
  await findConsumableItemOrFail(itemId);

  const { page = 1, limit = 20 } = query;
  const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
  const pageSize = Math.max(parseInt(limit, 10) || 20, 1);
  const skip = (pageNumber - 1) * pageSize;

  const filter = { consumableItem: itemId };

  const [transactions, total] = await Promise.all([
    ConsumableTransaction.find(filter)
      .populate({ path: "performedBy", select: "username fullName" })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize),
    ConsumableTransaction.countDocuments(filter),
  ]);

  return {
    data: transactions,
    pagination: {
      page: pageNumber,
      limit: pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
};

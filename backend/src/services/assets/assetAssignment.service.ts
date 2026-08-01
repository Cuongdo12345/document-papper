import mongoose from "mongoose";
import { Asset, AssetStatus } from "../../models/assets/asset.model";
import {
  AssetAssignmentHistory,
  AssetAssignmentActionType,
} from "../../models/assets/assetAssignmentHistory.model";
import Department from "../../models/departments/department.model";
import { User } from "../../models/users/user.model";
import ApiError from "../../shared/errors/ApiError";
import { withTransaction } from "../../shared/utils/withTransaction";

const ASSIGNMENT_HISTORY_POPULATE = [
  { path: "fromDepartment", select: "code name" },
  { path: "toDepartment", select: "code name" },
  { path: "fromUser", select: "username fullName" },
  { path: "toUser", select: "username fullName" },
  { path: "handedOverBy", select: "username fullName" },
];

const assertDepartmentExists = async (id: any) => {
  const department = await Department.findById(id);
  if (!department) {
    throw ApiError.badRequest("Khoa/phòng không tồn tại");
  }
  return department;
};

const assertUserExists = async (id: any) => {
  const user = await User.findOne({ _id: id, isActive: true });
  if (!user) {
    throw ApiError.badRequest("Người dùng không tồn tại hoặc đã bị khoá");
  }
  return user;
};

/**
 * ✅ THÊM MỚI TRANSACTION (Giai đoạn 2 module Asset — chưa từng có
 * transaction, khác với Document/Workflow vốn đã có sẵn rồi bị gỡ). Cả 3
 * hàm assign/transfer/return đều ghi 2 collection cần atomic cùng nhau:
 * `Asset` (đổi status/department/assignedTo) + `AssetAssignmentHistory`
 * (ghi audit trail cấp phát). Đây là nhóm quan trọng nhất về thiết kế —
 * mục đích cốt lõi của `AssetAssignmentHistory` là audit trail đầy đủ,
 * thiếu 1 bản ghi là hỏng cả mục đích ban đầu.
 */

/**
 * 📌 ASSIGN — cấp phát tài sản từ kho.
 *
 * Điều kiện: asset phải đang ở IN_STOCK hoặc RESERVED (RESERVED dành cho
 * Giai đoạn 3, khi workflow duyệt đề xuất cấp tài sản xong sẽ set trạng
 * thái này TRƯỚC khi nhân viên IT bàn giao thật — ở Giai đoạn 2 hiện tại
 * chưa có luồng nào tự set RESERVED, nhưng service đã cho phép trước để
 * không phải sửa lại khi nối Document/Workflow vào sau).
 */
export const assignAssetService = async (
  assetId: any,
  payload: { toDepartment: string; toUser?: string; reason?: string },
  actorUserId?: any,
) => {
  if (!mongoose.Types.ObjectId.isValid(assetId)) {
    throw ApiError.badRequest("ID tài sản không hợp lệ");
  }

  const asset = await Asset.findOne({ _id: assetId, isActive: true });
  if (!asset) {
    throw ApiError.notFound("Không tìm thấy tài sản");
  }

  if (
    asset.status !== AssetStatus.IN_STOCK &&
    asset.status !== AssetStatus.RESERVED
  ) {
    throw ApiError.badRequest(
      `Chỉ có thể cấp phát tài sản đang ở trạng thái IN_STOCK hoặc RESERVED (trạng thái hiện tại: ${asset.status})`,
    );
  }

  await assertDepartmentExists(payload.toDepartment);
  if (payload.toUser) {
    await assertUserExists(payload.toUser);
  }

  const fromDepartment = asset.department;
  const fromUser = asset.assignedTo;

  asset.department = payload.toDepartment as any;
  asset.assignedTo = payload.toUser as any;
  asset.status = AssetStatus.IN_USE;
  asset.updatedBy = actorUserId;

  // Chuỗi ghi cần transaction: save Asset + ghi AssetAssignmentHistory
  // "ASSIGN".
  await withTransaction(async (session) => {
    await asset.save({ session });

    await AssetAssignmentHistory.create(
      [
        {
          asset: asset._id,
          actionType: AssetAssignmentActionType.ASSIGN,
          fromDepartment,
          toDepartment: payload.toDepartment,
          fromUser,
          toUser: payload.toUser,
          handedOverBy: actorUserId,
          reason: payload.reason,
          effectiveAt: new Date(),
        },
      ],
      { session },
    );
  });

  return asset.populate([
    { path: "category", select: "code name" },
    { path: "department", select: "code name" },
    { path: "assignedTo", select: "username fullName email" },
  ]);
};

/**
 * 📌 TRANSFER — luân chuyển tài sản ĐANG SỬ DỤNG (IN_USE) sang khoa/phòng
 * và/hoặc người dùng khác.
 *
 * Ngữ nghĩa `toUser` (khớp với `TransferAssetDTO`):
 *   - KHÔNG truyền field `toUser`  → giữ nguyên `assignedTo` hiện tại.
 *   - Truyền `toUser: ""`          → CHỦ Ý gỡ user hiện tại (tài sản do
 *                                     khoa quản lý chung, không gắn cá
 *                                     nhân cụ thể).
 *   - Truyền `toUser: "<id>"`      → đổi sang user mới.
 * Dùng `Object.prototype.hasOwnProperty` để phân biệt "không truyền" với
 * "truyền rỗng", vì cả 2 đều có thể đi qua Zod dưới dạng `undefined` nếu
 * không cẩn thận — DTO đã validate `toUser` là `objectId | "" | undefined`
 * nên ở đây chỉ cần check `"toUser" in payload`.
 */
export const transferAssetService = async (
  assetId: any,
  payload: { toDepartment?: string; toUser?: string; reason?: string },
  actorUserId?: any,
) => {
  if (!mongoose.Types.ObjectId.isValid(assetId)) {
    throw ApiError.badRequest("ID tài sản không hợp lệ");
  }

  const asset = await Asset.findOne({ _id: assetId, isActive: true });
  if (!asset) {
    throw ApiError.notFound("Không tìm thấy tài sản");
  }

  if (asset.status !== AssetStatus.IN_USE) {
    throw ApiError.badRequest(
      `Chỉ có thể luân chuyển tài sản đang ở trạng thái IN_USE (trạng thái hiện tại: ${asset.status})`,
    );
  }

  if (payload.toDepartment) {
    await assertDepartmentExists(payload.toDepartment);
  }
  if (payload.toUser) {
    await assertUserExists(payload.toUser);
  }

  const fromDepartment = asset.department;
  const fromUser = asset.assignedTo;

  if (payload.toDepartment) {
    asset.department = payload.toDepartment as any;
  }

  const hasToUserField = Object.prototype.hasOwnProperty.call(
    payload,
    "toUser",
  );
  if (hasToUserField) {
    asset.assignedTo = payload.toUser ? (payload.toUser as any) : undefined;
  }

  asset.updatedBy = actorUserId;

  // Chuỗi ghi cần transaction: save Asset + ghi AssetAssignmentHistory
  // "TRANSFER". Đọc `asset.department`/`asset.assignedTo` SAU khi gán ở
  // trên để lấy đúng giá trị mới (giữ nguyên hành vi bản gốc).
  await withTransaction(async (session) => {
    await asset.save({ session });

    await AssetAssignmentHistory.create(
      [
        {
          asset: asset._id,
          actionType: AssetAssignmentActionType.TRANSFER,
          fromDepartment,
          toDepartment: asset.department,
          fromUser,
          toUser: asset.assignedTo,
          handedOverBy: actorUserId,
          reason: payload.reason,
          effectiveAt: new Date(),
        },
      ],
      { session },
    );
  });

  return asset.populate([
    { path: "category", select: "code name" },
    { path: "department", select: "code name" },
    { path: "assignedTo", select: "username fullName email" },
  ]);
};

/**
 * 📌 RETURN — thu hồi tài sản về kho (IN_STOCK), gỡ `assignedTo`.
 * `toDepartment` tuỳ chọn: không truyền thì giữ nguyên `department` hiện
 * tại (mặc định coi khoa đang quản lý cũng là nơi giữ kho).
 */
export const returnAssetService = async (
  assetId: any,
  payload: { toDepartment?: string; reason?: string },
  actorUserId?: any,
) => {
  if (!mongoose.Types.ObjectId.isValid(assetId)) {
    throw ApiError.badRequest("ID tài sản không hợp lệ");
  }

  const asset = await Asset.findOne({ _id: assetId, isActive: true });
  if (!asset) {
    throw ApiError.notFound("Không tìm thấy tài sản");
  }

  if (
    asset.status !== AssetStatus.IN_USE &&
    asset.status !== AssetStatus.RESERVED
  ) {
    throw ApiError.badRequest(
      `Chỉ có thể thu hồi tài sản đang ở trạng thái IN_USE hoặc RESERVED (trạng thái hiện tại: ${asset.status})`,
    );
  }

  if (payload.toDepartment) {
    await assertDepartmentExists(payload.toDepartment);
  }

  const fromDepartment = asset.department;
  const fromUser = asset.assignedTo;

  if (payload.toDepartment) {
    asset.department = payload.toDepartment as any;
  }
  asset.assignedTo = undefined;
  asset.status = AssetStatus.IN_STOCK;
  asset.updatedBy = actorUserId;

  // Chuỗi ghi cần transaction: save Asset + ghi AssetAssignmentHistory
  // "RETURN".
  await withTransaction(async (session) => {
    await asset.save({ session });

    await AssetAssignmentHistory.create(
      [
        {
          asset: asset._id,
          actionType: AssetAssignmentActionType.RETURN,
          fromDepartment,
          toDepartment: asset.department,
          fromUser,
          toUser: undefined,
          handedOverBy: actorUserId,
          reason: payload.reason,
          effectiveAt: new Date(),
        },
      ],
      { session },
    );
  });

  return asset.populate([
    { path: "category", select: "code name" },
    { path: "department", select: "code name" },
    { path: "assignedTo", select: "username fullName email" },
  ]);
};

/**
 * 📌 GET ASSIGNMENT HISTORY — lịch sử cấp phát/luân chuyển/thu hồi của 1
 * asset. Chỉ READ, không cần transaction.
 */
export const getAssetAssignmentHistoryService = async (
  assetId: any,
  query: any,
) => {
  if (!mongoose.Types.ObjectId.isValid(assetId)) {
    throw ApiError.badRequest("ID tài sản không hợp lệ");
  }

  const assetExists = await Asset.exists({ _id: assetId });
  if (!assetExists) {
    throw ApiError.notFound("Không tìm thấy tài sản");
  }

  const { page = 1, limit = 20 } = query;
  const pageNumber = Math.max(parseInt(page, 10), 1);
  const pageSize = Math.max(parseInt(limit, 10), 1);
  const skip = (pageNumber - 1) * pageSize;

  const [history, total] = await Promise.all([
    AssetAssignmentHistory.find({ asset: assetId })
      .populate(ASSIGNMENT_HISTORY_POPULATE)
      .sort({ effectiveAt: -1 })
      .skip(skip)
      .limit(pageSize),
    AssetAssignmentHistory.countDocuments({ asset: assetId }),
  ]);

  return {
    data: history,
    pagination: {
      page: pageNumber,
      limit: pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
};

// import mongoose from "mongoose";
// import { Asset, AssetStatus } from "../../models/assets/asset.model";
// import {
//   AssetAssignmentHistory,
//   AssetAssignmentActionType,
// } from "../../models/assets/assetAssignmentHistory.model";
// import Department from "../../models/departments/department.model";
// import { User } from "../../models/users/user.model";
// import ApiError from "../../shared/errors/ApiError";

// const ASSIGNMENT_HISTORY_POPULATE = [
//   { path: "fromDepartment", select: "code name" },
//   { path: "toDepartment", select: "code name" },
//   { path: "fromUser", select: "username fullName" },
//   { path: "toUser", select: "username fullName" },
//   { path: "handedOverBy", select: "username fullName" },
// ];

// const assertDepartmentExists = async (id: any) => {
//   const department = await Department.findById(id);
//   if (!department) {
//     throw ApiError.badRequest("Khoa/phòng không tồn tại");
//   }
//   return department;
// };

// const assertUserExists = async (id: any) => {
//   const user = await User.findOne({ _id: id, isActive: true });
//   if (!user) {
//     throw ApiError.badRequest("Người dùng không tồn tại hoặc đã bị khoá");
//   }
//   return user;
// };

// /**
//  * 📌 ASSIGN — cấp phát tài sản từ kho.
//  *
//  * Điều kiện: asset phải đang ở IN_STOCK hoặc RESERVED (RESERVED dành cho
//  * Giai đoạn 3, khi workflow duyệt đề xuất cấp tài sản xong sẽ set trạng
//  * thái này TRƯỚC khi nhân viên IT bàn giao thật — ở Giai đoạn 2 hiện tại
//  * chưa có luồng nào tự set RESERVED, nhưng service đã cho phép trước để
//  * không phải sửa lại khi nối Document/Workflow vào sau).
//  */
// export const assignAssetService = async (
//   assetId: any,
//   payload: { toDepartment: string; toUser?: string; reason?: string },
//   actorUserId?: any,
// ) => {
//   if (!mongoose.Types.ObjectId.isValid(assetId)) {
//     throw ApiError.badRequest("ID tài sản không hợp lệ");
//   }

//   const asset = await Asset.findOne({ _id: assetId, isActive: true });
//   if (!asset) {
//     throw ApiError.notFound("Không tìm thấy tài sản");
//   }

//   if (
//     asset.status !== AssetStatus.IN_STOCK &&
//     asset.status !== AssetStatus.RESERVED
//   ) {
//     throw ApiError.badRequest(
//       `Chỉ có thể cấp phát tài sản đang ở trạng thái IN_STOCK hoặc RESERVED (trạng thái hiện tại: ${asset.status})`,
//     );
//   }

//   await assertDepartmentExists(payload.toDepartment);
//   if (payload.toUser) {
//     await assertUserExists(payload.toUser);
//   }

//   const fromDepartment = asset.department;
//   const fromUser = asset.assignedTo;

//   asset.department = payload.toDepartment as any;
//   asset.assignedTo = payload.toUser as any;
//   asset.status = AssetStatus.IN_USE;
//   asset.updatedBy = actorUserId;
//   await asset.save();

//   await AssetAssignmentHistory.create({
//     asset: asset._id,
//     actionType: AssetAssignmentActionType.ASSIGN,
//     fromDepartment,
//     toDepartment: payload.toDepartment,
//     fromUser,
//     toUser: payload.toUser,
//     handedOverBy: actorUserId,
//     reason: payload.reason,
//     effectiveAt: new Date(),
//   });

//   return asset.populate([
//     { path: "category", select: "code name" },
//     { path: "department", select: "code name" },
//     { path: "assignedTo", select: "username fullName email" },
//   ]);
// };

// /**
//  * 📌 TRANSFER — luân chuyển tài sản ĐANG SỬ DỤNG (IN_USE) sang khoa/phòng
//  * và/hoặc người dùng khác.
//  *
//  * Ngữ nghĩa `toUser` (khớp với `TransferAssetDTO`):
//  *   - KHÔNG truyền field `toUser`  → giữ nguyên `assignedTo` hiện tại.
//  *   - Truyền `toUser: ""`          → CHỦ Ý gỡ user hiện tại (tài sản do
//  *                                     khoa quản lý chung, không gắn cá
//  *                                     nhân cụ thể).
//  *   - Truyền `toUser: "<id>"`      → đổi sang user mới.
//  * Dùng `Object.prototype.hasOwnProperty` để phân biệt "không truyền" với
//  * "truyền rỗng", vì cả 2 đều có thể đi qua Zod dưới dạng `undefined` nếu
//  * không cẩn thận — DTO đã validate `toUser` là `objectId | "" | undefined`
//  * nên ở đây chỉ cần check `"toUser" in payload`.
//  */
// export const transferAssetService = async (
//   assetId: any,
//   payload: { toDepartment?: string; toUser?: string; reason?: string },
//   actorUserId?: any,
// ) => {
//   if (!mongoose.Types.ObjectId.isValid(assetId)) {
//     throw ApiError.badRequest("ID tài sản không hợp lệ");
//   }

//   const asset = await Asset.findOne({ _id: assetId, isActive: true });
//   if (!asset) {
//     throw ApiError.notFound("Không tìm thấy tài sản");
//   }

//   if (asset.status !== AssetStatus.IN_USE) {
//     throw ApiError.badRequest(
//       `Chỉ có thể luân chuyển tài sản đang ở trạng thái IN_USE (trạng thái hiện tại: ${asset.status})`,
//     );
//   }

//   if (payload.toDepartment) {
//     await assertDepartmentExists(payload.toDepartment);
//   }
//   if (payload.toUser) {
//     await assertUserExists(payload.toUser);
//   }

//   const fromDepartment = asset.department;
//   const fromUser = asset.assignedTo;

//   if (payload.toDepartment) {
//     asset.department = payload.toDepartment as any;
//   }

//   const hasToUserField = Object.prototype.hasOwnProperty.call(
//     payload,
//     "toUser",
//   );
//   if (hasToUserField) {
//     asset.assignedTo = payload.toUser ? (payload.toUser as any) : undefined;
//   }

//   asset.updatedBy = actorUserId;
//   await asset.save();

//   await AssetAssignmentHistory.create({
//     asset: asset._id,
//     actionType: AssetAssignmentActionType.TRANSFER,
//     fromDepartment,
//     toDepartment: asset.department,
//     fromUser,
//     toUser: asset.assignedTo,
//     handedOverBy: actorUserId,
//     reason: payload.reason,
//     effectiveAt: new Date(),
//   });

//   return asset.populate([
//     { path: "category", select: "code name" },
//     { path: "department", select: "code name" },
//     { path: "assignedTo", select: "username fullName email" },
//   ]);
// };

// /**
//  * 📌 RETURN — thu hồi tài sản về kho (IN_STOCK), gỡ `assignedTo`.
//  * `toDepartment` tuỳ chọn: không truyền thì giữ nguyên `department` hiện
//  * tại (mặc định coi khoa đang quản lý cũng là nơi giữ kho).
//  */
// export const returnAssetService = async (
//   assetId: any,
//   payload: { toDepartment?: string; reason?: string },
//   actorUserId?: any,
// ) => {
//   if (!mongoose.Types.ObjectId.isValid(assetId)) {
//     throw ApiError.badRequest("ID tài sản không hợp lệ");
//   }

//   const asset = await Asset.findOne({ _id: assetId, isActive: true });
//   if (!asset) {
//     throw ApiError.notFound("Không tìm thấy tài sản");
//   }

//   if (
//     asset.status !== AssetStatus.IN_USE &&
//     asset.status !== AssetStatus.RESERVED
//   ) {
//     throw ApiError.badRequest(
//       `Chỉ có thể thu hồi tài sản đang ở trạng thái IN_USE hoặc RESERVED (trạng thái hiện tại: ${asset.status})`,
//     );
//   }

//   if (payload.toDepartment) {
//     await assertDepartmentExists(payload.toDepartment);
//   }

//   const fromDepartment = asset.department;
//   const fromUser = asset.assignedTo;

//   if (payload.toDepartment) {
//     asset.department = payload.toDepartment as any;
//   }
//   asset.assignedTo = undefined;
//   asset.status = AssetStatus.IN_STOCK;
//   asset.updatedBy = actorUserId;
//   await asset.save();

//   await AssetAssignmentHistory.create({
//     asset: asset._id,
//     actionType: AssetAssignmentActionType.RETURN,
//     fromDepartment,
//     toDepartment: asset.department,
//     fromUser,
//     toUser: undefined,
//     handedOverBy: actorUserId,
//     reason: payload.reason,
//     effectiveAt: new Date(),
//   });

//   return asset.populate([
//     { path: "category", select: "code name" },
//     { path: "department", select: "code name" },
//     { path: "assignedTo", select: "username fullName email" },
//   ]);
// };

// /**
//  * 📌 GET ASSIGNMENT HISTORY — lịch sử cấp phát/luân chuyển/thu hồi của 1 asset.
//  */
// export const getAssetAssignmentHistoryService = async (
//   assetId: any,
//   query: any,
// ) => {
//   if (!mongoose.Types.ObjectId.isValid(assetId)) {
//     throw ApiError.badRequest("ID tài sản không hợp lệ");
//   }

//   const assetExists = await Asset.exists({ _id: assetId });
//   if (!assetExists) {
//     throw ApiError.notFound("Không tìm thấy tài sản");
//   }

//   const { page = 1, limit = 20 } = query;
//   const pageNumber = Math.max(parseInt(page, 10), 1);
//   const pageSize = Math.max(parseInt(limit, 10), 1);
//   const skip = (pageNumber - 1) * pageSize;

//   const [history, total] = await Promise.all([
//     AssetAssignmentHistory.find({ asset: assetId })
//       .populate(ASSIGNMENT_HISTORY_POPULATE)
//       .sort({ effectiveAt: -1 })
//       .skip(skip)
//       .limit(pageSize),
//     AssetAssignmentHistory.countDocuments({ asset: assetId }),
//   ]);

//   return {
//     data: history,
//     pagination: {
//       page: pageNumber,
//       limit: pageSize,
//       total,
//       totalPages: Math.ceil(total / pageSize),
//     },
//   };
// };

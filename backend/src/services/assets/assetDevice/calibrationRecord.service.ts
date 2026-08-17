// services/assets/calibrationRecord.service.ts
//
// GIAI ĐOẠN 2 — luồng ghi nhận kiểm định. Bọc transaction NGAY TỪ ĐẦU khi
// build (đúng quyết định đã chốt ở module-quan-ly-thiet-bi-y-te.md §4/§7.3
// — khác với `AssetAssignmentHistory`, vốn phải vá transaction thêm SAU khi
// phát hiện vấn đề qua thực tế chạy, không lặp lại cách làm đó ở đây).

import mongoose from "mongoose";
import { Asset } from "../../../models/assets/asset.model";
import { MedicalDeviceProfile } from "../../../models/assets/medicalDeviceProfile.model";
import { CalibrationRecord } from "../../../models/assets/calibrationRecord.model";
import ApiError from "../../../shared/errors/ApiError";
import { withTransaction } from "../../../shared/utils/withTransaction";

const CALIBRATION_RECORD_POPULATE = {
  path: "recordedBy",
  select: "username fullName",
};

/**
 * 📌 CREATE — ghi nhận 1 lần kiểm định mới cho thiết bị y tế (theo assetId).
 *
 * 2 write (tạo CalibrationRecord + update MedicalDeviceProfile) atomic với
 * nhau qua `withTransaction` — mirror đúng pattern đã dùng ở
 * `assetAssignment.service.ts` (mutate document trong memory TRƯỚC, rồi
 * `save({ session })` cùng lúc với `create([...], { session })` bên trong
 * transaction).
 */
export const createCalibrationRecordService = async (
  assetId: any,
  payload: any,
  userId?: any,
) => {
  if (!mongoose.Types.ObjectId.isValid(assetId)) {
    throw ApiError.badRequest("ID tài sản không hợp lệ");
  }

  // ⚠️ SỬA (theo yêu cầu đồng bộ khi review lại): thêm check Asset.isActive
  // — nhất quán với `createMedicalDeviceProfileService` và 2 hàm GET/UPDATE
  // profile đã sửa cùng đợt. Asset đã DISPOSED/xoá mềm thì không ghi nhận
  // kiểm định mới được nữa.
  const asset = await Asset.findOne({ _id: assetId, isActive: true });
  if (!asset) {
    throw ApiError.notFound("Không tìm thấy tài sản");
  }

  const profile = await MedicalDeviceProfile.findOne({ asset: assetId });
  if (!profile) {
    throw ApiError.notFound(
      "Tài sản này chưa có profile thiết bị y tế — dùng API tạo (POST .../profile) trước",
    );
  }

  // ĐÃ QUYẾT ĐỊNH (xác nhận với người phụ trách nghiệp vụ khi review): CHO
  // PHÉP ghi nhận kiểm định ngay cả khi `profile.requiresCalibration ===
  // false` — kiểm định "tự nguyện"/ngoài lịch bắt buộc theo luật vẫn là 1
  // sự kiện hợp lệ đáng lưu vết (VD: đơn vị mua thêm dịch vụ kiểm tra định
  // kỳ dù luật không bắt buộc với class thiết bị đó). KHÔNG chặn ở đây.

  // ⚠️ SỬA (phát hiện khi review lại): trước đây KHÔNG kiểm tra
  // `payload.calibratedAt` có mới hơn `profile.lastCalibrationDate` hiện
  // tại hay không. Nếu nhập 1 bản ghi kiểm định CŨ HƠN bản ghi mới nhất đã
  // có (nhập nhầm ngày, hoặc backfill dữ liệu quá khứ) SAU KHI
  // `lastCalibrationDate` đã được set bởi 1 lần kiểm định mới hơn,
  // `profile.nextCalibrationDueDate` sẽ bị ghi đè LÙI VỀ QUÁ KHỨ bằng dữ
  // liệu cũ — khiến cron cảnh báo (Giai đoạn 3) đọc sai hạn kiểm định
  // thật. Chặn ngay tại đây thay vì để lọt xuống DB.
  if (
    profile.lastCalibrationDate &&
    payload.calibratedAt <= profile.lastCalibrationDate
  ) {
    throw ApiError.conflict(
      `calibratedAt (${payload.calibratedAt.toISOString()}) phải mới hơn lần kiểm định gần nhất đã ghi nhận (${profile.lastCalibrationDate.toISOString()}). Nếu cần bổ sung/sửa 1 bản ghi kiểm định trong quá khứ, hãy dùng chức năng sửa trực tiếp bản ghi đó (chưa có ở Giai đoạn 2 — cần bổ sung riêng nếu có nhu cầu), không tạo bản ghi mới.`,
    );
  }

  // Mutate trong memory TRƯỚC (chưa save) — theo đúng field mà
  // `MEDICAL_DEVICE_PROFILE_UPDATE_WHITELIST` CỐ TÌNH loại trừ khỏi PUT
  // thường (xem `assets.constants.ts`): các field này chỉ được đổi qua
  // đúng hành động nghiệp vụ này.
  profile.lastCalibrationDate = payload.calibratedAt;
  profile.nextCalibrationDueDate = payload.nextDueDate;
  // Reset cờ chặn gửi trùng cảnh báo — thiết bị vừa kiểm định xong thì hạn
  // mới đã dời ra xa, cảnh báo cũ (nếu cron từng gửi) không còn ý nghĩa;
  // cho phép cron gửi cảnh báo mới khi tới hạn kế tiếp (Giai đoạn 3).
  // Dùng `undefined` (không phải `null`) để khớp kiểu `Date | undefined`
  // khai báo ở `IMedicalDeviceProfile` — Mongoose xử lý gán `undefined`
  // giống hệt `null` khi save (đều $unset field), không có khác biệt hành
  // vi ở DB.
  profile.calibrationAlertSentAt = undefined;
  profile.updatedBy = userId;

  const record = await withTransaction(async (session) => {
    const [created] = await CalibrationRecord.create(
      [
        {
          deviceProfile: profile._id,
          calibratedAt: payload.calibratedAt,
          calibratedBy: payload.calibratedBy,
          result: payload.result,
          certificateFileUrl: payload.certificateFileUrl,
          nextDueDate: payload.nextDueDate,
          recordedBy: userId,
        },
      ],
      { session },
    );

    await profile.save({ session });

    return created;
  });

  return record.populate(CALIBRATION_RECORD_POPULATE);
};

/**
 * 📌 GET — lịch sử kiểm định theo assetId, mới nhất trước, có phân trang.
 * Mirror đúng pattern `getAssetAssignmentHistoryService`
 * (`assetAssignment.service.ts`).
 */
export const getCalibrationHistoryService = async (
  assetId: any,
  query: any,
) => {
  if (!mongoose.Types.ObjectId.isValid(assetId)) {
    throw ApiError.badRequest("ID tài sản không hợp lệ");
  }

  const profile = await MedicalDeviceProfile.findOne({ asset: assetId });
  if (!profile) {
    throw ApiError.notFound("Tài sản này chưa có profile thiết bị y tế");
  }

  const { page = 1, limit = 20 } = query;
  const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
  const pageSize = Math.max(parseInt(limit, 10) || 20, 1);
  const skip = (pageNumber - 1) * pageSize;

  const [history, total] = await Promise.all([
    CalibrationRecord.find({ deviceProfile: profile._id })
      .populate(CALIBRATION_RECORD_POPULATE)
      .sort({ calibratedAt: -1 })
      .skip(skip)
      .limit(pageSize),
    CalibrationRecord.countDocuments({ deviceProfile: profile._id }),
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
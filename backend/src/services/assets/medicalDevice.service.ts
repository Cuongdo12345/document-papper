// services/assets/medicalDevice.service.ts
//
// MODULE MỚI — Quản lý Thiết bị Y tế, Giai đoạn 1: gắn/xem/sửa thông tin
// tuân thủ pháp lý cho 1 Asset đã tồn tại. KHÔNG có createAsset/deleteAsset
// riêng ở đây — Asset vẫn tạo/xoá qua API `Asset` sẵn có (module này chỉ
// "đính kèm" thêm 1 profile, đúng quan hệ 1-1 đã thiết kế).

import mongoose from "mongoose";
import { Asset } from "../../models/assets/asset.model";
import { MedicalDeviceProfile } from "../../models/assets/medicalDeviceProfile.model";
import ApiError from "../../shared/errors/ApiError";
import {
  MEDICAL_DEVICE_PROFILE_UPDATE_WHITELIST,
  pickWhitelisted,
} from "./assets.constants";

const PROFILE_POPULATE = {
  path: "asset",
  select: "assetCode name category department status",
  populate: [
    { path: "category", select: "code name" },
    { path: "department", select: "code name" },
  ],
};

/**
 * 📌 CREATE — gắn profile thiết bị y tế cho 1 Asset đã tồn tại.
 * Validate: Asset phải tồn tại (isActive), CHƯA có profile nào khác (unique
 * 1-1), và nếu `requiresCalibration = true` thì `calibrationIntervalMonths`
 * bắt buộc phải có (ràng buộc phụ thuộc field khác — không diễn đạt được
 * gọn ở Zod, validate ở đây, cùng nguyên tắc `relatedAsset` bắt buộc theo
 * `subType` ở `document.service.ts`).
 */
export const createMedicalDeviceProfileService = async (
  assetId: any,
  payload: any,
  userId?: any,
) => {
  if (!mongoose.Types.ObjectId.isValid(assetId)) {
    throw ApiError.badRequest("ID tài sản không hợp lệ");
  }

  const asset = await Asset.findOne({ _id: assetId, isActive: true });
  if (!asset) {
    throw ApiError.notFound("Không tìm thấy tài sản");
  }

  const existed = await MedicalDeviceProfile.findOne({ asset: assetId });
  if (existed) {
    throw ApiError.badRequest(
      "Tài sản này đã có profile thiết bị y tế — dùng API cập nhật (PUT) thay vì tạo mới",
    );
  }

  if (payload.requiresCalibration && !payload.calibrationIntervalMonths) {
    throw ApiError.badRequest(
      "calibrationIntervalMonths bắt buộc khi requiresCalibration = true",
    );
  }

  const profile = await MedicalDeviceProfile.create({
    ...payload,
    asset: assetId,
    createdBy: userId,
    updatedBy: userId,
  });

  return profile.populate(PROFILE_POPULATE);
};

/**
 * 📌 GET — xem profile theo assetId.
 */
export const getMedicalDeviceProfileService = async (assetId: any) => {
  if (!mongoose.Types.ObjectId.isValid(assetId)) {
    throw ApiError.badRequest("ID tài sản không hợp lệ");
  }

  const profile = await MedicalDeviceProfile.findOne({
    asset: assetId,
  }).populate(PROFILE_POPULATE);

  if (!profile) {
    throw ApiError.notFound(
      "Tài sản này chưa có profile thiết bị y tế — dùng API tạo (POST) trước",
    );
  }

  return profile;
};

/**
 * 📌 UPDATE — chỉ nhận field trong whitelist (xem giải thích ở
 * `assets.constants.ts`). Không cho sửa `nextCalibrationDueDate` và các
 * field liên quan lịch kiểm định qua đây.
 */
export const updateMedicalDeviceProfileService = async (
  assetId: any,
  payload: any,
  userId?: any,
) => {
  if (!mongoose.Types.ObjectId.isValid(assetId)) {
    throw ApiError.badRequest("ID tài sản không hợp lệ");
  }

  const safePayload = pickWhitelisted(
    payload,
    MEDICAL_DEVICE_PROFILE_UPDATE_WHITELIST,
  );

  const profile = await MedicalDeviceProfile.findOne({ asset: assetId });
  if (!profile) {
    throw ApiError.notFound(
      "Tài sản này chưa có profile thiết bị y tế — dùng API tạo (POST) trước",
    );
  }

  // Tính lại điều kiện requiresCalibration dựa trên giá trị SAU KHI update
  // (không chỉ dựa vào payload) — tránh trường hợp chỉ gửi
  // `calibrationIntervalMonths` mà không gửi lại `requiresCalibration`
  // (đã true từ trước) rồi tưởng nhầm là không cần validate.
  const nextRequiresCalibration =
    "requiresCalibration" in safePayload
      ? safePayload.requiresCalibration
      : profile.requiresCalibration;

  const nextCalibrationIntervalMonths =
    "calibrationIntervalMonths" in safePayload
      ? safePayload.calibrationIntervalMonths
      : profile.calibrationIntervalMonths;

  if (nextRequiresCalibration && !nextCalibrationIntervalMonths) {
    throw ApiError.badRequest(
      "calibrationIntervalMonths bắt buộc khi requiresCalibration = true",
    );
  }

  Object.assign(profile, safePayload);
  profile.updatedBy = userId;
  await profile.save();

  return profile.populate(PROFILE_POPULATE);
};

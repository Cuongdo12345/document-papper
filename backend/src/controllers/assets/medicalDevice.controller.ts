import { Request, Response } from "express";
import {
  createMedicalDeviceProfileService,
  getMedicalDeviceProfileService,
  updateMedicalDeviceProfileService,
} from "../../services/assets/medicalDevice.service";
import { catchAsync } from "../../shared/utils/catchAsync";

/**
 * CREATE — gắn profile thiết bị y tế cho 1 Asset đã tồn tại.
 */
export const createMedicalDeviceProfile = catchAsync(
  async (req: Request, res: Response) => {
    const profile = await createMedicalDeviceProfileService(
      req.params.assetId,
      req.body,
      req.user?._id,
    );

    res.status(201).json({
      message: "Tạo profile thiết bị y tế thành công",
      data: profile,
    });
  },
);

/**
 * GET — xem profile.
 */
export const getMedicalDeviceProfile = catchAsync(
  async (req: Request, res: Response) => {
    const profile = await getMedicalDeviceProfileService(req.params.assetId);

    res.json({
      message: "Lấy profile thiết bị y tế thành công",
      data: profile,
    });
  },
);

/**
 * UPDATE — sửa profile (whitelist field).
 */
export const updateMedicalDeviceProfile = catchAsync(
  async (req: Request, res: Response) => {
    const profile = await updateMedicalDeviceProfileService(
      req.params.assetId,
      req.body,
      req.user?._id,
    );

    res.json({
      message: "Cập nhật profile thiết bị y tế thành công",
      data: profile,
    });
  },
);

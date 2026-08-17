import { Request, Response } from "express";
import {
  createMedicalDeviceProfileService,
  getMedicalDeviceProfileService,
  updateMedicalDeviceProfileService,
} from "../../services/assets/medicalDevice/medicalDevice.service";
import { catchAsync } from "../../shared/utils/catchAsync";
import { runMedicalDeviceAlertsService } from "../../services/assets/medicalDevice/medicalDeviceAlerts.service";

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

/**
 * GIAI ĐOẠN 3 — chạy tay cảnh báo kiểm định (ngoài lịch cron), dùng để
 * test/kiểm tra thủ công. Mirror đúng `runAssetAlerts`
 * (`asset.controller.ts`).
 */
export const runMedicalDeviceAlerts = catchAsync(
  async (req: Request, res: Response) => {
    const result = await runMedicalDeviceAlertsService();

    res.json({
      message: "Chạy kiểm tra cảnh báo kiểm định Thiết bị Y tế thành công",
      data: result,
    });
  },
);

import { Request, Response } from "express";
import { getItDeviceProfileService, upsertItDeviceProfileService } from "../../services/itDevices/itDeviceProfile.service";
import { catchAsync } from "../../shared/utils/catchAsync";

/** `data` là `null` nếu thiết bị CNTT này chưa có hồ sơ (không phải lỗi). */
export const getItDeviceProfile = catchAsync(async (req: Request, res: Response) => {
  const { profile, warnings } = await getItDeviceProfileService(req.params.assetId);
  res.json({ message: "Lấy hồ sơ thiết bị CNTT thành công", data: profile, warnings });
});

export const upsertItDeviceProfile = catchAsync(async (req: Request, res: Response) => {
  const { profile, warnings } = await upsertItDeviceProfileService(req.params.assetId, req.body, req.user?._id);
  res.json({ message: "Lưu hồ sơ thiết bị CNTT thành công", data: profile, warnings });
});

import { Router } from "express";
import {
  createMedicalDeviceProfile,
  getMedicalDeviceProfile,
  updateMedicalDeviceProfile,
} from "../../controllers/assets/medicalDevice.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorizePermission } from "../../middlewares/authorizePermission.middleware";
import { validateBody, validateParams } from "../../middlewares/validate.middleware";
import { makeIdParamDTO } from "../../dto/common.dto";
import {
  CreateMedicalDeviceProfileDTO,
  UpdateMedicalDeviceProfileDTO,
} from "../../dto/assets/medicalDevice.dto";

const router = Router();

// Toàn bộ route đều thao tác theo :assetId (KHÔNG có :id riêng của profile)
// — vì bản chất là "gắn thêm 1 lớp thông tin cho 1 Asset đã có", FE luôn
// đã có sẵn assetId từ màn hình chi tiết Asset, không cần biết profileId.
const assetIdParam = makeIdParamDTO("assetId", "Asset ID không hợp lệ");

router.post(
  "/:assetId/profile",
  authenticate,
  authorizePermission("MEDICAL_DEVICE_CREATE"),
  validateParams(assetIdParam),
  validateBody(CreateMedicalDeviceProfileDTO),
  createMedicalDeviceProfile,
);

router.get(
  "/:assetId/profile",
  authenticate,
  authorizePermission("MEDICAL_DEVICE_VIEW"),
  validateParams(assetIdParam),
  getMedicalDeviceProfile,
);

router.put(
  "/:assetId/profile",
  authenticate,
  authorizePermission("MEDICAL_DEVICE_UPDATE"),
  validateParams(assetIdParam),
  validateBody(UpdateMedicalDeviceProfileDTO),
  updateMedicalDeviceProfile,
);

export default router;

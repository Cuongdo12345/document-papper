// dto/medicalDevice.dto.ts
import { z } from "zod";
import { MedicalDeviceClass } from "../../interfaces/assets/medicalDevice.interface";

export const CreateMedicalDeviceProfileDTO = z.object({
  deviceClass: z.nativeEnum(MedicalDeviceClass),
  registrationNumber: z.string().trim().optional(),
  licenseExpiredAt: z.coerce.date().optional(),

  requiresCalibration: z.boolean().default(false),
  /**
   * Bắt buộc khi `requiresCalibration = true` — validate ở tầng service
   * (không phải Zod) vì đây là ràng buộc PHỤ THUỘC giá trị field khác,
   * cùng nguyên tắc đã áp dụng cho `relatedAsset` bắt buộc theo `subType`
   * ở `document.service.ts` (module Asset, Giai đoạn 3).
   */
  calibrationIntervalMonths: z.coerce.number().int().min(1).optional(),

  operatorCertificateRequired: z.boolean().default(false),
});

/**
 * UpdateMedicalDeviceProfileDTO — CHỦ Ý KHÔNG có `lastCalibrationDate`,
 * `nextCalibrationDueDate`, `calibrationAlertSentAt` — các field này chỉ
 * được đổi qua đúng hành động nghiệp vụ "ghi nhận kiểm định mới" (Giai
 * đoạn 2), không cho client tự set tuỳ ý qua PUT thường. Cùng nguyên tắc
 * `ASSET_UPDATE_WHITELIST` đã áp dụng xuyên suốt module Asset.
 */
export const UpdateMedicalDeviceProfileDTO = z.object({
  deviceClass: z.nativeEnum(MedicalDeviceClass).optional(),
  registrationNumber: z.string().trim().optional(),
  licenseExpiredAt: z.coerce.date().optional(),
  requiresCalibration: z.boolean().optional(),
  calibrationIntervalMonths: z.coerce.number().int().min(1).optional(),
  operatorCertificateRequired: z.boolean().optional(),
});

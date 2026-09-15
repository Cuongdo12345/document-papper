/**
 * FE-07 (Medical Devices UI) — khớp `medicalDeviceProfile.model.ts`/
 * `calibrationRecord.model.ts`/`medicalDevice.dto.ts`/`calibrationRecord.dto.ts`
 * (backend), không suy đoán field. Mọi endpoint đều theo `:assetId` (KHÔNG
 * có `profileId`/route riêng — 1 Asset có tối đa 1 profile, quan hệ 1-1) —
 * xem `docs/development/module-quan-ly-thiet-bi-y-te.md` §5, đã xác nhận lại
 * qua source `medicalDevice.routes.ts`.
 */
export const MEDICAL_DEVICE_CLASSES = ["A", "B", "C", "D"] as const;
export type MedicalDeviceClass = (typeof MEDICAL_DEVICE_CLASSES)[number];

export interface MedicalDeviceProfile {
  _id: string;
  asset: string | { _id: string; assetCode: string; name: string };
  deviceClass: MedicalDeviceClass;
  registrationNumber?: string;
  licenseExpiredAt?: string;
  requiresCalibration: boolean;
  calibrationIntervalMonths?: number;
  lastCalibrationDate?: string;
  nextCalibrationDueDate?: string;
  calibrationAlertSentAt?: string;
  operatorCertificateRequired: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Khớp `CreateMedicalDeviceProfileDTO`. */
export interface CreateMedicalDeviceProfileRequest {
  deviceClass: MedicalDeviceClass;
  registrationNumber?: string;
  licenseExpiredAt?: string;
  requiresCalibration: boolean;
  calibrationIntervalMonths?: number;
  operatorCertificateRequired: boolean;
}

/**
 * Khớp `UpdateMedicalDeviceProfileDTO` — CHỦ Ý KHÔNG có
 * `lastCalibrationDate`/`nextCalibrationDueDate` (chỉ đổi qua "ghi nhận kiểm
 * định mới", xem `CreateCalibrationRecordRequest`).
 */
export type UpdateMedicalDeviceProfileRequest = Partial<CreateMedicalDeviceProfileRequest>;

export const CALIBRATION_RESULTS = ["PASS", "FAIL", "CONDITIONAL_PASS"] as const;
export type CalibrationResult = (typeof CALIBRATION_RESULTS)[number];

export interface CalibrationRecordItem {
  _id: string;
  calibratedAt: string;
  calibratedBy: string;
  result: CalibrationResult;
  /** Link nhập tay (không phải file upload thật — xem `certificateFileId`). */
  certificateFileUrl?: string;
  /**
   * (A2, roadmap) ID `Upload` document khi giấy chứng nhận là FILE THẬT đã
   * upload — có giá trị này thì tải qua `getCalibrationCertificateDownloadUrl`
   * (KHÔNG dùng `certificateFileUrl` — đường dẫn `/uploads/...` không phục
   * vụ trực tiếp được, xem comment gốc backend `calibrationRecord.service.ts`).
   */
  certificateFileId?: string;
  nextDueDate: string;
  recordedBy: { _id: string; username: string; fullName: string };
  createdAt: string;
}

/**
 * Khớp `CreateCalibrationRecordDTO`. `certificateFile` (A2, roadmap) giờ ĐÃ
 * hỗ trợ — `FileUpload` component dùng chung đã được xây (roadmap Mục 20,
 * dùng ở `FilesListPage`/`ExcelImportWizard`). Chỉ được cung cấp 1 trong 2:
 * `certificateFile` HOẶC `certificateFileUrl`, không cả hai (backend validate
 * lại, xem `createCalibrationRecordService`) — 2 field tách biệt ở đây
 * (không gộp) vì `certificateFile` cần build `FormData` riêng ở API layer,
 * còn field JSON thường thì không.
 */
export interface CreateCalibrationRecordRequest {
  calibratedAt: string;
  calibratedBy: string;
  result: CalibrationResult;
  certificateFileUrl?: string;
  nextDueDate: string;
}

export interface GetCalibrationHistoryParams {
  page?: number;
  limit?: number;
}

/**
 * Khớp `UpdateCalibrationCertificateDTO` — thay thế chứng nhận đã lưu (sửa
 * lỗi upload nhầm file), bổ sung sau A2 theo yêu cầu user. Cùng nguyên tắc
 * tách `certificateFile` khỏi interface JSON như `CreateCalibrationRecordRequest`.
 */
export interface UpdateCalibrationCertificateRequest {
  certificateFileUrl?: string;
}

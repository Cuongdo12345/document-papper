import { Router } from "express";
import {
  createMedicalDeviceProfile,
  getMedicalDeviceProfile,
  updateMedicalDeviceProfile,
  runMedicalDeviceAlerts,
} from "../../controllers/assets/medicalDevice.controller";
import {
  createCalibrationRecord,
  getCalibrationHistory,
  downloadCalibrationCertificate,
  updateCalibrationCertificate,
} from "../../controllers/assets/calibrationRecord.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorizePermission } from "../../middlewares/authorizePermission.middleware";
import {
  validateBody,
  validateParams,
} from "../../middlewares/validate.middleware";
import { makeIdParamDTO } from "../../dto/common.dto";
import {
  CreateMedicalDeviceProfileDTO,
  UpdateMedicalDeviceProfileDTO,
} from "../../dto/assets/medicalDevice.dto";
import {
  CreateCalibrationRecordDTO,
  CalibrationCertificateParamsDTO,
  UpdateCalibrationCertificateDTO,
} from "../../dto/assets/calibrationRecord.dto";
import { createUploader } from "../../services/upload/upload.middleware";

const router = Router();

// Toàn bộ route đều thao tác theo :assetId (KHÔNG có :id riêng của profile)
// — vì bản chất là "gắn thêm 1 lớp thông tin cho 1 Asset đã có", FE luôn
// đã có sẵn assetId từ màn hình chi tiết Asset, không cần biết profileId.
const assetIdParam = makeIdParamDTO("assetId", "Asset ID không hợp lệ");

/**
 * GIAI ĐOẠN 5 — Upload file giấy chứng nhận kiểm định thật (PDF scan hoặc
 * ảnh chụp), đúng §9.2/§5 tài liệu thiết kế: tái dùng `createUploader`
 * (disk storage, model `Upload` sẵn có) — KHÔNG chờ migrate S3. Chỉ cho
 * phép PDF/JPEG/PNG, tối đa 10MB (đủ cho scan chất lượng thường, chặn file
 * quá khổ làm nặng ổ đĩa server).
 */
const certificateUploader = createUploader({
  maxSize: 10 * 1024 * 1024,
  allowedTypes: ["application/pdf", "image/jpeg", "image/png"],
});

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

/* =====================================================================
   GIAI ĐOẠN 2 — Ghi nhận kiểm định (xem module-quan-ly-thiet-bi-y-te.md
   §4, §5). Dùng permission riêng MEDICAL_DEVICE_CALIBRATE cho hành động
   ghi nhận (khác MEDICAL_DEVICE_UPDATE của PUT /profile thường) — đây là
   1 hành động nghiệp vụ quan trọng có tính pháp lý (bằng chứng thanh tra),
   không phải chỉnh sửa thông tin thông thường.
===================================================================== */

router.post(
  "/:assetId/calibration-records",
  authenticate,
  authorizePermission("MEDICAL_DEVICE_CALIBRATE"),
  validateParams(assetIdParam),
  // GIAI ĐOẠN 5: Multer PHẢI chạy TRƯỚC validateBody — với
  // multipart/form-data, multer là middleware duy nhất parse được
  // `req.body` (Express body-parser mặc định KHÔNG đọc được multipart);
  // validateBody đọc `req.body` sau khi multer đã điền vào. File
  // certificate là TUỲ CHỌN (không bắt buộc gửi kèm — vẫn tạo được bản ghi
  // kiểm định không đính kèm chứng nhận, hoặc dùng `certificateFileUrl`
  // dạng string như Giai đoạn 2).
  certificateUploader.single("certificateFile"),
  validateBody(CreateCalibrationRecordDTO),
  createCalibrationRecord,
);

router.get(
  "/:assetId/calibration-records",
  authenticate,
  authorizePermission("MEDICAL_DEVICE_VIEW"),
  validateParams(assetIdParam),
  getCalibrationHistory,
);

/**
 * A2 (2026-09-15) — tải file giấy chứng nhận kiểm định thật đã upload
 * (`certificateFileId`). Cùng permission với xem lịch sử (`MEDICAL_DEVICE_VIEW`)
 * — không dùng ownership-check như `GET /api/upload/:id/download`, xem lý
 * do ở JSDoc `getCalibrationCertificateFileService`. 2 segment path riêng
 * ("/:recordId/certificate/download") nên không xung đột thứ tự route với
 * "/:assetId/calibration-records" (GET/POST) ở trên.
 */
router.get(
  "/:assetId/calibration-records/:recordId/certificate/download",
  authenticate,
  authorizePermission("MEDICAL_DEVICE_VIEW"),
  validateParams(CalibrationCertificateParamsDTO),
  downloadCalibrationCertificate,
);

/**
 * Thay thế chứng nhận đã lưu — theo yêu cầu user sau khi A2 gốc hoàn thành
 * ("upload nhầm file thì sửa lại được"). CÙNG permission `MEDICAL_DEVICE_CALIBRATE`
 * với ghi nhận kiểm định mới (KHÔNG dùng MEDICAL_DEVICE_UPDATE của PUT
 * /profile — sửa chứng nhận là hành động thuộc nhóm "kiểm định", không phải
 * chỉnh sửa thông tin hồ sơ thiết bị thông thường). Multer PHẢI chạy TRƯỚC
 * `validateBody` — cùng lý do đã ghi ở route POST tạo bản ghi phía trên.
 */
router.put(
  "/:assetId/calibration-records/:recordId/certificate",
  authenticate,
  authorizePermission("MEDICAL_DEVICE_CALIBRATE"),
  validateParams(CalibrationCertificateParamsDTO),
  certificateUploader.single("certificateFile"),
  validateBody(UpdateCalibrationCertificateDTO),
  updateCalibrationCertificate,
);

/* =====================================================================
   GIAI ĐOẠN 3 — Cảnh báo sắp/đã quá hạn kiểm định (chạy tay, ngoài lịch
   cron). Mirror đúng pattern "/alerts/run" của module Asset
   (asset.routes.ts, Giai đoạn 4). Không xung đột path với "/:assetId/..."
   ở trên vì segment thứ 2 khác nhau ("run" vs "profile"/"calibration-records").
===================================================================== */

router.post(
  "/alerts/run",
  authenticate,
  authorizePermission("MEDICAL_DEVICE_ALERTS_TRIGGER"),
  runMedicalDeviceAlerts,
);

export default router;

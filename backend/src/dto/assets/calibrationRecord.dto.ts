// dto/assets/calibrationRecord.dto.ts
import { z } from "zod";
import { CalibrationResult } from "../../interfaces/assets/calibrationRecord.interface";
import { objectId } from "../common.dto";

/**
 * CreateCalibrationRecordDTO — ghi nhận 1 lần kiểm định mới.
 *
 * `nextDueDate` là field BẮT BUỘC nhập tay (không tự suy ra từ
 * `calibrationIntervalMonths` của profile) — đúng quyết định thiết kế ở
 * module-quan-ly-thiet-bi-y-te.md §2.2: kết quả kiểm định (đặc biệt FAIL /
 * CONDITIONAL_PASS) có thể khiến đơn vị kiểm định chỉ định hạn kế tiếp
 * NGẮN HƠN chu kỳ thông thường, không phải lúc nào cũng `calibratedAt +
 * calibrationIntervalMonths`.
 *
 * Validate bổ sung `nextDueDate > calibratedAt` — không có trong tài liệu
 * thiết kế gốc, thêm vào như 1 ràng buộc hợp lý (chống nhập nhầm ngày) —
 * cần xác nhận lại nếu có trường hợp nghiệp vụ hợp lệ mà 2 ngày này bằng
 * nhau hoặc ngược lại.
 */
export const CreateCalibrationRecordDTO = z
  .object({
    calibratedAt: z.coerce.date(),
    calibratedBy: z
      .string()
      .trim()
      .min(1, "Tên đơn vị kiểm định không được để trống"),
    result: z.nativeEnum(CalibrationResult),
    certificateFileUrl: z.string().trim().optional(),
    nextDueDate: z.coerce.date(),
  })
  .refine((data) => data.nextDueDate > data.calibratedAt, {
    message: "nextDueDate phải sau calibratedAt",
    path: ["nextDueDate"],
  });

/**
 * Params cho 2 route thao tác trên giấy chứng nhận 1 bản ghi cụ thể (A2,
 * 2026-09-15) — tải (`GET .../certificate/download`) và thay thế
 * (`PUT .../certificate`).
 */
export const CalibrationCertificateParamsDTO = z.object({
  assetId: objectId("Asset ID không hợp lệ"),
  recordId: objectId("Record ID không hợp lệ"),
});

/**
 * Body cho `PUT .../calibration-records/:recordId/certificate` — thay thế
 * chứng nhận đã lưu (sửa lỗi upload nhầm file, theo yêu cầu user sau khi
 * hoàn thành A2 gốc). CHỦ Ý CHỈ có `certificateFileUrl` — `certificateFile`
 * (file mới, nếu có) đi qua `req.file` (multer), không phải field JSON body.
 * Validate "đúng 1 trong 2, không được cả hai lẫn KHÔNG cái nào" nằm ở
 * SERVICE (`updateCalibrationCertificateService`), không phải ở DTO —
 * cùng lý do `CreateCalibrationRecordDTO` không tự validate được quan hệ
 * giữa `certificateFile` (req.file) và `certificateFileUrl` (req.body).
 */
export const UpdateCalibrationCertificateDTO = z.object({
  certificateFileUrl: z.string().trim().optional(),
});

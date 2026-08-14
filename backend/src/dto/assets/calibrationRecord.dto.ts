// dto/assets/calibrationRecord.dto.ts
import { z } from "zod";
import { CalibrationResult } from "../../models/assets/calibrationRecord.model";

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

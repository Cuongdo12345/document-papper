import type { Types } from "mongoose";


export enum CalibrationResult {
  PASS = "PASS",
  FAIL = "FAIL",
  CONDITIONAL_PASS = "CONDITIONAL_PASS",
}

export interface ICalibrationRecord {
  deviceProfile: Types.ObjectId; // ref MedicalDeviceProfile

  calibratedAt: Date;
  // Tên đơn vị kiểm định BÊN NGOÀI hệ thống (VD: "Trung tâm Kiểm định Y tế
  // khu vực") — CỐ Ý dùng string tự do, KHÔNG ref User, vì đơn vị kiểm định
  // không phải tài khoản trong hệ thống.
  calibratedBy: string;
  result: CalibrationResult;
  // Link file giấy chứng nhận kiểm định (PDF scan) NHẬP TAY (Giai đoạn 2) —
  // chỉ dùng khi người dùng tự gõ 1 URL thật sự mở được (VD link Drive nội
  // bộ), KHÔNG phải nơi lưu kết quả upload file thật (xem `certificateFileId`).
  certificateFileUrl?: string;
  // (A2, 2026-09-15) Tham chiếu `Upload._id` khi giấy chứng nhận được UPLOAD
  // FILE THẬT (Giai đoạn 5, `certificateFile` multipart) — TRƯỚC ĐÂY code cũ
  // gán thẳng `Upload.fileUrl` (`/uploads/<filename>`) vào `certificateFileUrl`
  // ở trên, nhưng đó là ĐƯỜNG DẪN CHẾT (không có `express.static` phục vụ,
  // cùng lỗi đã tìm thấy và vá ở domain Upload chung — FE-15/`upload.controller.ts:downloadFile`)
  // — file KHÔNG THỂ tải được. Field này trỏ đúng vào `Upload` document để
  // endpoint `GET .../calibration-records/:recordId/certificate/download`
  // (`getCalibrationCertificateFileService`) đọc file thật trên đĩa.
  certificateFileId?: Types.ObjectId; // ref Upload
  nextDueDate: Date; // hạn kiểm định lần kế tiếp — do đơn vị kiểm định xác định, KHÔNG tự suy ra từ calibrationIntervalMonths (kết quả FAIL/CONDITIONAL_PASS có thể rút ngắn hạn)

  // User HỆ THỐNG đã nhập bản ghi này — KHÁC `calibratedBy` (đơn vị kiểm
  // định thực hiện việc kiểm định, không phải người nhập liệu).
  recordedBy: Types.ObjectId;

  createdAt?: Date;
  updatedAt?: Date;
}
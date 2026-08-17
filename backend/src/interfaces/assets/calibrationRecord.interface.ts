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
  // Link file giấy chứng nhận kiểm định (PDF scan). Giai đoạn 2 chỉ nhận
  // string (nhập tay dạng link/URL) — endpoint upload thật là Giai đoạn 5
  // (tuỳ chọn), dùng `uploadFiles` middleware sẵn có, không đổi field này.
  certificateFileUrl?: string;
  nextDueDate: Date; // hạn kiểm định lần kế tiếp — do đơn vị kiểm định xác định, KHÔNG tự suy ra từ calibrationIntervalMonths (kết quả FAIL/CONDITIONAL_PASS có thể rút ngắn hạn)

  // User HỆ THỐNG đã nhập bản ghi này — KHÁC `calibratedBy` (đơn vị kiểm
  // định thực hiện việc kiểm định, không phải người nhập liệu).
  recordedBy: Types.ObjectId;

  createdAt?: Date;
  updatedAt?: Date;
}
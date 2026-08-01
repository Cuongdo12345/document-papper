// shared/utils/Mongoid.util.ts
import { Types } from "mongoose";
import ApiError from "../errors/ApiError";

/**
 * Convert 1 giá trị department/departmentId (string từ query param) sang
 * `Types.ObjectId` thật sự trước khi đưa vào `$match` của aggregation.
 *
 * 🐛 BUG ĐÃ SỬA (dashboard.service.ts):
 * `topDamagedDevicesService` / `topDamagedInkService` trước đây gán thẳng
 * `match.department = department` (string thô từ req.query).
 * Mongoose CHỈ tự cast string → ObjectId trong `Model.find()` /
 * `Model.findOne()` (Query API) — KHÔNG tự cast trong `Model.aggregate()`
 * (Aggregation Pipeline API). Hệ quả: khi client gọi
 * `?department=<id>` cho 2 KPI "top thiết bị hỏng" / "top mực hỏng",
 * `$match.department` so sánh string với ObjectId trong DB → không bao giờ
 * match được document nào, filter theo khoa coi như không hoạt động.
 *
 * Hàm này validate hợp lệ trước (trả lỗi 400 rõ ràng thay vì để Mongo lỗi
 * mơ hồ hoặc âm thầm trả rỗng), rồi mới convert.
 */
export const toOptionalObjectId = (
  value: unknown,
  invalidMessage = "ID không hợp lệ",
): Types.ObjectId | undefined => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const raw = String(value);

  if (!Types.ObjectId.isValid(raw)) {
    throw ApiError.badRequest(invalidMessage);
  }

  return new Types.ObjectId(raw);
};
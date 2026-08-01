// shared/helpers/generateAssetCode.ts
import { Types } from "mongoose";
import Department from "../../models/departments/department.model";
import { getNextSequence } from "../utils/getNext";
import ApiError from "../errors/ApiError";

/**
 * Sinh `assetCode` an toàn cho nhiều request song song (kể cả khi import
 * Excel hàng loạt) — tái dùng đúng cơ chế Counter Collection + atomic
 * `$inc` (`getNextSequence`) đã có sẵn ở `generateDocumentCode.ts`, không
 * dùng transaction, không dùng `countDocuments` (tránh race condition).
 *
 * Format: TB-{MÃ KHOA}-{NĂM}-{STT 4 số}, ví dụ: TB-CNTT-2026-0001
 */
export const generateAssetCode = async (
  departmentId: Types.ObjectId,
  createdAt?: Date,
): Promise<string> => {
  const department = await Department.findById(departmentId);

  if (!department) {
    throw ApiError.notFound("Không tìm thấy khoa/phòng");
  }

  const deptCode = department.code.toUpperCase();

  const baseDate = createdAt || new Date();
  const year = baseDate.getFullYear();

  // Counter key riêng cho asset — không đụng chung namespace với
  // documentCode (`DocumentCategory-departmentId-year`) dù cùng dùng chung
  // 1 Counter collection.
  const counterKey = `ASSET-${departmentId}-${year}`;

  const seq = await getNextSequence(counterKey);
  const order = String(seq).padStart(4, "0");

  return `TB-${deptCode}-${year}-${order}`;
};

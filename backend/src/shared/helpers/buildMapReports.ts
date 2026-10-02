import type { Types } from "mongoose";
import { Document, DocumentSubType } from "../../models/documents/document.model";
import { buildInspectionText } from "../helpers/parse-doc"
/**
 * Build map biên bản (CONFIRM_STATUS / CHECK_DAMAGE) theo đề xuất mà nó tham chiếu.
 *
 * BR-17 (DEV-105, 2026-09-30): trước đây hàm này tải TOÀN BỘ biên bản đang hoạt
 * động của cả hệ thống (2 lần cho 2 loại), dù export chỉ 1 khoa / 1 tháng — tốn
 * bộ nhớ và thời gian tăng dần theo năm (RV08-03). Nay BẮT BUỘC truyền
 * `proposalIds` (các đề xuất sẽ được xuất) và chỉ nạp biên bản tham chiếu tới
 * đúng những đề xuất đó (index `referenceTo`).
 *
 * Key của map vẫn là `referenceTo[0]` như cũ. Biên bản có `referenceTo[0]`
 * không thuộc `proposalIds` (chỉ khớp vì phần tử sau) bị bỏ qua — không đề xuất
 * nào được xuất sẽ tra tới key đó.
 *
 * @param subType loại biên bản
 * @param proposalIds `_id` các đề xuất cần tra
 */
export const buildMapFromReports = async (subType: DocumentSubType, proposalIds: readonly Types.ObjectId[]) => {
  const map = new Map<string, any>();
  if (proposalIds.length === 0) return map;

  const wanted = new Set(proposalIds.map((id) => id.toString()));

  const docs = await Document.find({ subType, isActive: true, referenceTo: { $in: proposalIds } })
    .select("referenceTo meta.items")
    .lean();

  for (const doc of docs) {
    if (!doc.referenceTo?.length) continue;

    const key = doc.referenceTo[0].toString();
    if (!wanted.has(key)) continue;

    const data = buildInspectionText(doc.meta?.items || []);

    map.set(key, data);
  }

  return map;
};

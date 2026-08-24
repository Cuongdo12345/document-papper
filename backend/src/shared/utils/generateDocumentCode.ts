import { Types } from "mongoose";
import Department from "../../models/departments/department.model";
import { getNextSequence } from "../utils/getNext";
import {
  Document,
  DocumentCategory,
} from "../../models/documents/document.model";
import ApiError from "../errors/ApiError";

/**
 * Sinh `documentCode` an toàn cho nhiều request song song, dùng Counter
 * Collection + atomic `$inc` (`getNextSequence`) — không dùng transaction,
 * không dùng `countDocuments` (tránh race condition khi nhiều request tạo
 * document cùng lúc).
 *
 * Sửa #3 (DOCUMENT_ERROR_ANALYSIS.md, "High"): trước đây `throw new
 * Error("Không tìm thấy khoa/phòng")` — lỗi thuần, bỏ qua `ApiError`. Kể cả
 * khi caller (`document.service.ts`) đã bọc đúng `catchAsync`/error flow,
 * lỗi này vẫn rơi vào nhánh 500 mặc định của `error.middleware.ts` thay vì
 * đúng 404, gây hiểu nhầm cho client/monitoring (lỗi "department không tồn
 * tại" là input sai của client, không phải lỗi hạ tầng server).
 */
export const generateDocumentCode = async (
  category: DocumentCategory,
  departmentId: Types.ObjectId,
  createdAt?: Date,
): Promise<string> => {
  const department = await Department.findById(departmentId);

  if (!department) {
    throw ApiError.notFound("Không tìm thấy khoa/phòng");
  }

  const deptCode = department.code.toUpperCase();

  // ⚠️ GIAI ĐOẠN 3 (đính kèm manual) — trước đây chỉ phân biệt 2 nhánh
  // (`PROPOSAL` → "PR", MỌI category khác → "RP"). Khi thêm
  // `DocumentCategory.REFERENCE`, ternary cũ sẽ ÂM THẦM gán prefix "RP"
  // (nghĩa là "Report"/biên bản) cho tài liệu MANUAL — sai về mặt hiển thị,
  // gây nhầm lẫn khi nhân viên đọc mã tài liệu (vd thấy "RP-..." tưởng là
  // biên bản trong khi thực chất là hướng dẫn sử dụng). Liệt kê tường minh
  // từng category thay vì suy luận qua phủ định.
  const prefix =
    category === DocumentCategory.PROPOSAL
      ? "PR"
      : category === DocumentCategory.REPORT
        ? "RP"
        : "RF"; // REFERENCE (manual/tài liệu tham khảo)

  const baseDate = createdAt || new Date();
  const year = baseDate.getFullYear();

  // KEY COUNTER
  const counterKey = `${category}-${departmentId}-${year}`;

  const seq = await getNextSequence(counterKey);

  const order = String(seq).padStart(4, "0");

  return `${prefix}-${deptCode}-${year}-${order}`;
};

/**III. HÀM SINH documentCode (TỰ ĐỘNG – AN TOÀN)
🔧 Logic
Đếm số document cùng loại + khoa + năm
Tăng STT
Padding 4 chữ số
/////////////////////////////////////////////////////////////////////
Quá chuẩn 🔥 giờ mình nâng hệ thống lên level production thật sự:
🎯 Mục tiêu:
documentCode KHÔNG BAO GIỜ trùng
kể cả 100 request import chạy song song
không dùng transaction
không phụ thuộc countDocuments

Chúng ta sẽ dùng:

✅ Counter Collection
✅ MongoDB atomic $inc
✅ Unique index
→ chống trùng 100%

🚀 8️⃣ Giờ hệ thống của bạn đạt level:
Tính năng	Status
Không dùng transaction	✅
Không dùng countDocuments	✅
Không race condition	✅
Không duplicate documentCode	✅
Scale cho nhiều server	✅
Production ready	✅
 */

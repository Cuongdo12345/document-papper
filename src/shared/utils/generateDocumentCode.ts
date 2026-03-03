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

// import { Document, DocumentCategory } from "../../models/document.model";
// import Department from "../../models/department.model";
// import { Types } from "mongoose";

// export const generateDocumentCode = async (
//   category: DocumentCategory,
//   departmentId: Types.ObjectId,
//   createdAt?: Date
// ): Promise<string> => {
//   /* ===== 1. LẤY MÃ KHOA ===== */
//   const department = await Department.findById(departmentId);

//   if (!department) {
//     throw new Error("Không tìm thấy khoa/phòng");
//   }

//   const deptCode = department.code.toUpperCase();

//   /* ===== 2. XÁC ĐỊNH PREFIX ===== */
//   const prefix =
//     category === DocumentCategory.PROPOSAL ? "PR" : "RP";

//   /* ===== 3. NĂM HIỆN TẠI ===== */
//   const baseDate = createdAt || new Date();
//   const year = new Date().getFullYear();

//   /* ===== 4. ĐẾM SỐ DOCUMENT TRONG NĂM ===== */
//   const startOfYear = new Date(`${year}-01-01T00:00:00.000Z`);
//   const endOfYear = new Date(`${year}-12-31T23:59:59.999Z`);

//   const count = await Document.countDocuments({
//     category,
//     department: departmentId,
//     createdAt: {
//       $gte: startOfYear,
//       $lte: endOfYear,
//     },
//   });

//   /* ===== 5. TẠO STT ===== */
//   const order = String(count + 1).padStart(4, "0");

//   /* ===== 6. GHÉP MÃ ===== */
//   return `${prefix}-${deptCode}-${year}-${order}`;
// };
import { Types } from "mongoose";
import Department from "../../models/department.model";
import { getNextSequence } from "../utils/getNext";
import { Document, DocumentCategory } from "../../models/document.model";

export const generateDocumentCode = async (
  category: DocumentCategory,
  departmentId: Types.ObjectId,
  createdAt?: Date
): Promise<string> => {
  const department = await Department.findById(departmentId);

  if (!department) {
    throw new Error("Không tìm thấy khoa/phòng");
  }

  const deptCode = department.code.toUpperCase();

  const prefix =
    category === DocumentCategory.PROPOSAL ? "PR" : "RP";

  const baseDate = createdAt || new Date();
  const year = baseDate.getFullYear();

  // 🔥 KEY COUNTER
  const counterKey = `${category}-${departmentId}-${year}`;

  const seq = await getNextSequence(counterKey);

  const order = String(seq).padStart(4, "0");

  return `${prefix}-${deptCode}-${year}-${order}`;
};
/**III. HÀM SINH documentCode (TỰ ĐỘNG – AN TOÀN)
🔧 Logic
Đếm số document cùng loại + khoa + năm
Tăng STT
Padding 4 chữ số
 */

import { Document, DocumentCategory } from "../../models/document.model";
import Department from "../../models/department.model";
import { Types } from "mongoose";

export const generateDocumentCode = async (
  category: DocumentCategory,
  departmentId: Types.ObjectId
): Promise<string> => {
  /* ===== 1. LẤY MÃ KHOA ===== */
  const department = await Department.findById(departmentId);

  if (!department) {
    throw new Error("Không tìm thấy khoa/phòng");
  }

  const deptCode = department.code.toUpperCase();

  /* ===== 2. XÁC ĐỊNH PREFIX ===== */
  const prefix =
    category === DocumentCategory.PROPOSAL ? "PR" : "RP";

  /* ===== 3. NĂM HIỆN TẠI ===== */
  const year = new Date().getFullYear();

  /* ===== 4. ĐẾM SỐ DOCUMENT TRONG NĂM ===== */
  const startOfYear = new Date(`${year}-01-01T00:00:00.000Z`);
  const endOfYear = new Date(`${year}-12-31T23:59:59.999Z`);

  const count = await Document.countDocuments({
    category,
    department: departmentId,
    createdAt: {
      $gte: startOfYear,
      $lte: endOfYear,
    },
  });

  /* ===== 5. TẠO STT ===== */
  const order = String(count + 1).padStart(4, "0");

  /* ===== 6. GHÉP MÃ ===== */
  return `${prefix}-${deptCode}-${year}-${order}`;
};

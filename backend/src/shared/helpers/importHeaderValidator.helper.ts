import ExcelJS from "exceljs";
import ApiError from "../errors/ApiError";

/* =========================================================================
   VALIDATE HEADER ROW (mục 🟠#2)
   Các số cột (index) PHẢI khớp đúng vị trí `getCell(n)` dùng trong
   `importDocumentsExcel` (export.service.ts) — đây là hợp đồng ngầm giữa 2
   nơi, tách riêng thành 1 map để không lệch nhau khi sửa sau này. File mẫu
   (`getImportExcelTemplate`) cũng PHẢI khớp 1-1 với danh sách này.

   ⚠️ Cột 1 ("Mã giấy") KHÔNG được `importDocumentsExcel` đọc giá trị (PASS 2
   chỉ đọc từ `getCell(2)` trở đi — mã giấy do hệ thống tự sinh qua
   `generateDocumentCode`, không lấy từ Excel). Cột này vẫn nằm trong danh
   sách validate vì template cần hiển thị đủ cột cho user dễ hình dung, dù
   giá trị user điền vào cột này (nếu có) sẽ bị bỏ qua khi import.
========================================================================= */
export const IMPORT_COLUMNS: { index: number; header: string }[] = [
  { index: 1, header: "Mã giấy" },
  { index: 2, header: "Loại giấy" },
  { index: 3, header: "Khoa" },
  { index: 4, header: "Tiêu đề" },
  { index: 5, header: "Tên thiết bị" },
  { index: 6, header: "Ngày đề xuất" },
  { index: 7, header: "Số lượng" },
  { index: 8, header: "Giá tiền" },
  { index: 9, header: "Ghi chú" },
  { index: 10, header: "Kiểm tra" },
];

const normalizeHeaderText = (value: any) =>
  value?.toString().trim().toLowerCase().replace(/\s+/g, " ") ?? "";

/**
 * Trước đây file đọc dữ liệu theo VỊ TRÍ cột cố định (`getCell(2)`,
 * `getCell(3)`...) mà không kiểm tra tên cột thực tế trong file. Nếu user vô
 * tình đổi thứ tự cột hoặc thêm/xoá 1 cột, dữ liệu bị đọc lệch HOÀN TOÀN ÂM
 * THẦM (vd cột "Tiêu đề" bị đọc nhầm thành "Khoa") — không có lỗi nào báo ra,
 * chỉ tạo ra dữ liệu sai trong DB. Nay so khớp tên cột ở dòng 1 TRƯỚC khi xử
 * lý bất kỳ dòng dữ liệu nào, từ chối sớm với message liệt kê rõ cột sai.
 *
 * 🔗 Giai đoạn 5 (module Asset) — thêm tham số `columns` TUỲ CHỌN (mặc định
 * `IMPORT_COLUMNS`, giữ nguyên 100% hành vi cũ cho mọi chỗ gọi hiện có của
 * Document import) để `assetExcel.service.ts` tái dùng được hàm này với bộ
 * cột KHÁC (`ASSET_IMPORT_COLUMNS`), không phải viết lại 1 hàm validate
 * header riêng chỉ khác mỗi danh sách cột.
 */
export const validateImportHeaderRow = (
  sheet: ExcelJS.Worksheet,
  columns: { index: number; header: string }[] = IMPORT_COLUMNS,
  templateHint: string = "GET /excel/template",
) => {
  const headerRow = sheet.getRow(1);
  const mismatches: { column: number; expected: string; actual: string }[] = [];

  for (const { index, header } of columns) {
    const actualRaw = headerRow.getCell(index).value;
    if (normalizeHeaderText(actualRaw) !== normalizeHeaderText(header)) {
      mismatches.push({
        column: index,
        expected: header,
        actual: actualRaw?.toString().trim() || "(trống)",
      });
    }
  }

  if (mismatches.length) {
    throw ApiError.badRequest(
      `File không đúng định dạng cột — vui lòng tải file mẫu tại ${templateHint} và không đổi thứ tự/tên cột.`,
      { mismatches },
    );
  }
};

// /**
//  * Trước đây file đọc dữ liệu theo VỊ TRÍ cột cố định (`getCell(2)`,
//  * `getCell(3)`...) mà không kiểm tra tên cột thực tế trong file. Nếu user vô
//  * tình đổi thứ tự cột hoặc thêm/xoá 1 cột, dữ liệu bị đọc lệch HOÀN TOÀN ÂM
//  * THẦM (vd cột "Tiêu đề" bị đọc nhầm thành "Khoa") — không có lỗi nào báo ra,
//  * chỉ tạo ra dữ liệu sai trong DB. Nay so khớp tên cột ở dòng 1 TRƯỚC khi xử
//  * lý bất kỳ dòng dữ liệu nào, từ chối sớm với message liệt kê rõ cột sai.
//  */
// export const validateImportHeaderRow = (sheet: ExcelJS.Worksheet) => {
//   const headerRow = sheet.getRow(1);
//   const mismatches: { column: number; expected: string; actual: string }[] = [];

//   for (const { index, header } of IMPORT_COLUMNS) {
//     const actualRaw = headerRow.getCell(index).value;
//     if (normalizeHeaderText(actualRaw) !== normalizeHeaderText(header)) {
//       mismatches.push({
//         column: index,
//         expected: header,
//         actual: actualRaw?.toString().trim() || "(trống)",
//       });
//     }
//   }

//   if (mismatches.length) {
//     throw ApiError.badRequest(
//       "File không đúng định dạng cột — vui lòng tải file mẫu tại GET /excel/template và không đổi thứ tự/tên cột.",
//       { mismatches },
//     );
//   }
// };


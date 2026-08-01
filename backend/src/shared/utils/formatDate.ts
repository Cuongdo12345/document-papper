import ApiError from "../errors/ApiError";

/**
 * Hàm dùng chung format định dạng ngày dùng chung khi import excel.
 *
 * GIỮ NGUYÊN hành vi lenient (không throw, fallback về `new Date()`) — đây
 * là quyết định có chủ đích để không phá vỡ các nơi khác trong codebase có
 * thể đang phụ thuộc vào hành vi "luôn trả về 1 Date hợp lệ" của hàm này
 * (chưa rà soát hết toàn bộ call site trong phạm vi file được cung cấp).
 *
 * Dùng `parseExcelDateStrict` (bên dưới) cho luồng IMPORT — nơi 1 ngày sai
 * định dạng nên được báo lỗi ngay cho người nhập liệu thay vì âm thầm trở
 * thành "hôm nay" (Sửa #7, DOCUMENT_ERROR_ANALYSIS.md — "Low" nhưng ảnh
 * hưởng data integrity: 1 dòng Excel sai định dạng ngày sẽ không có bất kỳ
 * cảnh báo nào ở luồng cũ).
 */
export function parseExcelDate(value: any): Date {
  if (!value) return new Date();

  // Excel trả về Date object
  if (value instanceof Date) {
    return value;
  }

  // Excel trả về number (serial date)
  if (typeof value === "number") {
    const excelEpoch = new Date(1899, 11, 30);
    return new Date(excelEpoch.getTime() + value * 86400000);
  }

  // String dạng dd/mm/yyyy
  if (typeof value === "string") {
    const parts = value.split("/");
    if (parts.length === 3) {
      const [day, month, year] = parts;
      const parsed = new Date(`${year}-${month}-${day}`);
      if (!isNaN(parsed.getTime())) return parsed;
    }

    const fallback = new Date(value);
    if (!isNaN(fallback.getTime())) return fallback;
  }

  return new Date();
}

/**
 * Biến thể STRICT cho luồng import — throw `ApiError.badRequest` khi
 * `value` không parse được thành ngày hợp lệ, thay vì âm thầm trả về
 * `new Date()` (thời điểm hiện tại). Dùng hàm này ở bất kỳ đâu đang xử lý
 * dữ liệu Excel do người dùng nhập tay (rủi ro sai format cao), để lỗi được
 * phát hiện ngay tại thời điểm import thay vì phát hiện muộn khi review số
 * liệu.
 *
 * `fieldLabel` dùng để message lỗi chỉ rõ ngày nào/dòng nào sai (caller nên
 * truyền tên cột + số dòng, ví dụ `"Ngày kiểm tra (dòng 5)"`).
 */
export function parseExcelDateStrict(value: any, fieldLabel = "Ngày"): Date {
  if (value === undefined || value === null || value === "") {
    throw ApiError.badRequest(`${fieldLabel} không được để trống`);
  }

  if (value instanceof Date) {
    if (isNaN(value.getTime())) {
      throw ApiError.badRequest(`${fieldLabel} không hợp lệ`);
    }
    return value;
  }

  if (typeof value === "number") {
    const excelEpoch = new Date(1899, 11, 30);
    const parsed = new Date(excelEpoch.getTime() + value * 86400000);
    if (isNaN(parsed.getTime())) {
      throw ApiError.badRequest(`${fieldLabel} không hợp lệ (serial date: ${value})`);
    }
    return parsed;
  }

  if (typeof value === "string") {
    const parts = value.split("/");
    if (parts.length === 3) {
      const [day, month, year] = parts;
      const parsed = new Date(`${year}-${month}-${day}`);
      if (!isNaN(parsed.getTime())) return parsed;
    }

    const fallback = new Date(value);
    if (!isNaN(fallback.getTime())) return fallback;

    throw ApiError.badRequest(`${fieldLabel} sai định dạng: "${value}" (cần dd/mm/yyyy)`);
  }

  throw ApiError.badRequest(`${fieldLabel} có kiểu dữ liệu không hỗ trợ: ${typeof value}`);
}

// /**
//  * Hàm dùng chung format định dạng ngày dùng chung khi import excel
//  * @param value 
//  * @returns 
//  */
// export function parseExcelDate(value: any): Date {
//   if (!value) return new Date();

//   // Excel trả về Date object
//   if (value instanceof Date) {
//     return value;
//   }

//   // Excel trả về number (serial date)
//   if (typeof value === "number") {
//     const excelEpoch = new Date(1899, 11, 30);
//     return new Date(excelEpoch.getTime() + value * 86400000);
//   }

//   // String dạng dd/mm/yyyy
//   if (typeof value === "string") {
//     const parts = value.split("/");
//     if (parts.length === 3) {
//       const [day, month, year] = parts;
//       const parsed = new Date(`${year}-${month}-${day}`);
//       if (!isNaN(parsed.getTime())) return parsed;
//     }

//     const fallback = new Date(value);
//     if (!isNaN(fallback.getTime())) return fallback;
//   }

//   return new Date();
// }
// ⚠️ Điều chỉnh lại đường dẫn import bên dưới cho khớp vị trí thực tế của
// file này trong repo (chưa xác nhận được path chính xác trong phạm vi các
// file đã đọc — `buildMapReports.ts` import file này qua "../helpers/parse-doc").
import ApiError from "../../shared/errors/ApiError";

/**
 * Format chuỗi import excel chỗ Kiểm tra:
 *   "Drum | SL:2 | 120000; Gạt | SL:1 | 50000"
 *
 * Sửa Missing Validation #6 (DOCUMENT_VALIDATION_ANALYSIS.md): trước đây
 * hàm này KHÔNG throw khi 1 item sai format (thiếu "|", thiếu "SL:", giá
 * không phải số) — âm thầm trả về `quantity: 0`/`unitPrice: 0`, làm sai lệch
 * `totalAmount` mà không ai biết cho tới khi review thủ công. Đây là điểm
 * nhận dữ liệu Excel nhập tay, rủi ro sai format cao nhất trong toàn module
 * nhưng lại là nơi duy nhất trước đây không validate ở bất kỳ tầng nào.
 *
 * Nay throw `ApiError.badRequest` với message chỉ rõ item nào sai và lý do,
 * để người import biết ngay dòng nào cần sửa thay vì phát hiện sai số liệu
 * về sau.
 */
export const parseInspectionJSONLike = (text?: string) => {
  if (!text) return null;

  const items: any[] = [];
  let totalAmount = 0;

  const parts = text.split(";").map((p) => p.trim()).filter(Boolean);

  if (parts.length === 0) {
    throw ApiError.badRequest("Dữ liệu kiểm tra trống hoặc sai định dạng");
  }

  parts.forEach((part, index) => {
    const fields = part.split("|").map((s) => s.trim()).filter(Boolean);

    // Format bắt buộc: "Mô tả | SL:x | giá" — đúng 3 phần, thiếu phần nào
    // cũng là lỗi format rõ ràng, không nên cố đoán/fallback.
    if (fields.length !== 3) {
      throw ApiError.badRequest(
        `Item #${index + 1} sai định dạng (cần đúng 3 phần "Mô tả | SL:x | giá"): "${part}"`
      );
    }

    const [description, quantityField, priceField] = fields;

    if (!description) {
      throw ApiError.badRequest(`Item #${index + 1} thiếu mô tả: "${part}"`);
    }

    if (!/^sl\s*:\s*\d+$/i.test(quantityField)) {
      throw ApiError.badRequest(
        `Item #${index + 1} sai định dạng số lượng (cần "SL:<số>"): "${quantityField}"`
      );
    }
    const quantity = Number(quantityField.replace(/\D/g, ""));
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw ApiError.badRequest(
        `Item #${index + 1} có số lượng không hợp lệ (phải là số nguyên dương): "${quantityField}"`
      );
    }

    if (!/^\d+$/.test(priceField)) {
      throw ApiError.badRequest(
        `Item #${index + 1} có đơn giá không hợp lệ (phải là số): "${priceField}"`
      );
    }
    const unitPrice = Number(priceField);
    if (unitPrice < 0) {
      throw ApiError.badRequest(`Item #${index + 1} có đơn giá âm: "${priceField}"`);
    }

    const totalPrice = quantity * unitPrice;
    totalAmount += totalPrice;

    items.push({
      description,
      quantity,
      unitPrice,
      totalPrice,
    });
  });

  return {
    inspectionResult: items.map((i) => i.description).join(", "),
    items,
    totalAmount,
  };
};

/**
 * Kiểm tra chuỗi để export phần excel theo format.
 *
 * KHÁC với `parseInspectionJSONLike` (điểm NHẬP dữ liệu từ người dùng), hàm
 * này đọc dữ liệu đã lưu trong DB (`Document.meta.items`) để XUẤT ra chuỗi —
 * đây là điểm ĐỌC dữ liệu đã tồn tại, có thể là dữ liệu cũ được tạo trước khi
 * validate chặt được áp dụng. Vì vậy CỐ Ý giữ hành vi lenient (không throw)
 * để không làm sập tính năng export chỉ vì 1 bản ghi cũ có `items` hơi lệch
 * chuẩn — nhưng đổi từ "im lặng" sang "cảnh báo" (`console.warn`) để không
 * mất dấu vết khi dữ liệu export ra bị sai số do input cũ không đúng chuẩn.
 */
export const buildInspectionText = (items: any[]) => {
  if (!items || !items.length) {
    return {
      text: "",
      total: 0,
    };
  }

  let total = 0;

  const text = items
    .map((item, index) => {
      const quantity = item.quantity || 0;
      const unitPrice = item.unitPrice || 0;

      if (!item.quantity || !item.unitPrice) {
        console.warn(
          `[buildInspectionText] item #${index + 1} thiếu quantity/unitPrice hợp lệ, dùng fallback 0: ${JSON.stringify(item)}`
        );
      }

      const itemTotal = quantity * unitPrice;
      total += itemTotal;

      return `${item.description || ""} | SL:${quantity} | ${unitPrice}`;
    })
    .join("; ");

  return {
    text,
    total,
  };
};


// //Format chuỗi import excel chỗ Kiểm tra
// //Drum | SL:2 | 120000; Gạt | SL:1 | 50000
// export const parseInspectionJSONLike = (text?: string) => {
//   if (!text) return null;

//   const items: any[] = [];
//   let totalAmount = 0;

//   const parts = text.split(";"); // tách từng item

//   for (const part of parts) {
//     const fields = part.split("|").map(s => s.trim());

//     let description = "";
//     let quantity = 0;
//     let unitPrice = 0;

//     for (const f of fields) {
//       if (!f) continue;

//       // description (text đầu tiên)
//       if (!description) {
//         description = f;
//         continue;
//       }

//       // SL
//       if (f.toLowerCase().includes("sl")) {
//         quantity = Number(f.replace(/\D/g, ""));
//       }

//       // giá
//       else if (/\d+/.test(f)) {
//         unitPrice = Number(f.replace(/\D/g, ""));
//       }
//     }

//     const totalPrice = quantity * unitPrice;
//     totalAmount += totalPrice;

//     items.push({
//       description,
//       quantity,
//       unitPrice,
//       totalPrice,
//     });
//   }

//   return {
//     inspectionResult: items.map(i => i.description).join(", "),
//     items,
//     totalAmount,
//   };
// };


// //Kiểm tra chuỗi để export phần excel theo format
// export const buildInspectionText = (items: any[]) => {
//   if (!items || !items.length){
//     return {
//         text: "",
//         total: 0
//     }
//   } 

//   let total = 0;

//   const text = items
//     .map((item) => {
//       const quantity = item.quantity || 0;
//       const unitPrice = item.unitPrice || 0;
//       const itemTotal = quantity * unitPrice;

//       total += itemTotal;

//       return `${item.description || ""} | SL:${quantity} | ${unitPrice}`;
//     })
//     .join("; ");

//   return {
//     text,
//     total,
//   };
// };
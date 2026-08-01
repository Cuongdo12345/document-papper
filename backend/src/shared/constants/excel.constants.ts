/**
 * Hằng số dùng chung cho toàn bộ module excel (export/import/sync) — tách
 * riêng để `export.service.ts` không phải là nơi duy nhất biết các giá trị
 * này, và các file helper (`helpers/*.helper.ts`) có thể import mà không
 * phải import ngược từ `export.service.ts`.
 */

export const MAX_IMPORT_ROWS = 5000;
export const MAX_SYNC_ROWS = 5000;

// Cap số lỗi lưu vào 1 bản ghi audit trail — tránh document phình to bất
// thường nếu file có hàng nghìn dòng lỗi (khác với `result.errors` trả về
// response API, vốn không cap, vì FE cần thấy đủ để user tự sửa file).
// Cap số lỗi lưu vào 1 bản ghi audit trail — tránh document phình to bất
// thường nếu file có hàng nghìn dòng lỗi (khác với `result.errors` trả về
// response API, vốn không cap, vì FE cần thấy đủ để user tự sửa file).
export const MAX_STORED_ERRORS = 100;

export const VALID_PROPOSAL_SUBTYPES = ["PROPOSE_INK", "PROPOSE_REPAIR", "PROPOSE_PROCUREMENT"];

export const ALLOWED_WORKFLOW_STATUSES = ["pending", "approved", "rejected", "cancelled", "completed"];

/**
 * 🔗 GIAI ĐOẠN 5 (module Asset) — cột import Excel cho Asset. Cột 1 ("Mã tài
 * sản") CHỦ Ý không được đọc giá trị khi import — mã tài sản luôn do hệ
 * thống tự sinh qua `generateAssetCode` (giống hệt quy ước "Mã giấy" của
 * Document import) — cột này chỉ hiển thị trong template cho user dễ hình
 * dung, KHÔNG dùng để match/update bản ghi đã tồn tại.
 */
export const ASSET_IMPORT_COLUMNS: { index: number; header: string }[] = [
  { index: 1, header: "Mã tài sản" },
  { index: 2, header: "Danh mục" },
  { index: 3, header: "Tên tài sản" },
  { index: 4, header: "Khoa/phòng" },
  { index: 5, header: "Số serial" },
  { index: 6, header: "Model" },
  { index: 7, header: "Hãng sản xuất" },
  { index: 8, header: "Vị trí" },
  { index: 9, header: "Ngày mua" },
  { index: 10, header: "Giá mua" },
  { index: 11, header: "Hạn bảo hành" },
  { index: 12, header: "Nhà cung cấp" },
];
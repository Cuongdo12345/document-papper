// shared/utils/bulkDelete.util.ts
//
// [MỚI 2026-09-16, DEV-060] Helper dùng chung cho mọi endpoint "xoá mềm hàng
// loạt" (Asset/AssetCategory/ConsumableItem/ConsumableCategory/Vendor/User).
import ApiError from "../errors/ApiError";

export interface BulkDeleteFailure {
  id: string;
  message: string;
}

export interface BulkDeleteResult {
  deletedIds: string[];
  failed: BulkDeleteFailure[];
}

/**
 * Chạy hàm xoá/toggle SINGLE-ITEM đã có sẵn (`deleteOne`) cho TỪNG id trong
 * danh sách, dùng `Promise.allSettled` — 1 item lỗi (VD còn bị tham chiếu,
 * đã bị xoá trước đó) KHÔNG chặn các item còn lại. Tái sử dụng NGUYÊN VẸN
 * service single-item hiện có (mọi validate/FK-check/business rule không
 * viết lại) — chỉ cộng dồn kết quả để trả về rõ item nào thành công/thất
 * bại kèm lý do, thay vì "tất cả hoặc không gì cả".
 */
export const runBulkDelete = async (
  ids: string[],
  deleteOne: (id: string) => Promise<unknown>,
  // [MỚI 2026-09-17, DEV-061] `fallbackMessage` tuỳ chọn — cho phép tái dùng
  // helper này cho hành động khác "xoá" (VD: khôi phục hàng loạt Document),
  // giữ mặc định cũ để KHÔNG đổi behavior 6 domain đã dùng trước đó.
  fallbackMessage = "Xoá thất bại",
): Promise<BulkDeleteResult> => {
  const results = await Promise.allSettled(ids.map((id) => deleteOne(id)));

  const deletedIds: string[] = [];
  const failed: BulkDeleteFailure[] = [];

  results.forEach((result, index) => {
    const id = ids[index];
    if (result.status === "fulfilled") {
      deletedIds.push(id);
    } else {
      const message = result.reason instanceof ApiError ? result.reason.message : fallbackMessage;
      failed.push({ id, message });
    }
  });

  return { deletedIds, failed };
};

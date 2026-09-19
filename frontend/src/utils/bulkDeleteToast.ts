import { toast } from "@/stores/toastStore";
import type { BulkDeleteResult } from "@/types/shared.types";

/**
 * [MỚI 2026-09-16, DEV-060] Toast dùng chung sau mọi lần gọi
 * `POST .../bulk-delete` — 1 vài mục có thể xoá thất bại (VD còn tham
 * chiếu) trong khi các mục khác vẫn xoá được, nên KHÔNG chỉ có
 * success/error đơn giản mà còn ca "thành công 1 phần" (warning).
 */
// `action` tuỳ chọn — [MỞ RỘNG 2026-09-17, DEV-061] cho phép tái dùng đúng
// toast này cho "khôi phục hàng loạt" (Document), mặc định giữ nguyên "xoá"
// để KHÔNG đổi behavior 6 domain đã dùng trước đó.
export function showBulkDeleteToast(result: BulkDeleteResult, totalRequested: number, action: "xoá" | "khôi phục" = "xoá") {
  const { deletedIds, failed } = result;

  if (failed.length === 0) {
    toast.success(`Đã ${action} ${deletedIds.length} mục`);
    return;
  }

  const firstReason = failed[0].message;
  const extra = failed.length > 1 ? ` (và ${failed.length - 1} lỗi khác)` : "";

  if (deletedIds.length === 0) {
    toast.error(`Không ${action} được mục nào: ${firstReason}${extra}`);
    return;
  }

  toast.warning(`Đã ${action} ${deletedIds.length}/${totalRequested} mục — ${failed.length} mục thất bại: ${firstReason}${extra}`);
}

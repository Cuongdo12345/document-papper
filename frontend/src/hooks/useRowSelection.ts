import { useMemo, useState } from "react";

/**
 * [MỚI 2026-09-16, DEV-060] Quản lý state "chọn nhiều dòng" cho `DataTable`
 * (checkbox từng dòng + chọn tất cả) — dùng chung cho các trang danh sách có
 * thanh công cụ hàng loạt (Batch Action Bar).
 *
 * `visibleIds` PHẢI là danh sách id của trang/kết quả lọc ĐANG HIỂN THỊ hiện
 * tại — hook TỰ ĐỘNG bỏ khỏi selection bất kỳ id nào không còn nằm trong
 * `visibleIds` (đổi trang/lọc/sort). Tránh trạng thái "đã chọn" vô hình
 * (chọn ở trang 1, sang trang 2 vẫn tưởng còn chọn item cũ) — "chọn tất cả"
 * theo đúng nghĩa "toàn bộ dữ liệu ĐANG HIỂN THỊ", không phải toàn bộ kết
 * quả lọc qua nhiều trang.
 */
export function useRowSelection(visibleIds: string[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const visibleSet = useMemo(() => new Set(visibleIds), [visibleIds]);

  // Lọc bớt id không còn hiển thị NGAY TRONG RENDER (cùng pattern
  // `RoleDetailPage` — điều chỉnh state theo prop mới, không dùng effect).
  const pruned = useMemo(() => new Set([...selectedIds].filter((id) => visibleSet.has(id))), [selectedIds, visibleSet]);
  if (pruned.size !== selectedIds.size) {
    setSelectedIds(pruned);
  }

  function toggleRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll(checked: boolean) {
    setSelectedIds(checked ? new Set(visibleIds) : new Set());
  }

  function clear() {
    setSelectedIds(new Set());
  }

  return { selectedIds: pruned, toggleRow, toggleAll, clear };
}

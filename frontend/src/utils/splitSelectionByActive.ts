/**
 * [FE-35] Tách các dòng đang chọn thành "đang hoạt động" / "đã ẩn" để thanh
 * chọn nhiều (`BatchActionBar`) chỉ hiện hành động áp dụng được: Xoá cho dòng
 * đang hoạt động, Khôi phục cho dòng đã ẩn — và mỗi hành động chỉ gửi đúng
 * nhóm id của nó (chọn lẫn ở bộ lọc "Tất cả" không gửi id sai loại lên API).
 */
export function splitSelectionByActive<T extends { _id: string }>(
  rows: T[],
  selectedIds: Set<string>,
  isActive: (row: T) => boolean,
): { activeIds: string[]; inactiveIds: string[] } {
  const activeIds: string[] = [];
  const inactiveIds: string[] = [];
  for (const row of rows) {
    if (!selectedIds.has(row._id)) continue;
    (isActive(row) ? activeIds : inactiveIds).push(row._id);
  }
  return { activeIds, inactiveIds };
}

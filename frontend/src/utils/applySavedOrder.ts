/**
 * [FE-36] Sắp xếp danh sách key theo thứ tự user đã lưu (kéo thả).
 * - Key có trong `savedOrder` đứng trước, đúng thứ tự đã lưu.
 * - Key chưa có trong `savedOrder` (VD nhóm quyền mới thêm sau khi user đã
 *   sắp xếp) nối vào cuối, giữ nguyên thứ tự gốc của `keys`.
 * - Key đã lưu nhưng không còn tồn tại bị bỏ qua.
 */
export function applySavedOrder(keys: string[], savedOrder: string[]): string[] {
  const existing = new Set(keys);
  const ordered = savedOrder.filter((k) => existing.has(k));
  const placed = new Set(ordered);
  return [...ordered, ...keys.filter((k) => !placed.has(k))];
}

/** Trả mảng mới với phần tử `from` được chuyển tới vị trí `to` (không đổi mảng gốc). */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

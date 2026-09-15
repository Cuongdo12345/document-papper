/**
 * Format permission string kỹ thuật thành dạng dễ đọc hơn cho `PermissionBadge`
 * — CHỈ format chữ hoa/underscore, KHÔNG dịch nghĩa/bịa mô tả tiếng Việt.
 * Backend hiện KHÔNG có bảng mô tả (`description`) cho từng permission
 * (SHARED_COMPONENTS_LIBRARY.md) — tự bịa nghĩa cho ~75 permission là suy
 * diễn business copy không có evidence (CLAUDE.md Mục 19).
 *
 * "USER_CREATE" -> "User create", "DOCUMENT_EXCEL_EXPORT" -> "Document excel export".
 */
export function humanizePermission(permissionName: string): string {
  const words = permissionName.split("_").filter(Boolean);
  if (words.length === 0) return permissionName;
  return words
    .map((word, i) => (i === 0 ? word.charAt(0) + word.slice(1).toLowerCase() : word.toLowerCase()))
    .join(" ");
}

/**
 * [SỬA 2026-09-16] Comment gốc claim "Backend hiện KHÔNG có bảng mô tả
 * (`description`) cho từng permission" — SAI/LỖI THỜI: `Permission.description`
 * tồn tại và đã có dữ liệu tiếng Việt thật cho hầu hết permission (xem
 * `backend/scripts/seed-rbac.ts` PERMISSION_DESCRIPTIONS, ~100+ entry).
 * `RolePermissionMatrix` nay ưu tiên dùng `description` thật — hàm này CHỈ
 * còn dùng làm FALLBACK khi permission hiếm gặp chưa có description (VD tạo
 * tay qua form "Tạo permission" chưa điền mô tả), và cho `PermissionBadge`
 * (hiện chưa được page nào dùng thật, nhận `permissionName: string` đơn
 * thuần nên không có `description` để tham chiếu).
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

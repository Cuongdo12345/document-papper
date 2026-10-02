import type { UserListItem } from "@/types/user.types";

const byName = (a: UserListItem, b: UserListItem) => a.fullName.localeCompare(b.fullName, "vi");

/**
 * [FE-38] Chia user thành 2 nhóm cho ô "Gán cho người dùng" khi cấp phát/luân chuyển
 * tài sản: người THUỘC khoa/phòng đang chọn (ưu tiên, lên đầu) và người ở khoa khác.
 * Mỗi nhóm sắp theo họ tên (tiếng Việt). `departmentId` rỗng → tất cả vào `others`.
 */
export function groupUsersByDepartment(users: UserListItem[], departmentId: string | undefined) {
  const inDepartment: UserListItem[] = [];
  const others: UserListItem[] = [];
  for (const u of users) {
    if (departmentId && u.department?._id === departmentId) inDepartment.push(u);
    else others.push(u);
  }
  return { inDepartment: inDepartment.sort(byName), others: others.sort(byName) };
}

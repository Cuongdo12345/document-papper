import { User } from "../../models/users/user.model"
import ApiError from "../../shared/errors/ApiError";

/**
 * ⚠️ SỬA (review RBAC module):
 *  1. `throw new Error("User not found")` → `ApiError.notFound(...)` — đồng
 *     bộ convention lỗi toàn hệ thống (Error thuần không được global error
 *     handler chuẩn hoá đúng status code, lặp lại đúng pattern T2 đã ghi
 *     nhận ở Workflow module).
 *  2. Guard `role` null — nếu `user.role` trỏ tới 1 Role ĐÃ BỊ XOÁ,
 *     `populate("role")` trả về `null` cho field này (dangling ref), truy
 *     cập `role.permissions` sẽ ném `TypeError: Cannot read properties of
 *     null`. Đây là bug thật đã xác nhận: `deleteRoleService` (rbac.service.ts)
 *     trước khi có bản vá này KHÔNG kiểm tra còn user nào đang dùng role hay
 *     không trước khi xoá — 1 role bị xoá nhầm sẽ làm MỌI request tiếp theo
 *     của các user thuộc role đó bị lỗi 500 ngay tại đây.
 *  3. `.filter(Boolean)` cho cả 3 mảng permission — cùng lý do: nếu 1
 *     Permission bị xoá trong khi vẫn còn nằm trong `role.permissions`/
 *     `user.extraPermissions`/`user.denyPermissions` (dangling ref trong
 *     mảng), phần tử populate ra có thể là `null` → gọi `.name` trên `null`
 *     cũng ném lỗi tương tự. `.filter(Boolean)` loại bỏ các phần tử rác này
 *     trước khi `.map`, tránh crash dù dữ liệu tham chiếu có bị "mồ côi".
 *
 * Đây là lớp phòng thủ Ở TẦNG ĐỌC — vẫn cần vá thêm Ở TẦNG GHI
 * (`deleteRoleService`/`deletePermissionService` chặn xoá khi đang được
 * dùng, xem `rbac.service.ts`) để tránh tạo ra dữ liệu rác này ngay từ đầu.
 * Giữ cả 2 lớp vì tầng ghi không đảm bảo bắt hết mọi trường hợp (vd dữ liệu
 * rác có sẵn từ trước khi có bản vá, hoặc xoá trực tiếp qua DB console).
 */
export const getUserEffectivePermissions = async (userId: string) => {
  const user = await User.findById(userId)
    .populate({
      path: "role",
      populate: { path: "permissions" },
    })
    .populate("extraPermissions")
    .populate("denyPermissions");

  if (!user) throw ApiError.notFound("User not found");

  const role = user.role as any;

  if (!role) {
    // User có role bị xoá / chưa từng gán role hợp lệ — không có permission
    // nào từ role, nhưng vẫn cho phép tiếp tục xét extraPermissions (không
    // chặn cứng thành lỗi, vì đây là dữ liệu tồn tại thật, không phải lỗi
    // input của request hiện tại — trả mảng rỗng cho phần role là hợp lý
    // hơn ném lỗi 500/400 giữa chừng 1 request không liên quan).
    console.warn(`[getUserEffectivePermissions] User ${userId} có role null/đã bị xoá.`);
  }

  const rolePermissions: string[] =
    (role?.permissions || []).filter(Boolean).map((p: any) => p.name);

  const extraPermissions: string[] =
    (user.extraPermissions || []).filter(Boolean).map((p: any) => p.name);

  const denyPermissions: string[] =
    (user.denyPermissions || []).filter(Boolean).map((p: any) => p.name);

  const finalPermissions = [
    ...new Set([...rolePermissions, ...extraPermissions]),
  ].filter((p) => !denyPermissions.includes(p));

  return finalPermissions;
};
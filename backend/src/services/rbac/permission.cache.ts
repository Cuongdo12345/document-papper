import { getUserEffectivePermissions } from "../../services/rbac/permission.service"

// const cache = new Map();
const cache = new Map<string, { permissions: string[], cachedAt: number }>();
const TTL_MS = 5 * 60 * 1000; // 5 phút

export const getCachedPermissions = async (userId: string) => {
  const entry = cache.get(userId);
  if (entry && Date.now() - entry.cachedAt < TTL_MS) {
    return entry.permissions;
  }
  const permissions = await getUserEffectivePermissions(userId);
  cache.set(userId, { permissions, cachedAt: Date.now() });
  return permissions;
};

export const clearPermissionCache = (userId: string) => {
  cache.delete(userId);
};

/**
 * ⚠️ MỚI: `clearAllPermissionCache` — trước đây chỉ có cách xoá cache theo
 * TỪNG user (`clearPermissionCache`), và chỉ được gọi khi ROLE thay đổi (qua
 * `clearPermissionCacheForRole` ở `rbac.service.ts`). Khi 1 PERMISSION bị
 * sửa/xoá (`updatePermissionService`/`deletePermissionService`), số lượng
 * Role/User bị ảnh hưởng là KHÔNG XÁC ĐỊNH TRƯỚC (permission đó có thể nằm
 * trong nhiều Role khác nhau, hoặc trong `extraPermissions`/`denyPermissions`
 * của bất kỳ User nào) — dò ngược tất cả Role/User liên quan để clear từng
 * cái tốn thêm nhiều query mà lợi ích không tương xứng so với việc xoá sạch
 * toàn bộ cache (cache chỉ là tối ưu hiệu năng, TTL gốc đã là 5 phút, xoá
 * sạch không gây mất dữ liệu, chỉ khiến vài request kế tiếp phải tính lại).
 *
 * ⚠️ Nếu chạy nhiều instance/pod (Map này là in-memory, không dùng chung),
 * lệnh clear này CHỈ có hiệu lực trên đúng 1 instance xử lý request đó — các
 * instance khác vẫn giữ cache cũ tới khi hết TTL. Cần chuyển sang Redis (hoặc
 * cơ chế pub/sub invalidate) nếu hệ thống chạy multi-instance.
 */
export const clearAllPermissionCache = () => {
  cache.clear();
};
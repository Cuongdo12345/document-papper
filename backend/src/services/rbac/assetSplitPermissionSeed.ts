// services/rbac/assetSplitPermissionSeed.ts
//
// TÁCH MODULE TÀI SẢN, Giai đoạn 3 (DEV-114): đưa 46 quyền mới vào Permission catalog của DB và
// CỘNG THÊM chúng vào đúng role (ASSET_SPLIT_ROLE_PERMISSIONS). Lý do cần: catalog trong DB là nguồn
// sự thật riêng với `permission.constant.ts` — code xong mà DB thiếu quyền thì menu/nút biến mất
// (đã xảy ra ở DEV-068 và DEV-077).
//
// An toàn chạy nhiều lần, mặc định chỉ XEM TRƯỚC (`apply: false`):
// - Permission: chỉ tạo quyền còn thiếu, không sửa quyền đã có.
// - Role: giữ nguyên MỌI quyền hiện có, chỉ thêm quyền mới còn thiếu (KHÔNG xoá, KHÔNG ghi đè —
//   khác `--sync-roles`, xem DEV-041). Gán qua `assignPermissionsToRoleService` để xoá cache quyền
//   và thông báo user của role như luồng "Phân quyền" chuẩn.

import { Types } from "mongoose";
import { Permission } from "../../models/rbac/permission.model";
import { Role } from "../../models/rbac/role.model";
import { ASSET_SPLIT_PERMISSION_META, ASSET_SPLIT_PERMISSION_NAMES, ASSET_SPLIT_ROLE_PERMISSIONS } from "../../shared/constants/assetSplitPermissions";
import { assignPermissionsToRoleService } from "./rbac.service";

export interface AssetSplitSeedRoleResult {
  role: string;
  /** Số quyền mới sẽ thêm / đã thêm cho role này. */
  added: number;
  /** Số quyền mới role đã có từ trước. */
  alreadyHad: number;
  /** Tổng quyền của role sau khi chạy (hoặc dự kiến, khi xem trước). */
  totalAfter: number;
}

export interface AssetSplitSeedReport {
  apply: boolean;
  catalogCreated: number;
  catalogAlreadyPresent: number;
  roles: AssetSplitSeedRoleResult[];
  /** Role được kế hoạch nhắc tới nhưng không có trong DB. */
  missingRoles: string[];
}

/** ADMIN nhận cả 46 quyền (dùng cho màn "Phân quyền"; runtime ADMIN vẫn bypass). */
const targetsByRole = (): Record<string, string[]> => ({
  ADMIN: [...ASSET_SPLIT_PERMISSION_NAMES],
  ...ASSET_SPLIT_ROLE_PERMISSIONS,
});

export async function seedAssetSplitPermissions(options: { apply: boolean }): Promise<AssetSplitSeedReport> {
  const { apply } = options;

  const existing = await Permission.find({ name: { $in: ASSET_SPLIT_PERMISSION_NAMES } }).select("_id name").lean();
  const idByName = new Map<string, Types.ObjectId>(existing.map((p) => [p.name, p._id as Types.ObjectId]));

  let catalogCreated = 0;
  for (const meta of ASSET_SPLIT_PERMISSION_META) {
    if (idByName.has(meta.name)) continue;
    catalogCreated++;
    if (apply) {
      const doc = await Permission.create(meta);
      idByName.set(meta.name, doc._id as Types.ObjectId);
    }
  }

  const roles: AssetSplitSeedRoleResult[] = [];
  const missingRoles: string[] = [];

  for (const [roleName, newNames] of Object.entries(targetsByRole())) {
    const role = await Role.findOne({ name: roleName });
    if (!role) {
      missingRoles.push(roleName);
      continue;
    }

    const currentIds = new Set(role.permissions.map((id) => String(id)));
    const wantedIds = newNames.map((n) => idByName.get(n)).filter((id): id is Types.ObjectId => !!id);
    const toAdd = wantedIds.filter((id) => !currentIds.has(String(id)));
    const alreadyHad = wantedIds.length - toAdd.length;
    // Khi xem trước, quyền chưa có trong catalog chưa có _id nên cũng tính là "sẽ thêm".
    const pendingCatalog = newNames.length - wantedIds.length;
    const added = toAdd.length + pendingCatalog;

    if (apply && toAdd.length > 0) {
      const merged = [...currentIds, ...toAdd.map((id) => String(id))];
      await assignPermissionsToRoleService(role._id, merged);
    }

    roles.push({ role: roleName, added, alreadyHad, totalAfter: currentIds.size + added });
  }

  return {
    apply,
    catalogCreated,
    catalogAlreadyPresent: ASSET_SPLIT_PERMISSION_META.length - catalogCreated,
    roles,
    missingRoles,
  };
}

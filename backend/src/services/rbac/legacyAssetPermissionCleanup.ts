// services/rbac/legacyAssetPermissionCleanup.ts
//
// TÁCH MODULE TÀI SẢN, Giai đoạn 8 (DEV-120): gỡ 20 quyền CŨ `ASSET_*` (15) và `ASSET_CATEGORY_*` (5) khỏi
// role, user (extraPermissions / denyPermissions) và Permission catalog của DB. Từ Giai đoạn 8 không còn route
// nào dùng chúng (đã thay bằng IT_ASSET_*, MEDICAL_ASSET_* và các *_CATEGORY_*), và hằng số đã gỡ khỏi
// `permission.constant.ts` — nên danh sách tên nằm ở đây dưới dạng chuỗi.
//
// An toàn chạy nhiều lần, mặc định chỉ XEM TRƯỚC (`apply: false`).
// KHÔNG ghi nếu có role / user sẽ MẤT quyền truy cập (giữ quyền cũ mà không có quyền mới tương ứng): ném lỗi,
// để người vận hành chạy `seed-asset-split-permissions` hoặc gán quyền trước. Gỡ quyền của role đi qua
// `assignPermissionsToRoleService` (xoá cache quyền + thông báo user của role như luồng "Phân quyền" chuẩn).

import { Types } from "mongoose";
import { Permission } from "../../models/rbac/permission.model";
import { Role } from "../../models/rbac/role.model";
import { User } from "../../models/users/user.model";
import { assignPermissionsToRoleService } from "./rbac.service";

const ASSET_ACTION_SUFFIXES = [
  "VIEW",
  "VIEW_DETAIL",
  "CREATE",
  "UPDATE",
  "DELETE",
  "DELETE_PERMANENT",
  "ASSIGN",
  "ALERTS_TRIGGER",
  "EXCEL_EXPORT",
  "EXCEL_IMPORT",
  "INVENTORY_CHECK",
  "DISPOSE",
  "MAINTENANCE_PLAN_VIEW",
  "MAINTENANCE_PLAN_CREATE",
  "MAINTENANCE_PLAN_UPDATE",
];
const CATEGORY_ACTION_SUFFIXES = ["VIEW", "CREATE", "UPDATE", "DELETE", "DELETE_PERMANENT"];

/** 20 quyền cũ → các quyền mới thay thế (một trong hai là đủ để KHÔNG mất truy cập). */
export const LEGACY_ASSET_PERMISSION_REPLACEMENTS: Record<string, string[]> = Object.fromEntries([
  ...ASSET_ACTION_SUFFIXES.map((s) => [`ASSET_${s}`, [`IT_ASSET_${s}`, `MEDICAL_ASSET_${s}`]]),
  ...CATEGORY_ACTION_SUFFIXES.map((s) => [`ASSET_CATEGORY_${s}`, [`IT_ASSET_CATEGORY_${s}`, `MEDICAL_ASSET_CATEGORY_${s}`]]),
]);

export const LEGACY_ASSET_PERMISSION_NAMES = Object.keys(LEGACY_ASSET_PERMISSION_REPLACEMENTS);

export interface LegacyCleanupHolder {
  /** Tên role, hoặc username của user (khi là extraPermissions). */
  holder: string;
  kind: "role" | "user-extra" | "user-deny";
  legacyHeld: string[];
  /** Quyền cũ mà holder giữ nhưng KHÔNG có quyền thay thế nào → sẽ mất truy cập. */
  uncovered: string[];
}

export interface LegacyCleanupReport {
  apply: boolean;
  catalogFound: number;
  holders: LegacyCleanupHolder[];
  /** Tổng số mục `uncovered` — > 0 thì `apply` bị từ chối. */
  uncoveredCount: number;
  rolesChanged: number;
  usersChanged: number;
  catalogDeleted: number;
}

export async function removeLegacyAssetPermissions(options: { apply: boolean }): Promise<LegacyCleanupReport> {
  const { apply } = options;

  const catalog = await Permission.find({ name: { $in: LEGACY_ASSET_PERMISSION_NAMES } }).select("_id name").lean();
  const legacyNameById = new Map<string, string>(catalog.map((p) => [String(p._id), p.name]));
  const legacyIds = [...legacyNameById.keys()];

  const allNewNames = [...new Set(Object.values(LEGACY_ASSET_PERMISSION_REPLACEMENTS).flat())];
  const newCatalog = await Permission.find({ name: { $in: allNewNames } }).select("_id name").lean();
  const newNameById = new Map<string, string>(newCatalog.map((p) => [String(p._id), p.name]));

  const holders: LegacyCleanupHolder[] = [];

  const analyse = (ids: Types.ObjectId[], extraIds: Types.ObjectId[] = []) => {
    const heldIds = new Set([...ids, ...extraIds].map(String));
    const legacyHeld = [...heldIds].filter((id) => legacyNameById.has(id)).map((id) => legacyNameById.get(id) as string);
    const heldNew = new Set([...heldIds].filter((id) => newNameById.has(id)).map((id) => newNameById.get(id) as string));
    const uncovered = legacyHeld.filter((name) => !LEGACY_ASSET_PERMISSION_REPLACEMENTS[name].some((n) => heldNew.has(n)));
    return { legacyHeld: legacyHeld.sort(), uncovered: uncovered.sort() };
  };

  const roles = await Role.find({ permissions: { $in: legacyIds } });
  const rolePermIds = new Map<string, Set<string>>();
  for (const role of roles) {
    const { legacyHeld, uncovered } = analyse(role.permissions as Types.ObjectId[]);
    holders.push({ holder: role.name, kind: "role", legacyHeld, uncovered });
  }
  const allRoles = await Role.find({}).select("_id permissions").lean();
  for (const r of allRoles) rolePermIds.set(String(r._id), new Set((r.permissions as Types.ObjectId[]).map(String)));

  // User: quyền cộng thêm có quyền cũ → quyền hiệu lực = quyền của role + extraPermissions.
  const usersExtra = await User.find({ extraPermissions: { $in: legacyIds } }).select("username role extraPermissions");
  for (const user of usersExtra) {
    const roleIds = [...(rolePermIds.get(String(user.role)) ?? [])].map((id) => new Types.ObjectId(id));
    const { legacyHeld, uncovered } = analyse(user.extraPermissions as Types.ObjectId[], roleIds);
    const own = legacyHeld.filter((n) => (user.extraPermissions as Types.ObjectId[]).some((id) => legacyNameById.get(String(id)) === n));
    holders.push({ holder: String((user as any).username ?? user._id), kind: "user-extra", legacyHeld: own, uncovered: uncovered.filter((n) => own.includes(n)) });
  }
  const usersDeny = await User.find({ denyPermissions: { $in: legacyIds } }).select("username denyPermissions");
  for (const user of usersDeny) {
    const own = (user.denyPermissions as Types.ObjectId[]).map(String).filter((id) => legacyNameById.has(id)).map((id) => legacyNameById.get(id) as string);
    // Gỡ quyền bị chặn không cấp thêm quyền nào → không bao giờ "mất truy cập".
    holders.push({ holder: String((user as any).username ?? user._id), kind: "user-deny", legacyHeld: own.sort(), uncovered: [] });
  }

  const uncoveredCount = holders.reduce((sum, h) => sum + h.uncovered.length, 0);
  const report: LegacyCleanupReport = {
    apply,
    catalogFound: catalog.length,
    holders,
    uncoveredCount,
    rolesChanged: roles.length,
    usersChanged: usersExtra.length + usersDeny.length,
    catalogDeleted: 0,
  };

  if (!apply) return report;
  if (uncoveredCount > 0) {
    throw new Error(
      `Từ chối ghi: ${uncoveredCount} quyền cũ không có quyền thay thế (sẽ mất truy cập) — ` +
        holders.filter((h) => h.uncovered.length > 0).map((h) => `${h.kind}:${h.holder}[${h.uncovered.join(",")}]`).join("; "),
    );
  }

  const legacyIdSet = new Set(legacyIds);
  for (const role of roles) {
    const keep = (role.permissions as Types.ObjectId[]).map(String).filter((id) => !legacyIdSet.has(id));
    await assignPermissionsToRoleService(role._id, keep);
  }
  // User: gỡ id cũ để không còn tham chiếu treo tới Permission đã xoá.
  await User.updateMany({ extraPermissions: { $in: legacyIds } }, { $pull: { extraPermissions: { $in: legacyIds } } });
  await User.updateMany({ denyPermissions: { $in: legacyIds } }, { $pull: { denyPermissions: { $in: legacyIds } } });

  const del = await Permission.deleteMany({ _id: { $in: legacyIds } });
  report.catalogDeleted = del.deletedCount ?? 0;
  return report;
}

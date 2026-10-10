/**
 * DEV-120 (tách module Tài sản, GĐ 8) — E2E trên MongoDB THẬT (in-memory):
 * `removeLegacyAssetPermissions` gỡ 20 quyền cũ ASSET_* / ASSET_CATEGORY_* khỏi role, user và catalog.
 *
 *  - xem trước không ghi gì, báo role/user nào giữ quyền cũ;
 *  - role/user giữ quyền cũ mà KHÔNG có quyền mới thay thế → báo "uncovered" và `apply` bị từ chối (không ghi gì);
 *  - đủ quyền thay thế → gỡ quyền cũ khỏi role + extraPermissions + denyPermissions, xoá khỏi catalog,
 *    KHÔNG đụng quyền khác; chạy lại không đổi.
 *
 * Dựng dữ liệu "trước GĐ 8" bằng tay vì hằng số `PERMISSIONS` không còn 20 quyền cũ.
 */
import { startE2EDatabase, stopE2EDatabase } from "./setup";
import { seedDepartments, seedRbac, seedUser } from "./seedTestData";
import { Permission } from "../../models/rbac/permission.model";
import { Role } from "../../models/rbac/role.model";
import { User } from "../../models/users/user.model";
import {
  LEGACY_ASSET_PERMISSION_NAMES,
  LEGACY_ASSET_PERMISSION_REPLACEMENTS,
  removeLegacyAssetPermissions,
} from "../../services/rbac/legacyAssetPermissionCleanup";

const PASSWORD = "Password123";

describe("E2E — Gỡ 20 quyền tài sản cũ (DEV-120)", () => {
  const permId: Record<string, any> = {};
  let roleIds: Record<string, string>;
  let deptA: string;
  let legacyOnlyRole: any;
  let coveredRole: any;
  let extraUser: any;
  let denyUser: any;

  const names = async (ids: any[]) => (await Permission.find({ _id: { $in: ids } }).select("name").lean()).map((p) => p.name).sort();

  beforeAll(async () => {
    await startE2EDatabase();
    roleIds = await seedRbac();
    ({ deptA } = await seedDepartments());

    // Catalog "trước GĐ 8": thêm đủ 20 quyền cũ (seedRbac chỉ tạo quyền còn trong PERMISSIONS).
    for (const name of LEGACY_ASSET_PERMISSION_NAMES) {
      const doc = await Permission.create({ name, resource: "ASSET", action: name.replace(/^ASSET_/, ""), description: name });
      permId[name] = doc._id;
    }
    const newPerm = async (name: string) => (await Permission.findOne({ name }).select("_id").lean())!._id;
    const docView = await newPerm("DOCUMENT_VIEW");

    // Role đã có quyền thay thế: giữ cũ + mới + quyền khác.
    coveredRole = await Role.create({
      name: "COVERED",
      permissions: [permId.ASSET_VIEW, permId.ASSET_CATEGORY_VIEW, await newPerm("IT_ASSET_VIEW"), await newPerm("MEDICAL_ASSET_CATEGORY_VIEW"), docView],
    });
    // Role chỉ có quyền cũ (chưa seed quyền mới): sẽ mất truy cập.
    legacyOnlyRole = await Role.create({ name: "LEGACY_ONLY", permissions: [permId.ASSET_VIEW, permId.ASSET_UPDATE, docView] });

    extraUser = await seedUser({ username: "extra_user", password: PASSWORD, fullName: "Extra", roleId: roleIds.USER, departmentId: deptA });
    await User.updateOne({ _id: extraUser._id }, { $set: { extraPermissions: [permId.ASSET_DELETE, docView] } });
    denyUser = await seedUser({ username: "deny_user", password: PASSWORD, fullName: "Deny", roleId: roleIds.USER, departmentId: deptA });
    await User.updateOne({ _id: denyUser._id }, { $set: { denyPermissions: [permId.ASSET_ASSIGN] } });
  }, 60_000);

  afterAll(async () => {
    await stopE2EDatabase();
  });

  it("bảng thay thế đủ 20 quyền, mỗi quyền cũ có đúng 2 quyền mới (IT_ và MEDICAL_)", () => {
    expect(LEGACY_ASSET_PERMISSION_NAMES).toHaveLength(20);
    for (const [legacy, replacements] of Object.entries(LEGACY_ASSET_PERMISSION_REPLACEMENTS)) {
      expect(replacements).toHaveLength(2);
      expect(replacements[0]).toBe(legacy.replace(/^ASSET_/, "IT_ASSET_"));
      expect(replacements[1]).toBe(legacy.replace(/^ASSET_/, "MEDICAL_ASSET_"));
    }
  });

  it("xem trước: báo đúng người giữ quyền cũ và quyền sẽ mất truy cập, KHÔNG ghi gì", async () => {
    const report = await removeLegacyAssetPermissions({ apply: false });
    expect(report.catalogFound).toBe(20);
    const by = (kind: string, holder: string) => report.holders.find((h) => h.kind === kind && h.holder === holder);

    expect(by("role", "COVERED")?.legacyHeld).toEqual(["ASSET_CATEGORY_VIEW", "ASSET_VIEW"]);
    expect(by("role", "COVERED")?.uncovered).toEqual([]);
    expect(by("role", "LEGACY_ONLY")?.uncovered).toEqual(["ASSET_UPDATE", "ASSET_VIEW"]);
    // User có quyền cộng thêm ASSET_DELETE nhưng role USER chỉ có quyền xem mới -> mất truy cập xoá.
    expect(by("user-extra", "extra_user")?.uncovered).toEqual(["ASSET_DELETE"]);
    expect(by("user-deny", "deny_user")?.uncovered).toEqual([]);
    expect(report.uncoveredCount).toBeGreaterThan(0);

    expect(await Permission.countDocuments({ name: { $in: LEGACY_ASSET_PERMISSION_NAMES } })).toBe(20);
    expect((await Role.findById(legacyOnlyRole._id))!.permissions).toHaveLength(3);
  });

  it("apply bị TỪ CHỐI khi còn quyền không có thay thế — không ghi gì", async () => {
    await expect(removeLegacyAssetPermissions({ apply: true })).rejects.toThrow(/Từ chối ghi/);
    expect(await Permission.countDocuments({ name: { $in: LEGACY_ASSET_PERMISSION_NAMES } })).toBe(20);
    expect((await Role.findById(legacyOnlyRole._id))!.permissions).toHaveLength(3);
    expect((await Role.findById(coveredRole._id))!.permissions).toHaveLength(5);
    expect((await User.findById(extraUser._id))!.extraPermissions).toHaveLength(2);
  });

  it("sau khi cấp quyền thay thế: apply gỡ quyền cũ khỏi role/user/catalog, giữ nguyên quyền khác; chạy lại không đổi", async () => {
    const id = async (name: string) => (await Permission.findOne({ name }).select("_id").lean())!._id;
    // Cấp quyền thay thế còn thiếu.
    await Role.updateOne({ _id: legacyOnlyRole._id }, { $push: { permissions: { $each: [await id("IT_ASSET_VIEW"), await id("MEDICAL_ASSET_UPDATE")] } } });
    await User.updateOne({ _id: extraUser._id }, { $push: { extraPermissions: await id("IT_ASSET_DELETE") } });

    const preview = await removeLegacyAssetPermissions({ apply: false });
    expect(preview.uncoveredCount).toBe(0);

    const report = await removeLegacyAssetPermissions({ apply: true });
    expect(report.catalogDeleted).toBe(20);

    expect(await Permission.countDocuments({ name: { $in: LEGACY_ASSET_PERMISSION_NAMES } })).toBe(0);
    expect(await Permission.countDocuments({ name: /^ASSET_/ })).toBe(0);

    expect(await names((await Role.findById(coveredRole._id))!.permissions)).toEqual(["DOCUMENT_VIEW", "IT_ASSET_VIEW", "MEDICAL_ASSET_CATEGORY_VIEW"]);
    expect(await names((await Role.findById(legacyOnlyRole._id))!.permissions)).toEqual(["DOCUMENT_VIEW", "IT_ASSET_VIEW", "MEDICAL_ASSET_UPDATE"]);
    expect(await names((await User.findById(extraUser._id))!.extraPermissions)).toEqual(["DOCUMENT_VIEW", "IT_ASSET_DELETE"]);
    // `names()` bỏ qua id đã xoá khỏi catalog -> đếm id thô để bắt tham chiếu treo.
    expect((await User.findById(extraUser._id))!.extraPermissions).toHaveLength(2);
    expect((await Role.findById(coveredRole._id))!.permissions).toHaveLength(3);
    expect((await Role.findById(legacyOnlyRole._id))!.permissions).toHaveLength(3);
    expect((await User.findById(denyUser._id))!.denyPermissions).toHaveLength(0);

    // Quyền theo loại của các role chuẩn không bị đụng.
    expect(await names((await Role.findById(roleIds.IT))!.permissions)).toEqual(expect.arrayContaining(["IT_ASSET_VIEW", "SOFTWARE_LICENSE_VIEW"]));

    const again = await removeLegacyAssetPermissions({ apply: true });
    expect(again.catalogFound).toBe(0);
    expect(again.holders).toHaveLength(0);
    expect(again.catalogDeleted).toBe(0);
  });
});

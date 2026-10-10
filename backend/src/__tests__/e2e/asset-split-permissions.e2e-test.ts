/**
 * DEV-114 (tách module Tài sản, GĐ 3) — E2E trên MongoDB THẬT (in-memory):
 * 46 quyền mới (IT_ASSET_*, IT_ASSET_CATEGORY_*, MEDICAL_ASSET_*, MEDICAL_ASSET_CATEGORY_*, SOFTWARE_LICENSE_*).
 *
 * 1. Mô phỏng DB TRƯỚC giai đoạn 3 (có role, thiếu 46 quyền) rồi chạy `seedAssetSplitPermissions`:
 *    xem trước không ghi; apply tạo đủ catalog, CỘNG THÊM đúng role, không mất quyền cũ; chạy lại không đổi.
 * 2. Qua middleware THẬT (`authenticate` + `authorizePermission`) với token đăng nhập thật: mỗi quyền × mỗi role
 *    → 401 không token, 403 thiếu quyền, 200 đủ quyền. Bảng kỳ vọng dưới đây viết TAY từ mục 4.4 của kế hoạch
 *    (không sinh từ chính `ASSET_SPLIT_ROLE_PERMISSIONS`) để bắt lỗi ánh xạ.
 *
 * Chưa có route nghiệp vụ nào dùng quyền mới (Giai đoạn 4) nên route thăm dò là app express riêng của test.
 */
import express from "express";
import request from "supertest";
import mongoose from "mongoose";
import { startE2EDatabase, stopE2EDatabase } from "./setup";
import { seedRbac, seedUser } from "./seedTestData";
import { Permission } from "../../models/rbac/permission.model";
import { Role } from "../../models/rbac/role.model";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorizePermission } from "../../middlewares/authorizePermission.middleware";
import { seedAssetSplitPermissions } from "../../services/rbac/assetSplitPermissionSeed";
import { ASSET_SPLIT_PERMISSION_NAMES } from "../../shared/constants/assetSplitPermissions";

const PASSWORD = "Password123";

const ASSET_ACTIONS = [
  "VIEW", "VIEW_DETAIL", "CREATE", "UPDATE", "DELETE", "DELETE_PERMANENT", "ASSIGN", "DISPOSE", "ALERTS_TRIGGER",
  "EXCEL_EXPORT", "EXCEL_IMPORT", "INVENTORY_CHECK", "MAINTENANCE_PLAN_VIEW", "MAINTENANCE_PLAN_CREATE", "MAINTENANCE_PLAN_UPDATE",
];
const CATEGORY_ACTIONS = ["VIEW", "CREATE", "UPDATE", "DELETE", "DELETE_PERMANENT"];
const LICENSE_ACTIONS = ["VIEW", "CREATE", "UPDATE", "DELETE", "ASSIGN", "ALERTS_TRIGGER"];

const ALL_46 = [
  ...ASSET_ACTIONS.map((a) => `IT_ASSET_${a}`),
  ...CATEGORY_ACTIONS.map((a) => `IT_ASSET_CATEGORY_${a}`),
  ...ASSET_ACTIONS.map((a) => `MEDICAL_ASSET_${a}`),
  ...CATEGORY_ACTIONS.map((a) => `MEDICAL_ASSET_CATEGORY_${a}`),
  ...LICENSE_ACTIONS.map((a) => `SOFTWARE_LICENSE_${a}`),
];

const noPermanent = (list: string[], prefix: string) => list.filter((a) => a !== "DELETE_PERMANENT").map((a) => `${prefix}_${a}`);

/** Kỳ vọng viết tay theo mục 4.4 + 2 quyết định của user (IT cấp đủ; IT được DISPOSE). */
const EXPECTED: Record<string, string[]> = {
  ADMIN: ALL_46,
  IT: [
    ...noPermanent(ASSET_ACTIONS, "IT_ASSET"),
    ...noPermanent(CATEGORY_ACTIONS, "IT_ASSET_CATEGORY"),
    ...LICENSE_ACTIONS.map((a) => `SOFTWARE_LICENSE_${a}`),
    "MEDICAL_ASSET_VIEW", "MEDICAL_ASSET_VIEW_DETAIL", "MEDICAL_ASSET_CATEGORY_VIEW",
  ],
  PHONG_VAT_TU_TTB: [
    ...noPermanent(ASSET_ACTIONS, "MEDICAL_ASSET"),
    ...noPermanent(CATEGORY_ACTIONS, "MEDICAL_ASSET_CATEGORY"),
    "IT_ASSET_VIEW", "IT_ASSET_VIEW_DETAIL", "IT_ASSET_CATEGORY_VIEW",
  ],
  USER: [
    "IT_ASSET_VIEW", "IT_ASSET_VIEW_DETAIL", "IT_ASSET_INVENTORY_CHECK", "IT_ASSET_CATEGORY_VIEW",
    "MEDICAL_ASSET_VIEW", "MEDICAL_ASSET_VIEW_DETAIL", "MEDICAL_ASSET_INVENTORY_CHECK", "MEDICAL_ASSET_CATEGORY_VIEW",
  ],
  TRUONG_KHOA: ["IT_ASSET_VIEW", "IT_ASSET_VIEW_DETAIL", "MEDICAL_ASSET_VIEW", "MEDICAL_ASSET_VIEW_DETAIL"],
  DIEU_DUONG_TRUONG: ["IT_ASSET_VIEW", "IT_ASSET_VIEW_DETAIL", "MEDICAL_ASSET_VIEW", "MEDICAL_ASSET_VIEW_DETAIL"],
  BAN_GIAM_DOC: ["IT_ASSET_VIEW", "IT_ASSET_VIEW_DETAIL", "MEDICAL_ASSET_VIEW", "MEDICAL_ASSET_VIEW_DETAIL"],
};

describe("E2E — 46 quyền tách module Tài sản (DEV-114)", () => {
  let app: import("express").Express;
  const probe = express();
  const tokens: Record<string, string> = {};
  const rolePermNames = async (roleName: string): Promise<string[]> => {
    const role = await Role.findOne({ name: roleName }).populate<{ permissions: { name: string }[] }>("permissions", "name");
    return role!.permissions.map((p) => p.name);
  };
  const beforeNames: Record<string, string[]> = {};

  beforeAll(async () => {
    await startE2EDatabase();
    app = (await import("../../app")).default;
    const roleIds = await seedRbac();

    // Mô phỏng DB trước giai đoạn 3: bỏ 46 quyền khỏi catalog và khỏi mọi role.
    const docs = await Permission.find({ name: { $in: ALL_46 } }).select("_id");
    const ids = docs.map((d) => d._id);
    await Role.updateMany({}, { $pull: { permissions: { $in: ids } } });
    await Permission.deleteMany({ _id: { $in: ids } });
    for (const roleName of Object.keys(EXPECTED)) beforeNames[roleName] = await rolePermNames(roleName);

    for (const roleName of Object.keys(EXPECTED)) {
      await seedUser({ username: `p_${roleName.toLowerCase()}`, password: PASSWORD, fullName: roleName, roleId: roleIds[roleName] });
    }

    // Route thăm dò: dùng middleware THẬT, quyền lấy từ tham số URL.
    probe.get("/probe/:perm", authenticate, (req, res, next) => authorizePermission(req.params.perm as any)(req, res, next), (_req, res) => {
      res.status(200).json({ ok: true });
    });
  }, 90_000);

  afterAll(async () => {
    await stopE2EDatabase();
  });

  it("danh sách kỳ vọng viết tay đủ 46 quyền, khớp danh sách trong code", () => {
    expect(new Set(ALL_46).size).toBe(46);
    expect([...ASSET_SPLIT_PERMISSION_NAMES].sort()).toEqual([...ALL_46].sort());
  });

  it("DB giả lập trước giai đoạn 3 đúng là thiếu cả 46 quyền", async () => {
    expect(await Permission.countDocuments({ name: { $in: ALL_46 } })).toBe(0);
    for (const roleName of Object.keys(EXPECTED)) {
      expect(beforeNames[roleName].filter((n) => ALL_46.includes(n))).toEqual([]);
    }
  });

  it("xem trước (apply=false) không ghi gì nhưng báo đúng số lượng", async () => {
    const report = await seedAssetSplitPermissions({ apply: false });
    expect(report.apply).toBe(false);
    expect(report.catalogCreated).toBe(46);
    expect(report.missingRoles).toEqual([]);
    expect(await Permission.countDocuments({ name: { $in: ALL_46 } })).toBe(0);
    for (const r of report.roles) {
      expect(r.added).toBe(EXPECTED[r.role].length);
      expect((await rolePermNames(r.role)).length).toBe(beforeNames[r.role].length);
    }
  });

  it("apply: tạo đủ 46 quyền với resource/action/mô tả, cộng đúng quyền cho từng role, không mất quyền cũ", async () => {
    const report = await seedAssetSplitPermissions({ apply: true });
    expect(report.catalogCreated).toBe(46);
    expect(report.catalogAlreadyPresent).toBe(0);

    const created = await Permission.find({ name: { $in: ALL_46 } }).lean();
    expect(created).toHaveLength(46);
    for (const p of created) {
      expect(p.description && p.description.length).toBeGreaterThan(5);
      expect(`${p.resource}_${p.action}`).toBe(p.name);
    }
    expect(created.find((p) => p.name === "IT_ASSET_CATEGORY_VIEW")).toMatchObject({ resource: "IT_ASSET", action: "CATEGORY_VIEW" });
    expect(created.find((p) => p.name === "SOFTWARE_LICENSE_ASSIGN")).toMatchObject({ resource: "SOFTWARE_LICENSE", action: "ASSIGN" });

    for (const [roleName, expected] of Object.entries(EXPECTED)) {
      const after = await rolePermNames(roleName);
      expect(after.filter((n) => ALL_46.includes(n)).sort()).toEqual([...expected].sort());
      // Không mất quyền cũ (so sánh theo tên, trừ 46 quyền mới).
      // seedRbac có thể ghi trùng 1 quyền trong role (ADMIN: SYSTEM_ADMIN) nên so theo tập.
      expect([...new Set(after.filter((n) => !ALL_46.includes(n)))].sort()).toEqual([...new Set(beforeNames[roleName])].sort());
    }
  });

  it("chạy lại apply: không tạo thêm, không đổi role (idempotent)", async () => {
    const snapshot: Record<string, string[]> = {};
    for (const roleName of Object.keys(EXPECTED)) snapshot[roleName] = (await rolePermNames(roleName)).sort();

    const report = await seedAssetSplitPermissions({ apply: true });
    expect(report.catalogCreated).toBe(0);
    expect(report.catalogAlreadyPresent).toBe(46);
    for (const r of report.roles) expect(r.added).toBe(0);
    expect(await Permission.countDocuments({ name: { $in: ALL_46 } })).toBe(46);
    for (const roleName of Object.keys(EXPECTED)) expect((await rolePermNames(roleName)).sort()).toEqual(snapshot[roleName]);
  });

  it("chốt an toàn: chỉ ADMIN có các quyền xoá vĩnh viễn; không role nào khác có quyền ngoài bảng", async () => {
    const permanent = ALL_46.filter((n) => n.endsWith("DELETE_PERMANENT"));
    expect(permanent).toHaveLength(4);
    for (const roleName of Object.keys(EXPECTED)) {
      const names = (await rolePermNames(roleName)).filter((n) => permanent.includes(n));
      expect(names.length).toBe(roleName === "ADMIN" ? 4 : 0);
    }
  });

  it("không token → 401 trên mọi quyền mới", async () => {
    for (const perm of ALL_46) {
      const res = await request(probe).get(`/probe/${perm}`);
      expect(res.status).toBe(401);
    }
  });

  it("qua middleware thật: mỗi quyền × mỗi role → 200 nếu được cấp, 403 nếu không", async () => {
    for (const roleName of Object.keys(EXPECTED)) {
      const login = await request(app).post("/api/auths/login").send({ username: `p_${roleName.toLowerCase()}`, password: PASSWORD });
      expect(login.status).toBe(200);
      tokens[roleName] = login.body.data.accessToken;
    }

    const failures: string[] = [];
    for (const [roleName, expected] of Object.entries(EXPECTED)) {
      for (const perm of ALL_46) {
        const res = await request(probe).get(`/probe/${perm}`).set("Authorization", `Bearer ${tokens[roleName]}`);
        const want = expected.includes(perm) ? 200 : 403;
        if (res.status !== want) failures.push(`${roleName} ${perm}: ${res.status} (cần ${want})`);
      }
    }
    expect(failures).toEqual([]);
  }, 120_000);

  it("ranh giới Q-F: IT chỉ xem thiết bị y tế, Vật tư-TTB chỉ xem thiết bị CNTT", async () => {
    const get = (role: string, perm: string) => request(probe).get(`/probe/${perm}`).set("Authorization", `Bearer ${tokens[role]}`);
    expect((await get("IT", "IT_ASSET_CREATE")).status).toBe(200);
    expect((await get("IT", "IT_ASSET_DISPOSE")).status).toBe(200);
    expect((await get("IT", "MEDICAL_ASSET_VIEW")).status).toBe(200);
    expect((await get("IT", "MEDICAL_ASSET_UPDATE")).status).toBe(403);
    expect((await get("PHONG_VAT_TU_TTB", "MEDICAL_ASSET_DISPOSE")).status).toBe(200);
    expect((await get("PHONG_VAT_TU_TTB", "IT_ASSET_VIEW")).status).toBe(200);
    expect((await get("PHONG_VAT_TU_TTB", "IT_ASSET_UPDATE")).status).toBe(403);
    expect((await get("PHONG_VAT_TU_TTB", "SOFTWARE_LICENSE_VIEW")).status).toBe(403);
    expect((await get("USER", "IT_ASSET_CREATE")).status).toBe(403);
  });

  it("role không có trong DB bị bỏ qua và báo lại, không lỗi", async () => {
    await Role.deleteOne({ name: "BAN_GIAM_DOC" });
    const report = await seedAssetSplitPermissions({ apply: false });
    expect(report.missingRoles).toEqual(["BAN_GIAM_DOC"]);
    expect(mongoose.connection.readyState).toBe(1);
  });
});

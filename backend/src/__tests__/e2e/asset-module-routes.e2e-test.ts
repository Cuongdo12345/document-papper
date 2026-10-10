/**
 * DEV-115 (tách module Tài sản, GĐ 4) — E2E qua HTTP THẬT (supertest + MongoDB in-memory) cho 2 module
 * `/api/it-assets` và `/api/medical-assets` (docs/development/ASSET_MODULE_SPLIT_PLAN.md mục 4.3, 9).
 *
 * CLAUDE.md §18/§32: mọi route MỚI phải bị chặn đúng 401/403. Với MỖI route × MỖI module:
 *   - không token → 401;
 *   - user không có quyền tài sản nào → 403;
 *   - user chỉ có đúng quyền của route (viết tay trong bảng, không sinh từ code) → KHÔNG bị 401/403;
 *   - user có đủ quyền của module KIA → 403 (quyền 2 module không dùng thay nhau);
 *   - route có id: id thuộc loại khác → 404 đúng thông điệp của chốt cô lập (admin cũng bị 404).
 * Thêm: duyệt toàn bộ router để chắc chắn mọi route có tham số id đều có chốt cô lập; luồng chức năng
 * (danh mục theo nhánh, tạo/lọc/xuất Excel/nhập Excel/cảnh báo/lịch bảo trì/hồ sơ y tế/chứng chỉ);
 * route cũ `/api/assets*` đã gỡ ở GĐ 8 (404) và 20 quyền cũ không còn trong catalog; xem chéo Q-F.
 */
import path from "path";
import YAML from "yamljs";
import request from "supertest";
import ExcelJS from "exceljs";
import mongoose, { Types } from "mongoose";
import { startE2EDatabase, stopE2EDatabase } from "./setup";
import { seedDepartments, seedRbac, seedUser } from "./seedTestData";
import { Permission } from "../../models/rbac/permission.model";
import { Role } from "../../models/rbac/role.model";
import { User } from "../../models/users/user.model";
import { Asset, AssetStatus } from "../../models/assets/asset.model";
import { OperatorCertificate } from "../../models/medicalDevices/operatorCertificate.model";
import { generateAccessToken } from "../../shared/helpers/auth.helper";
import { buildAssetModuleRouter, IT_ASSET_MODULE, MEDICAL_ASSET_MODULE } from "../../routes/assets/assetModule.routes";
import { SCOPE_GUARD_MARK } from "../../middlewares/assetScope.middleware";
import { ASSET_IMPORT_COLUMNS } from "../../shared/constants/excel.constants";
import { ASSET_SPLIT_PERMISSION_NAMES } from "../../shared/constants/assetSplitPermissions";

const PASSWORD = "Password123";

interface Fixture {
  rootId: string;
  leafId: string;
  leafCode: string;
  assetId: string;
  assetCode: string;
  planId: string;
  certId: string;
}

const MSG = {
  asset: "Không tìm thấy tài sản",
  category: "Không tìm thấy danh mục tài sản",
  plan: "Không tìm thấy kế hoạch bảo trì",
  cert: "Không tìm thấy chứng chỉ vận hành",
};
type Kind = keyof typeof MSG | "none";

interface Ctx {
  base: string;
  foreign: Fixture;
  dept: string;
}
interface RouteCase {
  name: string;
  method: "get" | "post" | "put" | "patch" | "delete";
  path: (c: Ctx) => string;
  /** Hậu tố quyền theo tiền tố của module (VD "VIEW_DETAIL" -> IT_ASSET_VIEW_DETAIL) hoặc quyền tuyệt đối (có chữ hoa đầy đủ, chứa "DEVICE"/"CERTIFICATE"/"DOCUMENT"). */
  perm: string | ((prefix: string) => string);
  kind: Kind;
  body?: (c: Ctx) => unknown;
  medicalOnly?: boolean;
  itOnly?: boolean;
}

const P = (suffix: string) => (prefix: string) => `${prefix}_${suffix}`;
const FAKE = "507f1f77bcf86cd799439099";

const ROUTES: RouteCase[] = [
  // ---- không có id
  { name: "GET /", method: "get", path: (c) => c.base, perm: P("VIEW"), kind: "none" },
  { name: "POST /", method: "post", path: (c) => c.base, perm: P("CREATE"), kind: "none", body: () => ({}) },
  { name: "POST /bulk-delete", method: "post", path: (c) => `${c.base}/bulk-delete`, perm: P("DELETE"), kind: "none", body: (c) => ({ ids: [c.foreign.assetId] }) },
  { name: "POST /bulk-restore", method: "post", path: (c) => `${c.base}/bulk-restore`, perm: P("UPDATE"), kind: "none", body: (c) => ({ ids: [c.foreign.assetId] }) },
  { name: "GET /export", method: "get", path: (c) => `${c.base}/export`, perm: P("EXCEL_EXPORT"), kind: "none" },
  { name: "GET /import/template", method: "get", path: (c) => `${c.base}/import/template`, perm: P("EXCEL_IMPORT"), kind: "none" },
  { name: "POST /import", method: "post", path: (c) => `${c.base}/import`, perm: P("EXCEL_IMPORT"), kind: "none" },
  { name: "POST /alerts/run", method: "post", path: (c) => `${c.base}/alerts/run`, perm: P("ALERTS_TRIGGER"), kind: "none" },
  { name: "GET /lookup/:code", method: "get", path: (c) => `${c.base}/lookup/${c.foreign.assetCode}`, perm: P("INVENTORY_CHECK"), kind: "none" },
  { name: "GET /categories", method: "get", path: (c) => `${c.base}/categories`, perm: P("CATEGORY_VIEW"), kind: "none" },
  { name: "POST /categories", method: "post", path: (c) => `${c.base}/categories`, perm: P("CATEGORY_CREATE"), kind: "none", body: () => ({}) },
  { name: "POST /categories/bulk-delete", method: "post", path: (c) => `${c.base}/categories/bulk-delete`, perm: P("CATEGORY_DELETE"), kind: "none", body: (c) => ({ ids: [c.foreign.leafId] }) },
  { name: "POST /categories/bulk-restore", method: "post", path: (c) => `${c.base}/categories/bulk-restore`, perm: P("CATEGORY_UPDATE"), kind: "none", body: (c) => ({ ids: [c.foreign.leafId] }) },
  { name: "GET /maintenance-plans/calendar", method: "get", path: (c) => `${c.base}/maintenance-plans/calendar?month=1&year=2026`, perm: P("MAINTENANCE_PLAN_VIEW"), kind: "none" },
  // ---- tài sản theo id
  { name: "GET /:id", method: "get", path: (c) => `${c.base}/${c.foreign.assetId}`, perm: P("VIEW_DETAIL"), kind: "asset" },
  { name: "PUT /:id", method: "put", path: (c) => `${c.base}/${c.foreign.assetId}`, perm: P("UPDATE"), kind: "asset", body: () => ({ name: "x" }) },
  { name: "DELETE /:id", method: "delete", path: (c) => `${c.base}/${c.foreign.assetId}`, perm: P("DELETE"), kind: "asset" },
  { name: "DELETE /:id/permanent", method: "delete", path: (c) => `${c.base}/${c.foreign.assetId}/permanent`, perm: P("DELETE_PERMANENT"), kind: "asset" },
  { name: "PATCH /:id/restore", method: "patch", path: (c) => `${c.base}/${c.foreign.assetId}/restore`, perm: P("UPDATE"), kind: "asset" },
  { name: "POST /:id/assign", method: "post", path: (c) => `${c.base}/${c.foreign.assetId}/assign`, perm: P("ASSIGN"), kind: "asset", body: (c) => ({ toDepartment: c.dept }) },
  { name: "POST /:id/transfer", method: "post", path: (c) => `${c.base}/${c.foreign.assetId}/transfer`, perm: P("ASSIGN"), kind: "asset", body: (c) => ({ toDepartment: c.dept }) },
  { name: "POST /:id/return", method: "post", path: (c) => `${c.base}/${c.foreign.assetId}/return`, perm: P("ASSIGN"), kind: "asset", body: () => ({}) },
  { name: "GET /:id/assignment-history", method: "get", path: (c) => `${c.base}/${c.foreign.assetId}/assignment-history`, perm: P("VIEW_DETAIL"), kind: "asset" },
  { name: "GET /:id/qrcode", method: "get", path: (c) => `${c.base}/${c.foreign.assetId}/qrcode`, perm: P("VIEW_DETAIL"), kind: "asset" },
  { name: "POST /:id/check-in", method: "post", path: (c) => `${c.base}/${c.foreign.assetId}/check-in`, perm: P("INVENTORY_CHECK"), kind: "asset" },
  { name: "GET /:id/documents", method: "get", path: (c) => `${c.base}/${c.foreign.assetId}/documents`, perm: "DOCUMENT_VIEW", kind: "asset" },
  { name: "POST /maintenance-plans/asset/:assetId", method: "post", path: (c) => `${c.base}/maintenance-plans/asset/${c.foreign.assetId}`, perm: P("MAINTENANCE_PLAN_CREATE"), kind: "asset", body: () => ({ title: "t", scheduledDate: "2026-01-15" }) },
  { name: "GET /maintenance-plans/asset/:assetId", method: "get", path: (c) => `${c.base}/maintenance-plans/asset/${c.foreign.assetId}`, perm: P("MAINTENANCE_PLAN_VIEW"), kind: "asset" },
  // ---- danh mục theo id
  { name: "GET /categories/:id", method: "get", path: (c) => `${c.base}/categories/${c.foreign.leafId}`, perm: P("CATEGORY_VIEW"), kind: "category" },
  { name: "PUT /categories/:id", method: "put", path: (c) => `${c.base}/categories/${c.foreign.leafId}`, perm: P("CATEGORY_UPDATE"), kind: "category", body: () => ({ name: "x" }) },
  { name: "DELETE /categories/:id", method: "delete", path: (c) => `${c.base}/categories/${c.foreign.leafId}`, perm: P("CATEGORY_DELETE"), kind: "category" },
  { name: "DELETE /categories/:id/permanent", method: "delete", path: (c) => `${c.base}/categories/${c.foreign.leafId}/permanent`, perm: P("CATEGORY_DELETE_PERMANENT"), kind: "category" },
  { name: "PATCH /categories/:id/restore", method: "patch", path: (c) => `${c.base}/categories/${c.foreign.leafId}/restore`, perm: P("CATEGORY_UPDATE"), kind: "category" },
  // ---- kế hoạch bảo trì theo id
  { name: "PUT /maintenance-plans/:id", method: "put", path: (c) => `${c.base}/maintenance-plans/${c.foreign.planId}`, perm: P("MAINTENANCE_PLAN_UPDATE"), kind: "plan", body: () => ({ title: "x" }) },
  { name: "PATCH /maintenance-plans/:id/complete", method: "patch", path: (c) => `${c.base}/maintenance-plans/${c.foreign.planId}/complete`, perm: P("MAINTENANCE_PLAN_UPDATE"), kind: "plan", body: () => ({}) },
  { name: "PATCH /maintenance-plans/:id/cancel", method: "patch", path: (c) => `${c.base}/maintenance-plans/${c.foreign.planId}/cancel`, perm: P("MAINTENANCE_PLAN_UPDATE"), kind: "plan", body: () => ({}) },
  // ---- chỉ module Thiết bị CNTT (DEV-116): hồ sơ CNTT, quyền IT_ASSET_VIEW_DETAIL / IT_ASSET_UPDATE
  { name: "GET /:assetId/profile (CNTT)", method: "get", path: (c) => `${c.base}/${c.foreign.assetId}/profile`, perm: P("VIEW_DETAIL"), kind: "asset", itOnly: true },
  { name: "PUT /:assetId/profile (CNTT)", method: "put", path: (c) => `${c.base}/${c.foreign.assetId}/profile`, perm: P("UPDATE"), kind: "asset", body: () => ({ cpu: "x" }), itOnly: true },
  // ---- chỉ module Thiết bị y tế
  { name: "POST /calibration-alerts/run", method: "post", path: (c) => `${c.base}/calibration-alerts/run`, perm: "MEDICAL_DEVICE_ALERTS_TRIGGER", kind: "none", medicalOnly: true },
  { name: "POST /:assetId/profile", method: "post", path: (c) => `${c.base}/${c.foreign.assetId}/profile`, perm: "MEDICAL_DEVICE_CREATE", kind: "asset", body: () => ({ deviceClass: "B" }), medicalOnly: true },
  { name: "GET /:assetId/profile", method: "get", path: (c) => `${c.base}/${c.foreign.assetId}/profile`, perm: "MEDICAL_DEVICE_VIEW", kind: "asset", medicalOnly: true },
  { name: "PUT /:assetId/profile", method: "put", path: (c) => `${c.base}/${c.foreign.assetId}/profile`, perm: "MEDICAL_DEVICE_UPDATE", kind: "asset", body: () => ({ deviceClass: "C" }), medicalOnly: true },
  { name: "POST /:assetId/calibration-records", method: "post", path: (c) => `${c.base}/${c.foreign.assetId}/calibration-records`, perm: "MEDICAL_DEVICE_CALIBRATE", kind: "asset", body: () => ({}), medicalOnly: true },
  { name: "GET /:assetId/calibration-records", method: "get", path: (c) => `${c.base}/${c.foreign.assetId}/calibration-records`, perm: "MEDICAL_DEVICE_VIEW", kind: "asset", medicalOnly: true },
  { name: "GET calibration certificate download", method: "get", path: (c) => `${c.base}/${c.foreign.assetId}/calibration-records/${FAKE}/certificate/download`, perm: "MEDICAL_DEVICE_VIEW", kind: "asset", medicalOnly: true },
  { name: "PUT calibration certificate", method: "put", path: (c) => `${c.base}/${c.foreign.assetId}/calibration-records/${FAKE}/certificate`, perm: "MEDICAL_DEVICE_CALIBRATE", kind: "asset", body: () => ({}), medicalOnly: true },
  { name: "GET /operator-certificates", method: "get", path: (c) => `${c.base}/operator-certificates`, perm: "OPERATOR_CERTIFICATE_VIEW", kind: "none", medicalOnly: true },
  { name: "POST /operator-certificates", method: "post", path: (c) => `${c.base}/operator-certificates`, perm: "OPERATOR_CERTIFICATE_CREATE", kind: "none", body: () => ({}), medicalOnly: true },
  { name: "GET /operator-certificates/certified-users", method: "get", path: (c) => `${c.base}/operator-certificates/certified-users?deviceCategory=${FAKE}`, perm: "OPERATOR_CERTIFICATE_VIEW", kind: "none", medicalOnly: true },
  { name: "PATCH /operator-certificates/:id", method: "patch", path: (c) => `${c.base}/operator-certificates/${c.foreign.certId}`, perm: "OPERATOR_CERTIFICATE_UPDATE", kind: "cert", body: () => ({ certificateNumber: "N" }), medicalOnly: true },
  { name: "PATCH /operator-certificates/:id/revoke", method: "patch", path: (c) => `${c.base}/operator-certificates/${c.foreign.certId}/revoke`, perm: "OPERATOR_CERTIFICATE_REVOKE", kind: "cert", body: () => ({ reason: "r" }), medicalOnly: true },
  { name: "DELETE /operator-certificates/:id", method: "delete", path: (c) => `${c.base}/operator-certificates/${c.foreign.certId}`, perm: "OPERATOR_CERTIFICATE_REVOKE", kind: "cert", medicalOnly: true },
];

const binaryParser = (res: any, cb: (err: Error | null, body: Buffer) => void) => {
  const chunks: Buffer[] = [];
  res.on("data", (c: Buffer) => chunks.push(c));
  res.on("end", () => cb(null, Buffer.concat(chunks)));
};

describe("E2E — 2 module tài sản theo loại (DEV-115)", () => {
  let app: import("express").Express;
  const tokens: Record<string, string> = {};
  const roleIds: Record<string, string> = {};
  let deptId = "";
  const fx: Record<"it" | "med", Fixture> = {} as any;
  const MODULES = [
    { key: "it" as const, label: "it-assets", base: "/api/it-assets", prefix: "IT_ASSET", otherPrefix: "MEDICAL_ASSET" },
    { key: "med" as const, label: "medical-assets", base: "/api/medical-assets", prefix: "MEDICAL_ASSET", otherPrefix: "IT_ASSET" },
  ];
  const minimalTokenCache = new Map<string, string>();

  const call = (method: string, url: string, token?: string, body?: unknown) => {
    let r = (request(app) as any)[method](url);
    if (token) r = r.set("Authorization", `Bearer ${token}`);
    return body === undefined ? r : r.send(body);
  };

  const makeUserWithPerms = async (key: string, permNames: string[]): Promise<string> => {
    const perms = await Permission.find({ name: { $in: permNames } }).select("_id name");
    if (perms.length !== new Set(permNames).size) {
      throw new Error(`Thiếu permission trong catalog test: ${permNames.filter((n) => !perms.some((p) => p.name === n))}`);
    }
    const role = await Role.create({ name: `T_${key}`.slice(0, 60), permissions: perms.map((p) => p._id) });
    const user = await seedUser({ username: `u_${key}`.slice(0, 60), password: PASSWORD, fullName: key, roleId: String(role._id) });
    return generateAccessToken({ id: user._id });
  };

  const tokenWithOnly = async (perm: string): Promise<string> => {
    if (!minimalTokenCache.has(perm)) minimalTokenCache.set(perm, await makeUserWithPerms(`only_${perm}`, [perm]));
    return minimalTokenCache.get(perm)!;
  };

  const permName = (rc: RouteCase, prefix: string) => (typeof rc.perm === "function" ? rc.perm(prefix) : rc.perm);

  const buildFixture = async (m: (typeof MODULES)[number], adminToken: string): Promise<Fixture> => {
    const code = m.key === "it" ? "CNTT" : "TBYT";
    const root = await call("post", `${m.base}/categories`, adminToken, { code, name: `Gốc ${code}` });
    expect(root.status).toBe(201);
    const group = await call("post", `${m.base}/categories`, adminToken, { code: `${code}_NHOM`, name: "Nhóm", parentCategory: root.body.data._id });
    expect(group.status).toBe(201);
    const leafCode = m.key === "it" ? "PC" : "VENT";
    const leaf = await call("post", `${m.base}/categories`, adminToken, { code: leafCode, name: `Loại ${leafCode}`, parentCategory: group.body.data._id });
    expect(leaf.status).toBe(201);
    const asset = await call("post", m.base, adminToken, { category: leaf.body.data._id, department: deptId, name: `Tài sản ${m.key}` });
    expect(asset.status).toBe(201);
    const plan = await call("post", `${m.base}/maintenance-plans/asset/${asset.body.data._id}`, adminToken, { title: "Bảo trì", scheduledDate: "2026-01-15" });
    expect(plan.status).toBe(201);
    return {
      rootId: root.body.data._id,
      leafId: leaf.body.data._id,
      leafCode,
      assetId: asset.body.data._id,
      assetCode: asset.body.data.assetCode,
      planId: plan.body.data._id,
      certId: "",
    };
  };

  beforeAll(async () => {
    await startE2EDatabase();
    app = (await import("../../app")).default;
    Object.assign(roleIds, await seedRbac());
    deptId = (await seedDepartments()).deptA;

    const admin = await seedUser({ username: "m_admin", password: PASSWORD, fullName: "Admin", roleId: roleIds.ADMIN, departmentId: deptId });
    tokens.ADMIN = generateAccessToken({ id: admin._id });
    for (const r of ["IT", "PHONG_VAT_TU_TTB", "USER"]) {
      const u = await seedUser({ username: `m_${r.toLowerCase()}`, password: PASSWORD, fullName: r, roleId: roleIds[r], departmentId: deptId });
      tokens[r] = generateAccessToken({ id: u._id });
    }

    fx.it = await buildFixture(MODULES[0], tokens.ADMIN);
    fx.med = await buildFixture(MODULES[1], tokens.ADMIN);

    // Chứng chỉ vận hành: thiết bị y tế tạo qua API; chứng chỉ gắn danh mục CNTT chỉ chèn thẳng DB (API chặn).
    const someUser = await User.findOne({ username: "m_user" });
    const cert = await call("post", "/api/medical-assets/operator-certificates", tokens.ADMIN, {
      user: String(someUser!._id),
      deviceCategory: fx.med.leafId,
      certificateNumber: "C-1",
      issuedAt: "2026-01-01",
      expiresAt: "2027-01-01",
    });
    expect(cert.status).toBe(201);
    fx.med.certId = cert.body.data._id;
    const itCert = await OperatorCertificate.collection.insertOne({
      user: someUser!._id,
      deviceCategory: new Types.ObjectId(fx.it.leafId),
      issuedAt: new Date("2026-01-01"),
      expiresAt: new Date("2027-01-01"),
      isActive: true,
    });
    fx.it.certId = String(itCert.insertedId);
  }, 120_000);

  afterAll(async () => {
    await stopE2EDatabase();
  });

  /* ------------------------------------------------------------------ */
  describe("cấu trúc router", () => {
    const collect = (stack: any[], acc: { path: string; handlers: any[] }[] = []) => {
      for (const layer of stack) {
        if (layer.route) acc.push({ path: layer.route.path, handlers: layer.route.stack.map((l: any) => l.handle) });
        else if (layer.handle?.stack) collect(layer.handle.stack, acc);
      }
      return acc;
    };

    it.each([
      ["it-assets", IT_ASSET_MODULE],
      ["medical-assets", MEDICAL_ASSET_MODULE],
    ])("%s: mọi route có tham số id đều có chốt cô lập theo loại", (_label, cfg) => {
      const routes = collect(buildAssetModuleRouter(cfg).stack);
      expect(routes.length).toBeGreaterThan(30);
      const missing = routes
        .filter((r) => /:\w+/.test(r.path) && !r.path.startsWith("/lookup/"))
        .filter((r) => !r.handlers.some((h) => h && h[SCOPE_GUARD_MARK] === true))
        .map((r) => r.path);
      expect(missing).toEqual([]);
    });

    it.each([
      ["/api/it-assets", IT_ASSET_MODULE],
      ["/api/medical-assets", MEDICAL_ASSET_MODULE],
    ])("%s: OpenAPI khớp từng route (method + path) đã cài đặt", (base, cfg) => {
      const SUB_PREFIXES = ["/categories", "/maintenance-plans", "/operator-certificates"];
      const impl = new Set<string>();
      const walk = (stack: any[], prefix: string) => {
        for (const l of stack) {
          if (l.route) {
            for (const m of Object.keys(l.route.methods)) impl.add(`${m.toUpperCase()} ${prefix}${l.route.path}`.replace(/:(\w+)/g, "{p}").replace(/\/$/, ""));
          } else if (l.handle?.stack) {
            const hit = SUB_PREFIXES.find((c) => l.matchers?.some((fn: any) => fn(c)));
            walk(l.handle.stack, prefix + (hit ?? ""));
          }
        }
      };
      walk(buildAssetModuleRouter(cfg).stack, base);
      const doc: any = YAML.load(path.join(__dirname, "../../docs/openAPI.yaml"));
      const documented = new Set<string>();
      for (const p of Object.keys(doc.paths)) {
        if (p !== base && !p.startsWith(base + "/")) continue;
        for (const m of Object.keys(doc.paths[p])) {
          if (["get", "post", "put", "patch", "delete"].includes(m)) documented.add(`${m.toUpperCase()} ${p}`.replace(/{[^}]+}/g, "{p}"));
        }
      }
      const normImpl = new Set([...impl].map((x) => x.replace(/{[^}]+}/g, "{p}")));
      expect([...normImpl].filter((x) => !documented.has(x))).toEqual([]);
      expect([...documented].filter((x) => !normImpl.has(x))).toEqual([]);
    });

    it("module CNTT không có route hiệu chuẩn / chứng chỉ vận hành của thiết bị y tế", () => {
      const paths = collect(buildAssetModuleRouter(IT_ASSET_MODULE).stack).map((r) => r.path);
      expect(paths.some((p) => p.includes("calibration") || p.includes("operator-certificates"))).toBe(false);
    });
  });

  /* ------------------------------------------------------------------ */
  describe.each(MODULES)("ma trận route × quyền × cô lập — $label", (m) => {
    const ctx = (): Ctx => ({ base: m.base, foreign: m.key === "it" ? fx.med : fx.it, dept: deptId });
    const cases = ROUTES.filter((r) => (!r.medicalOnly || m.key === "med") && (!r.itOnly || m.key === "it"));

    it.each(cases.map((c) => [c.name, c] as const))("%s", async (_name, rc) => {
      const c = ctx();
      const url = rc.path(c);
      const body = rc.body?.(c);
      const need = permName(rc, m.prefix);

      // 401
      expect((await call(rc.method, url, undefined, body)).status).toBe(401);
      // 403: không quyền nào
      expect((await call(rc.method, url, await tokenWithOnly("DASHBOARD_READ"), body)).status).toBe(403);
      // đủ quyền: không bị 401/403 (với route có id ngoại lai -> 404 của chốt cô lập)
      const ok = await call(rc.method, url, await tokenWithOnly(need), body);
      expect([401, 403]).not.toContain(ok.status);
      if (rc.kind !== "none") {
        expect(ok.status).toBe(404);
        expect(ok.body.message).toBe(MSG[rc.kind]);
        // admin cũng không vượt được ranh giới loại
        const adminRes = await call(rc.method, url, tokens.ADMIN, body);
        expect(adminRes.status).toBe(404);
        expect(adminRes.body.message).toBe(MSG[rc.kind]);
      }
    });

    it("user có ĐỦ quyền module kia vẫn bị 403 trên mọi route của module này", async () => {
      const otherAll = ASSET_SPLIT_PERMISSION_NAMES.filter((n) => n.startsWith(`${m.otherPrefix}_`));
      const token = await makeUserWithPerms(`other_${m.key}`, otherAll);
      const failures: string[] = [];
      for (const rc of cases) {
        const need = permName(rc, m.prefix);
        if (otherAll.includes(need) || !/^(IT_ASSET|MEDICAL_ASSET)_/.test(need)) continue; // quyền dùng chung (DOCUMENT_VIEW, MEDICAL_DEVICE_*, ...) bỏ qua
        const c = ctx();
        const res = await call(rc.method, rc.path(c), token, rc.body?.(c));
        if (res.status !== 403) failures.push(`${rc.name}: ${res.status}`);
      }
      expect(failures).toEqual([]);
    });
  });

  /* ------------------------------------------------------------------ */
  describe("luồng chức năng cô lập theo loại", () => {
    it("danh mục: chỉ liệt kê nhánh của module; tạo gốc loại khác / con dưới cha khác nhánh bị 400", async () => {
      for (const [base, mine, theirs] of [["/api/it-assets", fx.it, fx.med], ["/api/medical-assets", fx.med, fx.it]] as const) {
        const list = await call("get", `${base}/categories?limit=50`, tokens.ADMIN);
        const ids = list.body.data.map((x: any) => x._id);
        expect(ids).toContain(mine.leafId);
        expect(ids).not.toContain(theirs.leafId);
        expect(ids).not.toContain(theirs.rootId);

        const wrongRoot = await call("post", `${base}/categories`, tokens.ADMIN, { code: `X_${base.length}`, name: "x", assetType: base.includes("it") ? "MEDICAL" : "IT" });
        expect(wrongRoot.status).toBe(400);
        const foreignParent = await call("post", `${base}/categories`, tokens.ADMIN, { code: `Y_${base.length}`, name: "y", parentCategory: theirs.rootId });
        expect(foreignParent.status).toBe(400);
      }
      const moved = await call("put", `/api/it-assets/categories/${fx.it.leafId}`, tokens.ADMIN, { parentCategory: fx.med.rootId });
      expect(moved.status).toBe(400);
    });

    it("danh mục gốc tạo qua module tự mang loại của module", async () => {
      const res = await call("post", "/api/it-assets/categories", tokens.ADMIN, { code: "CNTT2", name: "Gốc CNTT 2" });
      expect(res.status).toBe(201);
      expect(res.body.data.assetType).toBe("IT");
    });

    it("tài sản: tạo với danh mục khác nhánh -> 400; danh sách và Excel chỉ có tài sản của loại mình", async () => {
      const wrong = await call("post", "/api/it-assets", tokens.ADMIN, { category: fx.med.leafId, department: deptId, name: "sai nhánh" });
      expect(wrong.status).toBe(400);
      const wrong2 = await call("post", "/api/medical-assets", tokens.ADMIN, { category: fx.it.leafId, department: deptId, name: "sai nhánh" });
      expect(wrong2.status).toBe(400);

      const itList = await call("get", "/api/it-assets?limit=100", tokens.ADMIN);
      const medList = await call("get", "/api/medical-assets?limit=100", tokens.ADMIN);
      expect(itList.body.data.every((a: any) => a.assetType === "IT")).toBe(true);
      expect(medList.body.data.every((a: any) => a.assetType === "MEDICAL")).toBe(true);
      expect(itList.body.data.map((a: any) => a._id)).toContain(fx.it.assetId);
      expect(itList.body.data.map((a: any) => a._id)).not.toContain(fx.med.assetId);

      const xl = await request(app).get("/api/it-assets/export").set("Authorization", `Bearer ${tokens.ADMIN}`).buffer(true).parse(binaryParser as any);
      expect(xl.status).toBe(200);
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(xl.body as any);
      const codes: string[] = [];
      wb.worksheets[0].eachRow((row, i) => {
        if (i > 1) codes.push(String(row.getCell(1).value));
      });
      expect(codes).toContain(fx.it.assetCode);
      expect(codes).not.toContain(fx.med.assetCode);
    });

    it("tra mã QR / lookup: mã của loại khác -> 404", async () => {
      expect((await call("get", `/api/it-assets/lookup/${fx.it.assetCode}`, tokens.ADMIN)).status).toBe(200);
      const res = await call("get", `/api/it-assets/lookup/${fx.med.assetCode}`, tokens.ADMIN);
      expect(res.status).toBe(404);
    });

    it("thao tác hàng loạt: id loại khác nằm trong `failed`, không bị xoá", async () => {
      const res = await call("post", "/api/it-assets/bulk-delete", tokens.ADMIN, { ids: [fx.med.assetId] });
      expect(res.status).toBe(200);
      expect(res.body.data.deletedIds).toEqual([]);
      expect(res.body.data.failed[0]).toMatchObject({ id: fx.med.assetId, message: MSG.asset });
      expect((await Asset.findById(fx.med.assetId))!.isActive).toBe(true);

      const cat = await call("post", "/api/it-assets/categories/bulk-delete", tokens.ADMIN, { ids: [fx.med.leafId] });
      expect(cat.body.data.deletedIds).toEqual([]);
      expect(cat.body.data.failed[0].message).toBe(MSG.category);
    });

    it("vòng đời trong module: sửa, cấp phát, thu hồi, xoá mềm, khôi phục, xoá vĩnh viễn", async () => {
      const base = "/api/it-assets";
      const made = await call("post", base, tokens.ADMIN, { category: fx.it.leafId, department: deptId, name: "Máy vòng đời" });
      const id = made.body.data._id;
      expect(made.body.data.assetType).toBe("IT");
      expect((await call("put", `${base}/${id}`, tokens.ADMIN, { name: "Máy đổi tên" })).body.data.name).toBe("Máy đổi tên");
      expect((await call("post", `${base}/${id}/assign`, tokens.ADMIN, { toDepartment: deptId })).status).toBe(200);
      expect((await call("get", `${base}/${id}/assignment-history`, tokens.ADMIN)).status).toBe(200);
      expect((await call("post", `${base}/${id}/return`, tokens.ADMIN, {})).status).toBe(200);
      expect((await call("get", `${base}/${id}/qrcode`, tokens.ADMIN)).status).toBe(200);
      expect((await call("post", `${base}/${id}/check-in`, tokens.ADMIN)).status).toBe(200);
      expect((await call("delete", `${base}/${id}`, tokens.ADMIN)).status).toBe(200);
      expect((await call("patch", `${base}/${id}/restore`, tokens.ADMIN)).status).toBe(200);
      expect((await call("delete", `${base}/${id}`, tokens.ADMIN)).status).toBe(200);
      expect((await call("delete", `${base}/${id}/permanent`, tokens.ADMIN)).status).toBe(200);
      expect(await Asset.findById(id)).toBeNull();
    });

    it("Excel nhập: dòng có danh mục thuộc nhánh khác bị báo lỗi theo dòng", async () => {
      // File mới dựng từ đúng tiêu đề cột của mẫu (mẫu tải về có sẵn dòng ví dụ).
      const wb = new ExcelJS.Workbook();
      const sheet = wb.addWorksheet("Assets");
      sheet.addRow(ASSET_IMPORT_COLUMNS.map((col) => col.header));
      const dept = await mongoose.connection.db!.collection("departments").findOne({ _id: new Types.ObjectId(deptId) });
      sheet.addRow(["", fx.it.leafCode, "Máy nhập đúng nhánh", dept!.code]);
      sheet.addRow(["", fx.med.leafCode, "Máy nhập sai nhánh", dept!.code]);
      const buf = Buffer.from(await wb.xlsx.writeBuffer());
      const res = await request(app)
        .post("/api/it-assets/import?dryRun=true")
        .set("Authorization", `Bearer ${tokens.ADMIN}`)
        .attach("file", buf, { filename: "t.xlsx", contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      expect(res.status).toBe(200);
      expect(res.body.data.errors).toHaveLength(1);
      expect(res.body.data.errors[0].message).toContain("không thuộc nhánh");
      expect(res.body.data.totalRows).toBe(2);
    });

    it("cảnh báo chạy tay theo module chỉ quét tài sản của loại đó", async () => {
      const longAgo = new Date("2020-01-01");
      await Asset.updateMany({ _id: { $in: [fx.it.assetId, fx.med.assetId] } }, { warrantyExpiredAt: longAgo, warrantyAlertSentAt: null, status: AssetStatus.IN_STOCK });
      const itRun = await call("post", "/api/it-assets/alerts/run", tokens.ADMIN);
      expect(itRun.body.data.warranty).toEqual({ checked: 1, notified: 1 });
      expect((await Asset.findById(fx.med.assetId))!.warrantyAlertSentAt).toBeFalsy();
      const medRun = await call("post", "/api/medical-assets/alerts/run", tokens.ADMIN);
      expect(medRun.body.data.warranty).toEqual({ checked: 1, notified: 1 });
    });

    it("lịch bảo trì: kế hoạch của loại khác không lọt vào lịch; sửa kế hoạch của loại khác -> 404", async () => {
      const it = await call("get", "/api/it-assets/maintenance-plans/calendar?month=1&year=2026", tokens.ADMIN);
      expect(it.body.data.map((p: any) => p._id)).toEqual([fx.it.planId]);
      const med = await call("get", "/api/medical-assets/maintenance-plans/calendar?month=1&year=2026", tokens.ADMIN);
      expect(med.body.data.map((p: any) => p._id)).toEqual([fx.med.planId]);
      expect((await call("put", `/api/it-assets/maintenance-plans/${fx.med.planId}`, tokens.ADMIN, { title: "x" })).status).toBe(404);
      expect((await call("put", `/api/it-assets/maintenance-plans/${fx.it.planId}`, tokens.ADMIN, { title: "Bảo trì (đã sửa)" })).status).toBe(200);
    });

    it("thiết bị y tế: hồ sơ chỉ cho tài sản y tế; module CNTT không có đường tới hồ sơ y tế", async () => {
      const ok = await call("post", `/api/medical-assets/${fx.med.assetId}/profile`, tokens.ADMIN, { deviceClass: "B", registrationNumber: "REG-1" });
      expect(ok.status).toBe(201);
      expect((await call("get", `/api/medical-assets/${fx.med.assetId}/profile`, tokens.ADMIN)).body.data.deviceClass).toBe("B");
      expect((await call("post", `/api/medical-assets/${fx.it.assetId}/profile`, tokens.ADMIN, { deviceClass: "B" })).status).toBe(404);
      expect((await call("get", `/api/it-assets/${fx.med.assetId}/profile`, tokens.ADMIN)).status).toBe(404);
      expect((await call("get", `/api/medical-assets/${fx.med.assetId}/calibration-records`, tokens.ADMIN)).status).toBe(200);
      expect((await call("post", "/api/medical-assets/calibration-alerts/run", tokens.ADMIN)).status).toBe(200);
    });

    it("chứng chỉ vận hành: thao tác trên chứng chỉ của loại đúng chạy được", async () => {
      const upd = await call("patch", `/api/medical-assets/operator-certificates/${fx.med.certId}`, tokens.ADMIN, { certificateNumber: "C-2" });
      expect(upd.status).toBe(200);
      const list = await call("get", "/api/medical-assets/operator-certificates", tokens.ADMIN);
      expect(list.status).toBe(200);
    });
  });

  /* ------------------------------------------------------------------ */
  describe("lớp tương thích và xem chéo (Q-F)", () => {
    it("GĐ 8: route cũ /api/assets*, /api/operator-certificates đã gỡ (404 kể cả ADMIN); lookup-options vẫn còn", async () => {
      for (const url of [
        `/api/assets/${fx.med.assetId}`,
        "/api/assets",
        "/api/assets/asset-categories?limit=100",
        `/api/assets/medical-devices/${fx.med.assetId}/profile`,
        "/api/assets/maintenance-plans/calendar",
        "/api/operator-certificates",
      ]) {
        expect((await call("get", url, tokens.ADMIN)).status).toBe(404);
      }
      expect((await call("get", "/api/assets/lookup-options", tokens.ADMIN)).status).toBe(200);
    });

    it("GĐ 8: 20 quyền ASSET_* / ASSET_CATEGORY_* cũ không còn trong catalog, thay bằng quyền theo loại", async () => {
      expect(await Permission.countDocuments({ name: { $regex: /^ASSET_/ } })).toBe(0);
      expect(await Permission.countDocuments({ name: { $in: ["IT_ASSET_VIEW", "MEDICAL_ASSET_VIEW"] } })).toBe(2);
    });

    it("IT xem được thiết bị y tế nhưng không sửa; Vật tư-TTB xem được CNTT nhưng không sửa", async () => {
      expect((await call("get", "/api/medical-assets", tokens.IT)).status).toBe(200);
      expect((await call("get", `/api/medical-assets/${fx.med.assetId}`, tokens.IT)).status).toBe(200);
      expect((await call("put", `/api/medical-assets/${fx.med.assetId}`, tokens.IT, { name: "x" })).status).toBe(403);
      expect((await call("post", "/api/medical-assets", tokens.IT, {})).status).toBe(403);
      expect((await call("get", "/api/it-assets", tokens.PHONG_VAT_TU_TTB)).status).toBe(200);
      expect((await call("put", `/api/it-assets/${fx.it.assetId}`, tokens.PHONG_VAT_TU_TTB, { name: "x" })).status).toBe(403);
      expect((await call("put", `/api/it-assets/${fx.it.assetId}`, tokens.IT, { name: "IT sửa" })).status).toBe(200);
      expect((await call("put", `/api/medical-assets/${fx.med.assetId}`, tokens.PHONG_VAT_TU_TTB, { name: "VT sửa" })).status).toBe(200);
    });

    it("USER chỉ xem + kiểm kê, không tạo", async () => {
      expect((await call("get", "/api/it-assets", tokens.USER)).status).toBe(200);
      expect((await call("get", `/api/medical-assets/lookup/${fx.med.assetCode}`, tokens.USER)).status).toBe(200);
      expect((await call("post", "/api/it-assets", tokens.USER, {})).status).toBe(403);
    });
  });
});

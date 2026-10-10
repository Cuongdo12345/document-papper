/**
 * DEV-116 (tách module Tài sản, GĐ 5) — E2E qua HTTP THẬT (supertest + MongoDB in-memory):
 * hồ sơ thiết bị CNTT, bản quyền phần mềm (`/api/software-licenses`), cảnh báo hết hạn, trả slot khi thanh lý/xoá,
 * chứng từ, và script chép `Asset.specs` sang hồ sơ.
 *
 * CLAUDE.md §18/§32: mọi route MỚI phải bị chặn đúng 401/403 — kiểm bằng bảng route × quyền viết tay (user chỉ có
 * đúng quyền route -> không 401/403; không quyền -> 403; không token -> 401).
 */
import fs from "fs";
import path from "path";
import YAML from "yamljs";
import request from "supertest";
import mongoose, { Types } from "mongoose";
import { startE2EDatabase, stopE2EDatabase } from "./setup";
import { seedDepartments, seedRbac, seedUser } from "./seedTestData";
import { Permission } from "../../models/rbac/permission.model";
import { Role } from "../../models/rbac/role.model";
import { Asset, AssetStatus } from "../../models/assets/asset.model";
import { Notification, NotificationType } from "../../models/notifications/notification.model";
import { SoftwareLicense } from "../../models/itDevices/softwareLicense.model";
import { ItDeviceProfile } from "../../models/itDevices/itDeviceProfile.model";
import { Upload } from "../../models/uploadFiles/upload.model";
import { generateAccessToken } from "../../shared/helpers/auth.helper";
import { resolveAssetMaintenanceService } from "../../services/assets/assetDevice/assetMaintenance.service";
import { runSoftwareLicenseAlertsService } from "../../services/itDevices/softwareLicenseAlerts.service";
import { runItDeviceSpecsMigration } from "../../services/itDevices/itDeviceSpecsMigration";
import { upsertItDeviceProfileService } from "../../services/itDevices/itDeviceProfile.service";
import { assignAssetToLicenseService } from "../../services/itDevices/softwareLicense.service";
import softwareLicenseRouter from "../../routes/itDevices/softwareLicense.routes";

const PASSWORD = "Password123";
const FAKE = "507f1f77bcf86cd799439099";

describe("E2E — Hồ sơ CNTT và bản quyền phần mềm (DEV-116)", () => {
  let app: import("express").Express;
  let adminToken = "";
  let itToken = "";
  let deptId = "";
  let itLeaf = "";
  let medLeaf = "";
  let adminId = "";
  const minimal = new Map<string, string>();

  const call = (method: string, url: string, token?: string, body?: unknown) => {
    let r = (request(app) as any)[method](url);
    if (token) r = r.set("Authorization", `Bearer ${token}`);
    return body === undefined ? r : r.send(body);
  };
  const admin = (method: string, url: string, body?: unknown) => call(method, url, adminToken, body);

  const tokenWithOnly = async (perm: string): Promise<string> => {
    if (!minimal.has(perm)) {
      const p = await Permission.findOne({ name: perm });
      if (!p) throw new Error(`thiếu permission ${perm}`);
      const role = await Role.create({ name: `T_${perm}`.slice(0, 60), permissions: [p._id] });
      const user = await seedUser({ username: `u_${perm}`.slice(0, 60), password: PASSWORD, fullName: perm, roleId: String(role._id) });
      minimal.set(perm, generateAccessToken({ id: user._id }));
    }
    return minimal.get(perm)!;
  };

  let assetCounter = 0;
  const newItAsset = async (name?: string): Promise<string> => {
    const res = await admin("post", "/api/it-assets", { category: itLeaf, department: deptId, name: name ?? `Máy IT ${++assetCounter}` });
    expect(res.status).toBe(201);
    return res.body.data._id;
  };
  const newLicense = async (extra: Record<string, unknown> = {}) => {
    const res = await admin("post", "/api/software-licenses", { softwareName: "Office", licenseType: "PERPETUAL", totalSeats: 3, ...extra });
    expect(res.status).toBe(201);
    return res.body.data;
  };

  beforeAll(async () => {
    await startE2EDatabase();
    app = (await import("../../app")).default;
    const roleIds = await seedRbac();
    deptId = (await seedDepartments()).deptA;
    const a = await seedUser({ username: "d_admin", password: PASSWORD, fullName: "Admin", roleId: roleIds.ADMIN, departmentId: deptId });
    adminId = String(a._id);
    adminToken = generateAccessToken({ id: a._id });
    const it = await seedUser({ username: "d_it", password: PASSWORD, fullName: "IT", roleId: roleIds.IT, departmentId: deptId });
    itToken = generateAccessToken({ id: it._id });

    const itRoot = await admin("post", "/api/it-assets/categories", { code: "CNTT", name: "CNTT" });
    const itGroup = await admin("post", "/api/it-assets/categories", { code: "CNTT_G", name: "Nhóm", parentCategory: itRoot.body.data._id });
    itLeaf = (await admin("post", "/api/it-assets/categories", { code: "PC", name: "PC", parentCategory: itGroup.body.data._id })).body.data._id;
    const medRoot = await admin("post", "/api/medical-assets/categories", { code: "TBYT", name: "TBYT" });
    const medGroup = await admin("post", "/api/medical-assets/categories", { code: "TBYT_G", name: "Nhóm", parentCategory: medRoot.body.data._id });
    medLeaf = (await admin("post", "/api/medical-assets/categories", { code: "VENT", name: "Máy thở", parentCategory: medGroup.body.data._id })).body.data._id;
  }, 120_000);

  afterAll(async () => {
    await stopE2EDatabase();
  });

  /* ------------------------------------------------------------------ */
  describe("OpenAPI", () => {
    it("OpenAPI khớp từng route (method + path) của /api/software-licenses", () => {
      const impl = new Set<string>();
      for (const layer of (softwareLicenseRouter as any).stack) {
        if (!layer.route) continue;
        for (const m of Object.keys(layer.route.methods)) impl.add(`${m.toUpperCase()} /api/software-licenses${layer.route.path === "/" ? "" : layer.route.path}`.replace(/:(\w+)/g, "{p}"));
      }
      const doc: any = YAML.load(path.join(__dirname, "../../docs/openAPI.yaml"));
      const documented = new Set<string>();
      for (const pth of Object.keys(doc.paths)) {
        if (pth !== "/api/software-licenses" && !pth.startsWith("/api/software-licenses/")) continue;
        for (const m of Object.keys(doc.paths[pth])) {
          if (["get", "post", "put", "patch", "delete"].includes(m)) documented.add(`${m.toUpperCase()} ${pth}`.replace(/\{[^}]+\}/g, "{p}"));
        }
      }
      expect(impl.size).toBe(11);
      expect([...impl].filter((x) => !documented.has(x))).toEqual([]);
      expect([...documented].filter((x) => !impl.has(x))).toEqual([]);
    });
  });

  describe("RBAC — mọi route mới (CLAUDE.md §18)", () => {
    type Case = { name: string; method: string; path: () => string; perm: string; body?: () => unknown };
    let licenseId = "";
    let itAssetId = "";
    beforeAll(async () => {
      licenseId = (await newLicense({ softwareName: "RBAC" }))._id;
      itAssetId = await newItAsset("Máy RBAC");
    });

    const cases: Case[] = [
      { name: "POST /software-licenses", method: "post", path: () => "/api/software-licenses", perm: "SOFTWARE_LICENSE_CREATE", body: () => ({}) },
      { name: "GET /software-licenses", method: "get", path: () => "/api/software-licenses", perm: "SOFTWARE_LICENSE_VIEW" },
      { name: "POST /software-licenses/alerts/run", method: "post", path: () => "/api/software-licenses/alerts/run", perm: "SOFTWARE_LICENSE_ALERTS_TRIGGER" },
      { name: "GET /software-licenses/:id", method: "get", path: () => `/api/software-licenses/${licenseId}`, perm: "SOFTWARE_LICENSE_VIEW" },
      { name: "PUT /software-licenses/:id", method: "put", path: () => `/api/software-licenses/${licenseId}`, perm: "SOFTWARE_LICENSE_UPDATE", body: () => ({ edition: "E" }) },
      { name: "DELETE /software-licenses/:id", method: "delete", path: () => `/api/software-licenses/${FAKE}`, perm: "SOFTWARE_LICENSE_DELETE" },
      { name: "PATCH /software-licenses/:id/restore", method: "patch", path: () => `/api/software-licenses/${FAKE}/restore`, perm: "SOFTWARE_LICENSE_UPDATE" },
      { name: "POST /software-licenses/:id/assign", method: "post", path: () => `/api/software-licenses/${licenseId}/assign`, perm: "SOFTWARE_LICENSE_ASSIGN", body: () => ({ asset: FAKE }) },
      { name: "POST /software-licenses/:id/unassign", method: "post", path: () => `/api/software-licenses/${licenseId}/unassign`, perm: "SOFTWARE_LICENSE_ASSIGN", body: () => ({ asset: FAKE }) },
      { name: "PUT /software-licenses/:id/proof-file", method: "put", path: () => `/api/software-licenses/${licenseId}/proof-file`, perm: "SOFTWARE_LICENSE_UPDATE" },
      { name: "GET /software-licenses/:id/proof-file/download", method: "get", path: () => `/api/software-licenses/${licenseId}/proof-file/download`, perm: "SOFTWARE_LICENSE_VIEW" },
      { name: "GET /it-assets/:assetId/profile", method: "get", path: () => `/api/it-assets/${itAssetId}/profile`, perm: "IT_ASSET_VIEW_DETAIL" },
      { name: "PUT /it-assets/:assetId/profile", method: "put", path: () => `/api/it-assets/${itAssetId}/profile`, perm: "IT_ASSET_UPDATE", body: () => ({ cpu: "i5" }) },
    ];

    it.each(cases.map((c) => [c.name, c] as const))("%s", async (_n, c) => {
      expect((await call(c.method, c.path(), undefined, c.body?.())).status).toBe(401);
      expect((await call(c.method, c.path(), await tokenWithOnly("DASHBOARD_READ"), c.body?.())).status).toBe(403);
      const ok = await call(c.method, c.path(), await tokenWithOnly(c.perm), c.body?.());
      expect([401, 403]).not.toContain(ok.status);
      // Quyền "anh em" (quyền khác của cùng nhóm) không thay thế được: VD chỉ có SOFTWARE_LICENSE_VIEW không gán/sửa/xoá được,
      // chỉ có SOFTWARE_LICENSE_ASSIGN không xem được; hồ sơ CNTT: xem (IT_ASSET_VIEW_DETAIL) và sửa (IT_ASSET_UPDATE) tách nhau.
      const sibling: Record<string, string> = {
        SOFTWARE_LICENSE_VIEW: "SOFTWARE_LICENSE_ASSIGN",
        IT_ASSET_VIEW_DETAIL: "IT_ASSET_UPDATE",
        IT_ASSET_UPDATE: "IT_ASSET_VIEW_DETAIL",
      };
      const other = sibling[c.perm] ?? "SOFTWARE_LICENSE_VIEW";
      expect((await call(c.method, c.path(), await tokenWithOnly(other), c.body?.())).status).toBe(403);
    });

    it("PHONG_VAT_TU_TTB không có quyền bản quyền; IT có đủ", async () => {
      const vt = await seedUser({ username: "d_vt", password: PASSWORD, fullName: "VT", roleId: String((await Role.findOne({ name: "PHONG_VAT_TU_TTB" }))!._id) });
      const vtToken = generateAccessToken({ id: vt._id });
      expect((await call("get", "/api/software-licenses", vtToken)).status).toBe(403);
      expect((await call("get", "/api/software-licenses", itToken)).status).toBe(200);
      expect((await call("post", "/api/software-licenses", itToken, { softwareName: "IT tạo", licenseType: "PERPETUAL", totalSeats: 1 })).status).toBe(201);
    });
  });

  /* ------------------------------------------------------------------ */
  describe("bản quyền phần mềm — dữ liệu và quy tắc", () => {
    it("tạo: thuê bao bắt buộc hạn, vĩnh viễn không có hạn, số máy ≥ 1, nhà cung cấp phải tồn tại; không nhận khoá bản quyền", async () => {
      const base = { softwareName: "Win", totalSeats: 5 };
      expect((await admin("post", "/api/software-licenses", { ...base, licenseType: "SUBSCRIPTION" })).status).toBe(400);
      expect((await admin("post", "/api/software-licenses", { ...base, licenseType: "PERPETUAL", expiresAt: "2030-01-01" })).status).toBe(400);
      expect((await admin("post", "/api/software-licenses", { ...base, licenseType: "PERPETUAL", totalSeats: 0 })).status).toBe(400);
      expect((await admin("post", "/api/software-licenses", { ...base, licenseType: "PERPETUAL", vendor: FAKE })).status).toBe(400);
      expect((await admin("post", "/api/software-licenses", { ...base, licenseType: "SUBSCRIPTION", purchaseDate: "2030-01-01", expiresAt: "2029-01-01" })).status).toBe(400);

      const created = await admin("post", "/api/software-licenses", {
        ...base,
        licenseType: "SUBSCRIPTION",
        expiresAt: "2030-01-01",
        licenseKey: "AAAA-BBBB", // không được lưu (Q-A2)
        assets: [FAKE], // client không tự đặt danh sách máy
      });
      expect(created.status).toBe(201);
      expect(created.body.data.usedSeats).toBe(0);
      expect(created.body.data.freeSeats).toBe(5);
      const row = await SoftwareLicense.collection.findOne({ _id: new Types.ObjectId(created.body.data._id) });
      expect(row).not.toHaveProperty("licenseKey");
      expect(row!.assets).toEqual([]);
    });

    it("gán: chỉ máy CNTT còn hoạt động; trùng và hết slot bị 400; gỡ trả slot", async () => {
      const lic = await newLicense({ totalSeats: 2 });
      const a1 = await newItAsset();
      const a2 = await newItAsset();
      const a3 = await newItAsset();
      const med = (await admin("post", "/api/medical-assets", { category: medLeaf, department: deptId, name: "Máy thở" })).body.data._id;
      const url = `/api/software-licenses/${lic._id}`;

      expect((await admin("post", `${url}/assign`, { asset: med })).status).toBe(400); // thiết bị y tế
      expect((await admin("post", `${url}/assign`, { asset: FAKE })).status).toBe(404);
      expect((await admin("post", `${url}/assign`, { asset: a1 })).body.data.usedSeats).toBe(1);
      const dup = await admin("post", `${url}/assign`, { asset: a1 });
      expect(dup.status).toBe(400);
      expect(dup.body.message).toContain("đã được gán");
      expect((await admin("post", `${url}/assign`, { asset: a2 })).body.data.freeSeats).toBe(0);
      const full = await admin("post", `${url}/assign`, { asset: a3 });
      expect(full.status).toBe(400);
      expect(full.body.message).toContain("hết số máy");

      expect((await admin("post", `${url}/unassign`, { asset: a3 })).status).toBe(400); // chưa gán
      expect((await admin("post", `${url}/unassign`, { asset: a1 })).body.data.freeSeats).toBe(1);
      expect((await admin("post", `${url}/assign`, { asset: a3 })).status).toBe(200);
    });

    it("máy đã thanh lý/mất không được gán", async () => {
      const lic = await newLicense();
      const a = await newItAsset();
      await Asset.updateOne({ _id: a }, { status: AssetStatus.DISPOSED });
      expect((await admin("post", `/api/software-licenses/${lic._id}/assign`, { asset: a })).status).toBe(400);
    });

    it("hạ số máy tối đa không thấp hơn số máy đang dùng; đổi loại phải hợp lệ; đổi hạn reset cờ cảnh báo", async () => {
      const lic = await newLicense({ totalSeats: 3 });
      const url = `/api/software-licenses/${lic._id}`;
      for (let i = 0; i < 2; i++) await admin("post", `${url}/assign`, { asset: await newItAsset() });

      const low = await admin("put", url, { totalSeats: 1 });
      expect(low.status).toBe(400);
      expect(low.body.message).toContain("không được nhỏ hơn");
      expect((await admin("put", url, { totalSeats: 2 })).body.data.totalSeats).toBe(2);
      expect((await admin("put", url, { licenseType: "SUBSCRIPTION" })).status).toBe(400); // thuê bao thiếu hạn
      expect((await admin("put", url, { licenseType: "SUBSCRIPTION", expiresAt: "2031-01-01" })).status).toBe(200);

      await SoftwareLicense.updateOne({ _id: lic._id }, { expiryAlertSentAt: new Date() });
      await admin("put", url, { expiresAt: "2032-01-01" });
      expect((await SoftwareLicense.findById(lic._id))!.expiryAlertSentAt).toBeNull();
      // xoá trường bằng null
      expect((await admin("put", url, { edition: "X" })).body.data.edition).toBe("X");
      expect((await admin("put", url, { edition: null })).body.data.edition).toBeUndefined();
    });

    it("danh sách: lọc theo máy (trang chi tiết thiết bị), theo hạn; xoá mềm và khôi phục", async () => {
      const lic = await newLicense({ softwareName: "ZZ-Lọc", totalSeats: 2 });
      const a = await newItAsset();
      await admin("post", `/api/software-licenses/${lic._id}/assign`, { asset: a });

      const byAsset = await admin("get", `/api/software-licenses?asset=${a}`);
      expect(byAsset.body.data.map((x: any) => x._id)).toEqual([lic._id]);
      expect(byAsset.body.data[0].usedSeats).toBe(1);
      expect(byAsset.body.data[0].assets).toBeUndefined(); // danh sách không trả mảng id máy

      const detail = await admin("get", `/api/software-licenses/${lic._id}`);
      expect(detail.body.data.assets[0].assetCode).toBeTruthy();

      expect((await admin("delete", `/api/software-licenses/${lic._id}`)).status).toBe(200);
      expect((await admin("get", `/api/software-licenses?asset=${a}`)).body.data).toEqual([]);
      expect((await admin("get", `/api/software-licenses?isActive=false&keyword=ZZ-L`)).body.data).toHaveLength(1);
      expect((await admin("patch", `/api/software-licenses/${lic._id}/restore`)).status).toBe(200);
      expect((await admin("get", `/api/software-licenses?asset=${a}`)).body.data).toHaveLength(1);
    });
  });

  /* ------------------------------------------------------------------ */
  describe("R6 — gán đồng thời vào slot cuối", () => {
    it("12 request gán đồng thời vào bản quyền còn 3 slot: đúng 3 thành công, không vượt slot", async () => {
      const lic = await newLicense({ softwareName: "Race", totalSeats: 3 });
      const assets: string[] = [];
      for (let i = 0; i < 12; i++) assets.push(await newItAsset(`Race ${i}`));

      const results = await Promise.all(assets.map((a) => admin("post", `/api/software-licenses/${lic._id}/assign`, { asset: a })));
      const ok = results.filter((r) => r.status === 200).length;
      const rejected = results.filter((r) => r.status === 400).length;
      expect(ok).toBe(3);
      expect(rejected).toBe(9);
      expect((await SoftwareLicense.findById(lic._id))!.assets).toHaveLength(3);
    }, 60_000);

    it("cùng một máy gán đồng thời nhiều lần: chỉ được một lần", async () => {
      const lic = await newLicense({ softwareName: "Race2", totalSeats: 5 });
      const a = await newItAsset();
      const results = await Promise.all(Array.from({ length: 6 }, () => admin("post", `/api/software-licenses/${lic._id}/assign`, { asset: a })));
      expect(results.filter((r) => r.status === 200)).toHaveLength(1);
      expect((await SoftwareLicense.findById(lic._id))!.assets).toHaveLength(1);
    }, 60_000);
  });

  /* ------------------------------------------------------------------ */
  describe("trả slot khi vòng đời tài sản kết thúc (user chốt 2026-10-08)", () => {
    const setup = async () => {
      const lic = await newLicense({ totalSeats: 5 });
      const a = await newItAsset();
      const other = await newItAsset();
      await admin("post", `/api/software-licenses/${lic._id}/assign`, { asset: a });
      await admin("post", `/api/software-licenses/${lic._id}/assign`, { asset: other });
      return { lic, a, other };
    };
    const assetsOf = async (id: string) => (await SoftwareLicense.findById(id))!.assets.map(String);

    it("xoá mềm trả slot; khôi phục KHÔNG tự gán lại", async () => {
      const { lic, a, other } = await setup();
      expect((await admin("delete", `/api/it-assets/${a}`)).status).toBe(200);
      expect(await assetsOf(lic._id)).toEqual([other]);
      expect((await admin("patch", `/api/it-assets/${a}/restore`)).status).toBe(200);
      expect(await assetsOf(lic._id)).toEqual([other]);
    });

    it("xoá mềm hàng loạt trả slot cho từng máy", async () => {
      const { lic, a, other } = await setup();
      const res = await admin("post", "/api/it-assets/bulk-delete", { ids: [a, other] });
      expect(res.body.data.deletedIds).toHaveLength(2);
      expect(await assetsOf(lic._id)).toEqual([]);
    });

    it("máy đang dùng (IN_USE) bị chặn xoá thì KHÔNG mất slot", async () => {
      const { lic, a } = await setup();
      await Asset.updateOne({ _id: a }, { status: AssetStatus.IN_USE });
      expect((await admin("delete", `/api/it-assets/${a}`)).status).toBe(400);
      expect(await assetsOf(lic._id)).toContain(a);
    });

    it("thanh lý (sửa chữa không được -> DISPOSED) trả slot; sửa xong (REPAIRED) giữ slot", async () => {
      const { lic, a, other } = await setup();
      await Asset.updateMany({ _id: { $in: [a, other] } }, { status: AssetStatus.UNDER_MAINTENANCE, maintenanceStartedAt: new Date() });
      await resolveAssetMaintenanceService(a, "UNREPAIRABLE", adminId);
      await resolveAssetMaintenanceService(other, "REPAIRED", adminId);
      expect((await Asset.findById(a))!.status).toBe(AssetStatus.DISPOSED);
      expect(await assetsOf(lic._id)).toEqual([other]);
    });

    it("xoá vĩnh viễn trả slot và xoá hồ sơ CNTT đi kèm", async () => {
      const { lic, a } = await setup();
      await admin("put", `/api/it-assets/${a}/profile`, { cpu: "i7" });
      expect(await ItDeviceProfile.countDocuments({ asset: a })).toBe(1);
      await admin("delete", `/api/it-assets/${a}`);
      // Dựng lại tình huống máy xoá mềm nhưng còn bám trong bản quyền (dữ liệu cũ) rồi xoá vĩnh viễn.
      await SoftwareLicense.updateOne({ _id: lic._id }, { $addToSet: { assets: a } });
      expect((await admin("delete", `/api/it-assets/${a}/permanent`)).status).toBe(200);
      expect(await assetsOf(lic._id)).not.toContain(a);
      expect(await ItDeviceProfile.countDocuments({ asset: a })).toBe(0);
    });
  });

  /* ------------------------------------------------------------------ */
  describe("hồ sơ thiết bị CNTT", () => {
    it("chưa có hồ sơ: GET trả data null (không phải lỗi); PUT tạo; PUT lần sau chỉ đổi trường được gửi", async () => {
      const a = await newItAsset();
      const none = await admin("get", `/api/it-assets/${a}/profile`);
      expect(none.status).toBe(200);
      expect(none.body.data).toBeNull();

      const created = await admin("put", `/api/it-assets/${a}/profile`, { cpu: "Core i5", ram: "16GB", ipAddress: "10.0.0.5", macAddress: "aa-bb-cc-dd-ee-ff", vlan: 20, osName: "Windows", osVersion: "11" });
      expect(created.status).toBe(200);
      expect(created.body.data).toMatchObject({ cpu: "Core i5", ipAddress: "10.0.0.5", macAddress: "AA:BB:CC:DD:EE:FF", vlan: 20 });

      const updated = await admin("put", `/api/it-assets/${a}/profile`, { ram: "32GB" });
      expect(updated.body.data).toMatchObject({ cpu: "Core i5", ram: "32GB", osName: "Windows" });
      const cleared = await admin("put", `/api/it-assets/${a}/profile`, { gpu: "", vlan: null, cpu: null });
      expect(cleared.body.data.cpu).toBeUndefined();
      expect(cleared.body.data.vlan).toBeUndefined();
      expect(await ItDeviceProfile.countDocuments({ asset: a })).toBe(1);
    });

    it("kiểm tra định dạng IP, MAC, VLAN và body rỗng -> 400", async () => {
      const a = await newItAsset();
      const url = `/api/it-assets/${a}/profile`;
      expect((await admin("put", url, { ipAddress: "999.1.1.1" })).status).toBe(400);
      expect((await admin("put", url, { ipAddress: "10.0.0" })).status).toBe(400);
      expect((await admin("put", url, { macAddress: "ZZ:BB:CC:DD:EE:FF" })).status).toBe(400);
      expect((await admin("put", url, { vlan: 5000 })).status).toBe(400);
      expect((await admin("put", url, {})).status).toBe(400);
      expect((await admin("put", url, { ipAddress: "fe80::1" })).status).toBe(200); // IPv6 hợp lệ
    });

    it("IP trùng thiết bị khác còn hoạt động: CẢNH BÁO nhưng vẫn lưu; thiết bị đã xoá/thanh lý không tính", async () => {
      const a = await newItAsset("Máy A");
      const b = await newItAsset("Máy B");
      const c = await newItAsset("Máy C");
      await admin("put", `/api/it-assets/${a}/profile`, { ipAddress: "192.168.1.10" });
      await Asset.updateOne({ _id: c }, { status: AssetStatus.DISPOSED });
      await ItDeviceProfile.create({ asset: c, ipAddress: "192.168.1.10" });

      const dup = await admin("put", `/api/it-assets/${b}/profile`, { ipAddress: "192.168.1.10" });
      expect(dup.status).toBe(200);
      expect(dup.body.data.ipAddress).toBe("192.168.1.10"); // vẫn lưu
      expect(dup.body.warnings).toHaveLength(1);
      expect(dup.body.warnings[0].code).toBe("DUPLICATE_IP");
      expect(dup.body.warnings[0].assets.map((x: any) => x._id)).toEqual([a]); // máy thanh lý không tính
      expect((await admin("get", `/api/it-assets/${b}/profile`)).body.warnings).toHaveLength(1);
      expect((await admin("put", `/api/it-assets/${b}/profile`, { ipAddress: "192.168.1.11" })).body.warnings).toEqual([]);
    });

    it("tài sản y tế không có hồ sơ CNTT: qua module CNTT -> 404; PUT đồng thời tạo đúng một hồ sơ", async () => {
      const med = (await admin("post", "/api/medical-assets", { category: medLeaf, department: deptId, name: "Máy thở 2" })).body.data._id;
      expect((await admin("put", `/api/it-assets/${med}/profile`, { cpu: "x" })).status).toBe(404);
      // Lớp phòng thủ thứ hai: service cũng từ chối tài sản y tế (không chỉ dựa vào chốt ở route).
      await expect(upsertItDeviceProfileService(med, { cpu: "x" })).rejects.toMatchObject({ status: 400 });
      await expect(assignAssetToLicenseService((await newLicense())._id, med)).rejects.toMatchObject({ status: 400 });
      expect((await admin("get", `/api/it-assets/${med}/profile`)).status).toBe(404);

      const a = await newItAsset();
      const results = await Promise.all(Array.from({ length: 6 }, (_v, i) => admin("put", `/api/it-assets/${a}/profile`, { hostname: `h${i}` })));
      expect(results.every((r) => r.status === 200)).toBe(true);
      expect(await ItDeviceProfile.countDocuments({ asset: a })).toBe(1);
    }, 60_000);
  });

  /* ------------------------------------------------------------------ */
  describe("cảnh báo bản quyền hết hạn", () => {
    it("gửi cho IT đúng 1 lần, bỏ qua vĩnh viễn / còn xa hạn / đã xoá mềm; đổi hạn thì được báo lại", async () => {
      await SoftwareLicense.deleteMany({});
      const soon = new Date(Date.now() + 10 * 86400000).toISOString();
      const far = new Date(Date.now() + 400 * 86400000).toISOString();
      const expired = new Date(Date.now() + 86400000).toISOString();
      const s1 = await newLicense({ softwareName: "Sắp hết", licenseType: "SUBSCRIPTION", expiresAt: soon });
      await newLicense({ softwareName: "Còn xa", licenseType: "SUBSCRIPTION", expiresAt: far });
      await newLicense({ softwareName: "Vĩnh viễn" });
      const deleted = await newLicense({ softwareName: "Đã xoá", licenseType: "SUBSCRIPTION", expiresAt: soon });
      await admin("delete", `/api/software-licenses/${deleted._id}`);
      const s2 = await newLicense({ softwareName: "Đã quá hạn", licenseType: "SUBSCRIPTION", expiresAt: expired });
      await SoftwareLicense.updateOne({ _id: s2._id }, { expiresAt: new Date(Date.now() - 5 * 86400000) });

      const before = await Notification.countDocuments({ type: NotificationType.SOFTWARE_LICENSE_EXPIRING });
      const run1 = await admin("post", "/api/software-licenses/alerts/run");
      expect(run1.body.data.expiring).toEqual({ checked: 2, notified: 2 });
      const notes = await Notification.find({ type: NotificationType.SOFTWARE_LICENSE_EXPIRING }).lean();
      expect(notes.length).toBeGreaterThan(before);
      expect(notes.some((n: any) => String(n.resourceId) === s1._id && n.resourceType === "SoftwareLicense")).toBe(true);

      expect((await runSoftwareLicenseAlertsService()).expiring).toEqual({ checked: 0, notified: 0 }); // không lặp lại
      await admin("put", `/api/software-licenses/${s1._id}`, { expiresAt: new Date(Date.now() + 5 * 86400000).toISOString() });
      expect((await runSoftwareLicenseAlertsService()).expiring).toEqual({ checked: 1, notified: 1 });
    });
  });

  /* ------------------------------------------------------------------ */
  describe("chứng từ bản quyền", () => {
    const uploaded: string[] = [];
    afterAll(async () => {
      for (const f of uploaded) fs.promises.unlink(f).catch(() => undefined);
    });

    it("tải lên, tải xuống đúng nội dung, thay file cũ (file cũ soft-delete); sai định dạng bị chặn", async () => {
      const lic = await newLicense();
      const url = `/api/software-licenses/${lic._id}`;
      expect((await admin("put", `${url}/proof-file`)).status).toBe(400); // thiếu file
      expect((await admin("get", `${url}/proof-file/download`)).status).toBe(404); // chưa có chứng từ

      const bad = await request(app).put(`${url}/proof-file`).set("Authorization", `Bearer ${adminToken}`).attach("proofFile", Buffer.from("x"), { filename: "a.exe", contentType: "application/x-msdownload" });
      expect(bad.status).toBe(400);

      const content = Buffer.from("%PDF-1.4 test chung tu 1");
      const up = await request(app).put(`${url}/proof-file`).set("Authorization", `Bearer ${adminToken}`).attach("proofFile", content, { filename: "hoa-don.pdf", contentType: "application/pdf" });
      expect(up.status).toBe(200);
      const first = await Upload.findById(up.body.data.proofFileId);
      expect(first).toBeTruthy();
      uploaded.push(require("../../shared/utils/uploadStorage.util").resolveUploadedFilePath(first!.fileUrl));

      const dl = await request(app).get(`${url}/proof-file/download`).set("Authorization", `Bearer ${adminToken}`).buffer(true).parse(((res: any, cb: any) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => cb(null, Buffer.concat(chunks)));
      }) as any);
      expect(dl.status).toBe(200);
      expect((dl.body as Buffer).toString()).toBe(content.toString());

      const up2 = await request(app).put(`${url}/proof-file`).set("Authorization", `Bearer ${adminToken}`).attach("proofFile", Buffer.from("%PDF-1.4 chung tu 2"), { filename: "hoa-don-2.pdf", contentType: "application/pdf" });
      expect(up2.status).toBe(200);
      expect(up2.body.data.proofFileId).not.toBe(up.body.data.proofFileId);
      expect((await Upload.findById(first!._id))!.isDeleted).toBe(true);
      const second = await Upload.findById(up2.body.data.proofFileId);
      uploaded.push(require("../../shared/utils/uploadStorage.util").resolveUploadedFilePath(second!.fileUrl));
    });
  });

  /* ------------------------------------------------------------------ */
  describe("script chép Asset.specs sang hồ sơ CNTT", () => {
    const mkAsset = async (code: string, assetType: string, specs: Record<string, unknown>) => {
      const res = await Asset.collection.insertOne({
        assetCode: code,
        name: code,
        assetType,
        category: new Types.ObjectId(assetType === "IT" ? itLeaf : medLeaf),
        department: new Types.ObjectId(deptId),
        status: "IN_STOCK",
        isActive: true,
        specs,
      });
      return res.insertedId;
    };

    it("xem trước không ghi; apply chép đúng khoá, giữ specs, không đụng máy y tế, không ghi đè hồ sơ có sẵn, idempotent", async () => {
      await ItDeviceProfile.deleteMany({});
      const pc1 = await mkAsset("SPEC-PC1", "IT", { cpu: "i5", ram: "16GB", storage: "512GB", ip: "10.1.1.1", firmware: "1.2", xuatXu: "VN" });
      const pc2 = await mkAsset("SPEC-PC2", "IT", { cpu: "i7", ip: "10.1.1.1" }); // IP trùng pc1
      const sw = await mkAsset("SPEC-SW", "IT", { lanIp: "192.168.0.1", wanIp: "8.8.8.8", ports: 24 }); // thiết bị mạng: giữ ở specs
      const bad = await mkAsset("SPEC-BAD", "IT", { ip: "300.1.1.1", ram: 8 }); // IP sai định dạng; ram dạng số
      const has = await mkAsset("SPEC-HAS", "IT", { cpu: "Cũ", ram: "4GB" });
      const med = await mkAsset("SPEC-MED", "MEDICAL", { cpu: "x", ip: "1.1.1.1" });
      await ItDeviceProfile.create({ asset: has, cpu: "Đã nhập tay" });

      const preview = await runItDeviceSpecsMigration({ apply: false });
      expect(await ItDeviceProfile.countDocuments({ asset: { $in: [pc1, pc2, sw, bad] } })).toBe(0);
      expect(preview).toMatchObject({ apply: false, profilesCreated: 3, profilesUpdated: 1, fieldsSkippedExisting: 1 });
      expect(preview.invalidIps).toEqual([{ assetCode: "SPEC-BAD", value: "300.1.1.1" }]);
      expect(preview.duplicateIps).toEqual([{ ip: "10.1.1.1", assetCodes: ["SPEC-PC1", "SPEC-PC2"] }]);
      expect(preview.keptInSpecs).toMatchObject({ xuatXu: 1, lanIp: 1, wanIp: 1, ports: 1 });
      expect(preview.assetsWithLanOrWanIp).toEqual(["SPEC-SW"]);

      const applied = await runItDeviceSpecsMigration({ apply: true });
      expect(applied.profilesCreated).toBe(3);
      const p1 = await ItDeviceProfile.findOne({ asset: pc1 }).lean();
      expect(p1).toMatchObject({ cpu: "i5", ram: "16GB", storage: "512GB", ipAddress: "10.1.1.1", firmwareVersion: "1.2" });
      expect((await ItDeviceProfile.findOne({ asset: bad }).lean())).toMatchObject({ ram: "8" });
      expect((await ItDeviceProfile.findOne({ asset: bad }).lean())!.ipAddress).toBeUndefined();
      expect(await ItDeviceProfile.findOne({ asset: sw })).toBeNull(); // không có khoá chép được
      const existing = await ItDeviceProfile.findOne({ asset: has }).lean();
      expect(existing).toMatchObject({ cpu: "Đã nhập tay", ram: "4GB" }); // không ghi đè cpu, bổ sung ram
      expect(await ItDeviceProfile.findOne({ asset: med })).toBeNull();
      // specs giữ nguyên
      expect((await Asset.collection.findOne({ _id: pc1 }))!.specs).toMatchObject({ cpu: "i5", ip: "10.1.1.1", xuatXu: "VN" });

      const again = await runItDeviceSpecsMigration({ apply: true });
      expect(again).toMatchObject({ profilesCreated: 0, profilesUpdated: 0, assetsToCopy: 0 });
      expect(mongoose.connection.readyState).toBe(1);
    });
  });
});

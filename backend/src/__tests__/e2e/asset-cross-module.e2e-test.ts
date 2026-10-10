/**
 * DEV-118 (tách module Tài sản, GĐ 6 — liên module) — E2E qua HTTP/service THẬT (supertest + MongoDB in-memory):
 *  1. Cảnh báo theo loại: người nhận CNTT = IT; thiết bị y tế = Phòng Vật tư-TTB và IT, mỗi user 1 thông báo,
 *     không ai nhận nhầm, không đánh dấu "đã gửi" khi không có người nhận.
 *  2. Dashboard tài sản theo loại (`?assetType=`): số liệu đúng, giá trị sai -> 400, thiếu quyền xem loại -> 403.
 *  3. Tra cứu tài sản dùng chung cho Tài liệu / Hợp đồng (`GET /api/assets/lookup-options`): một trong hai quyền xem,
 *     chỉ trả loại người gọi xem được, chỉ trường tối thiểu.
 *
 * CLAUDE.md §18/§32: route mới bị chặn đúng 401/403 (kiểm bằng user có đúng quyền / không có quyền).
 */
import path from "path";
import YAML from "yamljs";
import request from "supertest";
import { startE2EDatabase, stopE2EDatabase } from "./setup";
import { seedDepartments, seedRbac, seedUser } from "./seedTestData";
import { Permission } from "../../models/rbac/permission.model";
import { Role } from "../../models/rbac/role.model";
import { User } from "../../models/users/user.model";
import { Asset, AssetStatus } from "../../models/assets/asset.model";
import { Notification, NotificationType } from "../../models/notifications/notification.model";
import { MedicalDeviceProfile } from "../../models/medicalDevices/medicalDeviceProfile.model";
import { MedicalDeviceClass } from "../../interfaces/assets/medicalDevice.interface";
import { OperatorCertificate } from "../../models/medicalDevices/operatorCertificate.model";
import { generateAccessToken } from "../../shared/helpers/auth.helper";
import { runAssetAlertsService } from "../../services/assets/assetDevice/assetAlerts.service";
import { runMedicalDeviceAlertsService } from "../../services/assets/medicalDevice/medicalDeviceAlerts.service";

const PASSWORD = "Password123";
const DAY = 24 * 60 * 60 * 1000;

describe("E2E — Tài sản liên module (DEV-118, Giai đoạn 6)", () => {
  let app: import("express").Express;
  let roleIds: Record<string, string> = {};
  let deptId = "";
  let adminToken = "";
  let itLeaf = "";
  let medLeaf = "";
  const users: Record<string, string> = {};
  const tokens: Record<string, string> = {};
  const minimal = new Map<string, string>();

  const call = (method: string, url: string, token?: string, body?: unknown) => {
    let r = (request(app) as any)[method](url);
    if (token) r = r.set("Authorization", `Bearer ${token}`);
    return body === undefined ? r : r.send(body);
  };
  const admin = (method: string, url: string, body?: unknown) => call(method, url, adminToken, body);

  /** Token của user có ĐÚNG các quyền liệt kê (không thêm quyền nào khác). */
  const tokenWithOnly = async (...perms: string[]): Promise<string> => {
    const key = perms.join("+");
    if (!minimal.has(key)) {
      const found = await Permission.find({ name: { $in: perms } });
      if (found.length !== perms.length) throw new Error(`thiếu permission trong ${key}`);
      const role = await Role.create({ name: `T_${minimal.size}`, permissions: found.map((p) => p._id) });
      const user = await seedUser({ username: `m_${minimal.size}`, password: PASSWORD, fullName: key, roleId: String(role._id) });
      minimal.set(key, generateAccessToken({ id: user._id }));
    }
    return minimal.get(key)!;
  };

  let counter = 0;
  const makeAsset = async (assetType: "IT" | "MEDICAL", extra: Record<string, unknown> = {}) => {
    const res = await admin("post", assetType === "IT" ? "/api/it-assets" : "/api/medical-assets", {
      category: assetType === "IT" ? itLeaf : medLeaf,
      department: deptId,
      name: `${assetType === "IT" ? "Máy IT" : "Máy y tế"} ${++counter}`,
    });
    expect(res.status).toBe(201);
    const id = res.body.data._id as string;
    if (Object.keys(extra).length) await Asset.updateOne({ _id: id }, extra);
    return id;
  };

  /** Mỗi user trong `Notification` của loại này (đếm theo người nhận). */
  const countsByRecipient = async (type: string, resourceId?: string) => {
    const filter: Record<string, unknown> = { type };
    if (resourceId) filter.resourceId = resourceId;
    const rows = await Notification.find(filter).lean();
    const out: Record<string, number> = {};
    for (const r of rows) {
      const name = Object.entries(users).find(([, id]) => id === String(r.recipient))?.[0] ?? String(r.recipient);
      out[name] = (out[name] ?? 0) + 1;
    }
    return out;
  };

  const resetAlertState = async () => {
    await Notification.deleteMany({});
    await Asset.updateMany({}, { $set: { warrantyAlertSentAt: null }, $unset: { warrantyExpiredAt: "" } });
  };

  beforeAll(async () => {
    await startE2EDatabase();
    app = (await import("../../app")).default;
    roleIds = await seedRbac();
    deptId = (await seedDepartments()).deptA;

    for (const [key, role] of [
      ["ADMIN", "ADMIN"],
      ["IT", "IT"],
      ["VTTTB", "PHONG_VAT_TU_TTB"],
      ["TRUONG_KHOA", "TRUONG_KHOA"],
      ["USER", "USER"],
    ] as const) {
      const u = await seedUser({ username: `x_${key}`, password: PASSWORD, fullName: key, roleId: roleIds[role], departmentId: deptId });
      users[key] = String(u._id);
      tokens[key] = generateAccessToken({ id: u._id });
    }
    adminToken = tokens.ADMIN;

    const itRoot = await admin("post", "/api/it-assets/categories", { code: "CNTT", name: "CNTT" });
    itLeaf = (await admin("post", "/api/it-assets/categories", { code: "PC", name: "PC", parentCategory: itRoot.body.data._id })).body.data._id;
    const medRoot = await admin("post", "/api/medical-assets/categories", { code: "TBYT", name: "TBYT" });
    medLeaf = (await admin("post", "/api/medical-assets/categories", { code: "VENT", name: "Máy thở", parentCategory: medRoot.body.data._id })).body.data._id;
  }, 120_000);

  afterAll(async () => {
    await stopE2EDatabase();
  });

  /* ================================================================== */
  describe("Cảnh báo bảo hành / bảo trì theo loại", () => {
    const expired = new Date(Date.now() - 400 * DAY);

    beforeEach(async () => {
      await User.updateMany({}, { isActive: true });
      await resetAlertState();
    });

    it("thiết bị CNTT -> chỉ IT; thiết bị y tế -> Vật tư-TTB và IT; không ai khác nhận; mỗi user đúng 1 thông báo", async () => {
      const itAsset = await makeAsset("IT", { warrantyExpiredAt: expired });
      const medAsset = await makeAsset("MEDICAL", { warrantyExpiredAt: expired });

      const result = await runAssetAlertsService();
      expect(result.warranty).toEqual({ checked: 2, notified: 2 });

      expect(await countsByRecipient(NotificationType.ASSET_WARRANTY_EXPIRING, itAsset)).toEqual({ IT: 1 });
      expect(await countsByRecipient(NotificationType.ASSET_WARRANTY_EXPIRING, medAsset)).toEqual({ VTTTB: 1, IT: 1 });
    });

    it("bảo trì quá hạn cũng theo loại", async () => {
      const longAgo = new Date(Date.now() - 30 * DAY);
      const itAsset = await makeAsset("IT", { status: AssetStatus.UNDER_MAINTENANCE, maintenanceStartedAt: longAgo });
      const medAsset = await makeAsset("MEDICAL", { status: AssetStatus.UNDER_MAINTENANCE, maintenanceStartedAt: longAgo });

      const result = await runAssetAlertsService();
      expect(result.maintenance).toEqual({ checked: 2, notified: 2 });
      expect(await countsByRecipient(NotificationType.ASSET_MAINTENANCE_OVERDUE, itAsset)).toEqual({ IT: 1 });
      expect(await countsByRecipient(NotificationType.ASSET_MAINTENANCE_OVERDUE, medAsset)).toEqual({ VTTTB: 1, IT: 1 });
      await Asset.updateMany({}, { status: AssetStatus.IN_STOCK, $unset: { maintenanceStartedAt: "" } });
    });

    it("chạy lại không gửi trùng (cảnh báo bảo hành chỉ 1 lần)", async () => {
      await makeAsset("MEDICAL", { warrantyExpiredAt: expired });
      await runAssetAlertsService();
      const second = await runAssetAlertsService();
      expect(second.warranty).toEqual({ checked: 0, notified: 0 });
      expect(await Notification.countDocuments({ type: NotificationType.ASSET_WARRANTY_EXPIRING })).toBe(2);
    });

    it("không có user IT nào: thiết bị CNTT KHÔNG bị đánh dấu đã gửi, thiết bị y tế vẫn gửi cho Vật tư-TTB", async () => {
      const itAsset = await makeAsset("IT", { warrantyExpiredAt: expired });
      const medAsset = await makeAsset("MEDICAL", { warrantyExpiredAt: expired });
      await User.updateOne({ _id: users.IT }, { isActive: false });

      const result = await runAssetAlertsService();
      expect(result.warranty).toEqual({ checked: 1, notified: 1 });
      expect((await Asset.findById(itAsset))!.warrantyAlertSentAt).toBeFalsy();
      expect((await Asset.findById(medAsset))!.warrantyAlertSentAt).toBeTruthy();
      expect(await countsByRecipient(NotificationType.ASSET_WARRANTY_EXPIRING)).toEqual({ VTTTB: 1 });
    });

    it("không có user Vật tư-TTB nào: thiết bị y tế vẫn gửi cho IT", async () => {
      const medAsset = await makeAsset("MEDICAL", { warrantyExpiredAt: expired });
      await User.updateOne({ _id: users.VTTTB }, { isActive: false });

      const result = await runAssetAlertsService();
      expect(result.warranty).toEqual({ checked: 1, notified: 1 });
      expect(await countsByRecipient(NotificationType.ASSET_WARRANTY_EXPIRING, medAsset)).toEqual({ IT: 1 });
    });

    it("không ai nhận được ở cả hai role: không đánh dấu đã gửi (cron thử lại được sau)", async () => {
      const medAsset = await makeAsset("MEDICAL", { warrantyExpiredAt: expired });
      await User.updateMany({ _id: { $in: [users.IT, users.VTTTB] } }, { isActive: false });

      const result = await runAssetAlertsService();
      expect(result.warranty).toEqual({ checked: 0, notified: 0 });
      expect((await Asset.findById(medAsset))!.warrantyAlertSentAt).toBeFalsy();
    });

    it("chạy tay theo module vẫn chỉ quét đúng loại và gửi đúng người", async () => {
      const itAsset = await makeAsset("IT", { warrantyExpiredAt: expired });
      await makeAsset("MEDICAL", { warrantyExpiredAt: expired });
      const run = await admin("post", "/api/it-assets/alerts/run");
      expect(run.status).toBe(200);
      expect(run.body.data.warranty).toEqual({ checked: 1, notified: 1 });
      expect(await countsByRecipient(NotificationType.ASSET_WARRANTY_EXPIRING, itAsset)).toEqual({ IT: 1 });
    });
  });

  /* ================================================================== */
  describe("Cảnh báo hiệu chuẩn / giấy phép / chứng chỉ vận hành (y tế)", () => {
    beforeEach(async () => {
      await User.updateMany({}, { isActive: true });
      await Notification.deleteMany({});
      await MedicalDeviceProfile.deleteMany({});
      await OperatorCertificate.deleteMany({});
    });

    it("hiệu chuẩn và giấy phép lưu hành -> Vật tư-TTB và IT, mỗi user 1 lần, không ai khác", async () => {
      const medAsset = await makeAsset("MEDICAL");
      await MedicalDeviceProfile.create({
        asset: medAsset,
        deviceClass: MedicalDeviceClass.B,
        requiresCalibration: true,
        nextCalibrationDueDate: new Date(Date.now() - 5 * DAY),
        licenseExpiredAt: new Date(Date.now() - 5 * DAY),
      });

      const result = await runMedicalDeviceAlertsService();
      expect(result.calibration).toEqual({ checked: 1, notified: 1 });
      expect(result.license).toEqual({ checked: 1, notified: 1 });
      expect(await countsByRecipient(NotificationType.MEDICAL_DEVICE_CALIBRATION_DUE)).toEqual({ VTTTB: 1, IT: 1 });
      expect(await countsByRecipient(NotificationType.MEDICAL_DEVICE_LICENSE_EXPIRING)).toEqual({ VTTTB: 1, IT: 1 });
    });

    it("chứng chỉ vận hành -> Vật tư-TTB và IT, cộng thông báo riêng cho người có chứng chỉ", async () => {
      await OperatorCertificate.create({
        user: users.USER,
        deviceCategory: medLeaf,
        issuedAt: new Date(Date.now() - 400 * DAY),
        expiresAt: new Date(Date.now() - 2 * DAY),
      });

      const result = await runMedicalDeviceAlertsService();
      expect(result.operatorCertificate).toEqual({ checked: 1, notified: 1 });
      expect(await countsByRecipient(NotificationType.OPERATOR_CERTIFICATE_EXPIRING)).toEqual({ VTTTB: 1, IT: 1, USER: 1 });
    });

    it("không có người nhận nào: không đánh dấu đã gửi", async () => {
      const medAsset = await makeAsset("MEDICAL");
      await MedicalDeviceProfile.create({ asset: medAsset, deviceClass: MedicalDeviceClass.B, requiresCalibration: true, nextCalibrationDueDate: new Date(Date.now() - 5 * DAY) });
      await User.updateMany({ _id: { $in: [users.IT, users.VTTTB] } }, { isActive: false });

      const result = await runMedicalDeviceAlertsService();
      expect(result.calibration).toEqual({ checked: 0, notified: 0 });
      expect((await MedicalDeviceProfile.findOne({ asset: medAsset }))!.calibrationAlertSentAt).toBeFalsy();
    });
  });

  /* ================================================================== */
  describe("Dashboard tài sản theo loại", () => {
    const SUMMARY = "/api/dashboard/assets/summary";
    let itIds: string[] = [];
    let medIds: string[] = [];

    beforeAll(async () => {
      await Notification.deleteMany({});
      await Asset.deleteMany({});
      itIds = [];
      medIds = [];
      for (let i = 0; i < 3; i++) itIds.push(await makeAsset("IT", { purchasePrice: 100 }));
      for (let i = 0; i < 2; i++) medIds.push(await makeAsset("MEDICAL", { purchasePrice: 1000 }));
      // 1 tài sản y tế đã xoá mềm: không được tính vào bất kỳ số liệu nào.
      const gone = await makeAsset("MEDICAL", { purchasePrice: 5000 });
      await admin("delete", `/api/medical-assets/${gone}`);
      // Bảo hành sắp hết hạn / bảo trì quá hạn: 1 CNTT + 1 y tế mỗi loại.
      const soon = new Date(Date.now() + 5 * DAY);
      const longAgo = new Date(Date.now() - 30 * DAY);
      await Asset.updateOne({ _id: itIds[0] }, { warrantyExpiredAt: soon });
      await Asset.updateOne({ _id: medIds[0] }, { warrantyExpiredAt: soon });
      await Asset.updateOne({ _id: itIds[1] }, { status: AssetStatus.UNDER_MAINTENANCE, maintenanceStartedAt: longAgo });
      await Asset.updateOne({ _id: medIds[1] }, { status: AssetStatus.UNDER_MAINTENANCE, maintenanceStartedAt: longAgo });
    });

    it("không truyền assetType: tổng cả hai loại (như trước) kèm cơ cấu theo loại", async () => {
      const res = await admin("get", SUMMARY);
      expect(res.status).toBe(200);
      expect(res.body.data.totalAssets).toBe(5);
      expect(res.body.data.totalPurchaseValue).toBe(3 * 100 + 2 * 1000);
      expect(res.body.data.byAssetType).toEqual([
        { assetType: "IT", count: 3 },
        { assetType: "MEDICAL", count: 2 },
      ]);
    });

    it("assetType=IT / MEDICAL: chỉ đếm đúng loại; tổng hai loại bằng số không lọc", async () => {
      const it = await admin("get", `${SUMMARY}?assetType=IT`);
      const med = await admin("get", `${SUMMARY}?assetType=MEDICAL`);
      expect(it.status).toBe(200);
      expect(it.body.data.totalAssets).toBe(3);
      expect(it.body.data.totalPurchaseValue).toBe(300);
      expect(it.body.data.byAssetType).toEqual([{ assetType: "IT", count: 3 }]);
      expect(med.body.data.totalAssets).toBe(2);
      expect(med.body.data.totalPurchaseValue).toBe(2000);
      expect(it.body.data.totalAssets + med.body.data.totalAssets).toBe((await admin("get", SUMMARY)).body.data.totalAssets);
    });

    it("danh sách bảo hành sắp hết hạn và bảo trì quá hạn lọc theo loại", async () => {
      const all = await admin("get", "/api/dashboard/assets/warranty-expiring");
      expect(all.body.pagination.total).toBe(2);
      const it = await admin("get", "/api/dashboard/assets/warranty-expiring?assetType=IT");
      expect(it.body.data.map((a: any) => String(a._id))).toEqual([itIds[0]]);
      const med = await admin("get", "/api/dashboard/assets/warranty-expiring?assetType=MEDICAL");
      expect(med.body.data.map((a: any) => String(a._id))).toEqual([medIds[0]]);

      const mAll = await admin("get", "/api/dashboard/assets/maintenance-overdue");
      expect(mAll.body.pagination.total).toBe(2);
      const mIt = await admin("get", "/api/dashboard/assets/maintenance-overdue?assetType=IT");
      expect(mIt.body.data.map((a: any) => String(a._id))).toEqual([itIds[1]]);
      const mMed = await admin("get", "/api/dashboard/assets/maintenance-overdue?assetType=MEDICAL");
      expect(mMed.body.data.map((a: any) => String(a._id))).toEqual([medIds[1]]);
    });

    it("bộ nhớ đệm không trộn số liệu giữa các loại (gọi lần lượt, lặp lại)", async () => {
      for (let i = 0; i < 2; i++) {
        expect((await admin("get", `${SUMMARY}?assetType=IT`)).body.data.totalAssets).toBe(3);
        expect((await admin("get", `${SUMMARY}?assetType=MEDICAL`)).body.data.totalAssets).toBe(2);
        expect((await admin("get", SUMMARY)).body.data.totalAssets).toBe(5);
      }
    });

    it("assetType sai giá trị -> 400 (cả ba route)", async () => {
      for (const p of ["summary", "warranty-expiring", "maintenance-overdue"]) {
        const res = await admin("get", `/api/dashboard/assets/${p}?assetType=SOMETHING`);
        expect(res.status).toBe(400);
      }
    });

    it("RBAC: không token 401; thiếu DASHBOARD_READ 403; có DASHBOARD_READ nhưng thiếu quyền xem loại 403", async () => {
      for (const p of ["summary", "warranty-expiring", "maintenance-overdue"]) {
        const url = `/api/dashboard/assets/${p}`;
        expect((await call("get", url)).status).toBe(401);
        expect((await call("get", `${url}?assetType=IT`)).status).toBe(401);
        // Có quyền xem cả hai loại nhưng không có DASHBOARD_READ.
        const noDash = await tokenWithOnly("IT_ASSET_VIEW", "MEDICAL_ASSET_VIEW");
        expect((await call("get", url, noDash)).status).toBe(403);
        expect((await call("get", `${url}?assetType=IT`, noDash)).status).toBe(403);
        // Có DASHBOARD_READ + chỉ xem CNTT.
        const itOnly = await tokenWithOnly("DASHBOARD_READ", "IT_ASSET_VIEW");
        expect((await call("get", `${url}?assetType=IT`, itOnly)).status).toBe(200);
        expect((await call("get", `${url}?assetType=MEDICAL`, itOnly)).status).toBe(403);
        expect((await call("get", url, itOnly)).status).toBe(200); // không lọc = tổng hợp như trước
        // Có DASHBOARD_READ + chỉ xem y tế.
        const medOnly = await tokenWithOnly("DASHBOARD_READ", "MEDICAL_ASSET_VIEW");
        expect((await call("get", `${url}?assetType=MEDICAL`, medOnly)).status).toBe(200);
        expect((await call("get", `${url}?assetType=IT`, medOnly)).status).toBe(403);
        // Có DASHBOARD_READ nhưng không quyền xem tài sản nào.
        const dashOnly = await tokenWithOnly("DASHBOARD_READ");
        expect((await call("get", `${url}?assetType=IT`, dashOnly)).status).toBe(403);
        expect((await call("get", `${url}?assetType=MEDICAL`, dashOnly)).status).toBe(403);
      }
    });
  });

  /* ================================================================== */
  describe("Tra cứu tài sản dùng chung — GET /api/assets/lookup-options", () => {
    const URL = "/api/assets/lookup-options";
    let itIds: string[] = [];
    let medIds: string[] = [];

    beforeAll(async () => {
      await User.updateMany({}, { isActive: true });
      await Asset.deleteMany({});
      itIds = [];
      medIds = [];
      for (let i = 0; i < 3; i++) itIds.push(await makeAsset("IT", { purchasePrice: 777, serialNumber: `SN-IT-${i}` }));
      for (let i = 0; i < 2; i++) medIds.push(await makeAsset("MEDICAL", { purchasePrice: 888, serialNumber: `SN-MED-${i}` }));
      const gone = await makeAsset("IT");
      await admin("delete", `/api/it-assets/${gone}`);
      await Asset.updateOne({ _id: itIds[0] }, { name: "Máy chủ (Đặc biệt) [A]" });
    });

    it("OpenAPI có mô tả route này (GET)", () => {
      const doc: any = YAML.load(path.join(__dirname, "../../docs/openAPI.yaml"));
      expect(doc.paths["/api/assets/lookup-options"]?.get).toBeDefined();
      expect(doc.paths["/api/assets/lookup-options/{id}"]?.get).toBeDefined();
    });

    it("GET /lookup-options/:id — biết loại của 1 tài sản; loại không xem được -> 404; id sai -> 400; không token 401", async () => {
      const itId = itIds[1];
      const medId = medIds[0];
      const both = await call("get", `${URL}/${itId}`, tokens.IT);
      expect(both.status).toBe(200);
      expect(both.body.data).toMatchObject({ _id: itId, assetType: "IT", isActive: true });
      expect(Object.keys(both.body.data).sort()).toEqual(["_id", "assetCode", "assetType", "category", "department", "isActive", "name", "status"].sort());
      expect((await call("get", `${URL}/${medId}`, tokens.IT)).body.data.assetType).toBe("MEDICAL");

      const itOnly = await tokenWithOnly("IT_ASSET_VIEW");
      expect((await call("get", `${URL}/${itId}`, itOnly)).status).toBe(200);
      expect((await call("get", `${URL}/${medId}`, itOnly)).status).toBe(404); // loại không xem được: không lộ sự tồn tại
      const medOnly = await tokenWithOnly("MEDICAL_ASSET_VIEW");
      expect((await call("get", `${URL}/${itId}`, medOnly)).status).toBe(404);
      expect((await call("get", `${URL}/${medId}`, medOnly)).status).toBe(200);

      expect((await call("get", `${URL}/${itId}`)).status).toBe(401);
      expect((await call("get", `${URL}/${itId}`, await tokenWithOnly("DASHBOARD_READ"))).status).toBe(403);
      expect((await admin("get", `${URL}/not-an-id`)).status).toBe(400);
      expect((await admin("get", `${URL}/507f1f77bcf86cd799439099`)).status).toBe(404);
    });

    it("GET /lookup-options/:id trả cả tài sản đã xoá mềm (tài liệu/hợp đồng còn tham chiếu), kèm isActive=false", async () => {
      const gone = await makeAsset("MEDICAL");
      await admin("delete", `/api/medical-assets/${gone}`);
      const res = await admin("get", `${URL}/${gone}`);
      expect(res.status).toBe(200);
      expect(res.body.data.isActive).toBe(false);
      await Asset.deleteOne({ _id: gone });
    });

    it("không token 401; không có quyền xem loại nào 403", async () => {
      expect((await call("get", URL)).status).toBe(401);
      expect((await call("get", URL, await tokenWithOnly("DASHBOARD_READ"))).status).toBe(403);
    });

    it("người xem được cả hai loại thấy cả hai, chỉ tài sản đang hoạt động", async () => {
      const res = await call("get", URL, tokens.IT);
      expect(res.status).toBe(200);
      expect(res.body.pagination.total).toBe(5);
      const types = new Set(res.body.data.map((a: any) => a.assetType));
      expect(types).toEqual(new Set(["IT", "MEDICAL"]));
    });

    it("chỉ trả trường tối thiểu để chọn (không giá, serial, người dùng…)", async () => {
      const res = await call("get", URL, tokens.IT);
      const keys = Object.keys(res.body.data[0]).sort();
      expect(keys).toEqual(["_id", "assetCode", "assetType", "category", "department", "name", "status"].sort());
      expect(JSON.stringify(res.body)).not.toContain("777");
      expect(JSON.stringify(res.body)).not.toContain("SN-IT");
    });

    it("chỉ xem được CNTT: không bao giờ thấy thiết bị y tế; yêu cầu loại y tế rõ ràng -> 403", async () => {
      const itOnly = await tokenWithOnly("IT_ASSET_VIEW");
      const res = await call("get", URL, itOnly);
      expect(res.status).toBe(200);
      expect(res.body.pagination.total).toBe(3);
      expect(res.body.data.every((a: any) => a.assetType === "IT")).toBe(true);
      expect((await call("get", `${URL}?assetType=MEDICAL`, itOnly)).status).toBe(403);
      expect((await call("get", `${URL}?assetType=IT`, itOnly)).body.pagination.total).toBe(3);
    });

    it("chỉ xem được y tế: không bao giờ thấy thiết bị CNTT", async () => {
      const medOnly = await tokenWithOnly("MEDICAL_ASSET_VIEW");
      const res = await call("get", URL, medOnly);
      expect(res.body.pagination.total).toBe(2);
      expect(res.body.data.every((a: any) => a.assetType === "MEDICAL")).toBe(true);
      expect((await call("get", `${URL}?assetType=IT`, medOnly)).status).toBe(403);
    });

    it("ADMIN thấy cả hai loại và lọc được theo loại", async () => {
      expect((await admin("get", URL)).body.pagination.total).toBe(5);
      expect((await admin("get", `${URL}?assetType=MEDICAL`)).body.data.map((a: any) => String(a._id)).sort()).toEqual([...medIds].sort());
    });

    it("tìm theo từ khoá (tên/mã) an toàn với ký tự đặc biệt; phân trang; trần limit 100", async () => {
      const special = await admin("get", `${URL}?keyword=${encodeURIComponent("(Đặc biệt) [A]")}`);
      expect(special.status).toBe(200);
      expect(special.body.data.map((a: any) => String(a._id))).toEqual([itIds[0]]);
      const broken = await admin("get", `${URL}?keyword=${encodeURIComponent("([")}`);
      expect(broken.status).toBe(200);
      expect(broken.body.data).toEqual([]);

      const page1 = await admin("get", `${URL}?limit=2&page=1`);
      const page3 = await admin("get", `${URL}?limit=2&page=3`);
      expect(page1.body.data).toHaveLength(2);
      expect(page1.body.pagination).toMatchObject({ total: 5, totalPages: 3 });
      expect(page3.body.data).toHaveLength(1);

      expect((await admin("get", `${URL}?limit=101`)).status).toBe(400);
      expect((await admin("get", `${URL}?assetType=OTHER`)).status).toBe(400);
    });

    it("tài sản đã xoá mềm không xuất hiện", async () => {
      const res = await admin("get", URL);
      const names = res.body.data.map((a: any) => a.name);
      expect(names).toHaveLength(5);
      expect(await Asset.countDocuments({ isActive: false })).toBe(1);
    });
  });
});

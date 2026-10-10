/**
 * DEV-112 (tách module Tài sản, GĐ 1) — E2E: các quy tắc về loại tài sản
 * (docs/development/ASSET_MODULE_SPLIT_PLAN.md mục 4.2).
 * GĐ 8 (DEV-120): route cũ `/api/assets*` đã gỡ — các ca chạy qua `/api/it-assets` / `/api/medical-assets`;
 * ca CHÉO LOẠI (module đã chặn bằng cô lập, HTTP không còn đi tới) gọi thẳng service để vẫn kiểm chốt phòng thủ ở tầng service.
 *
 *   - Loại tài sản lấy từ gốc danh mục; client không tự gửi được.
 *   - Đổi danh mục không được đổi loại tài sản.
 *   - Hồ sơ y tế chỉ cho tài sản y tế; chứng chỉ vận hành chỉ cho danh mục y tế.
 *   - Danh mục gốc bắt buộc chọn loại; con kế thừa; đổi nhánh bị chặn khi còn tài sản;
 *     danh mục không thuộc nhánh nào không khôi phục được, không dùng cho tài sản.
 */
import request from "supertest";
import { startE2EDatabase, stopE2EDatabase } from "./setup";
import { seedDepartments, seedRbac, seedUser } from "./seedTestData";
import { AssetCategory } from "../../models/assets/assetCategory.model";
import { Asset } from "../../models/assets/asset.model";
import { MedicalDeviceProfile } from "../../models/medicalDevices/medicalDeviceProfile.model";
import { createAssetCategoryService, restoreAssetCategoryService, updateAssetCategoryService } from "../../services/assets/assetDevice/assetCategory.service";
import { createMedicalDeviceProfileService } from "../../services/assets/medicalDevice/medicalDevice.service";

const PASSWORD = "Password123";

describe("E2E — Quy tắc loại tài sản (DEV-112)", () => {
  let app: import("express").Express;
  let token: string;
  let deptA: string;
  let userId: string;
  const ids: Record<string, string> = {};

  const api = () => ({
    post: (url: string, body: unknown) => request(app).post(url).set("Authorization", `Bearer ${token}`).send(body as object),
    put: (url: string, body: unknown) => request(app).put(url).set("Authorization", `Bearer ${token}`).send(body as object),
    patch: (url: string) => request(app).patch(url).set("Authorization", `Bearer ${token}`),
    del: (url: string) => request(app).delete(url).set("Authorization", `Bearer ${token}`),
    get: (url: string) => request(app).get(url).set("Authorization", `Bearer ${token}`),
  });

  /** Module của một khoá danh mục/tài sản: MED_* -> y tế, còn lại -> CNTT. */
  const base = (key: string) => (key.startsWith("MED") || key === "medAsset" ? "/api/medical-assets" : "/api/it-assets");
  /** Chạy service và trả về { status, message } như một phản hồi HTTP (ApiError.status). */
  const viaService = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      return { status: 200, message: "" };
    } catch (err: any) {
      return { status: err.status as number, message: String(err.message) };
    }
  };

  const category = async (code: string, body: Record<string, unknown>) => {
    const res = await api().post(`${base(code)}/categories`, { code, name: `DM ${code}`, ...body });
    expect(res.status).toBe(201);
    ids[code] = res.body.data._id;
  };
  const createAsset = (cat: string, extra: Record<string, unknown> = {}) =>
    api().post(base(cat), { category: ids[cat], department: deptA, name: `TS ${cat}`, ...extra });

  beforeAll(async () => {
    await startE2EDatabase();
    app = (await import("../../app")).default;
    const roleIds = await seedRbac();
    ({ deptA } = await seedDepartments());
    const admin = await seedUser({ username: "dev112_admin", password: PASSWORD, fullName: "Admin", roleId: roleIds.ADMIN, departmentId: deptA });
    userId = admin._id.toString();
    token = (await request(app).post("/api/auths/login").send({ username: "dev112_admin", password: PASSWORD })).body.data.accessToken;

    await category("IT_ROOT", { assetType: "IT" });
    await category("IT_LEAF", { parentCategory: ids.IT_ROOT });
    await category("IT_LEAF2", { parentCategory: ids.IT_ROOT });
    await category("MED_ROOT", { assetType: "MEDICAL" });
    await category("MED_LEAF", { parentCategory: ids.MED_ROOT });
    await category("EMPTY_IT", { parentCategory: ids.IT_ROOT });
    await category("EMPTY_IT_CHILD", { parentCategory: ids.EMPTY_IT });
  }, 60_000);

  afterAll(async () => {
    await stopE2EDatabase();
  });

  describe("danh mục", () => {
    it("tạo gốc KHÔNG chọn loại: module tự gán loại của module (201); tầng service không có module → 400", async () => {
      const res = await api().post("/api/it-assets/categories", { code: "NO_TYPE", name: "x" });
      expect(res.status).toBe(201);
      expect(res.body.data.assetType).toBe("IT");
      const direct = await viaService(() => createAssetCategoryService({ code: "NO_TYPE_SVC", name: "x" }));
      expect(direct.status).toBe(400);
      expect(direct.message).toContain("Danh mục gốc phải chọn loại");
    });

    it("loại sai giá trị → 400 (DTO)", async () => {
      const res = await api().post("/api/it-assets/categories", { code: "BAD_TYPE", name: "x", assetType: "XYZ" });
      expect(res.status).toBe(400);
    });

    it("danh mục con gửi kèm loại → 400; con hợp lệ KHÔNG lưu loại (kế thừa)", async () => {
      const bad = await api().post("/api/it-assets/categories", { code: "CHILD_TYPE", name: "x", parentCategory: ids.IT_ROOT, assetType: "MEDICAL" });
      expect(bad.status).toBe(400);
      expect((await AssetCategory.findById(ids.IT_LEAF))!.assetType).toBeUndefined();
      expect((await AssetCategory.findById(ids.IT_ROOT))!.assetType).toBe("IT");
    });

    it("chuyển nhánh CNTT → y tế khi nhánh CÒN tài sản → 400, không đổi gì (module chặn; service chặn)", async () => {
      expect((await createAsset("IT_LEAF2")).status).toBe(201);
      const viaModule = await api().put(`/api/it-assets/categories/${ids.IT_LEAF2}`, { parentCategory: ids.MED_ROOT });
      expect(viaModule.status).toBe(400);
      const res = await viaService(() => updateAssetCategoryService(ids.IT_LEAF2, { parentCategory: ids.MED_ROOT }));
      expect(res.status).toBe(400);
      expect(res.message).toContain("còn tài sản");
      expect(String((await AssetCategory.findById(ids.IT_LEAF2))!.parentCategory)).toBe(ids.IT_ROOT);
    });

    it("chuyển nhánh khi tài sản đã xoá mềm vẫn còn → vẫn bị chặn", async () => {
      await category("SOFT_LEAF", { parentCategory: ids.IT_ROOT });
      const asset = await createAsset("SOFT_LEAF");
      expect((await api().del(`/api/it-assets/${asset.body.data._id}`)).status).toBe(200);
      const res = await viaService(() => updateAssetCategoryService(ids.SOFT_LEAF, { parentCategory: ids.MED_ROOT }));
      expect(res.status).toBe(400);
    });

    it("chuyển nhánh KHÔNG có tài sản (gồm cả con cháu) → được, con cháu theo loại mới", async () => {
      const res = await viaService(() => updateAssetCategoryService(ids.EMPTY_IT, { parentCategory: ids.MED_ROOT }));
      expect(res.status).toBe(200);
      // Tài sản mới ở danh mục cháu giờ là thiết bị y tế.
      const asset = await api().post("/api/medical-assets", { category: ids.EMPTY_IT_CHILD, department: deptA, name: "TS EMPTY_IT_CHILD" });
      expect(asset.status).toBe(201);
      // Trên module CNTT, danh mục đó giờ thuộc nhánh khác → bị chặn.
      expect((await api().post("/api/it-assets", { category: ids.EMPTY_IT_CHILD, department: deptA, name: "x" })).status).toBe(400);
      expect(asset.body.data.assetType).toBe("MEDICAL");
    });

    it("gỡ cha (thành gốc) không chọn loại → 400; có chọn loại khác khi nhánh có tài sản → 400", async () => {
      expect((await viaService(() => updateAssetCategoryService(ids.IT_LEAF2, { parentCategory: null }))).status).toBe(400);
      const res = await viaService(() => updateAssetCategoryService(ids.IT_LEAF2, { parentCategory: null, assetType: "MEDICAL" }));
      expect(res.status).toBe(400);
      expect(res.message).toContain("còn tài sản");
    });

    it("đổi loại của gốc đang có tài sản → 400", async () => {
      const res = await viaService(() => updateAssetCategoryService(ids.IT_ROOT, { assetType: "MEDICAL" }));
      expect(res.status).toBe(400);
      expect((await AssetCategory.findById(ids.IT_ROOT))!.assetType).toBe("IT");
    });

    it("danh mục gốc cũ không có loại (đã xoá mềm) → KHÔNG khôi phục được", async () => {
      const legacy = await AssetCategory.collection.insertOne({ code: "LEGACY_ROOT", name: "Cũ", isActive: false, deletedAt: new Date() });
      const res = await viaService(() => restoreAssetCategoryService(legacy.insertedId));
      expect(res.status).toBe(400);
      expect(res.message).toContain("không thuộc nhánh");
      // Qua module: danh mục không thuộc nhánh nào bị coi là không tồn tại (cô lập theo loại).
      expect((await api().patch(`/api/it-assets/categories/${legacy.insertedId}/restore`)).status).toBe(404);
      expect((await AssetCategory.findById(legacy.insertedId))!.isActive).toBe(false);
    });
  });

  describe("tài sản", () => {
    it("tạo tài sản: loại lấy từ gốc danh mục; client gửi loại khác cũng bị bỏ qua", async () => {
      const it_ = await createAsset("IT_LEAF", { assetType: "MEDICAL" });
      const med = await createAsset("MED_LEAF");
      expect(it_.status).toBe(201);
      expect(it_.body.data.assetType).toBe("IT");
      expect(med.body.data.assetType).toBe("MEDICAL");
      ids.itAsset = it_.body.data._id;
      ids.medAsset = med.body.data._id;
    });

    it("tài sản trong danh mục không thuộc nhánh nào → 400", async () => {
      const orphan = await AssetCategory.collection.insertOne({ code: "UNTYPED_ROOT", name: "Không nhánh", isActive: true });
      const res = await api().post("/api/it-assets", { category: orphan.insertedId, department: deptA, name: "x" });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain("không thuộc nhánh");
    });

    it("sửa tài sản sang danh mục khác loại → 400; cùng loại → 200", async () => {
      const bad = await api().put(`/api/it-assets/${ids.itAsset}`, { category: ids.MED_LEAF });
      expect(bad.status).toBe(400);
      expect((await Asset.findById(ids.itAsset))!.assetType).toBe("IT");
      expect(String((await Asset.findById(ids.itAsset))!.category)).toBe(ids.IT_LEAF);

      const ok = await api().put(`/api/it-assets/${ids.itAsset}`, { category: ids.IT_LEAF2 });
      expect(ok.status).toBe(200);
      expect(ok.body.data.assetType).toBe("IT");
    });

    it("sửa thẳng trường loại qua API sửa tài sản → bị bỏ qua", async () => {
      const res = await api().put(`/api/it-assets/${ids.itAsset}`, { assetType: "MEDICAL", name: "Đổi tên" });
      expect(res.status).toBe(200);
      expect((await Asset.findById(ids.itAsset))!.assetType).toBe("IT");
    });
  });

  describe("hồ sơ y tế và chứng chỉ vận hành", () => {
    it("tạo hồ sơ thiết bị y tế cho tài sản CNTT → 400, không tạo; cho tài sản y tế → 201", async () => {
      // Module y tế: tài sản CNTT bị coi là không tồn tại (404); tầng service vẫn chặn bằng 400.
      const viaModule = await api().post(`/api/medical-assets/${ids.itAsset}/profile`, { deviceClass: "A" });
      expect(viaModule.status).toBe(404);
      const bad = await viaService(() => createMedicalDeviceProfileService(ids.itAsset, { deviceClass: "A" }));
      expect(bad.status).toBe(400);
      expect(await MedicalDeviceProfile.countDocuments({ asset: ids.itAsset })).toBe(0);

      const ok = await api().post(`/api/medical-assets/${ids.medAsset}/profile`, { deviceClass: "B" });
      expect(ok.status).toBe(201);
    });

    it("chứng chỉ vận hành cho danh mục CNTT → 400; danh mục y tế → 201", async () => {
      const body = { user: userId, issuedAt: "2026-01-01", expiresAt: "2027-01-01" };
      const bad = await api().post("/api/medical-assets/operator-certificates", { ...body, deviceCategory: ids.IT_LEAF });
      expect(bad.status).toBe(400);
      expect(bad.body.message).toContain("Thiết bị y tế");
      const ok = await api().post("/api/medical-assets/operator-certificates", { ...body, deviceCategory: ids.MED_LEAF });
      expect(ok.status).toBe(201);
    });
  });

  it("các route dùng trong test vẫn được bảo vệ (không token → 401)", async () => {
    expect((await request(app).post("/api/it-assets/categories").send({})).status).toBe(401);
    expect((await request(app).post("/api/it-assets").send({})).status).toBe(401);
    expect((await request(app).put(`/api/it-assets/${ids.itAsset}`).send({})).status).toBe(401);
    // Route cũ đã gỡ ở GĐ 8: không còn tồn tại (404), không phải 401/403.
    expect((await api().get("/api/assets")).status).toBe(404);
    expect((await api().get("/api/assets/medical-devices/x/profile")).status).toBe(404);
    expect((await api().get("/api/operator-certificates")).status).toBe(404);
  });
});

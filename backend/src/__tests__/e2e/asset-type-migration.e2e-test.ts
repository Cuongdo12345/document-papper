/**
 * DEV-112 (tách module Tài sản, GĐ 1) — E2E trên MongoDB THẬT (in-memory):
 * migrate `assetType` theo cơ chế 3 nhóm (docs/development/ASSET_MODULE_SPLIT_PLAN.md
 * mục 4.2). Dữ liệu "cũ" chèn bằng driver thô (chưa có `assetType`), giống DB thật
 * trước khi migrate. Có đủ các ca xung đột đã thấy trên DB dev.
 */
import mongoose, { Types } from "mongoose";
import { startE2EDatabase, stopE2EDatabase } from "./setup";
import { AssetType } from "../../interfaces/assets/asset.interface";
import { runAssetTypeMigration, type AssetTypeException } from "../../services/assets/assetTypeMigration";

const db = () => mongoose.connection.db!;
const ROOTS = { CNTT: AssetType.IT, TBYT: AssetType.MEDICAL };
const oid = () => new Types.ObjectId();

describe("E2E — Migrate assetType (DEV-112)", () => {
  const ids: Record<string, Types.ObjectId> = {};
  let scannerException: AssetTypeException;

  const seed = async () => {
    for (const c of ["assetcategories", "assets", "medicaldeviceprofiles", "calibrationrecords", "operatorcertificates", "contracts"]) {
      await db().collection(c).deleteMany({});
    }
    const cat = (code: string, parent?: string, extra: Record<string, unknown> = {}) => {
      ids[code] = oid();
      return { _id: ids[code], code, name: code, isActive: true, ...(parent ? { parentCategory: ids[parent] } : {}), ...extra };
    };
    // Thứ tự quan trọng: cha trước con để ids[parent] đã có.
    const cats = [cat("CNTT"), cat("CNTT_NGOAIVI", "CNTT"), cat("BARCODE", "CNTT_NGOAIVI"), cat("PC", "CNTT"),
      cat("TBYT"), cat("TBYT_HSCC", "TBYT"), cat("VENTILATOR", "TBYT_HSCC"),
      cat("MAY_THO_CU", undefined, { isActive: false }), cat("TEST_ROOT", undefined, { isActive: false })];
    await db().collection("assetcategories").insertMany(cats);

    const asset = (code: string, category: string, extra: Record<string, unknown> = {}) => {
      ids[code] = oid();
      return { _id: ids[code], assetCode: code, name: code, category: ids[category] ?? category, isActive: true, ...extra };
    };
    await db().collection("assets").insertMany([
      asset("PC-1", "PC"), asset("PC-2", "PC"),
      asset("PC-DEL", "PC", { isActive: false }), // đã xoá mềm vẫn phải được gán
      asset("VENT-1", "VENTILATOR"),
      asset("SCANNER", "BARCODE"), // ca TB-KD-2023-0003: CNTT có hồ sơ y tế, 0 hiệu chuẩn
      asset("SCANNER-CAL", "BARCODE"), // CNTT có hồ sơ y tế VÀ có hiệu chuẩn → không được tự xoá
      asset("LEGACY", "MAY_THO_CU"), // danh mục không thuộc nhánh
      asset("ORPHAN", "x", { category: oid() }), // danh mục không tồn tại
    ]);
    ids.profScanner = oid();
    ids.profScannerCal = oid();
    ids.profVent = oid();
    await db().collection("medicaldeviceprofiles").insertMany([
      { _id: ids.profScanner, asset: ids.SCANNER, deviceClass: "A", requiresCalibration: false },
      { _id: ids.profScannerCal, asset: ids["SCANNER-CAL"], deviceClass: "A" },
      { _id: ids.profVent, asset: ids["VENT-1"], deviceClass: "C" },
    ]);
    await db().collection("calibrationrecords").insertOne({ deviceProfile: ids.profScannerCal, calibratedAt: new Date() });
    await db().collection("operatorcertificates").insertMany([
      { deviceCategory: ids.VENTILATOR, user: oid() },
      { deviceCategory: ids.PC, user: oid() }, // chứng chỉ gắn danh mục CNTT
    ]);
    await db().collection("contracts").insertMany([
      { contractNumber: "HD-TRON", assets: [ids["PC-1"], ids["VENT-1"]] },
      { contractNumber: "HD-CNTT", assets: [ids["PC-1"], ids["PC-2"]] },
    ]);
    scannerException = {
      assetCode: "SCANNER",
      assetId: String(ids.SCANNER),
      assetType: AssetType.IT,
      deleteMedicalProfile: true,
      reason: "test",
    };
  };

  beforeAll(async () => {
    await startE2EDatabase();
  }, 60_000);
  afterAll(async () => {
    await stopE2EDatabase();
  });
  beforeEach(seed);

  const assetTypes = async () =>
    Object.fromEntries((await db().collection("assets").find({}).toArray()).map((a) => [a.assetCode, a.assetType]));

  it("xem trước: báo đúng 3 nhóm và KHÔNG ghi gì", async () => {
    const r = await runAssetTypeMigration(db(), { apply: false, rootTypeByCode: ROOTS, exceptions: [scannerException] });

    expect(r.groupA).toEqual({ total: 4, byType: { IT: 3, MEDICAL: 1 }, alreadyTyped: 0 });
    expect(r.groupB.map((b) => `${b.kind}:${b.assetCode ?? ""}`).sort()).toEqual(
      ["CATEGORY_MISSING:ORPHAN", "CATEGORY_UNTYPED:LEGACY", "MEDICAL_PROFILE_ON_NON_MEDICAL:SCANNER-CAL", "OPERATOR_CERT_NON_MEDICAL:"].sort(),
    );
    expect(r.exceptions).toEqual([expect.objectContaining({ assetCode: "SCANNER", status: "would-apply" })]);
    expect(r.groupC.map((c) => c.kind).sort()).toEqual(["CATEGORY_UNTYPED", "CATEGORY_UNTYPED", "CONTRACT_MIXED"]);
    expect(r.groupC.find((c) => c.kind === "CONTRACT_MIXED")!.detail).toContain("HD-TRON");

    // Không ghi gì.
    expect(r.assetsWithoutType).toBe(8);
    expect(await db().collection("assetcategories").countDocuments({ assetType: { $exists: true } })).toBe(0);
    expect(await db().collection("medicaldeviceprofiles").countDocuments()).toBe(3);
  });

  it("apply: gán loại nhóm A + gốc danh mục, thực hiện ngoại lệ, KHÔNG đụng nhóm B", async () => {
    const r = await runAssetTypeMigration(db(), { apply: true, rootTypeByCode: ROOTS, exceptions: [scannerException] });

    expect(await assetTypes()).toEqual({
      "PC-1": "IT", "PC-2": "IT", "PC-DEL": "IT", "VENT-1": "MEDICAL",
      SCANNER: "IT", // ngoại lệ
      "SCANNER-CAL": undefined, LEGACY: undefined, ORPHAN: undefined, // nhóm B: giữ nguyên
    });
    // Chỉ gốc có cấu hình mới được gán; gốc cũ không thuộc nhánh giữ nguyên.
    const roots = Object.fromEntries((await db().collection("assetcategories").find({ parentCategory: { $exists: false } }).toArray()).map((c) => [c.code, c.assetType]));
    expect(roots).toEqual({ CNTT: "IT", TBYT: "MEDICAL", MAY_THO_CU: undefined, TEST_ROOT: undefined });
    // Danh mục con KHÔNG lưu loại.
    expect(await db().collection("assetcategories").countDocuments({ parentCategory: { $exists: true }, assetType: { $exists: true } })).toBe(0);
    // Ngoại lệ xoá đúng hồ sơ của SCANNER; hồ sơ có hiệu chuẩn và hồ sơ máy thở còn nguyên.
    const profiles = (await db().collection("medicaldeviceprofiles").find({}).toArray()).map((p) => String(p._id)).sort();
    expect(profiles).toEqual([String(ids.profScannerCal), String(ids.profVent)].sort());
    expect(r.assetsWithoutType).toBe(3);
  });

  it("chạy lại: idempotent — không gán lại, không lỗi, kết quả không đổi", async () => {
    await runAssetTypeMigration(db(), { apply: true, rootTypeByCode: ROOTS, exceptions: [scannerException] });
    const before = await assetTypes();

    const r = await runAssetTypeMigration(db(), { apply: true, rootTypeByCode: ROOTS, exceptions: [scannerException] });

    expect(await assetTypes()).toEqual(before);
    expect(r.groupA).toEqual({ total: 5, byType: { IT: 4, MEDICAL: 1 }, alreadyTyped: 5 });
    expect(r.exceptions).toEqual([expect.objectContaining({ assetCode: "SCANNER", status: "not-needed" })]);
  });

  it("ngoại lệ mang sang DB khác (_id không khớp) → bị TỪ CHỐI, hồ sơ không bị xoá", async () => {
    const r = await runAssetTypeMigration(db(), {
      apply: true,
      rootTypeByCode: ROOTS,
      exceptions: [{ ...scannerException, assetId: String(oid()) }],
    });

    expect(r.exceptions).toEqual([expect.objectContaining({ status: "refused", detail: expect.stringContaining("_id không khớp") })]);
    expect(r.groupB.some((b) => b.assetCode === "SCANNER")).toBe(true);
    expect(await db().collection("medicaldeviceprofiles").countDocuments({ _id: ids.profScanner })).toBe(1);
    expect((await assetTypes()).SCANNER).toBeUndefined();
  });

  it("ngoại lệ cho hồ sơ CÓ hiệu chuẩn → bị từ chối, không xoá", async () => {
    const r = await runAssetTypeMigration(db(), {
      apply: true,
      rootTypeByCode: ROOTS,
      exceptions: [{ ...scannerException, assetCode: "SCANNER-CAL", assetId: String(ids["SCANNER-CAL"]) }],
    });

    expect(r.exceptions).toEqual([expect.objectContaining({ assetCode: "SCANNER-CAL", status: "refused", detail: expect.stringContaining("hiệu chuẩn") })]);
    expect(await db().collection("medicaldeviceprofiles").countDocuments({ _id: ids.profScannerCal })).toBe(1);
  });

  it("gốc đã có loại khác cấu hình → xung đột ROOT_TYPE_MISMATCH, giữ loại đang có", async () => {
    await db().collection("assetcategories").updateOne({ code: "TBYT" }, { $set: { assetType: AssetType.IT } });

    const r = await runAssetTypeMigration(db(), { apply: true, rootTypeByCode: ROOTS });

    expect(r.groupB).toContainEqual(expect.objectContaining({ kind: "ROOT_TYPE_MISMATCH", ref: "TBYT" }));
    expect((await db().collection("assetcategories").findOne({ code: "TBYT" }))!.assetType).toBe(AssetType.IT);
  });

  it("tài sản đã có loại trái với danh mục → xung đột ASSET_TYPE_MISMATCH, không ghi đè", async () => {
    await db().collection("assets").updateOne({ assetCode: "VENT-1" }, { $set: { assetType: AssetType.IT } });

    const r = await runAssetTypeMigration(db(), { apply: true, rootTypeByCode: ROOTS, exceptions: [scannerException] });

    expect(r.groupB).toContainEqual(expect.objectContaining({ kind: "ASSET_TYPE_MISMATCH", assetCode: "VENT-1" }));
    expect((await assetTypes())["VENT-1"]).toBe(AssetType.IT);
  });
});

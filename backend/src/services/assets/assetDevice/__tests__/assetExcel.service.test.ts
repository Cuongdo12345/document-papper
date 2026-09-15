import ExcelJS from "exceljs";

/**
 * (Bổ sung theo yêu cầu user sau A3 — xác nhận Excel Import cho Asset đã có
 * sẵn đầy đủ, chỉ thiếu unit test) — regression test cho `importAssetsExcel`.
 * Mock Model + `generateAssetCode` — KHÔNG mock `exceljs` (dựng workbook thật
 * trong bộ nhớ, cùng cách `excel.service.test.ts` — Document — đã làm) vì
 * đây là thư viện thuần, mock nó chỉ khiến test kém trung thực hơn.
 *
 * `asset.model.ts` export CẢ model Mongoose LẪN enum `AssetStatus` — factory
 * thủ công (giữ enum thật qua `requireActual`), cùng lý do đã áp dụng ở
 * `assetAssignment.service.test.ts` (tránh lỗi Jest automock vào nội bộ
 * Mongoose Model).
 */
jest.mock("../../../../models/assets/asset.model", () => ({
  ...jest.requireActual("../../../../models/assets/asset.model"),
  Asset: { create: jest.fn() },
}));
jest.mock("../../../../models/assets/assetCategory.model", () => ({
  AssetCategory: { find: jest.fn() },
}));
jest.mock("../../../../models/departments/department.model", () => ({
  __esModule: true,
  default: { find: jest.fn() },
}));
jest.mock("../../../../models/importAudit/importhistory.model", () => ({
  ImportHistory: { create: jest.fn().mockResolvedValue({}) },
}));
jest.mock("../../../../shared/helpers/generateAssetCode", () => ({
  generateAssetCode: jest.fn().mockResolvedValue("TB-CNTT-2026-0001"),
}));

import { Asset, AssetStatus } from "../../../../models/assets/asset.model";
import { AssetCategory } from "../../../../models/assets/assetCategory.model";
import Department from "../../../../models/departments/department.model";
import { ImportHistory } from "../../../../models/importAudit/importhistory.model";
import { generateAssetCode } from "../../../../shared/helpers/generateAssetCode";
import { importAssetsExcel } from "../assetExcel.service";

const mockedAsset = Asset as any;
const mockedCategory = AssetCategory as any;
const mockedDepartment = Department as any;
const mockedImportHistory = ImportHistory as any;
const mockedGenerateAssetCode = generateAssetCode as jest.Mock;

/** Khớp đúng `ASSET_IMPORT_COLUMNS` (`excel.constants.ts`) — cột 1 ("Mã tài sản") CHỦ Ý bỏ trống, hệ thống tự sinh. */
const HEADER = [
  ,
  "Mã tài sản",
  "Danh mục",
  "Tên tài sản",
  "Khoa/phòng",
  "Số serial",
  "Model",
  "Hãng sản xuất",
  "Vị trí",
  "Ngày mua",
  "Giá mua",
  "Hạn bảo hành",
  "Nhà cung cấp",
];

interface RowInput {
  category?: string;
  name?: string;
  department?: string;
  serialNumber?: string;
}

const buildWorkbook = async (rows: (RowInput | "blank")[], headerOverride?: (string | undefined)[]) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Import");
  sheet.getRow(1).values = (headerOverride ?? HEADER) as any;
  rows.forEach((row, i) => {
    if (row === "blank") {
      sheet.getRow(i + 2).values = [];
      return;
    }
    sheet.getRow(i + 2).values = [, "", row.category, row.name, row.department, row.serialNumber];
  });
  return Buffer.from(await workbook.xlsx.writeBuffer());
};

const VALID_ROW: RowInput = { category: "PC", name: "Máy tính bàn", department: "CNTT", serialNumber: "SN-001" };

describe("importAssetsExcel (bổ sung test sau A3)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedCategory.find.mockResolvedValue([{ _id: "cat-pc", code: "PC" }]);
    mockedDepartment.find.mockResolvedValue([{ _id: "dept-cntt", code: "CNTT" }]);
    mockedAsset.create.mockResolvedValue({ _id: "asset-1" });
    mockedGenerateAssetCode.mockResolvedValue("TB-CNTT-2026-0001");
  });

  it("header sai định dạng/thứ tự cột → throw 400, không đọc dữ liệu, không chạm DB", async () => {
    const buffer = await buildWorkbook([VALID_ROW], [, "Mã tài sản", "Tên tài sản", "Danh mục"]);

    await expect(importAssetsExcel(buffer, "user-1")).rejects.toMatchObject({ status: 400 });
    expect(mockedCategory.find).not.toHaveBeenCalled();
    expect(mockedAsset.create).not.toHaveBeenCalled();
  });

  it("dryRun=true — chỉ trả preview, KHÔNG tạo Asset thật, KHÔNG sinh assetCode", async () => {
    const buffer = await buildWorkbook([VALID_ROW]);

    const result = await importAssetsExcel(buffer, "user-1", { dryRun: true });

    expect(result.dryRun).toBe(true);
    expect(result.created).toBe(0);
    expect(result.preview).toEqual([
      { row: 2, action: "create", category: "PC", department: "CNTT", name: "Máy tính bàn", serialNumber: "SN-001" },
    ]);
    expect(mockedAsset.create).not.toHaveBeenCalled();
    expect(mockedGenerateAssetCode).not.toHaveBeenCalled();
  });

  it("dryRun=false — tạo Asset thật, sinh assetCode, status mặc định IN_STOCK", async () => {
    const buffer = await buildWorkbook([VALID_ROW]);

    const result = await importAssetsExcel(buffer, "user-1", { dryRun: false });

    expect(result.created).toBe(1);
    expect(result.errors).toHaveLength(0);
    expect(mockedGenerateAssetCode).toHaveBeenCalledWith("dept-cntt", undefined);
    expect(mockedAsset.create).toHaveBeenCalledWith(
      expect.objectContaining({
        assetCode: "TB-CNTT-2026-0001",
        category: "cat-pc",
        department: "dept-cntt",
        name: "Máy tính bàn",
        serialNumber: "SN-001",
        status: AssetStatus.IN_STOCK,
        createdBy: "user-1",
        updatedBy: "user-1",
      }),
    );
  });

  it("thiếu field bắt buộc (Danh mục/Tên tài sản/Khoa-phòng) → lỗi theo DÒNG, KHÔNG chặn toàn bộ file", async () => {
    const buffer = await buildWorkbook([{ category: "", name: "Thiếu danh mục", department: "CNTT" }, VALID_ROW]);

    const result = await importAssetsExcel(buffer, "user-1");

    expect(result.errors).toEqual([expect.objectContaining({ row: 2, message: expect.stringContaining("Thiếu") })]);
    expect(result.created).toBe(1); // dòng 3 (VALID_ROW) vẫn tạo được
  });

  it("mã Danh mục không tồn tại (hoặc không active) → lỗi rõ ràng theo dòng", async () => {
    const buffer = await buildWorkbook([{ ...VALID_ROW, category: "KHONGTONTAI" }]);

    const result = await importAssetsExcel(buffer, "user-1");

    expect(result.errors).toEqual([expect.objectContaining({ row: 2, message: expect.stringContaining("KHONGTONTAI") })]);
    expect(mockedAsset.create).not.toHaveBeenCalled();
  });

  it("mã Khoa/phòng không tồn tại → lỗi rõ ràng theo dòng", async () => {
    const buffer = await buildWorkbook([{ ...VALID_ROW, department: "KHONGTONTAI" }]);

    const result = await importAssetsExcel(buffer, "user-1");

    expect(result.errors).toEqual([expect.objectContaining({ row: 2, message: expect.stringContaining("KHONGTONTAI") })]);
    expect(mockedAsset.create).not.toHaveBeenCalled();
  });

  it("dòng trắng hoàn toàn → bỏ qua lặng lẽ, KHÔNG tính vào totalRows, KHÔNG lỗi", async () => {
    const buffer = await buildWorkbook(["blank", VALID_ROW]);

    const result = await importAssetsExcel(buffer, "user-1");

    expect(result.totalRows).toBe(1);
    expect(result.errors).toHaveLength(0);
    expect(result.created).toBe(1);
  });

  it("REVIEW-06 — pre-fetch category/department 1 LẦN DUY NHẤT bằng $in, KHÔNG query lại theo từng dòng (tránh N+1)", async () => {
    const buffer = await buildWorkbook([VALID_ROW, VALID_ROW, VALID_ROW]);

    await importAssetsExcel(buffer, "user-1");

    expect(mockedCategory.find).toHaveBeenCalledTimes(1);
    expect(mockedDepartment.find).toHaveBeenCalledTimes(1);
    expect(mockedCategory.find).toHaveBeenCalledWith({ code: { $in: ["PC"] }, isActive: true });
  });

  it("ghi ImportHistory sau khi import — mode đúng theo dryRun, tổng hợp created/errorCount khớp kết quả", async () => {
    const buffer = await buildWorkbook([VALID_ROW]);

    await importAssetsExcel(buffer, "user-1", { fileName: "danh-sach.xlsx", dryRun: false });

    expect(mockedImportHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        importedBy: "user-1",
        fileName: "danh-sach.xlsx",
        mode: "commit",
        totalRows: 1,
        created: 1,
        errorCount: 0,
      }),
    );
  });

  it("lỗi ghi ImportHistory KHÔNG làm hỏng kết quả import chính (best-effort, chỉ log)", async () => {
    mockedImportHistory.create.mockRejectedValueOnce(new Error("Mongo down"));
    const buffer = await buildWorkbook([VALID_ROW]);

    const result = await importAssetsExcel(buffer, "user-1");

    expect(result.created).toBe(1);
  });
});

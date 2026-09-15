import ExcelJS from "exceljs";

/**
 * DEV-025/ARCH-21 — regression test: `importDocumentsExcel()` trước đây đọc
 * `Document.findOne` (dò trùng lặp Proposal) TRƯỚC khi vào `withTransaction`
 * — window TOCTOU. Nay đọc lại NGAY BÊN TRONG transaction (`.session(session)`).
 * Mock toàn bộ Model + `withTransaction` — không dùng DB thật.
 *
 * `document.model.ts` export CẢ model Mongoose LẪN enum `DocumentCategory`
 * — factory thủ công (giữ enum thật qua `requireActual`, chỉ mock những gì
 * service dùng: `findOne`/`create`), tránh lỗi Jest automock vào nội bộ
 * Mongoose Model (đã gặp ở DEV-022, `assetAssignment.service.test.ts`).
 */
jest.mock("../../../models/documents/document.model", () => ({
  ...jest.requireActual("../../../models/documents/document.model"),
  Document: { findOne: jest.fn(), create: jest.fn() },
}));
jest.mock("../../../models/departments/department.model", () => ({
  __esModule: true,
  default: { find: jest.fn(), findById: jest.fn() },
}));
jest.mock("../../../models/importAudit/importhistory.model", () => ({
  ImportHistory: { create: jest.fn().mockResolvedValue({}) },
}));
jest.mock("../../../shared/utils/generateDocumentCode", () => ({
  generateDocumentCode: jest.fn().mockResolvedValue("PR-NOI-2026-0001"),
}));
jest.mock("../../../shared/utils/withTransaction");

import { Document } from "../../../models/documents/document.model";
import Department from "../../../models/departments/department.model";
import { withTransaction } from "../../../shared/utils/withTransaction";
import { importDocumentsExcel } from "../excel.service";

const mockedDocument = Document as any;
const mockedDepartment = Department as any;
const mockedWithTransaction = withTransaction as unknown as jest.Mock;

const FAKE_SESSION = { id: "fake-session" };

// `withTransaction(fn)` thật sẽ mở session/transaction — mock chỉ gọi thẳng
// callback với 1 session giả, đúng pattern đã dùng ở assetAssignment test.
mockedWithTransaction.mockImplementation(async (fn: any) => fn(FAKE_SESSION));

const buildImportWorkbook = async (row: {
  subType: string;
  department: string;
  title: string;
  deviceName: string;
  createdAt: Date;
  quantity: number;
  unitPrice: number;
}) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Sheet1");
  sheet.getRow(1).values = [
    ,
    "Mã giấy",
    "Loại giấy",
    "Khoa",
    "Tiêu đề",
    "Tên thiết bị",
    "Ngày đề xuất",
    "Số lượng",
    "Giá tiền",
    "Ghi chú",
    "Kiểm tra",
  ];
  sheet.getRow(2).values = [
    ,
    "",
    row.subType,
    row.department,
    row.title,
    row.deviceName,
    row.createdAt,
    row.quantity,
    row.unitPrice,
    "",
    "",
  ];
  return Buffer.from(await workbook.xlsx.writeBuffer());
};

describe("importDocumentsExcel — dò trùng lặp Proposal trong transaction (DEV-025/ARCH-21)", () => {
  const rowInput = {
    subType: "PROPOSE_REPAIR",
    department: "Khoa Nội",
    title: "Đề xuất sửa máy X",
    deviceName: "Máy X",
    createdAt: new Date("2026-01-15T00:00:00.000Z"),
    quantity: 1,
    unitPrice: 100000,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedWithTransaction.mockImplementation(async (fn: any) => fn(FAKE_SESSION));
    mockedDepartment.find.mockResolvedValue([
      { _id: "dept-noi", name: "Khoa Nội", code: "NOI" },
    ]);
  });

  it("đọc trùng lặp NGAY BÊN TRONG withTransaction (dùng đúng session), không phải trước", async () => {
    mockedDocument.findOne.mockReturnValue({ session: jest.fn().mockResolvedValue(null) });
    mockedDocument.create.mockResolvedValue([
      { _id: "doc-1", meta: { items: [], totalAmount: 0 } },
    ]);

    const buffer = await buildImportWorkbook(rowInput);
    await importDocumentsExcel(buffer, "user-1", { fileName: "test.xlsx" });

    expect(mockedWithTransaction).toHaveBeenCalledTimes(1);
    expect(mockedDocument.findOne).toHaveBeenCalledTimes(1);

    // Regression guard cốt lõi: nếu ai đó VÔ TÌNH đưa lại `Document.findOne`
    // ra NGOÀI `withTransaction` (quay lại bug ARCH-21), lệnh gọi
    // `findOne` sẽ xảy ra TRƯỚC `withTransaction` — invocationCallOrder sẽ
    // nhỏ hơn thay vì lớn hơn.
    const withTransactionOrder = mockedWithTransaction.mock.invocationCallOrder[0];
    const findOneOrder = mockedDocument.findOne.mock.invocationCallOrder[0];
    expect(findOneOrder).toBeGreaterThan(withTransactionOrder);

    // `.session(session)` phải nhận ĐÚNG session mà `withTransaction` cấp
    // cho callback (không phải session rời rạc/không có session).
    const sessionCallArg = (mockedDocument.findOne.mock.results[0].value as any).session.mock
      .calls[0][0];
    expect(sessionCallArg).toBe(FAKE_SESSION);
  });

  it("proposal đã tồn tại (đọc được NGAY TRONG transaction) → update, KHÔNG tạo trùng lặp", async () => {
    const existingProposal = {
      _id: "doc-existing",
      meta: { items: [], totalAmount: 0 },
      save: jest.fn().mockResolvedValue(undefined),
    };
    mockedDocument.findOne.mockReturnValue({
      session: jest.fn().mockResolvedValue(existingProposal),
    });

    const buffer = await buildImportWorkbook(rowInput);
    const result = await importDocumentsExcel(buffer, "user-1", { fileName: "test.xlsx" });

    expect(result.updated).toBe(1);
    expect(result.created).toBe(0);
    expect(mockedDocument.create).not.toHaveBeenCalled();
    expect(existingProposal.save).toHaveBeenCalledWith({ session: FAKE_SESSION });
  });

  it("proposal chưa tồn tại → create, không gọi update/save", async () => {
    mockedDocument.findOne.mockReturnValue({ session: jest.fn().mockResolvedValue(null) });
    mockedDocument.create.mockResolvedValue([
      { _id: "doc-1", meta: { items: [], totalAmount: 0 } },
    ]);

    const buffer = await buildImportWorkbook(rowInput);
    const result = await importDocumentsExcel(buffer, "user-1", { fileName: "test.xlsx" });

    expect(result.created).toBe(1);
    expect(result.updated).toBe(0);
    expect(mockedDocument.create).toHaveBeenCalledTimes(1);
  });
});

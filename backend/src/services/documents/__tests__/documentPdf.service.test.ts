// Roadmap B5 (2026-09-18) — test service `documentPdf.service.ts`. `pdfmake`
// tự đọc font từ đĩa (`fs`) khi `addFonts` chạy ở module scope — mock hẳn
// module này (không cần render PDF thật trong unit test, đã verify việc đó
// bằng smoke test thủ công trên dữ liệu dev thật, xem docs/development/tasks/DEV-064.md).
// `qrcode` cũng mock — không cần sinh ảnh QR thật trong unit test.
jest.mock("pdfmake", () => ({
  __esModule: true,
  default: {
    addFonts: jest.fn(),
    setUrlAccessPolicy: jest.fn(),
    setLocalAccessPolicy: jest.fn(),
    createPdf: jest.fn(() => ({ getBuffer: jest.fn().mockResolvedValue(Buffer.from("fake-pdf")) })),
  },
}));
jest.mock("qrcode", () => ({
  __esModule: true,
  default: { toDataURL: jest.fn().mockResolvedValue("data:image/png;base64,fake") },
}));
jest.mock("../../../models/documents/document.model", () => {
  const actual = jest.requireActual("../../../models/documents/document.model");
  return { ...actual, Document: { findOne: jest.fn() } };
});
jest.mock("../../../models/documents/workflowInstance.model", () => ({
  __esModule: true,
  default: { findById: jest.fn() },
}));
jest.mock("../../../models/documents/documentPdfExport.model", () => ({
  __esModule: true,
  default: { create: jest.fn(), findById: jest.fn() },
}));
jest.mock("../../../shared/utils/pdfSignature.util", () => ({
  hashPayload: jest.fn(() => "mocked-hash"),
  signPayload: jest.fn(() => ({ signature: "mocked-signature", algorithm: "RSA-SHA256" })),
  verifySignature: jest.fn(),
}));

import { Document } from "../../../models/documents/document.model";
import WorkflowInstance from "../../../models/documents/workflowInstance.model";
import DocumentPdfExport from "../../../models/documents/documentPdfExport.model";
import { hashPayload, signPayload, verifySignature } from "../../../shared/utils/pdfSignature.util";
import { exportDocumentPdfService, verifyDocumentPdfExportService } from "../documentPdf.service";
import ApiError from "../../../shared/errors/ApiError";

const mockedDocument = Document as any;
const mockedWorkflowInstance = WorkflowInstance as any;
const mockedDocumentPdfExport = DocumentPdfExport as any;
const mockedHashPayload = hashPayload as jest.Mock;
const mockedSignPayload = signPayload as jest.Mock;
const mockedVerifySignature = verifySignature as jest.Mock;

// Mongoose query chaining: `.populate().populate()` rồi được `await` trực
// tiếp (không gọi `.exec()`) — mock 1 thenable đơn giản thay vì Query thật.
function docThenable(doc: any) {
  const q: any = {};
  q.populate = jest.fn(() => q);
  q.then = (resolve: any) => Promise.resolve(doc).then(resolve);
  return q;
}

describe("documentPdf.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("exportDocumentPdfService", () => {
    it("throw ApiError.badRequest khi documentId không hợp lệ", async () => {
      await expect(exportDocumentPdfService("not-an-object-id", "user1")).rejects.toThrow(ApiError);
    });

    it("throw ApiError.notFound khi không tìm thấy document active", async () => {
      mockedDocument.findOne.mockReturnValue(docThenable(null));
      await expect(exportDocumentPdfService("507f1f77bcf86cd799439011", "user1")).rejects.toThrow("Không tìm thấy document");
    });

    it("ký + lưu DocumentPdfExport với đúng contentHash/signature, KHÔNG có workflow", async () => {
      const doc = {
        _id: "507f1f77bcf86cd799439011",
        documentCode: "PR-001",
        title: "Đề xuất test",
        category: "PROPOSAL",
        subType: "PROPOSE_REPAIR",
        meta: { issue: "Hỏng máy in" },
        workflowStatus: "pending",
        workflowInstanceId: undefined,
        department: { name: "Khoa Nội" },
        createdBy: { fullName: "Nguyễn Văn A" },
        createdAt: new Date("2026-01-01"),
      };
      mockedDocument.findOne.mockReturnValue(docThenable(doc));
      mockedDocumentPdfExport.create.mockResolvedValue({ _id: "exp1" });

      const result = await exportDocumentPdfService(doc._id, "user1");

      expect(mockedWorkflowInstance.findById).not.toHaveBeenCalled();
      expect(mockedHashPayload).toHaveBeenCalledTimes(1);
      const hashedPayload = mockedHashPayload.mock.calls[0][0] as string;
      const parsed = JSON.parse(hashedPayload);
      expect(parsed.documentId).toBe(doc._id);
      expect(parsed.meta).toEqual({ issue: "Hỏng máy in" });
      expect(parsed.steps).toEqual([]);

      expect(mockedSignPayload).toHaveBeenCalledWith("mocked-hash");
      expect(mockedDocumentPdfExport.create).toHaveBeenCalledWith(
        expect.objectContaining({
          document: doc._id,
          exportedBy: "user1",
          contentHash: "mocked-hash",
          signature: "mocked-signature",
          algorithm: "RSA-SHA256",
        }),
      );
      expect(result.buffer).toEqual(Buffer.from("fake-pdf"));
      expect(result.fileName).toBe("PR-001.pdf");
    });

    it("gộp steps từ WorkflowInstance vào payload khi document CÓ workflowInstanceId", async () => {
      const doc = {
        _id: "507f1f77bcf86cd799439011",
        documentCode: "PR-002",
        title: "Đề xuất test 2",
        category: "PROPOSAL",
        subType: "PROPOSE_INK",
        meta: { items: [{ deviceName: "Mực in", quantity: 2, unitPrice: 100000, totalPrice: 200000 }], totalAmount: 200000 },
        workflowStatus: "approved",
        workflowInstanceId: "wf1",
        department: { name: "Khoa Nội" },
        createdBy: { fullName: "Nguyễn Văn A" },
        createdAt: new Date("2026-01-01"),
      };
      mockedDocument.findOne.mockReturnValue(docThenable(doc));
      mockedWorkflowInstance.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue({
          steps: [
            {
              name: "Trưởng khoa duyệt",
              role: "TRUONG_KHOA",
              status: "approved",
              approvedBy: { _id: "u1", fullName: "Trần Thị B" },
              approvedAt: new Date("2026-01-02"),
              comment: "Đồng ý",
            },
          ],
        }),
      });
      mockedDocumentPdfExport.create.mockResolvedValue({ _id: "exp2" });

      await exportDocumentPdfService(doc._id, "user1");

      const hashedPayload = mockedHashPayload.mock.calls[0][0] as string;
      const parsed = JSON.parse(hashedPayload);
      expect(parsed.steps).toHaveLength(1);
      expect(parsed.steps[0]).toMatchObject({ role: "TRUONG_KHOA", status: "approved", approvedBy: "u1", comment: "Đồng ý" });
    });
  });

  describe("verifyDocumentPdfExportService", () => {
    it("throw ApiError.badRequest khi exportId không hợp lệ", async () => {
      await expect(verifyDocumentPdfExportService("not-an-object-id")).rejects.toThrow(ApiError);
    });

    it("throw ApiError.notFound khi không tìm thấy bản ghi", async () => {
      mockedDocumentPdfExport.findById.mockResolvedValue(null);
      await expect(verifyDocumentPdfExportService("507f1f77bcf86cd799439011")).rejects.toThrow("Không tìm thấy bản ghi xuất PDF");
    });

    it("trả valid=true khi verifySignature khớp, kèm disclaimer rõ ràng", async () => {
      mockedDocumentPdfExport.findById.mockResolvedValue({
        _id: "exp1",
        document: "doc1",
        exportedBy: "user1",
        contentHash: "h",
        signature: "s",
        algorithm: "RSA-SHA256",
        createdAt: new Date("2026-01-01"),
      });
      mockedVerifySignature.mockReturnValue(true);

      const result = await verifyDocumentPdfExportService("507f1f77bcf86cd799439011");

      expect(mockedVerifySignature).toHaveBeenCalledWith("h", "s");
      expect(result.valid).toBe(true);
      expect(result.disclaimer).toMatch(/KHÔNG PHẢI chữ ký số/);
    });

    it("trả valid=false khi verifySignature không khớp (dữ liệu bị chỉnh sửa sau khi lưu)", async () => {
      mockedDocumentPdfExport.findById.mockResolvedValue({
        _id: "exp1",
        document: "doc1",
        contentHash: "h",
        signature: "s",
        algorithm: "RSA-SHA256",
        createdAt: new Date("2026-01-01"),
      });
      mockedVerifySignature.mockReturnValue(false);

      const result = await verifyDocumentPdfExportService("507f1f77bcf86cd799439011");
      expect(result.valid).toBe(false);
    });
  });
});

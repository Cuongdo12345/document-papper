// Roadmap B5 (2026-09-18) — regression test cho bug THẬT user báo qua ảnh
// chụp Network tab (500 lỗi chung chung khi bấm "Xuất PDF"): `documentCode`
// tiếng Việt có dấu (VD "RP-KKBĐK - HSCC-2026-0105") làm `res.setHeader
// ("Content-Disposition", ...)` ném `TypeError [ERR_INVALID_CHAR]` (header
// HTTP chỉ chấp nhận ISO-8859-1) NGAY KHI GỌI, rơi xuống lỗi 500 generic.
// Không có controller test nào khác trong repo (toàn bộ test hiện có ở tầng
// service) — thêm RIÊNG file này vì bug nằm ĐÚNG ở lớp controller (header
// construction), service-level test không bao giờ chạm tới được.
jest.mock("../../../services/documents/documentPdf.service");

import { exportDocumentPdf } from "../documentPdf.controller";
import { exportDocumentPdfService } from "../../../services/documents/documentPdf.service";

const mockedExportService = exportDocumentPdfService as jest.Mock;

// `catchAsync` (shared/utils/catchAsync.ts) bọc controller thành
// `(req,res,next) => { Promise.resolve(fn(...)).catch(next); }` — KHÔNG
// `return` promise đó ra ngoài, nên `await exportDocumentPdf(req,res,next)`
// tự nó KHÔNG chờ được việc controller chạy xong. Test phải tự chờ tới khi
// `res.send` THỰC SỰ được gọi (hoặc `next` được gọi khi lỗi) thay vì `await`
// trực tiếp lời gọi hàm.
function makeRes() {
  const res: any = {};
  res.setHeader = jest.fn();
  let resolveSettled: () => void;
  const settled = new Promise<void>((resolve) => {
    resolveSettled = resolve;
  });
  res.send = jest.fn(() => resolveSettled());
  res.__settled = settled;
  res.__resolveOnNext = resolveSettled!;
  return res;
}

describe("documentPdf.controller — exportDocumentPdf", () => {
  it("set đúng Content-Type/Content-Disposition và gửi buffer với fileName THUẦN ASCII", async () => {
    mockedExportService.mockResolvedValue({ buffer: Buffer.from("pdf"), fileName: "PR-001.pdf" });
    const req: any = { params: { id: "doc1" }, user: { _id: "user1" } };
    const res = makeRes();
    const next = jest.fn(() => res.__resolveOnNext());

    exportDocumentPdf(req, res, next);
    await res.__settled;

    expect(next).not.toHaveBeenCalled();
    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "application/pdf");
    expect(res.setHeader).toHaveBeenCalledWith("Content-Disposition", expect.stringContaining('filename="PR-001.pdf"'));
    expect(res.send).toHaveBeenCalledWith(Buffer.from("pdf"));
  });

  it("KHÔNG gọi next(error) với fileName có dấu tiếng Việt (regression bug thật) — header vẫn được set", async () => {
    const vietnameseFileName = "RP-KKBĐK - HSCC-2026-0105.pdf";
    mockedExportService.mockResolvedValue({ buffer: Buffer.from("pdf"), fileName: vietnameseFileName });
    const req: any = { params: { id: "doc2" }, user: { _id: "user1" } };
    const res = makeRes();
    const next = jest.fn(() => res.__resolveOnNext());

    exportDocumentPdf(req, res, next);
    await res.__settled;

    // Bug gốc: `res.setHeader` ném `TypeError [ERR_INVALID_CHAR]` ngay khi
    // gọi → rơi vào `.catch(next)` → `next(error)` thay vì `res.send` được
    // gọi. Assert CẢ 2 chiều: next KHÔNG được gọi, res.send CÓ được gọi.
    expect(next).not.toHaveBeenCalled();
    const [, headerValue] = res.setHeader.mock.calls.find((c: any[]) => c[0] === "Content-Disposition");
    // Header value PHẢI chỉ chứa ký tự trong dải Latin-1 hợp lệ cho HTTP header
    // (Node `checkInvalidHeaderChar`: \t, \x20-\x7e, \x80-\xff) — đây chính
    // là điều kiện mà bug gốc VI PHẠM.
    expect(headerValue).toMatch(/^[\t\x20-\x7e\x80-\xff]*$/);
    expect(headerValue).toContain("filename*=UTF-8''");
    expect(res.send).toHaveBeenCalledWith(Buffer.from("pdf"));
  });
});

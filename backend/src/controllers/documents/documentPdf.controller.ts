import { Request, Response } from "express";
import contentDisposition from "content-disposition";
import { exportDocumentPdfService, verifyDocumentPdfExportService } from "../../services/documents/documentPdf.service";
import { catchAsync } from "../../shared/utils/catchAsync";

/* ===============================
   EXPORT PDF (Roadmap B5)
=============================== */
export const exportDocumentPdf = catchAsync(async (req: Request, res: Response) => {
  const { buffer, fileName } = await exportDocumentPdfService(req.params.id, req.user!._id);

  res.setHeader("Content-Type", "application/pdf");
  // ⚠️ SỬA BUG (user báo qua ảnh chụp Network tab, 2026-09-18): `fileName` là
  // `documentCode.pdf` — HẦU HẾT mã tài liệu thật có dấu tiếng Việt (VD
  // "RP-KKBĐK - HSCC-2026-0105"). Header HTTP chỉ chấp nhận ISO-8859-1 (Node
  // tự validate, `checkInvalidHeaderChar`) — set thẳng chuỗi UTF-8 có dấu vào
  // `Content-Disposition` ném `TypeError [ERR_INVALID_CHAR]` NGAY KHI GỌI
  // `res.setHeader`, rơi xuống `catchAsync` → lỗi 500 chung chung. `excel.
  // service.ts`/`assetExcel.service.ts`/`userAudits.service.ts` KHÔNG gặp lỗi
  // này vì tên file của họ CỐ Ý cố định thuần ASCII (`Danh-sach-...`,
  // `Audit-log_...`) — đây là chỗ ĐẦU TIÊN trong repo nhét dữ liệu thật
  // (documentCode) vào filename. `content-disposition` (đã có sẵn qua
  // Express, giờ khai báo trực tiếp trong package.json) tự mã hoá đúng chuẩn
  // RFC 6266 (`filename*=UTF-8''...` kèm fallback ASCII an toàn cho client
  // cũ) — không tự viết lại logic encode thủ công.
  res.setHeader("Content-Disposition", contentDisposition(fileName));
  res.send(buffer);
});

/* ===============================
   VERIFY (Roadmap B5)
=============================== */
export const verifyDocumentPdfExport = catchAsync(async (req: Request, res: Response) => {
  const result = await verifyDocumentPdfExportService(req.params.exportId);

  res.json({
    success: true,
    message: "Xác minh bản ghi xuất PDF thành công",
    data: result,
  });
});

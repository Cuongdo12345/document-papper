// import { Request, Response } from "express";
// import ExcelJS from "exceljs";
// import {Document} from "../models/document.model";
// import { buildDocumentFilter } from "../helpers/document.filter.helper";
// import PDFDocument from "pdfkit";
// import { DocumentPopulated } from "../types/document.type";

// export const exportDocumentsExcel = async (req: Request, res: Response) => {
//   try {
//     const filter = buildDocumentFilter(req.query);

//     const documents = await Document.find(filter)
//             .populate("department", "name")
//             .populate("createdBy", "fullName")
//             .sort({ createdAt: -1 })
//             .lean<DocumentPopulated[]>();

//     const workbook = new ExcelJS.Workbook();
//     const sheet = workbook.addWorksheet("Documents");

//     sheet.columns = [
//       { header: "STT", key: "stt", width: 5 },
//       { header: "Mã giấy", key: "documentCode", width: 18 },
//       { header: "Tiêu đề", key: "title", width: 30 },
//       { header: "Loại", key: "subType", width: 20 },
//       { header: "Khoa", key: "department", width: 25 },
//       { header: "Trạng thái", key: "status", width: 15 },
//       { header: "Người tạo", key: "createdBy", width: 20 },
//       { header: "Ngày tạo", key: "createdAt", width: 18 },
//     ];

//     documents.forEach((doc, index) => {
//       sheet.addRow({
//         stt: index + 1,
//         documentCode: doc.documentCode,
//         title: doc.title,
//         subType: doc.subType,
//         department: doc.department?.name,
//         // status: doc.status,
//         createdBy: doc.createdBy?.fullName,
//         createdAt: new Date(doc.createdAt).toLocaleDateString("vi-VN"),
//       });
//     });

//     res.setHeader(
//       "Content-Type",
//       "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
//     );
//     res.setHeader(
//       "Content-Disposition",
//       "attachment; filename=documents.xlsx"
//     );

//     await workbook.xlsx.write(res);
//     res.end();
//   } catch (error) {
//     res.status(500).json({ message: "Export Excel thất bại", error });
//   }
// };


// // 2️⃣ EXPORT DOCUMENTS TO EXCEL
// export const exportDocumentsPDF = async (req: Request, res: Response) => {
//   try {
//     const filter = buildDocumentFilter(req.query);

//     const documents = await Document.find(filter)
//       .populate("department", "name")
//       .populate("createdBy", "fullName")
//       .sort({ createdAt: -1 })
//       .lean<DocumentPopulated[]>();

//     const doc = new PDFDocument({ margin: 40, size: "A4" });

//     res.setHeader("Content-Type", "application/pdf");
//     res.setHeader(
//       "Content-Disposition",
//       "attachment; filename=documents.pdf"
//     );

//     doc.pipe(res);

//     doc.fontSize(16).text("DANH SÁCH GIẤY TỜ", { align: "center" });
//     doc.moveDown();

//     documents.forEach((d, index) => {
//       doc
//         .fontSize(10)
//         .text(
//           `${index + 1}. ${d.documentCode} | ${d.title}
//             Khoa: ${d.department?.name}
//             Trạng thái: Người tạo: ${d.createdBy?.fullName}
//             Ngày tạo: ${new Date(d.createdAt).toLocaleDateString("vi-VN")}
// -----------------------------`
//         );
//       doc.moveDown(0.5);
//     });

//     doc.end();
//   } catch (error) {
//     res.status(500).json({ message: "Export PDF thất bại", error });
//   }
// };
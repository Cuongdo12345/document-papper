// // services/pdf.service.ts
// const PdfPrinter = require("pdfmake/src/printer");
// import { buildPdfDefinition } from "../templates/pdf/index";
// import path from "path";

// const fonts = {
//   Roboto: {
//     bold: path.join(process.cwd(), "fonts/Roboto-Bold.ttf"),
//     medium: path.join(process.cwd(), "fonts/Roboto-Medium.ttf"),
//     regular: path.join(process.cwd(), "fonts/Roboto-Regular.ttf")
//     // bolditalics: path.join(process.cwd(), "fonts/Roboto-MediumItalic.ttf"),
//     // normal: path.join(process.cwd(), "fonts/Roboto-Regular.ttf"),
//     // bold: path.join(process.cwd(), "fonts/Roboto-Bold.ttf"),
//     // italics: path.join(process.cwd(), "fonts/Roboto-Regular.ttf"),
//     // bolditalics: path.join(process.cwd(), "fonts/Roboto-Bold.ttf"),
//   },
// };

// const printer = new PdfPrinter(fonts);

// export const generateDocumentPDF = async (
//   document: any
// ): Promise<Buffer> => {
//   const docDefinition = buildPdfDefinition(document);

//   return new Promise((resolve, reject) => {
//     const pdfDoc = printer.createPdfKitDocument(docDefinition);
//     const chunks: Buffer[] = [];

//     pdfDoc.on("data", (chunk:any) =>
//       chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
//     );

//     pdfDoc.on("end", () => resolve(Buffer.concat(chunks)));
//     pdfDoc.on("error", reject);

//     pdfDoc.end();
//   });
// };
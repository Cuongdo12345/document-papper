import ExcelJS from "exceljs";
import path from "path";
import { Types } from "mongoose";
import { Document } from "../models/document.model";
import Department from "../models/department.model";
import { Buffer } from "buffer";
import { generateDepartmentCode } from "../shared/helpers/generate-code";
import { parseExcelDate } from "../shared/utils/formatDate";
import { DocumentCategory } from "../models/document.model";
import { generateDocumentCode } from "../shared/utils/generateDocumentCode";
/**
 *  Xuất Excel danh sách document
 *  Cho phép người dùng xuất danh sách document ra file Excel, có thể lọc theo tháng và năm tạo document. File Excel sẽ bao gồm các thông tin chi tiết như mã document, loại, phòng ban, tiêu đề, ngày tạo, thiết bị liên quan (nếu có), số lượng, ghi chú, ngày bảo trì và chi phí thực tế (nếu có). Điều này giúp người dùng dễ dàng lưu trữ và phân tích dữ liệu ngoài hệ thống.
 * // Lưu ý: Đảm bảo rằng bạn đã cài đặt thư viện ExcelJS và có thư mục Export/document để lưu trữ file Excel được tạo ra. Trước khi thực hiện các truy vấn, chúng ta sẽ kiểm tra tính hợp lệ của departmentId để đảm bảo rằng nó là một ObjectId hợp lệ. Nếu không, chúng ta sẽ trả về lỗi Bad Request. Sau đó, chúng ta sẽ kiểm tra xem khoa có tồn tại hay không. Nếu không tìm thấy khoa, chúng ta sẽ trả về lỗi Not Found.
 * @param query
 * @param res
 */
export const exportDocumentsExcelPRO = async (query: any, res?: any) => {
  try {
    console.log("🚀 EXPORT START");

    const { month, year } = query;

    let filter: any = {
      isActive: true,
      $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
    };

    filter.category = "PROPOSAL";

    filter.subType = {
      $in: ["PROPOSE_REPAIR", "PROPOSE_INK", "PROPOSE_PROCUREMENT"],
    };

    // ===== SAFE DATE FILTER =====
    if (month && year && !isNaN(Number(month)) && !isNaN(Number(year))) {
      const start = new Date(Number(year), Number(month) - 1, 1);
      const end = new Date(Number(year), Number(month), 0, 23, 59, 59);

      filter.createdAt = { $gte: start, $lte: end };
    }

    const fileName = `Danh-sach-vat-tu_${Date.now()}.xlsx`;
    const filePath = path.join(__dirname, `../export/document/${fileName}`);

    // ===== SET HEADER =====
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);

    const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
      // stream: res,
      filename: filePath,
      useStyles: true,
      useSharedStrings: true,
    });

    const worksheet = workbook.addWorksheet("Document Export", {
      views: [{ state: "frozen", ySplit: 1 }],
    });

    worksheet.autoFilter = {
      from: "A1",
      to: "K1",
    };

    worksheet.columns = [
      { header: "Mã giấy", key: "documentCode", width: 25 },
      { header: "Loại giấy", key: "subType", width: 20 },
      { header: "Khoa", key: "department", width: 25 },
      { header: "Tiêu đề", key: "title", width: 35 },
      { header: "Ngày tạo", key: "createdAt", width: 15 },
      { header: "Tên thiết bị", key: "deviceName", width: 30 },
      { header: "Số lượng", key: "quantity", width: 10 },
      { header: "Ghi chú", key: "note", width: 40 },
      { header: "Kiểm tra", key: "inspectionResult", width: 35 },
      // { header: "Ngày sửa chữa", key: "serviceDate", width: 18 },
      // { header: "Trạng thái biên bản", key: "reportStatus", width: 20 }
      // { header: "Actual Cost", key: "actualCost", width: 18 },
      // { header: "Category", key: "category", width: 15 },
    ];

    // ===== LOAD CONFIRM_STATUS MAP =====
    const confirmStatusDocs = await Document.find({
      subType: "CONFIRM_STATUS",
      isActive: true,
    })
      .select("referenceTo meta.inspectionResult")
      .lean();

    const confirmMap = new Map<string, string>();

    for (const report of confirmStatusDocs) {
      if (report.referenceTo?.length) {
        const proposalId = report.referenceTo[0].toString();
        confirmMap.set(proposalId, report.meta?.inspectionResult || "");
      }

      //         if (report.referenceTo?.length) {
      //             for (const refId of report.referenceTo) {
      //             confirmMap.set(refId.toString(), {
      //                 inspectionResult: report.meta?.inspectionResult || "",
      //                 proposedSolution: report.meta?.proposedSolution || "",
      //             });
      //             }
      //   }
    }

    // ===== LOAD CHECK_DAMAGE MAP =====
    const checkDamageDocs = await Document.find({
      subType: "CHECK_DAMAGE",
      isActive: true,
    })
      .select("referenceTo meta.inspectionResult")
      .lean();

    const checkDamageMap = new Map<string, string>();

    //Trường hợp 1 refernceTo
    for (const report of checkDamageDocs) {
      if (report.referenceTo?.length) {
        const proposalId = report.referenceTo[0].toString();
        checkDamageMap.set(proposalId, report.meta?.inspectionResult || "");
      }
    }

    //Trường hợp nhiều refer
    //     for (const report of checkDamageDocs) {
    //         if (report.referenceTo?.length) {
    //             for (const refId of report.referenceTo) {
    //             inspectionMap.set(
    //                 refId.toString(),
    //                 report.meta?.inspectionResult || ""
    //       );
    //     }
    //   }
    // }

    const cursor = Document.find(filter)
      .populate("department", "name")
      .lean()
      .cursor();

    for await (const doc of cursor as any) {
      let inspectionResult = "";

      if (doc.subType === "PROPOSE_INK") {
        inspectionResult = confirmMap.get(doc._id.toString()) || "";
      }

      if (doc.subType === "PROPOSE_REPAIR") {
        inspectionResult = checkDamageMap.get(doc._id.toString()) || "";
      }
      const baseData = {
        documentCode: doc.documentCode || "",
        // category: doc.category || "",
        subType: doc.subType || "",
        department: doc.department?.name || "",
        title: doc.title || "",
        createdAt: doc.createdAt
          ? new Date(doc.createdAt).toLocaleDateString("vi-VN")
          : "",
        inspectionResult,
        // reportStatus: inspectionResult ? "Đã có report" : "Chưa có report"
      };

      if (
        //trường hợp này là lấy duy nhất đề xuất nào đó
        // doc.subType === "PROPOSE_REPAIR" &&
        doc.meta?.items?.length
      ) {
        for (const item of doc.meta.items) {
          const row = worksheet.addRow({
            ...baseData,
            deviceName: item.deviceName || "",
            quantity: item.quantity || "",
            note: item.note || "",
            serviceDate: "",
            actualCost: "",
          });

          row.eachCell((cell: any) => {
            cell.alignment = { wrapText: true };
          });

          row.commit();
        }
      } else {
        worksheet
          .addRow({
            ...baseData,
          })
          .commit();
      }
    }

    await workbook.commit();
    console.log("✅ EXPORT DONE");
  } catch (error) {
    console.error("❌ EXPORT SERVICE ERROR:", error);
    throw error;
  }
  //    return res.status(200).json({
  //       success: true,
  //       message: "Export thành công",
  //     //   downloadUrl: `../Export/document/${fileName}`,
  //     });
};

/**
 * API Service xử lý logic
 * Ok 🔥 giờ mình build cho bạn bản IMPORT nâng cao:

✅ Import PROPOSE_REPAIR / PROPOSE_INK
✅ Nếu trong file có inspectionResult
→ Tự động tạo:

CHECK_DAMAGE (cho PROPOSE_REPAIR)

CONFIRM_STATUS (cho PROPOSE_INK)
✅ Không phá auto documentCode
✅ Không duplicate report
✅ Production-safe

🎯 Giả định file Excel của bạn có cột:

| Document Code | SubType | Title | Device | Quantity | Note | Inspection Result |

🧠 Logic xử lý
Import Proposal
    ↓
Create / Update Proposal (auto generate code nếu create mới)
    ↓
Nếu có inspectionResult:
    ↓
Check đã có report chưa?
    ↓
Nếu chưa có → tạo report tương ứng

🚀 3️⃣ TỐI ƯU CHIẾN LƯỢC IMPORT
❌ Không dùng transaction
✅ Dùng upsert
✅ Không tạo trùng report
✅ Gộp nhiều dòng cùng proposal nếu trùng key
✅ Validate Loại giấy
✅ Parse ngày dd/mm/yyyy
✅ Performance tốt
 * @param filePath 
 * @returns 
 */
// function parseExcelDate(value: any): Date {
//   if (value instanceof Date) return value;

//   if (typeof value === "string") {
//     const [day, month, year] = value.split("/");
//     return new Date(`${year}-${month}-${day}`);
//   }

//   return new Date();
// }

// export const importDocumentsExcel = async (fileBuffer: Buffer) => {
//   const workbook = new ExcelJS.Workbook();
//   await workbook.xlsx.load(fileBuffer);

//   const sheet = workbook.getWorksheet(1);
//   if (!sheet) throw new Error("Không tìm thấy sheet");

//   const result = {
//     created: 0,
//     updated: 0,
//     reportsCreated: 0,
//     totalRows: sheet.rowCount - 1,
//     errors: [] as any[],
//   };

//   for (let i = 2; i <= sheet.rowCount; i++) {
//     try {
//       const row = sheet.getRow(i);

//       const subType = row.getCell(2).value?.toString().trim();
//       const departmentName = row.getCell(3).value?.toString().trim();
//       const title = row.getCell(4).value?.toString().trim();
//       const deviceName = row.getCell(5).value?.toString().trim();
//       const createdAt = parseExcelDate(row.getCell(6).value);
//       const quantity = Number(row.getCell(7).value) || 0;
//       const note = row.getCell(8).value?.toString().trim();
//       const inspectionResult = row.getCell(9).value?.toString().trim();

//       // ===== VALIDATION =====

//       if (!subType || !departmentName) {
//         result.errors.push({
//           row: i,
//           message: "Thiếu Loại giấy hoặc Khoa",
//         });
//         continue;
//       }

//       if (!["PROPOSE_INK", "PROPOSE_REPAIR"].includes(subType)) {
//         result.errors.push({
//           row: i,
//           message: "Loại giấy không hợp lệ",
//         });
//         continue;
//       }

//       const department = await Department.findOne({ name: departmentName });

//       if (!department) {
//         result.errors.push({
//           row: i,
//           message: `Không tìm thấy khoa: ${departmentName}`,
//         });
//         continue;
//       }

//       // ===== UPSERT PROPOSAL =====

//       const proposal:any = await Document.findOneAndUpdate(
//         {
//           category: "PROPOSAL",
//           subType,
//           department: department._id,
//           title,
//           createdAt,
//         },
//         {
//           $set: {
//             meta: {
//               items: [
//                 {
//                   deviceName,
//                   quantity,
//                   note,
//                 },
//               ],
//             },
//           },
//         },
//         {
//           new: true,
//           upsert: true,
//           setDefaultsOnInsert: true,
//         }
//       );

//       if (proposal.createdAt.getTime() === proposal.updatedAt.getTime()) {
//         result.created++;
//       } else {
//         result.updated++;
//       }

//       // ===== CREATE REPORT =====

//       if (inspectionResult) {
//         const reportSubType =
//           subType === "PROPOSE_INK"
//             ? "CONFIRM_STATUS"
//             : "CHECK_DAMAGE";

//         const existingReport = await Document.findOne({
//           category: "REPORT",
//           subType: reportSubType,
//           referenceTo: proposal._id,
//         });

//         if (!existingReport) {
//           await Document.create({
//             category: "REPORT",
//             subType: reportSubType,
//             department: department._id,
//             referenceTo: [proposal._id],
//             createdAt,
//             title:
//               reportSubType === "CONFIRM_STATUS"
//                 ? "Biên bản xác nhận tình trạng thiết bị"
//                 : "Biên bản kiểm tra tình trạng hư hỏng",
//             meta: {
//               inspectionResult,
//             },
//           });

//           result.reportsCreated++;
//         }
//       }
//     } catch (error: any) {
//       result.errors.push({
//         row: i,
//         message: error.message || "Lỗi không xác định",
//       });
//     }
//   }

//   return result;
// };

// export const importDocumentsExcel = async (fileBuffer: Buffer) => {
//   const workbook = new ExcelJS.Workbook();
//   await workbook.xlsx.load(fileBuffer);

//   const worksheet = workbook.getWorksheet(1);
//   if (!worksheet) throw new Error("Không tìm thấy sheet Excel");

//   const result = {
//     created: 0,
//     updated: 0,
//     reportsCreated: 0,
//     errors: 0,
//   };

//   for (let i = 2; i <= worksheet.rowCount; i++) {
//     try {
//       const row = worksheet.getRow(i);

//       const documentCode = row.getCell(1).value?.toString().trim();
//       const subType = row.getCell(2).value?.toString().trim();
//       const departmentName = row.getCell(3).value?.toString().trim();
//       const title = row.getCell(4).value?.toString().trim();
//       const deviceName = row.getCell(5).value?.toString().trim();
//       const createdDateCell = row.getCell(6).value;
//       const quantity = Number(row.getCell(7).value) || 0;
//       const note = row.getCell(8).value?.toString().trim();
//       const inspectionResult = row.getCell(9).value?.toString().trim();

//       if (!subType || !departmentName) {
//         result.errors++;
//         continue;
//       }

//       let createdAt: Date = new Date(); // default

//         if (createdDateCell) {
//           if (createdDateCell instanceof Date) {
//             createdAt = createdDateCell;
//           } else {
//             const parsed = new Date(createdDateCell.toString());
//             if (!isNaN(parsed.getTime())) {
//               createdAt = parsed;
//             }
//           }
//         }

//       // 🔹 Tìm department
//       const department = await Department.findOne({name: { $regex: new RegExp(`^${departmentName}$`, "i") },});
//       if (!department) {
//         result.errors++;
//         continue;
//       }
// //       if (!department) {
// //         department = await Department.create({
// //           name: departmentName,
// //           code: departmentName
// //             .replace(/\s+/g, "")
// //             .substring(0, 10)
// //             .toUpperCase(),
// //         });
// // }
//       let proposal:any;

//       // =============================
//       // 1️⃣ UPSERT PROPOSAL
//       // =============================
//       if (documentCode) {
//         proposal = await Document.findOneAndUpdate(
//           { documentCode },
//           {
//             $set: {
//               category: "PROPOSAL",
//               subType,
//               department: department._id,
//               title,
//               // createdAt,
//               meta: {
//                 items: [
//                   {
//                     deviceName,
//                     quantity,
//                     note,
//                   },
//                 ],
//               },
//             },
//           },
//           {
//             new: true,
//             upsert: true,
//             setDefaultsOnInsert: true,
//           }
//         );

//         // phân biệt created / updated
//         if (proposal.createdAt.getTime() === proposal.updatedAt.getTime()) {
//           result.created++;
//         } else {
//           result.updated++;
//         }
//       } else {
//         proposal = await Document.create({
//           category: "PROPOSAL",
//           subType,
//           department: department._id,
//           title,
//           createdAt,
//           meta: {
//             items: [
//               {
//                 deviceName,
//                 quantity,
//                 note,
//               },
//             ],
//           },
//         });

//         result.created++;
//       }

//       // =============================
//       // 2️⃣ AUTO CREATE REPORT
//       // =============================
//       if (inspectionResult) {
//         const reportSubType =
//           subType === "PROPOSE_REPAIR"
//             ? "CHECK_DAMAGE"
//             : subType === "PROPOSE_INK"
//             ? "CONFIRM_STATUS"
//             : null;

//         if (reportSubType) {
//           const existingReport = await Document.findOne({
//             subType: reportSubType,
//             referenceTo: proposal._id,
//           });

//           if (!existingReport) {
//             await Document.create({
//               category: "REPORT",
//               subType: reportSubType,
//               department: department._id,
//               createdAt,
//               referenceTo: [proposal._id],
//               title:
//                 reportSubType === "CHECK_DAMAGE"
//                   ? "Biên bản kiểm tra tình trạng hư hỏng"
//                   : "Biên bản xác nhận tình trạng thiết bị",
//               meta: {
//                 inspectionResult,
//               },
//             });

//             result.reportsCreated++;
//           }
//         }
//       }
//     } catch (err) {
//       result.errors++;
//       continue;
//     }
//   }

//   return result;
// };

export const importDocumentsExcel = async (fileBuffer: Buffer, userId: any) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(fileBuffer);

  const sheet = workbook.getWorksheet(1);
  if (!sheet) throw new Error("Không tìm thấy sheet");

  const result = {
    created: 0,
    updated: 0,
    reportsCreated: 0,
    totalRows: sheet.rowCount - 1,
    errors: [] as any[],
  };

  for (let i = 2; i <= sheet.rowCount; i++) {
    try {
      const row = sheet.getRow(i);
      const subType = row.getCell(2).value?.toString().trim();
      const departmentName = row.getCell(3).value?.toString().trim();
      const title = row.getCell(4).value?.toString().trim();
      const deviceName = row.getCell(5).value?.toString().trim();
      const createdAt = parseExcelDate(row.getCell(6).value);
      const quantity = Number(row.getCell(7).value) || 0;
      const unitPrice = Number(row.getCell(8).value) || 0;
      const note = row.getCell(9).value?.toString().trim();
      const inspectionResult = row.getCell(10).value?.toString().trim();

      // ================= VALIDATE =================
      const totalPrice = quantity * unitPrice;

      if (!subType || !departmentName) {
        result.errors.push({
          row: i,
          message: "Thiếu Loại giấy hoặc Khoa",
        });
        continue;
      }

      if (
        !["PROPOSE_INK", "PROPOSE_REPAIR", "PROPOSE_PROCUREMENT"].includes(
          subType,
        )
      ) {
        result.errors.push({
          row: i,
          message: "Loại giấy không hợp lệ",
        });
        continue;
      }

      const department = await Department.findOne({ name: departmentName });

      if (!department) {
        result.errors.push({
          row: i,
          message: `Không tìm thấy khoa: ${departmentName}`,
        });
        continue;
      }

      // ================= FIND PROPOSAL =================

      let proposal: any = await Document.findOne({
        category: DocumentCategory.PROPOSAL,
        subType,
        department: department._id,
        title,
        createdAt,
        "meta.items.deviceName": deviceName,
      });

      // ================= CREATE NEW =================

      if (!proposal) {
        const documentCode = await generateDocumentCode(
          DocumentCategory.PROPOSAL,
          department._id as Types.ObjectId,
          createdAt,
        );

        proposal = await Document.create({
          documentCode,
          category: DocumentCategory.PROPOSAL,
          subType,
          department: department._id,
          title,
          createdAt,
          createdBy: userId,
          meta: {
            items: [
              {
                deviceName,
                quantity,
                unitPrice,
                totalPrice,
                note,
              },
            ],
             totalAmount: totalPrice,
          },
        });

        result.created++;
      } else {
        // update items
        proposal.meta.items = [
          {
            deviceName,
            quantity,
            unitPrice,
            totalPrice,
            note,
          },
        ];

        proposal.meta.totalAmount = totalPrice;
        await proposal.save();
        
        result.updated++;
      }

      // ================= CREATE REPORT =================

      if (inspectionResult) {
        const reportSubType =
          subType === "PROPOSE_INK" ? "CONFIRM_STATUS" : "CHECK_DAMAGE";

        const existingReport = await Document.findOne({
          category: DocumentCategory.REPORT,
          subType: reportSubType,
          referenceTo: proposal._id,
        });

        if (!existingReport) {
          const reportCode = await generateDocumentCode(
            DocumentCategory.REPORT,
            department._id as Types.ObjectId,
            createdAt,
          );

          await Document.create({
            documentCode: reportCode,
            category: DocumentCategory.REPORT,
            subType: reportSubType,
            department: department._id,
            referenceTo: [proposal._id],
            createdAt,
            createdBy: userId,
            title:
              reportSubType === "CONFIRM_STATUS"
                ? "Biên bản xác nhận tình trạng thiết bị"
                : "Biên bản kiểm tra tình trạng hư hỏng",
            meta: {
              inspectionResult,
            },
          });

          result.reportsCreated++;
        }
      }
    } catch (error: any) {
      result.errors.push({
        row: i,
        message: error.message || "Lỗi không xác định",
      });
    }
  }

  return result;
};

/**
 * API import khoa từ danh sách excel vào database tự động
 * @param fileBuffer
 * @returns
 */
export const syncDepartmentFromExcel = async (fileBuffer: Buffer) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(fileBuffer);

  const worksheet = workbook.getWorksheet(1);
  if (!worksheet) throw new Error("Không tìm thấy sheet Excel");

  const departmentSet = new Set<string>();

  // ⚠️ Giả sử cột 4 là cột Khoa (giống import document)
  for (let i = 2; i <= worksheet.rowCount; i++) {
    const departmentName = worksheet
      .getRow(i)
      .getCell(3)
      .value?.toString()
      .trim();

    if (departmentName) {
      departmentSet.add(departmentName);
    }
  }

  const departmentList = Array.from(departmentSet);

  const result = {
    totalInFile: departmentList.length,
    created: 0,
    existed: 0,
  };

  for (const name of departmentList) {
    const existing = await Department.findOne({
      name: { $regex: new RegExp(`^${name}$`, "i") },
    });

    if (existing) {
      result.existed++;
      continue;
    }
  
    await Department.create({
      name,
      code: generateDepartmentCode(name),
    });

    result.created++;
  }

  return result;
};

// export const importDocumentsExcel = async (filePath: string) => {
//   // const session = await mongoose.startSession();
//   // session.startTransaction();

//   try {
//     const workbook = new ExcelJS.Workbook();
//     await workbook.xlsx.readFile(filePath);

//     const worksheet = workbook.getWorksheet(1);
//     if (!worksheet) throw new Error("Không tìm thấy sheet Excel");

//     const result = {
//       created: 0,
//       updated: 0,
//       reportsCreated: 0,
//       errors: 0,
//     };

//     for (let i = 2; i <= worksheet.rowCount; i++) {
//       const row = worksheet.getRow(i);

//       const documentCode = row.getCell(1).value?.toString().trim();
//       const subType = row.getCell(3).value?.toString().trim();
//       const departmentName = row.getCell(4).value?.toString().trim();
//       const title = row.getCell(5).value?.toString().trim();
//       const createdDateCell = row.getCell(6).value;
//       const deviceName = row.getCell(7).value?.toString().trim();
//       const quantity = Number(row.getCell(8).value) || 0;
//       const note = row.getCell(9).value?.toString().trim();
//       const inspectionResult = row.getCell(10).value?.toString().trim();

//       if (!subType || !departmentName) {
//         result.errors++;
//         continue;
//       }

//       let createdAt: Date = new Date(); // default

//         if (createdDateCell) {
//           if (createdDateCell instanceof Date) {
//             createdAt = createdDateCell;
//           } else {
//             const parsed = new Date(createdDateCell.toString());
//             if (!isNaN(parsed.getTime())) {
//               createdAt = parsed;
//             }
//           }
// }

//       // ===== FIND DEPARTMENT =====
//       const department = await Department.findOne({
//         name: departmentName,
//       });
//       // .session(session);

//       if (!department) {
//         result.errors++;
//         continue;
//       }

//       let proposal = null;

//       if (documentCode) {
//         proposal = await Document.findOne({
//           documentCode,
//         });
//         // .session(session);
//       }

//       // =============================
//       // CREATE NEW PROPOSAL
//       // =============================
//       if (!proposal) {
//         proposal = await Document.create(
//           [
//             {
//               category: "PROPOSAL",
//               subType,
//               department: department._id,
//               title,
//               createdAt,
//               meta: {
//                 items: [
//                   {
//                     deviceName,
//                     quantity,
//                     note,
//                   },
//                 ],
//               },
//             },
//           ],
//           // { session }
//         ).then((res) => res[0]);

//         result.created++;
//       } else {
//         // =============================
//         // UPDATE EXISTING PROPOSAL
//         // =============================
//         proposal.department = department._id;
//         proposal.title = title || "";

//         proposal.meta = proposal.meta || {};
//         proposal.meta.items = [
//           {
//             deviceName,
//             quantity,
//             note,
//           },
//         ];

//         await proposal.save(); //{ session }
//         result.updated++;
//       }

//       // =============================
//       // AUTO CREATE REPORT
//       // =============================
//       if (inspectionResult) {
//         const reportSubType =
//           subType === "PROPOSE_REPAIR"
//             ? "CHECK_DAMAGE"
//             : subType === "PROPOSE_INK"
//             ? "CONFIRM_STATUS"
//             : null;

//         if (reportSubType) {
//           const existingReport = await Document.findOne({
//             subType: reportSubType,
//             referenceTo: proposal._id,
//           });
//           // .session(session);

//           if (!existingReport) {
//             await Document.create(
//               [
//                 {
//                   category: "REPORT",
//                   subType: reportSubType,
//                   department: department._id,
//                   createdAt,
//                   referenceTo: [proposal._id],
//                   title:
//                     reportSubType === "CHECK_DAMAGE"
//                       ? "Biên bản kiểm tra tình trạng hư hỏng"
//                       : "Biên bản xác nhận tình trạng thiết bị",
//                   meta: {
//                     inspectionResult,
//                   },
//                 },
//               ],
//               // { session }
//             );

//             result.reportsCreated++;
//           }
//         }
//       }
//     }

//     // await session.commitTransaction();
//     // session.endSession();

//     return result;
//   } catch (error) {
//     // await session.abortTransaction();
//     // session.endSession();
//     throw error;
//   }
// };

// export const importProposalExcel = async (filePath: string) => {

//   const workbook = new ExcelJS.Workbook();
//   await workbook.xlsx.readFile(filePath);

//   const worksheet = workbook.getWorksheet(1);

//   if (!worksheet) {
//     throw new Error("Không tìm thấy sheet dữ liệu");
//   }

//   const results = {
//     created: 0,
//     updated: 0,
//     errors: 0,
//   };

//   const rows: any[] = [];

//   worksheet.eachRow((row, rowNumber) => {
//     if (rowNumber === 1) return; // skip header

//     rows.push({
//       documentCode: row.getCell(1).value?.toString().trim(),
//       category: row.getCell(2).value?.toString().trim(),
//       subType: row.getCell(3).value?.toString().trim(),
//       departmentName: row.getCell(4).value?.toString().trim(),
//       title: row.getCell(5).value?.toString().trim(),
//       deviceName: row.getCell(7).value?.toString().trim(),
//       quantity: Number(row.getCell(8).value) || 0,
//       note: row.getCell(9).value?.toString().trim(),
//     });
//   });

//   for (const data of rows) {
//     try {
//       if (!data.documentCode || !data.subType) {
//         results.errors++;
//         continue;
//       }

//       const existing = await Document.findOne({
//         documentCode: data.documentCode,
//       });

//       if (existing) {
//         existing.meta = existing.meta || {};
//         existing.meta.items = [
//           {
//             deviceName: data.deviceName,
//             quantity: data.quantity,
//             note: data.note,
//           },
//         ];
//         await existing.save();
//         results.updated++;
//       } else {
//         await Document.create({
//           documentCode: data.documentCode,
//           category: data.category,
//           subType: data.subType,
//           title: data.title,
//           meta: {
//             items: [
//               {
//                 deviceName: data.deviceName,
//                 quantity: data.quantity,
//                 note: data.note,
//               },
//             ],
//           },
//         });
//         results.created++;
//       }
//     } catch (err) {
//       results.errors++;
//     }
//   }

//   fs.unlinkSync(filePath); // xoá file sau khi import

//   return results;
// };

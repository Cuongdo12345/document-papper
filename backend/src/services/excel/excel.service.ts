import ExcelJS from "exceljs";
import { Types } from "mongoose";
import {
  Document,
  DocumentCategory,
} from "../../models/documents/document.model";
import Department from "../../models/departments/department.model";
import { Buffer } from "buffer";
import { generateDepartmentCode } from "../../shared/helpers/generate-code";
import { parseExcelDateStrict } from "../../shared/utils/formatDate";
import { generateDocumentCode } from "../../shared/utils/generateDocumentCode";
import { parseInspectionJSONLike } from "../../shared/helpers/parse-doc";
import { buildMapFromReports } from "../../shared/helpers/buildMapReports";
import ApiError from "../../shared/errors/ApiError";
import { ImportHistory } from "../../models/importAudit/importhistory.model";
import {
  parsePaginationQuery,
  buildPaginationMeta,
} from "../../shared/utils/Queryparsing.util";
import {
  MAX_IMPORT_ROWS,
  MAX_SYNC_ROWS,
  MAX_STORED_ERRORS,
  VALID_PROPOSAL_SUBTYPES,
  ALLOWED_WORKFLOW_STATUSES,
} from "../../shared/constants/excel.constants";
import { validateImportHeaderRow } from "../../shared/helpers/importHeaderValidator.helper";
import {
  normalizeDepartmentKey,
  findDepartmentsCaseInsensitive,
} from "../../shared/helpers/departmentLookup.helper";
import { resolveImportStatus } from "../../shared/helpers/importStatus.helper";
import { withTransaction } from "../../shared/utils/withTransaction";

// Alias giữ nguyên tên type cũ tại chỗ dùng bên dưới.
type RawPaginationQuery = Record<string, any>;

/* =========================================================================
   EXPORT DOCUMENTS TO EXCEL

   🟡 Bổ sung filter department/status/subType (docblock gốc của
   `exportDocumentsExcel` đã "hứa" các filter này từ đầu nhưng code thật
   trước đây chỉ có month/year). Tất cả filter đều optional trừ `department`
   khi user KHÔNG phải ADMIN — trường hợp đó `department` được controller
   TỰ GÁN theo `req.user.department`, không phải giá trị FE truyền lên (xem
   `excel.controller.ts`), nên nó luôn có giá trị hợp lệ khi chạy tới đây.
========================================================================= */
export const exportDocumentsExcelPRO = async (query: any, res: any) => {
  try {
    const { month, year, department, status, subType } = query;

    const filter: any = {
      isActive: true,
      category: DocumentCategory.PROPOSAL,
      subType: { $in: VALID_PROPOSAL_SUBTYPES },
      $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
    };

    if (month || year) {
      if (!month || !year) {
        throw ApiError.badRequest(
          "Cần truyền đủ cả month và year để lọc theo tháng",
        );
      }

      const monthNum = Number(month);
      const yearNum = Number(year);

      if (!Number.isInteger(monthNum) || monthNum < 1 || monthNum > 12) {
        throw ApiError.badRequest(
          "month không hợp lệ, phải là số nguyên từ 1 đến 12",
        );
      }

      if (!Number.isInteger(yearNum) || yearNum < 2000 || yearNum > 2100) {
        throw ApiError.badRequest("year không hợp lệ");
      }

      const start = new Date(yearNum, monthNum - 1, 1);
      const end = new Date(yearNum, monthNum, 0, 23, 59, 59);
      filter.createdAt = { $gte: start, $lte: end };
    }

    if (department) {
      if (!Types.ObjectId.isValid(department)) {
        throw ApiError.badRequest("Department không hợp lệ");
      }
      filter.department = new Types.ObjectId(department);
    }

    if (status) {
      if (!ALLOWED_WORKFLOW_STATUSES.includes(status)) {
        throw ApiError.badRequest(
          `status không hợp lệ, chỉ chấp nhận: ${ALLOWED_WORKFLOW_STATUSES.join(", ")}`,
        );
      }
      filter.workflowStatus = status;
    }

    if (subType) {
      const requestedSubTypes = String(subType)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const invalidSubTypes = requestedSubTypes.filter(
        (s) => !VALID_PROPOSAL_SUBTYPES.includes(s),
      );

      if (invalidSubTypes.length) {
        throw ApiError.badRequest(
          `subType không hợp lệ: ${invalidSubTypes.join(", ")}`,
        );
      }

      if (requestedSubTypes.length) {
        filter.subType = { $in: requestedSubTypes };
      }
    }

    const fileName = `Danh-sach-vat-tu_${Date.now()}.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);

    const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
      stream: res,
      useStyles: true,
      useSharedStrings: true,
    });

    const worksheet = workbook.addWorksheet("Export", {
      views: [{ state: "frozen", ySplit: 1 }],
    });

    worksheet.autoFilter = { from: "A1", to: "L1" };

    worksheet.columns = [
      { header: "Mã giấy", key: "documentCode", width: 25 },
      { header: "Loại giấy", key: "subType", width: 20 },
      { header: "Khoa", key: "department", width: 25 },
      { header: "Tiêu đề", key: "title", width: 35 },
      { header: "Ngày đề xuất", key: "createdAt", width: 15 },
      { header: "Thiết bị", key: "deviceName", width: 25 },
      { header: "SL", key: "quantity", width: 8 },
      { header: "Đơn giá", key: "unitPrice", width: 15 },
      { header: "Thành tiền", key: "totalPrice", width: 18 },
      { header: "Ghi chú", key: "note", width: 30 },
      { header: "Kiểm tra", key: "inspectionResult", width: 40 },
      { header: "Tiền kiểm tra", key: "reportTotal", width: 15 },
    ];

    const [confirmMap, checkDamageMap] = await Promise.all([
      buildMapFromReports("CONFIRM_STATUS"),
      buildMapFromReports("CHECK_DAMAGE"),
    ]);

    const cursor = Document.find(filter)
      .sort({ createdAt: 1 })
      .populate("department", "name")
      .lean()
      .cursor();

    const totals = { ink: 0, procurement: 0, report: 0 };

    for await (const doc of cursor as any) {
      const reportData =
        doc.subType === "PROPOSE_INK"
          ? confirmMap.get(doc._id.toString())
          : checkDamageMap.get(doc._id.toString());

      const inspectionResult = reportData?.text || "";
      const reportTotal = reportData?.total || 0;
      totals.report += reportTotal;

      const base = {
        documentCode: doc.documentCode,
        subType: doc.subType,
        department: doc.department?.name || "",
        title: doc.title,
        createdAt: doc.createdAt
          ? new Date(doc.createdAt).toLocaleDateString("vi-VN")
          : "",
        inspectionResult,
        reportTotal,
      };

      if (!doc.meta?.items?.length) {
        worksheet.addRow(base).commit();
        continue;
      }

      for (const item of doc.meta.items) {
        const totalPrice = item.totalPrice || item.quantity * item.unitPrice;

        if (doc.subType === "PROPOSE_INK") totals.ink += totalPrice;
        if (doc.subType === "PROPOSE_PROCUREMENT")
          totals.procurement += totalPrice;

        const row = worksheet.addRow({
          ...base,
          deviceName: item.deviceName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice,
          note: item.note,
        });

        ["unitPrice", "totalPrice", "reportTotal"].forEach((key) => {
          row.getCell(key).numFmt = '#,##0 "VND"';
        });

        row.commit();
      }
    }

    const inkRow = worksheet.addRow([
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "Tổng sạc mực",
      totals.ink,
    ]);
    inkRow.getCell(10).numFmt = '#,##0 "VND"';
    inkRow.getCell(9).font = { bold: true };
    inkRow.commit();

    const procurementRow = worksheet.addRow([
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "Tổng dự trù",
      totals.procurement,
    ]);
    procurementRow.getCell(10).numFmt = '#,##0 "VND"';
    procurementRow.getCell(9).font = { bold: true };
    procurementRow.commit();

    const reportTotalRow = worksheet.addRow([
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "Tổng sửa chữa, thay thế",
      totals.report,
    ]);
    reportTotalRow.getCell(10).numFmt = '#,##0 "VND"';
    reportTotalRow.getCell(9).font = { bold: true };
    reportTotalRow.commit();

    const grand = totals.ink + totals.procurement + totals.report;
    const totalRow = worksheet.addRow([
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "TỔNG",
      grand,
    ]);
    totalRow.getCell(10).numFmt = '#,##0 "VND"';
    totalRow.font = { bold: true };
    totalRow.commit();

    await workbook.commit();
    res.end();
  } catch (err) {
    console.error("[exportDocumentsExcelPRO] Lỗi khi xuất Excel:", err);

    if (!res.headersSent) {
      throw err;
    }
    res.end();
  }
};

/* =========================================================================
   TEMPLATE ĐỂ TẢI VỀ (mục 🟠#3)
   GET /excel/template — trả file mẫu có ĐÚNG header mà importDocumentsExcel
   mong đợi, kèm 1 dòng ví dụ minh hoạ định dạng dữ liệu. Cột này PHẢI khớp
   1-1 với `IMPORT_COLUMNS` trong `helpers/importHeaderValidator.helper.ts`
   — đổi 1 trong 2 chỗ mà quên đổi chỗ kia sẽ làm template tự thân không
   còn hợp lệ với chính validator của nó.
========================================================================= */
/**
 * ⚠️ SỬA (phát hiện khi review lại): hàm này stream file Excel trực tiếp vào
 * `res` — giống hệt cơ chế của `exportDocumentsExcelPRO` — nhưng KHÔNG có
 * try/catch nào bảo vệ, trong khi `exportDocumentsExcelPRO` có. Nếu
 * `workbook.xlsx.write(res)` lỗi giữa chừng (client đóng kết nối sớm, lỗi
 * nội bộ ExcelJS...), lỗi văng thẳng ra `catchAsync` ở controller → gọi
 * `next(error)` → error middleware cố `res.json()` một lỗi 500, nhưng lúc
 * này header (`Content-Disposition: attachment`) và có thể vài byte đầu của
 * file ĐÃ được gửi đi rồi → dính lỗi `ERR_HTTP_HEADERS_SENT`, khiến response
 * bị cắt cụt giữa chừng. Hệ quả với người dùng: bấm tải file mẫu, trình
 * duyệt vẫn lưu ra máy 1 file `.xlsx`, nhưng file đó bị cắt dở dang → mở lên
 * báo lỗi "file bị hỏng/không đọc được" thay vì báo lỗi rõ ràng cho user.
 * Nay bọc try/catch cùng logic với `exportDocumentsExcelPRO`: nếu header
 * CHƯA gửi, ném lỗi cho error middleware xử lý bình thường (trả JSON lỗi
 * đúng chuẩn); nếu ĐÃ gửi, chỉ còn cách đóng kết nối (`res.end()`) — không
 * thể đổi sang response lỗi JSON được nữa.
 */
export const getImportExcelTemplate = async (res: any) => {
  try {
    const fileName = "mau-import-de-xuat.xlsx";

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Import");

    worksheet.columns = [
      { header: "Mã giấy", key: "documentCode", width: 20 },
      { header: "Loại giấy", key: "subType", width: 20 },
      { header: "Khoa", key: "department", width: 25 },
      { header: "Tiêu đề", key: "title", width: 35 },
      { header: "Tên thiết bị", key: "deviceName", width: 25 },
      { header: "Ngày đề xuất", key: "createdAt", width: 15 },
      { header: "Số lượng", key: "quantity", width: 8 },
      { header: "Giá tiền", key: "unitPrice", width: 15 },
      { header: "Ghi chú", key: "note", width: 30 },
      { header: "Kiểm tra", key: "inspectionResult", width: 40 },
    ];

    worksheet.getRow(1).font = { bold: true };

    const exampleRow = worksheet.addRow({
      // Cột "Mã giấy" do hệ thống tự sinh qua `generateDocumentCode` khi
      // import, KHÔNG đọc từ Excel — ghi rõ ví dụ để user không nhầm tưởng
      // phải tự điền mã giấy.
      documentCode: "(hệ thống tự sinh, không cần điền)",
      subType: "PROPOSE_REPAIR",
      department: "Khoa Nội",
      title: "Đề xuất sửa chữa máy in",
      deviceName: "Máy in Canon LBP2900",
      createdAt: new Date(2026, 0, 1),
      quantity: 1,
      unitPrice: 500000,
      note: "Hỏng trục cuốn giấy",
      inspectionResult: "",
    });

    exampleRow.getCell("createdAt").numFmt = "dd/mm/yyyy";

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("[getImportExcelTemplate] Lỗi khi tạo file mẫu:", err);

    if (!res.headersSent) {
      throw err;
    }
    res.end();
  }
};

/* =========================================================================
   IMPORT DOCUMENTS FROM EXCEL (mục 🟠#1: hỗ trợ dryRun)
   Header validation: xem `helpers/importHeaderValidator.helper.ts`.

   ⚠️ THÊM TRANSACTION (per-row, KHÔNG bọc cả vòng lặp): mỗi dòng Excel có
   thể ghi 2 Document liên kết logic (`proposal` + `report` với
   `referenceTo: [proposal._id]`). Nếu write thứ 2 lỗi sau khi write thứ 1
   đã thành công, sẽ để lại 1 proposal "mồ côi" (được lưu) dù dòng đó bị
   báo là lỗi trong `result.errors[]`. Bọc `withTransaction` quanh đúng 2
   write này (KHÔNG bọc cả `for`) để giữ đúng hành vi cố ý hiện có: file
   500 dòng, 1 dòng lỗi thì CHỈ dòng đó rollback, 499 dòng khác vẫn import
   bình thường — transaction trùm cả vòng lặp sẽ phá vỡ đúng hành vi này.

   `generateDocumentCode` KHÔNG truyền session (giữ nguyên, xem giải thích
   trong `generateDocumentCode.ts`) — cơ chế Counter Collection chỉ đảm bảo
   unique, không đảm bảo gapless, rollback làm "mất" 1 số thứ tự là chấp
   nhận được, không phải bug.
========================================================================= */
export interface ImportOptions {
  dryRun?: boolean;
  fileName?: string;
}

export const importDocumentsExcel = async (
  fileBuffer: Buffer,
  userId: any,
  options: ImportOptions = {},
) => {
  const { dryRun = false, fileName = "unknown.xlsx" } = options;

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(fileBuffer as any);

  const sheet = workbook.getWorksheet(1);
  if (!sheet) throw ApiError.badRequest("Không tìm thấy sheet");

  validateImportHeaderRow(sheet);

  const totalDataRows = sheet.rowCount - 1;
  if (totalDataRows > MAX_IMPORT_ROWS) {
    throw ApiError.badRequest(
      `File vượt quá ${MAX_IMPORT_ROWS} dòng dữ liệu (hiện có ${totalDataRows} dòng) — vui lòng chia nhỏ file.`,
    );
  }

  const result = {
    dryRun,
    created: 0,
    updated: 0,
    reportsCreated: 0,
    totalRows: 0,
    errors: [] as any[],
    preview: [] as any[],
  };

  const departmentNames = new Set<string>();
  for (let i = 2; i <= sheet.rowCount; i++) {
    const name = sheet.getRow(i).getCell(3).value?.toString().trim();
    if (name) departmentNames.add(name);
  }

  const departmentMap = await findDepartmentsCaseInsensitive(departmentNames);

  for (let i = 2; i <= sheet.rowCount; i++) {
    const row = sheet.getRow(i);

    const isRowBlank = [2, 3, 4, 5, 6, 7, 8, 9, 10].every((col) => {
      const value = row.getCell(col).value;
      return (
        value === null || value === undefined || String(value).trim() === ""
      );
    });
    if (isRowBlank) continue;

    result.totalRows++;

    try {
      const subType = row.getCell(2).value?.toString().trim();
      const departmentName = row.getCell(3).value?.toString().trim();
      const title = row.getCell(4).value?.toString().trim();
      const deviceName = row.getCell(5).value?.toString().trim();
      const createdAt = parseExcelDateStrict(
        row.getCell(6).value,
        `Ngày đề xuất (dòng ${i})`,
      );
      const quantity = Number(row.getCell(7).value) || 0;
      const unitPrice = Number(row.getCell(8).value) || 0;
      const note = row.getCell(9).value?.toString().trim();
      const inspectionResult = row.getCell(10).value?.toString().trim();

      const totalPrice = quantity * unitPrice;

      if (!subType || !departmentName) {
        result.errors.push({ row: i, message: "Thiếu Loại giấy hoặc Khoa" });
        continue;
      }

      if (!VALID_PROPOSAL_SUBTYPES.includes(subType)) {
        result.errors.push({ row: i, message: "Loại giấy không hợp lệ" });
        continue;
      }

      const department = departmentMap.get(
        normalizeDepartmentKey(departmentName),
      );
      if (!department) {
        result.errors.push({
          row: i,
          message: `Không tìm thấy khoa: ${departmentName}`,
        });
        continue;
      }

      let proposal: any = await Document.findOne({
        category: DocumentCategory.PROPOSAL,
        subType,
        department: department._id,
        title,
        createdAt,
        "meta.items.deviceName": deviceName,
      });

      const action: "create" | "update" = proposal ? "update" : "create";

      let willCreateReport = false;
      const parsedInspection = parseInspectionJSONLike(inspectionResult);

      if (!dryRun) {
        // Trả kết quả TỪ callback, không mutate biến ngoài (`proposal`) bên
        // trong — nếu withTransaction retry do lỗi tạm thời, callback chạy lại
        // từ đầu với state SẠCH (đọc lại `proposal` gốc qua closure, không bị
        // "nhiễm" giá trị đã gán ở attempt trước đó bị rollback).
        const txResult = await withTransaction(async (session) => {
          let currentProposal = proposal;
          let reportCreated = false;

          if (!currentProposal) {
            const documentCode = await generateDocumentCode(
              DocumentCategory.PROPOSAL,
              department._id as Types.ObjectId,
              createdAt,
            );

            const [created] = await Document.create(
              [
                {
                  documentCode,
                  category: DocumentCategory.PROPOSAL,
                  subType,
                  department: department._id,
                  title,
                  createdAt,
                  createdBy: userId,
                  meta: {
                    items: [
                      { deviceName, quantity, unitPrice, totalPrice, note },
                    ],
                    totalAmount: totalPrice,
                  },
                },
              ],
              { session },
            );
            currentProposal = created;
          } else {
            // `currentProposal` ở đây là document đã tồn tại từ trước (đọc TRƯỚC
            // khi vào transaction) — set lại field rồi save là thao tác idempotent,
            // chạy lại nhiều lần (nếu retry) vẫn cho cùng 1 kết quả cuối, an toàn.
            currentProposal.meta.items = [
              { deviceName, quantity, unitPrice, totalPrice, note },
            ];
            currentProposal.meta.totalAmount = totalPrice;
            await currentProposal.save({ session });
          }

          if (parsedInspection && parsedInspection.items.length) {
            const reportSubType =
              subType === "PROPOSE_INK" ? "CONFIRM_STATUS" : "CHECK_DAMAGE";

            const existingReport = await Document.findOne({
              category: DocumentCategory.REPORT,
              subType: reportSubType,
              referenceTo: currentProposal._id,
            }).session(session);

            if (!existingReport) {
              const reportCode = await generateDocumentCode(
                DocumentCategory.REPORT,
                department._id as Types.ObjectId,
                createdAt,
              );

              await Document.create(
                [
                  {
                    documentCode: reportCode,
                    category: DocumentCategory.REPORT,
                    subType: reportSubType,
                    department: department._id,
                    referenceTo: [currentProposal._id],
                    createdAt,
                    createdBy: userId,
                    title:
                      reportSubType === "CONFIRM_STATUS"
                        ? "Biên bản xác nhận tình trạng thiết bị"
                        : "Biên bản kiểm tra tình trạng hư hỏng",
                    meta: {
                      inspectionResult: parsedInspection.inspectionResult,
                      items: parsedInspection.items,
                      totalAmount: parsedInspection.totalAmount,
                    },
                  },
                ],
                { session },
              );

              reportCreated = true;
            }
          }

          return { proposal: currentProposal, reportCreated };
        });

        // Chỉ gán biến ngoài SAU KHI transaction đã resolve thành công — không
        // còn khả năng bị "nhiễm" state từ 1 attempt đã rollback.
        proposal = txResult.proposal;
        willCreateReport = txResult.reportCreated;
      } else {
        // dryRun: không ghi DB, chỉ xác định willCreateReport để hiển thị preview.
        if (parsedInspection && parsedInspection.items.length) {
          if (proposal?._id) {
            const reportSubType =
              subType === "PROPOSE_INK" ? "CONFIRM_STATUS" : "CHECK_DAMAGE";
            const existingReport = await Document.findOne({
              category: DocumentCategory.REPORT,
              subType: reportSubType,
              referenceTo: proposal._id,
            });
            willCreateReport = !existingReport;
          } else {
            willCreateReport = true;
          }
        }
      }

      if (action === "create") {
        result.created++;
      } else {
        result.updated++;
      }
      if (willCreateReport) {
        result.reportsCreated++;
      }

      if (dryRun) {
        result.preview.push({
          row: i,
          action,
          department: departmentName,
          title,
          deviceName,
          willCreateReport,
        });
      }
    } catch (error: any) {
      result.errors.push({
        row: i,
        message: error.message || "Lỗi không xác định",
      });
    }
  }

  try {
    await ImportHistory.create({
      importedBy: userId,
      fileName,
      mode: dryRun ? "dryRun" : "commit",
      status: resolveImportStatus(result),
      totalRows: result.totalRows,
      created: result.created,
      updated: result.updated,
      reportsCreated: result.reportsCreated,
      errorCount: result.errors.length,
      errors: result.errors.slice(0, MAX_STORED_ERRORS),
    });
  } catch (auditErr) {
    console.error("[importDocumentsExcel] Ghi audit trail thất bại:", auditErr);
  }

  return result;
};

// export interface ImportOptions {
//   dryRun?: boolean;
//   fileName?: string;
// }

// export const importDocumentsExcel = async (fileBuffer: Buffer, userId: any, options: ImportOptions = {}) => {
//   const { dryRun = false, fileName = "unknown.xlsx" } = options;

//   const workbook = new ExcelJS.Workbook();
//   await workbook.xlsx.load(fileBuffer as any);

//   const sheet = workbook.getWorksheet(1);
//   if (!sheet) throw ApiError.badRequest("Không tìm thấy sheet");

//   validateImportHeaderRow(sheet);

//   const totalDataRows = sheet.rowCount - 1;
//   if (totalDataRows > MAX_IMPORT_ROWS) {
//     throw ApiError.badRequest(
//       `File vượt quá ${MAX_IMPORT_ROWS} dòng dữ liệu (hiện có ${totalDataRows} dòng) — vui lòng chia nhỏ file.`,
//     );
//   }

//   const result = {
//     dryRun,
//     created: 0,
//     updated: 0,
//     reportsCreated: 0,
//     totalRows: 0,
//     errors: [] as any[],
//     preview: [] as any[],
//   };

//   const departmentNames = new Set<string>();
//   for (let i = 2; i <= sheet.rowCount; i++) {
//     const name = sheet.getRow(i).getCell(3).value?.toString().trim();
//     if (name) departmentNames.add(name);
//   }

//   const departmentMap = await findDepartmentsCaseInsensitive(departmentNames);

//   for (let i = 2; i <= sheet.rowCount; i++) {
//     const row = sheet.getRow(i);

//     const isRowBlank = [2, 3, 4, 5, 6, 7, 8, 9, 10].every((col) => {
//       const value = row.getCell(col).value;
//       return value === null || value === undefined || String(value).trim() === "";
//     });
//     if (isRowBlank) continue;

//     result.totalRows++;

//     try {
//       const subType = row.getCell(2).value?.toString().trim();
//       const departmentName = row.getCell(3).value?.toString().trim();
//       const title = row.getCell(4).value?.toString().trim();
//       const deviceName = row.getCell(5).value?.toString().trim();
//       const createdAt = parseExcelDateStrict(row.getCell(6).value, `Ngày đề xuất (dòng ${i})`);
//       const quantity = Number(row.getCell(7).value) || 0;
//       const unitPrice = Number(row.getCell(8).value) || 0;
//       const note = row.getCell(9).value?.toString().trim();
//       const inspectionResult = row.getCell(10).value?.toString().trim();

//       const totalPrice = quantity * unitPrice;

//       if (!subType || !departmentName) {
//         result.errors.push({ row: i, message: "Thiếu Loại giấy hoặc Khoa" });
//         continue;
//       }

//       if (!VALID_PROPOSAL_SUBTYPES.includes(subType)) {
//         result.errors.push({ row: i, message: "Loại giấy không hợp lệ" });
//         continue;
//       }

//       const department = departmentMap.get(normalizeDepartmentKey(departmentName));
//       if (!department) {
//         result.errors.push({ row: i, message: `Không tìm thấy khoa: ${departmentName}` });
//         continue;
//       }

//       let proposal: any = await Document.findOne({
//         category: DocumentCategory.PROPOSAL,
//         subType,
//         department: department._id,
//         title,
//         createdAt,
//         "meta.items.deviceName": deviceName,
//       });

//       const action: "create" | "update" = proposal ? "update" : "create";

//       if (!proposal) {
//         if (!dryRun) {
//           const documentCode = await generateDocumentCode(
//             DocumentCategory.PROPOSAL,
//             department._id as Types.ObjectId,
//             createdAt,
//           );

//           proposal = await Document.create({
//             documentCode,
//             category: DocumentCategory.PROPOSAL,
//             subType,
//             department: department._id,
//             title,
//             createdAt,
//             createdBy: userId,
//             meta: {
//               items: [{ deviceName, quantity, unitPrice, totalPrice, note }],
//               totalAmount: totalPrice,
//             },
//           });
//         }
//         result.created++;
//       } else {
//         if (!dryRun) {
//           proposal.meta.items = [{ deviceName, quantity, unitPrice, totalPrice, note }];
//           proposal.meta.totalAmount = totalPrice;
//           await proposal.save();
//         }
//         result.updated++;
//       }

//       const parsedInspection = parseInspectionJSONLike(inspectionResult);
//       let willCreateReport = false;

//       if (parsedInspection && parsedInspection.items.length) {
//         const reportSubType = subType === "PROPOSE_INK" ? "CONFIRM_STATUS" : "CHECK_DAMAGE";

//         const existingReport = proposal?._id
//           ? await Document.findOne({
//               category: DocumentCategory.REPORT,
//               subType: reportSubType,
//               referenceTo: proposal._id,
//             })
//           : null;

//         if (!existingReport) {
//           willCreateReport = true;

//           if (!dryRun) {
//             const reportCode = await generateDocumentCode(
//               DocumentCategory.REPORT,
//               department._id as Types.ObjectId,
//               createdAt,
//             );

//             await Document.create({
//               documentCode: reportCode,
//               category: DocumentCategory.REPORT,
//               subType: reportSubType,
//               department: department._id,
//               referenceTo: [proposal._id],
//               createdAt,
//               createdBy: userId,
//               title:
//                 reportSubType === "CONFIRM_STATUS"
//                   ? "Biên bản xác nhận tình trạng thiết bị"
//                   : "Biên bản kiểm tra tình trạng hư hỏng",
//               meta: {
//                 inspectionResult: parsedInspection.inspectionResult,
//                 items: parsedInspection.items,
//                 totalAmount: parsedInspection.totalAmount,
//               },
//             });
//           }

//           result.reportsCreated++;
//         }
//       }

//       if (dryRun) {
//         result.preview.push({
//           row: i,
//           action,
//           department: departmentName,
//           title,
//           deviceName,
//           willCreateReport,
//         });
//       }
//     } catch (error: any) {
//       result.errors.push({ row: i, message: error.message || "Lỗi không xác định" });
//     }
//   }

//   try {
//     await ImportHistory.create({
//       importedBy: userId,
//       fileName,
//       mode: dryRun ? "dryRun" : "commit",
//       status: resolveImportStatus(result),
//       totalRows: result.totalRows,
//       created: result.created,
//       updated: result.updated,
//       reportsCreated: result.reportsCreated,
//       errorCount: result.errors.length,
//       errors: result.errors.slice(0, MAX_STORED_ERRORS),
//     });

//   } catch (auditErr) {
//     console.error("[importDocumentsExcel] Ghi audit trail thất bại:", auditErr);
//   }

//   return result;
// };

/* =========================================================================
   LỊCH SỬ IMPORT (audit trail) — GET /excel/import-history
========================================================================= */
const IMPORT_HISTORY_SORT_FIELDS = [
  "createdAt",
  "status",
  "totalRows",
] as const;

export const listImportHistory = async (
  query: RawPaginationQuery,
  scope: { importedBy?: any },
) => {
  const { page, limit, sortBy, sortOrder } = parsePaginationQuery(query, {
    defaultLimit: 20,
    defaultSortBy: "createdAt",
    allowedSortBy: IMPORT_HISTORY_SORT_FIELDS,
  });

  const filter: Record<string, any> = {};
  if (scope.importedBy) filter.importedBy = scope.importedBy;

  const skip = (page - 1) * limit;
  const sortStage = { [sortBy]: sortOrder === "asc" ? 1 : -1 } as Record<
    string,
    1 | -1
  >;

  const [items, total] = await Promise.all([
    ImportHistory.find(filter)
      .sort(sortStage)
      .skip(skip)
      .limit(limit)
      .populate("importedBy", "fullName username")
      .lean(),
    ImportHistory.countDocuments(filter),
  ]);

  return { items, pagination: buildPaginationMeta(page, limit, total) };
};

/* =========================================================================
   SYNC DEPARTMENT FROM EXCEL (không đổi so với bản trước)
========================================================================= */
export const syncDepartmentFromExcel = async (fileBuffer: Buffer) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(fileBuffer as any);

  const worksheet = workbook.getWorksheet(1);
  if (!worksheet) throw ApiError.badRequest("Không tìm thấy sheet Excel");

  const totalDataRows = worksheet.rowCount - 1;
  if (totalDataRows > MAX_SYNC_ROWS) {
    throw ApiError.badRequest(
      `File vượt quá ${MAX_SYNC_ROWS} dòng dữ liệu (hiện có ${totalDataRows} dòng) — vui lòng chia nhỏ file.`,
    );
  }

  const departmentSet = new Set<string>();
  for (let i = 2; i <= worksheet.rowCount; i++) {
    const departmentName = worksheet
      .getRow(i)
      .getCell(3)
      .value?.toString()
      .trim();
    if (departmentName) departmentSet.add(departmentName);
  }

  const departmentList = Array.from(departmentSet);

  const result = { totalInFile: departmentList.length, created: 0, existed: 0 };
  if (!departmentList.length) return result;

  const existingDepartments = await Department.find({}, { name: 1 }).lean();
  const existingNameSet = new Set(
    existingDepartments.map((d: any) => d.name.toLowerCase()),
  );

  const seenLower = new Set<string>();
  const toCreate: string[] = [];

  for (const name of departmentList) {
    const lower = name.toLowerCase();

    if (existingNameSet.has(lower)) {
      result.existed++;
      continue;
    }

    if (seenLower.has(lower)) {
      result.existed++;
      continue;
    }

    seenLower.add(lower);
    toCreate.push(name);
  }

  if (toCreate.length) {
    try {
      const inserted = await Department.insertMany(
        toCreate.map((name) => ({ name, code: generateDepartmentCode(name) })),
        { ordered: false },
      );
      result.created += inserted.length;
    } catch (err: any) {
      const insertedCount = err?.insertedDocs?.length ?? 0;
      result.created += insertedCount;
      console.error(
        "[syncDepartmentFromExcel] Một số department insert lỗi (có thể do trùng tên/race condition):",
        err,
      );
    }
  }

  return result;
};

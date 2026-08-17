// services/assets/assetExcel.service.ts
//
// GIAI ĐOẠN 5 — Import/export Excel hàng loạt cho Asset. Tái dùng TOÀN BỘ
// hạ tầng Excel đã có sẵn của project (`ImportHistory`, `MAX_IMPORT_ROWS`,
// `validateImportHeaderRow` — đã sửa thêm tham số tuỳ chọn ở
// `importHeaderValidator.helper.ts` để dùng chung được với bộ cột khác)
// thay vì viết lại từ đầu.
//
// PHẠM VI: import CHỈ TẠO MỚI (không hỗ trợ update qua Excel) — cố tình
// không cho phép đổi `department`/`status`/`assignedTo` của asset đã tồn
// tại qua import, để KHÔNG bỏ qua audit trail của `assetAssignment.service.ts`
// (Giai đoạn 2). Muốn nhập hàng loạt tài sản mới (kiểm kê ban đầu) — dùng
// đúng nghĩa; muốn sửa/cấp phát tài sản đã có — dùng API tương ứng.

import ExcelJS from "exceljs";
import { Buffer } from "buffer";
import { Types } from "mongoose";
import { Asset, AssetStatus } from "../../../models/assets/asset.model";
import { AssetCategory } from "../../../models/assets/assetCategory.model";
import Department from "../../../models/departments/department.model";
import ApiError from "../../../shared/errors/ApiError";
import { generateAssetCode } from "../../../shared/helpers/generateAssetCode";
import { validateImportHeaderRow } from "../../../shared/helpers/importHeaderValidator.helper";
import {
  ASSET_IMPORT_COLUMNS,
  MAX_IMPORT_ROWS,
  MAX_STORED_ERRORS,
} from "../../../shared/constants/excel.constants";
import { ImportHistory } from "../../../models/importAudit/importhistory.model";
import { resolveImportStatus } from "../../../shared/helpers/importStatus.helper";

export interface AssetImportOptions {
  dryRun?: boolean;
  fileName?: string;
}

/**
 * Parse ngày KHÔNG BẮT BUỘC (khác `parseExcelDateStrict` — vốn throw nếu
 * rỗng, dùng cho field bắt buộc như "Ngày đề xuất" của Document). Asset có
 * `purchaseDate`/`warrantyExpiredAt` đều optional trong `CreateAssetDTO`
 * (Giai đoạn 1) — Excel để trống 2 cột này vẫn phải hợp lệ, chỉ throw nếu
 * CÓ giá trị nhưng sai định dạng.
 */
const parseOptionalExcelDate = (value: any, fieldLabel: string): Date | undefined => {
  if (value === undefined || value === null || value === "") return undefined;

  if (value instanceof Date) {
    if (isNaN(value.getTime())) {
      throw ApiError.badRequest(`${fieldLabel} không hợp lệ`);
    }
    return value;
  }

  if (typeof value === "number") {
    // Excel serial date
    const excelEpoch = new Date(1899, 11, 30);
    return new Date(excelEpoch.getTime() + value * 86400000);
  }

  const str = String(value).trim();
  const match = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!match) {
    throw ApiError.badRequest(`${fieldLabel} không hợp lệ — định dạng đúng: dd/mm/yyyy`);
  }
  const [, d, m, y] = match;
  const parsed = new Date(Number(y), Number(m) - 1, Number(d));
  if (isNaN(parsed.getTime())) {
    throw ApiError.badRequest(`${fieldLabel} không hợp lệ`);
  }
  return parsed;
};

/* =========================================================================
   EXPORT ASSETS TO EXCEL
========================================================================= */
export const exportAssetsExcelPRO = async (query: any, res: any) => {
  try {
    const { department, category, status, keyword } = query;

    const filter: any = { isActive: true };

    if (department) {
      if (!Types.ObjectId.isValid(department)) {
        throw ApiError.badRequest("Department không hợp lệ");
      }
      filter.department = new Types.ObjectId(department);
    }

    if (category) {
      if (!Types.ObjectId.isValid(category)) {
        throw ApiError.badRequest("Category không hợp lệ");
      }
      filter.category = new Types.ObjectId(category);
    }

    if (status) {
      if (!Object.values(AssetStatus).includes(status)) {
        throw ApiError.badRequest(
          `status không hợp lệ, chỉ chấp nhận: ${Object.values(AssetStatus).join(", ")}`,
        );
      }
      filter.status = status;
    }

    if (keyword) {
      filter.$or = [
        { name: { $regex: keyword, $options: "i" } },
        { assetCode: { $regex: keyword, $options: "i" } },
        { serialNumber: { $regex: keyword, $options: "i" } },
      ];
    }

    const fileName = `Danh-sach-tai-san_${Date.now()}.xlsx`;

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

    const worksheet = workbook.addWorksheet("Assets", {
      views: [{ state: "frozen", ySplit: 1 }],
    });

    worksheet.autoFilter = { from: "A1", to: "L1" };

    // Header PHẢI khớp 1-1 với ASSET_IMPORT_COLUMNS — export ra rồi có thể
    // sửa/nhập lại (round-trip) mà không lệch cột.
    worksheet.columns = [
      { header: "Mã tài sản", key: "assetCode", width: 22 },
      { header: "Danh mục", key: "category", width: 18 },
      { header: "Tên tài sản", key: "name", width: 30 },
      { header: "Khoa/phòng", key: "department", width: 20 },
      { header: "Số serial", key: "serialNumber", width: 22 },
      { header: "Model", key: "model", width: 20 },
      { header: "Hãng sản xuất", key: "manufacturer", width: 18 },
      { header: "Vị trí", key: "location", width: 25 },
      { header: "Ngày mua", key: "purchaseDate", width: 14 },
      { header: "Giá mua", key: "purchasePrice", width: 15 },
      { header: "Hạn bảo hành", key: "warrantyExpiredAt", width: 14 },
      { header: "Nhà cung cấp", key: "supplier", width: 25 },
    ];

    const cursor = Asset.find(filter)
      .sort({ createdAt: -1 })
      .populate("category", "code")
      .populate("department", "code")
      .lean()
      .cursor();

    for await (const asset of cursor as any) {
      const row = worksheet.addRow({
        assetCode: asset.assetCode,
        category: asset.category?.code || "",
        name: asset.name,
        department: asset.department?.code || "",
        serialNumber: asset.serialNumber || "",
        model: asset.model || "",
        manufacturer: asset.manufacturer || "",
        location: asset.location || "",
        purchaseDate: asset.purchaseDate
          ? new Date(asset.purchaseDate).toLocaleDateString("vi-VN")
          : "",
        purchasePrice: asset.purchasePrice || 0,
        warrantyExpiredAt: asset.warrantyExpiredAt
          ? new Date(asset.warrantyExpiredAt).toLocaleDateString("vi-VN")
          : "",
        supplier: asset.supplier || "",
      });

      row.getCell("purchasePrice").numFmt = '#,##0 "VND"';
      row.commit();
    }

    await workbook.commit();
    res.end();
  } catch (err) {
    console.error("[exportAssetsExcelPRO] Lỗi khi xuất Excel:", err);

    // Cùng cách xử lý đã sửa cho `getImportExcelTemplate` (Document) — nếu
    // header CHƯA gửi, ném lỗi cho error middleware trả JSON đúng chuẩn;
    // nếu ĐÃ gửi (đang stream dở), chỉ còn cách đóng kết nối.
    if (!res.headersSent) {
      throw err;
    }
    res.end();
  }
};

/* =========================================================================
   TEMPLATE ĐỂ TẢI VỀ — GET /assets/import/template
========================================================================= */
export const getImportAssetsExcelTemplate = async (res: any) => {
  try {
    const fileName = "mau-import-tai-san.xlsx";

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Import");

    worksheet.columns = [
      { header: "Mã tài sản", key: "assetCode", width: 30 },
      { header: "Danh mục", key: "category", width: 18 },
      { header: "Tên tài sản", key: "name", width: 30 },
      { header: "Khoa/phòng", key: "department", width: 20 },
      { header: "Số serial", key: "serialNumber", width: 22 },
      { header: "Model", key: "model", width: 20 },
      { header: "Hãng sản xuất", key: "manufacturer", width: 18 },
      { header: "Vị trí", key: "location", width: 25 },
      { header: "Ngày mua", key: "purchaseDate", width: 14 },
      { header: "Giá mua", key: "purchasePrice", width: 15 },
      { header: "Hạn bảo hành", key: "warrantyExpiredAt", width: 14 },
      { header: "Nhà cung cấp", key: "supplier", width: 25 },
    ];

    worksheet.getRow(1).font = { bold: true };

    const exampleRow = worksheet.addRow({
      // Cột "Mã tài sản" do hệ thống tự sinh qua `generateAssetCode` khi
      // import, KHÔNG đọc từ Excel — ghi rõ ví dụ để user không nhầm
      // tưởng phải tự điền mã.
      assetCode: "(hệ thống tự sinh, không cần điền)",
      category: "PC",
      name: "Máy tính để bàn phòng Khám bệnh",
      department: "KHAMBENH",
      serialNumber: "DELL-OPT7010-DEMO001",
      model: "OptiPlex 7010",
      manufacturer: "Dell",
      location: "Quầy tiếp đón số 1",
      purchaseDate: new Date(2026, 0, 1),
      purchasePrice: 14500000,
      warrantyExpiredAt: new Date(2028, 0, 1),
      supplier: "Công ty TNHH Thương mại Điện tử Phong Vũ",
    });

    exampleRow.getCell("purchaseDate").numFmt = "dd/mm/yyyy";
    exampleRow.getCell("warrantyExpiredAt").numFmt = "dd/mm/yyyy";
    exampleRow.getCell("purchasePrice").numFmt = '#,##0 "VND"';

    worksheet.addRow([]);
    const noteRow = worksheet.addRow([
      "Ghi chú: Danh mục = mã code (VD: PC, LAPTOP...). Khoa/phòng = mã code (VD: CNTT, KHAMBENH...). Ngày theo định dạng dd/mm/yyyy.",
    ]);
    noteRow.font = { italic: true, color: { argb: "FF808080" } };

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("[getImportAssetsExcelTemplate] Lỗi khi tạo file mẫu:", err);

    if (!res.headersSent) {
      throw err;
    }
    res.end();
  }
};

/* =========================================================================
   IMPORT ASSETS FROM EXCEL (chỉ tạo mới — xem giải thích đầu file)
========================================================================= */
export const importAssetsExcel = async (
  fileBuffer: Buffer,
  userId: any,
  options: AssetImportOptions = {},
) => {
  const { dryRun = false, fileName = "unknown.xlsx" } = options;

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(fileBuffer as any);

  const sheet = workbook.getWorksheet(1);
  if (!sheet) throw ApiError.badRequest("Không tìm thấy sheet");

  validateImportHeaderRow(sheet, ASSET_IMPORT_COLUMNS, "GET /assets/import/template");

  const totalDataRows = sheet.rowCount - 1;
  if (totalDataRows > MAX_IMPORT_ROWS) {
    throw ApiError.badRequest(
      `File vượt quá ${MAX_IMPORT_ROWS} dòng dữ liệu (hiện có ${totalDataRows} dòng) — vui lòng chia nhỏ file.`,
    );
  }

  const result = {
    dryRun,
    created: 0,
    updated: 0, // luôn = 0 (import chỉ tạo mới), giữ field cho khớp shape chung với ImportHistory
    reportsCreated: 0, // không áp dụng cho Asset, giữ field cho khớp shape chung
    totalRows: 0,
    errors: [] as any[],
    preview: [] as any[],
  };

  // Lấy trước toàn bộ category/department CẦN DÙNG trong file — tránh N+1
  // query (query riêng cho từng dòng), giống cách `findDepartmentsCaseInsensitive`
  // được dùng ở `importDocumentsExcel`.
  const categoryCodes = new Set<string>();
  const departmentCodes = new Set<string>();
  for (let i = 2; i <= sheet.rowCount; i++) {
    const row = sheet.getRow(i);
    const categoryCode = row.getCell(2).value?.toString().trim().toUpperCase();
    const departmentCode = row.getCell(4).value?.toString().trim().toUpperCase();
    if (categoryCode) categoryCodes.add(categoryCode);
    if (departmentCode) departmentCodes.add(departmentCode);
  }

  const [categories, departments] = await Promise.all([
    AssetCategory.find({ code: { $in: [...categoryCodes] }, isActive: true }),
    Department.find({ code: { $in: [...departmentCodes] } }),
  ]);

  const categoryMap = new Map(categories.map((c: any) => [c.code, c]));
  const departmentMap = new Map(departments.map((d: any) => [d.code, d]));

  for (let i = 2; i <= sheet.rowCount; i++) {
    const row = sheet.getRow(i);

    const isRowBlank = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].every((col) => {
      const value = row.getCell(col).value;
      return value === null || value === undefined || String(value).trim() === "";
    });
    if (isRowBlank) continue;

    result.totalRows++;

    try {
      const categoryCode = row.getCell(2).value?.toString().trim().toUpperCase();
      const name = row.getCell(3).value?.toString().trim();
      const departmentCode = row.getCell(4).value?.toString().trim().toUpperCase();
      const serialNumber = row.getCell(5).value?.toString().trim() || undefined;
      const model = row.getCell(6).value?.toString().trim() || undefined;
      const manufacturer = row.getCell(7).value?.toString().trim() || undefined;
      const location = row.getCell(8).value?.toString().trim() || undefined;
      const purchaseDate = parseOptionalExcelDate(row.getCell(9).value, `Ngày mua (dòng ${i})`);
      const purchasePrice = row.getCell(10).value ? Number(row.getCell(10).value) : undefined;
      const warrantyExpiredAt = parseOptionalExcelDate(
        row.getCell(11).value,
        `Hạn bảo hành (dòng ${i})`,
      );
      const supplier = row.getCell(12).value?.toString().trim() || undefined;

      if (!categoryCode || !name || !departmentCode) {
        result.errors.push({
          row: i,
          message: "Thiếu Danh mục, Tên tài sản hoặc Khoa/phòng (đều bắt buộc)",
        });
        continue;
      }

      const category = categoryMap.get(categoryCode);
      if (!category) {
        result.errors.push({
          row: i,
          message: `Không tìm thấy danh mục còn active với mã: ${categoryCode}`,
        });
        continue;
      }

      const department = departmentMap.get(departmentCode);
      if (!department) {
        result.errors.push({
          row: i,
          message: `Không tìm thấy khoa/phòng với mã: ${departmentCode}`,
        });
        continue;
      }

      if (dryRun) {
        result.preview.push({
          row: i,
          action: "create",
          category: categoryCode,
          department: departmentCode,
          name,
          serialNumber,
        });
        continue;
      }

      const assetCode = await generateAssetCode(
        department._id as Types.ObjectId,
        purchaseDate,
      );

      await Asset.create({
        assetCode,
        category: category._id,
        department: department._id,
        name,
        serialNumber,
        model,
        manufacturer,
        location,
        purchaseDate,
        purchasePrice,
        warrantyExpiredAt,
        supplier,
        status: AssetStatus.IN_STOCK,
        createdBy: userId,
        updatedBy: userId,
      });

      result.created++;
    } catch (error: any) {
      result.errors.push({ row: i, message: error.message || "Lỗi không xác định" });
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
    console.error("[importAssetsExcel] Ghi audit trail thất bại:", auditErr);
  }

  return result;
};

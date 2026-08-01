import ExcelJS from "exceljs";
import UserAudit from "../../models/users/userAudit.model";
import ApiError from "../../shared/errors/ApiError";

//Định nghĩa interface cho filter của audit logs
interface AuditFilter {
  // ⚠️ SỬA (multi-action filter): action giờ có thể là 1 string (giữ
  // nguyên behavior cũ) HOẶC string[] (lọc nhiều action cùng lúc qua $in).
  action?: string | string[];
  performedBy?: string;
  user?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

// Giới hạn số dòng tối đa cho 1 lần export — cùng tinh thần với
// `MAX_IMPORT_ROWS`/`MAX_SYNC_ROWS` bên Excel module (`export.service.ts`):
// audit log tăng vĩnh viễn, không cap thì 1 request "export toàn bộ, không
// filter" có thể kéo hàng triệu bản ghi, treo cursor/response rất lâu.
const MAX_EXPORT_ROWS = 20000;

// ================================ SERVICE MỚI CHUYỂN LOGIC XỬ LÝ LIÊN QUAN ĐẾN USER AUDIT VỀ ĐÂY ================================
// Service sẽ chứa logic xử lý nghiệp vụ liên quan đến user audit, ví dụ: lấy logs, thống kê dashboard, v.v.
// Controller sẽ gọi service để lấy dữ liệu và trả về cho client
// ============================================================================================================================
/**
 * 📌 Build Mongo Filter dùng chung
 */
const buildAuditFilter = ({
  action,
  performedBy,
  user,
  fromDate,
  toDate,
}: AuditFilter) => {
  const filter: any = {};

  // ⚠️ MỚI (multi-action filter): nếu action là mảng → dùng $in để match
  // nhiều giá trị cùng lúc; vẫn tận dụng được compound index
  // `{action:1, createdAt:-1}` sẵn có (MongoDB dùng index cho $in trên field
  // đứng đầu compound index, chỉ là quét nhiều điểm range thay vì 1, không
  // phải sort trong bộ nhớ). Nếu action là string đơn → giữ nguyên match cũ,
  // KHÔNG đổi behavior cho client đang gọi API kiểu cũ.
  if (action) {
    filter.action = Array.isArray(action) ? { $in: action } : action;
  }
  if (performedBy) filter.performedBy = performedBy;
  if (user) filter.user = user;

  if (fromDate || toDate) {
    filter.createdAt = {};
    if (fromDate) filter.createdAt.$gte = new Date(fromDate);
    if (toDate) filter.createdAt.$lte = new Date(toDate);
  }

  return filter;
};

/**
 * 📌 GET AUDIT LOGS (ADMIN)
 */
export const getAuditLogsService = async (query: AuditFilter) => {
  const {
    page = 1,
    limit = 10,
  } = query;

  const filter = buildAuditFilter(query);
  const skip = (page - 1) * limit;

  // Dùng Promise.all để chạy song song 2 query lấy logs và đếm tổng số logs
  const [logs, total] = await Promise.all([
    UserAudit.find(filter)
      .populate("performedBy", "username email role")
      .populate("user", "username email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),

    UserAudit.countDocuments(filter),
  ]);

  return {
    data: logs,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * 📊 GET AUDIT DASHBOARD
 */
export const getAuditDashboardService = async (
  query: { fromDate?: string; toDate?: string }
) => {
  const { fromDate, toDate } = query;

  const match: any = {};

  if (fromDate || toDate) {
    match.createdAt = {};
    if (fromDate) match.createdAt.$gte = new Date(fromDate);
    if (toDate) match.createdAt.$lte = new Date(toDate);
  }

  // Dùng Promise.all để chạy song song 3 query thống kê theo action, theo ngày và đếm tổng số logs
  const [byAction, byDay, total] = await Promise.all([

    // 📌 thống kê theo action
    UserAudit.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$action",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]),

    // 📅 thống kê theo ngày
    UserAudit.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
            },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),

    UserAudit.countDocuments(match),
  ]);

  return {
    total,
    byAction,
    byDay,
  };
};

/* =========================================================================
   📤 EXPORT AUDIT LOGS (Excel / CSV) — phục vụ báo cáo/tuân thủ
   ⚠️ MỚI — tái dùng ĐÚNG pattern stream của `exportDocumentsExcelPRO`
   (excel/export.service.ts):
     1. Stream trực tiếp vào `res` bằng `ExcelJS.stream.xlsx.WorkbookWriter`
        — KHÔNG ghi file tạm ra đĩa server.
     2. Dùng Mongo `.cursor()` thay vì `.find().lean()` load hết vào mảng —
        audit log có thể rất nhiều bản ghi, cursor giữ bộ nhớ ổn định.
     3. try/catch đặc biệt: nếu lỗi xảy ra TRƯỚC khi header được gửi (ví dụ
        lỗi validate filter, lỗi DB ngay từ đầu) → rethrow để `catchAsync` ở
        controller bắt, trả JSON lỗi chuẩn qua error middleware. Nếu lỗi xảy
        ra SAU khi đã bắt đầu stream (header `Content-Disposition` đã gửi) →
        KHÔNG rethrow (vì lúc này response không thể chuyển sang JSON lỗi
        được nữa, sẽ dính `ERR_HTTP_HEADERS_SENT`), chỉ `res.end()` để đóng
        kết nối, tránh client bị treo request.

   Cả 2 hàm export (Excel/CSV) DÙNG CHUNG `buildAuditFilter` — filter nào áp
   dụng được cho danh sách audit log (`GET /audit`) thì cũng áp dụng y hệt
   cho export, đảm bảo "export đúng những gì đang xem" — tránh trường hợp
   phổ biến là filter UI và filter export lệch nhau.
========================================================================= */

type ExportAuditFilter = Omit<AuditFilter, "page" | "limit">;

/**
 * Kiểm tra + đếm số dòng sẽ export TRƯỚC khi mở stream — nếu vượt
 * `MAX_EXPORT_ROWS`, throw lỗi validate bình thường (chưa set header nào,
 * nên `catchAsync` bắt được, trả JSON lỗi rõ ràng thay vì để client tải về
 * 1 file .xlsx/.csv bị cắt cụt giữa chừng do treo quá lâu).
 */
const assertExportableRowCount = async (filter: any) => {
  const total = await UserAudit.countDocuments(filter);

  if (total === 0) {
    throw ApiError.badRequest("Không có audit log nào khớp bộ lọc để export");
  }

  if (total > MAX_EXPORT_ROWS) {
    throw ApiError.badRequest(
      `Kết quả có ${total} dòng, vượt quá giới hạn ${MAX_EXPORT_ROWS} dòng/lần export — vui lòng thu hẹp bộ lọc (theo action/khoảng ngày) rồi thử lại.`,
    );
  }

  return total;
};

const AUDIT_EXPORT_COLUMNS = [
  { header: "Thời gian", key: "createdAt", width: 20 },
  { header: "Hành động", key: "action", width: 22 },
  { header: "Người thực hiện", key: "performedBy", width: 30 },
  { header: "Đối tượng tác động", key: "user", width: 30 },
  { header: "Ghi chú", key: "note", width: 50 },
] as const;

const buildAuditExportCursor = (filter: any) =>
  UserAudit.find(filter)
    .populate("performedBy", "username email")
    .populate("user", "username email")
    .sort({ createdAt: -1 })
    .lean()
    .cursor();

// Format 1 dòng audit thành object phẳng dùng chung cho cả Excel lẫn CSV —
// tránh lặp logic populate/format ngày ở 2 nơi.
const formatAuditRow = (doc: any) => {
  const formatPerson = (p: any) => (p ? `${p.username || ""}${p.email ? ` (${p.email})` : ""}`.trim() : "");

  return {
    createdAt: doc.createdAt ? new Date(doc.createdAt).toLocaleString("vi-VN") : "",
    action: doc.action,
    performedBy: formatPerson(doc.performedBy),
    user: formatPerson(doc.user),
    note: doc.note || "",
  };
};

/**
 * 📗 EXPORT EXCEL — GET /audit/export?format=xlsx
 */
export const exportAuditLogsExcel = async (query: ExportAuditFilter, res: any) => {
  try {
    const filter = buildAuditFilter(query);
    await assertExportableRowCount(filter);

    const fileName = `Audit-log_${Date.now()}.xlsx`;

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

    const worksheet = workbook.addWorksheet("Audit Log", {
      views: [{ state: "frozen", ySplit: 1 }],
    });

    worksheet.autoFilter = { from: "A1", to: "E1" };
    worksheet.columns = AUDIT_EXPORT_COLUMNS as any;

    const cursor = buildAuditExportCursor(filter);

    for await (const doc of cursor as any) {
      worksheet.addRow(formatAuditRow(doc)).commit();
    }

    await workbook.commit();
    res.end();
  } catch (err) {
    console.error("[exportAuditLogsExcel] Lỗi khi xuất Excel:", err);

    if (!res.headersSent) {
      throw err;
    }
    res.end();
  }
};

/**
 * 📄 EXPORT CSV — GET /audit/export?format=csv
 *
 * Không dùng `exceljs` (không cần style/formula, chỉ cần text thuần) —
 * generate + stream trực tiếp bằng `res.write()` cho nhẹ, phù hợp nhu cầu
 * "mở nhanh bằng Excel/Google Sheets để đối chiếu tuân thủ".
 *
 * ⚠️ CSV INJECTION: escape MỌI field theo chuẩn RFC 4180 — bọc trong dấu
 * ngoặc kép nếu chứa dấu phẩy/ngoặc kép/xuống dòng, nhân đôi dấu ngoặc kép
 * bên trong. Không cần lo ReDoS vì đây là escape bằng string replace đơn
 * giản (không dùng regex phức tạp/backtracking), khác hẳn tình huống
 * `$regex` search (mục #5 trong đề xuất trước) — nên KHÔNG áp dụng lại kỹ
 * thuật escape regex của Excel module ở đây vì bản chất vấn đề khác nhau.
 */
const escapeCsvField = (value: unknown): string => {
  const str = String(value ?? "");
  const needsQuoting = /[",\n\r]/.test(str);

  if (!needsQuoting) return str;

  return `"${str.replace(/"/g, '""')}"`;
};

const toCsvRow = (values: unknown[]) => values.map(escapeCsvField).join(",") + "\r\n";

export const exportAuditLogsCSV = async (query: ExportAuditFilter, res: any) => {
  try {
    const filter = buildAuditFilter(query);
    await assertExportableRowCount(filter);

    const fileName = `Audit-log_${Date.now()}.csv`;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);

    // BOM UTF-8 — để Excel (Windows) tự nhận đúng encoding tiếng Việt thay
    // vì hiển thị ký tự lỗi (mojibake) khi mở file .csv trực tiếp.
    res.write("\uFEFF");
    res.write(toCsvRow(AUDIT_EXPORT_COLUMNS.map((c) => c.header)));

    const cursor = buildAuditExportCursor(filter);

    for await (const doc of cursor as any) {
      const row = formatAuditRow(doc);
      res.write(
        toCsvRow(AUDIT_EXPORT_COLUMNS.map((c) => (row as any)[c.key])),
      );
    }

    res.end();
  } catch (err) {
    console.error("[exportAuditLogsCSV] Lỗi khi xuất CSV:", err);

    if (!res.headersSent) {
      throw err;
    }
    res.end();
  }
};
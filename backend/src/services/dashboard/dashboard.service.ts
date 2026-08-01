import { Document, DocumentCategory, DocumentSubType } from "../../models/documents/document.model";
import Department from "../../models/departments/department.model";
import { User } from "../../models/users/user.model";
import { Types, PipelineStage } from "mongoose";
import ApiError from "../../shared/errors/ApiError";
import { toOptionalObjectId } from "../../shared/utils/Mongoid.util";
import { SortOrder } from "../../shared/utils/Queryparsing.util";

/* =====================================================================
   GHI CHÚ REFACTOR (đọc trước khi sửa tiếp file này)
   =====================================================================
   So với bản trước, các thay đổi chính:

   1. 🐛 BUG: `topDamagedDevicesService` / `topDamagedInkService` gán thẳng
      `match.department = department` (string) vào aggregation `$match` —
      Mongoose không tự cast string → ObjectId trong aggregate (chỉ tự cast
      ở Query API). Filter theo khoa ở 2 KPI này trước đây KHÔNG hoạt động.
      → Sửa bằng `toOptionalObjectId()`.

   2. ⚡ PERFORMANCE: mọi hàm phân trang trước đây chạy pipeline 2 LẦN
      (1 lần `$count`, 1 lần `$sort/$skip/$limit`) — collection bị quét/
      group 2 lần cho mỗi request. Gộp lại bằng `$facet` — chỉ 1 lần
      aggregate cho cả data + tổng số record.

   3. 🧹 DUPLICATE: `topDamagedDevicesService` và `topDamagedInkService`
      giống hệt nhau, chỉ khác `subType` (CHECK_DAMAGE vs CONFIRM_STATUS).
      Gộp chung vào `getDamageReportKpiService()`, 2 hàm cũ giữ nguyên chữ
      ký/tên export để không phải sửa controller.

   4. 🔒 SOFT-DELETE: thêm `deletedAt: null` nhất quán ở mọi $match (trước
      đây chỉ `getDashboardDeviceStats` có, các hàm khác chỉ lọc
      `isActive: true`) — phòng trường hợp `deletedAt` được set độc lập
      với `isActive` ở tầng ghi dữ liệu.

   5. Dùng enum `DocumentCategory` / `DocumentSubType` từ model thay vì
      magic string "PROPOSAL"/"REPORT"/"CHECK_DAMAGE"/... — sai chính tả
      enum sẽ báo lỗi biên dịch thay vì âm thầm trả rỗng lúc runtime.

   6. Validate `month`/`year` (range hợp lý) trong `getDashboardDeviceStats`
      thay vì chỉ check "truthy".

   7. Xoá toàn bộ code chết (~250 dòng comment-out của các bản cũ) — lịch sử
      đã có trong git log, giữ lại trong file chỉ gây nhiễu khi đọc/audit.

   KHÔNG đổi: field `meta.items.description` (dùng cho REPORT — CHECK_DAMAGE/
   CONFIRM_STATUS) và `meta.items.deviceName` (dùng cho PROPOSAL) — đã xác
   nhận đây là 2 field hợp lệ khác nhau theo loại document, không phải bug.
===================================================================== */

interface PaginationResult<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Chạy 1 pipeline aggregation "chưa sort/skip/limit" qua `$facet` để lấy
 * đồng thời (a) trang dữ liệu đã sort/phân trang và (b) tổng số record —
 * thay cho pattern cũ chạy pipeline riêng cho `$count` và riêng cho data
 * (2 lần quét/group toàn bộ dữ liệu match được cho mỗi request).
 */
const runPaginatedAggregate = async <T = any>(
  basePipeline: PipelineStage[],
  params: { page: number; limit: number; sortBy: string; sortOrder: SortOrder },
): Promise<PaginationResult<T>> => {
  const { page, limit, sortBy, sortOrder } = params;
  const skip = (page - 1) * limit;
  const sortStage: Record<string, 1 | -1> = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

  const [result] = await Document.aggregate([
    ...basePipeline,
    {
      $facet: {
        items: [{ $sort: sortStage }, { $skip: skip }, { $limit: limit }],
        totalCount: [{ $count: "count" }],
      },
    },
  ]);

  const items: T[] = result?.items ?? [];
  const total: number = result?.totalCount?.[0]?.count ?? 0;

  return {
    items,
    pagination: { page, limit, total, totalPages: limit > 0 ? Math.ceil(total / limit) : 0 },
  };
};

/* =====================================================================
   🏥 ADMIN DASHBOARD SUMMARY
===================================================================== */
export const adminDashboardSummaryService = async () => {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const [
    totalStats,
    proposalsByMonth,
    reportsByMonth,
    documentsByDepartment,
    recentDocuments,
    totalDepartments,
    totalUsers,
  ] = await Promise.all([
    // 📊 TOTAL DOCUMENT STATS
    Document.aggregate([
      { $match: { isActive: true, deletedAt: null } },
      {
        $group: {
          _id: null,
          totalDocuments: { $sum: 1 },
          totalProposals: {
            $sum: { $cond: [{ $eq: ["$category", DocumentCategory.PROPOSAL] }, 1, 0] },
          },
          totalReports: {
            $sum: { $cond: [{ $eq: ["$category", DocumentCategory.REPORT] }, 1, 0] },
          },
        },
      },
    ]),

    // 📈 PROPOSALS BY MONTH (năm hiện tại)
    Document.aggregate([
      {
        $match: {
          category: DocumentCategory.PROPOSAL,
          isActive: true,
          deletedAt: null,
          createdAt: { $gte: startOfYear },
        },
      },
      { $group: { _id: { $month: "$createdAt" }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),

    // 📈 REPORTS BY MONTH (năm hiện tại)
    Document.aggregate([
      {
        $match: {
          category: DocumentCategory.REPORT,
          isActive: true,
          deletedAt: null,
          createdAt: { $gte: startOfYear },
        },
      },
      { $group: { _id: { $month: "$createdAt" }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),

    // 🏥 DOCUMENTS BY DEPARTMENT
    Document.aggregate([
      { $match: { isActive: true, deletedAt: null } },
      { $group: { _id: "$department", count: { $sum: 1 } } },
      {
        $lookup: {
          from: "departments",
          localField: "_id",
          foreignField: "_id",
          as: "department",
        },
      },
      { $unwind: "$department" },
      {
        $project: {
          departmentId: "$_id",
          departmentName: "$department.name",
          count: 1,
        },
      },
      { $sort: { count: -1 } },
    ]),

    // 📄 5 DOCUMENT MỚI NHẤT
    Document.find({ isActive: true, deletedAt: null })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("department", "name code")
      .populate("createdBy", "fullName")
      .lean(),

    Department.countDocuments(),

    // 🧑‍⚕️ TỔNG SỐ USER
    User.countDocuments({ isActive: true }),
  ]);

  return {
    totalDocuments: totalStats[0]?.totalDocuments || 0,
    totalProposals: totalStats[0]?.totalProposals || 0,
    totalReports: totalStats[0]?.totalReports || 0,
    totalDepartments,
    totalUsers,

    proposalsByMonth,
    reportsByMonth,
    documentsByDepartment,
    recentDocuments,
  };
};

/* =====================================================================
   🏢 DEPARTMENT DASHBOARD SUMMARY
===================================================================== */
export const departmentDashboardService = async (departmentId: any) => {
  if (!Types.ObjectId.isValid(departmentId)) {
    throw ApiError.badRequest("Department ID không hợp lệ");
  }

  const department = await Department.findById(departmentId);
  if (!department) {
    throw ApiError.notFound("Không tìm thấy khoa");
  }

  const departmentObjectId = new Types.ObjectId(departmentId);
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const [stats, proposalsByMonth, reportsByMonth, recentDocuments, totalUsers] = await Promise.all([
    // 📊 TỔNG QUAN
    Document.aggregate([
      { $match: { department: departmentObjectId, isActive: true, deletedAt: null } },
      {
        $group: {
          _id: null,
          totalDocuments: { $sum: 1 },
          totalProposals: {
            $sum: { $cond: [{ $eq: ["$category", DocumentCategory.PROPOSAL] }, 1, 0] },
          },
          totalReports: {
            $sum: { $cond: [{ $eq: ["$category", DocumentCategory.REPORT] }, 1, 0] },
          },
        },
      },
    ]),

    // 📈 PROPOSAL BY MONTH
    Document.aggregate([
      {
        $match: {
          department: departmentObjectId,
          category: DocumentCategory.PROPOSAL,
          isActive: true,
          deletedAt: null,
          createdAt: { $gte: startOfYear },
        },
      },
      { $group: { _id: { $month: "$createdAt" }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),

    // 📈 REPORT BY MONTH
    Document.aggregate([
      {
        $match: {
          department: departmentObjectId,
          category: DocumentCategory.REPORT,
          isActive: true,
          deletedAt: null,
          createdAt: { $gte: startOfYear },
        },
      },
      { $group: { _id: { $month: "$createdAt" }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),

    // 📄 5 DOCUMENT MỚI NHẤT CỦA KHOA
    Document.find({ department: departmentObjectId, isActive: true, deletedAt: null })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("createdBy", "fullName")
      .lean(),

    // 🧑 SỐ USER TRONG KHOA
    User.countDocuments({ department: departmentObjectId, isActive: true }),
  ]);

  return {
    department,
    totalDocuments: stats[0]?.totalDocuments || 0,
    totalProposals: stats[0]?.totalProposals || 0,
    totalReports: stats[0]?.totalReports || 0,
    totalUsers,

    proposalsByMonth,
    reportsByMonth,
    recentDocuments,
  };
};

/* =====================================================================
   📊 KPI: PROPOSAL → REPORT CONVERSION RATE THEO KHOA
   conversionRate = (số proposal có referenceTo.length > 0) / tổng proposal
===================================================================== */
export const proposalConversionByDepartmentService = async ({
  page = 1,
  limit = 10,
  sortBy = "conversionRate",
  sortOrder = "desc",
}: {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: SortOrder;
}): Promise<PaginationResult<any>> => {
  const basePipeline: PipelineStage[] = [
    { $match: { category: DocumentCategory.PROPOSAL, isActive: true, deletedAt: null } },
    {
      $addFields: {
        hasReport: {
          $cond: [{ $gt: [{ $size: { $ifNull: ["$referenceTo", []] } }, 0] }, 1, 0],
        },
      },
    },
    {
      $group: {
        _id: "$department",
        totalProposals: { $sum: 1 },
        converted: { $sum: "$hasReport" },
      },
    },
    {
      $lookup: {
        from: "departments",
        localField: "_id",
        foreignField: "_id",
        as: "department",
      },
    },
    { $unwind: "$department" },
    {
      $addFields: {
        conversionRate: {
          $multiply: [{ $divide: ["$converted", { $max: ["$totalProposals", 1] }] }, 100],
        },
      },
    },
    {
      $project: {
        departmentId: "$_id",
        departmentName: "$department.name",
        totalProposals: 1,
        converted: 1,
        conversionRate: { $round: ["$conversionRate", 1] },
      },
    },
  ];

  return runPaginatedAggregate(basePipeline, { page, limit, sortBy, sortOrder });
};

/* =====================================================================
   📉 KPI: XU HƯỚNG HỎNG THIẾT BỊ THEO THÁNG (dựa trên REPORT/CHECK_DAMAGE)
===================================================================== */
export const deviceDamageTrendByMonthService = async ({
  page = 1,
  limit = 12,
  sortBy = "monthLabel",
  sortOrder = "desc",
}: {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: SortOrder;
}): Promise<PaginationResult<any>> => {
  const basePipeline: PipelineStage[] = [
    {
      $match: {
        category: DocumentCategory.REPORT,
        subType: DocumentSubType.CHECK_DAMAGE,
        isActive: true,
        deletedAt: null,
      },
    },
    {
      $group: {
        _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
        totalReports: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        year: "$_id.year",
        month: "$_id.month",
        totalReports: 1,
        monthLabel: {
          $concat: [
            { $toString: "$_id.year" },
            "-",
            {
              $cond: [
                { $lt: ["$_id.month", 10] },
                { $concat: ["0", { $toString: "$_id.month" }] },
                { $toString: "$_id.month" },
              ],
            },
          ],
        },
      },
    },
  ];

  return runPaginatedAggregate(basePipeline, { page, limit, sortBy, sortOrder });
};

/* =====================================================================
   🚨 KPI: TOP THIẾT BỊ / MỰC HỎNG NHIỀU NHẤT
   Dùng chung 1 hàm cho 2 KPI (trước đây `topDamagedDevicesService` và
   `topDamagedInkService` là 2 bản copy-paste giống hệt nhau, chỉ khác
   `subType`). Cả 2 đều group theo `meta.items.description`.
===================================================================== */
interface DamageReportKpiParams {
  department?: any;
  fromDate?: Date;
  toDate?: Date;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: SortOrder;
}

const getDamageReportKpiService = async (
  subType: DocumentSubType.CHECK_DAMAGE | DocumentSubType.CONFIRM_STATUS,
  {
    department,
    fromDate,
    toDate,
    page = 1,
    limit = 10,
    sortBy = "totalBroken",
    sortOrder = "desc",
  }: DamageReportKpiParams,
): Promise<PaginationResult<any>> => {
  const match: Record<string, any> = {
    category: DocumentCategory.REPORT,
    subType,
    isActive: true,
    deletedAt: null,
  };

  // 🐛 Sửa bug: convert đúng sang ObjectId, không gán thẳng string vào $match.
  const departmentObjectId = toOptionalObjectId(department, "Department ID không hợp lệ");
  if (departmentObjectId) {
    match.department = departmentObjectId;
  }

  if (fromDate || toDate) {
    match.createdAt = {};
    if (fromDate) match.createdAt.$gte = fromDate;
    if (toDate) match.createdAt.$lte = toDate;
  }

  const basePipeline: PipelineStage[] = [
    { $match: match },
    { $unwind: "$meta.items" },
    {
      $addFields: {
        qty: { $cond: [{ $gt: ["$meta.items.quantity", 0] }, "$meta.items.quantity", 1] },
      },
    },
    {
      $group: {
        _id: "$meta.items.description",
        totalBroken: { $sum: "$qty" },
        totalReports: { $sum: 1 },
      },
    },
    { $project: { _id: 0, deviceName: "$_id", totalBroken: 1, totalReports: 1 } },
  ];

  return runPaginatedAggregate(basePipeline, { page, limit, sortBy, sortOrder });
};

export const topDamagedDevicesService = (params: DamageReportKpiParams) =>
  getDamageReportKpiService(DocumentSubType.CHECK_DAMAGE, params);

export const topDamagedInkService = (params: DamageReportKpiParams) =>
  getDamageReportKpiService(DocumentSubType.CONFIRM_STATUS, params);

/* =====================================================================
   📦 THỐNG KÊ TỔNG SỐ LƯỢNG MỰC/SỬA CHỮA/DỰ TRÙ THEO THÁNG (PROPOSAL)
===================================================================== */
const PROPOSAL_SUBTYPES = [
  DocumentSubType.PROPOSE_REPAIR,
  DocumentSubType.PROPOSE_INK,
  DocumentSubType.PROPOSE_PROCUREMENT,
];

export const getDashboardDeviceStats = async (query: {
  month?: number | string;
  year?: number | string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: SortOrder;
}): Promise<PaginationResult<any>> => {
  const { month, year, page = 1, limit = 20, sortBy = "totalQuantity", sortOrder = "desc" } = query;

  if (!month || !year) {
    throw ApiError.badRequest("month và year là bắt buộc");
  }

  const monthNum = Number(month);
  const yearNum = Number(year);

  if (!Number.isInteger(monthNum) || monthNum < 1 || monthNum > 12) {
    throw ApiError.badRequest("month phải là số nguyên từ 1 đến 12");
  }
  if (!Number.isInteger(yearNum) || yearNum < 2000 || yearNum > 2100) {
    throw ApiError.badRequest("year không hợp lệ");
  }

  const start = new Date(yearNum, monthNum - 1, 1);
  const end = new Date(yearNum, monthNum, 0, 23, 59, 59);

  const basePipeline: PipelineStage[] = [
    {
      $match: {
        category: DocumentCategory.PROPOSAL,
        subType: { $in: PROPOSAL_SUBTYPES },
        isActive: true,
        deletedAt: null,
        createdAt: { $gte: start, $lte: end },
      },
    },
    { $unwind: "$meta.items" },
    {
      $group: {
        _id: "$meta.items.deviceName",
        totalQuantity: { $sum: "$meta.items.quantity" },
      },
    },
    { $project: { _id: 0, deviceName: "$_id", totalQuantity: 1 } },
  ];

  return runPaginatedAggregate(basePipeline, { page, limit, sortBy, sortOrder });
};

  

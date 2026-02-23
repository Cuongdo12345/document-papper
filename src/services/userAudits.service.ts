import UserAudit from "../models/userAudit.model";

//Định nghĩa interface cho filter của audit logs
interface AuditFilter {
  action?: string;
  performedBy?: string;
  user?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

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

  if (action) filter.action = action;
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

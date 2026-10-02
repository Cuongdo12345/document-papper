// services/dashboard/workflowDashboard.service.ts
//
// Roadmap B1 — "Dashboard riêng Đề xuất trễ hạn" cho quản lý theo dõi. Chỉ
// PHÂN TRANG lại kết quả của `findOverdueWorkflowInstances()`
// (`workflowSlaAlerts.service.ts`) — không tính toán lại "cái gì quá hạn"
// lần thứ 2 (logic đó đã dùng chung cho cả cron VÀ dashboard này).

import { findOverdueWorkflowInstances } from "../documents/workflowSlaAlerts.service";

// BR-05 (DEV-094): `page`/`limit` đã parse + clamp ở controller
// (`parsePaginationQuery`, tối đa 100) — trước đây nhận `req.query` thô,
// `limit` không có trần.
export const getOverdueApprovalsListService = async ({
  page: pageNumber,
  limit: pageSize,
}: {
  page: number;
  limit: number;
}) => {
  const overdue = await findOverdueWorkflowInstances();
  const total = overdue.length;
  const skip = (pageNumber - 1) * pageSize;
  const data = overdue.slice(skip, skip + pageSize).map((o) => o.info);

  return {
    data,
    pagination: {
      page: pageNumber,
      limit: pageSize,
      total,
      totalPages: Math.ceil(total / pageSize) || 1,
    },
  };
};

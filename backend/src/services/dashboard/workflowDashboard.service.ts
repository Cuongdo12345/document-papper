// services/dashboard/workflowDashboard.service.ts
//
// Roadmap B1 — "Dashboard riêng Đề xuất trễ hạn" cho quản lý theo dõi. Chỉ
// PHÂN TRANG lại kết quả của `findOverdueWorkflowInstances()`
// (`workflowSlaAlerts.service.ts`) — không tính toán lại "cái gì quá hạn"
// lần thứ 2 (logic đó đã dùng chung cho cả cron VÀ dashboard này).

import { findOverdueWorkflowInstances } from "../documents/workflowSlaAlerts.service";

export const getOverdueApprovalsListService = async (query: any = {}) => {
  const { page = 1, limit = 10 } = query;
  const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
  const pageSize = Math.max(parseInt(limit, 10) || 10, 1);

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

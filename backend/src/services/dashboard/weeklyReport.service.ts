// services/dashboard/weeklyReport.service.ts
//
// Roadmap B7 (2026-09-18) — "Báo cáo định kỳ tự động gửi email". Người nhận:
// user active thuộc role BAN_GIAM_DOC (báo cáo toàn viện) hoặc TRUONG_KHOA
// (báo cáo theo khoa của chính họ), VÀ đã tự bật `subscribedToWeeklyReport`
// (opt-in thật — user xác nhận qua AskUserQuestion, KHÁC hẳn cách các cảnh
// báo tự động khác trong hệ thống gửi cho TẤT CẢ user active theo role).
//
// Số liệu tái dùng NGUYÊN VẸN `adminDashboardSummaryService`/
// `departmentDashboardService` (dashboard.service.ts) + `getPendingApprovalsForRole`
// (workflow.service.ts) — KHÔNG viết thêm aggregation mới (phạm vi đã chốt
// với user: chỉ đóng gói số liệu Dashboard có sẵn thành email, mở rộng thêm
// đúng 1 số liệu "đang chờ duyệt" theo lựa chọn của user).

import { Role } from "../../models/rbac/role.model";
import { User } from "../../models/users/user.model";
import { sendMail } from "../../shared/utils/mailer";
import { buildWeeklyReportEmail } from "../../shared/helpers/weeklyReport.template";
import { adminDashboardSummaryService, departmentDashboardService } from "./dashboard.service";
import { getPendingApprovalsForRole } from "../documents/workflow.service";

/** Đúng 2 role user chỉ định trong mô tả gốc B7 — KHÔNG tự ý thêm DIEU_DUONG_TRUONG dù cùng permission set với TRUONG_KHOA. */
const WEEKLY_REPORT_ROLE_NAMES = ["BAN_GIAM_DOC", "TRUONG_KHOA"] as const;

/**
 * Gửi báo cáo tuần cho TẤT CẢ user đủ điều kiện (role đúng + opt-in +
 * active + có email). Guard rỗng ở MỌI bước (role không tồn tại/0 user đủ
 * điều kiện) để cron log rõ ràng thay vì âm thầm không làm gì.
 */
export const sendWeeklyReportsService = async () => {
  const roles = await Role.find({ name: { $in: WEEKLY_REPORT_ROLE_NAMES } }).select("_id name");
  if (roles.length === 0) {
    console.warn(
      `[weeklyReport] Không tìm thấy role nào trong [${WEEKLY_REPORT_ROLE_NAMES.join(", ")}] trong DB — bỏ qua.`,
    );
    return { sent: 0, failed: 0, skipped: 0 };
  }
  const roleIdToName = new Map(roles.map((r) => [String(r._id), r.name as string]));

  const users = await User.find({
    role: { $in: roles.map((r) => r._id) },
    subscribedToWeeklyReport: true,
    isActive: true,
    email: { $exists: true, $ne: null },
  })
    .select("fullName email role department")
    .populate("department", "name");

  if (users.length === 0) {
    console.warn("[weeklyReport] Không có user nào đang bật nhận báo cáo tuần (đủ điều kiện) — bỏ qua.");
    return { sent: 0, failed: 0, skipped: 0 };
  }

  const generatedAt = new Date();
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const user of users) {
    const roleName = roleIdToName.get(String(user.role));
    if (!roleName) {
      skipped++;
      continue;
    }

    const isOrgWide = roleName === "BAN_GIAM_DOC";

    // TRUONG_KHOA chưa gán khoa/phòng — không có phạm vi để báo cáo, bỏ qua
    // (không phải lỗi hệ thống, ghi log để biết cần cấu hình lại user đó).
    if (!isOrgWide && !user.department) {
      console.warn(`[weeklyReport] User ${user._id} (TRUONG_KHOA) chưa gán khoa/phòng — bỏ qua.`);
      skipped++;
      continue;
    }

    try {
      const [summary, pendingResult] = await Promise.all([
        isOrgWide ? adminDashboardSummaryService() : departmentDashboardService((user.department as any)._id),
        getPendingApprovalsForRole(roleName, { limit: 1 }),
      ]);

      const { subject, html, text } = buildWeeklyReportEmail({
        fullName: user.fullName,
        isOrgWide,
        departmentName: isOrgWide ? undefined : (user.department as any)?.name,
        totalProposals: summary.totalProposals,
        totalReports: summary.totalReports,
        pendingApprovals: pendingResult.pagination.total,
        generatedAt,
      });

      await sendMail({ to: user.email as string, subject, html, text });
      sent++;
    } catch (err) {
      // KHÔNG throw — 1 user gửi lỗi (SMTP tạm thời, department bị xoá giữa
      // chừng...) không được chặn các user còn lại trong cùng lượt gửi.
      console.error(`[weeklyReport] Gửi báo cáo tuần thất bại cho user ${user._id}:`, err);
      failed++;
    }
  }

  return { sent, failed, skipped };
};

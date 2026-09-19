import { escapeHtml } from "../utils/html.util";

/**
 * weeklyReport.template.ts — nội dung email "Báo cáo tuần" (Roadmap B7).
 * Mirror ĐÚNG pattern `passwordReset.template.ts` (template-literal builder,
 * KHÔNG dùng EJS — `src/views/email/forgotPassword.ejs` tồn tại nhưng KHÔNG
 * hề được render bằng package `ejs` ở bất kỳ đâu trong repo, đã verify bằng
 * grep trước khi chọn cách làm này, xem docs/development/tasks/DEV-065.md).
 *
 * Số liệu trong `proposalsByMonth`/`totalProposals`... LÀ SỐ LUỸ KẾ TỪ ĐẦU
 * NĂM (nguyên trạng `adminDashboardSummaryService`/`departmentDashboardService`
 * — KHÔNG viết thêm logic tính riêng "trong tuần qua", theo đúng phạm vi đã
 * chốt với user: tái dùng số liệu Dashboard có sẵn) — copy PHẢI ghi rõ "luỹ
 * kế từ đầu năm", KHÔNG được ngụ ý "hoạt động trong tuần qua" (sẽ sai lệch
 * với dữ liệu thật).
 */
export interface WeeklyReportEmailParams {
  fullName?: string;
  /** `true` = báo cáo toàn viện (BAN_GIAM_DOC), `false` = theo khoa (TRUONG_KHOA). */
  isOrgWide: boolean;
  departmentName?: string;
  totalProposals: number;
  totalReports: number;
  /** Số bước duyệt đang chờ ĐÚNG role của người nhận — số liệu actionable nhất với lãnh đạo. */
  pendingApprovals: number;
  generatedAt: Date;
}

export const buildWeeklyReportEmail = (params: WeeklyReportEmailParams) => {
  const { fullName, isOrgWide, departmentName, totalProposals, totalReports, pendingApprovals, generatedAt } = params;

  const scopeLabel = isOrgWide ? "toàn viện" : `Khoa/Phòng ${departmentName ?? ""}`;
  const subject = `Báo cáo tuần — ${scopeLabel} (${generatedAt.toLocaleDateString("vi-VN")})`;

  const greeting = fullName ? `Xin chào ${escapeHtml(fullName)},` : "Xin chào,";
  const greetingText = fullName ? `Xin chào ${fullName},` : "Xin chào,";
  const scopeLabelSafe = escapeHtml(scopeLabel);

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <p>${greeting}</p>
      <p>Dưới đây là báo cáo tóm tắt định kỳ hàng tuần — phạm vi <strong>${scopeLabelSafe}</strong>, tính luỹ kế từ đầu năm ${generatedAt.getFullYear()} đến ${generatedAt.toLocaleDateString("vi-VN")}.</p>
      <table style="width:100%; border-collapse: collapse; margin: 16px 0;">
        <tr>
          <td style="padding:8px 12px; border:1px solid #e5e7eb;">Tổng đề xuất</td>
          <td style="padding:8px 12px; border:1px solid #e5e7eb; text-align:right; font-weight:bold;">${totalProposals}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px; border:1px solid #e5e7eb;">Tổng biên bản</td>
          <td style="padding:8px 12px; border:1px solid #e5e7eb; text-align:right; font-weight:bold;">${totalReports}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px; border:1px solid #e5e7eb;">Đang chờ bạn duyệt</td>
          <td style="padding:8px 12px; border:1px solid #e5e7eb; text-align:right; font-weight:bold; color:${pendingApprovals > 0 ? "#dc2626" : "#16a34a"};">${pendingApprovals}</td>
        </tr>
      </table>
      <p>Đăng nhập hệ thống để xem chi tiết Dashboard hoặc xử lý các đề xuất đang chờ.</p>
      <p style="font-size:12px; color:#888;">Bạn nhận được email này vì đã bật "Nhận báo cáo tuần" ở trang Hồ sơ cá nhân. Có thể tắt bất kỳ lúc nào tại đó.</p>
    </div>
  `;

  const text =
    `${greetingText}\n\n` +
    `Báo cáo tóm tắt định kỳ hàng tuần — phạm vi ${scopeLabel}, luỹ kế từ đầu năm ${generatedAt.getFullYear()} đến ${generatedAt.toLocaleDateString("vi-VN")}.\n\n` +
    `Tổng đề xuất: ${totalProposals}\n` +
    `Tổng biên bản: ${totalReports}\n` +
    `Đang chờ bạn duyệt: ${pendingApprovals}\n\n` +
    `Đăng nhập hệ thống để xem chi tiết.\n` +
    `Bạn nhận được email này vì đã bật "Nhận báo cáo tuần" ở trang Hồ sơ cá nhân.`;

  return { subject, html, text };
};

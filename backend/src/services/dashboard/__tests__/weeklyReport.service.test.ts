// Roadmap B7 (2026-09-18) — test `weeklyReport.service.ts`. Chỉ mock đúng
// I/O boundary (Role/User query, 2 dashboard service, getPendingApprovalsForRole,
// sendMail) — để NGUYÊN `buildWeeklyReportEmail` chạy thật (pure function,
// không I/O) để coverage thật sự cả bước build nội dung email.
jest.mock("../../../models/rbac/role.model", () => ({
  Role: { find: jest.fn() },
}));
jest.mock("../../../models/users/user.model", () => ({
  User: { find: jest.fn() },
}));
jest.mock("../../../shared/utils/mailer", () => ({
  sendMail: jest.fn(),
}));
jest.mock("./../dashboard.service", () => ({
  adminDashboardSummaryService: jest.fn(),
  departmentDashboardService: jest.fn(),
}));
jest.mock("../../documents/workflow.service", () => ({
  getPendingApprovalsForRole: jest.fn(),
}));

import { Role } from "../../../models/rbac/role.model";
import { User } from "../../../models/users/user.model";
import { sendMail } from "../../../shared/utils/mailer";
import { adminDashboardSummaryService, departmentDashboardService } from "../dashboard.service";
import { getPendingApprovalsForRole } from "../../documents/workflow.service";
import { sendWeeklyReportsService } from "../weeklyReport.service";

const mockedRole = Role as any;
const mockedUser = User as any;
const mockedSendMail = sendMail as jest.Mock;
const mockedAdminSummary = adminDashboardSummaryService as jest.Mock;
const mockedDeptSummary = departmentDashboardService as jest.Mock;
const mockedPending = getPendingApprovalsForRole as jest.Mock;

function makeUserQuery(result: any[]) {
  const q: any = {};
  q.select = jest.fn().mockReturnValue(q);
  q.populate = jest.fn().mockReturnValue(q);
  q.then = (resolve: any) => Promise.resolve(result).then(resolve);
  return q;
}

const BAN_GIAM_DOC_ROLE = { _id: "role-bgd", name: "BAN_GIAM_DOC" };
const TRUONG_KHOA_ROLE = { _id: "role-tk", name: "TRUONG_KHOA" };

describe("weeklyReport.service — sendWeeklyReportsService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedPending.mockResolvedValue({ pagination: { total: 0 } });
  });

  it("trả sớm {sent:0,failed:0,skipped:0} nếu KHÔNG tìm thấy role BAN_GIAM_DOC/TRUONG_KHOA nào trong DB", async () => {
    mockedRole.find.mockReturnValue({ select: jest.fn().mockResolvedValue([]) });

    const result = await sendWeeklyReportsService();

    expect(result).toEqual({ sent: 0, failed: 0, skipped: 0 });
    expect(mockedUser.find).not.toHaveBeenCalled();
  });

  it("trả sớm nếu 0 user đủ điều kiện (đúng role + subscribed + active + có email)", async () => {
    mockedRole.find.mockReturnValue({ select: jest.fn().mockResolvedValue([BAN_GIAM_DOC_ROLE, TRUONG_KHOA_ROLE]) });
    mockedUser.find.mockReturnValue(makeUserQuery([]));

    const result = await sendWeeklyReportsService();

    expect(result).toEqual({ sent: 0, failed: 0, skipped: 0 });
    expect(mockedSendMail).not.toHaveBeenCalled();
  });

  it("BAN_GIAM_DOC: gọi adminDashboardSummaryService (org-wide, KHÔNG cần department)", async () => {
    mockedRole.find.mockReturnValue({ select: jest.fn().mockResolvedValue([BAN_GIAM_DOC_ROLE, TRUONG_KHOA_ROLE]) });
    mockedUser.find.mockReturnValue(
      makeUserQuery([{ _id: "u1", fullName: "Giám đốc A", email: "gd@example.com", role: "role-bgd", department: undefined }]),
    );
    mockedAdminSummary.mockResolvedValue({ totalProposals: 190, totalReports: 81 });
    mockedPending.mockResolvedValue({ pagination: { total: 3 } });

    const result = await sendWeeklyReportsService();

    expect(mockedAdminSummary).toHaveBeenCalledTimes(1);
    expect(mockedDeptSummary).not.toHaveBeenCalled();
    expect(mockedPending).toHaveBeenCalledWith("BAN_GIAM_DOC", { limit: 1 });
    expect(mockedSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "gd@example.com",
        subject: expect.stringContaining("toàn viện"),
        text: expect.stringContaining("190"),
      }),
    );
    expect(result).toEqual({ sent: 1, failed: 0, skipped: 0 });
  });

  it("TRUONG_KHOA có department: gọi departmentDashboardService ĐÚNG department của user", async () => {
    mockedRole.find.mockReturnValue({ select: jest.fn().mockResolvedValue([BAN_GIAM_DOC_ROLE, TRUONG_KHOA_ROLE]) });
    mockedUser.find.mockReturnValue(
      makeUserQuery([
        { _id: "u2", fullName: "Trưởng khoa B", email: "tk@example.com", role: "role-tk", department: { _id: "dept-1", name: "Khoa Nội" } },
      ]),
    );
    mockedDeptSummary.mockResolvedValue({ totalProposals: 17, totalReports: 9 });

    const result = await sendWeeklyReportsService();

    expect(mockedDeptSummary).toHaveBeenCalledWith("dept-1");
    expect(mockedAdminSummary).not.toHaveBeenCalled();
    expect(mockedSendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "tk@example.com", subject: expect.stringContaining("Khoa Nội") }),
    );
    expect(result).toEqual({ sent: 1, failed: 0, skipped: 0 });
  });

  it("TRUONG_KHOA KHÔNG có department: bỏ qua (skipped), KHÔNG gọi dashboard service/sendMail", async () => {
    mockedRole.find.mockReturnValue({ select: jest.fn().mockResolvedValue([BAN_GIAM_DOC_ROLE, TRUONG_KHOA_ROLE]) });
    mockedUser.find.mockReturnValue(
      makeUserQuery([{ _id: "u3", fullName: "Trưởng khoa lỗi", email: "tk3@example.com", role: "role-tk", department: undefined }]),
    );

    const result = await sendWeeklyReportsService();

    expect(mockedDeptSummary).not.toHaveBeenCalled();
    expect(mockedSendMail).not.toHaveBeenCalled();
    expect(result).toEqual({ sent: 0, failed: 0, skipped: 1 });
  });

  it("1 user sendMail lỗi KHÔNG chặn user còn lại — failed++ nhưng vẫn tiếp tục gửi cho user sau", async () => {
    mockedRole.find.mockReturnValue({ select: jest.fn().mockResolvedValue([BAN_GIAM_DOC_ROLE, TRUONG_KHOA_ROLE]) });
    mockedUser.find.mockReturnValue(
      makeUserQuery([
        { _id: "u1", fullName: "Lỗi SMTP", email: "loi@example.com", role: "role-bgd", department: undefined },
        { _id: "u2", fullName: "OK", email: "ok@example.com", role: "role-bgd", department: undefined },
      ]),
    );
    mockedAdminSummary.mockResolvedValue({ totalProposals: 1, totalReports: 1 });
    mockedSendMail.mockRejectedValueOnce(new Error("SMTP timeout")).mockResolvedValueOnce(undefined);

    const result = await sendWeeklyReportsService();

    expect(mockedSendMail).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ sent: 1, failed: 1, skipped: 0 });
  });
});

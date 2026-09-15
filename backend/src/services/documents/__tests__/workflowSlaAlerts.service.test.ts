// (Roadmap B1 — SLA & nhắc việc Workflow, 2026-09-15) Regression test cho
// `workflowSlaAlerts.service.ts`. Mock `WorkflowInstance` + `notifyUsersByRoleName`
// — không dùng DB thật, cùng pattern `assetAssignment.service.test.ts`.
jest.mock("../../../models/documents/workflowInstance.model", () => ({
  __esModule: true,
  default: { find: jest.fn() },
}));
jest.mock("../../notifications/notification.service", () => ({
  notifyUsersByRoleName: jest.fn().mockResolvedValue(undefined),
}));

import WorkflowInstance from "../../../models/documents/workflowInstance.model";
import { notifyUsersByRoleName } from "../../notifications/notification.service";
import {
  findOverdueWorkflowInstances,
  checkWorkflowSlaService,
  DEFAULT_STEP_SLA_DAYS,
} from "../workflowSlaAlerts.service";

const mockedWorkflowInstance = WorkflowInstance as unknown as { find: jest.Mock };
const mockedNotify = notifyUsersByRoleName as jest.Mock;

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n: number) => new Date(Date.now() - n * MS_PER_DAY);

/** `find(...).populate(...).sort(...)` — mock trả về chính mảng instances, gắn thêm 2 hàm chainable. */
const mockFindReturns = (instances: any[]) => {
  const query: any = {
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockResolvedValue(instances),
  };
  mockedWorkflowInstance.find.mockReturnValue(query);
};

const makeInstance = (overrides: any = {}) => ({
  _id: "wf-1",
  documentId: { _id: "doc-1", title: "Đề xuất sửa máy X", documentCode: "PR-001", isActive: true },
  currentStep: 0,
  createdAt: daysAgo(5),
  steps: [
    {
      name: "Duyệt khoa",
      role: "TRUONG_KHOA",
      status: "pending",
      slaDays: 3,
      slaReminderSentAt: undefined,
      slaEscalatedAt: undefined,
    },
  ],
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe("findOverdueWorkflowInstances (Roadmap B1)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("không có instance nào pending → mảng rỗng", async () => {
    mockFindReturns([]);
    const result = await findOverdueWorkflowInstances();
    expect(result).toEqual([]);
  });

  it("document đã bị soft-delete (isActive=false) → bỏ qua, không tính là quá hạn", async () => {
    mockFindReturns([makeInstance({ documentId: { _id: "doc-1", title: "X", documentCode: "PR-001", isActive: false } })]);
    const result = await findOverdueWorkflowInstances();
    expect(result).toEqual([]);
  });

  it("document bị xoá hẳn khỏi DB (populate trả null) → bỏ qua, không throw", async () => {
    mockFindReturns([makeInstance({ documentId: null })]);
    const result = await findOverdueWorkflowInstances();
    expect(result).toEqual([]);
  });

  it("CHƯA vượt SLA (daysPending < slaDays) → không tính là quá hạn", async () => {
    mockFindReturns([makeInstance({ createdAt: daysAgo(2), steps: [{ name: "A", role: "IT", status: "pending", slaDays: 3 }] })]);
    const result = await findOverdueWorkflowInstances();
    expect(result).toEqual([]);
  });

  it("VỪA ĐẠT ngưỡng SLA (daysPending === slaDays) → tính là quá hạn (daysOverdue=0)", async () => {
    mockFindReturns([makeInstance({ createdAt: daysAgo(3), steps: [{ name: "A", role: "IT", status: "pending", slaDays: 3 }] })]);
    const result = await findOverdueWorkflowInstances();
    expect(result).toHaveLength(1);
    expect(result[0].info.daysOverdue).toBe(0);
    expect(result[0].info.slaDays).toBe(3);
  });

  it("step KHÔNG đặt slaDays riêng → fallback DEFAULT_STEP_SLA_DAYS", async () => {
    mockFindReturns([
      makeInstance({
        createdAt: daysAgo(DEFAULT_STEP_SLA_DAYS + 1),
        steps: [{ name: "A", role: "IT", status: "pending" /* không có slaDays */ }],
      }),
    ]);
    const result = await findOverdueWorkflowInstances();
    expect(result).toHaveLength(1);
    expect(result[0].info.slaDays).toBe(DEFAULT_STEP_SLA_DAYS);
  });

  it("currentStep > 0 — tính thời điểm bắt đầu từ approvedAt của bước TRƯỚC, KHÔNG PHẢI instance.createdAt", async () => {
    mockFindReturns([
      makeInstance({
        createdAt: daysAgo(30), // rất lâu — nếu tính nhầm theo cái này sẽ luôn quá hạn
        currentStep: 1,
        steps: [
          { name: "Bước 1", role: "TRUONG_KHOA", status: "approved", approvedAt: daysAgo(1) }, // mới duyệt 1 ngày trước
          { name: "Bước 2", role: "BAN_GIAM_DOC", status: "pending", slaDays: 3 },
        ],
      }),
    ]);
    const result = await findOverdueWorkflowInstances();
    expect(result).toEqual([]); // mới pending 1 ngày, chưa tới hạn 3 ngày
  });

  it("step hiện tại KHÔNG còn 'pending' (dữ liệu bất thường) → bỏ qua", async () => {
    mockFindReturns([makeInstance({ steps: [{ name: "A", role: "IT", status: "approved", slaDays: 3 }] })]);
    const result = await findOverdueWorkflowInstances();
    expect(result).toEqual([]);
  });

  it("sắp xếp quá hạn NHIỀU NHẤT lên đầu", async () => {
    mockFindReturns([
      makeInstance({ _id: "wf-it-hon", createdAt: daysAgo(4), steps: [{ name: "A", role: "IT", status: "pending", slaDays: 3 }] }),
      makeInstance({ _id: "wf-nhieu-hon", createdAt: daysAgo(10), steps: [{ name: "A", role: "IT", status: "pending", slaDays: 3 }] }),
    ]);
    const result = await findOverdueWorkflowInstances();
    expect(result.map((r) => r.instance._id)).toEqual(["wf-nhieu-hon", "wf-it-hon"]);
  });
});

describe("checkWorkflowSlaService (Roadmap B1)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("vừa vượt SLA, CHƯA từng nhắc → gửi nhắc ĐÚNG role bước đó, đánh dấu slaReminderSentAt, save", async () => {
    const instance = makeInstance({ createdAt: daysAgo(3) });
    mockFindReturns([instance]);

    const result = await checkWorkflowSlaService();

    expect(mockedNotify).toHaveBeenCalledTimes(1);
    expect(mockedNotify).toHaveBeenCalledWith("TRUONG_KHOA", expect.objectContaining({ type: "WORKFLOW_SLA_REMINDER" }));
    expect(instance.steps[0].slaReminderSentAt).toBeInstanceOf(Date);
    expect(instance.save).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ checked: 1, reminded: 1, escalated: 0 });
  });

  it("ĐÃ nhắc rồi (slaReminderSentAt có giá trị) → KHÔNG nhắc lại lần 2", async () => {
    const instance = makeInstance({
      createdAt: daysAgo(3),
      steps: [{ name: "A", role: "TRUONG_KHOA", status: "pending", slaDays: 3, slaReminderSentAt: daysAgo(1) }],
    });
    mockFindReturns([instance]);

    const result = await checkWorkflowSlaService();

    expect(mockedNotify).not.toHaveBeenCalled();
    expect(result).toEqual({ checked: 1, reminded: 0, escalated: 0 });
  });

  it("quá hạn ĐÚNG 2 lần SLA (daysPending >= 2*slaDays), CHƯA escalate → escalate ADMIN + vẫn nhắc (do chưa từng nhắc)", async () => {
    const instance = makeInstance({ createdAt: daysAgo(6) /* 2x slaDays(3) */ });
    mockFindReturns([instance]);

    const result = await checkWorkflowSlaService();

    expect(mockedNotify).toHaveBeenCalledTimes(2);
    expect(mockedNotify).toHaveBeenCalledWith("TRUONG_KHOA", expect.objectContaining({ type: "WORKFLOW_SLA_REMINDER" }));
    expect(mockedNotify).toHaveBeenCalledWith("ADMIN", expect.objectContaining({ type: "WORKFLOW_SLA_ESCALATED" }));
    expect(instance.steps[0].slaEscalatedAt).toBeInstanceOf(Date);
    expect(result).toEqual({ checked: 1, reminded: 1, escalated: 1 });
  });

  it("ĐÃ nhắc VÀ đã escalate rồi → không gửi lại bất kỳ notification nào, KHÔNG save", async () => {
    const instance = makeInstance({
      createdAt: daysAgo(10),
      steps: [
        {
          name: "A",
          role: "TRUONG_KHOA",
          status: "pending",
          slaDays: 3,
          slaReminderSentAt: daysAgo(5),
          slaEscalatedAt: daysAgo(2),
        },
      ],
    });
    mockFindReturns([instance]);

    const result = await checkWorkflowSlaService();

    expect(mockedNotify).not.toHaveBeenCalled();
    expect(instance.save).not.toHaveBeenCalled();
    expect(result).toEqual({ checked: 1, reminded: 0, escalated: 0 });
  });

  it("nhiều instance quá hạn cùng lúc → xử lý ĐỘC LẬP từng cái, tổng hợp đúng số liệu", async () => {
    const instance1 = makeInstance({ _id: "wf-1", createdAt: daysAgo(3) }); // vừa quá hạn — nhắc
    const instance2 = makeInstance({
      _id: "wf-2",
      createdAt: daysAgo(3),
      steps: [{ name: "B", role: "IT", status: "pending", slaDays: 3, slaReminderSentAt: daysAgo(1) }],
    }); // đã nhắc rồi — không nhắc lại, chưa đủ escalate
    mockFindReturns([instance1, instance2]);

    const result = await checkWorkflowSlaService();

    expect(result).toEqual({ checked: 2, reminded: 1, escalated: 0 });
  });
});

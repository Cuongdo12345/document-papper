import WorkflowInstance from "../../../models/documents/workflowInstance.model";
import WorkflowTemplate from "../../../models/documents/workflowTemplate.model";
import { Document, DocumentSubType } from "../../../models/documents/document.model";
import {
  approveStep,
  rejectStep,
  getAllWorkflowTemplatesService,
  getWorkflowHistoryForUser,
} from "../workflow.service";
import {
  startAssetMaintenanceService,
  resolveAssetMaintenanceService,
} from "../../assets/assetDevice/assetMaintenance.service";

jest.mock("../../../models/documents/workflowInstance.model");
jest.mock("../../../models/documents/workflowTemplate.model");
jest.mock("../../../models/documents/document.model");
jest.mock("../../notifications/notification.service");
jest.mock("../../assets/assetDevice/assetMaintenance.service");
jest.mock("../../../shared/utils/withTransaction", () => ({
  // Mock withTransaction chạy callback ngay với 1 session giả — không cần
  // MongoDB replica set thật để unit-test logic nghiệp vụ trong service.
  withTransaction: jest.fn((fn: any) => fn({})),
}));

const mockedWorkflowInstance = WorkflowInstance as unknown as {
  findById: jest.Mock;
  find: jest.Mock;
  countDocuments: jest.Mock;
};
const mockedWorkflowTemplate = WorkflowTemplate as unknown as {
  find: jest.Mock;
};
const mockedDocument = Document as unknown as { findByIdAndUpdate: jest.Mock; findOne: jest.Mock };
const mockedStartAssetMaintenanceService = startAssetMaintenanceService as jest.Mock;
const mockedResolveAssetMaintenanceService = resolveAssetMaintenanceService as jest.Mock;

/**
 * Helper dựng 1 workflow instance giả với API tối thiểu mà service cần:
 * `.save()` và field `steps[]`/`currentStep`/`status`/`documentId`.
 */
const makeFakeWorkflow = (overrides: any = {}) => ({
  _id: "wf-1",
  documentId: "doc-1",
  status: "pending",
  currentStep: 0,
  steps: [
    { role: "TRUONG_KHOA", status: "pending", approvedBy: undefined, approvedAt: undefined, comment: undefined },
    { role: "BAN_GIAM_DOC", status: "pending", approvedBy: undefined, approvedAt: undefined, comment: undefined },
  ],
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

beforeEach(() => {
  mockedDocument.findByIdAndUpdate.mockResolvedValue({
    _id: "doc-1",
    title: "Tài liệu test",
    createdBy: "creator-1",
  });
});

describe("workflow.service — approveStep (quy tắc bảo mật: đúng role mới được duyệt đúng bước)", () => {
  it("báo lỗi 404 nếu workflow không tồn tại", async () => {
    mockedWorkflowInstance.findById.mockResolvedValue(null);
    await expect(
      approveStep("wf-khong-ton-tai", "user-1", "TRUONG_KHOA"),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("báo lỗi 400 nếu workflow đã ở trạng thái kết thúc (approved/rejected), KHÔNG cho xử lý tiếp", async () => {
    const wf = makeFakeWorkflow({ status: "approved" });
    mockedWorkflowInstance.findById.mockResolvedValue(wf);
    await expect(approveStep("wf-1", "user-1", "TRUONG_KHOA")).rejects.toMatchObject({
      status: 400,
    });
    // Không được gọi save() nếu đã chặn từ đầu.
    expect(wf.save).not.toHaveBeenCalled();
  });

  it("🔒 QUAN TRỌNG: chặn 403 nếu role người gọi KHÔNG khớp role yêu cầu của bước hiện tại", async () => {
    const wf = makeFakeWorkflow(); // bước 0 yêu cầu role "TRUONG_KHOA"
    mockedWorkflowInstance.findById.mockResolvedValue(wf);
    // Người gọi có role "BAN_GIAM_DOC" — đúng role của BƯỚC SAU, nhưng
    // đang cố duyệt bước hiện tại (bước 0) vốn dành cho "TRUONG_KHOA".
    await expect(
      approveStep("wf-1", "user-1", "BAN_GIAM_DOC"),
    ).rejects.toMatchObject({ status: 403 });
    // Bước KHÔNG được đánh dấu approved, workflow KHÔNG được lưu — request
    // sai role phải bị chặn HOÀN TOÀN, không có tác dụng phụ nào lên DB.
    expect(wf.steps[0].status).toBe("pending");
    expect(wf.save).not.toHaveBeenCalled();
  });

  it("cho qua khi role người gọi khớp đúng role của bước hiện tại, chuyển sang bước kế tiếp", async () => {
    const wf = makeFakeWorkflow();
    mockedWorkflowInstance.findById.mockResolvedValue(wf);
    const result = await approveStep("wf-1", "user-1", "TRUONG_KHOA", "Đồng ý");
    expect(wf.steps[0].status).toBe("approved");
    expect(wf.steps[0].approvedBy).toBe("user-1");
    expect(wf.currentStep).toBe(1); // chuyển sang bước kế, CHƯA phải bước cuối
    expect(wf.status).toBe("pending"); // workflow vẫn đang chạy, chưa xong toàn bộ
    expect(wf.save).toHaveBeenCalled();
    expect(result).toBe(wf);
  });

  it("duyệt xong BƯỚC CUỐI: workflow chuyển sang 'approved', Document được cập nhật workflowStatus", async () => {
    const wf = makeFakeWorkflow({
      currentStep: 1, // đang ở bước cuối (index 1 trong mảng 2 bước)
      steps: [
        { role: "TRUONG_KHOA", status: "approved" },
        { role: "BAN_GIAM_DOC", status: "pending" },
      ],
    });
    mockedWorkflowInstance.findById.mockResolvedValue(wf);
    await approveStep("wf-1", "user-2", "BAN_GIAM_DOC");
    expect(wf.steps[1].status).toBe("approved");
    expect(wf.status).toBe("approved"); // toàn bộ workflow xong
    expect(mockedDocument.findByIdAndUpdate).toHaveBeenCalledWith(
      "doc-1",
      { workflowStatus: "approved" },
      expect.objectContaining({ new: true }),
    );
  });

  it("báo lỗi 400 nếu currentStep vượt quá số bước thực có (dữ liệu hỏng)", async () => {
    const wf = makeFakeWorkflow({ currentStep: 5 }); // chỉ có 2 step (index 0-1)
    mockedWorkflowInstance.findById.mockResolvedValue(wf);
    await expect(approveStep("wf-1", "user-1", "TRUONG_KHOA")).rejects.toMatchObject({
      status: 400,
    });
  });

  describe("ADMIN override (MỚI, 2026-09-10 — DEV-038 đề xuất #2)", () => {
    it("KHÔNG truyền `isAdmin` (mặc định false): hành vi CŨ giữ nguyên 100%, vẫn chặn 403 role sai", async () => {
      const wf = makeFakeWorkflow();
      mockedWorkflowInstance.findById.mockResolvedValue(wf);
      await expect(approveStep("wf-1", "admin-1", "ADMIN", "Duyệt")).rejects.toMatchObject({
        status: 403,
      });
      expect(wf.save).not.toHaveBeenCalled();
    });

    it("`isAdmin=true` + role KHÔNG khớp `step.role`: CHO QUA (duyệt thay), gắn tiền tố '[ADMIN duyệt thay role ...]' vào comment", async () => {
      const wf = makeFakeWorkflow(); // bước 0 yêu cầu role "TRUONG_KHOA"
      mockedWorkflowInstance.findById.mockResolvedValue(wf);

      await approveStep("wf-1", "admin-1", "ADMIN", "Duyệt gấp vì TRUONG_KHOA nghỉ", true);

      expect(wf.steps[0].status).toBe("approved");
      expect(wf.steps[0].approvedBy).toBe("admin-1"); // 🔒 vẫn lưu ĐÚNG user thật — audit trail minh bạch
      expect(wf.steps[0].comment).toBe(
        '[ADMIN duyệt thay role "TRUONG_KHOA"] Duyệt gấp vì TRUONG_KHOA nghỉ',
      );
      expect(wf.save).toHaveBeenCalled();
    });

    it("`isAdmin=true` NHƯNG role KHỚP đúng `step.role`: xử lý bình thường, KHÔNG gắn tiền tố override", async () => {
      const wf = makeFakeWorkflow();
      mockedWorkflowInstance.findById.mockResolvedValue(wf);

      await approveStep("wf-1", "user-1", "TRUONG_KHOA", "Đồng ý", true);

      expect(wf.steps[0].comment).toBe("Đồng ý");
    });

    it("`isAdmin=true` + `comment` rỗng: comment override vẫn có tiền tố, không có khoảng trắng thừa ở cuối", async () => {
      const wf = makeFakeWorkflow();
      mockedWorkflowInstance.findById.mockResolvedValue(wf);

      await approveStep("wf-1", "admin-1", "ADMIN", undefined, true);

      expect(wf.steps[0].comment).toBe('[ADMIN duyệt thay role "TRUONG_KHOA"]');
    });
  });
});

describe("workflow.service — rejectStep (cùng quy tắc bảo mật với approveStep)", () => {
  it("🔒 QUAN TRỌNG: chặn 403 nếu role người gọi KHÔNG khớp role yêu cầu của bước hiện tại", async () => {
    const wf = makeFakeWorkflow();
    mockedWorkflowInstance.findById.mockResolvedValue(wf);
    await expect(
      rejectStep("wf-1", "user-1", "BAN_GIAM_DOC", "Không đồng ý"),
    ).rejects.toMatchObject({ status: 403 });
    expect(wf.steps[0].status).toBe("pending");
    expect(wf.save).not.toHaveBeenCalled();
  });

  it("từ chối đúng role: workflow chuyển 'rejected' NGAY LẬP TỨC (không cần chờ hết các bước)", async () => {
    const wf = makeFakeWorkflow();
    mockedWorkflowInstance.findById.mockResolvedValue(wf);
    await rejectStep("wf-1", "user-1", "TRUONG_KHOA", "Thiếu hồ sơ");
    expect(wf.steps[0].status).toBe("rejected");
    expect(wf.status).toBe("rejected");
    expect(mockedDocument.findByIdAndUpdate).toHaveBeenCalledWith(
      "doc-1",
      { workflowStatus: "rejected" },
      expect.objectContaining({ new: true }),
    );
  });

  it("báo lỗi 400 nếu workflow đã kết thúc, không cho reject tiếp (tránh 'hồi sinh' trạng thái)", async () => {
    const wf = makeFakeWorkflow({ status: "rejected" });
    mockedWorkflowInstance.findById.mockResolvedValue(wf);
    await expect(rejectStep("wf-1", "user-1", "TRUONG_KHOA")).rejects.toMatchObject({
      status: 400,
    });
  });

  it("🆕 ADMIN override (DEV-038 đề xuất #2): `isAdmin=true` cho phép từ chối thay, gắn tiền tố '[ADMIN từ chối thay role ...]'", async () => {
    const wf = makeFakeWorkflow();
    mockedWorkflowInstance.findById.mockResolvedValue(wf);

    await rejectStep("wf-1", "admin-1", "ADMIN", "Không hợp lệ", true);

    expect(wf.steps[0].status).toBe("rejected");
    expect(wf.status).toBe("rejected");
    expect(wf.steps[0].approvedBy).toBe("admin-1");
    expect(wf.steps[0].comment).toBe('[ADMIN từ chối thay role "TRUONG_KHOA"] Không hợp lệ');
  });
});

/** Query chainable tối giản mô phỏng `.populate().populate().populate().sort().skip().limit()` (thenable). */
function makeWorkflowQuery(result: any) {
  const query: any = {};
  query.populate = jest.fn().mockReturnValue(query);
  query.sort = jest.fn().mockReturnValue(query);
  query.skip = jest.fn().mockReturnValue(query);
  query.limit = jest.fn().mockReturnValue(query);
  query.then = (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject);
  return query;
}

describe("workflow.service — getWorkflowHistoryForUser (MỚI, 2026-09-10 — Lịch sử duyệt)", () => {
  it("user thường: filter theo `steps.role` khớp role người gọi, KHÔNG filter status nếu không truyền", async () => {
    const findQuery = makeWorkflowQuery([{ _id: "wf-1" }]);
    mockedWorkflowInstance.find.mockReturnValue(findQuery);
    mockedWorkflowInstance.countDocuments.mockResolvedValue(1);

    const result = await getWorkflowHistoryForUser({ role: "TRUONG_KHOA", isAdmin: false }, {});

    expect(mockedWorkflowInstance.find).toHaveBeenCalledWith({ "steps.role": "TRUONG_KHOA" });
    expect(mockedWorkflowInstance.countDocuments).toHaveBeenCalledWith({ "steps.role": "TRUONG_KHOA" });
    expect(findQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(result.data).toEqual([{ _id: "wf-1" }]);
    expect(result.pagination).toEqual({ page: 1, limit: 10, total: 1, totalPages: 1 });
  });

  it("ADMIN: KHÔNG filter theo role (xem toàn bộ lịch sử), khác hẳn getPendingApprovalsForRole", async () => {
    const findQuery = makeWorkflowQuery([]);
    mockedWorkflowInstance.find.mockReturnValue(findQuery);
    mockedWorkflowInstance.countDocuments.mockResolvedValue(0);

    await getWorkflowHistoryForUser({ role: "ADMIN", isAdmin: true }, {});

    expect(mockedWorkflowInstance.find).toHaveBeenCalledWith({});
    expect(mockedWorkflowInstance.countDocuments).toHaveBeenCalledWith({});
  });

  it("có truyền `status`: ghép thêm vào filter (cả user thường lẫn ADMIN)", async () => {
    const findQuery = makeWorkflowQuery([]);
    mockedWorkflowInstance.find.mockReturnValue(findQuery);
    mockedWorkflowInstance.countDocuments.mockResolvedValue(0);

    await getWorkflowHistoryForUser({ role: "BAN_GIAM_DOC", isAdmin: false }, { status: "approved" });

    expect(mockedWorkflowInstance.find).toHaveBeenCalledWith({
      "steps.role": "BAN_GIAM_DOC",
      status: "approved",
    });
  });

  it("phân trang: page/limit truyền vào query string (dạng string) vẫn tính đúng skip", async () => {
    const findQuery = makeWorkflowQuery([]);
    mockedWorkflowInstance.find.mockReturnValue(findQuery);
    mockedWorkflowInstance.countDocuments.mockResolvedValue(25);

    const result = await getWorkflowHistoryForUser(
      { role: "IT", isAdmin: false },
      { page: "3", limit: "10" },
    );

    expect(findQuery.skip).toHaveBeenCalledWith(20); // (3-1)*10
    expect(findQuery.limit).toHaveBeenCalledWith(10);
    expect(result.pagination).toEqual({ page: 3, limit: 10, total: 25, totalPages: 3 });
  });
});

describe("workflow.service — getAllWorkflowTemplatesService (FE-04, đọc-only)", () => {
  it("chỉ lấy template isActive:true, sort theo name, select đúng field", async () => {
    const sort = jest.fn().mockResolvedValue([{ _id: "tpl-1", name: "A" }]);
    const select = jest.fn().mockReturnValue({ sort });
    mockedWorkflowTemplate.find.mockReturnValue({ select });

    const result = await getAllWorkflowTemplatesService();

    expect(mockedWorkflowTemplate.find).toHaveBeenCalledWith({ isActive: true });
    expect(select).toHaveBeenCalledWith("name steps isActive createdAt");
    expect(sort).toHaveBeenCalledWith({ name: 1 });
    expect(result).toEqual([{ _id: "tpl-1", name: "A" }]);
  });
});

/**
 * MỚI (DEV-046, 2026-09-12) — `syncAssetOnDocumentApproved` (hàm nội bộ,
 * KHÔNG export) trước đây 0% test coverage dù là fix cho bug CRITICAL
 * nghiêm trọng nhất trong toàn bộ risk register (DEV-005) — ghi nhận ở
 * `docs/30_DEVELOPMENT_COMPLETION_AUDIT.md` Mục 6/9 #1. Test GIÁN TIẾP qua
 * `approveStep()` (API công khai duy nhất gọi tới hàm này, chỉ khi
 * `isLastStep`) — không refactor để export riêng (tránh đổi cấu trúc module
 * chỉ để test, ngoài phạm vi task).
 */
describe("workflow.service — approveStep → syncAssetOnDocumentApproved (DEV-046, đồng bộ trạng thái Asset khi duyệt xong)", () => {
  // Workflow 1 bước — duyệt bước này LUÔN là bước cuối (isLastStep), kích
  // hoạt `syncAssetOnDocumentApproved` ngay lập tức, không cần dàn dựng 2 bước.
  const makeSingleStepWorkflow = (overrides: any = {}) =>
    makeFakeWorkflow({
      steps: [{ role: "IT", status: "pending", approvedBy: undefined, approvedAt: undefined, comment: undefined }],
      ...overrides,
    });

  it("PROPOSE_REPAIR có relatedAsset: gọi startAssetMaintenanceService(asset, actor) đúng tham số", async () => {
    const wf = makeSingleStepWorkflow();
    mockedWorkflowInstance.findById.mockResolvedValue(wf);
    mockedDocument.findByIdAndUpdate.mockResolvedValue({
      _id: "doc-1",
      title: "Đề xuất sửa máy in",
      createdBy: "creator-1",
      subType: DocumentSubType.PROPOSE_REPAIR,
      relatedAsset: "asset-1",
    });

    await approveStep("wf-1", "user-1", "IT");

    expect(mockedStartAssetMaintenanceService).toHaveBeenCalledWith("asset-1", "user-1");
    expect(mockedResolveAssetMaintenanceService).not.toHaveBeenCalled();
  });

  it("PROPOSE_REPAIR KHÔNG có relatedAsset (document cũ trước Giai đoạn 3): KHÔNG gọi asset service nào, KHÔNG throw", async () => {
    const wf = makeSingleStepWorkflow();
    mockedWorkflowInstance.findById.mockResolvedValue(wf);
    mockedDocument.findByIdAndUpdate.mockResolvedValue({
      _id: "doc-1",
      title: "Đề xuất cũ",
      createdBy: "creator-1",
      subType: DocumentSubType.PROPOSE_REPAIR,
      relatedAsset: null,
    });

    await expect(approveStep("wf-1", "user-1", "IT")).resolves.toBeDefined();
    expect(mockedStartAssetMaintenanceService).not.toHaveBeenCalled();
  });

  it("CHECK_DAMAGE, meta.repairResult mặc định/thiếu field: gọi resolveAssetMaintenanceService(asset, \"REPAIRED\", actor)", async () => {
    const wf = makeSingleStepWorkflow();
    mockedWorkflowInstance.findById.mockResolvedValue(wf);
    mockedDocument.findByIdAndUpdate.mockResolvedValue({
      _id: "doc-2",
      title: "Biên bản kiểm tra hư hỏng",
      createdBy: "creator-1",
      subType: DocumentSubType.CHECK_DAMAGE,
      referenceTo: ["proposal-1"],
      meta: {}, // thiếu repairResult — PHẢI mặc định coi là sửa xong (an toàn hơn thanh lý nhầm)
    });
    mockedDocument.findOne.mockResolvedValue({
      _id: "proposal-1",
      subType: DocumentSubType.PROPOSE_REPAIR,
      relatedAsset: "asset-2",
    });

    await approveStep("wf-1", "user-1", "IT");

    expect(mockedDocument.findOne).toHaveBeenCalledWith({
      _id: "proposal-1",
      subType: DocumentSubType.PROPOSE_REPAIR,
    });
    expect(mockedResolveAssetMaintenanceService).toHaveBeenCalledWith("asset-2", "REPAIRED", "user-1");
  });

  it("🔒 CHECK_DAMAGE, meta.repairResult=\"UNREPAIRABLE\": gọi resolveAssetMaintenanceService với đúng outcome \"UNREPAIRABLE\" (thanh lý)", async () => {
    const wf = makeSingleStepWorkflow();
    mockedWorkflowInstance.findById.mockResolvedValue(wf);
    mockedDocument.findByIdAndUpdate.mockResolvedValue({
      _id: "doc-2",
      title: "Biên bản kiểm tra hư hỏng",
      createdBy: "creator-1",
      subType: DocumentSubType.CHECK_DAMAGE,
      referenceTo: ["proposal-1"],
      meta: { repairResult: "UNREPAIRABLE" },
    });
    mockedDocument.findOne.mockResolvedValue({
      _id: "proposal-1",
      subType: DocumentSubType.PROPOSE_REPAIR,
      relatedAsset: "asset-2",
    });

    await approveStep("wf-1", "user-1", "IT");

    expect(mockedResolveAssetMaintenanceService).toHaveBeenCalledWith("asset-2", "UNREPAIRABLE", "user-1");
  });

  it("CHECK_DAMAGE KHÔNG có referenceTo (không tham chiếu proposal nào): KHÔNG query Document.findOne, KHÔNG gọi asset service", async () => {
    const wf = makeSingleStepWorkflow();
    mockedWorkflowInstance.findById.mockResolvedValue(wf);
    mockedDocument.findByIdAndUpdate.mockResolvedValue({
      _id: "doc-2",
      title: "Biên bản thiếu tham chiếu",
      createdBy: "creator-1",
      subType: DocumentSubType.CHECK_DAMAGE,
      referenceTo: [],
    });

    await expect(approveStep("wf-1", "user-1", "IT")).resolves.toBeDefined();
    expect(mockedDocument.findOne).not.toHaveBeenCalled();
    expect(mockedResolveAssetMaintenanceService).not.toHaveBeenCalled();
  });

  it("🔒 asset service throw lỗi: KHÔNG làm approveStep thất bại (try/catch nuốt lỗi, chỉ log) — duyệt Document vẫn coi là thành công", async () => {
    const wf = makeSingleStepWorkflow();
    mockedWorkflowInstance.findById.mockResolvedValue(wf);
    mockedDocument.findByIdAndUpdate.mockResolvedValue({
      _id: "doc-1",
      title: "Đề xuất sửa máy in",
      createdBy: "creator-1",
      subType: DocumentSubType.PROPOSE_REPAIR,
      relatedAsset: "asset-1",
    });
    mockedStartAssetMaintenanceService.mockRejectedValueOnce(new Error("DB lỗi tạm thời"));
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    await expect(approveStep("wf-1", "user-1", "IT")).resolves.toBeDefined();
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it("KHÔNG PHẢI bước cuối (còn bước tiếp theo): KHÔNG gọi bất kỳ asset service nào", async () => {
    const wf = makeFakeWorkflow(); // 2 bước, duyệt bước 0 KHÔNG phải bước cuối
    mockedWorkflowInstance.findById.mockResolvedValue(wf);

    await approveStep("wf-1", "user-1", "TRUONG_KHOA");

    expect(mockedDocument.findByIdAndUpdate).not.toHaveBeenCalled();
    expect(mockedStartAssetMaintenanceService).not.toHaveBeenCalled();
    expect(mockedResolveAssetMaintenanceService).not.toHaveBeenCalled();
  });
});

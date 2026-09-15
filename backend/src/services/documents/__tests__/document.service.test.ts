import WorkflowInstance from "../../../models/documents/workflowInstance.model";
import {
  findProposalById,
  findReportsByProposal,
  findDocuments,
  countDocuments,
  findDocumentIdsByFilter,
  countReportsByProposal,
  softDeleteDocumentsByFilter,
  getActiveDocumentOrFail,
} from "../documents.query";
import {
  getReportsByProposalService,
  getAllDocumentsService,
  deleteDocumentsByMonthService,
  updateDocumentService,
  getDocumentVersionsService,
} from "../document.service";

// (Roadmap A4, 2026-09-15) — regression test cho version-snapshot mới thêm
// vào `updateDocumentService` + `getDocumentVersionsService`. Cùng lý do các
// mock khác trong file: `document.service.ts` gọi thẳng model (`UserAudit`
// default export, `DocumentVersion` named export) và `withTransaction`, chưa
// được mock ở phần trên (chỉ mock `documents.query`/`workflowInstance.model`).
jest.mock("../../../models/users/userAudit.model", () => ({
  __esModule: true,
  default: { create: jest.fn().mockResolvedValue([{}]) },
}));
jest.mock("../../../models/documents/documentVersion.model", () => ({
  DocumentVersion: {
    countDocuments: jest.fn(),
    create: jest.fn().mockResolvedValue([{}]),
    find: jest.fn(),
  },
}));
jest.mock("../../../shared/utils/withTransaction");

import UserAudit from "../../../models/users/userAudit.model";
import { DocumentVersion } from "../../../models/documents/documentVersion.model";
import { withTransaction } from "../../../shared/utils/withTransaction";

const mockedGetActiveDocumentOrFail = getActiveDocumentOrFail as jest.Mock;
const mockedUserAudit = UserAudit as any;
const mockedDocumentVersion = DocumentVersion as any;
const mockedWithTransaction = withTransaction as unknown as jest.Mock;

// ⚠️ MỚI (2026-09-10, DEV-038 — bug user báo qua tab "Lịch sử duyệt") —
// file này TRƯỚC ĐÂY CHƯA TỪNG TỒN TẠI (`document.service.ts` 0% coverage).
// CHỦ Ý chỉ test đúng `getReportsByProposalService()` (hàm vừa sửa), KHÔNG
// cố gắng cover toàn bộ file service rất lớn này trong 1 task fix bug —
// ngoài phạm vi.
// (DEV-040, 2026-09-10) — bổ sung `getAllDocumentsService` (hàm vừa sửa
// thêm `canViewAllDepartments`), cùng lý do chỉ scope đúng hàm bị sửa.
// (DEV-044, 2026-09-12) — bổ sung `deleteDocumentsByMonthService` (hàm vừa
// thêm guard ADMIN-only), cùng lý do.
jest.mock("../../../models/documents/workflowInstance.model");
jest.mock("../documents.query");

const mockedWorkflowInstance = WorkflowInstance as unknown as { exists: jest.Mock };
const mockedFindProposalById = findProposalById as jest.Mock;
const mockedFindReportsByProposal = findReportsByProposal as jest.Mock;
const mockedFindDocuments = findDocuments as jest.Mock;
const mockedCountDocuments = countDocuments as jest.Mock;
const mockedFindDocumentIdsByFilter = findDocumentIdsByFilter as jest.Mock;
const mockedCountReportsByProposal = countReportsByProposal as jest.Mock;
const mockedSoftDeleteDocumentsByFilter = softDeleteDocumentsByFilter as jest.Mock;

const PROPOSAL_ID = "6a0000000000000000000001";
const OTHER_DEPARTMENT_ID = "6a0000000000000000000099";
const CALLER_DEPARTMENT_ID = "6a0000000000000000000002";

const makeProposal = (overrides: any = {}) => ({
  _id: PROPOSAL_ID,
  department: { _id: OTHER_DEPARTMENT_ID, name: "Khoa khác", code: "KK" },
  referenceTo: null,
  ...overrides,
});

describe("document.service — getReportsByProposalService (DEV-030 department-scoping + DEV-038 workflow-participant exception)", () => {
  beforeEach(() => {
    mockedFindProposalById.mockResolvedValue(makeProposal());
    mockedFindReportsByProposal.mockResolvedValue([]);
  });

  it("báo lỗi 404 nếu không tìm thấy proposal", async () => {
    mockedFindProposalById.mockResolvedValue(null);
    await expect(getReportsByProposalService({ proposalId: PROPOSAL_ID })).rejects.toMatchObject({
      status: 404,
    });
  });

  it("ADMIN: luôn xem được, KHÔNG cần query WorkflowInstance (bypass sớm)", async () => {
    await getReportsByProposalService({ proposalId: PROPOSAL_ID, isAdmin: true });
    expect(mockedWorkflowInstance.exists).not.toHaveBeenCalled();
  });

  it("cùng phòng ban: xem được, KHÔNG cần query WorkflowInstance (department check pass trước)", async () => {
    mockedFindProposalById.mockResolvedValue(
      makeProposal({ department: { _id: CALLER_DEPARTMENT_ID, name: "Khoa gọi", code: "KG" } }),
    );
    await getReportsByProposalService({
      proposalId: PROPOSAL_ID,
      callerDepartment: CALLER_DEPARTMENT_ID,
      callerRole: "IT",
    });
    expect(mockedWorkflowInstance.exists).not.toHaveBeenCalled();
  });

  it("🔒 khác phòng ban, KHÔNG phải approver của workflow này: vẫn 403 (hành vi CŨ giữ nguyên)", async () => {
    mockedWorkflowInstance.exists.mockResolvedValue(null);
    await expect(
      getReportsByProposalService({
        proposalId: PROPOSAL_ID,
        callerDepartment: CALLER_DEPARTMENT_ID,
        callerRole: "TRUONG_KHOA",
      }),
    ).rejects.toMatchObject({ status: 403 });
    expect(mockedWorkflowInstance.exists).toHaveBeenCalledWith({
      documentId: PROPOSAL_ID,
      "steps.role": "TRUONG_KHOA",
    });
  });

  it("🆕 khác phòng ban NHƯNG role từng tham gia BẤT KỲ bước nào của workflow: cho xem (fix DEV-038)", async () => {
    mockedWorkflowInstance.exists.mockResolvedValue({ _id: "wf-1" });
    const result = await getReportsByProposalService({
      proposalId: PROPOSAL_ID,
      callerDepartment: CALLER_DEPARTMENT_ID,
      callerRole: "BAN_GIAM_DOC",
    });
    expect(result.proposal).toBeDefined();
    expect(mockedWorkflowInstance.exists).toHaveBeenCalledWith({
      documentId: PROPOSAL_ID,
      "steps.role": "BAN_GIAM_DOC",
    });
  });

  it("không truyền `callerRole`: KHÔNG query WorkflowInstance (tránh query rỗng vô nghĩa), vẫn 403 nếu khác phòng ban", async () => {
    await expect(
      getReportsByProposalService({ proposalId: PROPOSAL_ID, callerDepartment: CALLER_DEPARTMENT_ID }),
    ).rejects.toMatchObject({ status: 403 });
    expect(mockedWorkflowInstance.exists).not.toHaveBeenCalled();
  });

  it("🆕 canViewAllDepartments=true (permission DOCUMENT_VIEW_ALL_DEPARTMENTS): xem được khác phòng ban, KHÔNG cần query WorkflowInstance (DEV-040)", async () => {
    const result = await getReportsByProposalService({
      proposalId: PROPOSAL_ID,
      callerDepartment: CALLER_DEPARTMENT_ID,
      canViewAllDepartments: true,
    });
    expect(result.proposal).toBeDefined();
    expect(mockedWorkflowInstance.exists).not.toHaveBeenCalled();
  });
});

describe("document.service — getAllDocumentsService (DEV-030 department-scoping + DEV-040 canViewAllDepartments exception)", () => {
  const CALLER_DEPARTMENT_ID = "6a0000000000000000000002";

  beforeEach(() => {
    mockedFindDocuments.mockResolvedValue([]);
    mockedCountDocuments.mockResolvedValue(0);
  });

  it("non-admin, không có canViewAllDepartments: filter ép theo đúng khoa người gọi (hành vi CŨ giữ nguyên)", async () => {
    await getAllDocumentsService({ query: {}, callerDepartment: CALLER_DEPARTMENT_ID });
    const filterArg = mockedFindDocuments.mock.calls[0][0];
    expect(filterArg.department).toBe(CALLER_DEPARTMENT_ID);
  });

  it("🔒 non-admin, thiếu callerDepartment (dữ liệu user thiếu field): fail-closed filter.department = null", async () => {
    await getAllDocumentsService({ query: {} });
    const filterArg = mockedFindDocuments.mock.calls[0][0];
    expect(filterArg.department).toBeNull();
  });

  it("ADMIN: KHÔNG ép filter.department (xem tất cả khoa, hành vi CŨ giữ nguyên)", async () => {
    await getAllDocumentsService({ query: {}, callerDepartment: CALLER_DEPARTMENT_ID, isAdmin: true });
    const filterArg = mockedFindDocuments.mock.calls[0][0];
    expect(filterArg.department).toBeUndefined();
  });

  it("🆕 canViewAllDepartments=true (permission DOCUMENT_VIEW_ALL_DEPARTMENTS, VD role IT): KHÔNG ép filter.department dù không phải ADMIN (fix DEV-040)", async () => {
    await getAllDocumentsService({
      query: {},
      callerDepartment: CALLER_DEPARTMENT_ID,
      isAdmin: false,
      canViewAllDepartments: true,
    });
    const filterArg = mockedFindDocuments.mock.calls[0][0];
    expect(filterArg.department).toBeUndefined();
  });
});

describe("document.service — deleteDocumentsByMonthService (DEV-044 — guard ADMIN-only, mirror deleteDocumentService)", () => {
  const basePayload = { month: 9, year: 2026, userId: "user-1" };

  beforeEach(() => {
    mockedFindDocumentIdsByFilter.mockResolvedValue([]);
    mockedCountReportsByProposal.mockResolvedValue(0);
    mockedSoftDeleteDocumentsByFilter.mockResolvedValue({ modifiedCount: 5 });
  });

  it("🔒 role IT (isSystemRole=false): 403, KHÔNG chạm DB (fail sớm trước mọi query)", async () => {
    await expect(
      deleteDocumentsByMonthService({ ...basePayload, role: "IT", isSystemRole: false }),
    ).rejects.toMatchObject({ status: 403 });
    expect(mockedFindDocumentIdsByFilter).not.toHaveBeenCalled();
    expect(mockedSoftDeleteDocumentsByFilter).not.toHaveBeenCalled();
  });

  it("🔒 role USER thường: 403, KHÔNG chạm DB", async () => {
    await expect(
      deleteDocumentsByMonthService({ ...basePayload, role: "USER", isSystemRole: false }),
    ).rejects.toMatchObject({ status: 403 });
    expect(mockedSoftDeleteDocumentsByFilter).not.toHaveBeenCalled();
  });

  // 🔒 CẬP NHẬT (DEV-047, 2026-09-12 — DEV-001A Phase B hoàn tất): trước đây
  // `role: "ADMIN"` ĐƠN THUẦN (isSystemRole=false) cũng cho qua (lưới đỡ
  // Phase A) — nay KHÔNG còn, đúng ý định gốc "chỉ ADMIN THẬT" (đóng RV02-01
  // cho đúng guard này).
  it("🔒 role.name === \"ADMIN\" NHƯNG isSystemRole=false: 403 (không còn là lưới đỡ hợp lệ)", async () => {
    await expect(
      deleteDocumentsByMonthService({ ...basePayload, role: "ADMIN", isSystemRole: false }),
    ).rejects.toMatchObject({ status: 403 });
    expect(mockedSoftDeleteDocumentsByFilter).not.toHaveBeenCalled();
  });

  it("isSystemRole === true (cờ security identity, DEV-001A): cho qua, thực hiện xoá", async () => {
    const result = await deleteDocumentsByMonthService({ ...basePayload, role: "khong-quan-trong", isSystemRole: true });
    expect(result.deletedCount).toBe(5);
    expect(mockedSoftDeleteDocumentsByFilter).toHaveBeenCalled();
  });
});

describe("document.service — updateDocumentService: version snapshot (Roadmap A4)", () => {
  const DOC_ID = "6a0000000000000000000010";
  const USER_ID = "6a0000000000000000000020";
  const DEPT_ID = "6a0000000000000000000002";

  const makeDocument = (overrides: any = {}) => ({
    _id: DOC_ID,
    title: "Tiêu đề cũ",
    meta: { note: "phiên bản cũ" },
    department: DEPT_ID,
    workflowStatus: "pending",
    createdBy: "creator-goc",
    createdAt: new Date("2025-12-01T00:00:00.000Z"),
    updatedBy: "editor-truoc",
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockedWithTransaction.mockImplementation(async (fn: any) => fn("fake-session"));
    mockedDocumentVersion.countDocuments.mockReturnValue({ session: jest.fn().mockResolvedValue(0) });
  });

  it("có thay đổi thật (title đổi) → chụp lại ĐÚNG nội dung CŨ (title/meta) + người/thời điểm đã viết ra nó (updatedBy/updatedAt CŨ, KHÔNG phải userId đang sửa)", async () => {
    const document = makeDocument();
    mockedGetActiveDocumentOrFail.mockResolvedValue(document);

    await updateDocumentService({
      id: DOC_ID,
      userId: USER_ID,
      isAdmin: true,
      updateData: { title: "Tiêu đề MỚI" },
    });

    expect(mockedDocumentVersion.create).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          document: DOC_ID,
          versionNumber: 1,
          title: "Tiêu đề cũ",
          meta: { note: "phiên bản cũ" },
          editedBy: "editor-truoc",
          editedAt: new Date("2026-01-01T00:00:00.000Z"),
        }),
      ],
      { session: "fake-session" },
    );
  });

  it("lần sửa ĐẦU TIÊN (document chưa từng có updatedBy/updatedAt thật) → fallback editedBy/editedAt = createdBy/createdAt", async () => {
    const document = makeDocument({ updatedBy: undefined, updatedAt: undefined });
    mockedGetActiveDocumentOrFail.mockResolvedValue(document);

    await updateDocumentService({
      id: DOC_ID,
      userId: USER_ID,
      isAdmin: true,
      updateData: { title: "Tiêu đề MỚI" },
    });

    expect(mockedDocumentVersion.create).toHaveBeenCalledWith(
      [expect.objectContaining({ editedBy: "creator-goc", editedAt: new Date("2025-12-01T00:00:00.000Z") })],
      { session: "fake-session" },
    );
  });

  it("versionNumber tăng dần đúng theo số bản ghi ĐÃ CÓ (countDocuments = 3 → version mới = 4)", async () => {
    mockedGetActiveDocumentOrFail.mockResolvedValue(makeDocument());
    mockedDocumentVersion.countDocuments.mockReturnValue({ session: jest.fn().mockResolvedValue(3) });

    await updateDocumentService({
      id: DOC_ID,
      userId: USER_ID,
      isAdmin: true,
      updateData: { title: "Tiêu đề MỚI" },
    });

    expect(mockedDocumentVersion.create).toHaveBeenCalledWith(
      [expect.objectContaining({ versionNumber: 4 })],
      { session: "fake-session" },
    );
  });

  it("KHÔNG có thay đổi thật (gửi lại đúng title/meta cũ) → KHÔNG tạo version mới, KHÔNG ghi UserAudit, KHÔNG save (early return)", async () => {
    const document = makeDocument();
    mockedGetActiveDocumentOrFail.mockResolvedValue(document);

    await updateDocumentService({
      id: DOC_ID,
      userId: USER_ID,
      isAdmin: true,
      updateData: { title: "Tiêu đề cũ", meta: { note: "phiên bản cũ" } },
    });

    expect(mockedDocumentVersion.create).not.toHaveBeenCalled();
    expect(mockedUserAudit.create).not.toHaveBeenCalled();
    expect(document.save).not.toHaveBeenCalled();
  });

  it("version CŨ được lưu TRONG CÙNG transaction với UserAudit + document.save (atomic)", async () => {
    const document = makeDocument();
    mockedGetActiveDocumentOrFail.mockResolvedValue(document);

    await updateDocumentService({
      id: DOC_ID,
      userId: USER_ID,
      isAdmin: true,
      updateData: { title: "Tiêu đề MỚI" },
    });

    expect(mockedWithTransaction).toHaveBeenCalledTimes(1);
    expect(mockedDocumentVersion.create).toHaveBeenCalledWith(expect.anything(), { session: "fake-session" });
    expect(mockedUserAudit.create).toHaveBeenCalledWith(expect.anything(), { session: "fake-session" });
    expect(document.save).toHaveBeenCalledWith({ session: "fake-session" });
  });
});

describe("document.service — getDocumentVersionsService (Roadmap A4)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("ID không hợp lệ → 400, không chạm DB", async () => {
    await expect(getDocumentVersionsService("not-an-id")).rejects.toMatchObject({ status: 400 });
    expect(mockedDocumentVersion.find).not.toHaveBeenCalled();
  });

  it("query đúng document, sort mới nhất trước, có populate editedBy", async () => {
    const sortMock = jest.fn().mockReturnThis();
    const populateMock = jest.fn().mockResolvedValue([{ versionNumber: 2 }, { versionNumber: 1 }]);
    mockedDocumentVersion.find.mockReturnValue({ sort: sortMock, populate: populateMock });
    sortMock.mockReturnValue({ populate: populateMock });

    const DOC_ID = "6a0000000000000000000010";
    const result = await getDocumentVersionsService(DOC_ID);

    expect(mockedDocumentVersion.find).toHaveBeenCalledWith({ document: DOC_ID });
    expect(sortMock).toHaveBeenCalledWith({ versionNumber: -1 });
    expect(populateMock).toHaveBeenCalledWith("editedBy", "fullName username");
    expect(result).toEqual([{ versionNumber: 2 }, { versionNumber: 1 }]);
  });
});

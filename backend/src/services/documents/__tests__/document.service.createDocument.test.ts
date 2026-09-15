/**
 * DEV-045 — regression test: `createDocumentService()` (nhánh
 * PROPOSE_REPAIR) trước đây đọc `findPendingRepairProposalForAsset` (dò
 * trùng lặp đề xuất sửa chữa) TRƯỚC khi vào `withTransaction` — window
 * TOCTOU (cùng họ lỗi ARCH-21 đã fix ở `excel.service.ts`, xem
 * `excel.service.test.ts`). Nay đọc lại NGAY BÊN TRONG transaction (dùng
 * `.session(session)`). File test RIÊNG (không dùng chung
 * `document.service.test.ts`) vì cần mock nhiều dependency khác hẳn
 * (`Asset`, `generateDocumentCode`, `withTransaction`, `UserAudit`,
 * `notifyUsersByDepartment`) — tránh ảnh hưởng tới mock của các describe
 * block khác đang test `getAllDocumentsService`/`getReportsByProposalService`/
 * `deleteDocumentsByMonthService` trong cùng file đó.
 *
 * CHỦ Ý dùng THẬT (không mock) `validateDocumentRule`/`validateReference`
 * (`documents.validator.ts`) — cả 2 đều thuần/không đụng DB cho subType
 * PROPOSE_REPAIR (`requireReference` không bật cho rule này, xem
 * `documentRules.ts`), và `buildReferenceArray` (`documents.mapper.ts`) —
 * giữ đúng nguyên tắc chỉ mock những gì thật sự cần.
 */
jest.mock("../documents.query");
jest.mock("../../../models/assets/asset.model", () => ({
  ...jest.requireActual("../../../models/assets/asset.model"),
  Asset: { findOne: jest.fn() },
}));
jest.mock("../../../models/users/userAudit.model", () => ({
  __esModule: true,
  default: { create: jest.fn().mockResolvedValue([{}]) },
}));
jest.mock("../../notifications/notification.service", () => ({
  notifyUsersByDepartment: jest.fn(),
}));
jest.mock("../../../shared/utils/generateDocumentCode", () => ({
  generateDocumentCode: jest.fn().mockResolvedValue("PR-NOI-2026-0001"),
}));
jest.mock("../../../shared/utils/withTransaction");

import { Asset, AssetStatus } from "../../../models/assets/asset.model";
import { findPendingRepairProposalForAsset, createDocument } from "../documents.query";
import { withTransaction } from "../../../shared/utils/withTransaction";
import { createDocumentService } from "../document.service";
import { DocumentCategory, DocumentSubType } from "../../../models/documents/document.model";

const mockedAsset = Asset as unknown as { findOne: jest.Mock };
const mockedFindPendingRepairProposalForAsset = findPendingRepairProposalForAsset as jest.Mock;
const mockedCreateDocument = createDocument as jest.Mock;
const mockedWithTransaction = withTransaction as unknown as jest.Mock;

const FAKE_SESSION = { id: "fake-session" };

const basePayload = {
  userId: "user-1",
  category: DocumentCategory.PROPOSAL,
  subType: DocumentSubType.PROPOSE_REPAIR,
  title: "Đề xuất sửa máy in",
  department: "dept-1",
  relatedAsset: "asset-1",
};

describe("createDocumentService — dò trùng lặp đề xuất sửa chữa trong transaction (DEV-045/RV05-07 TOCTOU)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedWithTransaction.mockImplementation(async (fn: any) => fn(FAKE_SESSION));
    mockedAsset.findOne.mockResolvedValue({ _id: "asset-1", status: AssetStatus.IN_USE });
    mockedCreateDocument.mockResolvedValue({ _id: "doc-1", documentCode: "PR-NOI-2026-0001" });
  });

  it("đọc trùng lặp NGAY BÊN TRONG withTransaction (dùng đúng session), KHÔNG phải trước", async () => {
    mockedFindPendingRepairProposalForAsset.mockResolvedValue(null);

    await createDocumentService(basePayload as any);

    expect(mockedWithTransaction).toHaveBeenCalledTimes(1);
    expect(mockedFindPendingRepairProposalForAsset).toHaveBeenCalledTimes(1);

    // Regression guard cốt lõi (mirror đúng excel.service.test.ts): nếu ai
    // đó vô tình đưa check này ra NGOÀI `withTransaction` lại (quay lại bug
    // RV05-07), lệnh gọi sẽ xảy ra TRƯỚC — invocationCallOrder sẽ nhỏ hơn.
    const withTransactionOrder = mockedWithTransaction.mock.invocationCallOrder[0];
    const findPendingOrder = mockedFindPendingRepairProposalForAsset.mock.invocationCallOrder[0];
    expect(findPendingOrder).toBeGreaterThan(withTransactionOrder);

    // Phải nhận ĐÚNG session mà `withTransaction` cấp cho callback.
    expect(mockedFindPendingRepairProposalForAsset).toHaveBeenCalledWith("asset-1", FAKE_SESSION);
  });

  it("🔒 đã có đề xuất pending khác cho CÙNG asset (đọc được NGAY TRONG transaction) → 400, KHÔNG tạo document mới", async () => {
    mockedFindPendingRepairProposalForAsset.mockResolvedValue({
      _id: "doc-existing",
      documentCode: "PR-NOI-2026-0000",
    });

    await expect(createDocumentService(basePayload as any)).rejects.toMatchObject({ status: 400 });
    expect(mockedCreateDocument).not.toHaveBeenCalled();
  });

  it("subType KHÁC PROPOSE_REPAIR: KHÔNG gọi dò trùng lặp (chỉ áp dụng đúng nhánh sửa chữa)", async () => {
    await createDocumentService({
      ...basePayload,
      category: DocumentCategory.REFERENCE, // đúng rule MANUAL (documentRules.ts)
      subType: DocumentSubType.MANUAL,
      relatedAsset: undefined,
    } as any);

    expect(mockedFindPendingRepairProposalForAsset).not.toHaveBeenCalled();
    expect(mockedCreateDocument).toHaveBeenCalledTimes(1);
  });
});

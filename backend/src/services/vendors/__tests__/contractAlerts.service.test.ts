// (Roadmap B4 — Quản lý nhà cung cấp & hợp đồng bảo trì, 2026-09-16)
// Regression test cho `contractAlerts.service.ts`. Mock Model + notification
// helper — không dùng DB thật, cùng pattern `consumableAlerts.service.test.ts`.
jest.mock("../../../models/vendors/contract.model", () => ({
  Contract: { find: jest.fn() },
}));
jest.mock("../../../models/rbac/role.model", () => ({
  Role: { findOne: jest.fn() },
}));
jest.mock("../../../models/users/user.model", () => ({
  User: { countDocuments: jest.fn() },
}));
jest.mock("../../notifications/notification.service", () => ({
  notifyUsersByRoleName: jest.fn().mockResolvedValue(undefined),
}));

import { Contract } from "../../../models/vendors/contract.model";
import { Role } from "../../../models/rbac/role.model";
import { User } from "../../../models/users/user.model";
import { notifyUsersByRoleName } from "../../notifications/notification.service";
import { checkContractsExpiringService, runContractAlertsService } from "../contractAlerts.service";

const mockedContract = Contract as any;
const mockedRole = Role as any;
const mockedUser = User as any;
const mockedNotify = notifyUsersByRoleName as jest.Mock;

const makeExpiringContract = (overrides: any = {}) => ({
  _id: "contract-1",
  title: "Hợp đồng bảo trì máy X-quang",
  vendor: { name: "Công ty ABC" },
  endDate: new Date(Date.now() + 10 * 86400000),
  expiryAlertSentAt: null,
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const mockFindReturns = (contracts: any[]) => {
  mockedContract.find.mockReturnValue({ populate: jest.fn().mockResolvedValue(contracts) });
};

describe("checkContractsExpiringService (Roadmap B4)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("role PHONG_VAT_TU_TTB không tồn tại → bỏ qua, KHÔNG chạm Contract", async () => {
    mockedRole.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });

    const result = await checkContractsExpiringService();

    expect(result).toEqual({ checked: 0, notified: 0 });
    expect(mockedContract.find).not.toHaveBeenCalled();
  });

  it("role tồn tại nhưng KHÔNG có user active nào → bỏ qua", async () => {
    mockedRole.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue({ _id: "role-1" }) });
    mockedUser.countDocuments.mockResolvedValue(0);

    const result = await checkContractsExpiringService();

    expect(result).toEqual({ checked: 0, notified: 0 });
  });

  it("có recipient hợp lệ, có hợp đồng sắp hết hạn → gửi thông báo, đánh dấu expiryAlertSentAt", async () => {
    mockedRole.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue({ _id: "role-1" }) });
    mockedUser.countDocuments.mockResolvedValue(1);
    const contract = makeExpiringContract();
    mockFindReturns([contract]);

    const result = await checkContractsExpiringService();

    expect(mockedNotify).toHaveBeenCalledWith("PHONG_VAT_TU_TTB", expect.objectContaining({ type: "CONTRACT_EXPIRING" }));
    expect(contract.expiryAlertSentAt).toBeInstanceOf(Date);
    expect(contract.save).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ checked: 1, notified: 1 });
  });

  it("filter find() chỉ lấy hợp đồng ACTIVE, CHƯA gửi cảnh báo, hết hạn trong ngưỡng", async () => {
    mockedRole.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue({ _id: "role-1" }) });
    mockedUser.countDocuments.mockResolvedValue(1);
    mockFindReturns([]);

    await checkContractsExpiringService();

    const filterArg = mockedContract.find.mock.calls[0][0];
    expect(filterArg.status).toBe("active");
    expect(filterArg.expiryAlertSentAt).toBeNull();
    expect(filterArg.endDate.$lte).toBeInstanceOf(Date);
  });
});

describe("runContractAlertsService (Roadmap B4)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("gói kết quả checkContractsExpiringService vào { expiring }", async () => {
    mockedRole.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });

    const result = await runContractAlertsService();

    expect(result).toEqual({ expiring: { checked: 0, notified: 0 } });
  });
});

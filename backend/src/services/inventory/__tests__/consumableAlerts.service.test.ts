// (Roadmap B3 — Quản lý vật tư tiêu hao, 2026-09-15) Regression test cho
// `consumableAlerts.service.ts`. Mock Model + notification helpers — không
// dùng DB thật, cùng pattern `workflowSlaAlerts.service.test.ts`.
jest.mock("../../../models/inventory/consumableItem.model", () => ({
  ConsumableItem: { find: jest.fn() },
}));
jest.mock("../../../models/rbac/role.model", () => ({
  Role: { findOne: jest.fn() },
}));
jest.mock("../../../models/users/user.model", () => ({
  User: { countDocuments: jest.fn() },
}));
jest.mock("../../notifications/notification.service", () => ({
  notifyUsersByRoleName: jest.fn().mockResolvedValue(undefined),
  notifyUsersByDepartment: jest.fn().mockResolvedValue(undefined),
}));

import { ConsumableItem } from "../../../models/inventory/consumableItem.model";
import { Role } from "../../../models/rbac/role.model";
import { User } from "../../../models/users/user.model";
import {
  notifyUsersByRoleName,
  notifyUsersByDepartment,
} from "../../notifications/notification.service";
import { checkLowStockService, runConsumableAlertsService } from "../consumableAlerts.service";

const mockedItem = ConsumableItem as any;
const mockedRole = Role as any;
const mockedUser = User as any;
const mockedNotifyByRole = notifyUsersByRoleName as jest.Mock;
const mockedNotifyByDept = notifyUsersByDepartment as jest.Mock;

const makeLowStockItem = (overrides: any = {}) => ({
  _id: "item-1",
  name: "Khẩu trang y tế",
  unit: "hộp",
  department: { _id: "dept-1", name: "Khoa Nội" },
  quantityOnHand: 2,
  minStockThreshold: 5,
  lowStockAlertSentAt: null,
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const mockFindReturns = (items: any[]) => {
  mockedItem.find.mockReturnValue({ populate: jest.fn().mockResolvedValue(items) });
};

describe("checkLowStockService (Roadmap B3)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("role PHONG_VAT_TU_TTB không tồn tại → bỏ qua, KHÔNG chạm ConsumableItem", async () => {
    mockedRole.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });

    const result = await checkLowStockService();

    expect(result).toEqual({ checked: 0, notified: 0 });
    expect(mockedItem.find).not.toHaveBeenCalled();
  });

  it("role tồn tại nhưng KHÔNG có user active nào → bỏ qua", async () => {
    mockedRole.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue({ _id: "role-1" }) });
    mockedUser.countDocuments.mockResolvedValue(0);

    const result = await checkLowStockService();

    expect(result).toEqual({ checked: 0, notified: 0 });
    expect(mockedItem.find).not.toHaveBeenCalled();
  });

  it("có recipient hợp lệ, có item tồn kho thấp → gửi cả 2 kênh, đánh dấu lowStockAlertSentAt", async () => {
    mockedRole.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue({ _id: "role-1" }) });
    mockedUser.countDocuments.mockResolvedValue(2);
    const item = makeLowStockItem();
    mockFindReturns([item]);

    const result = await checkLowStockService();

    expect(mockedNotifyByRole).toHaveBeenCalledWith(
      "PHONG_VAT_TU_TTB",
      expect.objectContaining({ type: "CONSUMABLE_LOW_STOCK" }),
    );
    expect(mockedNotifyByDept).toHaveBeenCalledWith("dept-1", expect.objectContaining({ type: "CONSUMABLE_LOW_STOCK" }));
    expect(item.lowStockAlertSentAt).toBeInstanceOf(Date);
    expect(item.save).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ checked: 1, notified: 1 });
  });

  it("filter find() chỉ lấy item ĐANG active, CHƯA gửi cảnh báo, tồn ≤ ngưỡng", async () => {
    mockedRole.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue({ _id: "role-1" }) });
    mockedUser.countDocuments.mockResolvedValue(1);
    mockFindReturns([]);

    await checkLowStockService();

    const filterArg = mockedItem.find.mock.calls[0][0];
    expect(filterArg.isActive).toBe(true);
    expect(filterArg.lowStockAlertSentAt).toBeNull();
    expect(filterArg.$expr).toEqual({ $lte: ["$quantityOnHand", "$minStockThreshold"] });
  });
});

describe("runConsumableAlertsService (Roadmap B3)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("gói kết quả checkLowStockService vào { lowStock }", async () => {
    mockedRole.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });

    const result = await runConsumableAlertsService();

    expect(result).toEqual({ lowStock: { checked: 0, notified: 0 } });
  });
});

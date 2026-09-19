// (Roadmap B3 — Quản lý vật tư tiêu hao, 2026-09-15) Regression test cho
// `consumableItem.service.ts`. Mock Model + `withTransaction` — không dùng
// DB thật, cùng pattern `calibrationRecord.service.test.ts`/
// `assetMaintenancePlan.service.test.ts`.
jest.mock("../../../models/departments/department.model", () => ({
  __esModule: true,
  default: { findById: jest.fn() },
}));
jest.mock("../../../models/inventory/consumableItem.model", () => ({
  ConsumableItem: {
    findOne: jest.fn(),
    create: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
    findById: jest.fn(),
  },
}));
jest.mock("../../../models/inventory/consumableCategory.model", () => ({
  ConsumableCategory: { findOne: jest.fn() },
}));
jest.mock("../../../models/inventory/consumableTransaction.model", () => ({
  ConsumableTransaction: {
    create: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
  },
}));
jest.mock("../../../shared/utils/withTransaction");

import Department from "../../../models/departments/department.model";
import { ConsumableItem } from "../../../models/inventory/consumableItem.model";
import { ConsumableCategory } from "../../../models/inventory/consumableCategory.model";
import { ConsumableTransaction } from "../../../models/inventory/consumableTransaction.model";
import { ConsumableTransactionType } from "../../../interfaces/inventory/consumableTransaction.interface";
import { withTransaction } from "../../../shared/utils/withTransaction";
import {
  createConsumableItemService,
  getAllConsumableItemsService,
  getConsumableItemByIdService,
  updateConsumableItemService,
  bulkDeleteConsumableItemService,
  bulkRestoreConsumableItemService,
  createConsumableTransactionService,
  getConsumableTransactionsService,
} from "../consumableItem.service";

const mockedDepartment = Department as any;
const mockedItem = ConsumableItem as any;
const mockedCategory = ConsumableCategory as any;
const mockedTransaction = ConsumableTransaction as any;
const mockedWithTransaction = withTransaction as unknown as jest.Mock;

const CATEGORY_ID = "507f1f77bcf86cd799439099";

const DEPT_ID = "507f1f77bcf86cd799439001";
const ITEM_ID = "507f1f77bcf86cd799439011";

const makeItemDoc = (overrides: any = {}) => {
  const doc: any = {
    _id: ITEM_ID,
    name: "Khẩu trang y tế",
    unit: "hộp",
    department: DEPT_ID,
    quantityOnHand: 10,
    minStockThreshold: 5,
    lowStockAlertSentAt: null,
    isActive: true,
    save: jest.fn().mockResolvedValue(undefined),
    toObject() {
      const { save, populate, toObject, ...rest } = doc;
      return rest;
    },
    ...overrides,
  };
  // Cùng lý do đã ghi ở `assetMaintenancePlan.service.test.ts`: `.populate()`
  // thật resolve về CHÍNH document, không phải undefined.
  doc.populate = jest.fn().mockResolvedValue(doc);
  return doc;
};

describe("createConsumableItemService (Roadmap B3)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedWithTransaction.mockImplementation(async (fn: any) => fn("fake-session"));
  });

  it("phòng ban không tồn tại → 404, không chạm ConsumableItem", async () => {
    mockedDepartment.findById.mockResolvedValue(null);

    await expect(
      createConsumableItemService({ department: DEPT_ID, name: "A", unit: "cái" }),
    ).rejects.toMatchObject({ status: 404 });
    expect(mockedItem.findOne).not.toHaveBeenCalled();
  });

  it("trùng tên vật tư trong CÙNG phòng ban → 409", async () => {
    mockedDepartment.findById.mockResolvedValue({ _id: DEPT_ID, name: "Khoa Nội" });
    mockedItem.findOne.mockResolvedValue(makeItemDoc());

    await expect(
      createConsumableItemService({ department: DEPT_ID, name: "Khẩu trang y tế", unit: "hộp" }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("category không tồn tại/không active → 400, không tạo item", async () => {
    mockedDepartment.findById.mockResolvedValue({ _id: DEPT_ID, name: "Khoa Nội" });
    mockedCategory.findOne.mockResolvedValue(null);

    await expect(
      createConsumableItemService({ department: DEPT_ID, name: "A", unit: "cái", category: CATEGORY_ID }),
    ).rejects.toMatchObject({ status: 400 });
    expect(mockedItem.create).not.toHaveBeenCalled();
  });

  it("thành công, KHÔNG có initialQuantity → tạo item, KHÔNG tạo giao dịch", async () => {
    mockedDepartment.findById.mockResolvedValue({ _id: DEPT_ID, name: "Khoa Nội" });
    mockedItem.findOne.mockResolvedValue(null);
    const itemDoc = makeItemDoc({ quantityOnHand: 0, minStockThreshold: 5 });
    mockedItem.create.mockResolvedValue([itemDoc]);

    await createConsumableItemService(
      { department: DEPT_ID, name: "Khẩu trang y tế", unit: "hộp", minStockThreshold: 5, initialQuantity: 0 },
      "user-1",
    );

    expect(mockedItem.create).toHaveBeenCalledWith(
      [expect.objectContaining({ quantityOnHand: 0, createdBy: "user-1" })],
      { session: "fake-session" },
    );
    expect(mockedTransaction.create).not.toHaveBeenCalled();
  });

  it("thành công, CÓ initialQuantity > 0 → tạo item + 1 giao dịch NHẬP kèm theo", async () => {
    mockedDepartment.findById.mockResolvedValue({ _id: DEPT_ID, name: "Khoa Nội" });
    mockedItem.findOne.mockResolvedValue(null);
    const itemDoc = makeItemDoc({ quantityOnHand: 20 });
    mockedItem.create.mockResolvedValue([itemDoc]);
    mockedTransaction.create.mockResolvedValue([{ _id: "txn-1" }]);

    await createConsumableItemService(
      { department: DEPT_ID, name: "Khẩu trang y tế", unit: "hộp", initialQuantity: 20 },
      "user-1",
    );

    expect(mockedTransaction.create).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          consumableItem: ITEM_ID,
          type: ConsumableTransactionType.IN,
          quantity: 20,
          balanceAfter: 20,
        }),
      ],
      { session: "fake-session" },
    );
  });
});

describe("getAllConsumableItemsService (Roadmap B3)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("mặc định chỉ lấy isActive=true, gắn isLowStock cho từng item", async () => {
    const lowStockItem = makeItemDoc({ quantityOnHand: 2, minStockThreshold: 5 });
    const query: any = {
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([lowStockItem]),
    };
    mockedItem.find.mockReturnValue(query);
    mockedItem.countDocuments.mockResolvedValue(1);

    const result = await getAllConsumableItemsService({});

    expect(mockedItem.find).toHaveBeenCalledWith(expect.objectContaining({ isActive: true }));
    expect(result.data[0].isLowStock).toBe(true);
  });

  it("lowStockOnly=true → filter dùng $expr so sánh 2 field", async () => {
    const query: any = {
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([]),
    };
    mockedItem.find.mockReturnValue(query);
    mockedItem.countDocuments.mockResolvedValue(0);

    await getAllConsumableItemsService({ lowStockOnly: true });

    const filterArg = mockedItem.find.mock.calls[0][0];
    expect(filterArg.$expr).toEqual({ $lte: ["$quantityOnHand", "$minStockThreshold"] });
  });
});

describe("getConsumableItemByIdService (Roadmap B3)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("ID không hợp lệ → 400", async () => {
    await expect(getConsumableItemByIdService("bad-id")).rejects.toMatchObject({ status: 400 });
  });

  it("không tìm thấy → 404", async () => {
    mockedItem.findById.mockResolvedValue(null);
    await expect(getConsumableItemByIdService(ITEM_ID)).rejects.toMatchObject({ status: 404 });
  });
});

describe("updateConsumableItemService (Roadmap B3)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("đổi tên trùng với vật tư khác CÙNG phòng ban → 409", async () => {
    const itemDoc = makeItemDoc();
    mockedItem.findById.mockResolvedValue(itemDoc);
    mockedItem.findOne.mockResolvedValue(makeItemDoc({ _id: "other-item" }));

    await expect(
      updateConsumableItemService(ITEM_ID, { name: "Tên trùng" }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("đổi minStockThreshold → reset lowStockAlertSentAt về null", async () => {
    const itemDoc = makeItemDoc({ minStockThreshold: 5, lowStockAlertSentAt: new Date() });
    mockedItem.findById.mockResolvedValue(itemDoc);

    await updateConsumableItemService(ITEM_ID, { minStockThreshold: 10 }, "user-2");

    expect(itemDoc.minStockThreshold).toBe(10);
    expect(itemDoc.lowStockAlertSentAt).toBeNull();
    expect(itemDoc.updatedBy).toBe("user-2");
  });

  it("đổi category sang nhóm không tồn tại/không active → 400", async () => {
    const itemDoc = makeItemDoc();
    mockedItem.findById.mockResolvedValue(itemDoc);
    mockedCategory.findOne.mockResolvedValue(null);

    await expect(
      updateConsumableItemService(ITEM_ID, { category: CATEGORY_ID }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("KHÔNG đổi minStockThreshold → KHÔNG đụng lowStockAlertSentAt", async () => {
    const sentAt = new Date();
    const itemDoc = makeItemDoc({ minStockThreshold: 5, lowStockAlertSentAt: sentAt });
    mockedItem.findById.mockResolvedValue(itemDoc);

    await updateConsumableItemService(ITEM_ID, { unit: "thùng" }, "user-2");

    expect(itemDoc.lowStockAlertSentAt).toBe(sentAt);
  });
});

describe("bulkDeleteConsumableItemService (DEV-060)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("gọi updateConsumableItemService({isActive:false}) cho từng id, 1 id không tồn tại → tách vào failed", async () => {
    const itemDoc = makeItemDoc();
    mockedItem.findById.mockImplementation((id: string) => (id === ITEM_ID ? Promise.resolve(itemDoc) : Promise.resolve(null)));

    const result = await bulkDeleteConsumableItemService([ITEM_ID, "507f1f77bcf86cd799439098"], "user-3");

    expect(itemDoc.isActive).toBe(false);
    expect(result.deletedIds).toEqual([ITEM_ID]);
    expect(result.failed).toEqual([{ id: "507f1f77bcf86cd799439098", message: "Không tìm thấy vật tư" }]);
  });
});

describe("bulkRestoreConsumableItemService (DEV-062)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("gọi updateConsumableItemService({isActive:true}) cho từng id, 1 id không tồn tại → tách vào failed", async () => {
    const itemDoc = makeItemDoc({ isActive: false });
    mockedItem.findById.mockImplementation((id: string) => (id === ITEM_ID ? Promise.resolve(itemDoc) : Promise.resolve(null)));

    const result = await bulkRestoreConsumableItemService([ITEM_ID, "507f1f77bcf86cd799439098"], "user-3");

    expect(itemDoc.isActive).toBe(true);
    expect(result.deletedIds).toEqual([ITEM_ID]);
    expect(result.failed).toEqual([{ id: "507f1f77bcf86cd799439098", message: "Không tìm thấy vật tư" }]);
  });
});

describe("createConsumableTransactionService (Roadmap B3)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedWithTransaction.mockImplementation(async (fn: any) => fn("fake-session"));
  });

  it("ID vật tư không hợp lệ → 400, không mở transaction", async () => {
    await expect(
      createConsumableTransactionService("bad-id", { type: ConsumableTransactionType.IN, quantity: 1 }),
    ).rejects.toMatchObject({ status: 400 });
    expect(mockedWithTransaction).not.toHaveBeenCalled();
  });

  it("không tìm thấy vật tư → 404", async () => {
    mockedItem.findById.mockReturnValue({ session: jest.fn().mockResolvedValue(null) });

    await expect(
      createConsumableTransactionService(ITEM_ID, { type: ConsumableTransactionType.IN, quantity: 1 }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("vật tư đã ngừng theo dõi (isActive=false) → 400", async () => {
    mockedItem.findById.mockReturnValue({
      session: jest.fn().mockResolvedValue(makeItemDoc({ isActive: false })),
    });

    await expect(
      createConsumableTransactionService(ITEM_ID, { type: ConsumableTransactionType.IN, quantity: 1 }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("XUẤT vượt quá tồn kho hiện có → 400, không tạo giao dịch", async () => {
    mockedItem.findById.mockReturnValue({
      session: jest.fn().mockResolvedValue(makeItemDoc({ quantityOnHand: 5 })),
    });

    await expect(
      createConsumableTransactionService(ITEM_ID, { type: ConsumableTransactionType.OUT, quantity: 10 }),
    ).rejects.toMatchObject({ status: 400 });
    expect(mockedTransaction.create).not.toHaveBeenCalled();
  });

  it("NHẬP thành công → tăng quantityOnHand, tạo giao dịch với balanceAfter đúng", async () => {
    const itemDoc = makeItemDoc({ quantityOnHand: 5, minStockThreshold: 3 });
    mockedItem.findById.mockReturnValue({ session: jest.fn().mockResolvedValue(itemDoc) });
    mockedTransaction.create.mockResolvedValue([
      { _id: "txn-1", populate: jest.fn().mockResolvedValue({ _id: "txn-1" }) },
    ]);

    await createConsumableTransactionService(
      ITEM_ID,
      { type: ConsumableTransactionType.IN, quantity: 20, reason: "Nhập từ NCC" },
      "user-3",
    );

    expect(itemDoc.quantityOnHand).toBe(25);
    expect(itemDoc.save).toHaveBeenCalledWith({ session: "fake-session" });
    expect(mockedTransaction.create).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          consumableItem: ITEM_ID,
          type: ConsumableTransactionType.IN,
          quantity: 20,
          balanceAfter: 25,
          reason: "Nhập từ NCC",
          performedBy: "user-3",
        }),
      ],
      { session: "fake-session" },
    );
  });

  it("NHẬP vượt lại ngưỡng cảnh báo → reset lowStockAlertSentAt về null", async () => {
    const itemDoc = makeItemDoc({ quantityOnHand: 2, minStockThreshold: 5, lowStockAlertSentAt: new Date() });
    mockedItem.findById.mockReturnValue({ session: jest.fn().mockResolvedValue(itemDoc) });
    mockedTransaction.create.mockResolvedValue([{ _id: "txn-1", populate: jest.fn().mockResolvedValue({}) }]);

    await createConsumableTransactionService(ITEM_ID, { type: ConsumableTransactionType.IN, quantity: 10 });

    expect(itemDoc.quantityOnHand).toBe(12);
    expect(itemDoc.lowStockAlertSentAt).toBeNull();
  });

  it("XUẤT thành công (đủ tồn) → giảm quantityOnHand đúng", async () => {
    const itemDoc = makeItemDoc({ quantityOnHand: 10 });
    mockedItem.findById.mockReturnValue({ session: jest.fn().mockResolvedValue(itemDoc) });
    mockedTransaction.create.mockResolvedValue([{ _id: "txn-1", populate: jest.fn().mockResolvedValue({}) }]);

    await createConsumableTransactionService(ITEM_ID, { type: ConsumableTransactionType.OUT, quantity: 4 });

    expect(itemDoc.quantityOnHand).toBe(6);
  });
});

describe("getConsumableTransactionsService (Roadmap B3)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("ID vật tư không hợp lệ → 400", async () => {
    await expect(getConsumableTransactionsService("bad-id", {})).rejects.toMatchObject({ status: 400 });
  });

  it("vật tư không tồn tại → 404", async () => {
    mockedItem.findById.mockResolvedValue(null);
    await expect(getConsumableTransactionsService(ITEM_ID, {})).rejects.toMatchObject({ status: 404 });
  });

  it("trả về danh sách giao dịch phân trang, mới nhất trước", async () => {
    mockedItem.findById.mockResolvedValue(makeItemDoc());
    const query: any = {
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([{ _id: "txn-1" }]),
    };
    mockedTransaction.find.mockReturnValue(query);
    mockedTransaction.countDocuments.mockResolvedValue(1);

    const result = await getConsumableTransactionsService(ITEM_ID, { page: 1, limit: 20 });

    expect(query.sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(result.pagination.total).toBe(1);
  });
});

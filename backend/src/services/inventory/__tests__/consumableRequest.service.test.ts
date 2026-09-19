// Roadmap B8 (Dự trù/đề xuất mua vật tư tiêu hao hàng tháng, DEV-067,
// 2026-09-18) — Regression test cho `consumableRequest.service.ts`. Mock
// Model — không dùng DB thật, cùng pattern `consumableItem.service.test.ts`.
jest.mock("../../../models/departments/department.model", () => ({
  __esModule: true,
  default: { findById: jest.fn() },
}));
jest.mock("../../../models/inventory/consumableItem.model", () => ({
  ConsumableItem: { find: jest.fn() },
}));
jest.mock("../../../models/inventory/consumableRequest.model", () => ({
  ConsumableRequest: {
    create: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
    findById: jest.fn(),
  },
}));

import Department from "../../../models/departments/department.model";
import { ConsumableItem } from "../../../models/inventory/consumableItem.model";
import { ConsumableRequest } from "../../../models/inventory/consumableRequest.model";
import { ConsumableRequestStatus } from "../../../interfaces/inventory/consumableRequest.interface";
import {
  createConsumableRequestService,
  getConsumableRequestByIdService,
  updateConsumableRequestService,
  fulfillConsumableRequestService,
  cancelConsumableRequestService,
} from "../consumableRequest.service";

const mockedDepartment = Department as any;
const mockedItem = ConsumableItem as any;
const mockedRequest = ConsumableRequest as any;

const DEPT_ID = "507f1f77bcf86cd799439001";
const OTHER_DEPT_ID = "507f1f77bcf86cd799439002";
const ITEM_ID = "507f1f77bcf86cd799439011";
const REQUEST_ID = "507f1f77bcf86cd799439021";

const makeConsumableItemDoc = (overrides: any = {}) => ({
  _id: ITEM_ID,
  name: "Khẩu trang y tế",
  unit: "hộp",
  department: DEPT_ID,
  isActive: true,
  ...overrides,
});

/** Cùng lý do `consumableItem.service.test.ts`: `.populate()` thật resolve về CHÍNH document. */
const makeRequestDoc = (overrides: any = {}) => {
  const doc: any = {
    _id: REQUEST_ID,
    department: DEPT_ID,
    requestMonth: "2026-10",
    items: [{ consumableItem: ITEM_ID, quantity: 10, unitPrice: 5000, totalPrice: 50000 }],
    totalAmount: 50000,
    status: ConsumableRequestStatus.PENDING,
    save: jest.fn().mockResolvedValue(undefined),
    toObject() {
      const { save, populate, toObject, ...rest } = doc;
      return rest;
    },
    ...overrides,
  };
  doc.populate = jest.fn().mockResolvedValue(doc);
  return doc;
};

describe("createConsumableRequestService (Roadmap B8)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("phòng ban không tồn tại → 404, không chạm ConsumableItem/ConsumableRequest", async () => {
    mockedDepartment.findById.mockResolvedValue(null);

    await expect(
      createConsumableRequestService({
        department: DEPT_ID,
        requestMonth: "2026-10",
        items: [{ consumableItem: ITEM_ID, quantity: 10, unitPrice: 5000 }],
      }),
    ).rejects.toMatchObject({ status: 404 });
    expect(mockedItem.find).not.toHaveBeenCalled();
    expect(mockedRequest.create).not.toHaveBeenCalled();
  });

  it("vật tư trong đề xuất không tồn tại → 404", async () => {
    mockedDepartment.findById.mockResolvedValue({ _id: DEPT_ID, name: "Khoa Nội" });
    mockedItem.find.mockResolvedValue([]); // không tìm thấy item nào

    await expect(
      createConsumableRequestService({
        department: DEPT_ID,
        requestMonth: "2026-10",
        items: [{ consumableItem: ITEM_ID, quantity: 10, unitPrice: 5000 }],
      }),
    ).rejects.toMatchObject({ status: 404 });
    expect(mockedRequest.create).not.toHaveBeenCalled();
  });

  it("vật tư đã ngừng theo dõi (isActive=false) → 400", async () => {
    mockedDepartment.findById.mockResolvedValue({ _id: DEPT_ID, name: "Khoa Nội" });
    mockedItem.find.mockResolvedValue([makeConsumableItemDoc({ isActive: false })]);

    await expect(
      createConsumableRequestService({
        department: DEPT_ID,
        requestMonth: "2026-10",
        items: [{ consumableItem: ITEM_ID, quantity: 10, unitPrice: 5000 }],
      }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("vật tư thuộc phòng ban KHÁC với phòng ban đang đề xuất → 400", async () => {
    mockedDepartment.findById.mockResolvedValue({ _id: OTHER_DEPT_ID, name: "Khoa Ngoại" });
    mockedItem.find.mockResolvedValue([makeConsumableItemDoc({ department: DEPT_ID })]);

    await expect(
      createConsumableRequestService({
        department: OTHER_DEPT_ID,
        requestMonth: "2026-10",
        items: [{ consumableItem: ITEM_ID, quantity: 10, unitPrice: 5000 }],
      }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("tạo thành công: tính đúng totalPrice từng dòng + totalAmount toàn bộ, status mặc định PENDING", async () => {
    mockedDepartment.findById.mockResolvedValue({ _id: DEPT_ID, name: "Khoa Nội" });
    mockedItem.find.mockResolvedValue([
      makeConsumableItemDoc({ _id: ITEM_ID, department: DEPT_ID }),
      makeConsumableItemDoc({ _id: "507f1f77bcf86cd799439012", department: DEPT_ID, name: "Găng tay" }),
    ]);
    mockedRequest.create.mockResolvedValue(makeRequestDoc());

    await createConsumableRequestService({
      department: DEPT_ID,
      requestMonth: "2026-10",
      items: [
        { consumableItem: ITEM_ID, quantity: 10, unitPrice: 5000 },
        { consumableItem: "507f1f77bcf86cd799439012", quantity: 4, unitPrice: 2500 },
      ],
    }, "user-1");

    expect(mockedRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        department: DEPT_ID,
        requestMonth: "2026-10",
        status: ConsumableRequestStatus.PENDING,
        totalAmount: 60000, // 10*5000 + 4*2500
        items: [
          { consumableItem: ITEM_ID, quantity: 10, unitPrice: 5000, totalPrice: 50000 },
          { consumableItem: "507f1f77bcf86cd799439012", quantity: 4, unitPrice: 2500, totalPrice: 10000 },
        ],
        createdBy: "user-1",
      }),
    );
  });
});

describe("getConsumableRequestByIdService (Roadmap B8)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("không tìm thấy → 404", async () => {
    mockedRequest.findById.mockResolvedValue(null);
    await expect(getConsumableRequestByIdService(REQUEST_ID)).rejects.toMatchObject({ status: 404 });
  });

  it("ID không hợp lệ → 400, không gọi findById", async () => {
    await expect(getConsumableRequestByIdService("not-an-id")).rejects.toMatchObject({ status: 400 });
    expect(mockedRequest.findById).not.toHaveBeenCalled();
  });
});

describe("updateConsumableRequestService (Roadmap B8)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("đề xuất KHÔNG ở trạng thái PENDING → 400, không cho sửa", async () => {
    mockedRequest.findById.mockResolvedValue(makeRequestDoc({ status: ConsumableRequestStatus.FULFILLED }));

    await expect(updateConsumableRequestService(REQUEST_ID, { note: "sửa" }, "user-1")).rejects.toMatchObject({
      status: 400,
    });
  });

  it("đang PENDING, đổi items: tính lại totalAmount đúng theo items MỚI", async () => {
    const doc = makeRequestDoc();
    mockedRequest.findById.mockResolvedValue(doc);
    mockedItem.find.mockResolvedValue([makeConsumableItemDoc({ _id: ITEM_ID, department: DEPT_ID })]);

    await updateConsumableRequestService(
      REQUEST_ID,
      { items: [{ consumableItem: ITEM_ID, quantity: 20, unitPrice: 5000 }] },
      "user-1",
    );

    expect(doc.totalAmount).toBe(100000);
    expect(doc.items).toEqual([{ consumableItem: ITEM_ID, quantity: 20, unitPrice: 5000, totalPrice: 100000 }]);
    expect(doc.save).toHaveBeenCalled();
  });
});

describe("fulfillConsumableRequestService (Roadmap B8)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("đề xuất KHÔNG ở trạng thái PENDING → 400", async () => {
    mockedRequest.findById.mockResolvedValue(makeRequestDoc({ status: ConsumableRequestStatus.CANCELLED }));
    await expect(fulfillConsumableRequestService(REQUEST_ID, "user-1")).rejects.toMatchObject({ status: 400 });
  });

  it("đang PENDING → chuyển sang FULFILLED", async () => {
    const doc = makeRequestDoc();
    mockedRequest.findById.mockResolvedValue(doc);

    await fulfillConsumableRequestService(REQUEST_ID, "user-1");

    expect(doc.status).toBe(ConsumableRequestStatus.FULFILLED);
    expect(doc.save).toHaveBeenCalled();
  });
});

describe("cancelConsumableRequestService (Roadmap B8)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("đề xuất KHÔNG ở trạng thái PENDING → 400", async () => {
    mockedRequest.findById.mockResolvedValue(makeRequestDoc({ status: ConsumableRequestStatus.FULFILLED }));
    await expect(cancelConsumableRequestService(REQUEST_ID, "user-1")).rejects.toMatchObject({ status: 400 });
  });

  it("đang PENDING → chuyển sang CANCELLED", async () => {
    const doc = makeRequestDoc();
    mockedRequest.findById.mockResolvedValue(doc);

    await cancelConsumableRequestService(REQUEST_ID, "user-1");

    expect(doc.status).toBe(ConsumableRequestStatus.CANCELLED);
    expect(doc.save).toHaveBeenCalled();
  });
});

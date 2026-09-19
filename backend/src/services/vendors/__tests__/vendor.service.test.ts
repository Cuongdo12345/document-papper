// (Roadmap B4 — Quản lý nhà cung cấp & hợp đồng bảo trì, 2026-09-16)
// Regression test cho `vendor.service.ts`. Mock Model — không dùng DB thật,
// cùng pattern `assetMaintenancePlan.service.test.ts`.
jest.mock("../../../models/vendors/vendor.model", () => ({
  Vendor: {
    create: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
    findById: jest.fn(),
  },
}));

import { Vendor } from "../../../models/vendors/vendor.model";
import {
  createVendorService,
  getAllVendorsService,
  getVendorByIdService,
  updateVendorService,
  bulkDeleteVendorService,
  bulkRestoreVendorService,
} from "../vendor.service";

const mockedVendor = Vendor as any;
const VENDOR_ID = "507f1f77bcf86cd799439011";

const makeVendorDoc = (overrides: any = {}) => ({
  _id: VENDOR_ID,
  name: "Công ty ABC",
  isActive: true,
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe("createVendorService (Roadmap B4)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("tạo thành công, email rỗng được chuyển thành undefined", async () => {
    mockedVendor.create.mockResolvedValue(makeVendorDoc());

    await createVendorService({ name: "Công ty ABC", email: "" }, "user-1");

    expect(mockedVendor.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Công ty ABC", email: undefined, createdBy: "user-1" }),
    );
  });
});

describe("getAllVendorsService (Roadmap B4)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("mặc định chỉ lấy isActive=true", async () => {
    const query: any = { sort: jest.fn().mockReturnThis(), skip: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue([]) };
    mockedVendor.find.mockReturnValue(query);
    mockedVendor.countDocuments.mockResolvedValue(0);

    await getAllVendorsService({});

    expect(mockedVendor.find).toHaveBeenCalledWith(expect.objectContaining({ isActive: true }));
  });
});

describe("getVendorByIdService (Roadmap B4)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("ID không hợp lệ → 400", async () => {
    await expect(getVendorByIdService("bad-id")).rejects.toMatchObject({ status: 400 });
  });

  it("không tìm thấy → 404", async () => {
    mockedVendor.findById.mockResolvedValue(null);
    await expect(getVendorByIdService(VENDOR_ID)).rejects.toMatchObject({ status: 404 });
  });
});

describe("updateVendorService (Roadmap B4)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("sửa field + isActive, gọi save", async () => {
    const vendorDoc = makeVendorDoc();
    mockedVendor.findById.mockResolvedValue(vendorDoc);

    await updateVendorService(VENDOR_ID, { name: "Tên mới", isActive: false }, "user-2");

    expect(vendorDoc.name).toBe("Tên mới");
    expect(vendorDoc.isActive).toBe(false);
    expect(vendorDoc.updatedBy).toBe("user-2");
    expect(vendorDoc.save).toHaveBeenCalledTimes(1);
  });
});

describe("bulkDeleteVendorService (DEV-060)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("set isActive=false cho từng vendor tìm thấy, báo lỗi cho id không tồn tại", async () => {
    const vendorDoc = makeVendorDoc();
    mockedVendor.findById.mockImplementation((id: string) => (id === VENDOR_ID ? Promise.resolve(vendorDoc) : Promise.resolve(null)));

    const result = await bulkDeleteVendorService([VENDOR_ID, "507f1f77bcf86cd799439099"], "user-3");

    expect(vendorDoc.isActive).toBe(false);
    expect(result.deletedIds).toEqual([VENDOR_ID]);
    expect(result.failed).toEqual([{ id: "507f1f77bcf86cd799439099", message: "Không tìm thấy nhà cung cấp" }]);
  });
});

describe("bulkRestoreVendorService (DEV-062)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("set isActive=true cho từng vendor tìm thấy, báo lỗi cho id không tồn tại", async () => {
    const vendorDoc = makeVendorDoc({ isActive: false });
    mockedVendor.findById.mockImplementation((id: string) => (id === VENDOR_ID ? Promise.resolve(vendorDoc) : Promise.resolve(null)));

    const result = await bulkRestoreVendorService([VENDOR_ID, "507f1f77bcf86cd799439099"], "user-3");

    expect(vendorDoc.isActive).toBe(true);
    expect(result.deletedIds).toEqual([VENDOR_ID]);
    expect(result.failed).toEqual([{ id: "507f1f77bcf86cd799439099", message: "Không tìm thấy nhà cung cấp" }]);
  });
});

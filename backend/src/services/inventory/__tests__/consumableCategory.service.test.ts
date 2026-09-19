// (Nhóm vật tư tiêu hao, 2026-09-16) Regression test cho
// `consumableCategory.service.ts`. Mock Model — không dùng DB thật, cùng
// pattern `contract.service.test.ts`.
jest.mock("../../../models/inventory/consumableCategory.model", () => ({
  ConsumableCategory: {
    findOne: jest.fn(),
    create: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
    findById: jest.fn(),
    findOneAndUpdate: jest.fn(),
    exists: jest.fn(),
  },
}));
jest.mock("../../../models/inventory/consumableItem.model", () => ({
  ConsumableItem: { exists: jest.fn() },
}));

import { ConsumableCategory } from "../../../models/inventory/consumableCategory.model";
import { ConsumableItem } from "../../../models/inventory/consumableItem.model";
import {
  createConsumableCategoryService,
  getAllConsumableCategoriesService,
  deleteConsumableCategoryService,
  bulkDeleteConsumableCategoryService,
  restoreConsumableCategoryService,
  bulkRestoreConsumableCategoryService,
  updateConsumableCategoryService,
} from "../consumableCategory.service";

const mockedCategory = ConsumableCategory as any;
const mockedItem = ConsumableItem as any;

const CATEGORY_ID = "507f1f77bcf86cd799439001";
const PARENT_ID = "507f1f77bcf86cd799439002";

describe("createConsumableCategoryService (Nhóm vật tư)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("code đã tồn tại (kể cả đã soft-delete) → 400", async () => {
    mockedCategory.findOne.mockResolvedValue({ _id: "other", code: "VPP" });

    await expect(createConsumableCategoryService({ code: "vpp", name: "Văn phòng phẩm" })).rejects.toMatchObject({
      status: 400,
    });
  });

  it("parentCategory không tồn tại/không active → 400", async () => {
    mockedCategory.findOne
      .mockResolvedValueOnce(null) // check trùng code
      .mockResolvedValueOnce(null); // check parent

    await expect(
      createConsumableCategoryService({ code: "VPP-GT", name: "Giấy tờ", parentCategory: PARENT_ID }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("thành công — tạo nhóm mới", async () => {
    mockedCategory.findOne.mockResolvedValueOnce(null);
    mockedCategory.create.mockResolvedValue({ _id: CATEGORY_ID, code: "VPP", name: "Văn phòng phẩm" });

    const result = await createConsumableCategoryService({ code: "VPP", name: "Văn phòng phẩm" });

    expect(mockedCategory.create).toHaveBeenCalledWith({ code: "VPP", name: "Văn phòng phẩm" });
    expect(result).toMatchObject({ code: "VPP" });
  });
});

describe("getAllConsumableCategoriesService (Nhóm vật tư)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("mặc định chỉ lấy isActive=true", async () => {
    const query: any = { populate: jest.fn().mockReturnThis(), sort: jest.fn().mockReturnThis(), skip: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue([]) };
    mockedCategory.find.mockReturnValue(query);
    mockedCategory.countDocuments.mockResolvedValue(0);

    await getAllConsumableCategoriesService({});

    expect(mockedCategory.find).toHaveBeenCalledWith(expect.objectContaining({ isActive: true }));
  });

  it("isActive=false → liệt kê nhóm đã xoá mềm", async () => {
    const query: any = { populate: jest.fn().mockReturnThis(), sort: jest.fn().mockReturnThis(), skip: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue([]) };
    mockedCategory.find.mockReturnValue(query);
    mockedCategory.countDocuments.mockResolvedValue(0);

    await getAllConsumableCategoriesService({ isActive: false });

    expect(mockedCategory.find).toHaveBeenCalledWith(expect.objectContaining({ isActive: false }));
  });
});

describe("updateConsumableCategoryService (Nhóm vật tư)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("đặt parentCategory là chính nó → 400", async () => {
    await expect(
      updateConsumableCategoryService(CATEGORY_ID, { parentCategory: CATEGORY_ID }),
    ).rejects.toMatchObject({ status: 400 });
  });
});

describe("deleteConsumableCategoryService (Nhóm vật tư)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("không tìm thấy → 404", async () => {
    mockedCategory.findOne.mockResolvedValue(null);
    await expect(deleteConsumableCategoryService(CATEGORY_ID)).rejects.toMatchObject({ status: 404 });
  });

  it("còn vật tư active thuộc nhóm → 400, không xoá", async () => {
    mockedCategory.findOne.mockResolvedValue({ _id: CATEGORY_ID, isActive: true });
    mockedItem.exists.mockResolvedValue(true);

    await expect(deleteConsumableCategoryService(CATEGORY_ID)).rejects.toMatchObject({ status: 400 });
  });

  it("còn nhóm con active → 400, không xoá", async () => {
    mockedCategory.findOne.mockResolvedValue({ _id: CATEGORY_ID, isActive: true });
    mockedItem.exists.mockResolvedValue(false);
    mockedCategory.exists.mockResolvedValue(true);

    await expect(deleteConsumableCategoryService(CATEGORY_ID)).rejects.toMatchObject({ status: 400 });
  });

  it("thành công — set isActive=false, ghi deletedAt/deletedBy", async () => {
    const categoryDoc: any = { _id: CATEGORY_ID, isActive: true, save: jest.fn().mockResolvedValue(undefined) };
    mockedCategory.findOne.mockResolvedValue(categoryDoc);
    mockedItem.exists.mockResolvedValue(false);
    mockedCategory.exists.mockResolvedValue(false);

    await deleteConsumableCategoryService(CATEGORY_ID, "user-1");

    expect(categoryDoc.isActive).toBe(false);
    expect(categoryDoc.deletedBy).toBe("user-1");
    expect(categoryDoc.deletedAt).toBeInstanceOf(Date);
  });
});

describe("bulkDeleteConsumableCategoryService (DEV-060)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("1 nhóm xoá được, 1 nhóm còn vật tư active → tách riêng thành công/thất bại", async () => {
    const categoryDoc: any = { _id: CATEGORY_ID, isActive: true, save: jest.fn().mockResolvedValue(undefined) };
    mockedCategory.findOne.mockImplementation((filter: any) =>
      filter._id === CATEGORY_ID ? Promise.resolve(categoryDoc) : Promise.resolve({ _id: PARENT_ID, isActive: true }),
    );
    mockedItem.exists.mockImplementation((filter: any) => Promise.resolve(filter.category === PARENT_ID));
    mockedCategory.exists.mockResolvedValue(false);

    const result = await bulkDeleteConsumableCategoryService([CATEGORY_ID, PARENT_ID], "user-1");

    expect(result.deletedIds).toEqual([CATEGORY_ID]);
    expect(result.failed).toEqual([{ id: PARENT_ID, message: "Không thể xoá nhóm vì vẫn còn vật tư thuộc nhóm này" }]);
  });
});

describe("restoreConsumableCategoryService (Nhóm vật tư)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("nhóm chưa bị xoá → 400", async () => {
    mockedCategory.findById.mockResolvedValue({ _id: CATEGORY_ID, isActive: true });
    await expect(restoreConsumableCategoryService(CATEGORY_ID)).rejects.toMatchObject({ status: 400 });
  });

  it("thành công — set isActive=true, xoá deletedAt/deletedBy", async () => {
    const categoryDoc: any = {
      _id: CATEGORY_ID,
      isActive: false,
      deletedAt: new Date(),
      deletedBy: "user-1",
      save: jest.fn().mockResolvedValue(undefined),
    };
    mockedCategory.findById.mockResolvedValue(categoryDoc);

    await restoreConsumableCategoryService(CATEGORY_ID);

    expect(categoryDoc.isActive).toBe(true);
    expect(categoryDoc.deletedAt).toBeUndefined();
    expect(categoryDoc.deletedBy).toBeUndefined();
  });
});

describe("bulkRestoreConsumableCategoryService (DEV-062)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("1 nhóm khôi phục được, 1 nhóm đang active (chưa bị xoá) → tách riêng thành công/thất bại", async () => {
    const deletedDoc: any = { _id: CATEGORY_ID, isActive: false, save: jest.fn().mockResolvedValue(undefined) };
    mockedCategory.findById.mockImplementation((id: string) =>
      id === CATEGORY_ID ? Promise.resolve(deletedDoc) : Promise.resolve({ _id: PARENT_ID, isActive: true }),
    );

    const result = await bulkRestoreConsumableCategoryService([CATEGORY_ID, PARENT_ID]);

    expect(deletedDoc.isActive).toBe(true);
    expect(result.deletedIds).toEqual([CATEGORY_ID]);
    expect(result.failed).toEqual([{ id: PARENT_ID, message: "Nhóm này chưa bị xoá" }]);
  });
});

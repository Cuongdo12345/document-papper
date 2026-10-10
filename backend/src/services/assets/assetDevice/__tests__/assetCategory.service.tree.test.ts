// (DEV-080 — Cây danh mục tài sản) Regression test cho các helper/quy tắc cây
// mới ở `assetCategory.service.ts`: lấy con cháu, chỉ gán tài sản vào danh mục
// lá, chống vòng lặp cha/con, chặn chọn cha đang chứa tài sản, gỡ cha (`null`).
jest.mock("../../../../models/assets/assetCategory.model", () => ({
  AssetCategory: {
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    findOneAndUpdate: jest.fn(),
    exists: jest.fn(),
  },
}));
jest.mock("../../../../models/assets/asset.model", () => ({
  Asset: { exists: jest.fn() },
}));

import { AssetCategory } from "../../../../models/assets/assetCategory.model";
import { Asset } from "../../../../models/assets/asset.model";
import {
  assertLeafCategory,
  createAssetCategoryService,
  getCategoryWithDescendantIds,
  updateAssetCategoryService,
} from "../assetCategory.service";

const mockedCategory = AssetCategory as any;
const mockedAsset = Asset as any;

// Cây mẫu 3 cấp: ROOT → GROUP → LEAF_A, LEAF_B; OTHER (gốc, tách biệt).
const ROOT = "507f1f77bcf86cd799439031";
const GROUP = "507f1f77bcf86cd799439032";
const LEAF_A = "507f1f77bcf86cd799439033";
const LEAF_B = "507f1f77bcf86cd799439034";
const OTHER = "507f1f77bcf86cd799439035";

// DEV-112: danh mục gốc mang loại tài sản; con kế thừa. MED là gốc nhánh y tế.
const MED = "507f1f77bcf86cd799439036";
const TREE: any[] = [
  { _id: ROOT, parentCategory: undefined, assetType: "IT" },
  { _id: GROUP, parentCategory: ROOT },
  { _id: LEAF_A, parentCategory: GROUP },
  { _id: LEAF_B, parentCategory: GROUP },
  { _id: OTHER, parentCategory: undefined, assetType: "IT" },
  { _id: MED, parentCategory: undefined, assetType: "MEDICAL" },
];

const chain = (value: any) => ({ select: () => ({ lean: () => Promise.resolve(value) }) });

beforeEach(() => {
  jest.clearAllMocks();
  mockedCategory.find.mockReturnValue(chain(TREE));
  mockedCategory.findById.mockImplementation((id: string) => chain(TREE.find((c) => c._id === String(id)) ?? null));
  mockedCategory.findOne.mockImplementation((filter: any) =>
    Promise.resolve(TREE.find((c) => c._id === String(filter._id)) ?? null),
  );
  mockedCategory.findOneAndUpdate.mockResolvedValue({ _id: LEAF_A });
  mockedAsset.exists.mockResolvedValue(null);
});

describe("getCategoryWithDescendantIds (DEV-080)", () => {
  it("danh mục gốc → gồm chính nó + toàn bộ con cháu qua mọi cấp, không lẫn nhánh khác", async () => {
    const ids = (await getCategoryWithDescendantIds(ROOT)).map(String);
    expect(ids.sort()).toEqual([ROOT, GROUP, LEAF_A, LEAF_B].sort());
  });

  it("danh mục lá → chỉ chính nó", async () => {
    const ids = (await getCategoryWithDescendantIds(LEAF_A)).map(String);
    expect(ids).toEqual([LEAF_A]);
  });
});

describe("assertLeafCategory (DEV-080)", () => {
  it("danh mục có con active → 400", async () => {
    mockedCategory.exists.mockResolvedValue({ _id: GROUP });
    await expect(assertLeafCategory(ROOT)).rejects.toMatchObject({ status: 400 });
  });

  it("danh mục lá → không throw", async () => {
    mockedCategory.exists.mockResolvedValue(null);
    await expect(assertLeafCategory(LEAF_A)).resolves.toBeUndefined();
  });
});

describe("updateAssetCategoryService — quy tắc cây (DEV-080)", () => {
  it("chọn chính con cháu của mình làm cha (ROOT → cha = LEAF_A) → 400 vòng lặp", async () => {
    await expect(updateAssetCategoryService(ROOT, { parentCategory: LEAF_A })).rejects.toMatchObject({
      status: 400,
      message: expect.stringContaining("con/cháu"),
    });
    expect(mockedCategory.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("chọn cha đang chứa tài sản trực tiếp → 400", async () => {
    mockedAsset.exists.mockResolvedValue({ _id: "asset-1" });
    await expect(updateAssetCategoryService(OTHER, { parentCategory: LEAF_A })).rejects.toMatchObject({
      status: 400,
      message: expect.stringContaining("chứa tài sản"),
    });
  });

  it("chọn cha hợp lệ (nhánh khác, không có tài sản) → cập nhật", async () => {
    await updateAssetCategoryService(OTHER, { parentCategory: GROUP });
    // DEV-112: thành danh mục con nên bỏ `assetType` (kế thừa từ gốc).
    expect(mockedCategory.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: OTHER, isActive: true },
      { parentCategory: GROUP, $unset: { assetType: "" } },
      { new: true },
    );
  });

  it("parentCategory = null + chọn loại → $unset cha, lưu loại cho gốc mới, không validate cha", async () => {
    // DEV-112: trở thành gốc thì phải có loại; cùng loại cũ nên không cần kiểm tài sản.
    await updateAssetCategoryService(LEAF_A, { parentCategory: null, assetType: "IT" });
    expect(mockedCategory.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: LEAF_A, isActive: true },
      { assetType: "IT", $unset: { parentCategory: "" } },
      { new: true },
    );
    expect(mockedAsset.exists).not.toHaveBeenCalled();
  });
});

describe("createAssetCategoryService — cha đang chứa tài sản (DEV-080)", () => {
  it("tạo danh mục con dưới 1 danh mục đang có tài sản → 400", async () => {
    mockedCategory.findOne.mockImplementation((filter: any) =>
      Promise.resolve(filter.code ? null : TREE.find((c) => c._id === String(filter._id)) ?? null),
    );
    mockedAsset.exists.mockResolvedValue({ _id: "asset-1" });
    await expect(
      createAssetCategoryService({ code: "NEW", name: "Mới", parentCategory: LEAF_A }),
    ).rejects.toMatchObject({ status: 400 });
  });
});

describe("Loại tài sản theo nhánh (DEV-112)", () => {
  it("tạo danh mục gốc KHÔNG chọn loại → 400", async () => {
    mockedCategory.findOne.mockResolvedValue(null);
    await expect(createAssetCategoryService({ code: "NEW_ROOT", name: "Gốc mới" })).rejects.toMatchObject({
      status: 400,
      message: expect.stringContaining("Danh mục gốc phải chọn loại"),
    });
  });

  it("tạo danh mục con mà vẫn gửi loại → 400 (con kế thừa loại của gốc)", async () => {
    mockedCategory.findOne.mockImplementation((filter: any) =>
      Promise.resolve(filter.code ? null : TREE.find((c) => c._id === String(filter._id)) ?? null),
    );
    await expect(
      createAssetCategoryService({ code: "NEW", name: "Mới", parentCategory: GROUP, assetType: "MEDICAL" as any }),
    ).rejects.toMatchObject({ status: 400, message: expect.stringContaining("kế thừa") });
  });

  it("gỡ cha (thành gốc) mà không chọn loại → 400", async () => {
    await expect(updateAssetCategoryService(LEAF_A, { parentCategory: null })).rejects.toMatchObject({
      status: 400,
      message: expect.stringContaining("Danh mục gốc phải chọn loại"),
    });
    expect(mockedCategory.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("chuyển nhánh CNTT sang nhánh y tế khi nhánh còn tài sản → 400", async () => {
    mockedAsset.exists.mockImplementation((filter: any) =>
      Promise.resolve(filter.category?.$in ? { _id: "asset-1" } : null),
    );
    await expect(updateAssetCategoryService(GROUP, { parentCategory: MED })).rejects.toMatchObject({
      status: 400,
      message: expect.stringContaining("còn tài sản"),
    });
    expect(mockedCategory.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("chuyển nhánh CNTT sang nhánh y tế khi nhánh KHÔNG có tài sản → cho phép", async () => {
    await updateAssetCategoryService(GROUP, { parentCategory: MED });
    expect(mockedCategory.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: GROUP, isActive: true },
      { parentCategory: MED, $unset: { assetType: "" } },
      { new: true },
    );
  });
});

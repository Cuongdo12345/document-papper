// (DEV-060 — Xoá mềm hàng loạt, 2026-09-16 / DEV-062 — Khôi phục hàng loạt,
// 2026-09-17) Regression test CHỈ cho `bulkDeleteAssetCategoryService`/
// `bulkRestoreAssetCategoryService` (mới thêm) — không backfill coverage cho
// các hàm khác của `assetCategory.service.ts` (ngoài scope 2 task này).
jest.mock("../../../../models/assets/assetCategory.model", () => ({
  AssetCategory: { findOne: jest.fn(), findById: jest.fn(), exists: jest.fn() },
}));
jest.mock("../../../../models/assets/asset.model", () => ({
  Asset: { exists: jest.fn() },
}));

import { AssetCategory } from "../../../../models/assets/assetCategory.model";
import { Asset } from "../../../../models/assets/asset.model";
import { bulkDeleteAssetCategoryService, bulkRestoreAssetCategoryService } from "../assetCategory.service";

const mockedCategory = AssetCategory as any;
const mockedAsset = Asset as any;

const CATEGORY_ID_1 = "507f1f77bcf86cd799439021";
const CATEGORY_ID_2 = "507f1f77bcf86cd799439022";

describe("bulkDeleteAssetCategoryService (DEV-060)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("xoá mềm được danh mục rỗng, chặn danh mục còn tài sản tham chiếu → tách riêng thành công/thất bại", async () => {
    const emptyDoc: any = { _id: CATEGORY_ID_1, isActive: true, save: jest.fn().mockResolvedValue(undefined) };
    const referencedDoc: any = { _id: CATEGORY_ID_2, isActive: true, save: jest.fn().mockResolvedValue(undefined) };

    mockedCategory.findOne.mockImplementation((filter: any) =>
      Promise.resolve(filter._id === CATEGORY_ID_1 ? emptyDoc : filter._id === CATEGORY_ID_2 ? referencedDoc : null),
    );
    mockedAsset.exists.mockImplementation((filter: any) => Promise.resolve(filter.category === CATEGORY_ID_2));
    mockedCategory.exists.mockResolvedValue(false);

    const result = await bulkDeleteAssetCategoryService([CATEGORY_ID_1, CATEGORY_ID_2], "user-1");

    expect(emptyDoc.isActive).toBe(false);
    expect(referencedDoc.isActive).toBe(true);
    expect(result.deletedIds).toEqual([CATEGORY_ID_1]);
    expect(result.failed).toEqual([
      { id: CATEGORY_ID_2, message: "Không thể xoá danh mục vì vẫn còn tài sản thuộc danh mục này" },
    ]);
  });
});

describe("bulkRestoreAssetCategoryService (DEV-062)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("khôi phục được danh mục đã xoá mềm, báo lỗi cho danh mục đang active → tách riêng thành công/thất bại", async () => {
    const deletedDoc: any = { _id: CATEGORY_ID_1, isActive: false, save: jest.fn().mockResolvedValue(undefined) };
    const activeDoc: any = { _id: CATEGORY_ID_2, isActive: true, save: jest.fn().mockResolvedValue(undefined) };

    mockedCategory.findById.mockImplementation((id: string) =>
      Promise.resolve(id === CATEGORY_ID_1 ? deletedDoc : id === CATEGORY_ID_2 ? activeDoc : null),
    );

    const result = await bulkRestoreAssetCategoryService([CATEGORY_ID_1, CATEGORY_ID_2]);

    expect(deletedDoc.isActive).toBe(true);
    expect(result.deletedIds).toEqual([CATEGORY_ID_1]);
    expect(result.failed).toEqual([{ id: CATEGORY_ID_2, message: "Danh mục này chưa bị xoá" }]);
  });
});

// (DEV-060 — Xoá mềm hàng loạt, 2026-09-16 / DEV-062 — Khôi phục hàng loạt,
// 2026-09-17) Regression test CHỈ cho `bulkDeleteAssetService`/
// `bulkRestoreAssetService` (mới thêm) — không backfill coverage cho các hàm
// khác của `asset.service.ts` (ngoài scope 2 task này).
jest.mock("../../../../models/assets/asset.model", () => {
  const actual = jest.requireActual("../../../../models/assets/asset.model");
  return {
    AssetStatus: actual.AssetStatus,
    Asset: { findOne: jest.fn(), findById: jest.fn() },
  };
});

import { Asset, AssetStatus } from "../../../../models/assets/asset.model";
import { bulkDeleteAssetService, bulkRestoreAssetService } from "../asset.service";

const mockedAsset = Asset as any;

const ASSET_ID_1 = "507f1f77bcf86cd799439011";
const ASSET_ID_2 = "507f1f77bcf86cd799439012";

describe("bulkDeleteAssetService (DEV-060)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("xoá mềm được asset IN_STOCK, chặn asset đang IN_USE → tách riêng thành công/thất bại", async () => {
    const stockDoc: any = { _id: ASSET_ID_1, status: AssetStatus.IN_STOCK, isActive: true, save: jest.fn().mockResolvedValue(undefined) };
    const inUseDoc: any = { _id: ASSET_ID_2, status: AssetStatus.IN_USE, isActive: true, save: jest.fn().mockResolvedValue(undefined) };

    mockedAsset.findOne.mockImplementation((filter: any) =>
      Promise.resolve(filter._id === ASSET_ID_1 ? stockDoc : filter._id === ASSET_ID_2 ? inUseDoc : null),
    );

    const result = await bulkDeleteAssetService([ASSET_ID_1, ASSET_ID_2], "user-1");

    expect(stockDoc.isActive).toBe(false);
    expect(inUseDoc.isActive).toBe(true);
    expect(result.deletedIds).toEqual([ASSET_ID_1]);
    expect(result.failed).toEqual([
      { id: ASSET_ID_2, message: "Không thể xoá tài sản đang sử dụng hoặc đang sửa chữa — vui lòng thu hồi/hoàn tất trước" },
    ]);
  });
});

describe("bulkRestoreAssetService (DEV-062)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("khôi phục được asset đã xoá mềm, báo lỗi cho asset đang active (chưa bị xoá) → tách riêng thành công/thất bại", async () => {
    const deletedDoc: any = { _id: ASSET_ID_1, isActive: false, save: jest.fn().mockResolvedValue(undefined) };
    const activeDoc: any = { _id: ASSET_ID_2, isActive: true, save: jest.fn().mockResolvedValue(undefined) };

    mockedAsset.findById.mockImplementation((id: string) =>
      Promise.resolve(id === ASSET_ID_1 ? deletedDoc : id === ASSET_ID_2 ? activeDoc : null),
    );

    const result = await bulkRestoreAssetService([ASSET_ID_1, ASSET_ID_2], "user-1");

    expect(deletedDoc.isActive).toBe(true);
    expect(result.deletedIds).toEqual([ASSET_ID_1]);
    expect(result.failed).toEqual([{ id: ASSET_ID_2, message: "Tài sản này chưa bị xoá" }]);
  });
});

import mongoose from "mongoose";

// DEV-022/RV06-08 — regression test: `assignAssetService`/`transferAssetService`/
// `returnAssetService` phải bắt riêng `VersionError` (race condition khi 2
// request sửa cùng 1 Asset gần như đồng thời) và trả `409 Conflict` rõ
// nghĩa, thay vì để lộ xuống nhánh 500 "lỗi không xác định" của
// `error.middleware.ts`. Mock toàn bộ Model + `withTransaction` — không
// dùng DB thật.
// `asset.model.ts` export CẢ model Mongoose LẪN enum `AssetStatus` — auto-mock
// (`jest.mock(path)` không factory) khiến Jest cố mock sâu vào nội bộ class
// Model của Mongoose và lỗi (`Symbol(mongoose#Document#scope)`). Dùng factory
// thủ công: giữ nguyên `AssetStatus` thật (qua `requireActual`), chỉ mock
// `Asset` (chỉ cần `findOne`, đúng những gì service dùng).
jest.mock("../../../../models/assets/asset.model", () => ({
  ...jest.requireActual("../../../../models/assets/asset.model"),
  Asset: { findOne: jest.fn() },
}));
jest.mock("../../../../models/assets/assetAssignmentHistory.model", () => ({
  AssetAssignmentHistory: { create: jest.fn().mockResolvedValue([{}]) },
  AssetAssignmentActionType: { ASSIGN: "ASSIGN", TRANSFER: "TRANSFER", RETURN: "RETURN" },
}));
jest.mock("../../../../models/departments/department.model", () => ({
  __esModule: true,
  default: { findById: jest.fn() },
}));
jest.mock("../../../../models/users/user.model", () => ({
  User: { findOne: jest.fn() },
}));
jest.mock("../../../../shared/utils/withTransaction");

import { Asset, AssetStatus } from "../../../../models/assets/asset.model";
import Department from "../../../../models/departments/department.model";
import { withTransaction } from "../../../../shared/utils/withTransaction";
import { assignAssetService } from "../assetAssignment.service";

const mockedAsset = Asset as any;
const mockedDepartment = Department as any;
const mockedWithTransaction = withTransaction as unknown as jest.Mock;

describe("assetAssignment.service — race condition (DEV-022/RV06-08)", () => {
  const makeAssetDoc = () => ({
    _id: "507f1f77bcf86cd799439011",
    status: AssetStatus.IN_STOCK,
    department: "dept-cu",
    assignedTo: undefined,
    save: jest.fn(),
    populate: jest.fn().mockResolvedValue({ _id: "507f1f77bcf86cd799439011" }),
  });

  it("VersionError (2 request cùng sửa 1 Asset gần như đồng thời) → 409 Conflict, KHÔNG lộ message gốc thư viện", async () => {
    mockedAsset.findOne.mockResolvedValue(makeAssetDoc());
    mockedDepartment.findById.mockResolvedValue({ _id: "dept-moi" });

    const versionError = new mongoose.Error.VersionError(
      { _doc: { _id: "507f1f77bcf86cd799439011" } } as any,
      1,
      ["department"],
    );
    mockedWithTransaction.mockRejectedValue(versionError);

    await expect(
      assignAssetService("507f1f77bcf86cd799439011", { toDepartment: "dept-moi" }, "actor-1"),
    ).rejects.toMatchObject({
      status: 409,
    });
  });

  it("lỗi KHÁC (không phải VersionError) vẫn ném nguyên vẹn, không bị nuốt/chuyển thành 409 nhầm", async () => {
    mockedAsset.findOne.mockResolvedValue(makeAssetDoc());
    mockedDepartment.findById.mockResolvedValue({ _id: "dept-moi" });

    const dbError = new Error("Mongo connection lost");
    mockedWithTransaction.mockRejectedValue(dbError);

    await expect(
      assignAssetService("507f1f77bcf86cd799439011", { toDepartment: "dept-moi" }, "actor-1"),
    ).rejects.toBe(dbError);
  });

  it("assign thành công (không có conflict) vẫn hoạt động bình thường", async () => {
    const assetDoc = makeAssetDoc();
    mockedAsset.findOne.mockResolvedValue(assetDoc);
    mockedDepartment.findById.mockResolvedValue({ _id: "dept-moi" });
    mockedWithTransaction.mockImplementation(async (fn: any) => fn("fake-session"));

    const result = await assignAssetService(
      "507f1f77bcf86cd799439011",
      { toDepartment: "dept-moi" },
      "actor-1",
    );

    expect(result).toEqual({ _id: "507f1f77bcf86cd799439011" });
    expect(assetDoc.save).toHaveBeenCalledWith({ session: "fake-session" });
  });
});

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
// [MỚI, DEV-077] Mock TOÀN BỘ module — logic thật của
// `assertOperatorCertifiedIfRequired` (có/không MedicalDeviceProfile, có/
// không chứng chỉ hợp lệ...) đã được test riêng đầy đủ ở
// `operatorCertificate.service.test.ts`. File này chỉ cần xác nhận
// `assignAssetService`/`transferAssetService` có GỌI guard đúng lúc VÀ
// truyền lỗi guard throw ra ngoài đúng cách — không lặp lại toàn bộ ma
// trận điều kiện của guard.
jest.mock("../../medicalDevice/operatorCertificate.service", () => ({
  assertOperatorCertifiedIfRequired: jest.fn(),
}));

import { Asset, AssetStatus } from "../../../../models/assets/asset.model";
import Department from "../../../../models/departments/department.model";
import { User } from "../../../../models/users/user.model";
import { withTransaction } from "../../../../shared/utils/withTransaction";
import { assertOperatorCertifiedIfRequired } from "../../medicalDevice/operatorCertificate.service";
import { assignAssetService, transferAssetService } from "../assetAssignment.service";

const mockedAsset = Asset as any;
const mockedDepartment = Department as any;
const mockedUser = User as any;
const mockedWithTransaction = withTransaction as unknown as jest.Mock;
const mockedAssertCertified = assertOperatorCertifiedIfRequired as jest.Mock;

const makeAssetDoc = (overrides: Record<string, any> = {}) => ({
  _id: "507f1f77bcf86cd799439011",
  status: AssetStatus.IN_STOCK,
  department: "dept-cu",
  category: "cat-1",
  assignedTo: undefined,
  save: jest.fn(),
  populate: jest.fn().mockResolvedValue({ _id: "507f1f77bcf86cd799439011" }),
  ...overrides,
});

describe("assetAssignment.service — race condition (DEV-022/RV06-08)", () => {
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

describe("assetAssignment.service — guard chứng chỉ vận hành (DEV-077)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUser.findOne.mockResolvedValue({ _id: "user-1" }); // assertUserExists PASS
    mockedWithTransaction.mockImplementation(async (fn: any) => fn("fake-session"));
  });

  it("assignAssetService — guard throw (thiếu chứng chỉ hợp lệ) → lỗi propagate ra ngoài, KHÔNG chạm transaction", async () => {
    const assetDoc = makeAssetDoc();
    mockedAsset.findOne.mockResolvedValue(assetDoc);
    mockedDepartment.findById.mockResolvedValue({ _id: "dept-moi" });
    const guardError = Object.assign(new Error("Thiếu chứng chỉ vận hành hợp lệ"), { status: 400 });
    mockedAssertCertified.mockRejectedValue(guardError);

    await expect(
      assignAssetService("507f1f77bcf86cd799439011", { toDepartment: "dept-moi", toUser: "user-1" }, "actor-1"),
    ).rejects.toBe(guardError);

    expect(mockedAssertCertified).toHaveBeenCalledWith(assetDoc, "user-1");
    expect(assetDoc.save).not.toHaveBeenCalled();
  });

  it("assignAssetService — guard PASS (có chứng chỉ hợp lệ, hoặc thiết bị không yêu cầu) → assign bình thường", async () => {
    const assetDoc = makeAssetDoc();
    mockedAsset.findOne.mockResolvedValue(assetDoc);
    mockedDepartment.findById.mockResolvedValue({ _id: "dept-moi" });
    mockedAssertCertified.mockResolvedValue(undefined);

    await assignAssetService("507f1f77bcf86cd799439011", { toDepartment: "dept-moi", toUser: "user-1" }, "actor-1");

    expect(mockedAssertCertified).toHaveBeenCalledWith(assetDoc, "user-1");
    expect(assetDoc.save).toHaveBeenCalled();
  });

  it("assignAssetService — KHÔNG có toUser (gán cho khoa/phòng) → KHÔNG gọi guard", async () => {
    const assetDoc = makeAssetDoc();
    mockedAsset.findOne.mockResolvedValue(assetDoc);
    mockedDepartment.findById.mockResolvedValue({ _id: "dept-moi" });

    await assignAssetService("507f1f77bcf86cd799439011", { toDepartment: "dept-moi" }, "actor-1");

    expect(mockedAssertCertified).not.toHaveBeenCalled();
  });

  it("transferAssetService — guard throw → lỗi propagate ra ngoài, KHÔNG chạm transaction", async () => {
    const assetDoc = makeAssetDoc({ status: AssetStatus.IN_USE });
    mockedAsset.findOne.mockResolvedValue(assetDoc);
    const guardError = Object.assign(new Error("Thiếu chứng chỉ vận hành hợp lệ"), { status: 400 });
    mockedAssertCertified.mockRejectedValue(guardError);

    await expect(
      transferAssetService("507f1f77bcf86cd799439011", { toUser: "user-1" }, "actor-1"),
    ).rejects.toBe(guardError);

    expect(mockedAssertCertified).toHaveBeenCalledWith(assetDoc, "user-1");
    expect(assetDoc.save).not.toHaveBeenCalled();
  });

  it("transferAssetService — guard PASS → transfer bình thường", async () => {
    const assetDoc = makeAssetDoc({ status: AssetStatus.IN_USE });
    mockedAsset.findOne.mockResolvedValue(assetDoc);
    mockedAssertCertified.mockResolvedValue(undefined);

    await transferAssetService("507f1f77bcf86cd799439011", { toUser: "user-1" }, "actor-1");

    expect(mockedAssertCertified).toHaveBeenCalledWith(assetDoc, "user-1");
    expect(assetDoc.save).toHaveBeenCalled();
  });
});

describe("assetAssignment.service — khoa đích đã xoá mềm (BR-06/DEV-100)", () => {
  it("cấp phát/luân chuyển tới khoa đã xoá → 400 \"đã bị xoá\", KHÔNG chạm transaction", async () => {
    jest.clearAllMocks();
    mockedAsset.findOne.mockResolvedValue(makeAssetDoc());
    mockedDepartment.findById.mockResolvedValue({ _id: "dept-xoa", name: "Khoa cũ", isActive: false });

    await expect(
      assignAssetService("507f1f77bcf86cd799439011", { toDepartment: "dept-xoa" }, "actor-1"),
    ).rejects.toMatchObject({ status: 400, message: `Khoa/phòng "Khoa cũ" đã bị xoá (ngừng hoạt động)` });
    expect(mockedWithTransaction).not.toHaveBeenCalled();
  });
});

// [MỚI, DEV-077] Test cho domain mới OperatorCertificate — theo dõi chứng
// chỉ vận hành thiết bị y tế. Mock model — cùng cách các test khác trong
// domain Medical Device đã làm (không dùng DB thật).
jest.mock("../../../../models/assets/operatorCertificate.model", () => ({
  OperatorCertificate: { create: jest.fn(), find: jest.fn(), exists: jest.fn(), findById: jest.fn() },
}));
jest.mock("../../../../models/assets/medicalDeviceProfile.model", () => ({
  MedicalDeviceProfile: { findOne: jest.fn() },
}));
jest.mock("../../../../models/assets/assetCategory.model", () => ({
  AssetCategory: { findOne: jest.fn(), findById: jest.fn() },
}));
jest.mock("../../../../models/users/user.model", () => ({
  User: { findOne: jest.fn() },
}));

import { OperatorCertificate } from "../../../../models/assets/operatorCertificate.model";
import { MedicalDeviceProfile } from "../../../../models/assets/medicalDeviceProfile.model";
import { AssetCategory } from "../../../../models/assets/assetCategory.model";
import { User } from "../../../../models/users/user.model";
import {
  createOperatorCertificateService,
  hasValidOperatorCertificateService,
  getCertifiedUsersForCategoryService,
  assertOperatorCertifiedIfRequired,
  updateOperatorCertificateService,
  revokeOperatorCertificateService,
  deleteOperatorCertificateService,
} from "../operatorCertificate.service";

const mockedCertificate = OperatorCertificate as any;
const mockedProfile = MedicalDeviceProfile as any;
const mockedCategory = AssetCategory as any;
const mockedUser = User as any;

const USER_ID = "507f1f77bcf86cd799439011";
const CATEGORY_ID = "507f1f77bcf86cd799439022";
const ASSET_ID = "507f1f77bcf86cd799439033";

describe("createOperatorCertificateService", () => {
  beforeEach(() => jest.clearAllMocks());

  it("user không tồn tại/đã khoá → 400, không tạo bản ghi", async () => {
    mockedUser.findOne.mockResolvedValue(null);

    await expect(
      createOperatorCertificateService({
        user: USER_ID,
        deviceCategory: CATEGORY_ID,
        issuedAt: new Date("2026-01-01"),
        expiresAt: new Date("2027-01-01"),
      }),
    ).rejects.toMatchObject({ status: 400 });
    expect(mockedCertificate.create).not.toHaveBeenCalled();
  });

  it("danh mục thiết bị không tồn tại → 400, không tạo bản ghi", async () => {
    mockedUser.findOne.mockResolvedValue({ _id: USER_ID });
    mockedCategory.findOne.mockResolvedValue(null);

    await expect(
      createOperatorCertificateService({
        user: USER_ID,
        deviceCategory: CATEGORY_ID,
        issuedAt: new Date("2026-01-01"),
        expiresAt: new Date("2027-01-01"),
      }),
    ).rejects.toMatchObject({ status: 400 });
    expect(mockedCertificate.create).not.toHaveBeenCalled();
  });

  it("hợp lệ — tạo bản ghi, populate kết quả trả về", async () => {
    mockedUser.findOne.mockResolvedValue({ _id: USER_ID });
    mockedCategory.findOne.mockResolvedValue({ _id: CATEGORY_ID });
    const created = { populate: jest.fn().mockResolvedValue({ _id: "cert-1" }) };
    mockedCertificate.create.mockResolvedValue(created);

    const result = await createOperatorCertificateService(
      {
        user: USER_ID,
        deviceCategory: CATEGORY_ID,
        certificateNumber: "CC-001",
        issuedAt: new Date("2026-01-01"),
        expiresAt: new Date("2027-01-01"),
      },
      "recorder-1",
    );

    expect(mockedCertificate.create).toHaveBeenCalledWith(
      expect.objectContaining({ user: USER_ID, deviceCategory: CATEGORY_ID, recordedBy: "recorder-1" }),
    );
    expect(result).toEqual({ _id: "cert-1" });
  });
});

describe("hasValidOperatorCertificateService", () => {
  beforeEach(() => jest.clearAllMocks());

  it("có bản ghi còn hạn → true, query đúng điều kiện expiresAt > now", async () => {
    mockedCertificate.exists.mockResolvedValue({ _id: "cert-1" });

    const result = await hasValidOperatorCertificateService(USER_ID, CATEGORY_ID);

    expect(result).toBe(true);
    expect(mockedCertificate.exists).toHaveBeenCalledWith({
      user: USER_ID,
      deviceCategory: CATEGORY_ID,
      expiresAt: { $gt: expect.any(Date) },
      isActive: true,
    });
  });

  it("không có bản ghi nào còn hạn → false", async () => {
    mockedCertificate.exists.mockResolvedValue(null);

    const result = await hasValidOperatorCertificateService(USER_ID, CATEGORY_ID);

    expect(result).toBe(false);
  });
});

describe("getCertifiedUsersForCategoryService", () => {
  beforeEach(() => jest.clearAllMocks());

  it("dedupe theo user — 2 bản ghi cùng user chỉ trả về 1", async () => {
    const sameUser = { _id: "user-1", isActive: true };
    mockedCertificate.find.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue([
          { user: sameUser, expiresAt: new Date("2027-06-01") },
          { user: sameUser, expiresAt: new Date("2027-01-01") },
        ]),
      }),
    });

    const result = await getCertifiedUsersForCategoryService(CATEGORY_ID);

    expect(result).toHaveLength(1);
  });

  it("bỏ qua user đã bị vô hiệu hoá", async () => {
    mockedCertificate.find.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue([
          { user: { _id: "user-1", isActive: false }, expiresAt: new Date("2027-06-01") },
        ]),
      }),
    });

    const result = await getCertifiedUsersForCategoryService(CATEGORY_ID);

    expect(result).toHaveLength(0);
  });

  // [MỚI DEV-078] Đảm bảo bản ghi đã bị thu hồi/xoá KHÔNG lọt vào danh sách
  // "đủ điều kiện" dù `expiresAt` chưa tới — verify đúng filter gửi xuống DB.
  it("query gửi kèm điều kiện isActive:true (loại bản ghi đã thu hồi/xoá)", async () => {
    mockedCertificate.find.mockReturnValue({
      populate: jest.fn().mockReturnValue({ sort: jest.fn().mockResolvedValue([]) }),
    });

    await getCertifiedUsersForCategoryService(CATEGORY_ID);

    expect(mockedCertificate.find).toHaveBeenCalledWith({
      deviceCategory: CATEGORY_ID,
      expiresAt: { $gt: expect.any(Date) },
      isActive: true,
    });
  });
});

describe("updateOperatorCertificateService (DEV-078 — chỉ certificateNumber)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("không tìm thấy bản ghi → 404", async () => {
    mockedCertificate.findById.mockResolvedValue(null);

    await expect(updateOperatorCertificateService("cert-1", "CC-002")).rejects.toMatchObject({ status: 404 });
  });

  it("hợp lệ — cập nhật certificateNumber, giữ nguyên các field khác", async () => {
    const saved = {
      certificateNumber: "CC-001",
      save: jest.fn().mockResolvedValue(undefined),
      populate: jest.fn().mockResolvedValue({ _id: "cert-1", certificateNumber: "CC-002" }),
    };
    mockedCertificate.findById.mockResolvedValue(saved);

    const result = await updateOperatorCertificateService("cert-1", "CC-002");

    expect(saved.certificateNumber).toBe("CC-002");
    expect(saved.save).toHaveBeenCalled();
    expect(result).toEqual({ _id: "cert-1", certificateNumber: "CC-002" });
  });
});

describe("revokeOperatorCertificateService (DEV-078 — bắt buộc lý do)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("không tìm thấy bản ghi → 404", async () => {
    mockedCertificate.findById.mockResolvedValue(null);

    await expect(revokeOperatorCertificateService("cert-1", "Bị rút giấy phép", "admin-1")).rejects.toMatchObject({
      status: 404,
    });
  });

  it("bản ghi đã bị vô hiệu hoá trước đó → 400, không thu hồi lại lần nữa", async () => {
    mockedCertificate.findById.mockResolvedValue({ isActive: false, save: jest.fn() });

    await expect(revokeOperatorCertificateService("cert-1", "lý do", "admin-1")).rejects.toMatchObject({
      status: 400,
    });
  });

  it("hợp lệ — set isActive=false, ghi revokedAt/revokedBy/revokedReason", async () => {
    const saved: any = {
      isActive: true,
      save: jest.fn().mockResolvedValue(undefined),
      populate: jest.fn().mockResolvedValue({ _id: "cert-1", isActive: false }),
    };
    mockedCertificate.findById.mockResolvedValue(saved);

    await revokeOperatorCertificateService("cert-1", "Bị rút giấy phép", "admin-1");

    expect(saved.isActive).toBe(false);
    expect(saved.revokedReason).toBe("Bị rút giấy phép");
    expect(saved.revokedBy).toBe("admin-1");
    expect(saved.revokedAt).toBeInstanceOf(Date);
    expect(saved.save).toHaveBeenCalled();
  });
});

describe("deleteOperatorCertificateService (DEV-078 — xoá mềm, lỗi nhập liệu)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("không tìm thấy bản ghi → 404", async () => {
    mockedCertificate.findById.mockResolvedValue(null);

    await expect(deleteOperatorCertificateService("cert-1", "admin-1")).rejects.toMatchObject({ status: 404 });
  });

  it("bản ghi đã bị vô hiệu hoá trước đó → 400", async () => {
    mockedCertificate.findById.mockResolvedValue({ isActive: false, save: jest.fn() });

    await expect(deleteOperatorCertificateService("cert-1", "admin-1")).rejects.toMatchObject({ status: 400 });
  });

  it("hợp lệ — set isActive=false, ghi deletedAt/deletedBy, KHÔNG cần lý do", async () => {
    const saved: any = { isActive: true, save: jest.fn().mockResolvedValue(undefined) };
    mockedCertificate.findById.mockResolvedValue(saved);

    await deleteOperatorCertificateService("cert-1", "admin-1");

    expect(saved.isActive).toBe(false);
    expect(saved.deletedBy).toBe("admin-1");
    expect(saved.deletedAt).toBeInstanceOf(Date);
    expect(saved.save).toHaveBeenCalled();
  });
});

describe("assertOperatorCertifiedIfRequired (guard dùng trong assign/transfer Asset)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("không có toUserId (gán cho khoa/phòng, chưa gắn cá nhân) → bỏ qua, không query gì", async () => {
    await assertOperatorCertifiedIfRequired({ _id: ASSET_ID, category: CATEGORY_ID }, undefined);

    expect(mockedProfile.findOne).not.toHaveBeenCalled();
  });

  it("asset không có MedicalDeviceProfile → bỏ qua (không phải thiết bị y tế)", async () => {
    mockedProfile.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });

    await expect(
      assertOperatorCertifiedIfRequired({ _id: ASSET_ID, category: CATEGORY_ID }, USER_ID),
    ).resolves.toBeUndefined();
  });

  it("profile có operatorCertificateRequired=false → bỏ qua", async () => {
    mockedProfile.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue({ operatorCertificateRequired: false }),
    });

    await expect(
      assertOperatorCertifiedIfRequired({ _id: ASSET_ID, category: CATEGORY_ID }, USER_ID),
    ).resolves.toBeUndefined();
    expect(mockedCertificate.exists).not.toHaveBeenCalled();
  });

  it("operatorCertificateRequired=true VÀ user có chứng chỉ hợp lệ → cho phép (không throw)", async () => {
    mockedProfile.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue({ operatorCertificateRequired: true }),
    });
    mockedCertificate.exists.mockResolvedValue({ _id: "cert-1" });

    await expect(
      assertOperatorCertifiedIfRequired({ _id: ASSET_ID, category: CATEGORY_ID }, USER_ID),
    ).resolves.toBeUndefined();
  });

  it("operatorCertificateRequired=true VÀ user KHÔNG có chứng chỉ hợp lệ → throw 400 kèm tên danh mục", async () => {
    mockedProfile.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue({ operatorCertificateRequired: true }),
    });
    mockedCertificate.exists.mockResolvedValue(null);
    mockedCategory.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ name: "Máy chạy thận" }) });

    await expect(
      assertOperatorCertifiedIfRequired({ _id: ASSET_ID, category: CATEGORY_ID }, USER_ID),
    ).rejects.toMatchObject({
      status: 400,
      message: expect.stringContaining("Máy chạy thận"),
    });
  });
});

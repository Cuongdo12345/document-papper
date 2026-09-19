import bcrypt from "bcrypt";
import { jest } from "@jest/globals";

// DEV-002 — regression test cho SEC-29/RV03-01: resetPassword() phải chặn
// reset mật khẩu của user thuộc role ADMIN/isSystemRole (TEST-005,
// docs/18_TESTING_STRATEGY.md). Mock toàn bộ Model — không dùng DB thật.
jest.mock("../../../models/users/user.model");
jest.mock("../../../models/rbac/role.model");
jest.mock("../../../models/auth/refreshToken.model");
jest.mock("../../../models/users/userAudit.model");
jest.mock("../../../models/assets/asset.model", () => ({
  Asset: { exists: jest.fn() },
}));
jest.mock("../../../models/auth/twoFactorOtp.model");
// RBAC MICRO-FIX (getMeService) — mock permission.cache để test getMeService()
// không phụ thuộc logic thật của getUserEffectivePermissions() (đã có test
// riêng cho tầng đó, nếu có — ở đây chỉ verify getMeService REUSE đúng hàm
// này, không tính toán permission trùng lặp).
jest.mock("../../rbac/permission.cache");

import { User } from "../../../models/users/user.model";
import { Role } from "../../../models/rbac/role.model";
import RefreshToken from "../../../models/auth/refreshToken.model";
import UserAudit from "../../../models/users/userAudit.model";
import { Asset } from "../../../models/assets/asset.model";
import TwoFactorOtp from "../../../models/auth/twoFactorOtp.model";
import { getCachedPermissions } from "../../rbac/permission.cache";
import { resetPassword, resetTwoFactor, listUserSessions, revokeUserSession, listAllSessions, changePassword, getMeService, updateMeService, bulkDisable, bulkRestore, create, update } from "../users.service";

const mockedUser = User as any;
const mockedRole = Role as any;
const mockedRefreshToken = RefreshToken as any;
const mockedUserAudit = UserAudit as any;
const mockedAsset = Asset as any;
const mockedTwoFactorOtp = TwoFactorOtp as any;
const mockedGetCachedPermissions = getCachedPermissions as any;

/** Query chainable tối giản mô phỏng `.select().populate().populate()` của Mongoose (thenable). */
function makeQuery(result: any) {
  const query: any = {};
  query.select = jest.fn().mockReturnValue(query);
  query.populate = jest.fn().mockReturnValue(query);
  query.then = (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject);
  return query;
}

describe("users.service — resetPassword (DEV-002 / SEC-29 / RV03-01)", () => {
  it("báo lỗi 404 nếu user không tồn tại", async () => {
    mockedUser.findById.mockResolvedValue(null);

    await expect(resetPassword("u-khong-ton-tai", "matkhaumoi123", "admin-1")).rejects.toMatchObject({
      status: 404,
    });
  });

  it("báo lỗi 400 nếu user đã bị vô hiệu hóa", async () => {
    mockedUser.findById.mockResolvedValue({ _id: "u1", isActive: false, role: "role-user" });

    await expect(resetPassword("u1", "matkhaumoi123", "admin-1")).rejects.toMatchObject({
      status: 400,
    });
  });

  it("🔒 báo lỗi 400 nếu target user thuộc role isSystemRole=true (KHÔNG cho reset password ADMIN thật)", async () => {
    const saveMock = jest.fn() as any;
    mockedUser.findById.mockResolvedValue({
      _id: "u-admin",
      isActive: true,
      role: "role-admin-id",
      save: saveMock,
    });
    mockedRole.findById.mockReturnValue({
      select: (jest.fn() as any).mockResolvedValue({ name: "ADMIN", isSystemRole: true }),
    });

    await expect(resetPassword("u-admin", "matkhaumoi123", "attacker-1")).rejects.toMatchObject({
      status: 400,
    });
    expect(saveMock).not.toHaveBeenCalled();
  });

  // 🔒 CẬP NHẬT (DEV-047, 2026-09-12 — DEV-001A Phase B hoàn tất): trước đây
  // role tên "ADMIN" ĐƠN THUẦN (isSystemRole=false) cũng bị chặn reset (lưới
  // đỡ Phase A) — nay KHÔNG còn, đúng ý định gốc "chỉ chặn ADMIN THẬT". Migration
  // đã xác nhận (`migrate-system-role-flag.ts`) nên chỉ `isSystemRole` mới
  // có ý nghĩa; 1 role tên trùng "ADMIN" nhưng KHÔNG phải role hệ thống thật
  // (vd dữ liệu test/demo) giờ được xử lý như role thường.
  it("role tên 'ADMIN' NHƯNG isSystemRole=false: reset THÀNH CÔNG (không còn coi là ADMIN thật)", async () => {
    const saveMock = (jest.fn() as any).mockResolvedValue(undefined);
    const userDoc: any = {
      _id: "u-admin-gia",
      isActive: true,
      role: "role-admin-id",
      password: "old-hash",
      save: saveMock,
    };
    mockedUser.findById.mockResolvedValue(userDoc);
    mockedRole.findById.mockReturnValue({
      select: (jest.fn() as any).mockResolvedValue({ name: "ADMIN", isSystemRole: false }),
    });
    mockedRefreshToken.updateMany.mockResolvedValue({});
    mockedUserAudit.create.mockResolvedValue({});

    const result = await resetPassword("u-admin-gia", "matkhaumoi123", "admin-that-1");

    expect(result).toBe(true);
    expect(saveMock).toHaveBeenCalled();
  });

  it("reset thành công cho user thường: hash password, thu hồi refresh token, ghi audit log", async () => {
    const saveMock = (jest.fn() as any).mockResolvedValue(undefined);
    const userDoc: any = {
      _id: "u-thuong",
      isActive: true,
      role: "role-user-id",
      password: "old-hash",
      save: saveMock,
    };
    mockedUser.findById.mockResolvedValue(userDoc);
    mockedRole.findById.mockReturnValue({
      select: (jest.fn() as any).mockResolvedValue({ name: "USER", isSystemRole: false }),
    });
    mockedRefreshToken.updateMany.mockResolvedValue({});
    mockedUserAudit.create.mockResolvedValue({});

    const result = await resetPassword("u-thuong", "matkhaumoi123", "admin-1");

    expect(result).toBe(true);
    expect(saveMock).toHaveBeenCalled();
    expect(userDoc.password).not.toBe("old-hash");
    expect(userDoc.password).not.toBe("matkhaumoi123");
    expect(mockedRefreshToken.updateMany).toHaveBeenCalledWith(
      { user: "u-thuong" },
      { revoked: true },
    );
    expect(mockedUserAudit.create).toHaveBeenCalledWith(
      expect.objectContaining({ action: "RESET_PASSWORD", performedBy: "admin-1" }),
    );
  });
});

describe("users.service — resetTwoFactor (Roadmap C1, DEV-068, 2026-09-19)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("báo lỗi 404 nếu user không tồn tại", async () => {
    mockedUser.findById.mockResolvedValue(null);
    await expect(resetTwoFactor("u-khong-ton-tai", "admin-1")).rejects.toMatchObject({ status: 404 });
  });

  it("báo lỗi 400 nếu user đã bị vô hiệu hóa", async () => {
    mockedUser.findById.mockResolvedValue({ _id: "u1", isActive: false });
    await expect(resetTwoFactor("u1", "admin-1")).rejects.toMatchObject({ status: 400 });
  });

  it("🔒 báo lỗi 400 nếu target user thuộc role isSystemRole=true (KHÔNG cho reset 2FA của ADMIN thật) — mirror resetPassword", async () => {
    const saveMock = (jest.fn() as any).mockResolvedValue(undefined);
    mockedUser.findById.mockResolvedValue({ _id: "u-admin", isActive: true, role: "role-admin-id", twoFactorEnabled: true, save: saveMock });
    mockedRole.findById.mockReturnValue({
      select: (jest.fn() as any).mockResolvedValue({ name: "ADMIN", isSystemRole: true }),
    });

    await expect(resetTwoFactor("u-admin", "attacker-1")).rejects.toMatchObject({ status: 400 });
    expect(saveMock).not.toHaveBeenCalled();
  });

  it("báo lỗi 400 nếu user chưa bật 2FA (không có gì để reset)", async () => {
    const saveMock = (jest.fn() as any).mockResolvedValue(undefined);
    mockedUser.findById.mockResolvedValue({ _id: "u1", isActive: true, role: "role-user-id", twoFactorEnabled: false, save: saveMock });
    mockedRole.findById.mockReturnValue({
      select: (jest.fn() as any).mockResolvedValue({ name: "USER", isSystemRole: false }),
    });

    await expect(resetTwoFactor("u1", "admin-1")).rejects.toMatchObject({ status: 400 });
  });

  it("thành công: tắt cờ twoFactorEnabled, xoá OTP đang chờ, ghi audit RESET_2FA", async () => {
    const saveMock = (jest.fn() as any).mockResolvedValue(undefined);
    const userDoc: any = { _id: "u1", isActive: true, role: "role-user-id", twoFactorEnabled: true, save: saveMock };
    mockedUser.findById.mockResolvedValue(userDoc);
    mockedRole.findById.mockReturnValue({
      select: (jest.fn() as any).mockResolvedValue({ name: "TRUONG_KHOA", isSystemRole: false }),
    });
    mockedTwoFactorOtp.deleteMany.mockResolvedValue({});
    mockedUserAudit.create.mockResolvedValue({});

    const result = await resetTwoFactor("u1", "admin-1");

    expect(result).toBe(true);
    expect(userDoc.twoFactorEnabled).toBe(false);
    expect(mockedTwoFactorOtp.deleteMany).toHaveBeenCalledWith({ user: "u1" });
    expect(mockedUserAudit.create).toHaveBeenCalledWith(
      expect.objectContaining({ action: "RESET_2FA", performedBy: "admin-1" }),
    );
  });
});

describe("users.service — listUserSessions (Roadmap C2, DEV-069, 2026-09-19)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("báo lỗi 404 nếu user không tồn tại", async () => {
    mockedUser.findById.mockResolvedValue(null);
    await expect(listUserSessions("u-khong-ton-tai")).rejects.toMatchObject({ status: 404 });
  });

  it("chỉ lấy phiên CÒN hiệu lực, KHÔNG có field isCurrent (ADMIN xem hộ, không phải phiên của chính họ)", async () => {
    mockedUser.findById.mockResolvedValue({ _id: "u1" });
    mockedRefreshToken.find.mockReturnValue({
      sort: (jest.fn() as any).mockResolvedValue([
        { _id: "s1", userAgent: "Mozilla/5.0 Chrome/1 Windows NT", ip: "1.2.3.4", createdAt: new Date(), expiresAt: new Date() },
      ]),
    });

    const result: any = await listUserSessions("u1");

    expect(mockedRefreshToken.find).toHaveBeenCalledWith(expect.objectContaining({ user: "u1", revoked: false }));
    expect(result[0]).toMatchObject({ _id: "s1", browser: "Chrome", os: "Windows" });
    expect(result[0]).not.toHaveProperty("isCurrent");
  });
});

describe("users.service — revokeUserSession (Roadmap C2, DEV-069, 2026-09-19)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("báo lỗi 404 nếu phiên không tồn tại/không thuộc về user chỉ định", async () => {
    mockedRefreshToken.findOneAndUpdate.mockResolvedValue(null);
    await expect(revokeUserSession("u1", "s-khong-ton-tai", "admin-1")).rejects.toMatchObject({ status: 404 });
  });

  it("thu hồi thành công: match đúng user + chưa revoked, ghi audit REVOKE_SESSION", async () => {
    mockedRefreshToken.findOneAndUpdate.mockResolvedValue({ _id: "s1" });
    mockedUserAudit.create.mockResolvedValue({});

    const result = await revokeUserSession("u1", "s1", "admin-1");

    expect(result).toBe(true);
    expect(mockedRefreshToken.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: "s1", user: "u1", revoked: false },
      { revoked: true },
    );
    expect(mockedUserAudit.create).toHaveBeenCalledWith(
      expect.objectContaining({ action: "REVOKE_SESSION", user: "u1", performedBy: "admin-1" }),
    );
  });
});

describe("users.service — listAllSessions (Roadmap C3, DEV-070, 2026-09-19)", () => {
  beforeEach(() => jest.clearAllMocks());

  function makeSessionChain(resolved: any[]) {
    const chain: any = {};
    chain.populate = jest.fn().mockReturnValue(chain);
    chain.sort = jest.fn().mockReturnValue(chain);
    chain.skip = jest.fn().mockReturnValue(chain);
    chain.limit = (jest.fn() as any).mockResolvedValue(resolved);
    return chain;
  }

  it("lấy TẤT CẢ phiên còn hiệu lực của MỌI user (không lọc theo user), kèm thông tin user đã populate", async () => {
    const chain = makeSessionChain([
      {
        _id: "s1",
        user: { _id: "u1", username: "user1", fullName: "User One" },
        userAgent: "Mozilla/5.0 Chrome/1 Windows NT",
        ip: "1.2.3.4",
        createdAt: new Date(),
        expiresAt: new Date(),
      },
    ]);
    mockedRefreshToken.find.mockReturnValue(chain);
    mockedRefreshToken.countDocuments.mockResolvedValue(1);

    const result: any = await listAllSessions({ page: 1, limit: 20 });

    expect(mockedRefreshToken.find).toHaveBeenCalledWith(
      expect.objectContaining({ revoked: false }),
    );
    expect(mockedRefreshToken.find.mock.calls[0][0]).not.toHaveProperty("user");
    expect(chain.populate).toHaveBeenCalledWith("user", "username fullName");
    expect(result.data[0]).toMatchObject({
      _id: "s1",
      browser: "Chrome",
      os: "Windows",
      user: { _id: "u1", username: "user1" },
    });
    expect(result.pagination).toMatchObject({ total: 1, page: 1, limit: 20 });
  });

  it("có `search`: resolve userId khớp username/fullName trước, rồi lọc RefreshToken theo $in", async () => {
    mockedUser.find.mockReturnValue(makeQuery([{ _id: "u1" }, { _id: "u2" }]));
    const chain = makeSessionChain([]);
    mockedRefreshToken.find.mockReturnValue(chain);
    mockedRefreshToken.countDocuments.mockResolvedValue(0);

    await listAllSessions({ search: "cuong" });

    expect(mockedUser.find).toHaveBeenCalledWith({
      $or: [
        { username: { $regex: "cuong", $options: "i" } },
        { fullName: { $regex: "cuong", $options: "i" } },
      ],
    });
    expect(mockedRefreshToken.find).toHaveBeenCalledWith(
      expect.objectContaining({ user: { $in: ["u1", "u2"] } }),
    );
  });
});

describe("users.service — bulkDisable (DEV-060, 2026-09-16)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("vô hiệu hoá được user thường, chặn user ADMIN (isSystemRole) → tách riêng thành công/thất bại", async () => {
    const normalUserDoc: any = { _id: "u-thuong", isActive: true, role: "role-user", save: (jest.fn() as any).mockResolvedValue(undefined) };
    const adminUserDoc: any = { _id: "u-admin", isActive: true, role: "role-admin", save: (jest.fn() as any).mockResolvedValue(undefined) };

    mockedUser.findById.mockImplementation((id: string) =>
      Promise.resolve(id === "u-thuong" ? normalUserDoc : id === "u-admin" ? adminUserDoc : null),
    );
    mockedRole.findById.mockImplementation((roleId: string) => ({
      select: (jest.fn() as any).mockResolvedValue(roleId === "role-admin" ? { isSystemRole: true } : { isSystemRole: false }),
    }));
    mockedAsset.exists.mockResolvedValue(false);
    mockedRefreshToken.updateMany.mockResolvedValue(undefined);
    mockedUserAudit.create.mockResolvedValue(undefined);

    const result = await bulkDisable(["u-thuong", "u-admin"], "admin-1");

    expect(normalUserDoc.isActive).toBe(false);
    expect(result.deletedIds).toEqual(["u-thuong"]);
    expect(result.failed).toEqual([{ id: "u-admin", message: "Không thể vô hiệu hóa tài khoản ADMIN" }]);
  });
});

describe("users.service — bulkRestore (DEV-062, 2026-09-17)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("khôi phục được user đã bị disable, chặn user đang active (chưa bị khoá) → tách riêng thành công/thất bại", async () => {
    const disabledUserDoc: any = { _id: "u-disabled", isActive: false, save: (jest.fn() as any).mockResolvedValue(undefined) };
    const activeUserDoc: any = { _id: "u-active", isActive: true, save: (jest.fn() as any).mockResolvedValue(undefined) };

    mockedUser.findById.mockImplementation((id: string) =>
      Promise.resolve(id === "u-disabled" ? disabledUserDoc : id === "u-active" ? activeUserDoc : null),
    );
    mockedUserAudit.create.mockResolvedValue(undefined);

    const result = await bulkRestore(["u-disabled", "u-active"], "admin-1");

    expect(disabledUserDoc.isActive).toBe(true);
    expect(result.deletedIds).toEqual(["u-disabled"]);
    expect(result.failed).toEqual([{ id: "u-active", message: "User đã được khôi phục" }]);
  });
});

// DEV-021/SEC-01 — regression test: changePassword() phải thu hồi TOÀN BỘ
// refresh token của user (trước đây KHÔNG thu hồi gì, khác 3 luồng đổi mật
// khẩu còn lại — xem docs/development/tasks/DEV-021.md).
describe("users.service — changePassword (DEV-021/SEC-01)", () => {
  it("báo lỗi 400 nếu user không tồn tại hoặc đã bị vô hiệu hóa, KHÔNG thu hồi token nào", async () => {
    mockedUser.findById.mockReturnValue({
      select: (jest.fn() as any).mockResolvedValue(null),
    });

    await expect(
      changePassword("u-khong-ton-tai", "oldpass123", "newpassword123"),
    ).rejects.toMatchObject({ status: 400 });
    expect(mockedRefreshToken.updateMany).not.toHaveBeenCalled();
  });

  it("báo lỗi 400 nếu mật khẩu cũ không đúng, KHÔNG thu hồi token nào", async () => {
    const realOldHash = await bcrypt.hash("mat-khau-dung", 10);
    mockedUser.findById.mockReturnValue({
      select: (jest.fn() as any).mockResolvedValue({
        _id: "u1",
        isActive: true,
        password: realOldHash,
        save: (jest.fn() as any).mockResolvedValue(undefined),
      }),
    });

    await expect(
      changePassword("u1", "mat-khau-sai", "newpassword123"),
    ).rejects.toMatchObject({ status: 400 });
    expect(mockedRefreshToken.updateMany).not.toHaveBeenCalled();
  });

  it("đổi mật khẩu thành công: hash password mới, thu hồi TOÀN BỘ refresh token của user, ghi audit log", async () => {
    const realOldHash = await bcrypt.hash("mat-khau-cu", 10);
    const saveMock = (jest.fn() as any).mockResolvedValue(undefined);
    const userDoc: any = {
      _id: "u-thuong",
      isActive: true,
      password: realOldHash,
      save: saveMock,
    };
    mockedUser.findById.mockReturnValue({
      select: (jest.fn() as any).mockResolvedValue(userDoc),
    });
    mockedRefreshToken.updateMany.mockResolvedValue({});
    mockedUserAudit.create.mockResolvedValue({});

    const result = await changePassword("u-thuong", "mat-khau-cu", "mat-khau-moi-123");

    expect(result).toBe(true);
    expect(saveMock).toHaveBeenCalled();
    expect(userDoc.password).not.toBe(realOldHash);
    expect(await bcrypt.compare("mat-khau-moi-123", userDoc.password)).toBe(true);
    // 🔒 SEC-01: thu hồi TOÀN BỘ refresh token (kể cả phiên hiện tại) —
    // changePassword() không nhận refresh token hiện tại làm tham số nên
    // không có cách nào loại trừ riêng nó.
    expect(mockedRefreshToken.updateMany).toHaveBeenCalledWith(
      { user: "u-thuong" },
      { revoked: true },
    );
    expect(mockedUserAudit.create).toHaveBeenCalledWith(
      expect.objectContaining({ action: "CHANGE_PASSWORD", performedBy: "u-thuong" }),
    );
  });
});

// RBAC MICRO-FIX — regression test cho GET /users/me blocker (FE-00, xem
// docs/frontend/tasks/FE-00.md Mục 10.1): response phải có role.isSystemRole
// + permissions[] (effective, REUSE getCachedPermissions), giữ nguyên field cũ.
describe("users.service — getMeService (RBAC micro-fix — GET /users/me)", () => {
  it("báo lỗi 400 nếu user không tồn tại", async () => {
    mockedUser.findById.mockReturnValue(makeQuery(null));

    await expect(getMeService("u-khong-ton-tai")).rejects.toMatchObject({ status: 400 });
  });

  it("báo lỗi 400 nếu user tồn tại nhưng đã bị vô hiệu hóa (isActive=false)", async () => {
    mockedUser.findById.mockReturnValue(
      makeQuery({ _id: "u1", isActive: false, toObject: () => ({ _id: "u1", isActive: false }) }),
    );

    await expect(getMeService("u1")).rejects.toMatchObject({ status: 400 });
    expect(mockedGetCachedPermissions).not.toHaveBeenCalled();
  });

  it("trả role.isSystemRole + permissions[] (effective, qua getCachedPermissions) — GIỮ NGUYÊN field cũ (extraPermissions dạng ObjectId thô)", async () => {
    const userDoc = {
      _id: "u-thuong",
      username: "nguyenvana",
      fullName: "Nguyễn Văn A",
      isActive: true,
      role: { _id: "role-it", name: "IT", isSystemRole: false },
      department: { _id: "dep-1", code: "IT", name: "Phòng CNTT" },
      extraPermissions: ["perm-obj-id-1"],
      denyPermissions: [],
      toObject() {
        return {
          _id: this._id,
          username: this.username,
          fullName: this.fullName,
          isActive: this.isActive,
          role: this.role,
          department: this.department,
          extraPermissions: this.extraPermissions,
          denyPermissions: this.denyPermissions,
        };
      },
    };
    mockedUser.findById.mockReturnValue(makeQuery(userDoc));
    mockedGetCachedPermissions.mockResolvedValue(["DOCUMENT_VIEW", "DOCUMENT_CREATE"]);

    const result = (await getMeService("u-thuong")) as any;

    // Field MỚI — additive.
    expect(result.role).toEqual({ _id: "role-it", name: "IT", isSystemRole: false });
    expect(result.permissions).toEqual(["DOCUMENT_VIEW", "DOCUMENT_CREATE"]);
    // Field CŨ — backward-compatible, KHÔNG đổi shape (vẫn ObjectId thô, không tự resolve tên ở đây).
    expect(result.extraPermissions).toEqual(["perm-obj-id-1"]);
    expect(result.denyPermissions).toEqual([]);
    expect(result.username).toBe("nguyenvana");
    // REUSE đúng permission.cache — không tính toán lại logic effective permission ở getMeService.
    expect(mockedGetCachedPermissions).toHaveBeenCalledWith("u-thuong");
  });

  it("ADMIN/isSystemRole KHÔNG được special-case — permissions[] trả đúng những gì getCachedPermissions trả (có thể rỗng nếu DB chưa seed đủ, không tự chế toàn quyền)", async () => {
    const userDoc = {
      _id: "u-admin",
      username: "admin",
      isActive: true,
      role: { _id: "role-admin", name: "ADMIN", isSystemRole: true },
      extraPermissions: [],
      denyPermissions: [],
      toObject() {
        return {
          _id: this._id,
          username: this.username,
          isActive: this.isActive,
          role: this.role,
          extraPermissions: this.extraPermissions,
          denyPermissions: this.denyPermissions,
        };
      },
    };
    mockedUser.findById.mockReturnValue(makeQuery(userDoc));
    // Giả lập trường hợp DB CHƯA seed permission cho role ADMIN — verify KHÔNG
    // có logic "ADMIN = tự thêm toàn bộ permission" nào bị lén thêm vào getMeService.
    mockedGetCachedPermissions.mockResolvedValue([]);

    const result = (await getMeService("u-admin")) as any;

    expect(result.role.isSystemRole).toBe(true);
    expect(result.permissions).toEqual([]);
  });
});

describe("users.service — updateMeService (DEV note FE-14 #24 — PATCH /users/me)", () => {
  it("đổi username trùng với user KHÁC: báo lỗi 409 conflict (không rơi ra E11000 thô từ findOneAndUpdate)", async () => {
    mockedUser.findOne.mockResolvedValue({ _id: "u-khac", username: "phongkhth" });

    await expect(updateMeService("u1", { username: "phongkhth" })).rejects.toMatchObject({
      status: 409,
      message: "Username đã tồn tại",
    });
    // Check trùng PHẢI xảy ra TRƯỚC khi ghi — không được gọi findOneAndUpdate
    // khi đã biết trước sẽ vi phạm unique index.
    expect(mockedUser.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("đổi username trùng với CHÍNH MÌNH (không đổi thực chất): KHÔNG báo lỗi — findOne loại trừ đúng _id hiện tại", async () => {
    mockedUser.findOne.mockResolvedValue(null); // {_id: {$ne: userId}} nên user hiện tại không match chính mình
    mockedUser.findOneAndUpdate.mockReturnValue(
      makeQuery({ _id: "u1", username: "phongkhth", fullName: "Test" }),
    );

    const result = (await updateMeService("u1", { username: "phongkhth" })) as any;

    expect(result.username).toBe("phongkhth");
    expect(mockedUser.findOne).toHaveBeenCalledWith({ username: "phongkhth", _id: { $ne: "u1" } });
  });

  it("chỉ đổi fullName (không đổi username): KHÔNG check trùng, cập nhật bình thường", async () => {
    mockedUser.findOneAndUpdate.mockReturnValue(
      makeQuery({ _id: "u1", username: "cu", fullName: "Tên mới" }),
    );

    const result = (await updateMeService("u1", { fullName: "Tên mới" })) as any;

    expect(result.fullName).toBe("Tên mới");
    expect(mockedUser.findOne).not.toHaveBeenCalled();
  });

  // Roadmap B7 (2026-09-18) — `subscribedToWeeklyReport` thêm vào whitelist tự-cập-nhật.
  it("cho phép tự đổi subscribedToWeeklyReport (Roadmap B7)", async () => {
    mockedUser.findOneAndUpdate.mockReturnValue(
      makeQuery({ _id: "u1", username: "cu", subscribedToWeeklyReport: true }),
    );

    const result = (await updateMeService("u1", { subscribedToWeeklyReport: true })) as any;

    expect(result.subscribedToWeeklyReport).toBe(true);
    expect(mockedUser.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: "u1", isActive: true },
      { $set: { subscribedToWeeklyReport: true } },
      expect.anything(),
    );
  });

  it("VẪN bỏ qua field nhạy cảm (role/department/isActive) dù client cố gửi kèm — không phải điều B7 mở thêm", async () => {
    mockedUser.findOneAndUpdate.mockReturnValue(makeQuery({ _id: "u1", fullName: "Tên mới" }));

    await updateMeService("u1", { fullName: "Tên mới", role: "admin-role-id", isActive: false });

    expect(mockedUser.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: "u1", isActive: true },
      { $set: { fullName: "Tên mới" } },
      expect.anything(),
    );
  });
});

// [MỚI 2026-09-18] Khắc phục gap phát hiện ở DEV-065 Mục 4: trước đây KHÔNG
// có đường nào (kể cả ADMIN) để gán/sửa email của user — chỉ test phần MỚI
// thêm (nhánh email), KHÔNG backfill toàn bộ coverage cho create()/update()
// (2 hàm này trước đây hoàn toàn chưa có test — ngoài phạm vi task).
describe("users.service — create (email, khắc phục gap DEV-065 Mục 4)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("tạo user kèm email hợp lệ chưa trùng: gán email vào User.create()", async () => {
    mockedUser.findOne.mockResolvedValue(null); // dùng chung cho check username lẫn check email — cả 2 đều "chưa tồn tại"
    mockedRole.findById.mockResolvedValue({ _id: "role-it", name: "IT", isSystemRole: false });
    mockedUser.create.mockResolvedValue({ _id: "new-user", username: "itstaff01", email: "it01@example.com" });
    mockedUserAudit.create.mockResolvedValue(undefined);

    await create(
      { username: "itstaff01", password: "matkhau123", fullName: "Nhân viên IT", role: "role-it", email: "it01@example.com" },
      "admin-1",
    );

    expect(mockedUser.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: "it01@example.com" }),
    );
  });

  it("email đã được user khác dùng: báo lỗi 409 conflict, KHÔNG gọi User.create()", async () => {
    mockedUser.findOne.mockImplementation((query: any) =>
      Promise.resolve(query.email ? { _id: "existing-user", email: "trung@example.com" } : null),
    );
    mockedRole.findById.mockResolvedValue({ _id: "role-it", name: "IT", isSystemRole: false });

    await expect(
      create(
        { username: "itstaff02", password: "matkhau123", fullName: "NV IT 2", role: "role-it", email: "trung@example.com" },
        "admin-1",
      ),
    ).rejects.toMatchObject({ status: 409, message: "Email đã được sử dụng" });

    expect(mockedUser.create).not.toHaveBeenCalled();
  });

  it("không gửi email: KHÔNG check trùng, tạo user bình thường (giữ nguyên hành vi cũ)", async () => {
    mockedUser.findOne.mockResolvedValue(null); // check username
    mockedRole.findById.mockResolvedValue({ _id: "role-it", name: "IT", isSystemRole: false });
    mockedUser.create.mockResolvedValue({ _id: "new-user", username: "itstaff03" });
    mockedUserAudit.create.mockResolvedValue(undefined);

    await create({ username: "itstaff03", password: "matkhau123", fullName: "NV IT 3", role: "role-it" }, "admin-1");

    expect(mockedUser.findOne).toHaveBeenCalledTimes(1); // chỉ check username, không check email
    expect(mockedUser.create).toHaveBeenCalledWith(expect.objectContaining({ email: undefined }));
  });
});

describe("users.service — update (email, khắc phục gap DEV-065 Mục 4 — PUT /users/:id, ADMIN)", () => {
  beforeEach(() => jest.clearAllMocks());

  function makeUserDoc(overrides: any = {}) {
    return {
      _id: "u1",
      isActive: true,
      role: "role-it",
      username: "itstaff01",
      email: undefined,
      save: (jest.fn() as any).mockResolvedValue(undefined),
      ...overrides,
    };
  }

  it("gán email hợp lệ chưa trùng cho user chưa có email", async () => {
    const userDoc = makeUserDoc();
    mockedUser.findById.mockReturnValueOnce(userDoc); // 1. tìm user
    mockedRole.findById.mockReturnValue({ select: (jest.fn() as any).mockResolvedValue({ name: "IT" }) }); // effectiveRole
    mockedUser.findOne.mockResolvedValue(null); // check trùng email
    mockedUserAudit.create.mockResolvedValue(undefined);
    mockedUser.findById.mockReturnValueOnce({ populate: (jest.fn() as any).mockResolvedValue({ ...userDoc, email: "it01@example.com" }) }); // 2. trả về sau khi save

    await update("u1", { email: "it01@example.com" }, "admin-1");

    expect(userDoc.email).toBe("it01@example.com");
    expect(userDoc.save).toHaveBeenCalled();
  });

  it("email trùng với user KHÁC: báo lỗi 409 conflict, KHÔNG gọi user.save()", async () => {
    const userDoc = makeUserDoc();
    mockedUser.findById.mockReturnValueOnce(userDoc);
    mockedRole.findById.mockReturnValue({ select: (jest.fn() as any).mockResolvedValue({ name: "IT" }) });
    mockedUser.findOne.mockResolvedValue({ _id: "u-khac", email: "trung@example.com" });

    await expect(update("u1", { email: "trung@example.com" }, "admin-1")).rejects.toMatchObject({
      status: 409,
      message: "Email đã được sử dụng",
    });
    expect(userDoc.save).not.toHaveBeenCalled();
  });

  it("gửi lại đúng email HIỆN TẠI của chính mình (không đổi thực chất): KHÔNG check trùng", async () => {
    const userDoc = makeUserDoc({ email: "it01@example.com" });
    mockedUser.findById.mockReturnValueOnce(userDoc);
    mockedRole.findById.mockReturnValue({ select: (jest.fn() as any).mockResolvedValue({ name: "IT" }) });
    mockedUserAudit.create.mockResolvedValue(undefined);
    mockedUser.findById.mockReturnValueOnce({ populate: (jest.fn() as any).mockResolvedValue(userDoc) });

    await update("u1", { email: "it01@example.com" }, "admin-1");

    expect(mockedUser.findOne).not.toHaveBeenCalled();
    expect(userDoc.save).toHaveBeenCalled();
  });
});

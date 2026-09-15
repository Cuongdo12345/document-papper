import bcrypt from "bcrypt";
import { jest } from "@jest/globals";

// DEV-002 — regression test cho SEC-29/RV03-01: resetPassword() phải chặn
// reset mật khẩu của user thuộc role ADMIN/isSystemRole (TEST-005,
// docs/18_TESTING_STRATEGY.md). Mock toàn bộ Model — không dùng DB thật.
jest.mock("../../../models/users/user.model");
jest.mock("../../../models/rbac/role.model");
jest.mock("../../../models/auth/refreshToken.model");
jest.mock("../../../models/users/userAudit.model");
// RBAC MICRO-FIX (getMeService) — mock permission.cache để test getMeService()
// không phụ thuộc logic thật của getUserEffectivePermissions() (đã có test
// riêng cho tầng đó, nếu có — ở đây chỉ verify getMeService REUSE đúng hàm
// này, không tính toán permission trùng lặp).
jest.mock("../../rbac/permission.cache");

import { User } from "../../../models/users/user.model";
import { Role } from "../../../models/rbac/role.model";
import RefreshToken from "../../../models/auth/refreshToken.model";
import UserAudit from "../../../models/users/userAudit.model";
import { getCachedPermissions } from "../../rbac/permission.cache";
import { resetPassword, changePassword, getMeService, updateMeService } from "../users.service";

const mockedUser = User as any;
const mockedRole = Role as any;
const mockedRefreshToken = RefreshToken as any;
const mockedUserAudit = UserAudit as any;
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
});

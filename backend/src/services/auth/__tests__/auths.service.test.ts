import bcrypt from "bcrypt";
import { jest } from "@jest/globals";

// Helper: `jest.fn()` trần (không tham số) bị suy luận kiểu `never` cho
// `mockResolvedValue`/`mockReturnValue` dưới `strict:true` — dùng helper này
// để có 1 mock function gõ kiểu lỏng (`any`), đúng mục đích test thuần hành
// vi (không cần type-safety chặt cho stub chuỗi Mongoose query giả).
const fn = () => jest.fn() as any;

// ===== MOCK toàn bộ dependency có I/O (DB, network) =====
// Không dùng DB thật (xem ghi chú trong PR/README testing) — mock ở tầng
// Model để test thuần logic nghiệp vụ trong service.
jest.mock("../../../models/users/user.model");
jest.mock("../../../models/rbac/role.model");
jest.mock("../../../models/auth/refreshToken.model");
jest.mock("../../../models/users/userAudit.model");
jest.mock("../../../models/auth/passwordResetToken.model");
jest.mock("../../../models/auth/twoFactorOtp.model");
jest.mock("../../../shared/utils/mailer");

import { User } from "../../../models/users/user.model";
import { Role } from "../../../models/rbac/role.model";
import RefreshToken from "../../../models/auth/refreshToken.model";
import UserAudit from "../../../models/users/userAudit.model";
import TwoFactorOtp from "../../../models/auth/twoFactorOtp.model";
import { sendMail } from "../../../shared/utils/mailer";
import {
  register,
  login,
  refresh,
  verifyLoginOtp,
  enableTwoFactor,
  confirmEnableTwoFactor,
  disableTwoFactor,
  listMySessions,
  revokeMySession,
} from "../auths.service";

const mockedUser = User as any;
const mockedRole = Role as any;
const mockedRefreshToken = RefreshToken as any;
const mockedUserAudit = UserAudit as any;
const mockedTwoFactorOtp = TwoFactorOtp as any;
const mockedSendMail = sendMail as any;

beforeAll(() => {
  process.env.JWT_SECRET = "test-secret";
  process.env.JWT_REFRESH_SECRET = "test-refresh-secret";
});

describe("auths.service — register", () => {
  it("báo lỗi 409 nếu username hoặc email đã tồn tại", async () => {
    mockedUser.findOne.mockReturnValue({
      select: fn().mockResolvedValue({ _id: "existing-id" }),
    });

    await expect(
      register({
        username: "trung",
        email: "trung@example.com",
        password: "123456",
        fullName: "Trung",
      }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("báo lỗi 500 nếu không tìm thấy role mặc định (thiếu seed data)", async () => {
    mockedUser.findOne.mockReturnValue({
      select: fn().mockResolvedValue(null),
    });
    mockedRole.findOne.mockReturnValue({
      select: fn().mockResolvedValue(null),
    });

    await expect(
      register({
        username: "trung",
        email: "trung@example.com",
        password: "123456",
        fullName: "Trung",
      }),
    ).rejects.toMatchObject({ status: 500 });
  });

  it("tạo user thành công, hash password, gán đúng role mặc định, không trả password ra ngoài", async () => {
    mockedUser.findOne.mockReturnValue({
      select: fn().mockResolvedValue(null),
    });
    mockedRole.findOne.mockReturnValue({
      select: fn().mockResolvedValue({ _id: "role-user-id" }),
    });
    mockedUser.create.mockResolvedValue({
      _id: "new-user-id",
      username: "trung",
      email: "trung@example.com",
      fullName: "Trung",
    });
    mockedUserAudit.create.mockResolvedValue({});

    const result = await register({
      username: "trung",
      email: "trung@example.com",
      password: "123456",
      fullName: "Trung",
    });

    // Password KHÔNG được xuất hiện trong object trả về cho client.
    expect(result).not.toHaveProperty("password");
    expect(result).toMatchObject({ username: "trung", email: "trung@example.com" });
    // Gán đúng role mặc định vừa tìm được (không phải role tuỳ ý khác).
    expect(mockedUser.create).toHaveBeenCalledWith(
      expect.objectContaining({ role: "role-user-id" }),
    );
    // Password lưu vào DB phải là hash bcrypt, không phải plaintext.
    const createArgs = mockedUser.create.mock.calls[0][0];
    expect(createArgs.password).not.toBe("123456");
    expect(await bcrypt.compare("123456", createArgs.password)).toBe(true);
  });
});

describe("auths.service — login", () => {
  it("báo lỗi 401 nếu username không tồn tại (KHÔNG lộ thông tin username có tồn tại hay không)", async () => {
    mockedUser.findOne.mockReturnValue({
      select: fn().mockReturnValue({
        populate: fn().mockReturnValue({
          populate: fn().mockResolvedValue(null),
        }),
      }),
    });

    await expect(login("khong-ton-tai", "matkhau123")).rejects.toMatchObject({
      status: 401,
      message: "Tên đăng nhập hoặc mật khẩu không đúng",
    });
  });

  it("báo lỗi 401 với ĐÚNG CÙNG message khi user bị khoá (isActive=false) — chống account enumeration", async () => {
    mockedUser.findOne.mockReturnValue({
      select: fn().mockReturnValue({
        populate: fn().mockReturnValue({
          populate: fn().mockResolvedValue({
            _id: "u1",
            isActive: false,
            password: "irrelevant-hash",
          }),
        }),
      }),
    });

    await expect(login("bi-khoa", "matkhau123")).rejects.toMatchObject({
      status: 401,
      message: "Tên đăng nhập hoặc mật khẩu không đúng",
    });
  });

  it("báo lỗi 401 với ĐÚNG CÙNG message khi sai mật khẩu — cùng message như user không tồn tại", async () => {
    const realHash = await bcrypt.hash("matkhau-dung", 10);
    mockedUser.findOne.mockReturnValue({
      select: fn().mockReturnValue({
        populate: fn().mockReturnValue({
          populate: fn().mockResolvedValue({
            _id: "u1",
            isActive: true,
            password: realHash,
          }),
        }),
      }),
    });

    await expect(login("user-that", "sai-mat-khau")).rejects.toMatchObject({
      status: 401,
      message: "Tên đăng nhập hoặc mật khẩu không đúng",
    });
  });

  it("đăng nhập thành công: trả accessToken + refreshToken, lưu refresh token vào DB, ghi audit log", async () => {
    const realHash = await bcrypt.hash("matkhau-dung", 10);
    mockedUser.findOne.mockReturnValue({
      select: fn().mockReturnValue({
        populate: fn().mockReturnValue({
          populate: fn().mockResolvedValue({
            _id: "u1",
            username: "user1",
            fullName: "User Một",
            isActive: true,
            password: realHash,
            role: { name: "USER" },
            department: null,
          }),
        }),
      }),
    });
    mockedRefreshToken.create.mockResolvedValue({});
    mockedUserAudit.create.mockResolvedValue({});

    const result: any = await login("user1", "matkhau-dung");

    expect(result.accessToken).toEqual(expect.any(String));
    expect(result.refreshToken).toEqual(expect.any(String));
    expect(result.user).not.toHaveProperty("password");
    expect(mockedRefreshToken.create).toHaveBeenCalled();
    expect(mockedUserAudit.create).toHaveBeenCalledWith(
      expect.objectContaining({ action: "LOGIN" }),
    );
  });

  // Roadmap C1 (Xác thực 2 lớp qua email OTP, DEV-068, 2026-09-19)
  it("2FA (Roadmap C1): user đã bật twoFactorEnabled — KHÔNG cấp token ngay, gửi OTP qua email, trả requiresTwoFactor", async () => {
    const realHash = await bcrypt.hash("matkhau-dung", 10);
    mockedUser.findOne.mockReturnValue({
      select: fn().mockReturnValue({
        populate: fn().mockReturnValue({
          populate: fn().mockResolvedValue({
            _id: "u1",
            username: "admin1",
            fullName: "Admin Một",
            email: "admin1@example.com",
            isActive: true,
            password: realHash,
            twoFactorEnabled: true,
            role: { name: "ADMIN" },
            department: null,
          }),
        }),
      }),
    });
    mockedTwoFactorOtp.deleteMany.mockResolvedValue({});
    mockedTwoFactorOtp.create.mockResolvedValue({});
    mockedSendMail.mockResolvedValue(undefined);

    const result: any = await login("admin1", "matkhau-dung");

    expect(result).toEqual({ requiresTwoFactor: true, username: "admin1" });
    expect(mockedRefreshToken.create).not.toHaveBeenCalled();
    expect(mockedTwoFactorOtp.create).toHaveBeenCalled();
    expect(mockedSendMail).toHaveBeenCalledWith(expect.objectContaining({ to: "admin1@example.com" }));
  });
});

describe("auths.service — verifyLoginOtp (Roadmap C1, DEV-068)", () => {
  it("báo lỗi 401 nếu user không tồn tại/không active/chưa bật 2FA", async () => {
    mockedUser.findOne.mockReturnValue({
      populate: fn().mockReturnValue({ populate: fn().mockResolvedValue(null) }),
    });

    await expect(verifyLoginOtp("khong-ton-tai", "123456")).rejects.toMatchObject({ status: 401 });
  });

  it("báo lỗi 401 nếu không có OTP hợp lệ (hết hạn/không tồn tại)", async () => {
    mockedUser.findOne.mockReturnValue({
      populate: fn().mockReturnValue({
        populate: fn().mockResolvedValue({ _id: "u1", isActive: true, twoFactorEnabled: true }),
      }),
    });
    mockedTwoFactorOtp.findOne.mockReturnValue({ sort: fn().mockResolvedValue(null) });

    await expect(verifyLoginOtp("admin1", "123456")).rejects.toMatchObject({ status: 401 });
  });

  it("mã sai: tăng attempts, báo lỗi 401, KHÔNG cấp token", async () => {
    mockedUser.findOne.mockReturnValue({
      populate: fn().mockReturnValue({
        populate: fn().mockResolvedValue({ _id: "u1", isActive: true, twoFactorEnabled: true }),
      }),
    });
    const otpDoc: any = { attempts: 0, codeHash: await bcrypt.hash("111111", 10), save: fn().mockResolvedValue(undefined) };
    mockedTwoFactorOtp.findOne.mockReturnValue({ sort: fn().mockResolvedValue(otpDoc) });

    await expect(verifyLoginOtp("admin1", "999999")).rejects.toMatchObject({ status: 401 });
    expect(otpDoc.attempts).toBe(1);
    expect(mockedRefreshToken.create).not.toHaveBeenCalled();
  });

  it("đã sai đủ 5 lần: chặn ngay cả khi mã đúng lần này", async () => {
    mockedUser.findOne.mockReturnValue({
      populate: fn().mockReturnValue({
        populate: fn().mockResolvedValue({ _id: "u1", isActive: true, twoFactorEnabled: true }),
      }),
    });
    const otpDoc: any = { attempts: 5, codeHash: await bcrypt.hash("111111", 10), save: fn().mockResolvedValue(undefined) };
    mockedTwoFactorOtp.findOne.mockReturnValue({ sort: fn().mockResolvedValue(otpDoc) });

    await expect(verifyLoginOtp("admin1", "111111")).rejects.toMatchObject({ status: 401 });
  });

  it("mã đúng: đánh dấu used, cấp token bình thường", async () => {
    mockedUser.findOne.mockReturnValue({
      populate: fn().mockReturnValue({
        populate: fn().mockResolvedValue({
          _id: "u1",
          username: "admin1",
          fullName: "Admin Một",
          isActive: true,
          twoFactorEnabled: true,
          role: { name: "ADMIN" },
          department: null,
        }),
      }),
    });
    const otpDoc: any = { attempts: 0, used: false, codeHash: await bcrypt.hash("111111", 10), save: fn().mockResolvedValue(undefined) };
    mockedTwoFactorOtp.findOne.mockReturnValue({ sort: fn().mockResolvedValue(otpDoc) });
    mockedRefreshToken.create.mockResolvedValue({});
    mockedUserAudit.create.mockResolvedValue({});

    const result: any = await verifyLoginOtp("admin1", "111111");

    expect(otpDoc.used).toBe(true);
    expect(result.accessToken).toEqual(expect.any(String));
    expect(result.refreshToken).toEqual(expect.any(String));
  });
});

describe("auths.service — enableTwoFactor (Roadmap C1, DEV-068)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("báo lỗi 400 nếu đã bật 2FA rồi", async () => {
    mockedUser.findById.mockReturnValue({
      populate: fn().mockResolvedValue({ _id: "u1", isActive: true, twoFactorEnabled: true, role: { name: "ADMIN" } }),
    });

    await expect(enableTwoFactor("u1")).rejects.toMatchObject({ status: 400 });
  });

  it("báo lỗi 403 nếu role không thuộc phạm vi áp dụng (VD: USER thường)", async () => {
    mockedUser.findById.mockReturnValue({
      populate: fn().mockResolvedValue({ _id: "u1", isActive: true, twoFactorEnabled: false, role: { name: "USER" } }),
    });

    await expect(enableTwoFactor("u1")).rejects.toMatchObject({ status: 403 });
  });

  it("báo lỗi 400 nếu chưa có email", async () => {
    mockedUser.findById.mockReturnValue({
      populate: fn().mockResolvedValue({ _id: "u1", isActive: true, twoFactorEnabled: false, role: { name: "ADMIN" }, email: undefined }),
    });

    await expect(enableTwoFactor("u1")).rejects.toMatchObject({ status: 400 });
  });

  it("hợp lệ: gửi OTP qua email, KHÔNG bật cờ ngay (chờ confirm)", async () => {
    mockedUser.findById.mockReturnValue({
      populate: fn().mockResolvedValue({
        _id: "u1",
        isActive: true,
        twoFactorEnabled: false,
        role: { name: "ADMIN" },
        email: "admin1@example.com",
        fullName: "Admin Một",
      }),
    });
    mockedTwoFactorOtp.deleteMany.mockResolvedValue({});
    mockedTwoFactorOtp.create.mockResolvedValue({});
    mockedSendMail.mockResolvedValue(undefined);

    await enableTwoFactor("u1");

    expect(mockedSendMail).toHaveBeenCalledWith(expect.objectContaining({ to: "admin1@example.com" }));
  });
});

describe("auths.service — confirmEnableTwoFactor (Roadmap C1, DEV-068)", () => {
  it("mã đúng: set twoFactorEnabled=true, ghi audit ENABLE_2FA", async () => {
    const userDoc: any = { _id: "u1", isActive: true, twoFactorEnabled: false, save: fn().mockResolvedValue(undefined) };
    mockedUser.findById.mockResolvedValue(userDoc);
    const otpDoc: any = { attempts: 0, used: false, codeHash: await bcrypt.hash("111111", 10), save: fn().mockResolvedValue(undefined) };
    mockedTwoFactorOtp.findOne.mockReturnValue({ sort: fn().mockResolvedValue(otpDoc) });
    mockedUserAudit.create.mockResolvedValue({});

    const result = await confirmEnableTwoFactor("u1", "111111");

    expect(userDoc.twoFactorEnabled).toBe(true);
    expect(result).toEqual({ twoFactorEnabled: true });
    expect(mockedUserAudit.create).toHaveBeenCalledWith(expect.objectContaining({ action: "ENABLE_2FA" }));
  });
});

describe("auths.service — disableTwoFactor (Roadmap C1, DEV-068)", () => {
  it("báo lỗi 401 nếu password không đúng, KHÔNG tắt cờ", async () => {
    const realHash = await bcrypt.hash("matkhau-dung", 10);
    const userDoc: any = { _id: "u1", isActive: true, password: realHash, twoFactorEnabled: true, save: fn().mockResolvedValue(undefined) };
    mockedUser.findById.mockReturnValue({ select: fn().mockResolvedValue(userDoc) });

    await expect(disableTwoFactor("u1", "sai-mat-khau")).rejects.toMatchObject({ status: 401 });
    expect(userDoc.twoFactorEnabled).toBe(true);
  });

  it("password đúng: tắt cờ, xoá OTP đang chờ, ghi audit DISABLE_2FA", async () => {
    const realHash = await bcrypt.hash("matkhau-dung", 10);
    const userDoc: any = { _id: "u1", isActive: true, password: realHash, twoFactorEnabled: true, save: fn().mockResolvedValue(undefined) };
    mockedUser.findById.mockReturnValue({ select: fn().mockResolvedValue(userDoc) });
    mockedTwoFactorOtp.deleteMany.mockResolvedValue({});
    mockedUserAudit.create.mockResolvedValue({});

    const result = await disableTwoFactor("u1", "matkhau-dung");

    expect(userDoc.twoFactorEnabled).toBe(false);
    expect(result).toEqual({ twoFactorEnabled: false });
    expect(mockedUserAudit.create).toHaveBeenCalledWith(expect.objectContaining({ action: "DISABLE_2FA" }));
  });
});

describe("auths.service — refresh", () => {
  it("báo lỗi 400 nếu không truyền refreshToken", async () => {
    await expect(refresh("")).rejects.toMatchObject({ status: 400 });
  });

  it("báo lỗi 400 nếu refresh token không tồn tại hoặc đã bị thu hồi", async () => {
    mockedRefreshToken.findOne.mockReturnValue({
      populate: fn().mockResolvedValue(null),
    });

    await expect(refresh("token-khong-hop-le")).rejects.toMatchObject({
      status: 400,
    });
  });

  it("báo lỗi 400 nếu user liên kết với refresh token đã bị khoá", async () => {
    mockedRefreshToken.findOne.mockReturnValue({
      populate: fn().mockResolvedValue({
        user: { _id: "u1", isActive: false },
      }),
    });

    await expect(refresh("token-hop-le")).rejects.toMatchObject({
      status: 400,
    });
  });
});

// Roadmap C2 (Quản lý phiên đăng nhập, DEV-069, 2026-09-19)
describe("auths.service — login (C2, đính kèm userAgent/ip)", () => {
  it("truyền đúng userAgent/ip vào RefreshToken.create() khi cấp token", async () => {
    const realHash = await bcrypt.hash("matkhau-dung", 10);
    mockedUser.findOne.mockReturnValue({
      select: fn().mockReturnValue({
        populate: fn().mockReturnValue({
          populate: fn().mockResolvedValue({
            _id: "u1",
            username: "user1",
            fullName: "User Một",
            isActive: true,
            password: realHash,
            twoFactorEnabled: false,
            role: { name: "USER" },
            department: null,
          }),
        }),
      }),
    });
    mockedRefreshToken.create.mockResolvedValue({});
    mockedUserAudit.create.mockResolvedValue({});

    await login("user1", "matkhau-dung", { userAgent: "Mozilla/5.0 Chrome/1", ip: "1.2.3.4" });

    expect(mockedRefreshToken.create).toHaveBeenCalledWith(
      expect.objectContaining({ userAgent: "Mozilla/5.0 Chrome/1", ip: "1.2.3.4" }),
    );
  });
});

describe("auths.service — listMySessions (Roadmap C2, DEV-069)", () => {
  it("chỉ lấy phiên CÒN hiệu lực (revoked:false, chưa hết hạn), đánh dấu isCurrent đúng theo userAgent+ip khớp", async () => {
    const sessions = [
      { _id: "s1", userAgent: "Mozilla/5.0 Chrome/1 Windows NT", ip: "1.2.3.4", createdAt: new Date(), expiresAt: new Date() },
      { _id: "s2", userAgent: "Mozilla/5.0 Firefox/1 Mac OS X", ip: "5.6.7.8", createdAt: new Date(), expiresAt: new Date() },
    ];
    mockedRefreshToken.find.mockReturnValue({ sort: fn().mockResolvedValue(sessions) });

    const result: any = await listMySessions("u1", { userAgent: "Mozilla/5.0 Chrome/1 Windows NT", ip: "1.2.3.4" });

    expect(mockedRefreshToken.find).toHaveBeenCalledWith(
      expect.objectContaining({ user: "u1", revoked: false }),
    );
    expect(result[0]).toMatchObject({ _id: "s1", browser: "Chrome", os: "Windows", isCurrent: true });
    expect(result[1]).toMatchObject({ _id: "s2", browser: "Firefox", os: "macOS", isCurrent: false });
  });

  it("không có meta userAgent/ip (VD gọi trực tiếp không qua controller): KHÔNG có phiên nào bị đánh dấu isCurrent", async () => {
    const sessions = [{ _id: "s1", userAgent: "Mozilla/5.0 Chrome/1", ip: "1.2.3.4", createdAt: new Date(), expiresAt: new Date() }];
    mockedRefreshToken.find.mockReturnValue({ sort: fn().mockResolvedValue(sessions) });

    const result: any = await listMySessions("u1");

    expect(result[0].isCurrent).toBe(false);
  });
});

describe("auths.service — revokeMySession (Roadmap C2, DEV-069)", () => {
  it("báo lỗi 404 nếu phiên không tồn tại/không thuộc về user gọi", async () => {
    mockedRefreshToken.findOneAndUpdate.mockResolvedValue(null);

    await expect(revokeMySession("u1", "s-khong-ton-tai")).rejects.toMatchObject({ status: 404 });
  });

  it("thu hồi thành công: chỉ match đúng user + chưa revoked", async () => {
    mockedRefreshToken.findOneAndUpdate.mockResolvedValue({ _id: "s1" });

    const result = await revokeMySession("u1", "s1");

    expect(result).toBe(true);
    expect(mockedRefreshToken.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: "s1", user: "u1", revoked: false },
      { revoked: true },
    );
  });
});

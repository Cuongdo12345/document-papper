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
jest.mock("../../../shared/utils/mailer");

import { User } from "../../../models/users/user.model";
import { Role } from "../../../models/rbac/role.model";
import RefreshToken from "../../../models/auth/refreshToken.model";
import UserAudit from "../../../models/users/userAudit.model";
import { register, login, refresh } from "../auths.service";

const mockedUser = User as any;
const mockedRole = Role as any;
const mockedRefreshToken = RefreshToken as any;
const mockedUserAudit = UserAudit as any;

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

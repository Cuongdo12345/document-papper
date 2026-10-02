/**
 * BR-14 (docs/31_BACKEND_CODE_REVIEW.md, DEV-102, 2026-09-30) — E2E: kiểm tra
 * mã OTP 2FA phải ATOMIC dưới request SONG SONG thật (supertest + MongoDB
 * in-memory). Unit test mock không chứng minh được tính atomic, chỉ DB thật
 * mới lộ ra race đọc-rồi-ghi.
 *
 * Trước khi sửa:
 *   (a) N request sai mã song song cùng đọc `attempts=0` rồi cùng ghi `1` →
 *       vượt giới hạn 5 lần thử;
 *   (b) N request cùng mã ĐÚNG song song cùng thấy `used=false` → 1 mã dùng
 *       được nhiều lần (nhiều phiên đăng nhập / bật 2FA nhiều lần).
 *
 * Không có route/permission mới.
 */
import request from "supertest";
import bcrypt from "bcrypt";
import { startE2EDatabase, stopE2EDatabase } from "./setup";
import { seedRbac, seedDepartments, seedUser } from "./seedTestData";
import { User } from "../../models/users/user.model";
import TwoFactorOtp from "../../models/auth/twoFactorOtp.model";
import RefreshToken from "../../models/auth/refreshToken.model";
import UserAudit from "../../models/users/userAudit.model";

const PASSWORD = "Password123";
const CODE = "123456";
const PARALLEL = 20;

describe("E2E — OTP 2FA atomic dưới request song song (BR-14)", () => {
  let app: import("express").Express;
  let roleIds: Record<string, string>;
  let deptA: string;

  const newOtp = async (userId: any) =>
    TwoFactorOtp.create({
      user: userId,
      codeHash: await bcrypt.hash(CODE, 4),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

  const verifyLogin = (username: string, code: string) =>
    request(app).post("/api/auths/login/verify-otp").send({ username, code });

  beforeAll(async () => {
    await startE2EDatabase();
    app = (await import("../../app")).default;
    roleIds = await seedRbac();
    deptA = (await seedDepartments()).deptA;
  }, 60_000);

  afterAll(async () => {
    await stopE2EDatabase();
  });

  it(`${PARALLEL} request SAI mã song song -> đúng 5 lần được so mã, attempts = 5, sau đó mã ĐÚNG cũng bị chặn`, async () => {
    const user = await seedUser({ username: "otp_brute", password: PASSWORD, fullName: "Brute", roleId: roleIds.ADMIN, departmentId: deptA });
    await User.updateOne({ _id: user._id }, { twoFactorEnabled: true });
    const otp = await newOtp(user._id);

    const results = await Promise.all(Array.from({ length: PARALLEL }, () => verifyLogin("otp_brute", "000000")));

    expect(results.every((r) => r.status === 401)).toBe(true);
    const compared = results.filter((r) => r.body.message === "Mã xác thực không đúng").length;
    expect(compared).toBe(5);
    expect((await TwoFactorOtp.findById(otp._id))!.attempts).toBe(5);

    // Hết lượt: mã đúng cũng không dùng được, và không sinh phiên đăng nhập.
    const right = await verifyLogin("otp_brute", CODE);
    expect(right.status).toBe(401);
    expect(await RefreshToken.countDocuments({ user: user._id })).toBe(0);
  });

  it(`${PARALLEL} request cùng mã ĐÚNG song song (đăng nhập) -> đúng 1 thành công, đúng 1 phiên`, async () => {
    const user = await seedUser({ username: "otp_login", password: PASSWORD, fullName: "Login", roleId: roleIds.ADMIN, departmentId: deptA });
    await User.updateOne({ _id: user._id }, { twoFactorEnabled: true });
    await newOtp(user._id);

    const results = await Promise.all(Array.from({ length: PARALLEL }, () => verifyLogin("otp_login", CODE)));

    expect(results.filter((r) => r.status === 200)).toHaveLength(1);
    expect(results.filter((r) => r.status === 401)).toHaveLength(PARALLEL - 1);
    expect(await RefreshToken.countDocuments({ user: user._id })).toBe(1);
    expect((await TwoFactorOtp.findOne({ user: user._id }))!.used).toBe(true);
  });

  it("mã đúng, 1 request -> vẫn đăng nhập bình thường (đối chứng)", async () => {
    const user = await seedUser({ username: "otp_single", password: PASSWORD, fullName: "Single", roleId: roleIds.ADMIN, departmentId: deptA });
    await User.updateOne({ _id: user._id }, { twoFactorEnabled: true });
    await newOtp(user._id);

    const res = await verifyLogin("otp_single", CODE);
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toEqual(expect.any(String));

    // Dùng lại chính mã đó -> bị chặn.
    expect((await verifyLogin("otp_single", CODE)).status).toBe(401);
  });

  it(`${PARALLEL} request cùng mã ĐÚNG song song (bật 2FA) -> đúng 1 thành công, chỉ 1 dòng audit ENABLE_2FA`, async () => {
    const user = await seedUser({ username: "otp_enable", password: PASSWORD, fullName: "Enable", roleId: roleIds.ADMIN, departmentId: deptA });
    const token = (await request(app).post("/api/auths/login").send({ username: "otp_enable", password: PASSWORD })).body.data.accessToken;
    await newOtp(user._id);

    const results = await Promise.all(
      Array.from({ length: PARALLEL }, () =>
        request(app).post("/api/auths/2fa/confirm").set("Authorization", `Bearer ${token}`).send({ code: CODE }),
      ),
    );

    expect(results.filter((r) => r.status === 200)).toHaveLength(1);
    expect(results.filter((r) => r.status === 400)).toHaveLength(PARALLEL - 1);
    expect((await User.findById(user._id))!.twoFactorEnabled).toBe(true);
    expect(await UserAudit.countDocuments({ user: user._id, action: "ENABLE_2FA" })).toBe(1);
  });
});

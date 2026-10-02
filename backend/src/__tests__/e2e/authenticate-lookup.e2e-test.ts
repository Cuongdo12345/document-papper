/**
 * BR-20 (docs/31_BACKEND_CODE_REVIEW.md, DEV-106, 2026-09-30) — E2E: `authenticate`
 * nay lấy user + role bằng 1 truy vấn `$lookup`. Unit test mock không chứng
 * minh được pipeline chạy đúng trên MongoDB, nên kiểm bằng HTTP THẬT
 * (supertest + MongoDB in-memory): hình dạng `req.user.role` (đặc biệt
 * `isSystemRole` — nền của ADMIN bypass) phải giữ nguyên như bản `populate` cũ.
 *
 * Không có route/permission mới.
 */
import request from "supertest";
import jwt from "jsonwebtoken";
import { startE2EDatabase, stopE2EDatabase } from "./setup";
import { seedRbac, seedDepartments, seedUser } from "./seedTestData";
import { Role } from "../../models/rbac/role.model";
import { User } from "../../models/users/user.model";

const PASSWORD = "Password123";

describe("E2E — authenticate lấy user + role bằng 1 truy vấn (BR-20)", () => {
  let app: import("express").Express;
  let roleIds: Record<string, string>;
  let deptA: string;
  const tokens: Record<string, string> = {};

  const getUsers = (token?: string) => {
    const req = request(app).get("/api/users");
    return token ? req.set("Authorization", `Bearer ${token}`) : req;
  };
  const authLogs = (spy: jest.SpyInstance) => spy.mock.calls.filter((c) => c[0] === "[authenticate] Lỗi xác thực:");

  beforeAll(async () => {
    await startE2EDatabase();
    app = (await import("../../app")).default;
    roleIds = await seedRbac();
    deptA = (await seedDepartments()).deptA;

    await seedUser({ username: "au_admin", password: PASSWORD, fullName: "Admin", roleId: roleIds.ADMIN, departmentId: deptA });
    await seedUser({ username: "au_user", password: PASSWORD, fullName: "User", roleId: roleIds.USER, departmentId: deptA });

    // Role "cũ" trong DB KHÔNG có field isSystemRole (tạo trước DEV-001A): phải coi là false, không được thành ADMIN.
    const legacy = await Role.collection.insertOne({ name: "LEGACY_ROLE", permissions: [] });
    await seedUser({ username: "au_legacy", password: PASSWORD, fullName: "Legacy", roleId: legacy.insertedId.toString(), departmentId: deptA });
    // Role hệ thống KHÔNG có permission nào: chỉ qua được nhờ cờ isSystemRole (ADMIN bypass). Role ADMIN của seed
    // có sẵn mọi permission nên KHÔNG phân biệt được cờ này có đi qua $lookup hay không.
    const sys = await Role.collection.insertOne({ name: "SYS_NO_PERMS", permissions: [], isSystemRole: true });
    await seedUser({ username: "au_sys", password: PASSWORD, fullName: "Hệ thống", roleId: sys.insertedId.toString(), departmentId: deptA });
    await seedUser({ username: "au_disabled", password: PASSWORD, fullName: "Bị khoá", roleId: roleIds.USER, departmentId: deptA });

    for (const u of ["au_admin", "au_user", "au_legacy", "au_sys", "au_disabled"]) {
      tokens[u] = (await request(app).post("/api/auths/login").send({ username: u, password: PASSWORD })).body.data.accessToken;
    }
    await User.updateOne({ username: "au_disabled" }, { isActive: false });
  }, 60_000);

  afterAll(async () => {
    await stopE2EDatabase();
  });

  it("ADMIN (role.isSystemRole = true) -> 200: cờ isSystemRole đi qua $lookup đúng, ADMIN bypass hoạt động", async () => {
    expect((await getUsers(tokens.au_admin)).status).toBe(200);
  });

  it("role isSystemRole = true nhưng KHÔNG có permission -> 200: chỉ nhờ cờ isSystemRole đi qua $lookup (ADMIN bypass)", async () => {
    expect((await getUsers(tokens.au_sys)).status).toBe(200);
  });

  it("USER thường (isSystemRole = false, thiếu USER_VIEW) -> 403 (đã xác thực nhưng không đủ quyền), không phải 401/500", async () => {
    expect((await getUsers(tokens.au_user)).status).toBe(403);
  });

  it("role cũ KHÔNG có field isSystemRole trong DB -> coi là false: 403, không bị nâng thành ADMIN, không lỗi", async () => {
    expect((await getUsers(tokens.au_legacy)).status).toBe(403);
  });

  it("user đã bị vô hiệu hoá sau khi có token -> 401", async () => {
    expect((await getUsers(tokens.au_disabled)).status).toBe(401);
  });

  describe("token lỗi -> 401 và KHÔNG log '[authenticate]' (không còn nhiễu log)", () => {
    let errorSpy: jest.SpyInstance;
    beforeEach(() => {
      errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    });
    afterEach(() => errorSpy.mockRestore());

    it("không có token", async () => {
      expect((await getUsers()).status).toBe(401);
      expect(authLogs(errorSpy)).toHaveLength(0);
    });

    it("token hết hạn", async () => {
      const expired = jwt.sign({ id: "507f1f77bcf86cd799439011" }, process.env.JWT_SECRET!, { algorithm: "HS256", expiresIn: -10 });
      expect((await getUsers(expired)).status).toBe(401);
      expect(authLogs(errorSpy)).toHaveLength(0);
    });

    it("token sai chữ ký", async () => {
      const forged = jwt.sign({ id: "507f1f77bcf86cd799439011" }, "secret-khac", { algorithm: "HS256" });
      expect((await getUsers(forged)).status).toBe(401);
      expect(authLogs(errorSpy)).toHaveLength(0);
    });

    it("request hợp lệ cũng không log gì từ authenticate", async () => {
      expect((await getUsers(tokens.au_admin)).status).toBe(200);
      expect(authLogs(errorSpy)).toHaveLength(0);
    });
  });
});

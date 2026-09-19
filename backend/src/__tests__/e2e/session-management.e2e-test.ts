/**
 * DEV-069 — E2E: Roadmap C2 (Quản lý phiên đăng nhập), qua HTTP THẬT
 * (supertest + MongoDB in-memory), mirror `auth-rbac.e2e-test.ts` (DEV-048).
 *
 * [CẬP NHẬT 2026-09-19, CLAUDE.md §18] Route mới có ý nghĩa bảo mật (ADMIN
 * xem/thu hồi phiên đăng nhập của user KHÁC) PHẢI verify bằng request HTTP
 * thật xác nhận user KHÔNG có permission bị chặn đúng (403) — không chỉ giả
 * định "đã thêm middleware là xong". File này verify:
 *   - `GET /api/users/:id/sessions`      — permission `SESSION_VIEW_ALL`  (user.routes.ts:158)
 *   - `DELETE /api/users/:id/sessions/:sessionId` — permission `SESSION_REVOKE_ALL` (user.routes.ts:165)
 *
 * Mỗi `it()` tự seed user RIÊNG (username duy nhất) thay vì dùng chung 1 user
 * xuyên suốt file — vì các phiên (`RefreshToken`) TÍCH LUỸ qua từng lần đăng
 * nhập trong CÙNG 1 test suite (không có `clearE2EDatabase()` giữa các test,
 * để giữ nguyên RBAC đã seed 1 lần ở `beforeAll`), test nào đếm SỐ LƯỢNG/nội
 * dung phiên chính xác sẽ sai nếu dùng chung user với test khác.
 */
import request from "supertest";
import { startE2EDatabase, stopE2EDatabase } from "./setup";
import { seedRbac, seedUser } from "./seedTestData";

const PASSWORD = "Password123";
const CHROME_WINDOWS_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";
const FIREFOX_LINUX_UA = "Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0";

describe("E2E — Roadmap C2 (Quản lý phiên đăng nhập, DEV-069)", () => {
  let app: import("express").Express;
  let roleIds: Record<string, string>;
  let seq = 0;

  beforeAll(async () => {
    await startE2EDatabase();
    app = (await import("../../app")).default;
    roleIds = await seedRbac();
  }, 60_000);

  afterAll(async () => {
    await stopE2EDatabase();
  });

  /** Seed 1 user MỚI, username DUY NHẤT — cô lập session state giữa các test. */
  const seedFreshUser = async (roleName: "USER" | "ADMIN") => {
    seq += 1;
    const user = await seedUser({
      username: `session_${roleName.toLowerCase()}_${seq}`,
      password: PASSWORD,
      fullName: `${roleName} test #${seq}`,
      roleId: roleIds[roleName],
    });
    return (user as any)._id.toString();
  };

  const loginAs = (username: string, userAgent = CHROME_WINDOWS_UA) =>
    request(app).post("/api/auths/login").set("User-Agent", userAgent).send({ username, password: PASSWORD });

  it("đăng nhập ghi lại userAgent/ip; GET /auths/sessions (self) trả đúng phiên, isCurrent=true khi cùng User-Agent", async () => {
    await seedFreshUser("USER");
    const username = `session_user_${seq}`;
    const loginRes = await loginAs(username, CHROME_WINDOWS_UA);
    expect(loginRes.status).toBe(200);
    const token = loginRes.body.data.accessToken;

    const listRes = await request(app)
      .get("/api/auths/sessions")
      .set("Authorization", `Bearer ${token}`)
      .set("User-Agent", CHROME_WINDOWS_UA);

    expect(listRes.status).toBe(200);
    expect(listRes.body.data).toHaveLength(1);
    expect(listRes.body.data[0]).toMatchObject({ browser: "Chrome", os: "Windows", isCurrent: true });
  });

  it("đăng nhập từ 2 'thiết bị' khác nhau (2 User-Agent) → 2 phiên riêng biệt, đúng browser/os từng cái", async () => {
    await seedFreshUser("USER");
    const username = `session_user_${seq}`;
    await loginAs(username, CHROME_WINDOWS_UA);
    const secondLogin = await loginAs(username, FIREFOX_LINUX_UA);
    const token = secondLogin.body.data.accessToken;

    const listRes = await request(app).get("/api/auths/sessions").set("Authorization", `Bearer ${token}`);

    expect(listRes.status).toBe(200);
    const browsers = listRes.body.data.map((s: any) => s.browser).sort();
    expect(browsers).toEqual(["Chrome", "Firefox"]);
  });

  it("🔒 DELETE /auths/sessions/:id (self) thu hồi đúng phiên; refresh-token bằng phiên đã thu hồi → 400", async () => {
    await seedFreshUser("USER");
    const username = `session_user_${seq}`;
    const loginRes = await loginAs(username, CHROME_WINDOWS_UA);
    const token = loginRes.body.data.accessToken;
    const refreshToken = loginRes.body.data.refreshToken;

    const listRes = await request(app).get("/api/auths/sessions").set("Authorization", `Bearer ${token}`);
    expect(listRes.body.data).toHaveLength(1);
    const sessionId = listRes.body.data[0]._id;

    const revokeRes = await request(app)
      .delete(`/api/auths/sessions/${sessionId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(revokeRes.status).toBe(200);

    const refreshRes = await request(app).post("/api/auths/refresh-token").send({ refreshToken });
    expect(refreshRes.status).toBe(400);
  });

  it("🔒 GET /api/users/:id/sessions — USER thường KHÔNG có SESSION_VIEW_ALL → 403", async () => {
    const targetId = await seedFreshUser("ADMIN");
    await seedFreshUser("USER");
    const username = `session_user_${seq}`;
    const loginRes = await loginAs(username);
    const token = loginRes.body.data.accessToken;

    const res = await request(app).get(`/api/users/${targetId}/sessions`).set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  it("🔒 DELETE /api/users/:id/sessions/:sessionId — USER thường KHÔNG có SESSION_REVOKE_ALL → 403", async () => {
    const targetId = await seedFreshUser("ADMIN");
    await seedFreshUser("USER");
    const username = `session_user_${seq}`;
    const loginRes = await loginAs(username);
    const token = loginRes.body.data.accessToken;

    const res = await request(app)
      .delete(`/api/users/${targetId}/sessions/000000000000000000000000`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  it("ADMIN (isSystemRole=true) CÓ SESSION_VIEW_ALL/SESSION_REVOKE_ALL — xem + thu hồi được phiên của user khác → 200", async () => {
    const targetUserId = await seedFreshUser("USER");
    const targetUsername = `session_user_${seq}`;
    const userLoginRes = await loginAs(targetUsername, CHROME_WINDOWS_UA);
    expect(userLoginRes.status).toBe(200);

    await seedFreshUser("ADMIN");
    const adminUsername = `session_admin_${seq}`;
    const adminLoginRes = await loginAs(adminUsername);
    const adminToken = adminLoginRes.body.data.accessToken;

    const viewRes = await request(app)
      .get(`/api/users/${targetUserId}/sessions`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(viewRes.status).toBe(200);
    expect(viewRes.body.data).toHaveLength(1);
    // ADMIN xem HỘ — không có field isCurrent (KHÁC self-service).
    expect(viewRes.body.data[0]).not.toHaveProperty("isCurrent");

    const targetSessionId = viewRes.body.data[0]._id;
    const revokeRes = await request(app)
      .delete(`/api/users/${targetUserId}/sessions/${targetSessionId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(revokeRes.status).toBe(200);

    const viewAfterRes = await request(app)
      .get(`/api/users/${targetUserId}/sessions`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(viewAfterRes.body.data).toHaveLength(0);
  });

  it("🔒 route cần đăng nhập mà KHÔNG kèm token → 401 (GET /auths/sessions và GET /users/:id/sessions)", async () => {
    const targetId = await seedFreshUser("USER");

    const res1 = await request(app).get("/api/auths/sessions");
    expect(res1.status).toBe(401);

    const res2 = await request(app).get(`/api/users/${targetId}/sessions`);
    expect(res2.status).toBe(401);
  });

  /* =====================================================================
     Roadmap C3 (Giám sát phiên đăng nhập toàn hệ thống, DEV-070, 2026-09-19)
     — GET /api/users/sessions, dùng LẠI permission SESSION_VIEW_ALL (không
     có permission mới để verify riêng — test 403 dưới đây verify ĐÚNG route
     mới `/sessions` bị chặn, không phải verify permission mới).
  ===================================================================== */

  it("🔒 GET /api/users/sessions (C3, DEV-070) — USER thường KHÔNG có SESSION_VIEW_ALL → 403", async () => {
    await seedFreshUser("USER");
    const username = `session_user_${seq}`;
    const loginRes = await loginAs(username);
    const token = loginRes.body.data.accessToken;

    const res = await request(app).get("/api/users/sessions").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it("GET /api/users/sessions (C3, DEV-070) — ADMIN xem được phiên của NHIỀU user cùng lúc, kèm thông tin user; `search` lọc đúng theo username", async () => {
    await seedFreshUser("USER");
    const userAUsername = `session_user_${seq}`;
    await loginAs(userAUsername, CHROME_WINDOWS_UA);

    await seedFreshUser("USER");
    const userBUsername = `session_user_${seq}`;
    await loginAs(userBUsername, FIREFOX_LINUX_UA);

    await seedFreshUser("ADMIN");
    const adminUsername = `session_admin_${seq}`;
    const adminLoginRes = await loginAs(adminUsername);
    const adminToken = adminLoginRes.body.data.accessToken;

    // Không filter: thấy được phiên của CẢ userA, userB VÀ chính admin vừa login.
    const allRes = await request(app).get("/api/users/sessions").set("Authorization", `Bearer ${adminToken}`);
    expect(allRes.status).toBe(200);
    expect(allRes.body.data.length).toBeGreaterThanOrEqual(3);
    expect(allRes.body.data[0].user).toHaveProperty("username");
    expect(allRes.body.pagination).toMatchObject({ page: 1 });

    // Filter search=userA: CHỈ trả đúng 1 phiên của userA.
    const searchRes = await request(app)
      .get("/api/users/sessions")
      .query({ search: userAUsername })
      .set("Authorization", `Bearer ${adminToken}`);
    expect(searchRes.status).toBe(200);
    expect(searchRes.body.data).toHaveLength(1);
    expect(searchRes.body.data[0].user.username).toBe(userAUsername);
  });

  it("🔒 GET /api/users/sessions (C3, DEV-070) — không kèm token → 401", async () => {
    const res = await request(app).get("/api/users/sessions");
    expect(res.status).toBe(401);
  });
});

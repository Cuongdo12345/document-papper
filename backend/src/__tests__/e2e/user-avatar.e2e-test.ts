/**
 * DEV-079 — E2E: Avatar (upload/sửa/xoá ảnh đại diện), qua HTTP THẬT
 * (supertest + MongoDB in-memory), mirror `session-management.e2e-test.ts`
 * (DEV-069).
 *
 * CLAUDE.md §18 — route mới (`PATCH /users/:id/avatar`, `DELETE
 * /users/:id/avatar`) dùng LẠI permission `USER_UPDATE` (không phải
 * permission mới), nhưng vẫn PHẢI verify bằng request HTTP thật xác nhận
 * user KHÔNG có permission bị chặn đúng (403) — không chỉ giả định "cùng
 * permission với route đã có là an toàn".
 */
import request from "supertest";
import { startE2EDatabase, stopE2EDatabase } from "./setup";
import { seedRbac, seedUser } from "./seedTestData";

const PASSWORD = "Password123";
// PNG 1x1 hợp lệ tối thiểu (khớp DTO test, `users.dto.test.ts`).
const VALID_AVATAR =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

describe("E2E — Avatar (DEV-079)", () => {
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

  const seedFreshUser = async (roleName: "USER" | "ADMIN") => {
    seq += 1;
    const user = await seedUser({
      username: `avatar_${roleName.toLowerCase()}_${seq}`,
      password: PASSWORD,
      fullName: `${roleName} test #${seq}`,
      roleId: roleIds[roleName],
    });
    return (user as any)._id.toString();
  };

  const loginAs = (username: string) => request(app).post("/api/auths/login").send({ username, password: PASSWORD });

  it("PATCH /users/me/avatar — user tự cập nhật avatar của chính mình → 200, GET /users/me trả kèm avatar", async () => {
    await seedFreshUser("USER");
    const username = `avatar_user_${seq}`;
    const loginRes = await loginAs(username);
    const token = loginRes.body.data.accessToken;

    const updateRes = await request(app)
      .patch("/api/users/me/avatar")
      .set("Authorization", `Bearer ${token}`)
      .send({ avatar: VALID_AVATAR });
    expect(updateRes.status).toBe(200);

    const meRes = await request(app).get("/api/users/me").set("Authorization", `Bearer ${token}`);
    expect(meRes.body.data.avatar).toBe(VALID_AVATAR);
  });

  it("DELETE /users/me/avatar — user tự xoá avatar → GET /users/me không còn avatar", async () => {
    await seedFreshUser("USER");
    const username = `avatar_user_${seq}`;
    const token = (await loginAs(username)).body.data.accessToken;

    await request(app).patch("/api/users/me/avatar").set("Authorization", `Bearer ${token}`).send({ avatar: VALID_AVATAR });
    const deleteRes = await request(app).delete("/api/users/me/avatar").set("Authorization", `Bearer ${token}`);
    expect(deleteRes.status).toBe(200);

    const meRes = await request(app).get("/api/users/me").set("Authorization", `Bearer ${token}`);
    expect(meRes.body.data.avatar).toBeUndefined();
  });

  it("PATCH /users/me/avatar — data URI không hợp lệ (sai MIME) → 400, KHÔNG cập nhật", async () => {
    await seedFreshUser("USER");
    const username = `avatar_user_${seq}`;
    const token = (await loginAs(username)).body.data.accessToken;

    const res = await request(app)
      .patch("/api/users/me/avatar")
      .set("Authorization", `Bearer ${token}`)
      .send({ avatar: "data:image/gif;base64,AAAA" });
    expect(res.status).toBe(400);
  });

  it("🔒 PATCH /users/:id/avatar — USER thường KHÔNG có USER_UPDATE → 403", async () => {
    const targetId = await seedFreshUser("USER");
    await seedFreshUser("USER");
    const username = `avatar_user_${seq}`;
    const token = (await loginAs(username)).body.data.accessToken;

    const res = await request(app)
      .patch(`/api/users/${targetId}/avatar`)
      .set("Authorization", `Bearer ${token}`)
      .send({ avatar: VALID_AVATAR });

    expect(res.status).toBe(403);
  });

  it("🔒 DELETE /users/:id/avatar — USER thường KHÔNG có USER_UPDATE → 403", async () => {
    const targetId = await seedFreshUser("USER");
    await seedFreshUser("USER");
    const username = `avatar_user_${seq}`;
    const token = (await loginAs(username)).body.data.accessToken;

    const res = await request(app).delete(`/api/users/${targetId}/avatar`).set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  it("ADMIN (isSystemRole=true) CÓ USER_UPDATE — đặt/xoá avatar cho user khác → 200, dữ liệu đổi đúng", async () => {
    const targetId = await seedFreshUser("USER");
    await seedFreshUser("ADMIN");
    const adminUsername = `avatar_admin_${seq}`;
    const adminToken = (await loginAs(adminUsername)).body.data.accessToken;

    const setRes = await request(app)
      .patch(`/api/users/${targetId}/avatar`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ avatar: VALID_AVATAR });
    expect(setRes.status).toBe(200);

    const detailRes = await request(app).get(`/api/users/${targetId}`).set("Authorization", `Bearer ${adminToken}`);
    expect(detailRes.body.data.avatar).toBe(VALID_AVATAR);

    const deleteRes = await request(app)
      .delete(`/api/users/${targetId}/avatar`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(deleteRes.status).toBe(200);

    const detailAfterRes = await request(app).get(`/api/users/${targetId}`).set("Authorization", `Bearer ${adminToken}`);
    expect(detailAfterRes.body.data.avatar).toBeUndefined();
  });

  it("GET /users (list) KHÔNG trả kèm avatar dù user đã đặt avatar (tránh phồng payload)", async () => {
    const targetId = await seedFreshUser("USER");
    await seedFreshUser("ADMIN");
    const adminUsername = `avatar_admin_${seq}`;
    const adminToken = (await loginAs(adminUsername)).body.data.accessToken;

    await request(app)
      .patch(`/api/users/${targetId}/avatar`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ avatar: VALID_AVATAR });

    const listRes = await request(app).get("/api/users").set("Authorization", `Bearer ${adminToken}`);
    expect(listRes.status).toBe(200);
    const target = listRes.body.data.find((u: any) => u._id === targetId);
    expect(target).toBeDefined();
    expect(target.avatar).toBeUndefined();
  });

  it("🔒 route cần đăng nhập mà KHÔNG kèm token → 401 (PATCH /users/me/avatar và PATCH /users/:id/avatar)", async () => {
    const targetId = await seedFreshUser("USER");

    const res1 = await request(app).patch("/api/users/me/avatar").send({ avatar: VALID_AVATAR });
    expect(res1.status).toBe(401);

    const res2 = await request(app).patch(`/api/users/${targetId}/avatar`).send({ avatar: VALID_AVATAR });
    expect(res2.status).toBe(401);
  });
});

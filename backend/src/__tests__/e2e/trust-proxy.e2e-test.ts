/**
 * BR-08 (docs/31_BACKEND_CODE_REVIEW.md, DEV-096, 2026-09-29) — E2E:
 * `TRUST_PROXY=1` → `req.ip` lấy IP người dùng từ `X-Forwarded-For` (do
 * proxy thêm vào), nên (1) IP lưu ở "Phiên đăng nhập" đúng IP thật và
 * (2) rate limit đăng nhập đếm RIÊNG từng người dùng thay vì chung 1 bộ đếm
 * cho IP của proxy. Qua HTTP THẬT (supertest + MongoDB in-memory).
 *
 * supertest kết nối thẳng từ 127.0.0.1 — đóng vai đúng 1 lớp proxy (Nginx)
 * gửi `X-Forwarded-For: <IP người dùng>`.
 *
 * Mặc định tắt (TRUST_PROXY bỏ trống) được kiểm ở unit test
 * `trustProxy.util.test.ts` và ở mọi file E2E khác (không đặt biến này).
 */
import request from "supertest";
import { startE2EDatabase, stopE2EDatabase } from "./setup";
import { seedRbac, seedUser } from "./seedTestData";

const PASSWORD = "Password123";

describe("E2E — trust proxy qua ENV TRUST_PROXY (BR-08)", () => {
  let app: import("express").Express;
  const original = process.env.TRUST_PROXY;

  beforeAll(async () => {
    process.env.TRUST_PROXY = "1"; // PHẢI đặt trước khi import app
    await startE2EDatabase();
    app = (await import("../../app")).default;
    const roleIds = await seedRbac();
    await seedUser({ username: "proxy_user", password: PASSWORD, fullName: "Proxy user", roleId: roleIds.USER });
  }, 60_000);

  afterAll(async () => {
    if (original === undefined) delete process.env.TRUST_PROXY;
    else process.env.TRUST_PROXY = original;
    await stopE2EDatabase();
  });

  const loginFrom = (ip: string, password = PASSWORD) =>
    request(app)
      .post("/api/auths/login")
      .set("X-Forwarded-For", ip)
      .send({ username: "proxy_user", password });

  it("app nhận đúng cấu hình", () => {
    expect(app.get("trust proxy")).toBe(1);
  });

  it("IP ở 'Phiên đăng nhập' là IP người dùng trong X-Forwarded-For, không phải IP proxy", async () => {
    const login = await loginFrom("203.0.113.7");
    expect(login.status).toBe(200);

    const sessions = await request(app)
      .get("/api/auths/sessions")
      .set("Authorization", `Bearer ${login.body.data.accessToken}`)
      .set("X-Forwarded-For", "203.0.113.7");
    expect(sessions.status).toBe(200);
    const ips = (sessions.body.data as { ip: string }[]).map((s) => s.ip);
    expect(ips).toContain("203.0.113.7");
  });

  it("client tự gửi thêm IP giả ở đầu X-Forwarded-For -> vẫn lấy IP proxy thêm vào (không giả được)", async () => {
    // Proxy (1 lớp) nối IP thật vào CUỐI: "<giả>, <thật>" — Express chỉ tin 1 hop từ phải.
    const login = await request(app)
      .post("/api/auths/login")
      .set("X-Forwarded-For", "1.1.1.1, 198.51.100.9")
      .send({ username: "proxy_user", password: PASSWORD });
    expect(login.status).toBe(200);

    const sessions = await request(app)
      .get("/api/auths/sessions")
      .set("Authorization", `Bearer ${login.body.data.accessToken}`);
    const ips = (sessions.body.data as { ip: string }[]).map((s) => s.ip);
    expect(ips).toContain("198.51.100.9");
    expect(ips).not.toContain("1.1.1.1");
  });

  it("rate limit đăng nhập đếm RIÊNG theo IP người dùng", async () => {
    const a1 = await loginFrom("192.0.2.10", "sai-mat-khau");
    const a2 = await loginFrom("192.0.2.10", "sai-mat-khau");
    const b1 = await loginFrom("192.0.2.20", "sai-mat-khau");

    const remaining = (res: request.Response) => Number(res.headers["ratelimit-remaining"]);
    expect(remaining(a2)).toBe(remaining(a1) - 1); // cùng người dùng: bộ đếm giảm dần
    expect(remaining(b1)).toBe(remaining(a1)); // người khác: bộ đếm riêng, không bị ăn chung
  });
});

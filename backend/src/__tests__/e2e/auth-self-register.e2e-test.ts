/**
 * BR-01 (docs/31_BACKEND_CODE_REVIEW.md, 2026-09-29) — E2E: route tự đăng ký
 * `POST /api/auths/register` mặc định TẮT, chỉ bật khi ENV
 * `ALLOW_SELF_REGISTER=true`. Qua HTTP THẬT (supertest + MongoDB in-memory).
 */
import request from "supertest";
import { startE2EDatabase, stopE2EDatabase } from "./setup";
import { seedRbac } from "./seedTestData";
import { User } from "../../models/users/user.model";

const body = {
  username: "self_reg_user",
  email: "self_reg@example.com",
  password: "Password123",
  confirmPassword: "Password123",
  fullName: "Tự đăng ký (test)",
};

describe("E2E — Tự đăng ký tài khoản bật/tắt bằng ENV (BR-01)", () => {
  let app: import("express").Express;
  const original = process.env.ALLOW_SELF_REGISTER;

  beforeAll(async () => {
    await startE2EDatabase();
    app = (await import("../../app")).default;
    await seedRbac();
  }, 60_000);

  afterEach(() => {
    if (original === undefined) delete process.env.ALLOW_SELF_REGISTER;
    else process.env.ALLOW_SELF_REGISTER = original;
  });

  afterAll(async () => {
    await stopE2EDatabase();
  });

  it("không đặt ENV -> 404, không tạo user", async () => {
    delete process.env.ALLOW_SELF_REGISTER;
    const res = await request(app).post("/api/auths/register").send(body);
    expect(res.status).toBe(404);
    expect(await User.countDocuments({ username: body.username })).toBe(0);
  });

  it('ENV khác "true" (vd "1", "TRUE") -> vẫn 404', async () => {
    for (const value of ["1", "TRUE", "false", ""]) {
      process.env.ALLOW_SELF_REGISTER = value;
      const res = await request(app).post("/api/auths/register").send(body);
      expect(res.status).toBe(404);
    }
    expect(await User.countDocuments({ username: body.username })).toBe(0);
  });

  it("tắt thì chặn trước validate: body rỗng vẫn 404 (không lộ 400 schema)", async () => {
    delete process.env.ALLOW_SELF_REGISTER;
    const res = await request(app).post("/api/auths/register").send({});
    expect(res.status).toBe(404);
  });

  it('ALLOW_SELF_REGISTER="true" -> 201, tạo user role USER, đăng nhập được', async () => {
    process.env.ALLOW_SELF_REGISTER = "true";
    const res = await request(app).post("/api/auths/register").send(body);
    expect(res.status).toBe(201);

    const user = await User.findOne({ username: body.username }).populate("role", "name");
    expect(user).not.toBeNull();
    expect((user!.role as any).name).toBe("USER");

    const login = await request(app).post("/api/auths/login").send({ username: body.username, password: body.password });
    expect(login.status).toBe(200);
  });
});

/**
 * BR-12 (docs/31_BACKEND_CODE_REVIEW.md, DEV-101, 2026-09-30) — E2E: ô tìm
 * kiếm user và tìm phiên đăng nhập escape ký tự regex, qua HTTP THẬT.
 * Trước khi sửa, `keyword="("` làm MongoDB báo lỗi regex → 500, và ký tự như
 * `.` được hiểu là "bất kỳ ký tự nào" thay vì khớp đúng chữ người dùng gõ.
 *
 * Không có route/permission mới.
 */
import request from "supertest";
import { startE2EDatabase, stopE2EDatabase } from "./setup";
import { seedRbac, seedDepartments, seedUser } from "./seedTestData";

const PASSWORD = "Password123";

describe("E2E — Tìm kiếm user / phiên đăng nhập escape regex (BR-12)", () => {
  let app: import("express").Express;
  let token: string;

  const get = (url: string) => request(app).get(url).set("Authorization", `Bearer ${token}`);
  const usernames = (res: request.Response) => res.body.data.map((u: any) => u.username).sort();

  beforeAll(async () => {
    await startE2EDatabase();
    app = (await import("../../app")).default;
    const roleIds = await seedRbac();
    const { deptA } = await seedDepartments();

    await seedUser({ username: "br12_admin", password: PASSWORD, fullName: "Admin", roleId: roleIds.ADMIN, departmentId: deptA });
    // Username chỉ gồm [a-zA-Z0-9_] (LoginDTO/CreateUserDTO), nên keyword có "." không bao giờ khớp thật.
    // Nếu KHÔNG escape, "br12.axb" vẫn khớp "br12_axb" vì dấu chấm = bất kỳ ký tự.
    await seedUser({ username: "br12_axb", password: PASSWORD, fullName: "Khác", roleId: roleIds.USER, departmentId: deptA });
    await seedUser({ username: "br12_ngoac", password: PASSWORD, fullName: "Tên (có ngoặc)", roleId: roleIds.USER, departmentId: deptA });

    token = (await request(app).post("/api/auths/login").send({ username: "br12_admin", password: PASSWORD })).body.data.accessToken;
    // Tạo 1 phiên đăng nhập còn hạn cho user có ngoặc trong fullName.
    await request(app).post("/api/auths/login").send({ username: "br12_ngoac", password: PASSWORD });
  }, 60_000);

  afterAll(async () => {
    await stopE2EDatabase();
  });

  it("GET /users?keyword=( -> 200 (trước đây 500 do lỗi regex)", async () => {
    const res = await get("/api/users?keyword=(");
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it("GET /users?keyword=br12.axb -> dấu chấm khớp đúng chữ, KHÔNG khớp 'br12_axb'", async () => {
    const res = await get("/api/users?keyword=br12.axb");
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it("GET /users?keyword=br12_ -> tìm thường vẫn hoạt động (đối chứng)", async () => {
    const res = await get("/api/users?keyword=br12_");
    expect(res.status).toBe(200);
    expect(usernames(res)).toEqual(["br12_admin", "br12_axb", "br12_ngoac"]);
  });

  it("GET /users/sessions?search=(có ngoặc) -> 200, khớp đúng phiên của user có ngoặc trong tên", async () => {
    const res = await get(`/api/users/sessions?search=${encodeURIComponent("(có ngoặc)")}`);
    expect(res.status).toBe(200);
    expect(res.body.data.map((s: any) => s.user.username)).toEqual(["br12_ngoac"]);
  });

  it("GET /users/sessions?search=[ -> 200 rỗng (trước đây 500)", async () => {
    const res = await get("/api/users/sessions?search=[");
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });
});

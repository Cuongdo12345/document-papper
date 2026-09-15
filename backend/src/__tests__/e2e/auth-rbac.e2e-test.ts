/**
 * DEV-048 — E2E #1: Auth + RBAC + department-scoping, qua HTTP THẬT
 * (supertest + MongoDB in-memory, KHÔNG mock bất kỳ tầng nào — request đi
 * xuyên suốt authenticate → authorizePermission → controller → service →
 * DB → response, đúng như production).
 *
 * Đây là lần ĐẦU TIÊN trong lịch sử dự án các luồng này được xác nhận bằng
 * request HTTP thật thay vì chỉ unit test (mock) hoặc đọc code tĩnh — xem
 * `docs/30_DEVELOPMENT_COMPLETION_AUDIT.md` Mục 6/9 #5 ("0 HTTP/E2E test
 * trên 116 endpoint").
 */
import request from "supertest";
import { startE2EDatabase, stopE2EDatabase } from "./setup";
import { seedRbac, seedDepartments, seedUser } from "./seedTestData";

const PASSWORD = "Password123";

describe("E2E — Auth + RBAC + department-scoping", () => {
  let app: import("express").Express;
  let deptA: string;
  let deptB: string;

  beforeAll(async () => {
    await startE2EDatabase();
    // Import `app` SAU KHI DB in-memory đã sẵn sàng + ENV đã set — nhiều
    // module (route/middleware) chỉ đọc `process.env`/kết nối mongoose ở
    // thời điểm import hoặc gọi hàm, không phải lúc load module (an toàn),
    // nhưng import muộn giữ code dễ hiểu (thứ tự phụ thuộc rõ ràng).
    app = (await import("../../app")).default;

    const roleIds = await seedRbac();
    const depts = await seedDepartments();
    deptA = depts.deptA;
    deptB = depts.deptB;

    // Cả 2 đều role USER (có DOCUMENT_CREATE + DOCUMENT_VIEW), khác phòng
    // ban — đúng điều kiện tối thiểu để test department-scoping.
    await seedUser({
      username: "user_a",
      password: PASSWORD,
      fullName: "Nhân viên khoa A (test)",
      roleId: roleIds["USER"],
      departmentId: deptA,
    });
    await seedUser({
      username: "user_b",
      password: PASSWORD,
      fullName: "Nhân viên khoa B (test)",
      roleId: roleIds["USER"],
      departmentId: deptB,
    });
    await seedUser({
      username: "admin_test",
      password: PASSWORD,
      fullName: "Admin (test)",
      roleId: roleIds["ADMIN"],
    });
  }, 60_000);

  afterAll(async () => {
    await stopE2EDatabase();
  });

  const login = (username: string) =>
    request(app).post("/api/auths/login").send({ username, password: PASSWORD });

  it("sai mật khẩu → 401, message trung tính (không lộ 'user không tồn tại' vs 'sai mật khẩu')", async () => {
    const res = await request(app)
      .post("/api/auths/login")
      .send({ username: "user_a", password: "sai-mat-khau" });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/không đúng/i);
  });

  it("đăng nhập đúng → 200, trả accessToken + refreshToken", async () => {
    const res = await login("user_a");

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toEqual(expect.any(String));
    expect(res.body.data.refreshToken).toEqual(expect.any(String));
  });

  it("🔒 gọi route cần đăng nhập mà KHÔNG kèm token → 401", async () => {
    const res = await request(app).get("/api/documents");
    expect(res.status).toBe(401);
  });

  it("🔒 đăng nhập nhưng KHÔNG đủ permission → 403 (USER thường không có WORKFLOW_TEMPLATE_CREATE)", async () => {
    const loginRes = await login("user_b");
    const token = loginRes.body.data.accessToken;

    const res = await request(app)
      .post("/api/workflows/templates")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Template test", steps: [{ stepOrder: 1, name: "B1", role: "IT" }] });

    expect(res.status).toBe(403);
  });

  it("🔒 department-scoping (DEV-030/040/041): user khoa B KHÔNG thấy Document của khoa A trong danh sách", async () => {
    const loginA = await login("user_a");
    const tokenA = loginA.body.data.accessToken;

    const createRes = await request(app)
      .post("/api/documents/proposal")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({
        category: "PROPOSAL",
        subType: "PROPOSE_INK",
        title: "Đề xuất mực in — khoa A (E2E)",
        department: deptA,
        meta: { items: [], totalAmount: 0 },
      });
    expect(createRes.status).toBe(201);

    const loginB = await login("user_b");
    const tokenB = loginB.body.data.accessToken;

    const listRes = await request(app)
      .get("/api/documents")
      .set("Authorization", `Bearer ${tokenB}`);

    expect(listRes.status).toBe(200);
    const titles = listRes.body.data.map((d: any) => d.title);
    expect(titles).not.toContain("Đề xuất mực in — khoa A (E2E)");
  });

  it("ADMIN (isSystemRole=true, DEV-047): xem được Document của MỌI khoa, không bị ép filter", async () => {
    const loginAdmin = await login("admin_test");
    const tokenAdmin = loginAdmin.body.data.accessToken;

    const listRes = await request(app)
      .get("/api/documents")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(listRes.status).toBe(200);
    const titles = listRes.body.data.map((d: any) => d.title);
    expect(titles).toContain("Đề xuất mực in — khoa A (E2E)");
  });
});

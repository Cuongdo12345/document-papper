/**
 * DEV-086 — E2E: xoá mềm/khôi phục/xoá nhiều Khoa/Phòng, qua HTTP THẬT
 * (supertest + MongoDB in-memory). `deleteDepartmentService` đổi từ
 * hard-delete sang soft-delete; `DEPARTMENT_RESTORE` là permission MỚI trên
 * 3 route MỚI (`PATCH /:id/restore`, `POST /bulk-delete`, `POST
 * /bulk-restore`) — theo CLAUDE.md §18, PHẢI verify 401/403 thật, không chỉ
 * giả định middleware đã đúng.
 */
import request from "supertest";
import { startE2EDatabase, stopE2EDatabase } from "./setup";
import { seedDepartments, seedRbac, seedUser } from "./seedTestData";
import { clearCacheKey } from "../../shared/cache/memoryCache";

const PASSWORD = "Password123";

describe("E2E — Khoa/Phòng: xoá mềm/khôi phục/xoá nhiều (DEV-086)", () => {
  let app: import("express").Express;
  let adminToken: string;
  let userToken: string;
  let adminDeptId: string;
  let userRoleId: string;

  const withToken = (token: string) => ({
    get: (url: string) => request(app).get(url).set("Authorization", `Bearer ${token}`),
    post: (url: string, body?: any) => request(app).post(url).set("Authorization", `Bearer ${token}`).send(body),
    put: (url: string, body?: any) => request(app).put(url).set("Authorization", `Bearer ${token}`).send(body),
    patch: (url: string) => request(app).patch(url).set("Authorization", `Bearer ${token}`),
    delete: (url: string) => request(app).delete(url).set("Authorization", `Bearer ${token}`),
  });
  const asAdmin = () => withToken(adminToken);
  const asUser = () => withToken(userToken);

  const createDept = async (code: string, name: string) => {
    const res = await asAdmin().post("/api/departments", { code, name });
    expect(res.status).toBe(201);
    return res.body.data._id as string;
  };

  beforeAll(async () => {
    await startE2EDatabase();
    app = (await import("../../app")).default;
    const roleIds = await seedRbac();
    userRoleId = roleIds.USER;
    adminDeptId = (await seedDepartments()).deptA;

    await seedUser({ username: "dept_admin", password: PASSWORD, fullName: "Admin test", roleId: roleIds.ADMIN, departmentId: adminDeptId });
    await seedUser({ username: "dept_user", password: PASSWORD, fullName: "User thường", roleId: roleIds.USER, departmentId: adminDeptId });

    adminToken = (await request(app).post("/api/auths/login").send({ username: "dept_admin", password: PASSWORD })).body.data.accessToken;
    userToken = (await request(app).post("/api/auths/login").send({ username: "dept_user", password: PASSWORD })).body.data.accessToken;
  }, 60_000);

  afterAll(async () => {
    await stopE2EDatabase();
  });

  describe("401/403 — route MỚI (CLAUDE.md §18)", () => {
    it("không token -> 401 trên cả 3 route mới", async () => {
      const bulkDelete = await request(app).post("/api/departments/bulk-delete").send({ ids: [] });
      const bulkRestore = await request(app).post("/api/departments/bulk-restore").send({ ids: [] });
      const restore = await request(app).patch("/api/departments/000000000000000000000000/restore");
      expect(bulkDelete.status).toBe(401);
      expect(bulkRestore.status).toBe(401);
      expect(restore.status).toBe(401);
    });

    it("role USER (không có DEPARTMENT_DELETE/DEPARTMENT_RESTORE) -> 403 thật", async () => {
      const dept = await createDept("PERM-403", "Khoa test 403");

      const del = await asUser().delete(`/api/departments/${dept}`);
      expect(del.status).toBe(403);

      const restore = await asUser().patch(`/api/departments/${dept}/restore`);
      expect(restore.status).toBe(403);

      const bulkDelete = await asUser().post("/api/departments/bulk-delete", { ids: [dept] });
      expect(bulkDelete.status).toBe(403);

      const bulkRestore = await asUser().post("/api/departments/bulk-restore", { ids: [dept] });
      expect(bulkRestore.status).toBe(403);
    });
  });

  describe("Xoá mềm + khôi phục (single)", () => {
    it("xoá mềm -> biến mất khỏi danh sách mặc định, xuất hiện với isActive=false, có deletedAt/deletedBy", async () => {
      const dept = await createDept("SOFT-01", "Khoa xoá mềm 1");

      const del = await asAdmin().delete(`/api/departments/${dept}`);
      expect(del.status).toBe(200);

      const defaultList = await asAdmin().get("/api/departments?limit=100");
      expect(defaultList.body.data.map((d: any) => d._id)).not.toContain(dept);

      const deletedList = await asAdmin().get("/api/departments?isActive=false&limit=100");
      const row = deletedList.body.data.find((d: any) => d._id === dept);
      expect(row).toBeTruthy();
      expect(row.deletedAt).toBeTruthy();

      // Xem chi tiết / sửa khoa đã xoá mềm -> 404 (cùng pattern AssetCategory).
      const getDetail = await asAdmin().get(`/api/departments/${dept}`);
      expect(getDetail.status).toBe(404);
      const putUpdate = await asAdmin().put(`/api/departments/${dept}`, { name: "Đổi tên khi đã xoá" });
      expect(putUpdate.status).toBe(404);
    });

    it("DEV-088: KPI totalDepartments ở admin-summary KHÔNG đếm khoa đã xoá mềm, đếm lại khi khôi phục", async () => {
      // Dashboard cache 30s theo key — xoá cache trước mỗi lần đọc để thấy đúng dữ liệu mới.
      const totalDepartments = async () => {
        clearCacheKey("dashboard:adminSummary");
        return (await asAdmin().get("/api/dashboard/admin-summary")).body.data.totalDepartments as number;
      };
      const before = await totalDepartments();
      const dept = await createDept("SOFT-KPI", "Khoa đếm KPI");
      expect(await totalDepartments()).toBe(before + 1);

      await asAdmin().delete(`/api/departments/${dept}`);
      expect(await totalDepartments()).toBe(before);

      await asAdmin().patch(`/api/departments/${dept}/restore`);
      expect(await totalDepartments()).toBe(before + 1);
    });

    it("khôi phục -> quay lại danh sách mặc định, isActive=true, hết deletedAt/deletedBy", async () => {
      const dept = await createDept("SOFT-02", "Khoa xoá mềm 2");
      await asAdmin().delete(`/api/departments/${dept}`);

      const restore = await asAdmin().patch(`/api/departments/${dept}/restore`);
      expect(restore.status).toBe(200);
      expect(restore.body.data.isActive).toBe(true);
      expect(restore.body.data.deletedAt).toBeFalsy();

      const defaultList = await asAdmin().get("/api/departments?limit=100");
      expect(defaultList.body.data.map((d: any) => d._id)).toContain(dept);
    });

    it("khôi phục khoa CHƯA bị xoá -> 400", async () => {
      const dept = await createDept("SOFT-03", "Khoa chưa xoá");
      const restore = await asAdmin().patch(`/api/departments/${dept}/restore`);
      expect(restore.status).toBe(400);
    });
  });

  describe("Vẫn CHẶN xoá khi còn dữ liệu tham chiếu (giữ nguyên hành vi cũ)", () => {
    it("còn user thuộc khoa -> chặn xoá mềm, department vẫn isActive=true", async () => {
      const dept = await createDept("GUARD-01", "Khoa còn user");
      await seedUser({ username: "guard_user_01", password: PASSWORD, fullName: "User của khoa", roleId: userRoleId, departmentId: dept });

      const del = await asAdmin().delete(`/api/departments/${dept}`);
      expect(del.status).toBe(400);
      expect(del.body.message).toContain("user");

      const check = await asAdmin().get(`/api/departments/${dept}`);
      expect(check.status).toBe(200);
      expect(check.body.data.isActive).toBe(true);
    });
  });

  describe("Xoá nhiều / khôi phục nhiều (bulk)", () => {
    it("xoá nhiều — 1 id thành công, 1 id lỗi (còn user) — trả về đúng deletedIds/failed", async () => {
      const okDept = await createDept("BULK-OK-01", "Khoa xoá được");
      const blockedDept = await createDept("BULK-BLOCKED-01", "Khoa bị chặn");
      await seedUser({ username: "guard_user_02", password: PASSWORD, fullName: "User của khoa 2", roleId: userRoleId, departmentId: blockedDept });

      const res = await asAdmin().post("/api/departments/bulk-delete", { ids: [okDept, blockedDept] });
      expect(res.status).toBe(200);
      expect(res.body.data.deletedIds).toEqual([okDept]);
      expect(res.body.data.failed).toHaveLength(1);
      expect(res.body.data.failed[0].id).toBe(blockedDept);
    });

    it("khôi phục nhiều — cả 2 id thành công", async () => {
      const dept1 = await createDept("BULK-RESTORE-01", "Khoa khôi phục 1");
      const dept2 = await createDept("BULK-RESTORE-02", "Khoa khôi phục 2");
      await asAdmin().delete(`/api/departments/${dept1}`);
      await asAdmin().delete(`/api/departments/${dept2}`);

      const res = await asAdmin().post("/api/departments/bulk-restore", { ids: [dept1, dept2] });
      expect(res.status).toBe(200);
      expect(res.body.data.deletedIds.sort()).toEqual([dept1, dept2].sort());
      expect(res.body.data.failed).toHaveLength(0);
    });

    it("body ids rỗng -> 400 (BulkIdsDTO)", async () => {
      const res = await asAdmin().post("/api/departments/bulk-delete", { ids: [] });
      expect(res.status).toBe(400);
    });
  });
});

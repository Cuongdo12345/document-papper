/**
 * DEV-087 — E2E: huỷ hàng loạt / khôi phục hàng loạt hợp đồng bảo trì, qua
 * HTTP THẬT (supertest + MongoDB in-memory). 2 route MỚI (`POST
 * /contracts/bulk-cancel`, `POST /contracts/bulk-restore`) dùng lại permission
 * có sẵn (CONTRACT_UPDATE / CONTRACT_RESTORE) — CLAUDE.md §18 vẫn yêu cầu
 * verify 401/403 thật cho route mới.
 */
import request from "supertest";
import { startE2EDatabase, stopE2EDatabase } from "./setup";
import { seedDepartments, seedRbac, seedUser } from "./seedTestData";

const PASSWORD = "Password123";

describe("E2E — Hợp đồng: huỷ/khôi phục hàng loạt (DEV-087)", () => {
  let app: import("express").Express;
  let adminToken: string;
  let userToken: string;
  let vendorId: string;
  let assetId: string;

  const as = (token: string) => ({
    get: (url: string) => request(app).get(url).set("Authorization", `Bearer ${token}`),
    post: (url: string, body?: any) => request(app).post(url).set("Authorization", `Bearer ${token}`).send(body),
    patch: (url: string, body?: any) => request(app).patch(url).set("Authorization", `Bearer ${token}`).send(body),
  });
  const admin = () => as(adminToken);

  const createContract = async (title: string) => {
    const res = await admin().post("/api/contracts", {
      vendor: vendorId,
      assets: [assetId],
      title,
      startDate: "2026-01-01",
      endDate: "2027-12-31",
    });
    expect(res.status).toBe(201);
    return res.body.data._id as string;
  };

  beforeAll(async () => {
    await startE2EDatabase();
    app = (await import("../../app")).default;
    const roleIds = await seedRbac();
    const deptId = (await seedDepartments()).deptA;
    await seedUser({ username: "ct_admin", password: PASSWORD, fullName: "Admin", roleId: roleIds.ADMIN, departmentId: deptId });
    await seedUser({ username: "ct_user", password: PASSWORD, fullName: "User", roleId: roleIds.USER, departmentId: deptId });
    adminToken = (await request(app).post("/api/auths/login").send({ username: "ct_admin", password: PASSWORD })).body.data.accessToken;
    userToken = (await request(app).post("/api/auths/login").send({ username: "ct_user", password: PASSWORD })).body.data.accessToken;

    vendorId = (await admin().post("/api/vendors", { name: "NCC test hàng loạt" })).body.data._id;
    const categoryId = (await admin().post("/api/assets/asset-categories", { code: "CT-LEAF", name: "Danh mục test" })).body.data._id;
    const asset = await admin().post("/api/assets", { category: categoryId, department: deptId, name: "Máy test hợp đồng" });
    expect(asset.status).toBe(201);
    assetId = asset.body.data._id;
  }, 60_000);

  afterAll(async () => {
    await stopE2EDatabase();
  });

  it("không token -> 401 trên cả 2 route mới", async () => {
    expect((await request(app).post("/api/contracts/bulk-cancel").send({ ids: [] })).status).toBe(401);
    expect((await request(app).post("/api/contracts/bulk-restore").send({ ids: [] })).status).toBe(401);
  });

  it("role USER (chỉ có CONTRACT_VIEW) -> 403 thật", async () => {
    const id = await createContract("HĐ test 403");
    expect((await as(userToken).post("/api/contracts/bulk-cancel", { ids: [id] })).status).toBe(403);
    expect((await as(userToken).post("/api/contracts/bulk-restore", { ids: [id] })).status).toBe(403);
  });

  it("huỷ hàng loạt: 2 hợp đồng active -> cả 2 chuyển cancelled, lý do áp chung; hợp đồng đã huỷ -> vào failed", async () => {
    const a = await createContract("HĐ hàng loạt A");
    const b = await createContract("HĐ hàng loạt B");
    const already = await createContract("HĐ đã huỷ sẵn");
    await admin().patch(`/api/contracts/${already}/cancel`, {});

    const res = await admin().post("/api/contracts/bulk-cancel", { ids: [a, b, already], cancelReason: "Chấm dứt hợp tác" });
    expect(res.status).toBe(200);
    expect(res.body.data.deletedIds.sort()).toEqual([a, b].sort());
    expect(res.body.data.failed).toHaveLength(1);
    expect(res.body.data.failed[0].id).toBe(already);

    const detail = await admin().get(`/api/contracts/${a}`);
    expect(detail.body.data.status).toBe("cancelled");
    expect(detail.body.data.cancelReason).toBe("Chấm dứt hợp tác");
  });

  it("khôi phục hàng loạt: hợp đồng đã huỷ -> active, hết cancelReason; hợp đồng đang active -> vào failed", async () => {
    const x = await createContract("HĐ khôi phục X");
    const stillActive = await createContract("HĐ vẫn active");
    await admin().post("/api/contracts/bulk-cancel", { ids: [x] });

    const res = await admin().post("/api/contracts/bulk-restore", { ids: [x, stillActive] });
    expect(res.status).toBe(200);
    expect(res.body.data.deletedIds).toEqual([x]);
    expect(res.body.data.failed.map((f: any) => f.id)).toEqual([stillActive]);

    const detail = await admin().get(`/api/contracts/${x}`);
    expect(detail.body.data.status).toBe("active");
    expect(detail.body.data.cancelReason).toBeFalsy();
  });

  it("ids rỗng -> 400 (BulkIdsDTO)", async () => {
    expect((await admin().post("/api/contracts/bulk-cancel", { ids: [] })).status).toBe(400);
  });
});

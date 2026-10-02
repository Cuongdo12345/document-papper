/**
 * BR-05 (docs/31_BACKEND_CODE_REVIEW.md, DEV-094, 2026-09-29) — E2E: 3
 * endpoint dashboard (`assets/warranty-expiring`, `assets/maintenance-overdue`,
 * `workflow/overdue-approvals`) giờ clamp `limit` (tối đa 100, `abc` → mặc
 * định 10) và KHÔNG tạo thêm mục cache khi client gửi tham số lạ. Qua HTTP
 * THẬT (supertest + MongoDB in-memory).
 */
import request from "supertest";
import { startE2EDatabase, stopE2EDatabase } from "./setup";
import { seedRbac, seedUser } from "./seedTestData";
import { clearAllMemoryCache, getCacheSize } from "../../shared/cache/memoryCache";

const PASSWORD = "Password123";
const ENDPOINTS = [
  "/api/dashboard/assets/warranty-expiring",
  "/api/dashboard/assets/maintenance-overdue",
  "/api/dashboard/workflow/overdue-approvals",
];

describe("E2E — Dashboard: clamp limit + khoá cache chỉ từ tham số đã parse (BR-05)", () => {
  let app: import("express").Express;
  let token: string;

  const get = (url: string) => request(app).get(url).set("Authorization", `Bearer ${token}`);

  beforeAll(async () => {
    await startE2EDatabase();
    app = (await import("../../app")).default;
    const roleIds = await seedRbac();
    await seedUser({ username: "dash_admin", password: PASSWORD, fullName: "Admin dashboard", roleId: roleIds.ADMIN });
    token = (await request(app).post("/api/auths/login").send({ username: "dash_admin", password: PASSWORD })).body.data.accessToken;
  }, 60_000);

  afterAll(async () => {
    await stopE2EDatabase();
  });

  beforeEach(() => clearAllMemoryCache());

  it.each(ENDPOINTS)("%s ?limit=1000000 -> limit bị chặn ở 100", async (url) => {
    const res = await get(`${url}?limit=1000000`);
    expect(res.status).toBe(200);
    expect(res.body.pagination.limit).toBe(100);
  });

  it.each(ENDPOINTS)("%s ?limit=abc&page=xyz -> dùng mặc định (limit 10, page 1), không NaN", async (url) => {
    const res = await get(`${url}?limit=abc&page=xyz`);
    expect(res.status).toBe(200);
    expect(res.body.pagination).toMatchObject({ page: 1, limit: 10 });
  });

  it.each(ENDPOINTS)("%s gửi tham số lạ ngẫu nhiên nhiều lần -> chỉ 1 mục cache", async (url) => {
    for (let i = 0; i < 5; i++) {
      const res = await get(`${url}?page=1&limit=10&x=${Math.random()}`);
      expect(res.status).toBe(200);
    }
    expect(getCacheSize()).toBe(1);
  });
});

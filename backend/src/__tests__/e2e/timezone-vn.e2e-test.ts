/**
 * BR-09 (docs/31_BACKEND_CODE_REVIEW.md, DEV-097, 2026-09-29) — E2E: mọi mốc
 * ngày/tháng tính theo GIỜ VIỆT NAM. Qua HTTP THẬT (supertest + MongoDB
 * in-memory). Dữ liệu chèn thẳng vào collection (bỏ qua `timestamps` của
 * Mongoose) để đặt `createdAt` đúng những thời điểm "0h–7h sáng giờ VN" mà
 * UTC hiểu sang ngày/tháng trước.
 */
import request from "supertest";
import mongoose from "mongoose";
import { startE2EDatabase, stopE2EDatabase } from "./setup";
import { seedRbac, seedDepartments, seedUser } from "./seedTestData";
import { clearAllMemoryCache } from "../../shared/cache/memoryCache";

const PASSWORD = "Password123";
const YEAR = new Date().getFullYear();
// 30/4 18:30 UTC = 01:30 sáng 1/5 giờ VN — UTC xếp vào tháng 4, VN là tháng 5.
const EARLY_MAY_VN = new Date(Date.UTC(YEAR, 3, 30, 18, 30));
// 10/4 20:00 UTC = 03:00 sáng 11/4 giờ VN.
const EARLY_APR11_VN = new Date(Date.UTC(YEAR, 3, 10, 20, 0));
// 15/4 10:00 UTC = 17:00 chiều 15/4 giờ VN.
const AFTERNOON_APR15_VN = new Date(Date.UTC(YEAR, 3, 15, 10, 0));
const ymd = (m: number, d: number) => `${YEAR}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

describe("E2E — Múi giờ Việt Nam cho KPI/lọc ngày (BR-09)", () => {
  let app: import("express").Express;
  let token: string;
  let adminId: mongoose.Types.ObjectId;
  let deptA: string;

  const get = (url: string) => request(app).get(url).set("Authorization", `Bearer ${token}`);

  const insertDoc = (code: string, createdAt: Date) =>
    mongoose.connection.db!.collection("documents").insertOne({
      documentCode: code,
      category: "PROPOSAL",
      subType: "PROPOSE_PROCUREMENT",
      title: `TZ ${code}`,
      department: new mongoose.Types.ObjectId(deptA),
      meta: { note: "tz" },
      isActive: true,
      workflowStatus: "pending",
      createdAt,
      updatedAt: createdAt,
    });

  beforeAll(async () => {
    await startE2EDatabase();
    app = (await import("../../app")).default;
    const roleIds = await seedRbac();
    deptA = (await seedDepartments()).deptA;
    adminId = (await seedUser({ username: "tz_admin", password: PASSWORD, fullName: "Admin TZ", roleId: roleIds.ADMIN, departmentId: deptA }))._id as mongoose.Types.ObjectId;
    token = (await request(app).post("/api/auths/login").send({ username: "tz_admin", password: PASSWORD })).body.data.accessToken;

    await insertDoc("TZ-EARLY-MAY", EARLY_MAY_VN);
    await insertDoc("TZ-APR15-PM", AFTERNOON_APR15_VN);
    await mongoose.connection.db!.collection("useraudits").insertOne({
      user: adminId,
      performedBy: adminId,
      action: "UPDATE",
      note: "tz audit",
      createdAt: EARLY_APR11_VN,
      updatedAt: EARLY_APR11_VN,
    });
  }, 60_000);

  afterAll(async () => {
    await stopE2EDatabase();
  });

  beforeEach(() => clearAllMemoryCache());

  it("process chạy giờ VN (jest config / server.ts)", () => {
    expect(process.env.TZ).toBe("Asia/Ho_Chi_Minh");
    expect(new Date(YEAR, 0, 1).toISOString()).toBe(`${YEAR - 1}-12-31T17:00:00.000Z`);
  });

  it("Dashboard: đề xuất tạo 01:30 sáng 1/5 (VN) được đếm vào THÁNG 5, không phải tháng 4", async () => {
    const res = await get("/api/dashboard/admin-summary");
    expect(res.status).toBe(200);
    const byMonth = res.body.data.proposalsByMonth as { _id: number; count: number }[];
    expect(byMonth.find((m) => m._id === 5)?.count).toBe(1);
    expect(byMonth.find((m) => m._id === 4)?.count).toBe(1); // chỉ bản 15/4 chiều
  });

  it("Audit thống kê theo ngày: 03:00 sáng 11/4 (VN) nằm ở ngày 11/4, không phải 10/4", async () => {
    const res = await get(`/api/user-audits/dashboard?fromDate=${ymd(4, 11)}&toDate=${ymd(4, 11)}`);
    expect(res.status).toBe(200);
    // Endpoint này trả thẳng `{ total, byAction, byDay }` (không bọc `data`).
    expect(res.body.total).toBe(1);
    const days = (res.body.byDay as { _id: string }[]).map((d) => d._id);
    expect(days).toContain(ymd(4, 11));
    expect(days).not.toContain(ymd(4, 10));
  });

  it("Lọc tài liệu 'Đến ngày 15/4' lấy cả tài liệu 17:00 chiều 15/4 (trước đây bị bỏ sót)", async () => {
    const res = await get(`/api/documents?fromDate=${ymd(4, 15)}&toDate=${ymd(4, 15)}`);
    expect(res.status).toBe(200);
    const codes = (res.body.data as { documentCode: string }[]).map((d) => d.documentCode);
    expect(codes).toEqual(["TZ-APR15-PM"]);
  });

  it("Lọc tài liệu 'Từ ngày 1/5' lấy cả tài liệu 01:30 sáng 1/5 (trước đây bị bỏ sót)", async () => {
    const res = await get(`/api/documents?fromDate=${ymd(5, 1)}&toDate=${ymd(5, 1)}`);
    const codes = (res.body.data as { documentCode: string }[]).map((d) => d.documentCode);
    expect(codes).toEqual(["TZ-EARLY-MAY"]);
  });

  it("Lọc 'Đến ngày 30/4' KHÔNG lấy tài liệu 01:30 sáng 1/5 (dù UTC vẫn là 30/4)", async () => {
    const res = await get(`/api/documents?fromDate=${ymd(4, 30)}&toDate=${ymd(4, 30)}`);
    expect(res.body.data).toHaveLength(0);
  });
});

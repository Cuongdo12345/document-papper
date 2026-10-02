/**
 * BR-17 (docs/31_BACKEND_CODE_REVIEW.md, DEV-105, 2026-09-30) — E2E: xuất Excel
 * tài liệu chỉ nạp biên bản của ĐÚNG các đề xuất được xuất (trước đây tải toàn
 * bộ biên bản của hệ thống). Qua HTTP THẬT (supertest + MongoDB in-memory), đọc
 * lại chính file .xlsx trả về để kiểm tra nội dung cột "Kiểm tra".
 *
 * Không có route/permission mới (`DOCUMENT_EXCEL_EXPORT` đã có).
 */
import request from "supertest";
import ExcelJS from "exceljs";
import { Types } from "mongoose";
import { startE2EDatabase, stopE2EDatabase } from "./setup";
import { seedRbac, seedDepartments, seedUser } from "./seedTestData";
import { Document } from "../../models/documents/document.model";

const PASSWORD = "Password123";

const binaryParser = (res: any, cb: (err: Error | null, body: Buffer) => void) => {
  const chunks: Buffer[] = [];
  res.on("data", (c: Buffer) => chunks.push(c));
  res.on("end", () => cb(null, Buffer.concat(chunks)));
};

describe("E2E — Export tài liệu: chỉ nạp biên bản của đề xuất được xuất (BR-17)", () => {
  let app: import("express").Express;
  let adminToken: string;
  let userToken: string;
  let deptA: string;
  let deptB: string;
  let adminId: string;
  let seq = 0;

  const createDoc = (fields: Record<string, unknown>) =>
    Document.create({ documentCode: `BR17-${++seq}`, createdBy: adminId, meta: { items: [] }, ...fields });

  const item = (description: string, quantity = 1, unitPrice = 1000) => ({ description, deviceName: description, quantity, unitPrice });

  const exportRows = async (token: string, query = "") => {
    const res = await request(app)
      .get(`/api/export/export-documents-excel${query}`)
      .set("Authorization", `Bearer ${token}`)
      .buffer(true)
      .parse(binaryParser);
    expect(res.status).toBe(200);
    const wb = new ExcelJS.Workbook();
    const body = res.body as Buffer;
    await wb.xlsx.load(body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength) as ArrayBuffer);
    const rows: Record<string, any>[] = [];
    wb.getWorksheet("Export")!.eachRow((row, n) => {
      if (n === 1) return;
      rows.push({ code: row.getCell(1).value, inspection: row.getCell(11).value, reportTotal: row.getCell(12).value });
    });
    return rows.filter((r) => typeof r.code === "string" && r.code.startsWith("BR17-"));
  };

  beforeAll(async () => {
    await startE2EDatabase();
    app = (await import("../../app")).default;
    const roleIds = await seedRbac();
    ({ deptA, deptB } = await seedDepartments());

    const admin = await seedUser({ username: "br17_admin", password: PASSWORD, fullName: "Admin", roleId: roleIds.ADMIN, departmentId: deptA });
    adminId = admin._id.toString();
    await seedUser({ username: "br17_it", password: PASSWORD, fullName: "IT khoa A", roleId: roleIds.IT, departmentId: deptA });
    adminToken = (await request(app).post("/api/auths/login").send({ username: "br17_admin", password: PASSWORD })).body.data.accessToken;
    userToken = (await request(app).post("/api/auths/login").send({ username: "br17_it", password: PASSWORD })).body.data.accessToken;

    // Khoa A: 1 đề xuất sửa chữa (có biên bản CHECK_DAMAGE) + 1 đề xuất mực (có biên bản CONFIRM_STATUS).
    const repairA = await createDoc({ category: "PROPOSAL", subType: "PROPOSE_REPAIR", department: deptA, title: "Sửa máy A", meta: { items: [item("Máy A")] } });
    const inkA = await createDoc({ category: "PROPOSAL", subType: "PROPOSE_INK", department: deptA, title: "Mực A", meta: { items: [item("Mực A")] } });
    // Khoa B: tương tự, KHÔNG được lọt vào file xuất của khoa A.
    const repairB = await createDoc({ category: "PROPOSAL", subType: "PROPOSE_REPAIR", department: deptB, title: "Sửa máy B", meta: { items: [item("Máy B")] } });

    await createDoc({ category: "REPORT", subType: "CHECK_DAMAGE", department: deptA, title: "BB hư hỏng A", referenceTo: [repairA._id], meta: { items: [item("Linh kiện A", 2, 500)] } });
    await createDoc({ category: "REPORT", subType: "CONFIRM_STATUS", department: deptA, title: "BB tình trạng A", referenceTo: [inkA._id], meta: { items: [item("Trống mực A", 1, 700)] } });
    await createDoc({ category: "REPORT", subType: "CHECK_DAMAGE", department: deptB, title: "BB hư hỏng B", referenceTo: [repairB._id], meta: { items: [item("Linh kiện B", 3, 900)] } });
    // Biên bản mồ côi (đề xuất không tồn tại / không được xuất) và biên bản đã xoá mềm.
    await createDoc({ category: "REPORT", subType: "CHECK_DAMAGE", department: deptA, title: "BB mồ côi", referenceTo: [new Types.ObjectId()], meta: { items: [item("Mồ côi")] } });
    await createDoc({ category: "REPORT", subType: "CHECK_DAMAGE", department: deptA, title: "BB đã xoá", referenceTo: [repairA._id], isActive: false, meta: { items: [item("Đã xoá")] } });
  }, 60_000);

  afterAll(async () => {
    await stopE2EDatabase();
  });

  afterEach(() => jest.restoreAllMocks());

  it("không token -> 401", async () => {
    expect((await request(app).get("/api/export/export-documents-excel")).status).toBe(401);
  });

  it("ADMIN lọc theo khoa A: cột 'Kiểm tra' đúng nội dung biên bản, KHÔNG có dữ liệu khoa B", async () => {
    const rows = await exportRows(adminToken, `?department=${deptA}`);

    expect(rows).toHaveLength(2);
    const repair = rows.find((r) => r.inspection?.includes("Linh kiện A"));
    const ink = rows.find((r) => r.inspection?.includes("Trống mực A"));
    expect(repair).toMatchObject({ inspection: "Linh kiện A | SL:2 | 500", reportTotal: 1000 });
    expect(ink).toMatchObject({ inspection: "Trống mực A | SL:1 | 700", reportTotal: 700 });
    expect(JSON.stringify(rows)).not.toContain("Linh kiện B");
    expect(JSON.stringify(rows)).not.toContain("Mồ côi");
    expect(JSON.stringify(rows)).not.toContain("Đã xoá");
  });

  it("truy vấn biên bản CHỈ tra theo đúng đề xuất được xuất (không quét toàn bộ biên bản)", async () => {
    const spy = jest.spyOn(Document, "find");

    await exportRows(adminToken, `?department=${deptA}`);

    const reportQueries = spy.mock.calls.map((c) => c[0] as any).filter((f) => f && (f.subType === "CHECK_DAMAGE" || f.subType === "CONFIRM_STATUS"));
    expect(reportQueries).toHaveLength(2);
    for (const q of reportQueries) {
      // Khoa A có đúng 2 đề xuất được xuất -> $in đúng 2 id, thay vì mọi biên bản của hệ thống.
      expect(q.referenceTo.$in).toHaveLength(2);
    }
  });

  it("ADMIN không lọc khoa: có cả khoa A lẫn khoa B, mỗi đề xuất khớp đúng biên bản của mình", async () => {
    const rows = await exportRows(adminToken);

    expect(rows).toHaveLength(3);
    expect(rows.find((r) => r.inspection?.includes("Linh kiện B"))).toMatchObject({ inspection: "Linh kiện B | SL:3 | 900", reportTotal: 2700 });
    expect(rows.find((r) => r.inspection?.includes("Linh kiện A"))).toBeDefined();
  });

  it("user khoa A (không phải ADMIN): chỉ xuất được khoa mình, dù cố truyền khoa B", async () => {
    const rows = await exportRows(userToken, `?department=${deptB}`);

    expect(rows).toHaveLength(2);
    expect(JSON.stringify(rows)).not.toContain("Linh kiện B");
  });

  it("lọc ra 0 đề xuất -> file rỗng hợp lệ, KHÔNG truy vấn biên bản", async () => {
    const spy = jest.spyOn(Document, "find");

    const rows = await exportRows(adminToken, `?department=${deptA}&month=1&year=2001`);

    expect(rows).toHaveLength(0);
    const reportQueries = spy.mock.calls.map((c) => c[0] as any).filter((f) => f && (f.subType === "CHECK_DAMAGE" || f.subType === "CONFIRM_STATUS"));
    expect(reportQueries).toHaveLength(0);
  });
});

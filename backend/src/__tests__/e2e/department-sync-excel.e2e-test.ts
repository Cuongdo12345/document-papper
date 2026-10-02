/**
 * DEV-089 — E2E: "Đồng bộ khoa/phòng từ Excel" có kiểm tra định dạng + xem trước
 * + chỉ tạo khoa đã chọn, qua HTTP THẬT (supertest + MongoDB in-memory). Route
 * KHÔNG mới (`POST /export/departments/sync-from-excel`, `EXCEL_DEPARTMENT_SYNC`)
 * nhưng vẫn kiểm lại 401/403 vì đổi hợp đồng request (`dryRun`, `names`).
 */
import request from "supertest";
import ExcelJS from "exceljs";
import { startE2EDatabase, stopE2EDatabase } from "./setup";
import { seedDepartments, seedRbac, seedUser } from "./seedTestData";
import Department from "../../models/departments/department.model";

const PASSWORD = "Password123";
const URL = "/api/export/departments/sync-from-excel";

const buildXlsx = async (header: string[], rows: string[][]) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Sheet1");
  ws.addRow(header);
  rows.forEach((r) => ws.addRow(r));
  return Buffer.from(await wb.xlsx.writeBuffer());
};

describe("E2E — Đồng bộ khoa/phòng từ Excel: định dạng + xem trước (DEV-089)", () => {
  let app: import("express").Express;
  let adminToken: string;
  let userToken: string;

  const sync = (token: string, file: Buffer, opts: { dryRun?: boolean; names?: string } = {}) => {
    const req = request(app)
      .post(`${URL}${opts.dryRun ? "?dryRun=true" : ""}`)
      .set("Authorization", `Bearer ${token}`)
      .attach("file", file, { filename: "khoa.xlsx", contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    return opts.names !== undefined ? req.field("names", opts.names) : req;
  };

  beforeAll(async () => {
    await startE2EDatabase();
    app = (await import("../../app")).default;
    const roleIds = await seedRbac();
    const { deptA } = await seedDepartments();
    await seedUser({ username: "sync_admin", password: PASSWORD, fullName: "Admin", roleId: roleIds.ADMIN, departmentId: deptA });
    await seedUser({ username: "sync_user", password: PASSWORD, fullName: "User", roleId: roleIds.USER, departmentId: deptA });
    adminToken = (await request(app).post("/api/auths/login").send({ username: "sync_admin", password: PASSWORD })).body.data.accessToken;
    userToken = (await request(app).post("/api/auths/login").send({ username: "sync_user", password: PASSWORD })).body.data.accessToken;
  }, 60_000);

  afterAll(async () => {
    await stopE2EDatabase();
  });

  it("401 không token / 403 role USER (không có EXCEL_DEPARTMENT_SYNC)", async () => {
    const file = await buildXlsx(["Khoa"], [["Khoa Test 401"]]);
    const noToken = await request(app).post(`${URL}?dryRun=true`).attach("file", file, "khoa.xlsx");
    expect(noToken.status).toBe(401);
    const forbidden = await sync(userToken, file, { dryRun: true });
    expect(forbidden.status).toBe(403);
  });

  it("file danh sách thiết bị (không có cột Khoa) -> 400, KHÔNG tạo khoa nào", async () => {
    const before = await Department.countDocuments();
    const file = await buildXlsx(["STT", "Mã", "Tên thiết bị"], [["1", "TB01", "Máy garo tự động"], ["2", "TB02", "Nồi hấp tiệt trùng"]]);
    const res = await sync(adminToken, file);
    expect(res.status).toBe(400);
    expect(res.body.message).toContain("Khoa");
    expect(await Department.countDocuments()).toBe(before);
  });

  it("file mẫu tài sản: đọc đúng cột 'Khoa/phòng' (cột 4), KHÔNG đọc 'Tên tài sản' (cột 3); dryRun không ghi DB", async () => {
    const before = await Department.countDocuments();
    const file = await buildXlsx(
      ["Mã tài sản", "Danh mục", "Tên tài sản", "Khoa/phòng"],
      [["", "Máy in", "Máy in HP", "Khoa Mắt Sync"], ["", "Máy in", "Máy in Canon", "khoa mắt sync"]],
    );
    const res = await sync(adminToken, file, { dryRun: true });
    expect(res.status).toBe(200);
    expect(res.body.data.column).toEqual({ index: 4, header: "Khoa/phòng" });
    expect(res.body.data.totalInFile).toBe(1); // gộp trùng không phân biệt hoa/thường
    expect(res.body.data.toCreate.map((d: any) => d.name)).toEqual(["Khoa Mắt Sync"]);
    expect(await Department.countDocuments()).toBe(before);
  });

  it("phân loại: đã tồn tại / đang ẩn / trùng mã tự sinh (trong file + với khoa có sẵn)", async () => {
    await Department.create({ code: "KTONTAI", name: "Khoa Tồn Tại" });
    await Department.create({ code: "KDAAN", name: "Khoa Đã Ẩn", isActive: false, deletedAt: new Date() });
    await Department.create({ code: "PHONGKHAMN", name: "Phòng khám cũ" });

    const file = await buildXlsx(
      ["Khoa"],
      [["khoa tồn tại"], ["Khoa Đã Ẩn"], ["Thiết bị quang châm 2 kênh"], ["Thiết bị quang châm 4 kênh"], ["Phòng khám nhi"], ["Khoa Hợp Lệ Sync"]],
    );
    const { body } = await sync(adminToken, file, { dryRun: true });
    expect(body.data.existed.map((d: any) => d.name)).toEqual(["Khoa Tồn Tại"]);
    expect(body.data.inactive.map((d: any) => d.name)).toEqual(["Khoa Đã Ẩn"]);
    expect(body.data.toCreate.map((d: any) => d.name)).toEqual(["Thiết bị quang châm 2 kênh", "Khoa Hợp Lệ Sync"]);
    const invalidNames = body.data.invalid.map((d: any) => d.name);
    expect(invalidNames).toEqual(["Thiết bị quang châm 4 kênh", "Phòng khám nhi"]);
    expect(body.data.invalid[1].reason).toContain("Phòng khám cũ");
  });

  it("xác nhận kèm names -> CHỈ tạo khoa đã chọn; tên ngoài danh sách 'sẽ tạo mới' bị bỏ qua", async () => {
    const file = await buildXlsx(["Khoa"], [["Khoa Chọn A"], ["Khoa Bỏ B"], ["Khoa Tồn Tại"]]);
    const res = await sync(adminToken, file, { names: JSON.stringify(["khoa chọn a", "Khoa Tồn Tại", "Khoa Không Có Trong File"]) });
    expect(res.status).toBe(200);
    expect(res.body.data.created.map((d: any) => d.name)).toEqual(["Khoa Chọn A"]);
    expect(await Department.exists({ name: "Khoa Chọn A", isActive: true })).toBeTruthy();
    expect(await Department.exists({ name: "Khoa Bỏ B" })).toBeFalsy();
    expect(await Department.countDocuments({ name: "Khoa Tồn Tại" })).toBe(1);
  });

  it("names không phải mảng JSON -> 400", async () => {
    const file = await buildXlsx(["Khoa"], [["Khoa X"]]);
    const res = await sync(adminToken, file, { names: "khong-phai-json" });
    expect(res.status).toBe(400);
  });
});

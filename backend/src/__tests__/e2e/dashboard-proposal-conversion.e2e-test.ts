/**
 * DEV-085 — E2E: KPI "Tỷ lệ chuyển đổi Đề xuất → Báo cáo theo khoa/phòng",
 * qua HTTP THẬT (supertest + MongoDB in-memory).
 *
 * BỐI CẢNH: user báo tỷ lệ luôn hiện 0% trên Dashboard dù DB dev có dữ liệu
 * thật (190 proposal, 81 report). Nguyên nhân: `proposalConversionByDepartmentService`
 * đọc `referenceTo` trên CHÍNH document PROPOSAL — field này CHỈ được set
 * trên REPORT (trỏ ngược về PROPOSAL), nên luôn rỗng ở PROPOSAL → 0% với MỌI
 * khoa/phòng, không phải do thiếu dữ liệu thật. Trước đây KHÔNG có test nào
 * (unit lẫn e2e) che hàm này — đây chính xác là loại bug mà mock `Document
 * .aggregate()` không phát hiện được (mock chỉ xác nhận "trả về đúng thứ đã
 * giả định", không xác nhận pipeline THẬT chạy đúng trên dữ liệu THẬT) — nên
 * verify bằng MongoDB thật, không mock.
 */
import request from "supertest";
import { startE2EDatabase, stopE2EDatabase } from "./setup";
import { seedDepartments, seedRbac, seedUser } from "./seedTestData";
import { Document } from "../../models/documents/document.model";

const PASSWORD = "Password123";

describe("E2E — Dashboard: Tỷ lệ chuyển đổi Đề xuất → Báo cáo (DEV-085)", () => {
  let app: import("express").Express;
  let token: string;
  let deptA: string;
  let deptB: string;

  // `meta` là field BẮT BUỘC ở Document model (mọi subType) — shape thật của
  // PROPOSE_INK/CONFIRM_STATUS xem `documentPdf.service.test.ts`, nội dung cụ
  // thể không ảnh hưởng tới pipeline đang test (chỉ cần tồn tại để qua validate).
  const META = { items: [{ deviceName: "Mực in (E2E)", quantity: 1, unitPrice: 50000, totalPrice: 50000 }], totalAmount: 50000 };
  const create = (body: any) => request(app).post("/api/documents/proposal").set("Authorization", `Bearer ${token}`).send({ meta: META, ...body });

  beforeAll(async () => {
    await startE2EDatabase();
    app = (await import("../../app")).default;
    const roleIds = await seedRbac();
    const depts = await seedDepartments();
    deptA = depts.deptA;
    deptB = depts.deptB;

    // Dùng ADMIN xuyên suốt (không chỉ USER) — GET dashboard cần `DASHBOARD_READ`
    // (USER không có, xem DEV-084), và `deleteDocumentService` CHỈ cho phép
    // `isSystemRole === true` xoá document (không phải "chủ sở hữu" thường),
    // ADMIN là role duy nhất có cả 2.
    await seedUser({ username: "conv_admin", password: PASSWORD, fullName: "Admin test conversion", roleId: roleIds.ADMIN, departmentId: deptA });
    token = (await request(app).post("/api/auths/login").send({ username: "conv_admin", password: PASSWORD })).body.data.accessToken;

    // Khoa A: 2 đề xuất, 1 đã có báo cáo (CONFIRM_STATUS tham chiếu PROPOSE_INK) → kỳ vọng 50%.
    const p1 = await create({ category: "PROPOSAL", subType: "PROPOSE_INK", title: "Đề xuất mực in 1 (E2E)", department: deptA });
    const p2 = await create({ category: "PROPOSAL", subType: "PROPOSE_INK", title: "Đề xuất mực in 2 (E2E, chưa có báo cáo)", department: deptA });
    expect(p1.status).toBe(201);
    expect(p2.status).toBe(201);

    const report = await create({
      category: "REPORT",
      subType: "CONFIRM_STATUS",
      title: "Biên bản xác nhận đề xuất mực in 1 (E2E)",
      department: deptA,
      referenceTo: p1.body.data._id,
    });
    expect(report.status).toBe(201);

    // Khoa B: 1 đề xuất, KHÔNG có báo cáo nào → kỳ vọng 0% (đúng nghĩa, khác bug "0% giả").
    const p3 = await create({ category: "PROPOSAL", subType: "PROPOSE_INK", title: "Đề xuất mực in khoa B (E2E)", department: deptB });
    expect(p3.status).toBe(201);
  }, 60_000);

  afterAll(async () => {
    await stopE2EDatabase();
  });

  it("Khoa A: 1/2 đề xuất đã có báo cáo → conversionRate = 50 (KHÔNG phải 0 — xác nhận đã sửa bug)", async () => {
    const res = await request(app).get("/api/dashboard/kpi/proposal-conversion?limit=50").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);

    const rowA = res.body.data.items.find((r: any) => r.departmentId === deptA);
    expect(rowA).toMatchObject({ totalProposals: 2, converted: 1, conversionRate: 50 });
  });

  it("Khoa B: 0/1 đề xuất có báo cáo → conversionRate = 0 (đúng dữ liệu thật, không lẫn với bug cũ)", async () => {
    const res = await request(app).get("/api/dashboard/kpi/proposal-conversion?limit=50").set("Authorization", `Bearer ${token}`);
    const rowB = res.body.data.items.find((r: any) => r.departmentId === deptB);
    expect(rowB).toMatchObject({ totalProposals: 1, converted: 0, conversionRate: 0 });
  });

  it("Report đã bị xoá mềm (isActive=false) → KHÔNG tính là đã chuyển đổi", async () => {
    // Tạo riêng 1 proposal + report rồi tắt `isActive` của report thẳng qua
    // Model (KHÔNG qua `DELETE /documents/:id` — route đó chặn xoá khi
    // `workflowStatus="pending"`, mặc định của MỌI document mới tạo dù chưa
    // từng submit workflow nào, không liên quan gì tới bug đang sửa ở đây).
    // Mục tiêu của test là xác nhận pipeline đọc đúng field `isActive`, cách
    // field đó được tắt (qua route hay trực tiếp) không ảnh hưởng kết quả.
    const proposal = await create({ category: "PROPOSAL", subType: "PROPOSE_INK", title: "Đề xuất sẽ có report bị xoá (E2E)", department: deptA });
    const report = await create({
      category: "REPORT",
      subType: "CONFIRM_STATUS",
      title: "Báo cáo sẽ bị xoá (E2E)",
      department: deptA,
      referenceTo: proposal.body.data._id,
    });
    await Document.updateOne({ _id: report.body.data._id }, { $set: { isActive: false, deletedAt: new Date() } });

    // `limit=51` (KHÁC 50 ở 2 test trên) — cache dashboard mặc định 30s theo
    // đúng query string, dùng lại `limit=50` sẽ đọc trúng cache CŨ (trước khi
    // proposal/report mới ở test này được tạo), không phản ánh dữ liệu vừa ghi.
    const res = await request(app).get("/api/dashboard/kpi/proposal-conversion?limit=51").set("Authorization", `Bearer ${token}`);
    const rowA = res.body.data.items.find((r: any) => r.departmentId === deptA);
    // Tổng proposal khoa A giờ = 3 (2 cũ + 1 mới), converted VẪN = 1 (report mới đã bị xoá mềm không tính).
    expect(rowA).toMatchObject({ totalProposals: 3, converted: 1 });
  });
});

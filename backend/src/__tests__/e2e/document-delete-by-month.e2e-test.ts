/**
 * BR-11 (docs/31_BACKEND_CODE_REVIEW.md, DEV-098, 2026-09-29) — E2E: xoá
 * tài liệu theo tháng giờ nhất quán với xoá từng cái. Qua HTTP THẬT
 * (supertest + MongoDB in-memory replica set, transaction thật).
 *   (a) bỏ qua tài liệu có workflow chờ duyệt THẬT — nhưng KHÔNG bỏ qua tài
 *       liệu chưa gửi duyệt (`workflowStatus` mặc định "pending");
 *   (b) ghi 1 dòng UserAudit tổng hợp;
 *   (c) đề xuất còn biên bản tham chiếu vẫn bị bỏ qua (logic dò đổi sang 1
 *       truy vấn, kết quả không đổi).
 * Kèm: xoá từng cái KHÔNG còn chặn tài liệu chưa gửi duyệt.
 */
import request from "supertest";
import mongoose from "mongoose";
import { startE2EDatabase, stopE2EDatabase } from "./setup";
import { seedRbac, seedDepartments, seedUser } from "./seedTestData";
import { Document } from "../../models/documents/document.model";
import UserAudit from "../../models/users/userAudit.model";

const PASSWORD = "Password123";
const YEAR = new Date().getFullYear();
const MARCH_10 = new Date(YEAR, 2, 10, 9, 0); // giờ VN (process.env.TZ cố định)
const JUNE_10 = new Date(YEAR, 5, 10, 9, 0);

describe("E2E — Xoá tài liệu theo tháng (BR-11)", () => {
  let app: import("express").Express;
  let token: string;
  let deptA: string;
  let seq = 0;

  const insertDoc = async (fields: Record<string, any>) => {
    seq += 1;
    const { insertedId } = await mongoose.connection.db!.collection("documents").insertOne({
      documentCode: `BR11-${seq}`,
      category: "PROPOSAL",
      subType: "PROPOSE_PROCUREMENT",
      title: `BR-11 #${seq}`,
      department: new mongoose.Types.ObjectId(deptA),
      meta: { note: "br11" },
      isActive: true,
      workflowStatus: "pending", // = default của schema, kể cả khi chưa gửi duyệt
      createdAt: MARCH_10,
      updatedAt: MARCH_10,
      ...fields,
    });
    return insertedId;
  };

  const isActive = async (id: mongoose.Types.ObjectId) => (await Document.findById(id).lean())!.isActive;

  beforeAll(async () => {
    await startE2EDatabase();
    app = (await import("../../app")).default;
    const roleIds = await seedRbac();
    deptA = (await seedDepartments()).deptA;
    await seedUser({ username: "br11_admin", password: PASSWORD, fullName: "Admin BR-11", roleId: roleIds.ADMIN, departmentId: deptA });
    token = (await request(app).post("/api/auths/login").send({ username: "br11_admin", password: PASSWORD })).body.data.accessToken;
  }, 60_000);

  afterAll(async () => {
    await stopE2EDatabase();
  });

  it("xoá theo tháng: ẩn tài liệu chưa gửi duyệt + đã duyệt; bỏ qua đề xuất còn biên bản và tài liệu chờ duyệt thật; ghi 1 dòng audit", async () => {
    const neverSubmitted = await insertDoc({});
    const approved = await insertDoc({ workflowStatus: "approved", workflowInstanceId: new mongoose.Types.ObjectId() });
    const reallyPending = await insertDoc({ workflowInstanceId: new mongoose.Types.ObjectId() });
    const referenced = await insertDoc({});
    // Biên bản tham chiếu `referenced`, tạo ở THÁNG KHÁC (không nằm trong batch).
    await insertDoc({ category: "REPORT", subType: "CHECK_DAMAGE", referenceTo: [referenced], createdAt: JUNE_10 });

    const auditBefore = await UserAudit.countDocuments({ action: "DELETE" });

    const res = await request(app)
      .delete("/api/documents/delete-by-month")
      .set("Authorization", `Bearer ${token}`)
      .send({ month: 3, year: YEAR });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ deletedCount: 2, skippedCount: 1, skippedPendingWorkflowCount: 1 });

    expect(await isActive(neverSubmitted)).toBe(false);
    expect(await isActive(approved)).toBe(false);
    expect(await isActive(reallyPending)).toBe(true);
    expect(await isActive(referenced)).toBe(true);

    const audits = await UserAudit.find({ action: "DELETE" }).sort({ createdAt: -1 }).lean();
    expect(audits.length - auditBefore).toBe(1);
    expect(audits[0].note).toBe(
      `Xoá theo tháng 03/${YEAR}: ẩn 2 tài liệu; bỏ qua 1 đề xuất còn biên bản tham chiếu, 1 tài liệu có workflow chờ duyệt`,
    );
  });

  it("xoá theo tháng không còn gì để ẩn -> deletedCount 0, KHÔNG ghi audit", async () => {
    const auditBefore = await UserAudit.countDocuments({ action: "DELETE" });
    const res = await request(app)
      .delete("/api/documents/delete-by-month")
      .set("Authorization", `Bearer ${token}`)
      .send({ month: 11, year: YEAR });
    expect(res.status).toBe(200);
    expect(res.body.data.deletedCount).toBe(0);
    expect(await UserAudit.countDocuments({ action: "DELETE" })).toBe(auditBefore);
  });

  it("xoá TỪNG CÁI: tài liệu chưa gửi duyệt xoá được (trước đây bị chặn nhầm)", async () => {
    const id = await insertDoc({ createdAt: JUNE_10 });
    const res = await request(app).delete(`/api/documents/${id}`).set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(await isActive(id)).toBe(false);
  });

  it("xoá TỪNG CÁI: tài liệu có workflow chờ duyệt thật vẫn bị chặn (400)", async () => {
    const id = await insertDoc({ createdAt: JUNE_10, workflowInstanceId: new mongoose.Types.ObjectId() });
    const res = await request(app).delete(`/api/documents/${id}`).set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(400);
    expect(await isActive(id)).toBe(true);
  });
});

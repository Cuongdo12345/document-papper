/**
 * BR-02 (docs/31_BACKEND_CODE_REVIEW.md, DEV-091, 2026-09-29) — E2E: điều
 * kiện `POST /api/workflows/submit`, qua HTTP THẬT (supertest + MongoDB
 * in-memory replica set, có transaction thật):
 *   - tài liệu phải tồn tại + còn hoạt động (404);
 *   - cùng khoa hoặc Admin (403, user không có khoa cũng 403);
 *   - chỉ submit khi chưa có workflow / workflow gần nhất rejected|cancelled (400).
 */
import request from "supertest";
import { Types } from "mongoose";
import { startE2EDatabase, stopE2EDatabase } from "./setup";
import { seedRbac, seedDepartments, seedUser } from "./seedTestData";
import { Document, DocumentCategory, DocumentSubType } from "../../models/documents/document.model";
import WorkflowInstance from "../../models/documents/workflowInstance.model";
import WorkflowTemplate from "../../models/documents/workflowTemplate.model";

const PASSWORD = "Password123";

describe("E2E — Điều kiện gửi duyệt workflow (BR-02)", () => {
  let app: import("express").Express;
  let deptA: string;
  let templateId: string;
  let userAId: string;
  const tokens: Record<string, string> = {};

  const login = async (username: string) =>
    (await request(app).post("/api/auths/login").send({ username, password: PASSWORD })).body.data.accessToken as string;

  const submit = (who: string, documentId: string) =>
    request(app)
      .post("/api/workflows/submit")
      .set("Authorization", `Bearer ${tokens[who]}`)
      .send({ documentId, templateId });

  let seq = 0;
  const newDoc = async (extra: Record<string, any> = {}) => {
    seq += 1;
    const doc = await Document.create({
      category: DocumentCategory.PROPOSAL,
      subType: DocumentSubType.PROPOSE_PROCUREMENT,
      title: `Đề xuất mua sắm BR-02 #${seq}`,
      documentCode: `BR02-${seq}`,
      department: deptA,
      meta: { note: "test" },
      ...extra,
    });
    return doc._id.toString();
  };

  const countInstances = (documentId: string) => WorkflowInstance.countDocuments({ documentId });

  beforeAll(async () => {
    await startE2EDatabase();
    app = (await import("../../app")).default;

    const roleIds = await seedRbac();
    const depts = await seedDepartments();
    deptA = depts.deptA;

    userAId = (await seedUser({ username: "user_a", password: PASSWORD, fullName: "User khoa A", roleId: roleIds.USER, departmentId: deptA }))._id.toString();
    await seedUser({ username: "user_b", password: PASSWORD, fullName: "User khoa B", roleId: roleIds.USER, departmentId: depts.deptB });
    await seedUser({ username: "user_nodept", password: PASSWORD, fullName: "User không khoa", roleId: roleIds.USER });
    await seedUser({ username: "admin_b", password: PASSWORD, fullName: "Admin khoa B", roleId: roleIds.ADMIN, departmentId: depts.deptB });
    await seedUser({ username: "it_a", password: PASSWORD, fullName: "IT duyệt", roleId: roleIds.IT, departmentId: deptA });

    for (const u of ["user_a", "user_b", "user_nodept", "admin_b", "it_a"]) tokens[u] = await login(u);

    const template = await WorkflowTemplate.create({
      name: "Duyệt BR-02 (1 bước IT)",
      steps: [{ stepOrder: 1, name: "IT duyệt", role: "IT" }],
      isActive: true,
    });
    templateId = template._id.toString();
  }, 60_000);

  afterAll(async () => {
    await stopE2EDatabase();
  });

  describe("(a) tài liệu tồn tại + còn hoạt động", () => {
    it("documentId không tồn tại -> 404, không tạo instance mồ côi", async () => {
      const ghost = new Types.ObjectId().toString();
      const res = await submit("user_a", ghost);
      expect(res.status).toBe(404);
      expect(await countInstances(ghost)).toBe(0);
    });

    it("tài liệu đã xoá mềm -> 404", async () => {
      const id = await newDoc({ isActive: false, deletedAt: new Date() });
      const res = await submit("user_a", id);
      expect(res.status).toBe(404);
      expect(await countInstances(id)).toBe(0);
    });
  });

  describe("(b) cùng khoa hoặc Admin", () => {
    it("user khoa khác -> 403", async () => {
      const id = await newDoc();
      const res = await submit("user_b", id);
      expect(res.status).toBe(403);
      expect(await countInstances(id)).toBe(0);
    });

    it("user không có khoa -> 403 (fail-closed)", async () => {
      const id = await newDoc();
      const res = await submit("user_nodept", id);
      expect(res.status).toBe(403);
    });

    it("Admin khoa khác -> 200", async () => {
      const id = await newDoc();
      const res = await submit("admin_b", id);
      expect(res.status).toBe(200);
    });
  });

  describe("(c) trạng thái workflow hiện có", () => {
    it("đang pending -> submit lần 2 bị 400, chỉ có 1 instance", async () => {
      const id = await newDoc();
      expect((await submit("user_a", id)).status).toBe(200);
      const again = await submit("user_a", id);
      expect(again.status).toBe(400);
      expect(await countInstances(id)).toBe(1);
    });

    it("2 request submit đồng thời -> đúng 1 thành công", async () => {
      const id = await newDoc();
      const results = await Promise.all([submit("user_a", id), submit("user_a", id)]);
      const statuses = results.map((r) => r.status).sort();
      expect(statuses).toEqual([200, 400]);
      expect(await countInstances(id)).toBe(1);
    });

    it("đã approved -> 400, tài liệu vẫn giữ approved (không mở khoá sửa lại)", async () => {
      const id = await newDoc();
      const wfId = (await submit("user_a", id)).body.data._id;
      const approve = await request(app)
        .post(`/api/workflows/${wfId}/approve`)
        .set("Authorization", `Bearer ${tokens.it_a}`)
        .send({});
      expect(approve.status).toBe(200);

      const again = await submit("user_a", id);
      expect(again.status).toBe(400);
      expect((await Document.findById(id))!.workflowStatus).toBe("approved");
      expect(await countInstances(id)).toBe(1);
    });

    it("bị rejected -> gửi duyệt lại được (200)", async () => {
      const id = await newDoc();
      const wfId = (await submit("user_a", id)).body.data._id;
      const reject = await request(app)
        .post(`/api/workflows/${wfId}/reject`)
        .set("Authorization", `Bearer ${tokens.it_a}`)
        .send({ comment: "Bổ sung báo giá" });
      expect(reject.status).toBe(200);

      const again = await submit("user_a", id);
      expect(again.status).toBe(200);
      expect(await countInstances(id)).toBe(2);
      expect((await Document.findById(id))!.workflowStatus).toBe("pending");
    });

    it("đã cancelled -> gửi duyệt lại được (200)", async () => {
      // cancel chỉ cho đúng người tạo tài liệu -> createdBy = user_a
      const id = await newDoc({ createdBy: userAId });
      const wfId = (await submit("user_a", id)).body.data._id;
      const cancel = await request(app)
        .post(`/api/workflows/${wfId}/cancel`)
        .set("Authorization", `Bearer ${tokens.user_a}`)
        .send({});
      expect(cancel.status).toBe(200);

      const again = await submit("user_a", id);
      expect(again.status).toBe(200);
      expect(await countInstances(id)).toBe(2);
    });
  });
});

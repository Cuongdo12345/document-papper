/**
 * DEV-048 — E2E #2: luồng nghiệp vụ CRITICAL nhất trong toàn bộ dự án
 * (DEV-005/DEV-046) — Tạo đề xuất sửa chữa (PROPOSE_REPAIR) → submit
 * workflow → duyệt xong → Asset tự chuyển UNDER_MAINTENANCE → tạo biên bản
 * kiểm tra hư hỏng (CHECK_DAMAGE, tham chiếu ngược PROPOSE_REPAIR) → duyệt
 * xong → Asset quay lại IN_USE.
 *
 * Đây là fix nghiêm trọng nhất từng tìm thấy trong 23 tài liệu phân tích
 * (Asset có thể kẹt VĨNH VIỄN ở UNDER_MAINTENANCE) — trước DEV-048, CHỈ có
 * unit test (mock `startAssetMaintenanceService`/`resolveAssetMaintenanceService`,
 * xem `workflow.service.test.ts` DEV-046). File này lần ĐẦU TIÊN xác nhận
 * toàn bộ chuỗi qua HTTP THẬT + MongoDB thật (transaction thật, Asset model
 * thật) — không mock bất kỳ tầng nào.
 */
import request from "supertest";
import { startE2EDatabase, stopE2EDatabase } from "./setup";
import { seedRbac, seedDepartments, seedUser } from "./seedTestData";
import { Asset, AssetStatus } from "../../models/assets/asset.model";
import { AssetCategory } from "../../models/assets/assetCategory.model";
import WorkflowTemplate from "../../models/documents/workflowTemplate.model";

const PASSWORD = "Password123";

describe("E2E — Document (PROPOSE_REPAIR/CHECK_DAMAGE) → Workflow → Asset sync (DEV-005/046 CRITICAL)", () => {
  let app: import("express").Express;
  let deptA: string;
  let assetId: string;
  let creatorToken: string;
  let approverToken: string;

  beforeAll(async () => {
    await startE2EDatabase();
    app = (await import("../../app")).default;

    const roleIds = await seedRbac();
    const depts = await seedDepartments();
    deptA = depts.deptA;

    // "creator" — role USER (DOCUMENT_CREATE + WORKFLOW_SUBMIT), người tạo
    // đề xuất/biên bản. "approver" — role IT (WORKFLOW_APPROVE), người
    // duyệt — dùng IT vì được cấp permission rộng nhất trong 5 role thao
    // tác thật (tương tự role thực hiện bước duyệt phổ biến trong template
    // mẫu có sẵn của hệ thống).
    await seedUser({
      username: "creator1",
      password: PASSWORD,
      fullName: "Người tạo đề xuất (test)",
      roleId: roleIds["USER"],
      departmentId: deptA,
    });
    await seedUser({
      username: "approver1",
      password: PASSWORD,
      fullName: "Người duyệt IT (test)",
      roleId: roleIds["IT"],
      departmentId: deptA,
    });

    const category = await AssetCategory.create({ code: "MAY-IN", name: "Máy in (test)" });
    const asset = await Asset.create({
      category: category._id,
      name: "Máy in phòng khám số 1 (test)",
      department: deptA,
      status: AssetStatus.IN_USE,
    });
    assetId = asset._id.toString();

    const loginCreator = await request(app)
      .post("/api/auths/login")
      .send({ username: "creator1", password: PASSWORD });
    creatorToken = loginCreator.body.data.accessToken;

    const loginApprover = await request(app)
      .post("/api/auths/login")
      .send({ username: "approver1", password: PASSWORD });
    approverToken = loginApprover.body.data.accessToken;
  }, 60_000);

  afterAll(async () => {
    await stopE2EDatabase();
  });

  it("Asset bắt đầu ở trạng thái IN_USE (điều kiện tiên quyết)", async () => {
    const asset = await Asset.findById(assetId);
    expect(asset!.status).toBe(AssetStatus.IN_USE);
  });

  let proposalId: string;

  it("Tạo đề xuất sửa chữa (PROPOSE_REPAIR) gắn với Asset → 201", async () => {
    const res = await request(app)
      .post("/api/documents/proposal")
      .set("Authorization", `Bearer ${creatorToken}`)
      .send({
        category: "PROPOSAL",
        subType: "PROPOSE_REPAIR",
        title: "Đề xuất sửa máy in phòng khám số 1 (E2E)",
        department: deptA,
        relatedAsset: assetId,
        meta: { issue: "Kẹt giấy liên tục" },
      });

    expect(res.status).toBe(201);
    expect(res.body.data.relatedAsset.toString()).toBe(assetId);
    proposalId = res.body.data._id;
  });

  it("Submit workflow (template 1 bước, role IT) → duyệt xong bước cuối → Document 'approved' + Asset chuyển UNDER_MAINTENANCE", async () => {
    const template = await WorkflowTemplate.create({
      name: "Duyệt đề xuất sửa chữa (E2E, 1 bước)",
      steps: [{ stepOrder: 1, name: "IT thẩm định", role: "IT" }],
      isActive: true,
    });

    const submitRes = await request(app)
      .post("/api/workflows/submit")
      .set("Authorization", `Bearer ${creatorToken}`)
      .send({ documentId: proposalId, templateId: template._id.toString() });

    expect(submitRes.status).toBe(200);
    const workflowId = submitRes.body.data._id;

    const approveRes = await request(app)
      .post(`/api/workflows/${workflowId}/approve`)
      .set("Authorization", `Bearer ${approverToken}`)
      .send({ comment: "Đồng ý, tiến hành sửa chữa" });

    expect(approveRes.status).toBe(200);

    const asset = await Asset.findById(assetId);
    // 🎯 CỐT LÕI của toàn bộ E2E này — đây CHÍNH XÁC là hành vi mà bug
    // nghiêm trọng nhất dự án (DEV-005) từng làm sai, giờ xác nhận bằng
    // request HTTP thật, không phải mock.
    expect(asset!.status).toBe(AssetStatus.UNDER_MAINTENANCE);
  });

  it("Tạo biên bản kiểm tra hư hỏng (CHECK_DAMAGE, tham chiếu PROPOSE_REPAIR) → duyệt xong → Asset quay lại IN_USE", async () => {
    const createReportRes = await request(app)
      .post("/api/documents/proposal")
      .set("Authorization", `Bearer ${creatorToken}`)
      .send({
        category: "REPORT",
        subType: "CHECK_DAMAGE",
        title: "Biên bản kiểm tra máy in phòng khám số 1 (E2E)",
        department: deptA,
        referenceTo: proposalId,
        meta: { repairResult: "REPAIRED" },
      });
    expect(createReportRes.status).toBe(201);
    const reportId = createReportRes.body.data._id;

    const template2 = await WorkflowTemplate.create({
      name: "Duyệt biên bản kiểm tra hư hỏng (E2E, 1 bước)",
      steps: [{ stepOrder: 1, name: "IT xác nhận", role: "IT" }],
      isActive: true,
    });

    const submitRes = await request(app)
      .post("/api/workflows/submit")
      .set("Authorization", `Bearer ${creatorToken}`)
      .send({ documentId: reportId, templateId: template2._id.toString() });
    expect(submitRes.status).toBe(200);
    const workflowId = submitRes.body.data._id;

    const approveRes = await request(app)
      .post(`/api/workflows/${workflowId}/approve`)
      .set("Authorization", `Bearer ${approverToken}`)
      .send({ comment: "Xác nhận đã sửa xong" });
    expect(approveRes.status).toBe(200);

    const asset = await Asset.findById(assetId);
    expect(asset!.status).toBe(AssetStatus.IN_USE);
    expect(asset!.maintenanceStartedAt).toBeUndefined();
  });
});

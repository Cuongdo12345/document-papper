/**
 * BR-22 (docs/31_BACKEND_CODE_REVIEW.md, DEV-108, 2026-09-30) — E2E: controller
 * Upload dùng `catchAsync` + `ApiError`, mọi lỗi trả CÙNG format chung
 * `{ success:false, message, errorCode }` (trước đây `{ message }` thô, không có
 * `success`/`errorCode`). Qua HTTP THẬT (supertest + multer ghi đĩa thật +
 * MongoDB in-memory).
 *
 * Không có route/permission mới. Kiểm luôn phân quyền hiện có: không token 401,
 * thiếu permission 403, file của người khác 403 (chủ sở hữu/ADMIN thì được).
 *
 * File thật ghi vào `backend/uploads/`; mọi file của test này mang tiền tố
 * `br22-e2e-` và được xoá trong `afterAll`.
 */
import request from "supertest";
import fs from "fs";
import path from "path";
import { Types } from "mongoose";
import { startE2EDatabase, stopE2EDatabase } from "./setup";
import { seedRbac, seedDepartments, seedUser } from "./seedTestData";
import { Upload } from "../../models/uploadFiles/upload.model";
import { Role } from "../../models/rbac/role.model";
import { Permission } from "../../models/rbac/permission.model";

const PASSWORD = "Password123";
const PREFIX = "br22-e2e-";
const UPLOAD_DIR = path.join(__dirname, "../../../uploads");

const filesOnDisk = () => fs.readdirSync(UPLOAD_DIR).filter((f) => f.includes(PREFIX));

describe("E2E — Upload controller: format lỗi chung + phân quyền (BR-22)", () => {
  let app: import("express").Express;
  let adminToken: string;
  let ownerToken: string;
  let otherToken: string;
  let noPermToken: string;

  const login = async (username: string) =>
    (await request(app).post("/api/auths/login").send({ username, password: PASSWORD })).body.data.accessToken as string;

  const upload = (token: string, name: string, content = "%PDF-1.4 br22") =>
    request(app)
      .post("/api/upload")
      .set("Authorization", `Bearer ${token}`)
      .attach("files", Buffer.from(content), { filename: `${PREFIX}${name}.pdf`, contentType: "application/pdf" });

  const expectError = (res: request.Response, status: number, errorCode: string, message?: string) => {
    expect(res.status).toBe(status);
    expect(res.body.success).toBe(false);
    expect(res.body.errorCode).toBe(errorCode);
    if (message) expect(res.body.message).toBe(message);
  };

  beforeAll(async () => {
    await startE2EDatabase();
    app = (await import("../../app")).default;
    const roleIds = await seedRbac();
    const { deptA } = await seedDepartments();

    // Role thường (KHÔNG phải system role) có đủ 4 permission file — để kiểm tra
    // chủ sở hữu vs người khác, vì seed chỉ cấp quyền file cho ADMIN.
    const filePerms = await Permission.find({ name: { $in: ["UPLOAD_FILES", "VIEW_FILES", "VIEW_FILE_DETAIL", "DELETE_FILE"] } });
    expect(filePerms).toHaveLength(4);
    const fileRole = await Role.create({ name: "FILE_USER", permissions: filePerms.map((p) => p._id), isSystemRole: false });

    await seedUser({ username: "br22_admin", password: PASSWORD, fullName: "Admin", roleId: roleIds.ADMIN, departmentId: deptA });
    await seedUser({ username: "br22_owner", password: PASSWORD, fullName: "Owner", roleId: fileRole._id.toString(), departmentId: deptA });
    await seedUser({ username: "br22_other", password: PASSWORD, fullName: "Other", roleId: fileRole._id.toString(), departmentId: deptA });
    await seedUser({ username: "br22_noperm", password: PASSWORD, fullName: "NoPerm", roleId: roleIds.USER, departmentId: deptA });
    adminToken = await login("br22_admin");
    ownerToken = await login("br22_owner");
    otherToken = await login("br22_other");
    noPermToken = await login("br22_noperm");
  }, 60_000);

  afterAll(async () => {
    for (const f of filesOnDisk()) fs.unlinkSync(path.join(UPLOAD_DIR, f));
    await stopE2EDatabase();
  });

  afterEach(() => jest.restoreAllMocks());

  describe("xác thực / phân quyền (không đổi)", () => {
    it("không token -> 401 trên cả 5 route", async () => {
      const id = new Types.ObjectId().toString();
      expect((await request(app).post("/api/upload")).status).toBe(401);
      expect((await request(app).get("/api/upload")).status).toBe(401);
      expect((await request(app).get(`/api/upload/${id}`)).status).toBe(401);
      expect((await request(app).get(`/api/upload/${id}/download`)).status).toBe(401);
      expect((await request(app).delete(`/api/upload/${id}`)).status).toBe(401);
    });

    it("user thiếu permission -> 403 trên cả 5 route", async () => {
      const id = new Types.ObjectId().toString();
      const auth = { Authorization: `Bearer ${noPermToken}` };
      expect((await request(app).post("/api/upload").set(auth)).status).toBe(403);
      expect((await request(app).get("/api/upload").set(auth)).status).toBe(403);
      expect((await request(app).get(`/api/upload/${id}`).set(auth)).status).toBe(403);
      expect((await request(app).get(`/api/upload/${id}/download`).set(auth)).status).toBe(403);
      expect((await request(app).delete(`/api/upload/${id}`).set(auth)).status).toBe(403);
    });
  });

  describe("POST /api/upload", () => {
    it("upload hợp lệ -> 200, response giữ nguyên { success, message, data }", async () => {
      const res = await upload(ownerToken, "ok");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("Upload success");
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0]).toMatchObject({ fileName: `${PREFIX}ok.pdf`, mimeType: "application/pdf" });
    });

    it("KHÔNG kèm file (multipart chỉ có field text) -> 400 rõ ràng, không lưu gì", async () => {
      const before = await Upload.countDocuments();

      const res = await request(app).post("/api/upload").set("Authorization", `Bearer ${ownerToken}`).field("note", "không có file");

      expectError(res, 400, "BAD_REQUEST", "Vui lòng chọn ít nhất 1 file để tải lên");
      expect(await Upload.countDocuments()).toBe(before);
    });

    it("KHÔNG kèm file (body JSON, không phải multipart) -> 400, không phải 500", async () => {
      const res = await request(app).post("/api/upload").set("Authorization", `Bearer ${ownerToken}`).send({});

      expectError(res, 400, "BAD_REQUEST", "Vui lòng chọn ít nhất 1 file để tải lên");
    });

    it("lỗi DB bất ngờ -> 500 generic đúng format chung, KHÔNG lộ chi tiết lỗi nội bộ", async () => {
      jest.spyOn(console, "error").mockImplementation(() => undefined);
      jest.spyOn(Upload, "insertMany").mockRejectedValueOnce(new Error("secret mongo driver detail"));

      const res = await upload(ownerToken, "dberr");

      expectError(res, 500, "UNKNOWN_ERROR", "Đã có lỗi xảy ra, vui lòng thử lại sau");
      expect(JSON.stringify(res.body)).not.toContain("secret mongo driver detail");
    });
  });

  describe("GET /api/upload/:id và /:id/download", () => {
    let ownerFileId: string;

    beforeAll(async () => {
      const res = await upload(ownerToken, "detail", "%PDF-1.4 noi dung that");
      ownerFileId = res.body.data[0]._id;
    });

    it("chủ sở hữu xem được chi tiết -> 200 { success, data }", async () => {
      const res = await request(app).get(`/api/upload/${ownerFileId}`).set("Authorization", `Bearer ${ownerToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBe(ownerFileId);
    });

    it("ADMIN xem được file của người khác -> 200", async () => {
      const res = await request(app).get(`/api/upload/${ownerFileId}`).set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
    });

    it("người khác (có permission) xem chi tiết -> 403 FORBIDDEN", async () => {
      const res = await request(app).get(`/api/upload/${ownerFileId}`).set("Authorization", `Bearer ${otherToken}`);
      expectError(res, 403, "FORBIDDEN", "Bạn không có quyền xem file này");
    });

    it("người khác tải file -> 403 FORBIDDEN", async () => {
      const res = await request(app).get(`/api/upload/${ownerFileId}/download`).set("Authorization", `Bearer ${otherToken}`);
      expectError(res, 403, "FORBIDDEN", "Bạn không có quyền tải file này");
    });

    it("id không tồn tại -> 404 NOT_FOUND (chi tiết + tải), message tiếng Việt đã sửa lỗi chính tả", async () => {
      const id = new Types.ObjectId().toString();
      const detail = await request(app).get(`/api/upload/${id}`).set("Authorization", `Bearer ${ownerToken}`);
      const download = await request(app).get(`/api/upload/${id}/download`).set("Authorization", `Bearer ${ownerToken}`);

      expectError(detail, 404, "NOT_FOUND", "Không tìm thấy file");
      expectError(download, 404, "NOT_FOUND", "Không tìm thấy file");
    });

    it("id sai định dạng -> 400 (lỗi cast đi qua errorHandler, không treo request)", async () => {
      const res = await request(app).get("/api/upload/khong-phai-objectid").set("Authorization", `Bearer ${ownerToken}`);
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("tải file thật -> 200 và đúng nội dung; xoá file khỏi đĩa -> 404 rõ ràng", async () => {
      const ok = await request(app)
        .get(`/api/upload/${ownerFileId}/download`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .buffer(true)
        .parse((res: any, cb: (err: Error | null, body: Buffer) => void) => {
          const chunks: Buffer[] = [];
          res.on("data", (c: Buffer) => chunks.push(c));
          res.on("end", () => cb(null, Buffer.concat(chunks)));
        });
      expect(ok.status).toBe(200);
      expect((ok.body as Buffer).toString()).toBe("%PDF-1.4 noi dung that");

      const doc = await Upload.findById(ownerFileId);
      fs.unlinkSync(path.join(UPLOAD_DIR, path.basename(doc!.fileUrl!)));

      const gone = await request(app).get(`/api/upload/${ownerFileId}/download`).set("Authorization", `Bearer ${ownerToken}`);
      expectError(gone, 404, "NOT_FOUND", "File không còn tồn tại trên server");
    });

    it("bản ghi thiếu fileUrl -> 404 NOT_FOUND, không văng lỗi", async () => {
      const broken = await Upload.create({ fileName: `${PREFIX}broken.pdf`, uploadedBy: (await Upload.findById(ownerFileId))!.uploadedBy });
      const res = await request(app).get(`/api/upload/${broken._id}/download`).set("Authorization", `Bearer ${ownerToken}`);
      expectError(res, 404, "NOT_FOUND", "File thiếu dữ liệu, không thể tải");
    });
  });

  describe("DELETE /api/upload/:id (xoá mềm)", () => {
    it("người khác xoá -> 403 và file vẫn còn", async () => {
      const id = (await upload(ownerToken, "del-forbidden")).body.data[0]._id;

      const res = await request(app).delete(`/api/upload/${id}`).set("Authorization", `Bearer ${otherToken}`);

      expectError(res, 403, "FORBIDDEN", "Bạn không có quyền xoá file này");
      expect((await Upload.findById(id))!.isDeleted).toBe(false);
    });

    it("id không tồn tại -> 404 NOT_FOUND tiếng Việt (trước đây 'File not found')", async () => {
      const res = await request(app).delete(`/api/upload/${new Types.ObjectId()}`).set("Authorization", `Bearer ${ownerToken}`);
      expectError(res, 404, "NOT_FOUND", "Không tìm thấy file");
    });

    it("chủ sở hữu xoá -> 200 { success, message }, sau đó xem/tải đều 404 'đã được xóa'", async () => {
      const id = (await upload(ownerToken, "del-ok")).body.data[0]._id;

      const res = await request(app).delete(`/api/upload/${id}`).set("Authorization", `Bearer ${ownerToken}`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, message: "Đã xoá file" });
      expect((await Upload.findById(id))!.isDeleted).toBe(true);

      const detail = await request(app).get(`/api/upload/${id}`).set("Authorization", `Bearer ${ownerToken}`);
      const download = await request(app).get(`/api/upload/${id}/download`).set("Authorization", `Bearer ${ownerToken}`);
      expectError(detail, 404, "NOT_FOUND", "File đã được xóa rồi");
      expectError(download, 404, "NOT_FOUND", "File đã được xóa rồi");
    });

    it("ADMIN xoá được file của người khác -> 200", async () => {
      const id = (await upload(ownerToken, "del-admin")).body.data[0]._id;
      const res = await request(app).delete(`/api/upload/${id}`).set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
    });
  });

  describe("GET /api/upload (danh sách)", () => {
    it("chủ sở hữu chỉ thấy file của mình; format { success, data, pagination } giữ nguyên", async () => {
      const res = await request(app).get("/api/upload").set("Authorization", `Bearer ${otherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
      expect(res.body.pagination).toBeDefined();

      const mine = await request(app).get("/api/upload").set("Authorization", `Bearer ${ownerToken}`);
      expect(mine.body.data.length).toBeGreaterThan(0);
    });

    it("query sai (limit không hợp lệ) -> 400 từ validateQuery, không đổi", async () => {
      const res = await request(app).get("/api/upload?limit=abc").set("Authorization", `Bearer ${ownerToken}`);
      expect(res.status).toBe(400);
    });
  });
});

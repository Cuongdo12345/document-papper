/**
 * BR-15 (docs/31_BACKEND_CODE_REVIEW.md, DEV-103, 2026-09-30) — E2E: giới hạn
 * số file mỗi request của `POST /api/upload` (10 file, user chốt), qua HTTP
 * THẬT (supertest + multer ghi đĩa thật + MongoDB in-memory).
 *
 * File thật được ghi vào `backend/uploads/` (đường dẫn cố định của
 * `upload.middleware.ts`), nên mọi file của test này mang tiền tố
 * `br15-e2e-` và được xoá trong `afterAll`.
 */
import request from "supertest";
import fs from "fs";
import path from "path";
import { startE2EDatabase, stopE2EDatabase } from "./setup";
import { seedRbac, seedDepartments, seedUser } from "./seedTestData";
import { Upload } from "../../models/uploadFiles/upload.model";
import { MAX_FILES_PER_REQUEST } from "../../services/upload/upload.middleware";

const PASSWORD = "Password123";
const PREFIX = "br15-e2e-";
const UPLOAD_DIR = path.join(__dirname, "../../../uploads");

const filesOnDisk = () => fs.readdirSync(UPLOAD_DIR).filter((f) => f.includes(PREFIX));

describe("E2E — Giới hạn số file mỗi request upload (BR-15)", () => {
  let app: import("express").Express;
  let token: string;
  let userToken: string;

  const upload = (count: number, auth: string = token) => {
    let req = request(app).post("/api/upload").set("Authorization", `Bearer ${auth}`);
    for (let i = 0; i < count; i++) {
      req = req.attach("files", Buffer.from(`%PDF-1.4 br15 ${i}`), { filename: `${PREFIX}${i}.pdf`, contentType: "application/pdf" });
    }
    return req;
  };

  beforeAll(async () => {
    await startE2EDatabase();
    app = (await import("../../app")).default;
    const roleIds = await seedRbac();
    const { deptA } = await seedDepartments();
    await seedUser({ username: "br15_admin", password: PASSWORD, fullName: "Admin", roleId: roleIds.ADMIN, departmentId: deptA });
    await seedUser({ username: "br15_user", password: PASSWORD, fullName: "User", roleId: roleIds.USER, departmentId: deptA });
    token = (await request(app).post("/api/auths/login").send({ username: "br15_admin", password: PASSWORD })).body.data.accessToken;
    userToken = (await request(app).post("/api/auths/login").send({ username: "br15_user", password: PASSWORD })).body.data.accessToken;
  }, 60_000);

  afterAll(async () => {
    for (const f of filesOnDisk()) fs.unlinkSync(path.join(UPLOAD_DIR, f));
    await stopE2EDatabase();
  });

  it("giới hạn là 10 file", () => {
    expect(MAX_FILES_PER_REQUEST).toBe(10);
  });

  it("không token -> 401", async () => {
    expect((await request(app).post("/api/upload")).status).toBe(401);
  });

  it("đúng 10 file -> 200, lưu đủ 10 bản ghi", async () => {
    const res = await upload(10);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(10);
    expect(await Upload.countDocuments()).toBe(10);
    expect(filesOnDisk()).toHaveLength(10);
  });

  it("11 file -> 400 MULTER_LIMIT_FILE_COUNT, KHÔNG lưu bản ghi nào, KHÔNG để lại file dở trên đĩa", async () => {
    const dbBefore = await Upload.countDocuments();
    const diskBefore = filesOnDisk().length;

    const res = await upload(11);

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe("MULTER_LIMIT_FILE_COUNT");
    expect(res.body.message).toBe("Vượt quá số lượng file cho phép");
    expect(await Upload.countDocuments()).toBe(dbBefore);
    expect(filesOnDisk()).toHaveLength(diskBefore);
  });

  it("USER thiếu UPLOAD_FILES -> 403, kể cả khi gửi 1 file hợp lệ (route vẫn được bảo vệ)", async () => {
    const before = await Upload.countDocuments();
    const res = await upload(1, userToken);
    expect(res.status).toBe(403);
    expect(await Upload.countDocuments()).toBe(before);
  });
});

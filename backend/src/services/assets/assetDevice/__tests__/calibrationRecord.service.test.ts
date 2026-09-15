// (A2, 2026-09-15) Regression test cho `getCalibrationCertificateFileService`
// — endpoint mới tải file giấy chứng nhận kiểm định thật, thay cho
// `certificateFileUrl` cũ (đường dẫn chết `/uploads/<filename>`, xem comment
// gốc `calibrationRecord.service.ts`). Mock toàn bộ Model + `fs.existsSync`
// — cùng cách `assetAssignment.service.test.ts` đã làm, không dùng DB thật.
jest.mock("../../../../models/assets/medicalDeviceProfile.model", () => ({
  MedicalDeviceProfile: { findOne: jest.fn() },
}));
jest.mock("../../../../models/assets/calibrationRecord.model", () => ({
  CalibrationRecord: { findOne: jest.fn() },
}));
jest.mock("../../../../models/uploadFiles/upload.model", () => ({
  Upload: { findById: jest.fn(), create: jest.fn(), updateOne: jest.fn() },
}));
jest.mock("fs", () => ({
  existsSync: jest.fn(),
  unlink: jest.fn(),
}));
jest.mock("../../../../shared/utils/withTransaction");

import { MedicalDeviceProfile } from "../../../../models/assets/medicalDeviceProfile.model";
import { CalibrationRecord } from "../../../../models/assets/calibrationRecord.model";
import { Upload } from "../../../../models/uploadFiles/upload.model";
import { withTransaction } from "../../../../shared/utils/withTransaction";
import fs from "fs";
import {
  getCalibrationCertificateFileService,
  updateCalibrationCertificateService,
} from "../calibrationRecord.service";

const mockedProfile = MedicalDeviceProfile as any;
const mockedRecord = CalibrationRecord as any;
const mockedUpload = Upload as any;
const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedWithTransaction = withTransaction as unknown as jest.Mock;

const ASSET_ID = "507f1f77bcf86cd799439011";
const RECORD_ID = "507f1f77bcf86cd799439022";
const UPLOAD_ID = "507f1f77bcf86cd799439033";

describe("getCalibrationCertificateFileService (A2)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("ID không hợp lệ (assetId hoặc recordId) → 400, không chạm DB", async () => {
    await expect(
      getCalibrationCertificateFileService("not-an-id", RECORD_ID),
    ).rejects.toMatchObject({ status: 400 });
    expect(mockedProfile.findOne).not.toHaveBeenCalled();
  });

  it("Asset chưa có profile thiết bị y tế → 404", async () => {
    mockedProfile.findOne.mockResolvedValue(null);

    await expect(
      getCalibrationCertificateFileService(ASSET_ID, RECORD_ID),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("record không thuộc đúng profile/assetId (IDOR-style mismatch) → 404, KHÔNG lộ record thiết bị khác", async () => {
    mockedProfile.findOne.mockResolvedValue({ _id: "profile-1" });
    mockedRecord.findOne.mockResolvedValue(null);

    await expect(
      getCalibrationCertificateFileService(ASSET_ID, RECORD_ID),
    ).rejects.toMatchObject({ status: 404 });
    expect(mockedRecord.findOne).toHaveBeenCalledWith({
      _id: RECORD_ID,
      deviceProfile: "profile-1",
    });
  });

  it("record dùng link nhập tay (certificateFileUrl, không có certificateFileId) → 404 kèm message hướng dẫn dùng link trực tiếp", async () => {
    mockedProfile.findOne.mockResolvedValue({ _id: "profile-1" });
    mockedRecord.findOne.mockResolvedValue({
      certificateFileId: undefined,
      certificateFileUrl: "https://example.com/cert.pdf",
    });

    await expect(
      getCalibrationCertificateFileService(ASSET_ID, RECORD_ID),
    ).rejects.toMatchObject({ status: 404, message: expect.stringContaining("link chứng nhận nhập tay") });
  });

  it("record chưa đính kèm chứng nhận nào → 404 kèm message khác (không có cả file lẫn link)", async () => {
    mockedProfile.findOne.mockResolvedValue({ _id: "profile-1" });
    mockedRecord.findOne.mockResolvedValue({
      certificateFileId: undefined,
      certificateFileUrl: undefined,
    });

    await expect(
      getCalibrationCertificateFileService(ASSET_ID, RECORD_ID),
    ).rejects.toMatchObject({ status: 404, message: expect.stringContaining("chưa đính kèm") });
  });

  it("Upload doc đã bị xoá mềm (isDeleted) → 404", async () => {
    mockedProfile.findOne.mockResolvedValue({ _id: "profile-1" });
    mockedRecord.findOne.mockResolvedValue({ certificateFileId: UPLOAD_ID });
    mockedUpload.findById.mockResolvedValue({ isDeleted: true });

    await expect(
      getCalibrationCertificateFileService(ASSET_ID, RECORD_ID),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("File không còn tồn tại trên đĩa (đã bị xoá ngoài ý muốn) → 404", async () => {
    mockedProfile.findOne.mockResolvedValue({ _id: "profile-1" });
    mockedRecord.findOne.mockResolvedValue({ certificateFileId: UPLOAD_ID });
    mockedUpload.findById.mockResolvedValue({
      isDeleted: false,
      fileUrl: "/uploads/123-cert.pdf",
      fileName: "cert.pdf",
    });
    mockedFs.existsSync.mockReturnValue(false);

    await expect(
      getCalibrationCertificateFileService(ASSET_ID, RECORD_ID),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("thành công — trả về filePath (basename từ fileUrl, path traversal-safe) + fileName gốc", async () => {
    mockedProfile.findOne.mockResolvedValue({ _id: "profile-1" });
    mockedRecord.findOne.mockResolvedValue({ certificateFileId: UPLOAD_ID });
    mockedUpload.findById.mockResolvedValue({
      isDeleted: false,
      fileUrl: "/uploads/../../etc/passwd", // giả lập dữ liệu bất thường — basename() phải loại bỏ traversal
      fileName: "chung-nhan-kiem-dinh.pdf",
    });
    mockedFs.existsSync.mockReturnValue(true);

    const result = await getCalibrationCertificateFileService(ASSET_ID, RECORD_ID);

    expect(result.fileName).toBe("chung-nhan-kiem-dinh.pdf");
    expect(result.filePath.endsWith("passwd")).toBe(true);
    expect(result.filePath).not.toContain("..");
  });
});

// (Bổ sung sau A2 gốc, theo yêu cầu user 2026-09-15: "upload nhầm file thì
// sửa lại được") — regression test cho `updateCalibrationCertificateService`.
describe("updateCalibrationCertificateService (bổ sung sau A2)", () => {
  const CERTIFICATE_FILE = { path: "/tmp/new-cert.pdf", originalname: "new-cert.pdf", filename: "123-new-cert.pdf", size: 100, mimetype: "application/pdf" } as any;

  const makeRecordDoc = (overrides: Record<string, any> = {}) => ({
    certificateFileId: undefined,
    certificateFileUrl: undefined,
    save: jest.fn(),
    populate: jest.fn().mockResolvedValue({ _id: "record-1" }),
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockedWithTransaction.mockImplementation(async (fn: any) => fn("fake-session"));
  });

  it("ID không hợp lệ → 400, không chạm DB", async () => {
    await expect(
      updateCalibrationCertificateService("not-an-id", RECORD_ID, {}),
    ).rejects.toMatchObject({ status: 400 });
    expect(mockedProfile.findOne).not.toHaveBeenCalled();
  });

  it("gửi CẢ certificateFile LẪN certificateFileUrl → 400, không chạm DB", async () => {
    await expect(
      updateCalibrationCertificateService(ASSET_ID, RECORD_ID, { certificateFileUrl: "https://x" }, "user-1", CERTIFICATE_FILE),
    ).rejects.toMatchObject({ status: 400 });
    expect(mockedProfile.findOne).not.toHaveBeenCalled();
  });

  it("KHÔNG gửi cái nào (không file, không url) → 400 — phải cung cấp đúng 1 trong 2", async () => {
    await expect(
      updateCalibrationCertificateService(ASSET_ID, RECORD_ID, {}),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("record không thuộc đúng profile/assetId → 404, KHÔNG lộ record thiết bị khác", async () => {
    mockedProfile.findOne.mockResolvedValue({ _id: "profile-1" });
    mockedRecord.findOne.mockResolvedValue(null);

    await expect(
      updateCalibrationCertificateService(ASSET_ID, RECORD_ID, { certificateFileUrl: "https://example.com/cert.pdf" }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("thay bằng link mới — set certificateFileUrl, XOÁ certificateFileId cũ (nếu có), soft-delete Upload cũ", async () => {
    mockedProfile.findOne.mockResolvedValue({ _id: "profile-1" });
    const recordDoc = makeRecordDoc({ certificateFileId: "old-upload-id" });
    mockedRecord.findOne.mockResolvedValue(recordDoc);

    await updateCalibrationCertificateService(ASSET_ID, RECORD_ID, { certificateFileUrl: "https://example.com/moi.pdf" }, "user-1");

    expect(recordDoc.certificateFileUrl).toBe("https://example.com/moi.pdf");
    expect(recordDoc.certificateFileId).toBeUndefined();
    expect(recordDoc.save).toHaveBeenCalledWith({ session: "fake-session" });
    expect(mockedUpload.updateOne).toHaveBeenCalledWith(
      { _id: "old-upload-id" },
      { isDeleted: true },
      { session: "fake-session" },
    );
  });

  it("thay bằng file mới — tạo Upload mới, set certificateFileId mới, XOÁ certificateFileUrl cũ", async () => {
    mockedProfile.findOne.mockResolvedValue({ _id: "profile-1" });
    const recordDoc = makeRecordDoc({ certificateFileUrl: "https://old-link.example.com" });
    mockedRecord.findOne.mockResolvedValue(recordDoc);
    mockedUpload.create.mockResolvedValue([{ _id: "new-upload-id" }]);

    await updateCalibrationCertificateService(ASSET_ID, RECORD_ID, {}, "user-1", CERTIFICATE_FILE);

    expect(recordDoc.certificateFileId).toBe("new-upload-id");
    expect(recordDoc.certificateFileUrl).toBeUndefined();
    // Không có certificateFileId CŨ (record chỉ có link cũ) → không gọi soft-delete Upload nào.
    expect(mockedUpload.updateOne).not.toHaveBeenCalled();
  });

  it("record CHƯA có chứng nhận nào trước đó — vẫn thay thế (thêm mới) bình thường, không lỗi", async () => {
    mockedProfile.findOne.mockResolvedValue({ _id: "profile-1" });
    const recordDoc = makeRecordDoc();
    mockedRecord.findOne.mockResolvedValue(recordDoc);
    mockedUpload.create.mockResolvedValue([{ _id: "new-upload-id" }]);

    await updateCalibrationCertificateService(ASSET_ID, RECORD_ID, {}, "user-1", CERTIFICATE_FILE);

    expect(recordDoc.certificateFileId).toBe("new-upload-id");
    expect(mockedUpload.updateOne).not.toHaveBeenCalled();
  });
});

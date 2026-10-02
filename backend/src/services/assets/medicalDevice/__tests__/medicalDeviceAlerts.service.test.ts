// [MỚI] Đóng gap đã ghi nhận (comment gốc `runMedicalDeviceAlertsService`):
// `licenseExpiredAt` được lưu trên `MedicalDeviceProfile` nhưng trước đây
// KHÔNG có cron/test nào theo dõi. File này cover `checkLicenseExpiringService`
// (mirror `checkWarrantyExpiringService`/`checkCalibrationDueService`, chưa
// từng có test riêng trước đây) + shape kết hợp của `runMedicalDeviceAlertsService`.
// Mock model — cùng cách `calibrationRecord.service.test.ts` đã làm (không
// dùng DB thật, jest thường của repo không có mongodb-memory-server).
jest.mock("../../../../models/assets/medicalDeviceProfile.model", () => ({
  MedicalDeviceProfile: { find: jest.fn() },
}));
jest.mock("../../../../models/assets/operatorCertificate.model", () => ({
  OperatorCertificate: { find: jest.fn() },
}));
jest.mock("../../../../models/rbac/role.model", () => ({
  Role: { findOne: jest.fn() },
}));
jest.mock("../../../../models/users/user.model", () => ({
  User: { countDocuments: jest.fn() },
}));
jest.mock("../../../notifications/notification.service", () => ({
  notifyUsersByRoleName: jest.fn(),
  createNotification: jest.fn(),
}));

import { MedicalDeviceProfile } from "../../../../models/assets/medicalDeviceProfile.model";
import { OperatorCertificate } from "../../../../models/assets/operatorCertificate.model";
import { Role } from "../../../../models/rbac/role.model";
import { User } from "../../../../models/users/user.model";
import { notifyUsersByRoleName, createNotification } from "../../../notifications/notification.service";
import {
  checkLicenseExpiringService,
  checkOperatorCertificateExpiringService,
  runMedicalDeviceAlertsService,
} from "../medicalDeviceAlerts.service";

const mockedProfile = MedicalDeviceProfile as any;
const mockedCertificate = OperatorCertificate as any;
const mockedRole = Role as any;
const mockedUser = User as any;
const mockedNotify = notifyUsersByRoleName as jest.Mock;
const mockedCreateNotification = createNotification as jest.Mock;

const makeProfile = (overrides: Record<string, any> = {}) => ({
  licenseExpiredAt: new Date("2026-10-01"),
  licenseAlertSentAt: null,
  asset: {
    _id: "asset-1",
    name: "Máy X-quang",
    assetCode: "TB-001",
    isActive: true,
    department: { name: "Khoa Chẩn đoán hình ảnh" },
  },
  save: jest.fn(),
  ...overrides,
});

function mockRecipients(exists: boolean) {
  mockedRole.findOne.mockReturnValue({
    select: jest.fn().mockResolvedValue(exists ? { _id: "role-it" } : null),
  });
  mockedUser.countDocuments.mockResolvedValue(exists ? 1 : 0);
}

describe("checkLicenseExpiringService (đóng gap cảnh báo hết hạn giấy phép lưu hành)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("role IT không tồn tại trong DB → {checked:0, notified:0}, không query profile", async () => {
    mockedRole.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });

    const result = await checkLicenseExpiringService();

    expect(result).toEqual({ checked: 0, notified: 0 });
    expect(mockedProfile.find).not.toHaveBeenCalled();
  });

  it("role IT tồn tại nhưng chưa có user active nào → {checked:0, notified:0}", async () => {
    mockedRole.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue({ _id: "role-it" }) });
    mockedUser.countDocuments.mockResolvedValue(0);

    const result = await checkLicenseExpiringService();

    expect(result).toEqual({ checked: 0, notified: 0 });
    expect(mockedProfile.find).not.toHaveBeenCalled();
  });

  it("query đúng điều kiện: licenseExpiredAt <= threshold (30 ngày), licenseAlertSentAt null", async () => {
    mockRecipients(true);
    const populate = jest.fn().mockResolvedValue([]);
    mockedProfile.find.mockReturnValue({ populate });

    await checkLicenseExpiringService();

    expect(mockedProfile.find).toHaveBeenCalledWith({
      licenseExpiredAt: { $ne: null, $lte: expect.any(Date) },
      licenseAlertSentAt: null,
    });
  });

  it("thiết bị SẮP hết hạn (còn trong 30 ngày) — gửi thông báo đúng title/message, đánh dấu licenseAlertSentAt", async () => {
    mockRecipients(true);
    const futureDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    const profile = makeProfile({ licenseExpiredAt: futureDate });
    mockedProfile.find.mockReturnValue({ populate: jest.fn().mockResolvedValue([profile]) });

    const result = await checkLicenseExpiringService();

    expect(result).toEqual({ checked: 1, notified: 1 });
    expect(mockedNotify).toHaveBeenCalledWith(
      "IT",
      expect.objectContaining({
        type: "MEDICAL_DEVICE_LICENSE_EXPIRING",
        title: "Thiết bị y tế sắp hết hạn giấy phép lưu hành",
        message: expect.stringContaining("Máy X-quang"),
        resourceType: "Asset",
        resourceId: "asset-1",
        priority: "high",
        sendEmail: true,
      }),
    );
    expect(profile.licenseAlertSentAt).toBeInstanceOf(Date);
    expect(profile.save).toHaveBeenCalledTimes(1);
  });

  it("thiết bị ĐÃ hết hạn giấy phép — title/message khác (đã hết hạn, không phải sắp)", async () => {
    mockRecipients(true);
    const pastDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    const profile = makeProfile({ licenseExpiredAt: pastDate });
    mockedProfile.find.mockReturnValue({ populate: jest.fn().mockResolvedValue([profile]) });

    await checkLicenseExpiringService();

    expect(mockedNotify).toHaveBeenCalledWith(
      "IT",
      expect.objectContaining({
        title: "Thiết bị y tế đã hết hạn giấy phép lưu hành",
        message: expect.stringContaining("đã hết hạn giấy phép lưu hành từ"),
      }),
    );
  });

  it("asset liên kết đã bị vô hiệu hoá (isActive=false) — bỏ qua, KHÔNG gửi, KHÔNG đánh dấu đã gửi", async () => {
    mockRecipients(true);
    const profile = makeProfile({ asset: { ...makeProfile().asset, isActive: false } });
    mockedProfile.find.mockReturnValue({ populate: jest.fn().mockResolvedValue([profile]) });

    const result = await checkLicenseExpiringService();

    expect(result).toEqual({ checked: 1, notified: 0 });
    expect(mockedNotify).not.toHaveBeenCalled();
    expect(profile.save).not.toHaveBeenCalled();
  });

  it("asset không populate được (null) — bỏ qua an toàn, không throw", async () => {
    mockRecipients(true);
    const profile = makeProfile({ asset: null });
    mockedProfile.find.mockReturnValue({ populate: jest.fn().mockResolvedValue([profile]) });

    const result = await checkLicenseExpiringService();

    expect(result).toEqual({ checked: 1, notified: 0 });
    expect(mockedNotify).not.toHaveBeenCalled();
  });

  it("nhiều profile — chỉ đếm notified cho profile thực sự gửi được", async () => {
    mockRecipients(true);
    const okProfile = makeProfile();
    const inactiveAssetProfile = makeProfile({ asset: { ...makeProfile().asset, isActive: false } });
    mockedProfile.find.mockReturnValue({
      populate: jest.fn().mockResolvedValue([okProfile, inactiveAssetProfile]),
    });

    const result = await checkLicenseExpiringService();

    expect(result).toEqual({ checked: 2, notified: 1 });
  });
});

describe("checkOperatorCertificateExpiringService (DEV-077, đóng gap theo dõi chứng chỉ vận hành)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const makeCertificate = (overrides: Record<string, any> = {}) => ({
    expiresAt: new Date("2026-10-01"),
    alertSentAt: null,
    user: { _id: "user-1", username: "ktvien_x", fullName: "Nguyễn Văn A", isActive: true },
    deviceCategory: { name: "Máy chạy thận" },
    save: jest.fn(),
    ...overrides,
  });

  it("role IT không tồn tại → {checked:0, notified:0}, không query certificate", async () => {
    mockedRole.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });

    const result = await checkOperatorCertificateExpiringService();

    expect(result).toEqual({ checked: 0, notified: 0 });
    expect(mockedCertificate.find).not.toHaveBeenCalled();
  });

  it("query đúng điều kiện: expiresAt <= threshold (30 ngày), alertSentAt null", async () => {
    mockRecipients(true);
    mockedCertificate.find.mockReturnValue({ populate: jest.fn().mockResolvedValue([]) });

    await checkOperatorCertificateExpiringService();

    expect(mockedCertificate.find).toHaveBeenCalledWith({
      expiresAt: { $lte: expect.any(Date) },
      alertSentAt: null,
      isActive: true,
    });
  });

  it("gửi CẢ role IT LẪN chính người có chứng chỉ, đánh dấu alertSentAt", async () => {
    mockRecipients(true);
    const cert = makeCertificate();
    mockedCertificate.find.mockReturnValue({ populate: jest.fn().mockResolvedValue([cert]) });

    const result = await checkOperatorCertificateExpiringService();

    expect(result).toEqual({ checked: 1, notified: 1 });
    expect(mockedNotify).toHaveBeenCalledWith(
      "IT",
      expect.objectContaining({
        type: "OPERATOR_CERTIFICATE_EXPIRING",
        message: expect.stringContaining("Nguyễn Văn A"),
      }),
    );
    expect(mockedCreateNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        recipient: "user-1",
        type: "OPERATOR_CERTIFICATE_EXPIRING",
        message: expect.stringContaining("của bạn"),
      }),
    );
    expect(cert.alertSentAt).toBeInstanceOf(Date);
    expect(cert.save).toHaveBeenCalledTimes(1);
  });

  it("user liên kết đã bị vô hiệu hoá — bỏ qua, KHÔNG gửi, KHÔNG đánh dấu đã gửi", async () => {
    mockRecipients(true);
    const cert = makeCertificate({ user: { ...makeCertificate().user, isActive: false } });
    mockedCertificate.find.mockReturnValue({ populate: jest.fn().mockResolvedValue([cert]) });

    const result = await checkOperatorCertificateExpiringService();

    expect(result).toEqual({ checked: 1, notified: 0 });
    expect(mockedNotify).not.toHaveBeenCalled();
    expect(mockedCreateNotification).not.toHaveBeenCalled();
    expect(cert.save).not.toHaveBeenCalled();
  });
});

describe("runMedicalDeviceAlertsService — kết hợp cả 3 loại cảnh báo", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("[CẬP NHẬT DEV-077] trả về shape { calibration, license, operatorCertificate } — cả 3 chạy song song, không loại nào bị bỏ sót", async () => {
    mockedRole.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });

    const result = await runMedicalDeviceAlertsService();

    expect(result).toEqual({
      calibration: { checked: 0, notified: 0 },
      license: { checked: 0, notified: 0 },
      operatorCertificate: { checked: 0, notified: 0 },
    });
  });
});

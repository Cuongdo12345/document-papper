// [MỚI] `medicalDevice.service.ts` trước đây KHÔNG có test nào. File này chỉ
// cover đúng phạm vi thay đổi của task "cảnh báo hết hạn giấy phép lưu hành":
// `updateMedicalDeviceProfileService` phải reset `licenseAlertSentAt` về null
// khi `licenseExpiredAt` nằm trong payload (cùng lý do/pattern
// `warrantyAlertSentAt` ở `asset.service.ts::updateAssetService`) — KHÔNG mở
// rộng ra cover toàn bộ CRUD của service (ngoài phạm vi task này).
jest.mock("../../../../models/assets/asset.model", () => ({
  Asset: { findOne: jest.fn() },
}));
jest.mock("../../../../models/assets/medicalDeviceProfile.model", () => ({
  MedicalDeviceProfile: { findOne: jest.fn() },
}));

import { Asset } from "../../../../models/assets/asset.model";
import { MedicalDeviceProfile } from "../../../../models/assets/medicalDeviceProfile.model";
import { updateMedicalDeviceProfileService } from "../medicalDevice.service";

const mockedAsset = Asset as any;
const mockedProfile = MedicalDeviceProfile as any;

const ASSET_ID = "507f1f77bcf86cd799439011";

const makeProfileDoc = (overrides: Record<string, any> = {}): Record<string, any> => ({
  requiresCalibration: false,
  calibrationIntervalMonths: undefined,
  licenseExpiredAt: new Date("2026-01-01"),
  licenseAlertSentAt: new Date("2025-12-01"), // đã từng gửi cảnh báo cho hạn CŨ
  save: jest.fn(),
  populate: jest.fn().mockResolvedValue({ _id: "profile-1" }),
  ...overrides,
});

describe("updateMedicalDeviceProfileService — reset licenseAlertSentAt (đóng gap cảnh báo giấy phép lưu hành)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAsset.findOne.mockResolvedValue({ _id: ASSET_ID, isActive: true });
  });

  it("payload có licenseExpiredAt mới → licenseAlertSentAt reset về null trước khi save", async () => {
    const profile = makeProfileDoc();
    mockedProfile.findOne.mockResolvedValue(profile);

    await updateMedicalDeviceProfileService(ASSET_ID, { licenseExpiredAt: new Date("2027-01-01") });

    expect(profile.licenseAlertSentAt).toBeNull();
    expect(profile.save).toHaveBeenCalledTimes(1);
  });

  it("payload KHÔNG đụng licenseExpiredAt → licenseAlertSentAt giữ nguyên (không reset nhầm)", async () => {
    const profile = makeProfileDoc();
    mockedProfile.findOne.mockResolvedValue(profile);
    const originalAlertSentAt = profile.licenseAlertSentAt;

    await updateMedicalDeviceProfileService(ASSET_ID, { registrationNumber: "SDK-999" });

    expect(profile.licenseAlertSentAt).toBe(originalAlertSentAt);
    expect(profile.registrationNumber).toBe("SDK-999");
  });
});

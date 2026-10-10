import { describe, expect, it } from "vitest";
import { getLicenseExpiryState, LICENSE_EXPIRING_SOON_DAYS } from "@/features/softwareLicenses/constants/softwareLicense.constants";

const NOW = new Date("2026-10-09T00:00:00Z");
const inDays = (n: number) => new Date(NOW.getTime() + n * 24 * 60 * 60 * 1000).toISOString();

describe("getLicenseExpiryState (FE-43)", () => {
  it("bản quyền vĩnh viễn hoặc không có ngày hết hạn -> none", () => {
    expect(getLicenseExpiryState({ licenseType: "PERPETUAL", expiresAt: undefined, isExpired: false }, NOW)).toBe("none");
    expect(getLicenseExpiryState({ licenseType: "SUBSCRIPTION", expiresAt: undefined, isExpired: false }, NOW)).toBe("none");
  });

  it("backend báo đã hết hạn -> expired (kể cả khi tính lại ở client lệch giờ)", () => {
    expect(getLicenseExpiryState({ licenseType: "SUBSCRIPTION", expiresAt: inDays(-3), isExpired: true }, NOW)).toBe("expired");
  });

  it(`còn ≤ ${LICENSE_EXPIRING_SOON_DAYS} ngày -> expiring; xa hơn -> ok`, () => {
    expect(getLicenseExpiryState({ licenseType: "SUBSCRIPTION", expiresAt: inDays(LICENSE_EXPIRING_SOON_DAYS), isExpired: false }, NOW)).toBe("expiring");
    expect(getLicenseExpiryState({ licenseType: "SUBSCRIPTION", expiresAt: inDays(5), isExpired: false }, NOW)).toBe("expiring");
    expect(getLicenseExpiryState({ licenseType: "SUBSCRIPTION", expiresAt: inDays(LICENSE_EXPIRING_SOON_DAYS + 1), isExpired: false }, NOW)).toBe("ok");
  });
});

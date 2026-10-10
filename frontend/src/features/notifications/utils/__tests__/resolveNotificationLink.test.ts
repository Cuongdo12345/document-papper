import { describe, expect, it } from "vitest";
import { resolveNotificationLink } from "@/features/notifications/utils/resolveNotificationLink";

describe("resolveNotificationLink", () => {
  it("Document -> trang chi tiết tài liệu", () => {
    expect(resolveNotificationLink({ resourceType: "Document", resourceId: "d1" })).toBe("/app/documents/d1");
  });

  it("Asset -> đường dẫn cũ /app/assets/:id (trang chuyển hướng tự tìm đúng module CNTT / y tế)", () => {
    expect(resolveNotificationLink({ resourceType: "Asset", resourceId: "a1" })).toBe("/app/assets/a1");
  });

  it("SoftwareLicense -> trang chi tiết bản quyền (FE-43)", () => {
    expect(resolveNotificationLink({ resourceType: "SoftwareLicense", resourceId: "l1" })).toBe("/app/software-licenses/l1");
  });

  it("loại chưa có trang đích, hoặc thiếu id -> null (không dẫn tới trang 404)", () => {
    expect(resolveNotificationLink({ resourceType: "WorkflowInstance", resourceId: "w1" })).toBeNull();
    expect(resolveNotificationLink({ resourceType: "ImportHistory", resourceId: "i1" })).toBeNull();
    expect(resolveNotificationLink({ resourceType: "Asset", resourceId: undefined })).toBeNull();
    expect(resolveNotificationLink({ resourceType: undefined, resourceId: "x" })).toBeNull();
  });
});

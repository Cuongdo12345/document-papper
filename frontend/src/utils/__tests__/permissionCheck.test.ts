import { describe, it, expect } from "vitest";
import { checkHasPermission, checkHasAnyPermission, checkHasAllPermissions } from "@/utils/permissionCheck";

// FE-01 Mục 45 — test case BẮT BUỘC cho RBAC (đọc thẳng `user.permissions`
// đã tính sẵn ở backend, KHÔNG tự tính lại effective permission ở FE).

describe("permissionCheck — checkHasPermission", () => {
  it("permissions = ['USER_READ'] → hasPermission('USER_READ') = true, hasPermission('USER_CREATE') = false", () => {
    const permissions = ["USER_READ"];
    expect(checkHasPermission(permissions, "USER_READ")).toBe(true);
    expect(checkHasPermission(permissions, "USER_CREATE")).toBe(false);
  });

  it("permissions = [] → mọi permission (kể cả không tồn tại) đều false", () => {
    const permissions: string[] = [];
    expect(checkHasPermission(permissions, "USER_READ")).toBe(false);
    expect(checkHasPermission(permissions, "SOMETHING_NOT_REAL")).toBe(false);
  });

  it("ADMIN/isSystemRole=true nhưng permissions=[] → FE KHÔNG tự biến [] thành toàn quyền", () => {
    // Mô phỏng đúng tình huống DB chưa seed đủ permission cho role ADMIN —
    // hasPermission() KHÔNG được đọc `isSystemRole` để bypass, CHỈ đọc mảng.
    const permissions: string[] = [];
    expect(checkHasPermission(permissions, "SYSTEM_ADMIN")).toBe(false);
    expect(checkHasPermission(permissions, ["USER_READ", "USER_CREATE"])).toBe(false);
  });

  it("hỗ trợ mảng permission (any-match) khi truyền required là string[]", () => {
    const permissions = ["DOCUMENT_VIEW"];
    expect(checkHasPermission(permissions, ["DOCUMENT_VIEW", "DOCUMENT_CREATE"])).toBe(true);
    expect(checkHasPermission(permissions, ["DOCUMENT_CREATE", "DOCUMENT_DELETE"])).toBe(false);
  });
});

describe("permissionCheck — checkHasAnyPermission", () => {
  it("true nếu có ÍT NHẤT 1 permission trong danh sách yêu cầu", () => {
    const permissions = ["DOCUMENT_VIEW", "DOCUMENT_CREATE"];
    expect(checkHasAnyPermission(permissions, ["DOCUMENT_CREATE", "DOCUMENT_DELETE"])).toBe(true);
    expect(checkHasAnyPermission(permissions, ["DOCUMENT_DELETE", "USER_DELETE"])).toBe(false);
  });
});

describe("permissionCheck — checkHasAllPermissions", () => {
  it("true CHỈ KHI có ĐỦ TẤT CẢ permission yêu cầu", () => {
    const permissions = ["DOCUMENT_VIEW", "DOCUMENT_CREATE"];
    expect(checkHasAllPermissions(permissions, ["DOCUMENT_VIEW", "DOCUMENT_CREATE"])).toBe(true);
    expect(checkHasAllPermissions(permissions, ["DOCUMENT_VIEW", "DOCUMENT_DELETE"])).toBe(false);
  });
});

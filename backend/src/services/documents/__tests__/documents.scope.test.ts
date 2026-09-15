import {
  isSameDepartment,
  canViewAcrossDepartments,
  applyDepartmentFilter,
} from "../documents.scope";

// MỚI (DEV-041, 2026-09-11) — test riêng cho module vừa RÚT ra (trước đây
// logic này nằm rải rác trong 3 hàm khác nhau, không có test trực tiếp cho
// đúng phép so sánh/OR — xem `documents.scope.ts` đầu file cho bối cảnh).

describe("documents.scope — isSameDepartment", () => {
  it("2 ObjectId/string giống nhau → true", () => {
    expect(isSameDepartment("dept-1", "dept-1")).toBe(true);
  });

  it("2 giá trị khác nhau → false", () => {
    expect(isSameDepartment("dept-1", "dept-2")).toBe(false);
  });

  it("thiếu 1 trong 2 (undefined/null) → luôn false, không throw", () => {
    expect(isSameDepartment(undefined, "dept-1")).toBe(false);
    expect(isSameDepartment("dept-1", undefined)).toBe(false);
    expect(isSameDepartment(null, null)).toBe(false);
  });

  it("hỗ trợ object có .toString() (giống ObjectId thật)", () => {
    const a = { toString: () => "dept-1" };
    const b = { toString: () => "dept-1" };
    expect(isSameDepartment(a, b)).toBe(true);
  });
});

describe("documents.scope — canViewAcrossDepartments", () => {
  it("isAdmin=true → luôn true, bất kể canViewAllDepartments", () => {
    expect(canViewAcrossDepartments({ isAdmin: true })).toBe(true);
    expect(canViewAcrossDepartments({ isAdmin: true, canViewAllDepartments: false })).toBe(true);
  });

  it("canViewAllDepartments=true (permission DOCUMENT_VIEW_ALL_DEPARTMENTS) → true dù không phải admin", () => {
    expect(canViewAcrossDepartments({ isAdmin: false, canViewAllDepartments: true })).toBe(true);
  });

  it("cả 2 đều false/thiếu → false", () => {
    expect(canViewAcrossDepartments({ isAdmin: false })).toBe(false);
    expect(canViewAcrossDepartments({ isAdmin: false, canViewAllDepartments: false })).toBe(false);
  });
});

describe("documents.scope — applyDepartmentFilter", () => {
  it("được xem tất cả phòng ban (isAdmin) → KHÔNG set filter.department", () => {
    const filter: Record<string, any> = {};
    applyDepartmentFilter(filter, { isAdmin: true, callerDepartment: "dept-1" });
    expect(filter.department).toBeUndefined();
  });

  it("được xem tất cả phòng ban (canViewAllDepartments) → KHÔNG set filter.department", () => {
    const filter: Record<string, any> = {};
    applyDepartmentFilter(filter, { isAdmin: false, canViewAllDepartments: true, callerDepartment: "dept-1" });
    expect(filter.department).toBeUndefined();
  });

  it("không được xem tất cả, có callerDepartment → ép đúng khoa người gọi", () => {
    const filter: Record<string, any> = {};
    applyDepartmentFilter(filter, { isAdmin: false, callerDepartment: "dept-1" });
    expect(filter.department).toBe("dept-1");
  });

  it("🔒 fail-closed: không được xem tất cả, THIẾU callerDepartment → filter.department = null (không phải undefined)", () => {
    const filter: Record<string, any> = {};
    applyDepartmentFilter(filter, { isAdmin: false });
    expect(filter.department).toBeNull();
  });

  it("giữ nguyên field khác đã có sẵn trong filter (không ghi đè toàn bộ object)", () => {
    const filter: Record<string, any> = { isActive: true, category: "PROPOSAL" };
    applyDepartmentFilter(filter, { isAdmin: false, callerDepartment: "dept-1" });
    expect(filter).toEqual({ isActive: true, category: "PROPOSAL", department: "dept-1" });
  });
});

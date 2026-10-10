import { describe, expect, it } from "vitest";
import { PERMISSIONS } from "@/constants/permissions";
import { ASSET_MODULES, ASSET_MODULE_LIST, assetDetailPath } from "@/features/assets/constants/assetModule.constants";

describe("ASSET_MODULES (FE-42)", () => {
  it("mỗi module dùng đúng bộ quyền của loại mình, không lẫn sang loại kia", () => {
    for (const [type, prefix, categoryPrefix] of [
      ["IT", "IT_ASSET_", "IT_ASSET_CATEGORY_"],
      ["MEDICAL", "MEDICAL_ASSET_", "MEDICAL_ASSET_CATEGORY_"],
    ] as const) {
      const perms = ASSET_MODULES[type].permissions;
      for (const [key, value] of Object.entries(perms)) {
        expect(value.startsWith(prefix), `${type}.${key} = ${value}`).toBe(true);
        if (key.startsWith("category")) expect(value.startsWith(categoryPrefix), `${type}.${key}`).toBe(true);
      }
    }
  });

  it("20 quyền mỗi module, không trùng nhau và đều là quyền có trong PERMISSIONS", () => {
    const all = new Set<string>();
    for (const m of ASSET_MODULE_LIST) {
      const values = Object.values(m.permissions);
      expect(values).toHaveLength(20);
      expect(new Set(values).size).toBe(20);
      for (const v of values) {
        expect(Object.values(PERMISSIONS)).toContain(v);
        all.add(v);
      }
    }
    expect(all.size).toBe(40); // hai module không dùng chung quyền nào
  });

  it("đường dẫn API và trang khớp loại", () => {
    expect(ASSET_MODULES.IT).toMatchObject({ apiBase: "/it-assets", routeBase: "/app/it-assets", label: "Thiết bị CNTT" });
    expect(ASSET_MODULES.MEDICAL).toMatchObject({ apiBase: "/medical-assets", routeBase: "/app/medical-assets", label: "Thiết bị y tế" });
  });

  it("assetDetailPath dẫn tới trang chi tiết đúng module", () => {
    expect(assetDetailPath("IT", "abc")).toBe("/app/it-assets/abc");
    expect(assetDetailPath("MEDICAL", "xyz")).toBe("/app/medical-assets/xyz");
  });
});

describe("PERMISSIONS khớp danh mục quyền backend (chống lệch)", () => {
  // Đọc thẳng file backend: 46 quyền tách module (IT_ASSET_*, MEDICAL_ASSET_*, SOFTWARE_LICENSE_*) phải có ĐÚNG tên ở cả hai phía.
  // `import.meta.glob` (kiểu có sẵn trong vite/client, không cần @types/node): rỗng nếu thư mục backend không có.
  const found = Object.values(
    import.meta.glob("../../../../../../backend/src/shared/constants/permission.constant.ts", { query: "?raw", import: "default", eager: true }),
  ) as string[];
  const backendSource: string | null = found[0] ?? null;

  it.skipIf(backendSource === null)("mọi quyền IT_ASSET_*/MEDICAL_ASSET_*/SOFTWARE_LICENSE_* của frontend có ở backend và ngược lại", () => {
    const pattern = /^\s+((?:IT_ASSET|MEDICAL_ASSET|SOFTWARE_LICENSE)[A-Z_]*):/gm;
    const backend = new Set([...backendSource!.matchAll(pattern)].map((m) => m[1]));
    const frontend = new Set(Object.values(PERMISSIONS).filter((p) => /^(IT_ASSET|MEDICAL_ASSET|SOFTWARE_LICENSE)/.test(p)));
    expect(backend.size).toBe(46);
    expect([...frontend].sort()).toEqual([...backend].sort());
  });

  // GĐ 8 (DEV-120): 20 quyền cũ ASSET_* / ASSET_CATEGORY_* đã gỡ khỏi cả hai phía — không được vô tình thêm lại.
  const LEGACY = /^ASSET_/;

  it("frontend không còn quyền ASSET_* cũ", () => {
    expect(Object.values(PERMISSIONS).filter((p) => LEGACY.test(p))).toEqual([]);
  });

  it.skipIf(backendSource === null)("backend không còn quyền ASSET_* cũ", () => {
    expect([...backendSource!.matchAll(/^s+(ASSET_[A-Z_]*):/gm)].map((m) => m[1])).toEqual([]);
  });
});

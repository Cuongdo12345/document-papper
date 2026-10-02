import { describe, expect, it } from "vitest";
import type { AssetCategory } from "@/types/asset.types";
import { buildCategoryTree, getCategoryAncestorNames, getDescendantIds } from "../categoryTree";

const cat = (id: string, code: string, parent?: string): AssetCategory => ({
  _id: id,
  code,
  name: `Tên ${code}`,
  parentCategory: parent ? { _id: parent, code: parent, name: `Tên ${parent}` } : null,
});

// Cây 3 cấp giống dữ liệu thật DEV-080: CNTT → CNTT_MAYTINH → PC/LAPTOP; TBYT → TBYT_XN (nhóm rỗng).
const DATA = [
  cat("pc", "PC", "g1"),
  cat("tbyt", "TBYT"),
  cat("g1", "CNTT_MAYTINH", "cntt"),
  cat("laptop", "LAPTOP", "g1"),
  cat("cntt", "CNTT"),
  cat("g2", "TBYT_XN", "tbyt"),
];

describe("categoryTree — buildCategoryTree (DEV-080)", () => {
  it("sắp xếp theo cây (cha trước con, anh em theo mã), đúng depth/isLeaf/ancestors", () => {
    const rows = buildCategoryTree(DATA);
    expect(rows.map((r) => [r.category.code, r.depth, r.isLeaf])).toEqual([
      ["CNTT", 0, false],
      ["CNTT_MAYTINH", 1, false],
      ["LAPTOP", 2, true],
      ["PC", 2, true],
      ["TBYT", 0, false],
      ["TBYT_XN", 1, true],
    ]);
    expect(rows.find((r) => r.category.code === "PC")?.ancestors).toEqual(["Tên CNTT", "Tên CNTT_MAYTINH"]);
  });

  it("cha không nằm trong danh sách (vd lọc từ khoá) → coi là gốc, không bị mất", () => {
    const rows = buildCategoryTree([cat("pc", "PC", "g1")]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ depth: 0, isLeaf: true });
  });

  it("dữ liệu vòng lặp (A↔B) → không treo, không lặp vô hạn", () => {
    const rows = buildCategoryTree([cat("a", "A", "b"), cat("b", "B", "a")]);
    expect(rows).toHaveLength(0); // không ai là gốc — không render, không crash
  });
});

describe("categoryTree — getCategoryAncestorNames (DEV-082)", () => {
  it("trả tên nhóm từ gốc xuống, không gồm chính nó", () => {
    expect(getCategoryAncestorNames(DATA, "pc")).toEqual(["Tên CNTT", "Tên CNTT_MAYTINH"]);
  });

  it("danh mục gốc / id rỗng / id không tồn tại → mảng rỗng", () => {
    expect(getCategoryAncestorNames(DATA, "cntt")).toEqual([]);
    expect(getCategoryAncestorNames(DATA, undefined)).toEqual([]);
    expect(getCategoryAncestorNames(DATA, "khong-co")).toEqual([]);
  });

  it("dữ liệu vòng lặp (A↔B) → không treo", () => {
    expect(getCategoryAncestorNames([cat("a", "A", "b"), cat("b", "B", "a")], "a")).toEqual(["Tên B"]);
  });
});

describe("categoryTree — getDescendantIds (DEV-080)", () => {
  it("gồm chính nó + mọi con cháu, không lẫn nhánh khác", () => {
    expect([...getDescendantIds(DATA, "cntt")].sort()).toEqual(["cntt", "g1", "laptop", "pc"]);
    expect([...getDescendantIds(DATA, "pc")]).toEqual(["pc"]);
  });
});

import type { AssetCategory } from "@/types/asset.types";

/**
 * [MỚI DEV-080] Cây danh mục tài sản — dựng thứ tự hiển thị từ danh sách
 * phẳng mà API trả về (mỗi danh mục chỉ populate 1 cấp `parentCategory`).
 * Dùng chung cho bảng `AssetCategoriesListPage` và mọi dropdown chọn danh mục.
 *
 * Danh mục có cha KHÔNG nằm trong danh sách (vd lọc theo từ khoá/đã ẩn) được
 * coi là gốc — vẫn hiển thị, không bị mất.
 */
export interface CategoryTreeRow {
  category: AssetCategory;
  depth: number;
  /** Không có danh mục con nào trong danh sách — chỉ danh mục lá mới được gán tài sản. */
  isLeaf: boolean;
  /** Tên các danh mục tổ tiên, từ gốc xuống (không gồm chính nó). */
  ancestors: string[];
}

export function buildCategoryTree(categories: AssetCategory[]): CategoryTreeRow[] {
  const ids = new Set(categories.map((c) => c._id));
  const childrenOf = new Map<string, AssetCategory[]>();
  const roots: AssetCategory[] = [];

  for (const c of categories) {
    const parentId = c.parentCategory?._id;
    if (parentId && ids.has(parentId)) {
      childrenOf.set(parentId, [...(childrenOf.get(parentId) ?? []), c]);
    } else {
      roots.push(c);
    }
  }

  const byCode = (a: AssetCategory, b: AssetCategory) => a.code.localeCompare(b.code);
  const rows: CategoryTreeRow[] = [];
  const visited = new Set<string>();

  const walk = (c: AssetCategory, depth: number, ancestors: string[]) => {
    // Chặn vòng lặp dữ liệu hỏng (backend đã chặn tạo mới, đây chỉ là lưới đỡ).
    if (visited.has(c._id)) return;
    visited.add(c._id);
    const children = (childrenOf.get(c._id) ?? []).sort(byCode);
    rows.push({ category: c, depth, isLeaf: children.length === 0, ancestors });
    for (const child of children) walk(child, depth + 1, [...ancestors, c.name]);
  };

  roots.sort(byCode).forEach((r) => walk(r, 0, []));
  return rows;
}

/** Id của danh mục + toàn bộ con cháu — để loại khỏi dropdown "Danh mục cha" (chọn vào sẽ tạo vòng lặp). */
export function getDescendantIds(categories: AssetCategory[], rootId: string): Set<string> {
  const result = new Set<string>([rootId]);
  let added = true;
  while (added) {
    added = false;
    for (const c of categories) {
      const parentId = c.parentCategory?._id;
      if (parentId && result.has(parentId) && !result.has(c._id)) {
        result.add(c._id);
        added = true;
      }
    }
  }
  return result;
}

/**
 * [MỚI DEV-082] Tên các nhóm tổ tiên của 1 danh mục, từ gốc xuống (không gồm
 * chính nó) — vd `["Thiết bị y tế", "Điều trị & kiểm soát nhiễm khuẩn"]`. Dùng
 * cho dòng chú thích "Nhóm: …" dưới ô chọn Danh mục ở form Tạo/Sửa tài sản.
 * Rỗng nếu không tìm thấy danh mục hoặc danh mục ở cấp gốc.
 */
export function getCategoryAncestorNames(categories: AssetCategory[], id: string | undefined): string[] {
  if (!id) return [];
  const byId = new Map(categories.map((c) => [c._id, c]));
  const names: string[] = [];
  const visited = new Set<string>([id]);
  let parentId = byId.get(id)?.parentCategory?._id;
  while (parentId && !visited.has(parentId)) {
    visited.add(parentId);
    const parent = byId.get(parentId);
    if (!parent) break;
    names.unshift(parent.name);
    parentId = parent.parentCategory?._id;
  }
  return names;
}

/** Nhãn thụt lề cho `<option>` (không style được bằng CSS) — dùng khoảng trắng không ngắt dòng. */
export function indentLabel(depth: number, label: string): string {
  return `${"    ".repeat(depth)}${label}`;
}

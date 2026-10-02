import type { AssetCategory } from "@/types/asset.types";
import { buildCategoryTree, indentLabel } from "@/features/assets/utils/categoryTree";

interface AssetCategoryOptionsProps {
  categories: AssetCategory[];
  /**
   * - `leaf`: chỉ danh mục lá, gom `<optgroup>` theo đường dẫn nhóm cha — dùng khi
   *   GÁN tài sản (backend chặn gán vào danh mục nhóm, DEV-080).
   * - `tree`: mọi danh mục, thụt lề theo cấp — dùng cho bộ lọc (chọn nhóm = gồm
   *   cả con cháu) và chọn "Danh mục cha".
   * - `group`: chỉ danh mục nhóm (có con), thụt lề theo cấp — bộ lọc "Nhóm" ở
   *   trang Danh mục tài sản (DEV-081).
   */
  mode: "leaf" | "tree" | "group";
  /** Id bị loại khỏi danh sách (vd chính danh mục đang sửa + con cháu của nó). */
  excludeIds?: Set<string>;
}

/** [MỚI DEV-080] Render `<option>`/`<optgroup>` theo cây danh mục — đặt TRONG `<select>` của nơi gọi. */
export function AssetCategoryOptions({ categories, mode, excludeIds }: AssetCategoryOptionsProps) {
  const rows = buildCategoryTree(categories).filter((r) => !excludeIds?.has(r.category._id));

  if (mode === "tree" || mode === "group") {
    return (
      <>
        {rows
          .filter((r) => mode === "tree" || !r.isLeaf)
          .map(({ category, depth }) => (
            <option key={category._id} value={category._id}>
              {indentLabel(depth, `${category.name} (${category.code})`)}
            </option>
          ))}
      </>
    );
  }

  const groups = new Map<string, typeof rows>();
  for (const row of rows) {
    if (!row.isLeaf) continue;
    const label = row.ancestors.join(" › ");
    groups.set(label, [...(groups.get(label) ?? []), row]);
  }

  return (
    <>
      {[...groups.entries()].map(([label, items]) => {
        const options = items.map(({ category }) => (
          <option key={category._id} value={category._id}>
            {category.name} ({category.code})
          </option>
        ));
        // Danh mục lá nằm ở gốc (không có nhóm cha) → không bọc optgroup.
        return label ? (
          <optgroup key={label} label={label}>
            {options}
          </optgroup>
        ) : (
          options
        );
      })}
    </>
  );
}

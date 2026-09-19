import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { humanizePermission } from "@/utils/humanizePermission";
import type { RbacPermission } from "@/types/rbac.types";
import { cn } from "@/lib/utils";

interface RolePermissionMatrixProps {
  /** Toàn bộ permission catalog (KHÔNG phân trang — `useAllRbacPermissions()`). */
  allPermissions: RbacPermission[];
  /** ID các permission ĐANG được chọn — component KIỂM SOÁT HOÀN TOÀN bởi state của caller (controlled). */
  selectedIds: Set<string>;
  onToggle: (permissionId: string) => void;
  onToggleGroup: (permissionIds: string[], nextChecked: boolean) => void;
  disabled?: boolean;
}

/**
 * FE-08 — "permission matrix" (roadmap Mục 16, ưu tiên #1). Nhóm theo
 * `resource` (field auto-suy ra từ tên permission ở `seed-rbac.ts`, VD
 * "DOCUMENT_VIEW" -> resource "DOCUMENT") — cách nhóm tự nhiên nhất vì mỗi
 * domain nghiệp vụ (Document/Asset/User/RBAC...) đã tương ứng 1 resource.
 * Component THUẦN HIỂN THỊ (controlled) — không tự giữ state chọn/lưu, để
 * `RoleDetailPage` toàn quyền quyết định khi nào gọi API lưu (roadmap:
 * "warning trước destructive change" — page cha hiển thị nút Lưu riêng,
 * không tự động lưu mỗi lần tick).
 *
 * [SỬA 2026-09-16] Mỗi nhóm resource giờ collapse/expand được — ~20 nhóm ×
 * 100 permission khiến trang dài, khó dùng khi set quyền (user báo). State
 * mở/đóng CHỈ tồn tại cục bộ trong component này (không cần `RoleDetailPage`
 * biết tới — không ảnh hưởng logic lưu quyền). Mặc định: MỞ SẴN nhóm nào
 * đang có ít nhất 1 quyền được chọn (để admin thấy ngay quyền hiện có khi mở
 * trang), các nhóm còn lại ĐÓNG. `allPermissions`/`selectedIds` đã có sẵn
 * đầy đủ lúc component này mount (`RoleDetailPage` chỉ render nó sau khi cả
 * 2 query role + permission catalog đã load xong) nên tính state ban đầu 1
 * lần bằng lazy initializer là đủ, không cần đồng bộ lại qua effect.
 */
export function RolePermissionMatrix({ allPermissions, selectedIds, onToggle, onToggleGroup, disabled }: RolePermissionMatrixProps) {
  const groups = useMemo(() => {
    const map = new Map<string, RbacPermission[]>();
    for (const p of allPermissions) {
      const list = map.get(p.resource) ?? [];
      list.push(p);
      map.set(p.resource, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [allPermissions]);

  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(groups.filter(([, items]) => items.some((p) => selectedIds.has(p._id))).map(([resource]) => resource)),
  );

  if (allPermissions.length === 0) {
    return <p className="text-sm text-muted-foreground">Chưa có permission nào trong hệ thống.</p>;
  }

  function toggleExpanded(resource: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(resource)) next.delete(resource);
      else next.add(resource);
      return next;
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end gap-3 text-xs">
        <button type="button" className="text-primary hover:underline" onClick={() => setExpanded(new Set(groups.map(([resource]) => resource)))}>
          Mở rộng tất cả
        </button>
        <button type="button" className="text-primary hover:underline" onClick={() => setExpanded(new Set())}>
          Thu gọn tất cả
        </button>
      </div>

      {groups.map(([resource, items]) => {
        const allChecked = items.every((p) => selectedIds.has(p._id));
        const someChecked = !allChecked && items.some((p) => selectedIds.has(p._id));
        const isExpanded = expanded.has(resource);

        return (
          <div key={resource} className="rounded-lg border border-border">
            <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-3 py-2">
              <button
                type="button"
                className="flex flex-1 items-center gap-2 text-left"
                onClick={() => toggleExpanded(resource)}
                aria-expanded={isExpanded}
              >
                {isExpanded ? <ChevronDown className="size-4 text-muted-foreground" /> : <ChevronRight className="size-4 text-muted-foreground" />}
                <span className="text-xs font-semibold uppercase tracking-wide text-foreground">{resource}</span>
                <span className="text-xs text-muted-foreground">
                  ({items.filter((p) => selectedIds.has(p._id)).length}/{items.length})
                </span>
              </button>
              <input
                type="checkbox"
                checked={allChecked}
                ref={(el) => {
                  if (el) el.indeterminate = someChecked;
                }}
                disabled={disabled}
                onChange={() =>
                  onToggleGroup(
                    items.map((p) => p._id),
                    !allChecked,
                  )
                }
                className="size-4 shrink-0 rounded border-input"
                aria-label={`Chọn tất cả quyền nhóm ${resource}`}
              />
            </div>
            {isExpanded && (
              <div className="grid grid-cols-1 gap-x-4 gap-y-1.5 p-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((p) => (
                  <label
                    key={p._id}
                    className={cn("flex items-start gap-2 rounded px-1.5 py-1 text-sm", !disabled && "cursor-pointer hover:bg-muted/50")}
                    title={p.name}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(p._id)}
                      disabled={disabled}
                      onChange={() => onToggle(p._id)}
                      className="mt-0.5 size-4 shrink-0 rounded border-input"
                    />
                    {/* [SỬA 2026-09-16] Ưu tiên `description` tiếng Việt thật (đã có sẵn cho
                        hầu hết permission trong DB) — trước đây luôn humanize tên kỹ thuật
                        tiếng Anh (`ASSET_CATEGORY_DELETE` -> "Asset category delete"), gây
                        lẫn ngôn ngữ khi set quyền. Chỉ fallback về humanize cho permission
                        hiếm gặp chưa kịp có description (VD tạo tay qua "Tạo permission"
                        chưa điền mô tả). `name` kỹ thuật gốc vẫn xem được qua tooltip. */}
                    <span className="text-foreground">{p.description || humanizePermission(p.name)}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

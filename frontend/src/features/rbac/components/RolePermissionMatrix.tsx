import { useMemo } from "react";
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

  if (allPermissions.length === 0) {
    return <p className="text-sm text-muted-foreground">Chưa có permission nào trong hệ thống.</p>;
  }

  return (
    <div className="space-y-3">
      {groups.map(([resource, items]) => {
        const allChecked = items.every((p) => selectedIds.has(p._id));
        const someChecked = !allChecked && items.some((p) => selectedIds.has(p._id));

        return (
          <div key={resource} className="rounded-lg border border-border">
            <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-3 py-2">
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
                className="size-4 rounded border-input"
                aria-label={`Chọn tất cả quyền nhóm ${resource}`}
              />
              <span className="text-xs font-semibold uppercase tracking-wide text-foreground">{resource}</span>
              <span className="text-xs text-muted-foreground">
                ({items.filter((p) => selectedIds.has(p._id)).length}/{items.length})
              </span>
            </div>
            <div className="grid grid-cols-1 gap-x-4 gap-y-1.5 p-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((p) => (
                <label
                  key={p._id}
                  className={cn("flex items-start gap-2 rounded px-1.5 py-1 text-sm", !disabled && "cursor-pointer hover:bg-muted/50")}
                  title={p.description || p.name}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(p._id)}
                    disabled={disabled}
                    onChange={() => onToggle(p._id)}
                    className="mt-0.5 size-4 shrink-0 rounded border-input"
                  />
                  <span className="text-foreground">{humanizePermission(p.name)}</span>
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

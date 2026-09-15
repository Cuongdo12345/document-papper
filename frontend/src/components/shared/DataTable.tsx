import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { cn } from "@/lib/utils";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  className?: string;
  /** Field gửi lên `sortBy` API khi user click header — mặc định dùng `key`. */
  sortKey?: string;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyMessage?: string;
  /** Cột hành động cuối bảng — caller tự pre-filter theo permission (PermissionGuard). */
  rowActions?: (row: T) => ReactNode;
  sortBy?: string;
  order?: "asc" | "desc";
  onSortChange?: (sortBy: string) => void;
  className?: string;
}

/**
 * SHARED_COMPONENTS_LIBRARY.md: "DataTable" — bảng dữ liệu chuẩn dùng chung
 * mọi domain list (Users/Departments/Documents/Assets...). Theo đúng "Table
 * UX Rules" (FE_UI_DEVELOPMENT_ROADMAP.md Mục 22): server-side sort (không
 * tự sort client), skeleton khi loading, EmptyState khi rỗng, ErrorState+
 * retry khi lỗi. Pagination TÁCH RIÊNG (`components/shared/Pagination.tsx`),
 * KHÔNG nhúng vào component này.
 */
export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  isLoading,
  isError,
  errorMessage,
  onRetry,
  emptyTitle,
  emptyMessage,
  rowActions,
  sortBy,
  order,
  onSortChange,
  className,
}: DataTableProps<T>) {
  if (isError) {
    return <ErrorState message={errorMessage} onRetry={onRetry} />;
  }

  if (isLoading) {
    return <LoadingState variant="skeleton-table" />;
  }

  if (data.length === 0) {
    return <EmptyState title={emptyTitle} message={emptyMessage} />;
  }

  return (
    <div className={cn("overflow-x-auto rounded-lg border border-border", className)}>
      <table className="w-full min-w-max text-sm">
        <thead className="border-b border-border bg-muted/50 text-left text-xs font-medium text-muted-foreground">
          <tr>
            {columns.map((col) => {
              const key = col.sortKey ?? col.key;
              const isSortable = !!onSortChange;
              const isActive = sortBy === key;
              return (
                <th
                  key={col.key}
                  className={cn("whitespace-nowrap px-4 py-2.5", isSortable && "cursor-pointer select-none", col.className)}
                  onClick={isSortable ? () => onSortChange!(key) : undefined}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {isSortable &&
                      (isActive ? (
                        order === "asc" ? (
                          <ArrowUp className="size-3.5" aria-hidden="true" />
                        ) : (
                          <ArrowDown className="size-3.5" aria-hidden="true" />
                        )
                      ) : (
                        <ArrowUpDown className="size-3.5 opacity-40" aria-hidden="true" />
                      ))}
                  </span>
                </th>
              );
            })}
            {rowActions && <th className="whitespace-nowrap px-4 py-2.5 text-right">Hành động</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.map((row) => (
            <tr key={keyExtractor(row)} className="hover:bg-muted/30">
              {columns.map((col) => (
                <td key={col.key} className={cn("whitespace-nowrap px-4 py-2.5", col.className)}>
                  {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? "—")}
                </td>
              ))}
              {rowActions && <td className="whitespace-nowrap px-4 py-2.5 text-right">{rowActions(row)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

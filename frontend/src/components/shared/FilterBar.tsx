import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FilterBarProps {
  children: ReactNode;
  onReset?: () => void;
  className?: string;
}

/**
 * SHARED_COMPONENTS_LIBRARY.md: "FilterBar" — thanh filter/search phía trên
 * DataTable. Foundation NHẸ (layout/spacing nhất quán + nút reset chung) —
 * mỗi trang tự truyền input/select cụ thể của domain mình làm `children`
 * thay vì 1 config-engine tổng quát (field set khác nhau nhiều giữa Users/
 * Departments/Documents..., xây engine chung lúc này là over-engineer khi
 * mới có 2 domain dùng — FE_UI_DEVELOPMENT_ROADMAP.md Mục 31).
 */
export function FilterBar({ children, onReset, className }: FilterBarProps) {
  return (
    <div className={cn("flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4", className)}>
      <div className="flex flex-1 flex-wrap items-end gap-3">{children}</div>
      {onReset && (
        <Button type="button" variant="ghost" size="sm" onClick={onReset}>
          Xoá lọc
        </Button>
      )}
    </div>
  );
}

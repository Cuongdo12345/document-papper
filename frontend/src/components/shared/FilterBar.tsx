import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FilterBarProps {
  children: ReactNode;
  onReset?: () => void;
  className?: string;
  /**
   * [MỚI Pass 3a, `docs/frontend/UI_DESIGN_SYSTEM.md` Mục 4/9.3, FE-27] —
   * `"standalone"` (mặc định) giữ NGUYÊN hành vi cũ (khung border+bg-card
   * riêng) cho mọi trang chưa thí điểm. `"embedded"` bỏ border/bo góc/bg
   * riêng — dùng khi FilterBar được đặt trong CÙNG 1 khung viền ngoài với
   * `DataTable` bên dưới nó (xem `UsersListPage` — trang thí điểm đầu tiên),
   * để 2 khối không còn hiện thành 2 "card" ngang hàng độc lập.
   */
  variant?: "standalone" | "embedded";
}

/**
 * SHARED_COMPONENTS_LIBRARY.md: "FilterBar" — thanh filter/search phía trên
 * DataTable. Foundation NHẸ (layout/spacing nhất quán + nút reset chung) —
 * mỗi trang tự truyền input/select cụ thể của domain mình làm `children`
 * thay vì 1 config-engine tổng quát (field set khác nhau nhiều giữa Users/
 * Departments/Documents..., xây engine chung lúc này là over-engineer khi
 * mới có 2 domain dùng — FE_UI_DEVELOPMENT_ROADMAP.md Mục 31).
 */
export function FilterBar({ children, onReset, className, variant = "standalone" }: FilterBarProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-end gap-3 p-4",
        variant === "standalone" && "rounded-lg border border-border bg-card",
        variant === "embedded" && "bg-muted/30",
        className,
      )}
    >
      <div className="flex flex-1 flex-wrap items-end gap-3">{children}</div>
      {onReset && (
        <Button type="button" variant="ghost" size="sm" onClick={onReset}>
          Xoá lọc
        </Button>
      )}
    </div>
  );
}

import { RotateCcw, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BatchActionBarProps {
  /** Số dòng đang được chọn — component tự ẩn khi = 0. */
  count: number;
  /**
   * [MỞ RỘNG 2026-09-17, DEV-061] Tuỳ chọn thay vì bắt buộc — cho phép trang
   * gọi ẩn hẳn nút Xoá khi user không có quyền (VD Document: chỉ ADMIN được
   * xoá, khác permission với khôi phục). 6 trang cũ luôn truyền → hành vi
   * giữ nguyên.
   */
  onDelete?: () => void;
  onClear: () => void;
  isLoading?: boolean;
  /**
   * [MỚI 2026-09-17, DEV-061] Tuỳ chọn — chỉ trang Document truyền (danh
   * sách gộp cả dòng active/đã ẩn trong cùng bảng khi filter "Tất cả" nên
   * cần cả 2 hành động hàng loạt). KHÔNG truyền ở 6 trang cũ → hành vi giữ
   * nguyên (chỉ nút Xoá).
   */
  onRestore?: () => void;
}

/**
 * SHARED_COMPONENTS_LIBRARY.md: "BatchActionBar" — thanh công cụ hàng loạt
 * (DEV-060, 2026-09-16), hiện ra khi có ≥1 dòng được chọn qua `DataTable`
 * (xem `DataTableSelection`/`useRowSelection`). Mirror đúng các hành động
 * hàng loạt TỪNG DÒNG đã có sẵn ở mỗi trang, không thêm hành động mới ngoài
 * yêu cầu — `onRestore` (DEV-061) mirror đúng nút "Khôi phục" từng dòng.
 */
export function BatchActionBar({ count, onDelete, onClear, isLoading, onRestore }: BatchActionBarProps) {
  if (count === 0) return null;

  return (
    <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5">
      <span className="text-sm font-medium text-foreground">Đã chọn {count} mục</span>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onClear} disabled={isLoading}>
          <X /> Bỏ chọn
        </Button>
        {onRestore && (
          <Button variant="secondary" size="sm" onClick={onRestore} loading={isLoading}>
            <RotateCcw /> Khôi phục
          </Button>
        )}
        {onDelete && (
          <Button variant="destructive" size="sm" onClick={onDelete} loading={isLoading}>
            <Trash2 /> Xoá
          </Button>
        )}
      </div>
    </div>
  );
}

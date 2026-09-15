import { useState } from "react";
import { AppModal } from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { useDeleteDocumentsByMonth } from "@/features/documents/hooks/useDeleteDocumentsByMonth";

interface DeleteByMonthModalProps {
  open: boolean;
  onClose: () => void;
}

const now = new Date();

/**
 * "Xoá hàng loạt theo tháng" (`DELETE /documents/delete-by-month`) — SOFT-DELETE
 * (KHÔNG phải xoá vĩnh viễn, DOCUMENT_DOMAIN_MAP.md Mục 2). Backend hiện
 * KHÔNG có guard ADMIN-only ở route (chỉ cần permission `DOCUMENT_DELETE`) —
 * caller (`DocumentsListPage`) TỰ giới hạn hiển thị nút mở modal này chỉ cho
 * ADMIN ở UI (khuyến nghị FRONTEND_RECOMMENDATION, chưa phải backend fix).
 */
export function DeleteByMonthModal({ open, onClose }: DeleteByMonthModalProps) {
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const mutation = useDeleteDocumentsByMonth();

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title="Xoá hàng loạt theo tháng"
      size="sm"
      footer={
        <>
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={mutation.isPending}>
            Huỷ
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            loading={mutation.isPending}
            onClick={() => mutation.mutate({ month, year }, { onSuccess: onClose })}
          >
            Xoá (ẩn khỏi danh sách)
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Ẩn (soft-delete) toàn bộ tài liệu tạo trong tháng đã chọn. PROPOSAL còn REPORT tham chiếu sẽ tự động được bỏ qua.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="dbm-month" className="text-xs font-medium text-muted-foreground">
              Tháng
            </label>
            <input
              id="dbm-month"
              type="number"
              min={1}
              max={12}
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="dbm-year" className="text-xs font-medium text-muted-foreground">
              Năm
            </label>
            <input
              id="dbm-year"
              type="number"
              min={2000}
              max={2100}
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>
      </div>
    </AppModal>
  );
}

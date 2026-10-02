import { DraggableCollapsiblePanel } from "@/features/systemDesign/components/DraggableCollapsiblePanel";

/**
 * DEV-073/FE-24 — panel giải thích màu/loại node, đặt góc trên-phải (tránh đè
 * MiniMap góc dưới-phải mặc định). [FE-34] Nay kéo-thả + thu gọn được qua
 * `DraggableCollapsiblePanel`.
 */
export function SystemDesignLegend() {
  return (
    <DraggableCollapsiblePanel title="Chú giải" className="w-56">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="size-3 shrink-0 rounded border-2 border-dashed border-border bg-muted/30" aria-hidden="true" />
          <span className="text-muted-foreground">Module (domain)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="size-3 shrink-0 rounded border-2 border-border bg-card" aria-hidden="true" />
          <span className="text-muted-foreground">Model (Mongoose)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="size-3 shrink-0 rounded border-2 border-primary ring-2 ring-primary/40" aria-hidden="true" />
          <span className="text-muted-foreground">Đang chọn / có quan hệ</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="size-3 shrink-0 rounded border-2 border-border bg-card opacity-30" aria-hidden="true" />
          <span className="text-muted-foreground">Không liên quan (đã mờ)</span>
        </div>
        <div className="flex items-center gap-2">
          <svg width="20" height="10" className="shrink-0 text-muted-foreground" aria-hidden="true">
            <line x1="0" y1="5" x2="16" y2="5" stroke="currentColor" strokeWidth="1.5" />
            <polygon points="16,1 20,5 16,9" fill="currentColor" />
          </svg>
          <span className="text-muted-foreground">Quan hệ (field có ref)</span>
        </div>
        <div className="flex items-center gap-2">
          {/* [FE-29] text-success-strong (không phải text-success) — chữ "1" 9px trên nền
              bg-success/12 đo được contrast 3.24:1, dưới ngưỡng AA 4.5:1 (cùng lỗi StatusBadge,
              FE-28 Mục 1). Khác StatusBadge: đây là text thật (không phải icon) nên áp dụng luôn. */}
          <span className="flex size-3 shrink-0 items-center justify-center rounded-sm bg-success/12 text-[9px] font-semibold text-success-strong">
            1
          </span>
          <span className="text-muted-foreground">Ref đơn (1 model)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex size-3 shrink-0 items-center justify-center rounded-sm bg-destructive/12 text-[9px] font-semibold text-destructive">
            N
          </span>
          <span className="text-muted-foreground">Ref mảng (nhiều model)</span>
        </div>
      </div>
    </DraggableCollapsiblePanel>
  );
}

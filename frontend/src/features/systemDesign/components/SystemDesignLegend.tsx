/** DEV-073/FE-24 — panel cố định giải thích màu/loại node, đặt góc trên-phải (tránh đè MiniMap góc dưới-phải mặc định). */
export function SystemDesignLegend() {
  return (
    <div className="w-56 space-y-2 rounded-lg border border-border bg-card p-3 text-xs shadow-md">
      <p className="font-semibold text-foreground">Chú giải</p>
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
        <span className="flex size-3 shrink-0 items-center justify-center rounded-sm bg-success/12 text-[9px] font-semibold text-success">
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
  );
}

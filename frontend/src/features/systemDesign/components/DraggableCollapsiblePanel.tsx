import { useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { ChevronDown, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface DraggableCollapsiblePanelProps {
  title: string;
  /** Nút/hành động phụ đặt CẠNH nút thu gọn ở header (vd "Hiện tất cả" của ModuleFilterPanel). */
  headerExtra?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * FE-34 — wrapper DÙNG CHUNG cho `ModuleFilterPanel`/`SystemDesignLegend`: header
 * kéo-thả được (pointer events thuần, KHÔNG thêm dependency mới — `package.json`
 * chưa có thư viện drag nào, việc kéo 1 panel nhỏ trong khung `ReactFlow` không
 * cần tới 1 thư viện riêng) + nút thu gọn/mở (mirror pattern accordion đã có ở
 * `Sidebar.tsx` — `ChevronDown` xoay 90°).
 *
 * Vị trí BAN ĐẦU vẫn do `<Panel position="top-left|top-right">` của xyflow quyết
 * định (giữ nguyên, không regress) — component này CHỈ cộng thêm 1
 * `transform: translate()` lên trên vị trí gốc đó khi user kéo, có CLAMP theo
 * biên khung `.react-flow` (tra `closest()`) để panel không bị kéo mất hẳn ra
 * ngoài vùng nhìn thấy.
 *
 * Vị trí/trạng thái thu gọn là state cục bộ (KHÔNG persist qua localStorage) —
 * user không yêu cầu nhớ lại vị trí giữa các lần tải trang, giữ đơn giản đúng
 * phạm vi yêu cầu.
 */
export function DraggableCollapsiblePanel({ title, headerExtra, children, className }: DraggableCollapsiblePanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    dxMin: number;
    dxMax: number;
    dyMin: number;
    dyMax: number;
  } | null>(null);

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    const panelEl = panelRef.current;
    const containerEl = panelEl?.closest(".react-flow");
    if (!panelEl || !containerEl) return;
    const panelRect = panelEl.getBoundingClientRect();
    const containerRect = containerEl.getBoundingClientRect();
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      originX: offset.x,
      originY: offset.y,
      dxMin: containerRect.left - panelRect.left,
      dxMax: containerRect.right - panelRect.right,
      dyMin: containerRect.top - panelRect.top,
      dyMax: containerRect.bottom - panelRect.bottom,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);
    const dx = clamp(e.clientX - drag.startX, drag.dxMin, drag.dxMax);
    const dy = clamp(e.clientY - drag.startY, drag.dyMin, drag.dyMax);
    setOffset({ x: drag.originX + dx, y: drag.originY + dy });
  }

  function handlePointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    dragRef.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
  }

  return (
    <div
      ref={panelRef}
      style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
      className={cn("rounded-lg border border-border bg-card text-xs shadow-md", className)}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border px-2 py-1.5">
        <div
          className="flex min-w-0 flex-1 cursor-grab touch-none items-center gap-1.5 active:cursor-grabbing"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <GripVertical className="size-3.5 shrink-0 text-muted-foreground/60" aria-hidden="true" />
          <span className="truncate font-semibold text-foreground">{title}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {headerExtra}
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            aria-label={collapsed ? `Mở rộng ${title}` : `Thu gọn ${title}`}
            aria-expanded={!collapsed}
          >
            <ChevronDown className={cn("size-3.5 transition-transform", collapsed && "-rotate-90")} aria-hidden="true" />
          </button>
        </div>
      </div>
      {!collapsed && <div className="p-3">{children}</div>}
    </div>
  );
}

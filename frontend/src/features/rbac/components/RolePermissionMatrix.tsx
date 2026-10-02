import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { ChevronDown, ChevronRight, GripVertical } from "lucide-react";
import { humanizePermission } from "@/utils/humanizePermission";
import { applySavedOrder, moveItem } from "@/utils/applySavedOrder";
import { useUIStore } from "@/stores/uiStore";
import type { RbacPermission } from "@/types/rbac.types";
import { cn } from "@/lib/utils";

const AUTO_SCROLL_EDGE = 48;
const AUTO_SCROLL_MAX_STEP = 20;

/**
 * [FE-36] Kéo thả sắp xếp danh sách theo trục dọc bằng pointer events (chuột +
 * cảm ứng, không thêm thư viện). Khác `DraggableCollapsiblePanel` (FE-34): nghe
 * move/up trên `window` thay vì pointer capture (xem comment trong `onPointerDown`).
 * Thứ tự tạm thời nằm trong `dragOrder` suốt lúc kéo, chỉ `onCommit` 1 lần khi
 * thả. Chỉ đổi chỗ khi con trỏ vượt QUA điểm giữa phần tử đích — tránh 2 nhóm
 * cao thấp khác nhau (1 nhóm đang mở) đổi qua đổi lại liên tục. Tự cuộn `<main>`
 * khi kéo sát mép trên/dưới.
 */
function useDragReorder(order: string[], onCommit: (next: string[]) => void) {
  const listRef = useRef<HTMLDivElement>(null);
  const [dragOrder, setDragOrder] = useState<string[] | null>(null);
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const dragOrderRef = useRef<string[] | null>(null);
  const draggingKeyRef = useRef<string | null>(null);
  const pointerRef = useRef({ x: 0, y: 0 });
  const frameRef = useRef<number | null>(null);
  const detachRef = useRef<(() => void) | null>(null);

  useEffect(() => () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    detachRef.current?.();
  }, []);

  function reorderAtPointer() {
    const key = draggingKeyRef.current;
    const current = dragOrderRef.current;
    const list = listRef.current;
    if (!key || !current || !list) return;

    const listRect = list.getBoundingClientRect();
    const x = Math.min(Math.max(pointerRef.current.x, listRect.left + 1), listRect.right - 1);
    const el = document.elementFromPoint(x, pointerRef.current.y)?.closest<HTMLElement>("[data-drag-key]");
    const target = el?.dataset.dragKey;
    if (!el || !target || target === key || !list.contains(el)) return;

    const from = current.indexOf(key);
    const to = current.indexOf(target);
    if (from < 0 || to < 0) return;
    const rect = el.getBoundingClientRect();
    const mid = rect.top + rect.height / 2;
    if ((to > from && pointerRef.current.y < mid) || (to < from && pointerRef.current.y > mid)) return;

    const next = moveItem(current, from, to);
    dragOrderRef.current = next;
    setDragOrder(next);
  }

  function autoScrollTick() {
    if (!draggingKeyRef.current) return;
    const scroller = listRef.current?.closest("main") ?? document.scrollingElement;
    if (scroller) {
      const rect = scroller === document.scrollingElement ? { top: 0, bottom: window.innerHeight } : scroller.getBoundingClientRect();
      const y = pointerRef.current.y;
      let step = 0;
      if (y < rect.top + AUTO_SCROLL_EDGE) step = -Math.min(AUTO_SCROLL_MAX_STEP, Math.ceil((rect.top + AUTO_SCROLL_EDGE - y) / 3));
      else if (y > rect.bottom - AUTO_SCROLL_EDGE) step = Math.min(AUTO_SCROLL_MAX_STEP, Math.ceil((y - rect.bottom + AUTO_SCROLL_EDGE) / 3));
      if (step !== 0) scroller.scrollTop += step;
    }
    // Tính lại mỗi frame (không chỉ khi pointermove): con trỏ di chuyển nhanh có thể
    // phát pointermove cuối trước khi React kịp vẽ lại thứ tự mới — thiếu 1 bước đổi chỗ.
    reorderAtPointer();
    frameRef.current = requestAnimationFrame(autoScrollTick);
  }

  function endDrag() {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    detachRef.current?.();
    detachRef.current = null;
    const final = dragOrderRef.current;
    draggingKeyRef.current = null;
    dragOrderRef.current = null;
    setDraggingKey(null);
    setDragOrder(null);
    if (final) onCommit(final);
  }

  function handleProps(key: string) {
    return {
      onPointerDown: (e: PointerEvent<HTMLButtonElement>) => {
        if (e.button !== 0 || draggingKeyRef.current) return;
        e.preventDefault();
        pointerRef.current = { x: e.clientX, y: e.clientY };
        draggingKeyRef.current = key;
        dragOrderRef.current = order;
        setDraggingKey(key);
        setDragOrder(order);

        // Nghe trên `window`, KHÔNG dùng setPointerCapture trên tay nắm: React di chuyển
        // chính node đang kéo trong DOM khi đổi thứ tự -> capture bị huỷ, mất cả pointerup.
        const onMove = (ev: globalThis.PointerEvent) => {
          pointerRef.current = { x: ev.clientX, y: ev.clientY };
          reorderAtPointer();
        };
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", endDrag);
        window.addEventListener("pointercancel", endDrag);
        detachRef.current = () => {
          window.removeEventListener("pointermove", onMove);
          window.removeEventListener("pointerup", endDrag);
          window.removeEventListener("pointercancel", endDrag);
        };
        frameRef.current = requestAnimationFrame(autoScrollTick);
      },
    };
  }

  return { listRef, displayOrder: dragOrder ?? order, draggingKey, handleProps };
}

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
 *
 * [FE-36] Kéo thả tay nắm (⋮⋮) để sắp xếp lại thứ tự nhóm, hoặc focus tay nắm
 * rồi bấm mũi tên lên/xuống. Thứ tự lưu theo trình duyệt (`uiStore.
 * permissionGroupOrder`), dùng chung mọi role, KHÔNG gửi lên server; chỉ đổi
 * cách hiển thị, không ảnh hưởng quyền được chọn/lưu. "Đặt lại thứ tự" về A→Z.
 */
export function RolePermissionMatrix({ allPermissions, selectedIds, onToggle, onToggleGroup, disabled }: RolePermissionMatrixProps) {
  const groups = useMemo(() => {
    const map = new Map<string, RbacPermission[]>();
    for (const p of allPermissions) {
      const list = map.get(p.resource) ?? [];
      list.push(p);
      map.set(p.resource, list);
    }
    return new Map([...map.entries()].sort(([a], [b]) => a.localeCompare(b)));
  }, [allPermissions]);

  const defaultOrder = useMemo(() => [...groups.keys()], [groups]);
  const savedOrder = useUIStore((s) => s.permissionGroupOrder);
  const setSavedOrder = useUIStore((s) => s.setPermissionGroupOrder);
  const order = useMemo(() => applySavedOrder(defaultOrder, savedOrder), [defaultOrder, savedOrder]);
  const isCustomOrder = order.some((resource, i) => resource !== defaultOrder[i]);

  function commitOrder(next: string[]) {
    const isDefault = next.every((resource, i) => resource === defaultOrder[i]);
    setSavedOrder(isDefault ? [] : next);
  }

  const { listRef, displayOrder, draggingKey, handleProps } = useDragReorder(order, commitOrder);

  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set([...groups].filter(([, items]) => items.some((p) => selectedIds.has(p._id))).map(([resource]) => resource)),
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

  function moveByKeyboard(e: KeyboardEvent<HTMLButtonElement>, resource: string) {
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    e.preventDefault();
    const from = order.indexOf(resource);
    const to = e.key === "ArrowUp" ? from - 1 : from + 1;
    if (to < 0 || to >= order.length) return;
    commitOrder(moveItem(order, from, to));
    // React có thể di chuyển chính node đang focus trong DOM làm mất focus — focus lại tay nắm.
    requestAnimationFrame(() => {
      listRef.current?.querySelector<HTMLButtonElement>(`[data-drag-handle="${CSS.escape(resource)}"]`)?.focus();
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
        <span className="text-muted-foreground">Kéo biểu tượng ⋮⋮ để sắp xếp lại các nhóm</span>
        <div className="flex gap-3">
          {isCustomOrder && (
            <button type="button" className="text-primary hover:underline" onClick={() => setSavedOrder([])}>
              Đặt lại thứ tự
            </button>
          )}
          <button type="button" className="text-primary hover:underline" onClick={() => setExpanded(new Set(groups.keys()))}>
            Mở rộng tất cả
          </button>
          <button type="button" className="text-primary hover:underline" onClick={() => setExpanded(new Set())}>
            Thu gọn tất cả
          </button>
        </div>
      </div>

      <div ref={listRef} className={cn("space-y-3", draggingKey && "cursor-grabbing select-none")}>
        {displayOrder.map((resource, index) => {
          const items = groups.get(resource) ?? [];
          const allChecked = items.every((p) => selectedIds.has(p._id));
          const someChecked = !allChecked && items.some((p) => selectedIds.has(p._id));
          const isExpanded = expanded.has(resource);
          const isDragging = draggingKey === resource;

          return (
            <div
              key={resource}
              data-drag-key={resource}
              className={cn(
                "rounded-lg border border-border bg-card transition-shadow",
                isDragging && "relative z-10 border-primary/60 shadow-lg ring-2 ring-primary/30",
              )}
            >
              <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-3 py-2">
                <button
                  type="button"
                  data-drag-handle={resource}
                  className={cn(
                    "-ml-1 flex size-6 shrink-0 touch-none items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isDragging ? "cursor-grabbing" : "cursor-grab",
                  )}
                  aria-label={`Di chuyển nhóm ${resource} (vị trí ${index + 1}/${displayOrder.length}), dùng phím mũi tên lên/xuống`}
                  title="Kéo để sắp xếp"
                  onKeyDown={(e) => moveByKeyboard(e, resource)}
                  {...handleProps(resource)}
                >
                  <GripVertical className="size-4" />
                </button>
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
    </div>
  );
}

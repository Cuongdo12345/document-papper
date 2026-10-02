import { Button } from "@/components/ui/button";
import { DraggableCollapsiblePanel } from "@/features/systemDesign/components/DraggableCollapsiblePanel";
import type { SystemDesignModule } from "@/types/systemDesign.types";

interface ModuleFilterPanelProps {
  modules: SystemDesignModule[];
  hiddenModules: Set<string>;
  onToggle: (moduleName: string) => void;
  onShowAll: () => void;
}

/**
 * DEV-073/FE-24 — panel góc trên-trái, ẩn/hiện node+edge theo module (KHÔNG xoá
 * khỏi state — xem `SystemDesignCanvas`). [FE-34] Nay kéo-thả + thu gọn được
 * qua `DraggableCollapsiblePanel`.
 */
export function ModuleFilterPanel({ modules, hiddenModules, onToggle, onShowAll }: ModuleFilterPanelProps) {
  return (
    <DraggableCollapsiblePanel
      title="Lọc theo module"
      className="w-52"
      headerExtra={
        hiddenModules.size > 0 && (
          <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[11px]" onClick={onShowAll}>
            Hiện tất cả
          </Button>
        )
      }
    >
      <div className="max-h-[60vh] space-y-1.5 overflow-y-auto">
        {modules.map((m) => (
          <label key={m.name} className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              className="size-3.5 shrink-0 rounded border-input"
              checked={!hiddenModules.has(m.name)}
              onChange={() => onToggle(m.name)}
            />
            <span className="truncate text-muted-foreground">
              {m.name} <span className="text-muted-foreground/70">({m.models.length})</span>
            </span>
          </label>
        ))}
      </div>
    </DraggableCollapsiblePanel>
  );
}

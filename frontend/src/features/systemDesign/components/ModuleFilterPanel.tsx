import { Button } from "@/components/ui/button";
import type { SystemDesignModule } from "@/types/systemDesign.types";

interface ModuleFilterPanelProps {
  modules: SystemDesignModule[];
  hiddenModules: Set<string>;
  onToggle: (moduleName: string) => void;
  onShowAll: () => void;
}

/** DEV-073/FE-24 — panel cố định góc trên-trái, ẩn/hiện node+edge theo module (KHÔNG xoá khỏi state — xem `SystemDesignCanvas`). */
export function ModuleFilterPanel({ modules, hiddenModules, onToggle, onShowAll }: ModuleFilterPanelProps) {
  return (
    <div className="max-h-[70vh] w-52 space-y-2 overflow-y-auto rounded-lg border border-border bg-card p-3 text-xs shadow-md">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-foreground">Lọc theo module</p>
        {hiddenModules.size > 0 && (
          <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[11px]" onClick={onShowAll}>
            Hiện tất cả
          </Button>
        )}
      </div>
      <div className="space-y-1.5">
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
    </div>
  );
}

import { memo } from "react";
import type { Node, NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";
import type { ModuleNodeData } from "@/features/systemDesign/utils/layout";

type ModuleFlowNode = Node<ModuleNodeData, "systemDesignModule">;

/**
 * DEV-073/FE-24 — khung nét đứt cho 1 module (domain), model con render đè
 * lên trên (xyflow yêu cầu parent node đứng TRƯỚC child trong mảng `nodes`
 * để z-order/nesting đúng — xử lý ở `layout.ts`). Click vào phần nền TRỐNG
 * (không trúng model card nào) → `onNodeClick` ở `SystemDesignCanvas` tự
 * nhận diện `type === "systemDesignModule"` → fitView vào đúng module này.
 */
function ModuleGroupNodeComponent({ data }: NodeProps<ModuleFlowNode>) {
  return (
    <div className={cn("h-full w-full rounded-lg border-2 border-dashed border-border bg-muted/30")}>
      <div className="absolute top-2 left-2 rounded border border-border bg-card px-2 py-0.5 text-xs font-semibold tracking-wide text-foreground uppercase shadow-sm">
        {data.label} <span className="font-normal text-muted-foreground normal-case">({data.modelCount})</span>
      </div>
    </div>
  );
}

export const ModuleGroupNode = memo(ModuleGroupNodeComponent);

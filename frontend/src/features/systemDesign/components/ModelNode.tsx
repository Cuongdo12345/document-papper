import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";
import type { ModelNodeData } from "@/features/systemDesign/utils/layout";

interface ModelNodeExtraData extends ModelNodeData {
  /** Có node đang được chọn (bất kỳ node nào) VÀ node này KHÔNG liên quan — làm mờ. */
  dimmed?: boolean;
  /** Node này đang được chọn hoặc là 1 đầu của quan hệ với node đang chọn. */
  highlighted?: boolean;
}

type ModelFlowNode = Node<ModelNodeExtraData, "systemDesignModel">;

/** DEV-073/FE-24 — thẻ 1 model, click mở `AppDrawer` chi tiết field (xử lý ở `SystemDesignCanvas`). */
function ModelNodeComponent({ data }: NodeProps<ModelFlowNode>) {
  const { model, dimmed, highlighted } = data;

  return (
    <div
      className={cn(
        "flex h-full w-full cursor-pointer flex-col justify-center gap-0.5 rounded-md border-2 bg-card px-3 py-1.5 shadow-sm transition-all",
        highlighted ? "border-primary ring-2 ring-primary/40" : "border-border",
        dimmed && "opacity-30",
      )}
    >
      {/* Bắt buộc phải có Handle để @xyflow/react tính được điểm neo vẽ edge —
          thiếu Handle thì edge có data đúng vẫn không render. Ẩn hẳn (opacity-0,
          không tương tác kéo-nối) vì user chỉ yêu cầu đường nối hiện ra, không
          yêu cầu chấm tròn handle hiển thị như ảnh tham khảo. */}
      <Handle type="target" position={Position.Left} className="h-px! w-px! border-0! bg-transparent! opacity-0!" isConnectable={false} />
      <Handle type="source" position={Position.Right} className="h-px! w-px! border-0! bg-transparent! opacity-0!" isConnectable={false} />
      <p className="truncate text-sm font-semibold text-foreground">{model.name}</p>
      <p className="truncate text-[11px] text-muted-foreground">
        {model.fields.length} field · {model.collection}
      </p>
    </div>
  );
}

export const ModelNode = memo(ModelNodeComponent);

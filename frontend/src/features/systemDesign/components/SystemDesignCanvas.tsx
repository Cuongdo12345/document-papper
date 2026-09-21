import { useCallback } from "react";
import { ReactFlow, Background, Controls, MiniMap, Panel, useReactFlow, type Node, type Edge, type NodeMouseHandler, type EdgeMouseHandler } from "@xyflow/react";
import { ModuleGroupNode } from "@/features/systemDesign/components/ModuleGroupNode";
import { ModelNode } from "@/features/systemDesign/components/ModelNode";
import { SystemDesignLegend } from "@/features/systemDesign/components/SystemDesignLegend";
import { ModuleFilterPanel } from "@/features/systemDesign/components/ModuleFilterPanel";
import { MODULE_NODE_TYPE, MODEL_NODE_TYPE, type RelationEdgeData } from "@/features/systemDesign/utils/layout";
import type { SystemDesignModule, SystemDesignRelationship } from "@/types/systemDesign.types";

// Module-level (không tạo lại object mỗi render) — xyflow yêu cầu
// `nodeTypes` giữ nguyên identity giữa các lần render để tránh warning/rerender thừa.
const nodeTypes = {
  [MODULE_NODE_TYPE]: ModuleGroupNode,
  [MODEL_NODE_TYPE]: ModelNode,
};

interface SystemDesignCanvasProps {
  nodes: Node[];
  edges: Edge[];
  modules: SystemDesignModule[];
  hiddenModules: Set<string>;
  onToggleModule: (moduleName: string) => void;
  onShowAllModules: () => void;
  onModelClick: (nodeId: string) => void;
  onEdgeClick: (relation: SystemDesignRelationship) => void;
  onPaneClick: () => void;
}

/**
 * DEV-073/FE-24 — phần "cơ chế" thuần (fitView/click routing), KHÔNG giữ
 * state nghiệp vụ (filter/selection/drawer đều do `SystemDesignPage` sở
 * hữu, truyền xuống qua props) — component này chỉ là lớp glue giữa
 * `@xyflow/react` và state của trang cha. `useReactFlow()` BẮT BUỘC phải
 * gọi trong 1 component con của `<ReactFlowProvider>` — đặt ở đây, không
 * đặt ở `SystemDesignPage` (nơi render `<ReactFlowProvider>`).
 */
export function SystemDesignCanvas({
  nodes,
  edges,
  modules,
  hiddenModules,
  onToggleModule,
  onShowAllModules,
  onModelClick,
  onEdgeClick,
  onPaneClick,
}: SystemDesignCanvasProps) {
  const { fitView } = useReactFlow();

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      if (node.type === MODULE_NODE_TYPE) {
        fitView({ nodes: [{ id: node.id }], duration: 400, padding: 0.25 });
      } else if (node.type === MODEL_NODE_TYPE) {
        onModelClick(node.id);
      }
    },
    [fitView, onModelClick],
  );

  const handleEdgeClick: EdgeMouseHandler = useCallback(
    (_event, edge) => {
      const data = edge.data as RelationEdgeData;
      onEdgeClick({ model: data.fromModel, field: data.field, ref: data.toModel });
    },
    [onEdgeClick],
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodeClick={handleNodeClick}
      onEdgeClick={handleEdgeClick}
      onPaneClick={onPaneClick}
      fitView
      minZoom={0.1}
      proOptions={{ hideAttribution: true }}
    >
      <Background />
      {/* Controls/MiniMap: component có sẵn của @xyflow/react, không tự viết lại (vị trí mặc định: Controls dưới-trái, MiniMap dưới-phải). */}
      <Controls showInteractive={false} />
      <MiniMap pannable zoomable nodeStrokeWidth={2} />
      <Panel position="top-left">
        <ModuleFilterPanel modules={modules} hiddenModules={hiddenModules} onToggle={onToggleModule} onShowAll={onShowAllModules} />
      </Panel>
      <Panel position="top-right">
        <SystemDesignLegend />
      </Panel>
    </ReactFlow>
  );
}

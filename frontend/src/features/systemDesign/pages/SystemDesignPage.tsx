import { useCallback, useMemo, useState } from "react";
import { ReactFlowProvider, type Edge, type Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { parseApiError } from "@/utils/parseApiError";
import { useSystemDesign } from "@/features/systemDesign/hooks/useSystemDesign";
import { SystemDesignCanvas } from "@/features/systemDesign/components/SystemDesignCanvas";
import { SystemDesignDetailDrawer, type SystemDesignDrawerState } from "@/features/systemDesign/components/SystemDesignDetailDrawer";
import { buildGraph, MODULE_NODE_TYPE, type ModelNodeData, type ModuleNodeData, type RelationEdgeData } from "@/features/systemDesign/utils/layout";
import type { SystemDesignRelationship } from "@/types/systemDesign.types";

/**
 * DEV-073/FE-24 (2026-09-21) — thay thế hoàn toàn bản FE-23 (card + dữ liệu
 * tĩnh `systemModules.ts`, đã xoá) — nay đọc trực tiếp `GET /api/system-design`
 * qua `@xyflow/react`. Code-split bằng `React.lazy` ở `routes/index.tsx`
 * (KHÔNG import page này ở đâu khác trong bundle chính — `@xyflow/react`
 * chỉ tải khi vào đúng route `/app/system-design`).
 *
 * Kiến trúc trong feature này:
 *   `SystemDesignPage`   — data fetch (React Query) + state nghiệp vụ
 *                           (filter theo module, model đang chọn, Drawer).
 *   `SystemDesignCanvas` — thuần cơ chế xyflow (fitView/click routing),
 *                           bọc trong `<ReactFlowProvider>` vì `useReactFlow()`
 *                           chỉ gọi được trong 1 component con của Provider.
 *   `layout.ts`           — build `nodes`/`edges` từ response API (grid
 *                           packing thủ công, KHÔNG thêm lib auto-layout).
 */
export function SystemDesignPage() {
  const query = useSystemDesign();
  const [hiddenModules, setHiddenModules] = useState<Set<string>>(new Set());
  const [selectedModelName, setSelectedModelName] = useState<string | null>(null);
  const [drawerState, setDrawerState] = useState<SystemDesignDrawerState>(null);

  const { nodes: masterNodes, edges: masterEdges } = useMemo(() => {
    if (!query.data) return { nodes: [] as Node[], edges: [] as Edge[] };
    return buildGraph(query.data);
  }, [query.data]);

  const modelModuleMap = useMemo(() => {
    const map = new Map<string, string>();
    query.data?.models.forEach((m) => map.set(m.name, m.module));
    return map;
  }, [query.data]);

  // Chọn 1 model → tập model/edge "liên quan" (chính nó + mọi model nối
  // trực tiếp qua relationship 2 chiều) để tô đậm, phần còn lại làm mờ.
  const connectedModelNames = useMemo(() => {
    if (!selectedModelName || !query.data) return null;
    const set = new Set<string>([selectedModelName]);
    for (const r of query.data.relationships) {
      if (r.model === selectedModelName) set.add(r.ref);
      if (r.ref === selectedModelName) set.add(r.model);
    }
    return set;
  }, [selectedModelName, query.data]);

  const connectedEdgeIds = useMemo(() => {
    if (!selectedModelName) return null;
    const set = new Set<string>();
    for (const edge of masterEdges) {
      const data = edge.data as RelationEdgeData;
      if (data.fromModel === selectedModelName || data.toModel === selectedModelName) set.add(edge.id);
    }
    return set;
  }, [selectedModelName, masterEdges]);

  // Filter theo module: chỉ set `hidden` — KHÔNG bao giờ loại phần tử khỏi
  // `masterNodes`/`masterEdges` (đúng yêu cầu "không xoá khỏi state").
  const displayNodes = useMemo<Node[]>(() => {
    return masterNodes.map((node) => {
      if (node.type === MODULE_NODE_TYPE) {
        const moduleName = (node.data as ModuleNodeData).label;
        return { ...node, hidden: hiddenModules.has(moduleName) };
      }
      const modelName = (node.data as ModelNodeData).model.name;
      const moduleName = modelModuleMap.get(modelName);
      const hidden = moduleName ? hiddenModules.has(moduleName) : false;
      const highlighted = connectedModelNames ? connectedModelNames.has(modelName) : false;
      const dimmed = connectedModelNames ? !connectedModelNames.has(modelName) : false;
      return { ...node, hidden, data: { ...node.data, highlighted, dimmed } };
    });
  }, [masterNodes, hiddenModules, modelModuleMap, connectedModelNames]);

  const displayEdges = useMemo<Edge[]>(() => {
    return masterEdges.map((edge) => {
      const data = edge.data as RelationEdgeData;
      const fromModule = modelModuleMap.get(data.fromModel);
      const toModule = modelModuleMap.get(data.toModel);
      const hiddenByFilter = Boolean((fromModule && hiddenModules.has(fromModule)) || (toModule && hiddenModules.has(toModule)));
      const highlighted = connectedEdgeIds ? connectedEdgeIds.has(edge.id) : false;
      const dimmed = connectedEdgeIds ? !connectedEdgeIds.has(edge.id) : false;

      return {
        ...edge,
        hidden: hiddenByFilter,
        zIndex: highlighted ? 10 : 0,
        // Giữ nguyên màu xanh/đỏ gốc theo cardinality (đặt ở `layout.ts`,
        // `edge.style.stroke`) qua spread `...edge.style` — CHỈ ghi đè sang
        // `primary` khi highlighted; lúc dimmed chỉ giảm `opacity` (không đổi
        // hue) để vẫn nhận diện được loại quan hệ ngay cả khi đang mờ.
        style: {
          ...edge.style,
          ...(highlighted ? { stroke: "var(--color-primary)", strokeWidth: 2 } : {}),
          opacity: dimmed ? 0.25 : 1,
          transition: "stroke 150ms ease, stroke-width 150ms ease, opacity 150ms ease",
        },
        // Đồng bộ nhãn cardinality (1/N) với trạng thái highlight/dim của
        // path — tránh lệch (path mờ nhưng nhãn vẫn rõ 100%). Giữ nguyên màu
        // xanh/đỏ gốc theo cardinality (đặt ở `layout.ts`) khi dim (chỉ giảm
        // opacity, không đổi hue) — chỉ khi highlighted mới ghi đè sang
        // primary để khớp màu đường đang chọn.
        labelStyle: {
          ...edge.labelStyle,
          ...(highlighted ? { fill: "var(--color-primary)" } : {}),
          opacity: dimmed ? 0.25 : 1,
          transition: "fill 150ms ease, opacity 150ms ease",
        },
        labelBgStyle: {
          ...edge.labelBgStyle,
          opacity: dimmed ? 0.25 : 1,
          transition: "opacity 150ms ease",
        },
      };
    });
  }, [masterEdges, hiddenModules, modelModuleMap, connectedEdgeIds]);

  const handleToggleModule = useCallback((moduleName: string) => {
    setHiddenModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleName)) next.delete(moduleName);
      else next.add(moduleName);
      return next;
    });
  }, []);

  const handleShowAllModules = useCallback(() => setHiddenModules(new Set()), []);

  const handleModelClick = useCallback(
    (nodeId: string) => {
      const modelName = nodeId.replace(/^model:/, "");
      setSelectedModelName(modelName);
      const model = query.data?.models.find((m) => m.name === modelName);
      if (model && query.data) {
        const outgoingRelations = query.data.relationships.filter((r) => r.model === modelName);
        setDrawerState({ kind: "model", model, outgoingRelations });
      }
    },
    [query.data],
  );

  const handleEdgeClick = useCallback((relation: SystemDesignRelationship) => {
    setDrawerState({ kind: "edge", relation });
  }, []);

  const handlePaneClick = useCallback(() => setSelectedModelName(null), []);

  return (
    <div className="flex h-full min-h-150 flex-col gap-4">
      <PageHeader
        title="System Design"
        description={
          query.data
            ? `${query.data.totalModels} model · ${query.data.modules.length} module — đọc trực tiếp schema thật (GET /api/system-design), không qua tài liệu tĩnh.`
            : "Bản đồ module + quan hệ dữ liệu hệ thống. Chỉ IT/ADMIN xem được."
        }
      />

      {query.isLoading && <LoadingState variant="spinner" label="Đang tải bản đồ hệ thống..." />}
      {query.isError && <ErrorState message={parseApiError(query.error).message} onRetry={() => query.refetch()} />}

      {query.data && (
        <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-border">
          <ReactFlowProvider>
            <SystemDesignCanvas
              nodes={displayNodes}
              edges={displayEdges}
              modules={query.data.modules}
              hiddenModules={hiddenModules}
              onToggleModule={handleToggleModule}
              onShowAllModules={handleShowAllModules}
              onModelClick={handleModelClick}
              onEdgeClick={handleEdgeClick}
              onPaneClick={handlePaneClick}
            />
          </ReactFlowProvider>
        </div>
      )}

      <SystemDesignDetailDrawer state={drawerState} onClose={() => setDrawerState(null)} />
    </div>
  );
}

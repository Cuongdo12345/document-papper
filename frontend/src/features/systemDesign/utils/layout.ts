import { MarkerType, type Edge, type Node } from "@xyflow/react";
import type { SystemDesignData, SystemDesignModel, SystemDesignRelationship } from "@/types/systemDesign.types";

/**
 * DEV-073/FE-24 — layout THỦ CÔNG (grid packing đơn giản), KHÔNG dùng thêm
 * thư viện auto-layout (dagre/elkjs...) — chỉ 1 dependency mới được yêu cầu
 * (`@xyflow/react`). Đủ dùng vì mục đích là xem cấu trúc theo domain (đã có
 * sẵn nhóm rõ ràng qua `module`), không cần tối ưu số lần cắt cạnh như
 * force-directed layout.
 */

const MODEL_NODE_WIDTH = 180;
const MODEL_NODE_HEIGHT = 64;
const GAP = 14;
const MODULE_PADDING = 18;
const MODULE_HEADER_HEIGHT = 32;
const MODULE_ROW_GAP = 40;
const MODULE_COL_GAP = 40;
const MAX_ROW_WIDTH = 1500;

export const MODULE_NODE_TYPE = "systemDesignModule";
export const MODEL_NODE_TYPE = "systemDesignModel";

export interface ModuleNodeData extends Record<string, unknown> {
  label: string;
  modelCount: number;
}

export interface ModelNodeData extends Record<string, unknown> {
  model: SystemDesignModel;
}

export interface RelationEdgeData extends Record<string, unknown> {
  field: string;
  fromModel: string;
  toModel: string;
}

function moduleNodeId(moduleName: string): string {
  return `module:${moduleName}`;
}

export function modelNodeId(modelName: string): string {
  return `model:${modelName}`;
}

interface ModuleBox {
  name: string;
  models: SystemDesignModel[];
  cols: number;
  rows: number;
  width: number;
  height: number;
}

function computeModuleBox(name: string, models: SystemDesignModel[]): ModuleBox {
  const count = models.length;
  const cols = Math.max(1, Math.ceil(Math.sqrt(count)));
  const rows = Math.max(1, Math.ceil(count / cols));
  const width = cols * MODEL_NODE_WIDTH + (cols - 1) * GAP + MODULE_PADDING * 2;
  const height = MODULE_HEADER_HEIGHT + rows * MODEL_NODE_HEIGHT + (rows - 1) * GAP + MODULE_PADDING * 2;
  return { name, models, cols, rows, width, height };
}

/** Sinh `nodes`/`edges` cho `@xyflow/react` từ response `GET /api/system-design`. */
export function buildGraph(data: SystemDesignData): { nodes: Node[]; edges: Edge[] } {
  const modelsByModule = new Map<string, SystemDesignModel[]>();
  for (const model of data.models) {
    if (!modelsByModule.has(model.module)) modelsByModule.set(model.module, []);
    modelsByModule.get(model.module)!.push(model);
  }

  const boxes = [...data.modules]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((m) => computeModuleBox(m.name, modelsByModule.get(m.name) ?? []));

  const groupNodes: Node[] = [];
  const childNodes: Node[] = [];

  let cursorX = 0;
  let cursorY = 0;
  let rowHeight = 0;

  for (const box of boxes) {
    if (cursorX > 0 && cursorX + box.width > MAX_ROW_WIDTH) {
      cursorX = 0;
      cursorY += rowHeight + MODULE_ROW_GAP;
      rowHeight = 0;
    }

    groupNodes.push({
      id: moduleNodeId(box.name),
      type: MODULE_NODE_TYPE,
      position: { x: cursorX, y: cursorY },
      data: { label: box.name, modelCount: box.models.length } satisfies ModuleNodeData,
      style: { width: box.width, height: box.height },
      draggable: false,
      selectable: true,
    });

    box.models.forEach((model, i) => {
      const col = i % box.cols;
      const row = Math.floor(i / box.cols);
      childNodes.push({
        id: modelNodeId(model.name),
        type: MODEL_NODE_TYPE,
        parentId: moduleNodeId(box.name),
        extent: "parent",
        position: {
          x: MODULE_PADDING + col * (MODEL_NODE_WIDTH + GAP),
          y: MODULE_HEADER_HEIGHT + MODULE_PADDING + row * (MODEL_NODE_HEIGHT + GAP),
        },
        data: { model } satisfies ModelNodeData,
        style: { width: MODEL_NODE_WIDTH, height: MODEL_NODE_HEIGHT },
        draggable: false,
      });
    });

    cursorX += box.width + MODULE_COL_GAP;
    rowHeight = Math.max(rowHeight, box.height);
  }

  const modelNameSet = new Set(data.models.map((m) => m.name));
  const edges: Edge[] = data.relationships
    // Phòng thủ: nếu backend trả `ref` trỏ tới model không có trong `models[]`
    // (không nên xảy ra — mọi model đã đăng ký đều nằm trong response — vẫn
    // bỏ qua an toàn thay vì tạo edge treo gây lỗi render).
    .filter((r) => modelNameSet.has(r.model) && modelNameSet.has(r.ref))
    .map((r: SystemDesignRelationship, i) => {
      // Field hậu tố "[]" (hoặc chứa "[]." nếu ref nằm trong subdocument lồng
      // nhau, VD "steps[].approvedBy") = quan hệ mảng (1-N); ngược lại là ref
      // đơn (1-1) — suy trực tiếp từ cách backend đặt tên field, không cần
      // thêm field "type" mới ở API (DEV-073 KHÔNG đổi backend).
      const isArrayRef = r.field.includes("[]");
      // User yêu cầu trực tiếp: "1" xanh (dùng --success), "N" đỏ (dùng
      // --destructive) để dễ phân biệt — CHÚ Ý: đi ngược khuyến nghị cũ ở
      // `index.css` (không tái dùng màu status cho dataviz series identity,
      // xem FE-09) nhưng đây là chỉ định trực tiếp của user cho ký hiệu
      // cardinality, không phải Claude tự chọn màu — không tạo token mới,
      // vẫn dùng 2 token status sẵn có. Áp cho cả đường nối + mũi tên + nhãn
      // (đồng bộ toàn bộ edge, không chỉ riêng nhãn).
      const cardinalityColor = isArrayRef ? "var(--color-destructive)" : "var(--color-success)";
      return {
        id: `edge:${i}:${r.model}:${r.field}`,
        source: modelNodeId(r.model),
        target: modelNodeId(r.ref),
        type: "step",
        animated: true,
        style: { stroke: cardinalityColor },
        markerEnd: { type: MarkerType.ArrowClosed, color: cardinalityColor },
        label: isArrayRef ? "N" : "1",
        labelStyle: { fontWeight: 600, fontSize: 11, fill: cardinalityColor },
        labelBgStyle: { fill: cardinalityColor, fillOpacity: 0.12 },
        labelBgPadding: [4, 2] as [number, number],
        labelBgBorderRadius: 4,
        data: { field: r.field, fromModel: r.model, toModel: r.ref } satisfies RelationEdgeData,
      };
    });

  return { nodes: [...groupNodes, ...childNodes], edges };
}

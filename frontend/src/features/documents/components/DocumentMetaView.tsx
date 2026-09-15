import { getMetaShape } from "@/features/documents/utils/documentMeta";
import type { DocumentMeta, DocumentSubType } from "@/types/document.types";

function formatCurrency(value: number): string {
  return value.toLocaleString("vi-VN") + " đ";
}

interface DocumentMetaViewProps {
  subType: DocumentSubType;
  meta: DocumentMeta;
}

/** Hiển thị `meta` READ-ONLY ở Document Detail — cùng mapping shape với `DocumentMetaFields` (`documentMeta.ts`). */
export function DocumentMetaView({ subType, meta }: DocumentMetaViewProps) {
  const shape = getMetaShape(subType);
  const m = (meta ?? {}) as Record<string, unknown>;

  if (shape === "issue") {
    return <p className="text-sm text-foreground">{String(m.issue ?? "—")}</p>;
  }

  if (shape === "items-procurement" || shape === "items-inspection") {
    const items = Array.isArray(m.items) ? (m.items as Record<string, unknown>[]) : [];
    const nameKey = shape === "items-procurement" ? "deviceName" : "description";
    return (
      <div className="space-y-2">
        {shape === "items-inspection" && m.inspectionResult ? (
          <p className="text-sm text-foreground">
            <span className="font-medium">Kết quả kiểm tra:</span> {String(m.inspectionResult)}
          </p>
        ) : null}
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs font-medium text-muted-foreground">
              <tr>
                <th className="px-3 py-2">{shape === "items-procurement" ? "Thiết bị/Vật tư" : "Hạng mục"}</th>
                <th className="px-3 py-2">SL</th>
                <th className="px-3 py-2">Đơn giá</th>
                <th className="px-3 py-2">Thành tiền</th>
                {shape === "items-procurement" && <th className="px-3 py-2">Ghi chú</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((it, i) => (
                <tr key={i}>
                  <td className="px-3 py-2">{String(it[nameKey] ?? "—")}</td>
                  <td className="px-3 py-2">{String(it.quantity ?? "—")}</td>
                  <td className="px-3 py-2">{formatCurrency(Number(it.unitPrice ?? 0))}</td>
                  <td className="px-3 py-2">{formatCurrency(Number(it.totalPrice ?? 0))}</td>
                  {shape === "items-procurement" && <td className="px-3 py-2">{String(it.note ?? "—")}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {typeof m.totalAmount === "number" && (
          <p className="text-right text-sm font-medium text-foreground">Tổng cộng: {formatCurrency(m.totalAmount)}</p>
        )}
      </div>
    );
  }

  return (
    <pre className="overflow-x-auto rounded-md border border-border bg-muted/30 p-3 text-xs">
      {JSON.stringify(meta ?? {}, null, 2)}
    </pre>
  );
}

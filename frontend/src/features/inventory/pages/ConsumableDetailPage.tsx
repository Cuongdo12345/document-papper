import { useState } from "react";
import { useParams } from "react-router-dom";
import { Pencil, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { PERMISSIONS } from "@/constants/permissions";
import { useConsumableItemDetail } from "@/features/inventory/hooks/useConsumableItemDetail";
import { EditConsumableItemModal } from "@/features/inventory/components/EditConsumableItemModal";
import { ConsumableTransactionModal } from "@/features/inventory/components/ConsumableTransactionModal";
import { ConsumableTransactionHistory } from "@/features/inventory/components/ConsumableTransactionHistory";
import { parseApiError } from "@/utils/parseApiError";

/** Roadmap B3 (2026-09-15) — `/app/inventory/:id`. Chi tiết vật tư + nhập/xuất kho + lịch sử giao dịch. */
export function ConsumableDetailPage() {
  const { id } = useParams<{ id: string }>();
  const query = useConsumableItemDetail(id);

  const [editOpen, setEditOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<"IN" | "OUT" | null>(null);

  if (query.isLoading) return <LoadingState label="Đang tải chi tiết vật tư..." />;
  if (query.isError || !query.data) {
    return <ErrorState message={query.error ? parseApiError(query.error).message : "Không tìm thấy vật tư"} onRetry={() => query.refetch()} />;
  }

  const item = query.data;
  const departmentLabel = typeof item.department === "string" ? "—" : item.department.name;

  return (
    <div className="space-y-4">
      <PageHeader
        title={item.name}
        description={`${departmentLabel} · ${item.category || "Chưa phân nhóm"}`}
        breadcrumb={[{ label: "Vật tư tiêu hao", to: "/app/inventory" }, { label: item.name }]}
        actions={
          <div className="flex gap-2">
            <PermissionGuard permission={PERMISSIONS.CONSUMABLE_TRANSACTION_CREATE}>
              <Button variant="secondary" size="sm" onClick={() => setTransactionType("IN")}>
                <ArrowDownToLine /> Nhập kho
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setTransactionType("OUT")}>
                <ArrowUpFromLine /> Xuất kho
              </Button>
            </PermissionGuard>
            <PermissionGuard permission={PERMISSIONS.CONSUMABLE_UPDATE}>
              <Button size="sm" onClick={() => setEditOpen(true)}>
                <Pencil /> Sửa
              </Button>
            </PermissionGuard>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 rounded-lg border border-border bg-card p-4 sm:grid-cols-4">
        <div>
          <p className="text-xs text-muted-foreground">Tồn kho hiện tại</p>
          <p className="mt-1 flex items-center gap-2 text-lg font-semibold text-foreground">
            {item.quantityOnHand} {item.unit}
            {item.isLowStock && <StatusBadge variant="destructive">Sắp hết</StatusBadge>}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Ngưỡng cảnh báo</p>
          <p className="mt-1 text-lg font-semibold text-foreground">{item.minStockThreshold} {item.unit}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Khoa/Phòng</p>
          <p className="mt-1 text-lg font-semibold text-foreground">{departmentLabel}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Trạng thái</p>
          <p className="mt-1">
            <StatusBadge variant={item.isActive ? "success" : "default"}>
              {item.isActive ? "Đang theo dõi" : "Ngừng theo dõi"}
            </StatusBadge>
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-foreground">Lịch sử giao dịch</h2>
        <ConsumableTransactionHistory itemId={item._id} />
      </div>

      {editOpen && <EditConsumableItemModal open={editOpen} onClose={() => setEditOpen(false)} item={item} />}
      {transactionType && (
        <ConsumableTransactionModal
          open={!!transactionType}
          onClose={() => setTransactionType(null)}
          item={item}
          type={transactionType}
        />
      )}
    </div>
  );
}

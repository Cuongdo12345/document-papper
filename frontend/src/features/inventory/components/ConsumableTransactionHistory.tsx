import { useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { Pagination } from "@/components/shared/Pagination";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useConsumableTransactions } from "@/features/inventory/hooks/useConsumableTransactions";
import { parseApiError } from "@/utils/parseApiError";
import type { ConsumableTransaction } from "@/types/consumable.types";

const LIMIT = 10;

function performerName(t: ConsumableTransaction) {
  return typeof t.performedBy === "string" ? "—" : t.performedBy.fullName;
}

/** Roadmap B3 — lịch sử giao dịch nhập/xuất của 1 vật tư, mới nhất trước. */
export function ConsumableTransactionHistory({ itemId }: { itemId: string }) {
  const [page, setPage] = useState(1);
  const query = useConsumableTransactions(itemId, { page, limit: LIMIT });

  const transactions = query.data?.data ?? [];
  const pagination = query.data?.pagination;

  const columns: DataTableColumn<ConsumableTransaction>[] = [
    {
      key: "createdAt",
      header: "Thời gian",
      render: (row) => new Date(row.createdAt).toLocaleString("vi-VN"),
    },
    {
      key: "type",
      header: "Loại",
      render: (row) => (
        <StatusBadge variant={row.type === "IN" ? "success" : "warning"}>
          {row.type === "IN" ? "Nhập kho" : "Xuất kho"}
        </StatusBadge>
      ),
    },
    { key: "quantity", header: "Số lượng", render: (row) => (row.type === "IN" ? `+${row.quantity}` : `-${row.quantity}`) },
    { key: "balanceAfter", header: "Tồn sau giao dịch" },
    { key: "reason", header: "Lý do", render: (row) => row.reason || "—" },
    { key: "performedBy", header: "Người thực hiện", render: performerName },
  ];

  return (
    <div className="space-y-3">
      <DataTable
        columns={columns}
        data={transactions}
        keyExtractor={(row) => row._id}
        isLoading={query.isLoading}
        isError={query.isError}
        errorMessage={query.error ? parseApiError(query.error).message : undefined}
        onRetry={() => query.refetch()}
        emptyTitle="Chưa có giao dịch nào"
        emptyMessage="Nhập/xuất kho để bắt đầu ghi nhận lịch sử."
      />

      {pagination && pagination.totalPages > 1 && (
        <Pagination page={pagination.page} limit={pagination.limit} total={pagination.total} totalPages={pagination.totalPages} onPageChange={setPage} />
      )}
    </div>
  );
}

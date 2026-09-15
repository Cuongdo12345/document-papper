import { useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { Pagination } from "@/components/shared/Pagination";
import { useProposalConversion } from "@/features/dashboard/hooks/useProposalConversion";
import { parseApiError } from "@/utils/parseApiError";
import type { ProposalConversionItem } from "@/types/dashboard.types";

const columns: DataTableColumn<ProposalConversionItem>[] = [
  { key: "departmentName", header: "Khoa/Phòng", className: "max-w-56 truncate" },
  { key: "totalProposals", header: "Tổng đề xuất", className: "text-right" },
  { key: "converted", header: "Đã có báo cáo", className: "text-right" },
  { key: "conversionRate", header: "Tỷ lệ chuyển đổi", className: "text-right", render: (row) => `${row.conversionRate}%` },
];

/** FE-09 — `GET /dashboard/kpi/proposal-conversion`: "Đề xuất nào đã có Báo cáo (`referenceTo`) đi kèm?" theo khoa/phòng. */
export function ProposalConversionWidget() {
  const [page, setPage] = useState(1);
  const query = useProposalConversion({ page, limit: 10, sortBy: "conversionRate", sortOrder: "desc" });

  return (
    <div className="space-y-3">
      <DataTable
        columns={columns}
        data={query.data?.items ?? []}
        keyExtractor={(row) => row.departmentId}
        isLoading={query.isLoading}
        isError={query.isError}
        errorMessage={query.error ? parseApiError(query.error).message : undefined}
        onRetry={() => query.refetch()}
        emptyTitle="Chưa có đề xuất nào"
      />
      {query.data?.pagination && query.data.pagination.totalPages > 1 && (
        <Pagination
          page={query.data.pagination.page}
          limit={query.data.pagination.limit}
          total={query.data.pagination.total}
          totalPages={query.data.pagination.totalPages}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}

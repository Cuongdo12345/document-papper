import { useState } from "react";
import { AppDrawer } from "@/components/shared/AppDrawer";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { Pagination } from "@/components/shared/Pagination";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useImportHistory } from "@/features/documents/hooks/useImportHistory";
import { parseApiError } from "@/utils/parseApiError";
import type { ImportHistoryItem } from "@/types/importHistory.types";

const LIMIT = 20;

const STATUS_VARIANT: Record<ImportHistoryItem["status"], "success" | "warning" | "destructive"> = {
  success: "success",
  partial: "warning",
  failed: "destructive",
};
const STATUS_LABEL: Record<ImportHistoryItem["status"], string> = {
  success: "Thành công",
  partial: "Một phần",
  failed: "Thất bại",
};

interface ImportHistoryDrawerProps {
  open: boolean;
  onClose: () => void;
}

/**
 * DÙNG CHUNG Document + Asset (`useImportHistory` — xem chú thích gốc ở
 * đó). ⚠️ Danh sách LỒNG cả 2 domain (không có field phân biệt) — cột
 * "Tên file" là gợi ý duy nhất để user tự nhận ra lượt import nào.
 */
export function ImportHistoryDrawer({ open, onClose }: ImportHistoryDrawerProps) {
  const [page, setPage] = useState(1);
  const query = useImportHistory({ page, limit: LIMIT }, { enabled: open });
  const items = query.data?.items ?? [];

  const columns: DataTableColumn<ImportHistoryItem>[] = [
    {
      key: "createdAt",
      header: "Thời gian",
      className: "whitespace-nowrap",
      render: (row) => new Date(row.createdAt).toLocaleString("vi-VN"),
    },
    { key: "fileName", header: "File" },
    { key: "mode", header: "Loại", render: (row) => (row.mode === "dryRun" ? "Xem trước" : "Import thật") },
    { key: "status", header: "Trạng thái", render: (row) => <StatusBadge variant={STATUS_VARIANT[row.status]}>{STATUS_LABEL[row.status]}</StatusBadge> },
    {
      key: "counts",
      header: "Kết quả",
      render: (row) => (
        <span className="text-xs text-muted-foreground">
          {row.totalRows} dòng · {row.created} mới · {row.updated} cập nhật
          {row.errorCount > 0 && <span className="text-destructive"> · {row.errorCount} lỗi</span>}
        </span>
      ),
    },
    { key: "importedBy", header: "Người import", render: (row) => row.importedBy?.fullName ?? "—" },
  ];

  return (
    <AppDrawer open={open} onClose={onClose} title="Lịch sử import Excel" width="lg">
      <div className="space-y-4 p-4">
        <DataTable
          columns={columns}
          data={items}
          keyExtractor={(row) => row._id}
          isLoading={query.isLoading}
          isError={query.isError}
          errorMessage={query.error ? parseApiError(query.error).message : undefined}
          onRetry={() => query.refetch()}
          emptyTitle="Chưa có lượt import nào"
          emptyMessage="Chưa có lịch sử import Excel."
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
    </AppDrawer>
  );
}

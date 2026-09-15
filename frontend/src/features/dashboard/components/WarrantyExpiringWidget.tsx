import { useState } from "react";
import { Link } from "react-router-dom";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { Pagination } from "@/components/shared/Pagination";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useAssetWarrantyExpiring } from "@/features/dashboard/hooks/useAssetWarrantyExpiring";
import { parseApiError } from "@/utils/parseApiError";
import type { Asset } from "@/types/asset.types";

/**
 * Backend filter `warrantyExpiredAt: {$lte: threshold}` — CỐ TÌNH KHÔNG có
 * lower bound (xem `assetDashboard.service.ts`: "danh sách XEM TOÀN BỘ",
 * không chỉ "sắp tới"), nghĩa là kết quả LUÔN gồm cả tài sản đã hết hạn từ
 * NHIỀU NĂM trước lẫn tài sản sắp hết hạn — 2 tình huống khác hẳn mức độ
 * khẩn cấp. Trước đây UI không phân biệt (giống hệt CalibrationDueWidget
 * TRƯỚC KHI có field `isOverdue` — ở đây backend không trả field tương tự
 * nên tự tính client-side bằng đúng logic thời gian giống nhau).
 */
function isAlreadyExpired(warrantyExpiredAt?: string): boolean {
  return !!warrantyExpiredAt && new Date(warrantyExpiredAt) < new Date();
}

const columns: DataTableColumn<Asset>[] = [
  {
    key: "name",
    header: "Tài sản",
    className: "max-w-56 truncate",
    render: (row) => (
      <Link to={`/app/assets/${row._id}`} className="font-medium text-foreground hover:underline" title={row.name}>
        {row.name}
      </Link>
    ),
  },
  { key: "category", header: "Danh mục", className: "max-w-36 truncate", render: (row) => row.category.name },
  { key: "department", header: "Khoa/Phòng", className: "max-w-44 truncate", render: (row) => row.department.name },
  {
    key: "warrantyExpiredAt",
    header: "Hạn bảo hành",
    render: (row) => (row.warrantyExpiredAt ? new Date(row.warrantyExpiredAt).toLocaleDateString("vi-VN") : "—"),
  },
  {
    key: "status",
    header: "Trạng thái",
    render: (row) =>
      isAlreadyExpired(row.warrantyExpiredAt) ? (
        <StatusBadge variant="destructive">Đã hết hạn</StatusBadge>
      ) : (
        <StatusBadge variant="warning">Sắp hết hạn</StatusBadge>
      ),
  },
];

/** FE-09 — `GET /dashboard/assets/warranty-expiring`. Mặc định `daysAhead=30`, khớp `assetAlerts.service.ts`. */
export function WarrantyExpiringWidget() {
  const [daysAheadInput, setDaysAheadInput] = useState("30");
  const [page, setPage] = useState(1);

  const daysAhead = Number(daysAheadInput);
  const isValid = Number.isInteger(daysAhead) && daysAhead >= 0;
  const query = useAssetWarrantyExpiring(isValid ? daysAhead : 30, { page, limit: 10 });

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-3">
        <div className="space-y-1.5">
          <label htmlFor="warranty-days" className="text-xs font-medium text-muted-foreground">
            Trong vòng (ngày)
          </label>
          <input
            id="warranty-days"
            type="number"
            min={0}
            value={daysAheadInput}
            onChange={(e) => {
              setDaysAheadInput(e.target.value);
              setPage(1);
            }}
            className="w-28 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        {!isValid && <p className="pb-2 text-xs text-destructive">Phải là số nguyên ≥ 0 — đang dùng mặc định 30.</p>}
      </div>

      <DataTable
        columns={columns}
        data={query.data?.data ?? []}
        keyExtractor={(row) => row._id}
        isLoading={query.isLoading}
        isError={query.isError}
        errorMessage={query.error ? parseApiError(query.error).message : undefined}
        onRetry={() => query.refetch()}
        emptyTitle="Không có tài sản nào sắp hết hạn bảo hành"
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

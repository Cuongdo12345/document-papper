import { useState } from "react";
import { Plus, Pencil, CheckCircle2, XCircle } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { FilterBar } from "@/components/shared/FilterBar";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { Pagination } from "@/components/shared/Pagination";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { usePermission } from "@/hooks/usePermission";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { PERMISSIONS } from "@/constants/permissions";
import { useDepartments } from "@/features/departments/hooks/useDepartments";
import { useConsumableRequests } from "@/features/inventory/hooks/useConsumableRequests";
import { useFulfillConsumableRequest, useCancelConsumableRequest } from "@/features/inventory/hooks/useConsumableRequestActions";
import { InventorySectionTabs } from "@/features/inventory/components/InventorySectionTabs";
import { ConsumableRequestFormModal } from "@/features/inventory/components/ConsumableRequestFormModal";
import { parseApiError } from "@/utils/parseApiError";
import type { ConsumableRequest, ConsumableRequestStatus } from "@/types/consumable.types";

const LIMIT = 10;

const STATUS_LABEL: Record<ConsumableRequestStatus, string> = {
  PENDING: "Đang chờ xử lý",
  FULFILLED: "Đã mua",
  CANCELLED: "Đã huỷ",
};

const STATUS_VARIANT: Record<ConsumableRequestStatus, "warning" | "success" | "destructive"> = {
  PENDING: "warning",
  FULFILLED: "success",
  CANCELLED: "destructive",
};

function departmentLabel(request: ConsumableRequest) {
  return typeof request.department === "string" ? "—" : request.department.name;
}

function itemsSummary(request: ConsumableRequest) {
  return request.items
    .map((i) => (typeof i.consumableItem === "string" ? "—" : `${i.consumableItem.name} ×${i.quantity}`))
    .join(", ");
}

/**
 * Roadmap B8 (DEV-067, 2026-09-18) — `/app/inventory/requests`. Mirror
 * pattern `ConsumablesListPage` (FilterBar + DataTable + Pagination). KHÔNG
 * có luồng duyệt (user xác nhận trước khi làm) — chỉ Sửa (khi PENDING)/Đánh
 * dấu đã mua (FULFILL riêng, thường là Phòng Vật tư-TTB)/Huỷ.
 */
export function ConsumableRequestsListPage() {
  const { hasPermission } = usePermission();
  const isAdmin = useIsAdmin();
  const canBrowseDepartments = isAdmin || hasPermission(PERMISSIONS.DEPARTMENT_VIEW);
  const canFulfill = hasPermission(PERMISSIONS.CONSUMABLE_REQUEST_FULFILL);
  const canUpdate = hasPermission(PERMISSIONS.CONSUMABLE_REQUEST_UPDATE);

  const [page, setPage] = useState(1);
  const [department, setDepartment] = useState("");
  const [status, setStatus] = useState<"" | ConsumableRequestStatus>("");
  const [formState, setFormState] = useState<{ open: boolean; request?: ConsumableRequest }>({ open: false });
  const [fulfillTarget, setFulfillTarget] = useState<ConsumableRequest | null>(null);
  const [cancelTarget, setCancelTarget] = useState<ConsumableRequest | null>(null);

  const departmentsQuery = useDepartments({ limit: 100 }, { enabled: canBrowseDepartments });
  const query = useConsumableRequests({
    page,
    limit: LIMIT,
    department: department || undefined,
    status: status || undefined,
  });
  const fulfillMutation = useFulfillConsumableRequest();
  const cancelMutation = useCancelConsumableRequest();

  const requests = query.data?.data ?? [];
  const pagination = query.data?.pagination;

  const columns: DataTableColumn<ConsumableRequest>[] = [
    { key: "requestMonth", header: "Tháng dự trù" },
    { key: "department", header: "Khoa/Phòng", render: departmentLabel },
    { key: "items", header: "Vật tư", render: itemsSummary, className: "max-w-xs truncate" },
    {
      key: "totalAmount",
      header: "Tổng dự trù",
      render: (row) => `${row.totalAmount.toLocaleString("vi-VN")} đ`,
    },
    {
      key: "status",
      header: "Trạng thái",
      render: (row) => <StatusBadge variant={STATUS_VARIANT[row.status]}>{STATUS_LABEL[row.status]}</StatusBadge>,
    },
    {
      key: "createdAt",
      header: "Ngày tạo",
      render: (row) => new Date(row.createdAt).toLocaleDateString("vi-VN"),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Đề xuất/Dự trù vật tư"
        description="Ghi nhận nhu cầu vật tư tiêu hao hàng tháng của khoa/phòng — không có bước duyệt, chỉ theo dõi đã mua hay chưa."
        actions={
          <PermissionGuard permission={PERMISSIONS.CONSUMABLE_REQUEST_CREATE}>
            <Button size="sm" onClick={() => setFormState({ open: true })}>
              <Plus /> Đề xuất mới
            </Button>
          </PermissionGuard>
        }
      />

      <InventorySectionTabs />

      <FilterBar
        onReset={() => {
          setDepartment("");
          setStatus("");
          setPage(1);
        }}
      >
        {canBrowseDepartments && (
          <div className="min-w-40 space-y-1.5">
            <label htmlFor="cr-department-filter" className="text-xs font-medium text-muted-foreground">
              Khoa/Phòng
            </label>
            <select
              id="cr-department-filter"
              value={department}
              onChange={(e) => {
                setDepartment(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Tất cả</option>
              {departmentsQuery.data?.data.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="min-w-40 space-y-1.5">
          <label htmlFor="cr-status-filter" className="text-xs font-medium text-muted-foreground">
            Trạng thái
          </label>
          <select
            id="cr-status-filter"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as "" | ConsumableRequestStatus);
              setPage(1);
            }}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Tất cả</option>
            <option value="PENDING">Đang chờ xử lý</option>
            <option value="FULFILLED">Đã mua</option>
            <option value="CANCELLED">Đã huỷ</option>
          </select>
        </div>
      </FilterBar>

      <DataTable
        columns={columns}
        data={requests}
        keyExtractor={(row) => row._id}
        isLoading={query.isLoading}
        isError={query.isError}
        errorMessage={query.error ? parseApiError(query.error).message : undefined}
        onRetry={() => query.refetch()}
        emptyTitle="Chưa có đề xuất nào"
        emptyMessage="Tạo đề xuất/dự trù vật tư đầu tiên hoặc điều chỉnh lại bộ lọc."
        rowActions={(row) => (
          <div className="flex justify-end gap-1">
            {row.status === "PENDING" && canUpdate && (
              <Button variant="ghost" size="sm" onClick={() => setFormState({ open: true, request: row })} aria-label="Sửa">
                <Pencil />
              </Button>
            )}
            {row.status === "PENDING" && canFulfill && (
              <Button variant="ghost" size="sm" onClick={() => setFulfillTarget(row)} aria-label="Đánh dấu đã mua">
                <CheckCircle2 className="text-success" />
              </Button>
            )}
            {row.status === "PENDING" && canUpdate && (
              <Button variant="ghost" size="sm" onClick={() => setCancelTarget(row)} aria-label="Huỷ">
                <XCircle className="text-destructive" />
              </Button>
            )}
          </div>
        )}
      />

      {pagination && (
        <Pagination
          page={pagination.page}
          limit={pagination.limit}
          total={pagination.total}
          totalPages={pagination.totalPages}
          onPageChange={setPage}
        />
      )}

      <ConsumableRequestFormModal open={formState.open} onClose={() => setFormState({ open: false })} request={formState.request} />

      <ConfirmDialog
        open={!!fulfillTarget}
        onClose={() => setFulfillTarget(null)}
        onConfirm={() => {
          if (!fulfillTarget) return;
          fulfillMutation.mutate(fulfillTarget._id, { onSuccess: () => setFulfillTarget(null) });
        }}
        title="Đánh dấu đã mua"
        message="Xác nhận đề xuất này đã được mua thực tế? Hành động này KHÔNG tự động tạo giao dịch nhập kho — vẫn cần nhập kho riêng ở trang Vật tư tiêu hao."
        isLoading={fulfillMutation.isPending}
      />

      <ConfirmDialog
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={() => {
          if (!cancelTarget) return;
          cancelMutation.mutate(cancelTarget._id, { onSuccess: () => setCancelTarget(null) });
        }}
        title="Huỷ đề xuất"
        message={`Huỷ đề xuất vật tư tháng ${cancelTarget?.requestMonth}? Không thể hoàn tác.`}
        danger
        isLoading={cancelMutation.isPending}
      />
    </div>
  );
}

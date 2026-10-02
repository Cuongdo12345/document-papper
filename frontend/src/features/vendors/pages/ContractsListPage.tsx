import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Eye, Pencil, Ban, RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { FilterBar } from "@/components/shared/FilterBar";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { Pagination } from "@/components/shared/Pagination";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { BatchActionBar } from "@/components/shared/BatchActionBar";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { usePermission } from "@/hooks/usePermission";
import { useRowSelection } from "@/hooks/useRowSelection";
import { PERMISSIONS } from "@/constants/permissions";
import { useVendors } from "@/features/vendors/hooks/useVendors";
import { useContracts } from "@/features/vendors/hooks/useContracts";
import {
  useCancelContract,
  useRestoreContract,
  useBulkCancelContracts,
  useBulkRestoreContracts,
} from "@/features/vendors/hooks/useContractActions";
import { CreateContractModal } from "@/features/vendors/components/CreateContractModal";
import { EditContractModal } from "@/features/vendors/components/EditContractModal";
import { WorkflowActionModal } from "@/features/documents/components/WorkflowActionModal";
import { parseApiError } from "@/utils/parseApiError";
import { splitSelectionByActive } from "@/utils/splitSelectionByActive";
import type { Contract, ContractStatusFilter } from "@/types/contract.types";

const LIMIT = 10;

function vendorName(contract: Contract) {
  return typeof contract.vendor === "string" ? "—" : contract.vendor.name;
}

function contractStatusBadge(contract: Contract) {
  if (contract.status === "cancelled") return <StatusBadge variant="default">Đã huỷ</StatusBadge>;
  if (contract.isExpired) return <StatusBadge variant="destructive">Đã hết hạn</StatusBadge>;
  return <StatusBadge variant="success">Còn hiệu lực</StatusBadge>;
}

/** Roadmap B4 (2026-09-16) — `/app/contracts`. Mirror pattern `ConsumablesListPage`. */
export function ContractsListPage() {
  const navigate = useNavigate();
  const { hasPermission } = usePermission();
  // [DEV-087] Cùng permission với nút từng dòng: huỷ = CONTRACT_UPDATE, khôi phục = CONTRACT_RESTORE.
  const canBulkCancel = hasPermission(PERMISSIONS.CONTRACT_UPDATE);
  const canBulkRestore = hasPermission(PERMISSIONS.CONTRACT_RESTORE);
  const canBulkAct = canBulkCancel || canBulkRestore;
  const [batchCancelOpen, setBatchCancelOpen] = useState(false);
  const [batchRestoreOpen, setBatchRestoreOpen] = useState(false);
  const bulkCancelMutation = useBulkCancelContracts();
  const bulkRestoreMutation = useBulkRestoreContracts();

  const [page, setPage] = useState(1);
  const [vendor, setVendor] = useState("");
  const [status, setStatus] = useState<ContractStatusFilter | "">("");
  const [expiringOnly, setExpiringOnly] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Contract | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Contract | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<Contract | null>(null);
  const cancelMutation = useCancelContract();
  const restoreMutation = useRestoreContract();

  function resetFilters() {
    setVendor("");
    setStatus("");
    setExpiringOnly(false);
    setPage(1);
  }

  const vendorsQuery = useVendors({ limit: 100 });
  const query = useContracts({
    page,
    limit: LIMIT,
    vendor: vendor || undefined,
    status: status || undefined,
    expiringWithinDays: expiringOnly ? 30 : undefined,
  });

  const contracts = query.data?.data ?? [];
  const pagination = query.data?.pagination;
  const selection = useRowSelection(contracts.map((c) => c._id));
  // FE-35: nút theo dòng đang chọn — "active" (kể cả đã hết hạn, vẫn huỷ được như nút từng dòng) -> Huỷ, "cancelled" -> Khôi phục.
  const { activeIds, inactiveIds } = splitSelectionByActive(contracts, selection.selectedIds, (c) => c.status === "active");

  const columns: DataTableColumn<Contract>[] = [
    {
      key: "title",
      header: "Tên hợp đồng",
      render: (row) => (
        <Link to={`/app/contracts/${row._id}`} className="font-medium text-primary hover:underline">
          {row.title}
        </Link>
      ),
    },
    { key: "vendor", header: "Nhà cung cấp", render: vendorName },
    { key: "assets", header: "Số tài sản", render: (row) => row.assets.length },
    { key: "endDate", header: "Hết hạn", render: (row) => new Date(row.endDate).toLocaleDateString("vi-VN") },
    { key: "status", header: "Trạng thái", render: contractStatusBadge },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Hợp đồng bảo trì"
        description="Quản lý hợp đồng bảo trì/bảo hành đã ký với nhà cung cấp."
        actions={
          <PermissionGuard permission={PERMISSIONS.CONTRACT_CREATE}>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus /> Tạo hợp đồng
            </Button>
          </PermissionGuard>
        }
      />

      {canBulkAct && (
        <BatchActionBar
          count={selection.selectedIds.size}
          onClear={selection.clear}
          deleteLabel="Huỷ hợp đồng"
          onDelete={canBulkCancel && activeIds.length > 0 ? () => setBatchCancelOpen(true) : undefined}
          onRestore={canBulkRestore && inactiveIds.length > 0 ? () => setBatchRestoreOpen(true) : undefined}
          isLoading={bulkCancelMutation.isPending || bulkRestoreMutation.isPending}
        />
      )}

      {/* [Pass 3b, FE-27/FE-28, UI_DESIGN_SYSTEM.md Mục 4/9.3] Gộp FilterBar+DataTable vào 1 khung viền ngoài. */}
      <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
      <FilterBar variant="embedded" onReset={resetFilters}>
        <div className="min-w-40 space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Nhà cung cấp</label>
          <select
            value={vendor}
            onChange={(e) => {
              setVendor(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Tất cả</option>
            {vendorsQuery.data?.data.map((v) => (
              <option key={v._id} value={v._id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-36 space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Trạng thái</label>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as ContractStatusFilter | "");
              setPage(1);
            }}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Tất cả</option>
            <option value="active">Còn hiệu lực</option>
            <option value="expired">Đã hết hạn</option>
            <option value="cancelled">Đã huỷ</option>
          </select>
        </div>

        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={expiringOnly}
              onChange={(e) => {
                setExpiringOnly(e.target.checked);
                setPage(1);
              }}
              className="size-4 rounded border-input"
            />
            Chỉ hợp đồng sắp hết hạn (≤30 ngày)
          </label>
        </div>
      </FilterBar>

      <DataTable
        className="rounded-none border-0"
        columns={columns}
        data={contracts}
        keyExtractor={(row) => row._id}
        isLoading={query.isLoading}
        isError={query.isError}
        errorMessage={query.error ? parseApiError(query.error).message : undefined}
        onRetry={() => query.refetch()}
        emptyTitle="Chưa có hợp đồng nào"
        emptyMessage="Tạo hợp đồng đầu tiên để bắt đầu theo dõi."
        selection={
          canBulkAct
            ? { selectedIds: selection.selectedIds, onToggleRow: selection.toggleRow, onToggleAll: selection.toggleAll }
            : undefined
        }
        rowActions={(row) => (
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="sm" aria-label="Xem chi tiết" onClick={() => navigate(`/app/contracts/${row._id}`)}>
              <Eye />
            </Button>
            {row.status === "active" && (
              <PermissionGuard permission={PERMISSIONS.CONTRACT_UPDATE}>
                <Button variant="ghost" size="sm" aria-label="Sửa" onClick={() => setEditTarget(row)}>
                  <Pencil />
                </Button>
                <Button variant="ghost" size="sm" aria-label="Huỷ hợp đồng" onClick={() => setCancelTarget(row)}>
                  <Ban className="text-destructive" />
                </Button>
              </PermissionGuard>
            )}
            {row.status === "cancelled" && (
              <PermissionGuard permission={PERMISSIONS.CONTRACT_RESTORE}>
                <Button variant="ghost" size="sm" aria-label="Khôi phục" onClick={() => setRestoreTarget(row)}>
                  <RotateCcw />
                </Button>
              </PermissionGuard>
            )}
          </div>
        )}
      />
      </div>

      {pagination && (
        <Pagination page={pagination.page} limit={pagination.limit} total={pagination.total} totalPages={pagination.totalPages} onPageChange={setPage} />
      )}

      {createOpen && <CreateContractModal open={createOpen} onClose={() => setCreateOpen(false)} />}

      {editTarget && <EditContractModal open={!!editTarget} onClose={() => setEditTarget(null)} contract={editTarget} />}

      {cancelTarget && (
        <WorkflowActionModal
          open={!!cancelTarget}
          onClose={() => setCancelTarget(null)}
          title="Huỷ hợp đồng"
          message={`Huỷ hợp đồng "${cancelTarget.title}"? Có thể khôi phục lại sau bằng nút Khôi phục.`}
          confirmLabel="Huỷ hợp đồng"
          danger
          isLoading={cancelMutation.isPending}
          onConfirm={(note) =>
            cancelMutation.mutate(
              { id: cancelTarget._id, body: { cancelReason: note } },
              { onSuccess: () => setCancelTarget(null) },
            )
          }
        />
      )}

      <ConfirmDialog
        open={!!restoreTarget}
        onClose={() => setRestoreTarget(null)}
        onConfirm={() => {
          if (!restoreTarget) return;
          restoreMutation.mutate(restoreTarget._id, { onSuccess: () => setRestoreTarget(null) });
        }}
        title="Khôi phục hợp đồng"
        message={`Khôi phục hợp đồng "${restoreTarget?.title}" về trạng thái còn hiệu lực?`}
        isLoading={restoreMutation.isPending}
      />

      {batchCancelOpen && (
        <WorkflowActionModal
          open={batchCancelOpen}
          onClose={() => setBatchCancelOpen(false)}
          title="Huỷ hợp đồng đã chọn"
          message={`Huỷ ${activeIds.length} hợp đồng đã chọn? Lý do (nếu nhập) áp dụng chung cho tất cả. Có thể khôi phục lại sau.`}
          confirmLabel="Huỷ hợp đồng"
          danger
          isLoading={bulkCancelMutation.isPending}
          onConfirm={(note) =>
            bulkCancelMutation.mutate(
              { ids: activeIds, cancelReason: note },
              {
                onSuccess: () => {
                  setBatchCancelOpen(false);
                  selection.clear();
                },
              },
            )
          }
        />
      )}

      <ConfirmDialog
        open={batchRestoreOpen}
        onClose={() => setBatchRestoreOpen(false)}
        onConfirm={() => {
          bulkRestoreMutation.mutate(inactiveIds, {
            onSuccess: () => {
              setBatchRestoreOpen(false);
              selection.clear();
            },
          });
        }}
        title="Khôi phục hợp đồng đã chọn"
        message={`Khôi phục ${inactiveIds.length} hợp đồng đã huỷ về trạng thái còn hiệu lực?`}
        isLoading={bulkRestoreMutation.isPending}
      />
    </div>
  );
}

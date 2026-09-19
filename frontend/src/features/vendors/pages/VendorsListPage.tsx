import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Eye, Pencil, Trash2, RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { FilterBar } from "@/components/shared/FilterBar";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { Pagination } from "@/components/shared/Pagination";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { BatchActionBar } from "@/components/shared/BatchActionBar";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { useDebounce } from "@/hooks/useDebounce";
import { useRowSelection } from "@/hooks/useRowSelection";
import { PERMISSIONS } from "@/constants/permissions";
import { useVendors } from "@/features/vendors/hooks/useVendors";
import { useUpdateVendor, useBulkDeleteVendor, useBulkRestoreVendor } from "@/features/vendors/hooks/useVendorActions";
import { CreateVendorModal } from "@/features/vendors/components/CreateVendorModal";
import { EditVendorModal } from "@/features/vendors/components/EditVendorModal";
import { parseApiError } from "@/utils/parseApiError";
import type { Vendor } from "@/types/vendor.types";

const LIMIT = 10;

/** Roadmap B4 (2026-09-16) — `/app/vendors`. Mirror pattern `AssetsListPage`/`ConsumablesListPage`. */
export function VendorsListPage() {
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [isActive, setIsActive] = useState<"true" | "false" | "">("true");
  const debouncedKeyword = useDebounce(keyword);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Vendor | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<Vendor | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<Vendor | null>(null);
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
  const [batchRestoreOpen, setBatchRestoreOpen] = useState(false);
  const updateMutation = useUpdateVendor();
  const bulkDeleteMutation = useBulkDeleteVendor();
  const bulkRestoreMutation = useBulkRestoreVendor();

  function resetFilters() {
    setKeyword("");
    setIsActive("true");
    setPage(1);
  }

  const query = useVendors({
    page,
    limit: LIMIT,
    search: debouncedKeyword || undefined,
    isActive: isActive === "" ? undefined : isActive === "true",
  });

  const vendors = query.data?.data ?? [];
  const pagination = query.data?.pagination;
  const selection = useRowSelection(vendors.map((v) => v._id));

  const columns: DataTableColumn<Vendor>[] = [
    {
      key: "name",
      header: "Tên nhà cung cấp",
      render: (row) => (
        <Link to={`/app/vendors/${row._id}`} className="font-medium text-primary hover:underline">
          {row.name}
        </Link>
      ),
    },
    { key: "contactPerson", header: "Người liên hệ", render: (row) => row.contactPerson || "—" },
    { key: "phone", header: "Điện thoại", render: (row) => row.phone || "—" },
    { key: "email", header: "Email", render: (row) => row.email || "—" },
    {
      key: "isActive",
      header: "Trạng thái",
      render: (row) => (
        <StatusBadge variant={row.isActive ? "success" : "default"}>
          {row.isActive ? "Đang hợp tác" : "Ngừng hợp tác"}
        </StatusBadge>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Nhà cung cấp"
        description="Quản lý nhà cung cấp thiết bị và hợp đồng bảo trì/bảo hành."
        actions={
          <PermissionGuard permission={PERMISSIONS.VENDOR_CREATE}>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus /> Tạo nhà cung cấp
            </Button>
          </PermissionGuard>
        }
      />

      <FilterBar onReset={resetFilters}>
        <div className="min-w-48 space-y-1.5">
          <label htmlFor="v-search" className="text-xs font-medium text-muted-foreground">
            Tìm kiếm (tên)
          </label>
          <input
            id="v-search"
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value);
              setPage(1);
            }}
            placeholder="Nhập tên nhà cung cấp..."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="min-w-36 space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Hiển thị</label>
          <select
            value={isActive}
            onChange={(e) => {
              setIsActive(e.target.value as "true" | "false" | "");
              setPage(1);
            }}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="true">Đang hợp tác</option>
            <option value="false">Đã ngừng</option>
            <option value="">Tất cả</option>
          </select>
        </div>
      </FilterBar>

      <PermissionGuard permission={PERMISSIONS.VENDOR_UPDATE}>
        <BatchActionBar
          count={selection.selectedIds.size}
          onClear={selection.clear}
          onDelete={() => setBatchDeleteOpen(true)}
          onRestore={() => setBatchRestoreOpen(true)}
          isLoading={bulkDeleteMutation.isPending || bulkRestoreMutation.isPending}
        />
      </PermissionGuard>

      <DataTable
        columns={columns}
        data={vendors}
        keyExtractor={(row) => row._id}
        isLoading={query.isLoading}
        isError={query.isError}
        errorMessage={query.error ? parseApiError(query.error).message : undefined}
        onRetry={() => query.refetch()}
        emptyTitle="Chưa có nhà cung cấp nào"
        emptyMessage="Tạo nhà cung cấp đầu tiên để bắt đầu quản lý hợp đồng."
        selection={{ selectedIds: selection.selectedIds, onToggleRow: selection.toggleRow, onToggleAll: selection.toggleAll }}
        rowActions={(row) => (
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="sm" aria-label="Xem chi tiết" onClick={() => navigate(`/app/vendors/${row._id}`)}>
              <Eye />
            </Button>
            <PermissionGuard permission={PERMISSIONS.VENDOR_UPDATE}>
              <Button variant="ghost" size="sm" aria-label="Sửa" onClick={() => setEditTarget(row)}>
                <Pencil />
              </Button>
            </PermissionGuard>
            <PermissionGuard permission={PERMISSIONS.VENDOR_UPDATE}>
              {row.isActive ? (
                <Button variant="ghost" size="sm" aria-label="Ngừng hợp tác" onClick={() => setDeactivateTarget(row)}>
                  <Trash2 className="text-destructive" />
                </Button>
              ) : (
                <Button variant="ghost" size="sm" aria-label="Khôi phục" onClick={() => setRestoreTarget(row)}>
                  <RotateCcw />
                </Button>
              )}
            </PermissionGuard>
          </div>
        )}
      />

      {pagination && (
        <Pagination page={pagination.page} limit={pagination.limit} total={pagination.total} totalPages={pagination.totalPages} onPageChange={setPage} />
      )}

      {createOpen && <CreateVendorModal open={createOpen} onClose={() => setCreateOpen(false)} />}

      {editTarget && (
        <EditVendorModal open={!!editTarget} onClose={() => setEditTarget(null)} vendor={editTarget} />
      )}

      <ConfirmDialog
        open={!!deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={() => {
          if (!deactivateTarget) return;
          updateMutation.mutate(
            { id: deactivateTarget._id, body: { isActive: false } },
            { onSuccess: () => setDeactivateTarget(null) },
          );
        }}
        title="Ngừng hợp tác nhà cung cấp"
        message={`Ngừng hợp tác với "${deactivateTarget?.name}"? Nhà cung cấp sẽ bị ẩn khỏi danh sách mặc định, lịch sử hợp đồng đã ký vẫn được giữ nguyên. Có thể khôi phục lại sau bằng bộ lọc "Hiển thị: Đã ngừng".`}
        danger
        isLoading={updateMutation.isPending}
      />

      <ConfirmDialog
        open={!!restoreTarget}
        onClose={() => setRestoreTarget(null)}
        onConfirm={() => {
          if (!restoreTarget) return;
          updateMutation.mutate(
            { id: restoreTarget._id, body: { isActive: true } },
            { onSuccess: () => setRestoreTarget(null) },
          );
        }}
        title="Khôi phục nhà cung cấp"
        message={`Khôi phục hợp tác với "${restoreTarget?.name}"?`}
        isLoading={updateMutation.isPending}
      />

      <ConfirmDialog
        open={batchDeleteOpen}
        onClose={() => setBatchDeleteOpen(false)}
        onConfirm={() => {
          bulkDeleteMutation.mutate([...selection.selectedIds], {
            onSuccess: () => {
              setBatchDeleteOpen(false);
              selection.clear();
            },
          });
        }}
        title="Ngừng hợp tác nhà cung cấp đã chọn"
        message={`Ngừng hợp tác với ${selection.selectedIds.size} nhà cung cấp đã chọn? Có thể khôi phục lại sau bằng bộ lọc "Hiển thị: Đã ngừng".`}
        danger
        isLoading={bulkDeleteMutation.isPending}
      />

      <ConfirmDialog
        open={batchRestoreOpen}
        onClose={() => setBatchRestoreOpen(false)}
        onConfirm={() => {
          bulkRestoreMutation.mutate([...selection.selectedIds], {
            onSuccess: () => {
              setBatchRestoreOpen(false);
              selection.clear();
            },
          });
        }}
        title="Khôi phục nhà cung cấp đã chọn"
        message={`Khôi phục hợp tác với ${selection.selectedIds.size} nhà cung cấp đã chọn?`}
        isLoading={bulkRestoreMutation.isPending}
      />
    </div>
  );
}

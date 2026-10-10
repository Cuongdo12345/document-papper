import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BellRing, Eye, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { FilterBar } from "@/components/shared/FilterBar";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { Pagination } from "@/components/shared/Pagination";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { useDebounce } from "@/hooks/useDebounce";
import { PERMISSIONS } from "@/constants/permissions";
import { useSoftwareLicenses } from "@/features/softwareLicenses/hooks/useSoftwareLicenses";
import {
  useDeleteSoftwareLicense,
  useRestoreSoftwareLicense,
  useRunSoftwareLicenseAlerts,
} from "@/features/softwareLicenses/hooks/useSoftwareLicenseActions";
import { SoftwareLicenseFormModal } from "@/features/softwareLicenses/components/SoftwareLicenseFormModal";
import { LicenseExpiryBadge } from "@/features/softwareLicenses/components/LicenseExpiryBadge";
import { LICENSE_TYPE_LABELS } from "@/features/softwareLicenses/constants/softwareLicense.constants";
import { parseApiError } from "@/utils/parseApiError";
import { SOFTWARE_LICENSE_TYPES, type SoftwareLicenseListItem, type SoftwareLicenseType } from "@/types/softwareLicense.types";

const LIMIT = 10;
const SELECT_CLASS =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** FE-43 — `/app/software-licenses`: danh mục bản quyền phần mềm (gán cho máy CNTT, theo dõi hạn). */
export function SoftwareLicensesListPage() {
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [licenseType, setLicenseType] = useState<SoftwareLicenseType | "">("");
  const [expiring, setExpiring] = useState<"" | "30">("");
  const [isActive, setIsActive] = useState<"true" | "false" | "">("true");
  const [sortBy, setSortBy] = useState<"softwareName" | "expiresAt" | "createdAt">("softwareName");
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const debouncedKeyword = useDebounce(keyword);

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SoftwareLicenseListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SoftwareLicenseListItem | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<SoftwareLicenseListItem | null>(null);

  const query = useSoftwareLicenses({
    page,
    limit: LIMIT,
    keyword: debouncedKeyword || undefined,
    licenseType: licenseType || undefined,
    expiringWithinDays: expiring ? Number(expiring) : undefined,
    isActive: isActive === "" ? undefined : isActive === "true",
    sortBy,
    order,
  });
  const deleteMutation = useDeleteSoftwareLicense();
  const restoreMutation = useRestoreSoftwareLicense();
  const alertsMutation = useRunSoftwareLicenseAlerts();

  const licenses = query.data?.data ?? [];
  const pagination = query.data?.pagination;

  function handleSortChange(key: string) {
    if (key === sortBy) {
      setOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key as typeof sortBy);
      setOrder("asc");
    }
    setPage(1);
  }

  function resetFilters() {
    setKeyword("");
    setLicenseType("");
    setExpiring("");
    setIsActive("true");
    setPage(1);
  }

  const columns: DataTableColumn<SoftwareLicenseListItem>[] = [
    {
      key: "softwareName",
      header: "Phần mềm",
      sortKey: "softwareName",
      render: (row) => (
        <Link to={`/app/software-licenses/${row._id}`} className="font-medium text-primary hover:underline">
          {row.softwareName}
          {(row.edition || row.version) && (
            <span className="font-normal text-muted-foreground"> — {[row.edition, row.version].filter(Boolean).join(" ")}</span>
          )}
        </Link>
      ),
    },
    { key: "licenseType", header: "Loại", render: (row) => LICENSE_TYPE_LABELS[row.licenseType] },
    {
      key: "seats",
      header: "Đã dùng / Tổng",
      render: (row) => (
        <span className={row.freeSeats === 0 ? "font-medium text-warning" : undefined}>
          {row.usedSeats} / {row.totalSeats}
        </span>
      ),
    },
    { key: "expiresAt", header: "Hạn dùng", sortKey: "expiresAt", render: (row) => <LicenseExpiryBadge license={row} /> },
    { key: "vendor", header: "Nhà cung cấp", render: (row) => row.vendor?.name ?? "—" },
    {
      key: "isActive",
      header: "Hoạt động",
      render: (row) => (
        <StatusBadge variant={row.isActive === false ? "default" : "success"}>{row.isActive === false ? "Đã ẩn" : "Đang hoạt động"}</StatusBadge>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Bản quyền phần mềm"
        description="Theo dõi bản quyền, số máy được cài và hạn dùng; gán bản quyền cho thiết bị CNTT."
        actions={
          <div className="flex gap-2">
            <PermissionGuard permission={PERMISSIONS.SOFTWARE_LICENSE_ALERTS_TRIGGER}>
              <Button variant="secondary" size="sm" loading={alertsMutation.isPending} onClick={() => alertsMutation.mutate()}>
                <BellRing /> Kiểm tra cảnh báo hết hạn
              </Button>
            </PermissionGuard>
            <PermissionGuard permission={PERMISSIONS.SOFTWARE_LICENSE_CREATE}>
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus /> Thêm bản quyền
              </Button>
            </PermissionGuard>
          </div>
        }
      />

      <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
        <FilterBar variant="embedded" onReset={resetFilters}>
          <div className="min-w-48 space-y-1.5">
            <label htmlFor="license-search" className="text-xs font-medium text-muted-foreground">
              Tìm kiếm (tên phần mềm/số hợp đồng)
            </label>
            <input
              id="license-search"
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value);
                setPage(1);
              }}
              placeholder="Nhập tên phần mềm hoặc số hợp đồng..."
              className={SELECT_CLASS}
            />
          </div>

          <div className="min-w-36 space-y-1.5">
            <label htmlFor="license-type" className="text-xs font-medium text-muted-foreground">
              Loại
            </label>
            <select
              id="license-type"
              value={licenseType}
              onChange={(e) => {
                setLicenseType(e.target.value as SoftwareLicenseType | "");
                setPage(1);
              }}
              className={SELECT_CLASS}
            >
              <option value="">Tất cả</option>
              {SOFTWARE_LICENSE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {LICENSE_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-40 space-y-1.5">
            <label htmlFor="license-expiring" className="text-xs font-medium text-muted-foreground">
              Hạn dùng
            </label>
            <select
              id="license-expiring"
              value={expiring}
              onChange={(e) => {
                setExpiring(e.target.value as "" | "30");
                setPage(1);
              }}
              className={SELECT_CLASS}
            >
              <option value="">Tất cả</option>
              <option value="30">Hết hạn trong 30 ngày (gồm đã hết)</option>
            </select>
          </div>

          <div className="min-w-36 space-y-1.5">
            <label htmlFor="license-active" className="text-xs font-medium text-muted-foreground">
              Hiển thị
            </label>
            <select
              id="license-active"
              value={isActive}
              onChange={(e) => {
                setIsActive(e.target.value as "true" | "false" | "");
                setPage(1);
              }}
              className={SELECT_CLASS}
            >
              <option value="true">Đang hoạt động</option>
              <option value="false">Đã ẩn (đã xoá)</option>
              <option value="">Tất cả</option>
            </select>
          </div>
        </FilterBar>

        <DataTable
          className="rounded-none border-0"
          columns={columns}
          data={licenses}
          keyExtractor={(row) => row._id}
          isLoading={query.isLoading}
          isError={query.isError}
          errorMessage={query.error ? parseApiError(query.error).message : undefined}
          onRetry={() => query.refetch()}
          emptyTitle="Chưa có bản quyền nào"
          emptyMessage="Thêm bản quyền phần mềm đầu tiên để bắt đầu theo dõi."
          sortBy={sortBy}
          order={order}
          onSortChange={handleSortChange}
          rowActions={(row) =>
            row.isActive === false ? (
              <div className="flex justify-end gap-1">
                <PermissionGuard permission={PERMISSIONS.SOFTWARE_LICENSE_UPDATE}>
                  <Button variant="ghost" size="sm" aria-label="Khôi phục" onClick={() => setRestoreTarget(row)}>
                    <RotateCcw />
                  </Button>
                </PermissionGuard>
              </div>
            ) : (
              <div className="flex justify-end gap-1">
                <Button variant="ghost" size="sm" aria-label="Xem chi tiết" onClick={() => navigate(`/app/software-licenses/${row._id}`)}>
                  <Eye />
                </Button>
                <PermissionGuard permission={PERMISSIONS.SOFTWARE_LICENSE_UPDATE}>
                  <Button variant="ghost" size="sm" aria-label="Sửa" onClick={() => setEditTarget(row)}>
                    <Pencil />
                  </Button>
                </PermissionGuard>
                <PermissionGuard permission={PERMISSIONS.SOFTWARE_LICENSE_DELETE}>
                  <Button variant="ghost" size="sm" aria-label="Xoá" onClick={() => setDeleteTarget(row)}>
                    <Trash2 className="text-destructive" />
                  </Button>
                </PermissionGuard>
              </div>
            )
          }
        />
      </div>

      {pagination && (
        <Pagination page={pagination.page} limit={pagination.limit} total={pagination.total} totalPages={pagination.totalPages} onPageChange={setPage} />
      )}

      {createOpen && <SoftwareLicenseFormModal key="create" open={createOpen} onClose={() => setCreateOpen(false)} />}
      {editTarget && <SoftwareLicenseFormModal key={editTarget._id} open onClose={() => setEditTarget(null)} license={editTarget} />}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteMutation.mutate(deleteTarget._id, { onSuccess: () => setDeleteTarget(null) });
        }}
        title="Xoá bản quyền"
        message={`Ẩn "${deleteTarget?.softwareName}"? Các máy đang gán vẫn giữ nguyên; có thể khôi phục lại bằng bộ lọc "Hiển thị: Đã ẩn".`}
        danger
        isLoading={deleteMutation.isPending}
      />

      <ConfirmDialog
        open={!!restoreTarget}
        onClose={() => setRestoreTarget(null)}
        onConfirm={() => {
          if (!restoreTarget) return;
          restoreMutation.mutate(restoreTarget._id, { onSuccess: () => setRestoreTarget(null) });
        }}
        title="Khôi phục bản quyền"
        message={`Khôi phục "${restoreTarget?.softwareName}"?`}
        isLoading={restoreMutation.isPending}
      />
    </div>
  );
}

import { useState } from "react";
import { Eye, Download, ScrollText, BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { FilterBar } from "@/components/shared/FilterBar";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { Pagination } from "@/components/shared/Pagination";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { usePermission } from "@/hooks/usePermission";
import { PERMISSIONS } from "@/constants/permissions";
import { useAuditLogs } from "@/features/audit/hooks/useAuditLogs";
import { useExportAuditLogs } from "@/features/audit/hooks/useExportAuditLogs";
import { AuditActionBadge, getAuditActionLabel } from "@/features/audit/components/AuditActionBadge";
import { AuditLogDetailDrawer } from "@/features/audit/components/AuditLogDetailDrawer";
import { AuditStatsTab } from "@/features/audit/components/AuditStatsTab";
import { useUsers } from "@/features/users/hooks/useUsers";
import { useDebounce } from "@/hooks/useDebounce";
import { parseApiError } from "@/utils/parseApiError";
import { AUDIT_ACTIONS, type AuditAction, type AuditLogItem } from "@/types/audit.types";

const LIMIT = 20;

function formatPerson(person?: AuditLogItem["performedBy"]): string {
  return person ? person.username : "—";
}

/**
 * Audit Logs UI (roadmap Mục 17). 2 tab trong CÙNG 1 trang (KHÔNG route
 * riêng — khác cách RBAC Admin/Assets tách route, vì đây chỉ 1 resource
 * "audit log" nhìn ở 2 góc list/thống kê, không phải 2 resource RBAC độc
 * lập): "Nhật ký" (`GET /user-audits`, mặc định) và "Thống kê" (`GET
 * /user-audits/dashboard`, permission RIÊNG `AUDIT_VIEW_DASHBOARD` — không
 * phải ai có `AUDIT_VIEW` cũng có, vd role `IT`, xem `rolePermission.map.ts`
 * — tự ẩn tab qua `PermissionGuard` nếu thiếu).
 */
export function AuditLogsPage() {
  const { hasPermission } = usePermission();
  const canBrowseUsers = hasPermission(PERMISSIONS.USER_VIEW);

  const [page, setPage] = useState(1);
  const [action, setAction] = useState<AuditAction | "">("");
  const [performedBy, setPerformedBy] = useState("");
  const [targetUser, setTargetUser] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const debouncedFromDate = useDebounce(fromDate);
  const debouncedToDate = useDebounce(toDate);

  const [detailLog, setDetailLog] = useState<AuditLogItem | null>(null);

  function resetFilters() {
    setAction("");
    setPerformedBy("");
    setTargetUser("");
    setFromDate("");
    setToDate("");
    setPage(1);
  }

  const usersQuery = useUsers({ limit: 100 }, { enabled: canBrowseUsers });
  const query = useAuditLogs({
    page,
    limit: LIMIT,
    action: action || undefined,
    performedBy: performedBy || undefined,
    user: targetUser || undefined,
    fromDate: debouncedFromDate || undefined,
    toDate: debouncedToDate || undefined,
  });
  const exportMutation = useExportAuditLogs();

  const logs = query.data?.data ?? [];
  const pagination = query.data?.pagination;

  const exportParams = {
    action: action || undefined,
    performedBy: performedBy || undefined,
    user: targetUser || undefined,
    fromDate: debouncedFromDate || undefined,
    toDate: debouncedToDate || undefined,
  };

  const columns: DataTableColumn<AuditLogItem>[] = [
    {
      key: "createdAt",
      header: "Thời gian",
      className: "whitespace-nowrap",
      render: (row) => new Date(row.createdAt).toLocaleString("vi-VN"),
    },
    { key: "action", header: "Hành động", render: (row) => <AuditActionBadge action={row.action} /> },
    { key: "performedBy", header: "Người thực hiện", render: (row) => formatPerson(row.performedBy) },
    { key: "user", header: "Đối tượng tác động", render: (row) => formatPerson(row.user) },
    {
      key: "note",
      header: "Ghi chú",
      className: "max-w-72 truncate",
      render: (row) => (
        <span className="block truncate" title={row.note}>
          {row.note || "—"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Nhật ký audit"
        description="Lịch sử thao tác trên hệ thống — đăng nhập, tạo/sửa/xoá, gán quyền..."
        actions={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => exportMutation.mutate({ ...exportParams, format: "xlsx" })}
              loading={exportMutation.isPending && exportMutation.variables?.format === "xlsx"}
              disabled={exportMutation.isPending}
            >
              <Download /> Xuất Excel
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => exportMutation.mutate({ ...exportParams, format: "csv" })}
              loading={exportMutation.isPending && exportMutation.variables?.format === "csv"}
              disabled={exportMutation.isPending}
            >
              <Download /> Xuất CSV
            </Button>
          </div>
        }
      />

      <Tabs defaultValue="logs">
        <TabsList>
          <TabsTrigger value="logs">
            <ScrollText className="size-4" aria-hidden="true" />
            Nhật ký
          </TabsTrigger>
          <PermissionGuard permission={PERMISSIONS.AUDIT_VIEW_DASHBOARD}>
            <TabsTrigger value="stats">
              <BarChart3 className="size-4" aria-hidden="true" />
              Thống kê
            </TabsTrigger>
          </PermissionGuard>
        </TabsList>

        <TabsContent value="logs" className="space-y-4">
          <FilterBar onReset={resetFilters}>
            <div className="min-w-40 space-y-1.5">
              <label htmlFor="audit-from" className="text-xs font-medium text-muted-foreground">
                Từ ngày
              </label>
              <input
                id="audit-from"
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div className="min-w-40 space-y-1.5">
              <label htmlFor="audit-to" className="text-xs font-medium text-muted-foreground">
                Đến ngày
              </label>
              <input
                id="audit-to"
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div className="min-w-44 space-y-1.5">
              <label htmlFor="audit-action" className="text-xs font-medium text-muted-foreground">
                Hành động
              </label>
              <select
                id="audit-action"
                value={action}
                onChange={(e) => {
                  setAction(e.target.value as AuditAction | "");
                  setPage(1);
                }}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Tất cả</option>
                {AUDIT_ACTIONS.map((a) => (
                  <option key={a} value={a}>
                    {getAuditActionLabel(a)}
                  </option>
                ))}
              </select>
            </div>

            {canBrowseUsers && (
              <>
                <div className="min-w-44 space-y-1.5">
                  <label htmlFor="audit-performedBy" className="text-xs font-medium text-muted-foreground">
                    Người thực hiện
                  </label>
                  <select
                    id="audit-performedBy"
                    value={performedBy}
                    onChange={(e) => {
                      setPerformedBy(e.target.value);
                      setPage(1);
                    }}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Tất cả</option>
                    {usersQuery.data?.data.map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.fullName} ({u.username})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="min-w-44 space-y-1.5">
                  <label htmlFor="audit-user" className="text-xs font-medium text-muted-foreground">
                    Đối tượng tác động
                  </label>
                  <select
                    id="audit-user"
                    value={targetUser}
                    onChange={(e) => {
                      setTargetUser(e.target.value);
                      setPage(1);
                    }}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Tất cả</option>
                    {usersQuery.data?.data.map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.fullName} ({u.username})
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </FilterBar>

          <DataTable
            columns={columns}
            data={logs}
            keyExtractor={(row) => row._id}
            isLoading={query.isLoading}
            isError={query.isError}
            errorMessage={query.error ? parseApiError(query.error).message : undefined}
            onRetry={() => query.refetch()}
            emptyTitle="Chưa có audit log nào"
            emptyMessage="Không có bản ghi nào khớp bộ lọc hiện tại."
            rowActions={(row) => (
              <Button variant="ghost" size="sm" aria-label="Xem chi tiết" onClick={() => setDetailLog(row)}>
                <Eye />
              </Button>
            )}
          />

          {pagination && (
            <Pagination page={pagination.page} limit={pagination.limit} total={pagination.total} totalPages={pagination.totalPages} onPageChange={setPage} />
          )}
        </TabsContent>

        <PermissionGuard permission={PERMISSIONS.AUDIT_VIEW_DASHBOARD}>
          <TabsContent value="stats">
            <AuditStatsTab />
          </TabsContent>
        </PermissionGuard>
      </Tabs>

      <AuditLogDetailDrawer open={!!detailLog} onClose={() => setDetailLog(null)} log={detailLog} />
    </div>
  );
}

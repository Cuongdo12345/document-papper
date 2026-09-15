import { FileText, ClipboardList, FileBarChart, Building2, Users, Landmark } from "lucide-react";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { DashboardSummaryLayout } from "@/features/dashboard/components/DashboardSummaryLayout";
import { useAdminDashboardSummary } from "@/features/dashboard/hooks/useAdminDashboardSummary";
import { parseApiError } from "@/utils/parseApiError";
import type { DepartmentDocumentCount } from "@/types/dashboard.types";

const departmentColumns: DataTableColumn<DepartmentDocumentCount>[] = [
  { key: "departmentName", header: "Khoa/Phòng", className: "max-w-72 truncate" },
  { key: "count", header: "Số tài liệu", className: "text-right" },
];

/** FE-09 — `GET /dashboard/admin-summary`, CHỈ render cho ADMIN (caller tự gate `enabled`/hiển thị). */
export function AdminSummarySection({ enabled }: { enabled: boolean }) {
  const query = useAdminDashboardSummary(enabled);

  if (!enabled) return null;
  if (query.isLoading) return <LoadingState label="Đang tải tổng quan hệ thống..." />;
  if (query.isError || !query.data) {
    return <ErrorState message={query.error ? parseApiError(query.error).message : undefined} onRetry={() => query.refetch()} />;
  }

  const d = query.data;

  return (
    <DashboardSummaryLayout
      kpiCards={[
        { label: "Tổng tài liệu", value: d.totalDocuments, icon: FileText, tone: "primary" },
        { label: "Đề xuất", value: d.totalProposals, icon: ClipboardList, tone: "info" },
        { label: "Báo cáo", value: d.totalReports, icon: FileBarChart, tone: "success" },
        { label: "Khoa/Phòng", value: d.totalDepartments, icon: Building2, tone: "default" },
        { label: "Người dùng", value: d.totalUsers, icon: Users, tone: "default" },
      ]}
      proposalsByMonth={d.proposalsByMonth}
      reportsByMonth={d.reportsByMonth}
      recentDocuments={d.recentDocuments}
      extra={
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <Landmark className="size-4 text-muted-foreground" aria-hidden="true" />
            Tài liệu theo khoa/phòng
          </h3>
          <DataTable columns={departmentColumns} data={d.documentsByDepartment} keyExtractor={(row) => row.departmentId} emptyTitle="Chưa có dữ liệu" />
        </div>
      }
    />
  );
}

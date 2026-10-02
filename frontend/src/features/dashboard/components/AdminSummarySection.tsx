import { FileText, ClipboardList, FileBarChart, Building2, Users, Landmark } from "lucide-react";
import { ErrorState } from "@/components/shared/ErrorState";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { DashboardSummaryLayout } from "@/features/dashboard/components/DashboardSummaryLayout";
import { SummarySkeleton } from "@/features/dashboard/components/DashboardSkeleton";
import { useAdminDashboardSummary } from "@/features/dashboard/hooks/useAdminDashboardSummary";
import { usePermission } from "@/hooks/usePermission";
import { PERMISSIONS } from "@/constants/permissions";
import { parseApiError } from "@/utils/parseApiError";
import type { DepartmentDocumentCount } from "@/types/dashboard.types";

const departmentColumns: DataTableColumn<DepartmentDocumentCount>[] = [
  { key: "departmentName", header: "Khoa/Phòng", className: "max-w-72 truncate" },
  { key: "count", header: "Số tài liệu", className: "text-right" },
];

/** FE-09 — `GET /dashboard/admin-summary`, CHỈ render cho ADMIN (caller tự gate `enabled`/hiển thị). */
export function AdminSummarySection({ enabled }: { enabled: boolean }) {
  const query = useAdminDashboardSummary(enabled);
  const { hasPermission } = usePermission();

  if (!enabled) return null;
  if (query.isLoading) return <SummarySkeleton label="Đang tải tổng quan hệ thống..." />;
  if (query.isError || !query.data) {
    return <ErrorState message={query.error ? parseApiError(query.error).message : undefined} onRetry={() => query.refetch()} />;
  }

  const d = query.data;
  // [FE-37] Thẻ KPI bấm được → danh sách tương ứng; chỉ gắn link khi user mở được
  // trang đích (cùng permission `ProtectedRoute` của route đó ở `routes/index.tsx`).
  // Số trên thẻ khớp danh sách: cả 2 đều chỉ tính bản ghi đang hoạt động.
  const docLink = (category?: "PROPOSAL" | "REPORT") =>
    hasPermission(PERMISSIONS.DOCUMENT_VIEW) ? `/app/documents${category ? `?category=${category}` : ""}` : undefined;

  return (
    <DashboardSummaryLayout
      // FE-18 (UI_DESIGN_SYSTEM.md Mục 4) — "Tổng tài liệu" (index 0) là KPI
      // CHÍNH (`DashboardSummaryLayout` tự render `size="display"`, KHÔNG
      // cần khai báo gì thêm ở đây). 4 KPI phụ còn lại chia 2 nhóm dữ liệu
      // THẬT: "documents" (Đề xuất/Báo cáo — đều là PHÂN LOẠI của Document)
      // và "org" (Khoa/Phòng/Người dùng — số liệu TỔ CHỨC, khác bản chất) —
      // `group` đổi giá trị tự chèn divider đúng ranh giới này.
      kpiCards={[
        { label: "Tổng tài liệu", value: d.totalDocuments, icon: FileText, tone: "primary", to: docLink() },
        { label: "Đề xuất", value: d.totalProposals, icon: ClipboardList, tone: "info", group: "documents", to: docLink("PROPOSAL") },
        { label: "Báo cáo", value: d.totalReports, icon: FileBarChart, tone: "success", group: "documents", to: docLink("REPORT") },
        {
          label: "Khoa/Phòng",
          value: d.totalDepartments,
          icon: Building2,
          tone: "default",
          group: "org",
          to: hasPermission(PERMISSIONS.DEPARTMENT_VIEW) ? "/app/departments" : undefined,
        },
        {
          label: "Người dùng",
          value: d.totalUsers,
          icon: Users,
          tone: "default",
          group: "org",
          to: hasPermission(PERMISSIONS.USER_VIEW) ? "/app/users" : undefined,
        },
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

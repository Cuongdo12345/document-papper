import { FileText, ClipboardList, FileBarChart, Users } from "lucide-react";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { DashboardSummaryLayout } from "@/features/dashboard/components/DashboardSummaryLayout";
import { SummarySkeleton } from "@/features/dashboard/components/DashboardSkeleton";
import { useDepartmentDashboard } from "@/features/dashboard/hooks/useDepartmentDashboard";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { usePermission } from "@/hooks/usePermission";
import { PERMISSIONS } from "@/constants/permissions";
import { parseApiError } from "@/utils/parseApiError";

interface DepartmentSummarySectionProps {
  departmentId: string | undefined;
  /** Hiển thị khi `departmentId` rỗng (VD user hiện tại chưa được gán khoa/phòng nào). */
  emptyMessage?: string;
}

/** FE-09 — `GET /dashboard/department/:departmentId`. */
export function DepartmentSummarySection({ departmentId, emptyMessage }: DepartmentSummarySectionProps) {
  const query = useDepartmentDashboard(departmentId);
  const isAdmin = useIsAdmin();
  const { hasPermission } = usePermission();

  if (!departmentId) {
    return <EmptyState title="Chưa có khoa/phòng" message={emptyMessage ?? "Tài khoản của bạn chưa được gán khoa/phòng nào."} />;
  }
  if (query.isLoading) return <SummarySkeleton label="Đang tải tổng quan khoa/phòng..." />;
  if (query.isError || !query.data) {
    return <ErrorState message={query.error ? parseApiError(query.error).message : undefined} onRetry={() => query.refetch()} />;
  }

  const d = query.data;

  // [FE-37] Thẻ KPI tài liệu → trang Tài liệu lọc sẵn. Chỉ người xem được mọi khoa
  // (ADMIN / `DOCUMENT_VIEW_ALL_DEPARTMENTS`) mới cần `department` trên URL — với
  // người còn lại backend đã tự ép đúng khoa của họ, và họ không có ô lọc khoa.
  const canViewAllDepartments = isAdmin || hasPermission(PERMISSIONS.DOCUMENT_VIEW_ALL_DEPARTMENTS);
  const docLink = (category?: "PROPOSAL" | "REPORT") => {
    if (!hasPermission(PERMISSIONS.DOCUMENT_VIEW)) return undefined;
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (canViewAllDepartments) params.set("department", departmentId);
    const qs = params.toString();
    return `/app/documents${qs ? `?${qs}` : ""}`;
  };

  return (
    <DashboardSummaryLayout
      // FE-18 (UI_DESIGN_SYSTEM.md Mục 4) — "Tổng tài liệu" (index 0) là KPI
      // chính, mirror ĐÚNG cách nhóm ở `AdminSummarySection.tsx` (xem comment
      // ở đó): "documents" (Đề xuất/Báo cáo) tách khỏi "org" (Người dùng).
      // "Người dùng" CỐ TÌNH không có link: trang Người dùng chưa lọc được theo
      // khoa/phòng nên con số trên thẻ sẽ không khớp danh sách mở ra.
      kpiCards={[
        { label: "Tổng tài liệu", value: d.totalDocuments, icon: FileText, tone: "primary", to: docLink() },
        { label: "Đề xuất", value: d.totalProposals, icon: ClipboardList, tone: "info", group: "documents", to: docLink("PROPOSAL") },
        { label: "Báo cáo", value: d.totalReports, icon: FileBarChart, tone: "success", group: "documents", to: docLink("REPORT") },
        { label: "Người dùng", value: d.totalUsers, icon: Users, tone: "default", group: "org" },
      ]}
      proposalsByMonth={d.proposalsByMonth}
      reportsByMonth={d.reportsByMonth}
      recentDocuments={d.recentDocuments}
    />
  );
}

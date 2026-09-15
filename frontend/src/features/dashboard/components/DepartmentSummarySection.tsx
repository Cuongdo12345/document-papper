import { FileText, ClipboardList, FileBarChart, Users } from "lucide-react";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { DashboardSummaryLayout } from "@/features/dashboard/components/DashboardSummaryLayout";
import { useDepartmentDashboard } from "@/features/dashboard/hooks/useDepartmentDashboard";
import { parseApiError } from "@/utils/parseApiError";

interface DepartmentSummarySectionProps {
  departmentId: string | undefined;
  /** Hiển thị khi `departmentId` rỗng (VD user hiện tại chưa được gán khoa/phòng nào). */
  emptyMessage?: string;
}

/** FE-09 — `GET /dashboard/department/:departmentId`. */
export function DepartmentSummarySection({ departmentId, emptyMessage }: DepartmentSummarySectionProps) {
  const query = useDepartmentDashboard(departmentId);

  if (!departmentId) {
    return <EmptyState title="Chưa có khoa/phòng" message={emptyMessage ?? "Tài khoản của bạn chưa được gán khoa/phòng nào."} />;
  }
  if (query.isLoading) return <LoadingState label="Đang tải tổng quan khoa/phòng..." />;
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
        { label: "Người dùng", value: d.totalUsers, icon: Users, tone: "default" },
      ]}
      proposalsByMonth={d.proposalsByMonth}
      reportsByMonth={d.reportsByMonth}
      recentDocuments={d.recentDocuments}
    />
  );
}

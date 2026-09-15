import {
  LayoutDashboard,
  Boxes,
  Stethoscope,
  TrendingUp,
  AlertTriangle,
  ShieldAlert,
  Wrench,
  CalendarClock,
  PieChart,
  BarChart3,
  Trophy,
  CalendarRange,
  Timer,
} from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { usePermission } from "@/hooks/usePermission";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { LoadingState } from "@/components/shared/LoadingState";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PERMISSIONS } from "@/constants/permissions";
import { AdminSummarySection } from "@/features/dashboard/components/AdminSummarySection";
import { DepartmentSummarySection } from "@/features/dashboard/components/DepartmentSummarySection";
import { DepartmentDrilldownSection } from "@/features/dashboard/components/DepartmentDrilldownSection";
import { AssetSummaryWidget } from "@/features/dashboard/components/AssetSummaryWidget";
import { MedicalDeviceSummaryWidget } from "@/features/dashboard/components/MedicalDeviceSummaryWidget";
import { ProposalConversionWidget } from "@/features/dashboard/components/ProposalConversionWidget";
import { DeviceDamageTrendWidget } from "@/features/dashboard/components/DeviceDamageTrendWidget";
import { TopDamagedDevicesWidget, TopDamagedInkWidget } from "@/features/dashboard/components/TopDamagedWidget";
import { DeviceStatsByMonthWidget } from "@/features/dashboard/components/DeviceStatsByMonthWidget";
import { WarrantyExpiringWidget } from "@/features/dashboard/components/WarrantyExpiringWidget";
import { MaintenanceOverdueWidget } from "@/features/dashboard/components/MaintenanceOverdueWidget";
import { CalibrationDueWidget } from "@/features/dashboard/components/CalibrationDueWidget";
import { WorkflowOverdueApprovalsWidget } from "@/features/dashboard/components/WorkflowOverdueApprovalsWidget";

const SECTION_CLASS = "space-y-3 rounded-lg border border-border bg-card p-4";

/**
 * FE-09 (nâng cấp UI, 2026-09-08) — theo yêu cầu user: chuyển layout xếp
 * chồng dài sang TABS, MỖI TAB tương ứng 1 NHÓM endpoint dashboard (khớp
 * đúng cách file `dashboard.types.ts` đã phân 3 nhóm response shape +
 * domain nghiệp vụ):
 *   - "Tổng quan": admin-summary / department/:id
 *   - "Tài sản": assets/summary
 *   - "Thiết bị y tế": medical-devices/summary
 *   - "Xu hướng & Thống kê": kpi/proposal-conversion, kpi/device-damage-trend,
 *     kpi/top-damaged-*, device-stats
 *   - "Cảnh báo": assets/warranty-expiring, assets/maintenance-overdue,
 *     medical-devices/calibration-due
 * Radix `Tabs.Content` KHÔNG mount nội dung tab chưa active (trừ khi
 * `forceMount`) — mỗi tab CHỈ gọi API của chính nó khi user thật sự bấm vào,
 * không bắn cả 12 request cùng lúc như bản cũ (lợi ích phụ, không phải mục
 * tiêu chính của yêu cầu).
 */
export function DashboardPage() {
  const { data: user, isLoading } = useCurrentUser();
  const { hasPermission } = usePermission();
  const isAdmin = useIsAdmin();
  const canViewDashboard = hasPermission(PERMISSIONS.DASHBOARD_READ);
  // MỚI (DEV-043, 2026-09-12 — user xác nhận sau khi báo lỗi Dashboard IT
  // toàn số 0): permission `DOCUMENT_VIEW_ALL_DEPARTMENTS` (DEV-040, IT đã
  // được gán) giờ CŨNG mở nút "Xem theo khoa/phòng khác" — trước đây CHỈ
  // ADMIN thấy (xem comment cũ ở `DepartmentDrilldownSection.tsx`). Dùng
  // permission thay vì hardcode role "IT" — nhất quán với cách DEV-040/041
  // đã làm, tự động áp dụng cho role khác nếu sau này được gán permission
  // này. KHÔNG đổi gì ở "Tổng quan" mặc định (vẫn đúng khoa của người gọi)
  // hay "Tổng quan hệ thống" (vẫn CHỈ ADMIN — chặn cứng phía backend,
  // KHÔNG đụng tới, xem DEV-043.md lựa chọn #3 KHÔNG được chọn).
  const canDrilldownOtherDepartments = isAdmin || hasPermission(PERMISSIONS.DOCUMENT_VIEW_ALL_DEPARTMENTS);

  if (isLoading) return <LoadingState label="Đang tải thông tin tài khoản..." />;

  if (!canViewDashboard) {
    return (
      <div className="space-y-6">
        <PageHeader title={`Chào mừng, ${user?.fullName ?? ""}`} description="Tổng quan hệ thống quản lý tài liệu." />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Tài khoản</p>
            <p className="mt-1 text-sm font-medium">{user?.username}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Vai trò</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <StatusBadge variant="primary">{user?.role?.name}</StatusBadge>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Khoa/Phòng</p>
            <p className="mt-1 text-sm font-medium">{user?.department?.name ?? "—"}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Tổng quan hệ thống" description="Số liệu cập nhật theo thời gian thực (cache 30 giây)." />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">
            <LayoutDashboard className="size-4" aria-hidden="true" />
            Tổng quan
          </TabsTrigger>
          <TabsTrigger value="assets">
            <Boxes className="size-4" aria-hidden="true" />
            Tài sản
          </TabsTrigger>
          <TabsTrigger value="medical-devices">
            <Stethoscope className="size-4" aria-hidden="true" />
            Thiết bị y tế
          </TabsTrigger>
          <TabsTrigger value="trends">
            <TrendingUp className="size-4" aria-hidden="true" />
            Xu hướng & Thống kê
          </TabsTrigger>
          <TabsTrigger value="alerts">
            <AlertTriangle className="size-4" aria-hidden="true" />
            Cảnh báo
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/*
            MỚI (DEV-043, 2026-09-12 — user xác nhận sau khi xem thật: số liệu
            khoa CNTT của IT luôn 0 vì khoa này thật sự không tạo đề xuất/báo
            cáo — đúng dữ liệu nhưng KHÔNG hữu ích để hiện mặc định). Với
            user CÓ `canDrilldownOtherDepartments` nhưng KHÔNG phải ADMIN
            (hiện tại: IT) — ẨN block "Tổng quan" mặc định theo khoa CỦA
            CHÍNH họ (thường rỗng/không đại diện), CHỈ hiện phần chọn khoa/
            phòng bên dưới (đã liệt kê đủ MỌI khoa, kể cả khoa của chính họ
            nếu muốn xem lại). Non-admin KHÔNG có quyền này (đa số role
            khác) vẫn giữ nguyên hành vi cũ — luôn thấy đúng khoa mình, vì
            đó là toàn bộ những gì họ được xem.
          */}
          {isAdmin ? (
            <AdminSummarySection enabled />
          ) : (
            !canDrilldownOtherDepartments && <DepartmentSummarySection departmentId={user?.department?._id} />
          )}

          {canDrilldownOtherDepartments && (
            <div className={SECTION_CLASS}>
              <h2 className="text-sm font-semibold text-foreground">Xem theo khoa/phòng khác</h2>
              <DepartmentDrilldownSection />
            </div>
          )}
        </TabsContent>

        <TabsContent value="assets">
          <div className={SECTION_CLASS}>
            <AssetSummaryWidget />
          </div>
        </TabsContent>

        <TabsContent value="medical-devices">
          <div className={SECTION_CLASS}>
            <MedicalDeviceSummaryWidget />
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <div className={SECTION_CLASS}>
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <PieChart className="size-4 text-muted-foreground" aria-hidden="true" />
              Tỷ lệ chuyển đổi Đề xuất → Báo cáo theo khoa/phòng
            </h2>
            <ProposalConversionWidget />
          </div>

          <div className={SECTION_CLASS}>
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <BarChart3 className="size-4 text-muted-foreground" aria-hidden="true" />
              Xu hướng báo cáo hư hỏng theo tháng
            </h2>
            <DeviceDamageTrendWidget />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className={SECTION_CLASS}>
              <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <Trophy className="size-4 text-muted-foreground" aria-hidden="true" />
                Top thiết bị hỏng nhiều nhất
              </h2>
              <TopDamagedDevicesWidget />
            </div>
            <div className={SECTION_CLASS}>
              <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <Trophy className="size-4 text-muted-foreground" aria-hidden="true" />
                Top mực hỏng nhiều nhất
              </h2>
              <TopDamagedInkWidget />
            </div>
          </div>

          <div className={SECTION_CLASS}>
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <CalendarRange className="size-4 text-muted-foreground" aria-hidden="true" />
              Thống kê vật tư/thiết bị theo tháng
            </h2>
            <DeviceStatsByMonthWidget />
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <div className={SECTION_CLASS}>
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <ShieldAlert className="size-4 text-warning" aria-hidden="true" />
              Tài sản sắp hết hạn bảo hành
            </h2>
            <WarrantyExpiringWidget />
          </div>

          <div className={SECTION_CLASS}>
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <Wrench className="size-4 text-warning" aria-hidden="true" />
              Tài sản bảo trì quá hạn
            </h2>
            <MaintenanceOverdueWidget />
          </div>

          <div className={SECTION_CLASS}>
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <CalendarClock className="size-4 text-warning" aria-hidden="true" />
              Thiết bị y tế sắp/quá hạn kiểm định
            </h2>
            <CalibrationDueWidget />
          </div>

          {/* Roadmap B1 (SLA & nhắc việc Workflow, 2026-09-15) */}
          <div className={SECTION_CLASS}>
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <Timer className="size-4 text-warning" aria-hidden="true" />
              Đề xuất trễ hạn duyệt
            </h2>
            <WorkflowOverdueApprovalsWidget />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

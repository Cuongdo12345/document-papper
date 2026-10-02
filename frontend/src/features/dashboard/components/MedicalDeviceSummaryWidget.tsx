import { useState } from "react";
import { Stethoscope, ShieldCheck, AlertTriangle, PieChart } from "lucide-react";
import { ErrorState } from "@/components/shared/ErrorState";
import { KpiWidgetSkeleton } from "@/features/dashboard/components/DashboardSkeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { KpiCard } from "@/features/dashboard/components/KpiCard";
import { DEVICE_CLASS_CONFIG } from "@/features/dashboard/constants/medicalDeviceClass.constants";
import { MedicalDevicesByClassModal } from "@/features/dashboard/components/MedicalDevicesByClassModal";
import { useMedicalDeviceDashboardSummary } from "@/features/dashboard/hooks/useMedicalDeviceDashboardSummary";
import { parseApiError } from "@/utils/parseApiError";
import type { MedicalDeviceClass } from "@/types/medicalDevice.types";

/** dataviz skill: status color (good/warning/critical) PHẢI đi kèm icon+label, không dùng màu đơn độc — KpiCard đã tự kèm label, tone ở đây chỉ hỗ trợ thêm. */
function complianceTone(rate: number | null): "success" | "warning" | "destructive" | "default" {
  if (rate == null) return "default";
  if (rate >= 0.9) return "success";
  if (rate >= 0.5) return "warning";
  return "destructive";
}

/** FE-09 — `GET /dashboard/medical-devices/summary`. */
export function MedicalDeviceSummaryWidget() {
  const query = useMedicalDeviceDashboardSummary();
  // [MỚI DEV-084] User yêu cầu: bấm ô Loại B/C/D → xem danh sách thiết bị
  // tương ứng. Không có trang "Danh sách thiết bị y tế" sẵn có để điều
  // hướng tới (khác Asset ở DEV-083) — đã hỏi user, chọn hướng Modal.
  const [openClass, setOpenClass] = useState<MedicalDeviceClass | undefined>(undefined);

  if (query.isLoading) return <KpiWidgetSkeleton label="Đang tải thống kê thiết bị y tế..." cards={4} />;
  if (query.isError || !query.data) {
    return <ErrorState message={query.error ? parseApiError(query.error).message : undefined} onRetry={() => query.refetch()} />;
  }

  const d = query.data;
  const c = d.calibrationCompliance;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Chưa có trang danh sách thiết bị y tế riêng (xem DEV-084) nên 3 thẻ này không gắn link. */}
        <KpiCard label="Tổng thiết bị" value={d.totalProfiles} icon={Stethoscope} tone="primary" countUp />
        <KpiCard label="Cần kiểm định" value={c.totalRequiresCalibration} icon={PieChart} tone="default" countUp />
        <KpiCard label="Đã quá hạn" value={c.overdue} icon={AlertTriangle} tone={c.overdue > 0 ? "destructive" : "default"} countUp />
        <KpiCard
          label="Tỷ lệ đúng hạn"
          value={c.complianceRate == null ? "—" : `${(c.complianceRate * 100).toFixed(1)}%`}
          icon={ShieldCheck}
          tone={complianceTone(c.complianceRate)}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {d.byClass.map((cls) => {
          const config = DEVICE_CLASS_CONFIG[cls.deviceClass];
          return (
            <button
              key={cls.deviceClass}
              type="button"
              onClick={() => setOpenClass(cls.deviceClass)}
              aria-label={`Xem ${cls.count} thiết bị y tế ${config.label}`}
              className="flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-sm transition-colors hover:border-primary/40 hover:bg-accent"
            >
              <StatusBadge variant={config.variant}>{config.label}</StatusBadge>
              <span className="font-medium text-foreground">{cls.count}</span>
            </button>
          );
        })}
      </div>

      <MedicalDevicesByClassModal open={!!openClass} onClose={() => setOpenClass(undefined)} deviceClass={openClass} />
    </div>
  );
}

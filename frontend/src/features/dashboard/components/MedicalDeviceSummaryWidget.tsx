import { Stethoscope, ShieldCheck, AlertTriangle, PieChart } from "lucide-react";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { KpiCard } from "@/features/dashboard/components/KpiCard";
import { useMedicalDeviceDashboardSummary } from "@/features/dashboard/hooks/useMedicalDeviceDashboardSummary";
import { parseApiError } from "@/utils/parseApiError";
import type { MedicalDeviceClass } from "@/types/medicalDevice.types";

/** 4 giá trị cố định (`MEDICAL_DEVICE_CLASSES`) — không import label map riêng từ `MedicalDeviceProfileModal.tsx` (không export) cho widget gọn này. */
const DEVICE_CLASS_LABEL: Record<MedicalDeviceClass, string> = { A: "Loại A", B: "Loại B", C: "Loại C", D: "Loại D" };

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

  if (query.isLoading) return <LoadingState label="Đang tải thống kê thiết bị y tế..." />;
  if (query.isError || !query.data) {
    return <ErrorState message={query.error ? parseApiError(query.error).message : undefined} onRetry={() => query.refetch()} />;
  }

  const d = query.data;
  const c = d.calibrationCompliance;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Tổng thiết bị" value={d.totalProfiles} icon={Stethoscope} tone="primary" />
        <KpiCard label="Cần kiểm định" value={c.totalRequiresCalibration} icon={PieChart} tone="default" />
        <KpiCard label="Đã quá hạn" value={c.overdue} icon={AlertTriangle} tone={c.overdue > 0 ? "destructive" : "default"} />
        <KpiCard
          label="Tỷ lệ đúng hạn"
          value={c.complianceRate == null ? "—" : `${(c.complianceRate * 100).toFixed(1)}%`}
          icon={ShieldCheck}
          tone={complianceTone(c.complianceRate)}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {d.byClass.map((cls) => (
          <div key={cls.deviceClass} className="flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-sm">
            <StatusBadge variant="default">{DEVICE_CLASS_LABEL[cls.deviceClass]}</StatusBadge>
            <span className="font-medium text-foreground">{cls.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

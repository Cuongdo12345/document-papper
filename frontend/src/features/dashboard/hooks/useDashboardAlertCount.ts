import { useAssetWarrantyExpiring } from "@/features/dashboard/hooks/useAssetWarrantyExpiring";
import { useAssetMaintenanceOverdue } from "@/features/dashboard/hooks/useAssetMaintenanceOverdue";
import { useMedicalDeviceCalibrationDue } from "@/features/dashboard/hooks/useMedicalDeviceCalibrationDue";
import { useWorkflowOverdueApprovals } from "@/features/dashboard/hooks/useWorkflowOverdueApprovals";

const FIRST_PAGE = { page: 1, limit: 10 };

/**
 * [FE-37] Tổng số mục ở tab "Cảnh báo" (hiện thành số trên tab). Gọi ĐÚNG 4 hook +
 * ĐÚNG tham số mặc định mà 4 widget trong tab dùng lúc mở (30/7/30 ngày, trang 1,
 * 10 dòng) → trùng query key, bấm vào tab là có dữ liệu sẵn, không gọi API lần 2.
 * Cái giá (user đã đồng ý): 4 request này chạy ngay khi mở Dashboard thay vì chỉ
 * khi bấm tab. API nào lỗi thì bỏ qua phần đó (widget trong tab vẫn tự báo lỗi).
 */
export function useDashboardAlertCount(): number | undefined {
  const queries = [
    useAssetWarrantyExpiring(30, FIRST_PAGE),
    useAssetMaintenanceOverdue(7, FIRST_PAGE),
    useMedicalDeviceCalibrationDue(30, FIRST_PAGE),
    useWorkflowOverdueApprovals(FIRST_PAGE),
  ];

  if (queries.some((q) => q.isLoading)) return undefined;
  return queries.reduce((sum, q) => sum + (q.data?.pagination?.total ?? 0), 0);
}

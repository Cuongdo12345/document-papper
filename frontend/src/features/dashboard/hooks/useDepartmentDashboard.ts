import { useQuery } from "@tanstack/react-query";
import { getDepartmentDashboard } from "@/api/dashboard.api";
import { unwrapResponse } from "@/utils/unwrapResponse";
import type { DepartmentDashboardSummary } from "@/types/dashboard.types";

/**
 * `GET /dashboard/department/:departmentId` — route CHỈ yêu cầu
 * `DASHBOARD_READ`, KHÔNG kiểm tra `departmentId` có khớp khoa của người gọi
 * hay không (đọc trực tiếp `getDepartmentDashboard` controller — không có
 * check nào ngoài permission). Ghi nhận đây là khoảng trống ABAC tiềm ẩn
 * (bất kỳ user có `DASHBOARD_READ` đều xem được dashboard CỦA KHOA BẤT KỲ
 * qua URL) — NGOÀI SCOPE FE-09 (không tự sửa backend), FE chỉ mặc định hiển
 * thị khoa CỦA CHÍNH user (không chủ động mời user duyệt khoa khác), riêng
 * ADMIN có thêm dropdown chọn khoa (đằng nào cũng bypass mọi permission).
 */
export function useDepartmentDashboard(departmentId: string | undefined) {
  return useQuery({
    queryKey: ["dashboard", "department", departmentId] as const,
    queryFn: async () => {
      const response = await getDepartmentDashboard(departmentId!);
      return unwrapResponse<DepartmentDashboardSummary>(response).data;
    },
    enabled: !!departmentId,
    staleTime: 20_000,
  });
}

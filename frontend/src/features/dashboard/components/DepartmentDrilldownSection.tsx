import { useState } from "react";
import { useDepartments } from "@/features/departments/hooks/useDepartments";
import { DepartmentSummarySection } from "@/features/dashboard/components/DepartmentSummarySection";

/**
 * FE-09 — widget thêm dropdown chọn khoa/phòng BẤT KỲ để xem
 * `GET /dashboard/department/:id`.
 *
 * ⚠️ CẬP NHẬT (DEV-043, 2026-09-12): TRƯỚC ĐÂY chỉ ADMIN thấy widget này —
 * lý do gốc là ADMIN đằng nào cũng bypass mọi permission/ABAC nên không mở
 * rộng quyền truy cập thật nào. Giờ user có permission
 * `DOCUMENT_VIEW_ALL_DEPARTMENTS` (DEV-040, hiện IT) CŨNG thấy — điều kiện
 * hiển thị ở `DashboardPage.tsx` (`canDrilldownOtherDepartments`). Vẫn AN
 * TOÀN theo đúng lý do gốc: `GET /dashboard/department/:id`
 * (`dashboard.controller.ts`/`dashboard.service.ts`) từ trước tới nay
 * KHÔNG hề giới hạn `departmentId` theo khoa người gọi — bất kỳ role nào
 * có `DASHBOARD_READ` ĐÃ CÓ THỂ gọi thẳng API này cho khoa bất kỳ (chỉ UI
 * từng ẩn nút chọn) — mở nút cho IT không tạo ra quyền truy cập MỚI ở tầng
 * API, chỉ đưa 1 khả năng vốn đã tồn tại lên UI cho đúng nhóm user cần.
 * Role khác (non-admin, không có `DOCUMENT_VIEW_ALL_DEPARTMENTS`) vẫn chỉ
 * thấy khoa CỦA CHÍNH mình ở "Tổng quan" mặc định.
 */
export function DepartmentDrilldownSection() {
  const [departmentId, setDepartmentId] = useState("");
  const departmentsQuery = useDepartments({ limit: 100, sortBy: "code", order: "asc" });
  const departments = departmentsQuery.data?.data ?? [];

  return (
    <div className="space-y-3">
      <div className="max-w-xs space-y-1.5">
        <label htmlFor="dept-drilldown" className="text-xs font-medium text-muted-foreground">
          Xem theo khoa/phòng
        </label>
        <select
          id="dept-drilldown"
          value={departmentId}
          onChange={(e) => setDepartmentId(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">-- Chọn khoa/phòng --</option>
          {departments.map((d) => (
            <option key={d._id} value={d._id}>
              {d.code} — {d.name}
            </option>
          ))}
        </select>
      </div>

      {departmentId && <DepartmentSummarySection departmentId={departmentId} />}
    </div>
  );
}

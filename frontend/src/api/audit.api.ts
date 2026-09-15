import type { AxiosResponse } from "axios";
import { axiosInstance } from "@/api/axios";
import type { Pagination } from "@/types/shared.types";
import type {
  AuditLogItem,
  GetAuditLogsParams,
  AuditDashboardParams,
  AuditDashboardResponse,
  ExportAuditLogsParams,
} from "@/types/audit.types";

/**
 * API layer domain Audit Logs. Mount path thật `/api/user-audits` (xác nhận
 * `app.ts`: `app.use("/api/user-audits", userAuditRoutes)`) — KHÔNG phải
 * `/audit` dù route file tên `userAudit.routes.ts`.
 *
 * `GET /`/`GET /dashboard` response KHÔNG bọc `{message, data}` — controller
 * (`userAudit.controller.ts`) gọi thẳng `res.json(result)` với `result` đã
 * là `{data, pagination}`/`{total, byAction, byDay}` — KHÁC MỌI domain khác
 * trong app. Đọc trực tiếp `response.data`, KHÔNG qua `unwrapResponse()`
 * (hàm đó giả định luôn có 1 lớp bọc `.data` bên trong).
 */
export function getAuditLogs(
  params: GetAuditLogsParams,
): Promise<AxiosResponse<{ data: AuditLogItem[]; pagination: Pagination }>> {
  return axiosInstance.get("/user-audits", { params });
}

export function getAuditDashboard(params: AuditDashboardParams): Promise<AxiosResponse<AuditDashboardResponse>> {
  return axiosInstance.get("/user-audits/dashboard", { params });
}

/** `responseType:"blob"` — trả file nhị phân trực tiếp, KHÔNG parse JSON. Xử lý download + lỗi ở `useExportAuditLogs.ts`. */
export function exportAuditLogs(params: ExportAuditLogsParams): Promise<AxiosResponse<Blob>> {
  return axiosInstance.get("/user-audits/export", { params, responseType: "blob" });
}

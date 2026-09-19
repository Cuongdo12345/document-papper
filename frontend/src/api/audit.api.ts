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
/**
 * [MỞ RỘNG Roadmap C3, DEV-070] `action` mảng → nối thành 1 chuỗi
 * comma-separated TRƯỚC khi gửi — backend hỗ trợ CẢ 2 cách (CSV hoặc
 * repeated key), nhưng axios serialize mảng mặc định thành `action[]=A`
 * (có ngoặc vuông), KHÔNG khớp cách Express/`qs` parse ra mảng thật. Tự nối
 * ở đây tránh phụ thuộc hành vi serialize mặc định của axios.
 */
function normalizeParams<T extends GetAuditLogsParams>(params: T): T {
  if (!Array.isArray(params.action)) return params;
  return { ...params, action: params.action.length ? (params.action.join(",") as any) : undefined };
}

export function getAuditLogs(
  params: GetAuditLogsParams,
): Promise<AxiosResponse<{ data: AuditLogItem[]; pagination: Pagination }>> {
  return axiosInstance.get("/user-audits", { params: normalizeParams(params) });
}

export function getAuditDashboard(params: AuditDashboardParams): Promise<AxiosResponse<AuditDashboardResponse>> {
  return axiosInstance.get("/user-audits/dashboard", { params });
}

/** `responseType:"blob"` — trả file nhị phân trực tiếp, KHÔNG parse JSON. Xử lý download + lỗi ở `useExportAuditLogs.ts`. */
export function exportAuditLogs(params: ExportAuditLogsParams): Promise<AxiosResponse<Blob>> {
  return axiosInstance.get("/user-audits/export", { params: normalizeParams(params), responseType: "blob" });
}

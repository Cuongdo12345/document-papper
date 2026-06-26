// ============================================================================
// dashboard.types.ts — Response Interfaces cho 7 Dashboard APIs
// Khớp 100% với DASHBOARD_DATA_DISCOVERY.md §5 (Response Shape) / §6 (Return Types)
// ============================================================================

// ── Pagination — dùng chung API 3, 4, 5, 6, 7 ────────────────────────────

export interface DashboardPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface DashboardPaginatedResponse<T> {
  items: T[];
  pagination: DashboardPagination;
}

// ── Sub-types dùng chung API 1 & 2 ───────────────────────────────────────

export interface MonthCount {
  _id: number; // Số tháng (1–12) — KHÔNG phải MongoDB _id thông thường
  count: number;
}

export interface DepartmentDocCount {
  _id: string;
  count: number;
  departmentId: string;
  departmentName: string;
}

export interface RecentDocument {
  _id: string;
  title: string;
  documentCode: string;
  category: "PROPOSAL" | "REPORT";
  subType: string;
  workflowStatus: string;
  isActive: boolean;
  createdAt: string; // ISO string sau JSON serialize
  department: { name: string; code: string }; // populated, chỉ 2 fields — CHỈ có ở API 1
  createdBy: { fullName: string }; // populated, chỉ 1 field
  [key: string]: unknown; // ← thêm dòng này
}

// API 2 — giống RecentDocument nhưng KHÔNG có field `department`
export type DepartmentRecentDocument = Omit<RecentDocument, "department">;

// ── API 1 — admin-summary ────────────────────────────────────────────────

export interface AdminSummaryData {
  totalDocuments: number; // count({ isActive: true })
  totalProposals: number; // count({ category: PROPOSAL, isActive: true })
  totalReports: number; // count({ category: REPORT, isActive: true })
  totalDepartments: number; // ⚠️ count() — KHÔNG filter isActive (khác totalUsers)
  totalUsers: number; // count({ isActive: true })
  proposalsByMonth: MonthCount[]; // chỉ năm hiện tại, sort _id ASC, chỉ tháng có data
  reportsByMonth: MonthCount[]; // chỉ năm hiện tại, sort _id ASC, chỉ tháng có data
  documentsByDepartment: DepartmentDocCount[]; // sort count DESC
  recentDocuments: RecentDocument[]; // cố định 5 (.limit(5) hardcoded), sort createdAt DESC
}

// ── API 2 — department/:departmentId ─────────────────────────────────────

export interface DepartmentSummaryData {
  department: {
    _id: string;
    name: string;
    code: string;
    [key: string]: unknown;
  };
  totalDocuments: number;
  totalProposals: number;
  totalReports: number;
  totalUsers: number; // count({ department: deptId, isActive: true })
  proposalsByMonth: MonthCount[]; // filter theo dept, chỉ năm hiện tại
  reportsByMonth: MonthCount[]; // filter theo dept, chỉ năm hiện tại
  recentDocuments: DepartmentRecentDocument[]; // 5 docs, KHÔNG có field department
}

// ── API 3 — kpi/proposal-conversion ──────────────────────────────────────

export interface ProposalConversionItem {
  departmentId: string;
  departmentName: string;
  totalProposals: number;
  converted: number; // PROPOSAL có referenceTo.length > 0
  conversionRate: number; // % — 1 chữ số thập phân, ví dụ 75.0
  [key: string]: unknown; // ← thêm dòng này                            // Công thức: (converted / max(totalProposals, 1)) * 100
}

export type ProposalConversionResponse =
  DashboardPaginatedResponse<ProposalConversionItem>;

// ── API 4 — kpi/device-damage-trend ──────────────────────────────────────

export interface DamageTrendItem {
  year: number;
  month: number;
  totalReports: number;
  monthLabel: string; // format "YYYY-MM" — có padding 0, ví dụ "2025-01"
  [key: string]: unknown; // ← thêm dòng này
}

export type DamageTrendResponse = DashboardPaginatedResponse<DamageTrendItem>;

// ── API 5 & 6 — top-damaged-devices / top-damaged-inks (cùng shape) ──────

export interface TopDamagedItem {
  deviceName: string; // ⚠️ value thực chất từ meta.items.description — KHÔNG phải field deviceName
  totalBroken: number; // tổng quantity hỏng — đã fallback min = 1 ở backend
  totalReports: number; // số report ghi nhận thiết bị/mực này
  [key: string]: unknown; // ← thêm dòng này
}

export type TopDamagedDevicesResponse =
  DashboardPaginatedResponse<TopDamagedItem>; // API 5 — nguồn CHECK_DAMAGE
export type TopDamagedInksResponse = DashboardPaginatedResponse<TopDamagedItem>; // API 6 — nguồn CONFIRM_STATUS

// ── API 7 — device-stats ─────────────────────────────────────────────────

export interface DeviceStatItem {
  deviceName: string; // value từ meta.items.deviceName (PROPOSAL) — đúng tên field, KHÁC API 5/6
  totalQuantity: number;
  [key: string]: unknown; // ← thêm dòng này
}

export type DeviceStatsResponse = DashboardPaginatedResponse<DeviceStatItem>;

// ── Envelope chung — tất cả 7 API đều bọc trong { success, data } ───────

export interface DashboardApiEnvelope<T> {
  success: true;
  data: T;
}

// // src/types/dashboard.types.ts
// //
// // Dashboard Module — Type definitions
// // Source: dashboard.service.ts · dashboard.controller.ts · DASHBOARD_ANALYSIS_V2.md · DASHBOARD_DATA_DISCOVERY.md
// // KHÔNG tự suy diễn — mọi field đều được xác nhận từ source code backend thực tế.

// // ─── Shared ────────────────────────────────────────────────────────────────────

// /**
//  * Pagination object dùng chung cho API 3, 4, 5, 6, 7.
//  * API 1 và API 2 không có pagination (trả toàn bộ data).
//  */
// export interface DashboardPagination {
//   page: number;
//   limit: number;
//   total: number;
//   totalPages: number;
// }

// /**
//  * Generic wrapper có pagination.
//  * API 3, 4, 5, 6, 7 đều trả về cấu trúc này.
//  */
// export interface DashboardPaginatedResponse<T> {
//   items: T[];
//   pagination: DashboardPagination;
// }

// // ─── API 1 — GET /api/dashboard/admin-summary ──────────────────────────────────

// /**
//  * Một điểm dữ liệu trong mảng phân bổ theo tháng.
//  * _id là số tháng (1–12) — chỉ các tháng có dữ liệu mới xuất hiện (không phải mảng 12 phần tử cố định).
//  * Backend sort { _id: 1 } → tháng tăng dần.
//  * Chỉ lấy năm hiện tại (server-side filter).
//  */
// export interface MonthCount {
//   _id: number; // Số tháng: 1–12
//   count: number;
// }

// /**
//  * Một phòng ban trong mảng phân bổ văn bản theo phòng ban.
//  * Backend sort { count: -1 } → nhiều nhất trước.
//  */
// export interface DepartmentDocCount {
//   _id: string;
//   count: number;
//   departmentId: string;
//   departmentName: string;
// }

// /**
//  * Một văn bản trong mảng 5 văn bản gần nhất.
//  * Chỉ có các field đã được populate:
//  *   - department: { name, code }
//  *   - createdBy: { fullName }
//  * Backend sort { createdAt: -1 }, .limit(5) hardcoded — không phân trang.
//  */
// export interface RecentDocument {
//   _id: string;
//   title: string;
//   documentCode: string;
//   category: 'PROPOSAL' | 'REPORT';
//   subType: string;
//   workflowStatus: string;
//   isActive: boolean;
//   createdAt: string; // ISO string
//   department: {
//     name: string;
//     code: string;
//   };
//   createdBy: {
//     fullName: string;
//   };
// }

// /**
//  * Response của GET /api/dashboard/admin-summary.
//  * Không có pagination — tất cả data trả về trong 1 object.
//  *
//  * ⚠️ totalDepartments: đếm TẤT CẢ department, KHÔNG filter isActive (khác totalUsers).
//  */
// export interface AdminSummaryData {
//   totalDocuments: number;
//   totalProposals: number;
//   totalReports: number;
//   totalDepartments: number; // Toàn bộ department — không filter isActive
//   totalUsers: number; // countDocuments({ isActive: true })
//   proposalsByMonth: MonthCount[];
//   reportsByMonth: MonthCount[];
//   documentsByDepartment: DepartmentDocCount[];
//   recentDocuments: RecentDocument[];
// }

// // ─── API 2 — GET /api/dashboard/department/:departmentId ───────────────────────

// /**
//  * Văn bản gần đây trong tab theo phòng ban.
//  * ⚠️ KHÔNG có field `department` (khác RecentDocument của API 1 đã có field này).
//  */
// export type DepartmentRecentDocument = Omit<RecentDocument, 'department'>;

// /**
//  * Response của GET /api/dashboard/department/:departmentId.
//  * Không có pagination.
//  * departmentId phải hợp lệ (ObjectId) — 400 nếu không; 404 nếu không tồn tại.
//  */
// export interface DepartmentSummaryData {
//   department: {
//     _id: string;
//     name: string;
//     code: string;
//     [key: string]: unknown; // Full Department document — có thể có thêm fields
//   };
//   totalDocuments: number;
//   totalProposals: number;
//   totalReports: number;
//   totalUsers: number; // countDocuments({ department: deptId, isActive: true })
//   proposalsByMonth: MonthCount[];
//   reportsByMonth: MonthCount[];
//   recentDocuments: DepartmentRecentDocument[];
// }

// // ─── API 3 — GET /api/dashboard/kpi/proposal-conversion ───────────────────────

// /**
//  * Một phòng ban trong báo cáo tỷ lệ chuyển đổi đề xuất.
//  *
//  * converted: số PROPOSAL có referenceTo.length > 0 (đã có biên bản liên kết).
//  * conversionRate: (converted / max(totalProposals, 1)) * 100 — làm tròn 1 chữ số thập phân.
//  *   Ví dụ: 75.0, 100.0, 33.3
//  */
// export interface ProposalConversionItem {
//   departmentId: string;
//   departmentName: string;
//   totalProposals: number;
//   converted: number;
//   conversionRate: number; // Đơn vị: % — ví dụ 75.0 = 75%
// }

// /** Response của API 3 */
// export type ProposalConversionResponse =
//   DashboardPaginatedResponse<ProposalConversionItem>;

// // ─── API 4 — GET /api/dashboard/kpi/device-damage-trend ───────────────────────

// /**
//  * Một điểm dữ liệu trong chart xu hướng hư hỏng theo tháng.
//  *
//  * monthLabel: format "YYYY-MM", padding tháng < 10 với "0".
//  *   Ví dụ: "2025-01", "2025-06", "2024-12"
//  *
//  * Source: REPORT subType=CHECK_DAMAGE, isActive=true — toàn bộ lịch sử (không filter năm).
//  *
//  * ⚠️ Default sort: monthLabel DESC (tháng mới nhất trước).
//  *    Frontend cần reverse() nếu muốn hiển thị chart timeline tăng dần trái → phải.
//  */
// export interface DamageTrendItem {
//   year: number;
//   month: number;
//   totalReports: number;
//   monthLabel: string; // "YYYY-MM"
// }

// /** Response của API 4 */
// export type DamageTrendResponse = DashboardPaginatedResponse<DamageTrendItem>;

// // ─── API 5 — GET /api/dashboard/kpi/top-damaged-devices ───────────────────────
// // ─── API 6 — GET /api/dashboard/kpi/top-damaged-inks ──────────────────────────

// /**
//  * Một thiết bị/mực trong bảng xếp hạng hư hỏng/hao hụt.
//  * API 5 và API 6 dùng chung interface này — cấu trúc response giống hệt nhau.
//  *
//  * deviceName:
//  *   - API 5 (CHECK_DAMAGE): giá trị đến từ meta.items.description (không phải meta.items.deviceName)
//  *   - API 6 (CONFIRM_STATUS): giá trị đến từ meta.items.description
//  *   ⚠️ Tên field "deviceName" nhưng value thực chất là "description" của REPORT.
//  *
//  * totalBroken: tổng quantity — nếu quantity <= 0, backend tính là 1 (fallback).
//  */
// export interface TopDamagedItem {
//   deviceName: string; // Value từ meta.items.description (REPORT)
//   totalBroken: number; // Tổng — đã áp dụng fallback min=1
//   totalReports: number; // Số report ghi nhận thiết bị/mực này
// }

// /** Response của API 5 */
// export type TopDamagedDevicesResponse = DashboardPaginatedResponse<TopDamagedItem>;

// /** Response của API 6 */
// export type TopDamagedInksResponse = DashboardPaginatedResponse<TopDamagedItem>;

// // ─── API 7 — GET /api/dashboard/device-stats ──────────────────────────────────

// /**
//  * Một thiết bị trong thống kê số lượng theo tháng/năm.
//  *
//  * deviceName: giá trị đến từ meta.items.deviceName của PROPOSAL
//  *   (KHÁC với TopDamagedItem.deviceName — đó là từ REPORT.meta.items.description)
//  *
//  * Source: PROPOSAL subType IN [PROPOSE_REPAIR, PROPOSE_INK, PROPOSE_PROCUREMENT],
//  *         isActive=true, deletedAt=null, filter theo month+year.
//  */
// export interface DeviceStatItem {
//   deviceName: string; // Value từ meta.items.deviceName (PROPOSAL)
//   totalQuantity: number;
// }

// /** Response của API 7 */
// export type DeviceStatsResponse = DashboardPaginatedResponse<DeviceStatItem>;

// ============================================================================
// dashboard.dto.ts — Query Params / Request DTOs cho 7 Dashboard APIs
// Khớp 100% với DASHBOARD_DATA_DISCOVERY.md §3 (Query Params) và §4 (Validation)
// ============================================================================

export type SortOrder = 'asc' | 'desc';

// ── API 2 — path param ───────────────────────────────────────────────────

export interface GetDepartmentStatsParams {
  departmentId: string; // ObjectId — validate Types.ObjectId.isValid() ở backend, 400 nếu sai
}

// ── API 3 — kpi/proposal-conversion ──────────────────────────────────────

export type ProposalConversionSortBy =
  | 'conversionRate'
  | 'totalProposals'
  | 'converted'
  | 'departmentName'
  | 'departmentId';

export interface GetProposalConversionParams {
  page?: number;                       // default 1
  limit?: number;                      // default 10 (FE override → 50, xem dashboard.constants.ts)
  sortBy?: ProposalConversionSortBy;   // default 'conversionRate'
  sortOrder?: SortOrder;               // default 'desc'
}

// ── API 4 — kpi/device-damage-trend ──────────────────────────────────────

export type DamageTrendSortBy = 'monthLabel' | 'year' | 'month' | 'totalReports';

export interface GetDamageTrendParams {
  page?: number;                  // default 1
  limit?: number;                 // default 12 (= 12 tháng)
  sortBy?: DamageTrendSortBy;     // default 'monthLabel'
  sortOrder?: SortOrder;          // default 'desc' — FE override → 'asc' cho line chart timeline
}

// ── API 5 & 6 — top-damaged-devices / top-damaged-inks (dùng chung DTO) ──

export type TopDamagedSortBy = 'totalBroken' | 'totalReports' | 'deviceName';

export interface GetTopDamagedParams {
  department?: string;       // ObjectId — KHÔNG validate ở backend, không filter nếu thiếu
  fromDate?: string;         // parse qua `new Date()` ở backend — khuyến nghị truyền ISO 8601
  toDate?: string;           // tương tự fromDate
  page?: number;             // default 1
  limit?: number;            // default 10
  sortBy?: TopDamagedSortBy; // default 'totalBroken'
  sortOrder?: SortOrder;     // default 'desc'
}

// ── API 7 — device-stats ─────────────────────────────────────────────────

export type DeviceStatsSortBy = 'totalQuantity' | 'deviceName';

export interface GetDeviceStatsParams {
  month: number;                  // 1–12 — BẮT BUỘC, KHÔNG có default ở backend (400 nếu thiếu)
  year: number;                   // BẮT BUỘC, KHÔNG có default ở backend (400 nếu thiếu)
  page?: number;                  // default 20... (page default 1)
  limit?: number;                 // default 20
  sortBy?: DeviceStatsSortBy;     // default 'totalQuantity'
  sortOrder?: SortOrder;          // default 'desc'
}

// // src/types/dashboard.dto.ts
// //
// // Dashboard Module — Query Params DTOs (Data Transfer Objects)
// // Source: dashboard.controller.ts — destructured req.query per endpoint
// // Mọi field default value xác nhận trực tiếp từ source code backend.

// // ─── API 1 — GET /api/dashboard/admin-summary ──────────────────────────────────
// // Không có params — không cần DTO.

// // ─── API 2 — GET /api/dashboard/department/:departmentId ───────────────────────

// /**
//  * Path param cho API 2.
//  * Validation backend: Types.ObjectId.isValid(departmentId) → 400 nếu fail.
//  * Department.findById() → 404 nếu không tồn tại.
//  */
// export interface GetDepartmentStatsParams {
//   departmentId: string; // MongoDB ObjectId string
// }

// // ─── API 3 — GET /api/dashboard/kpi/proposal-conversion ───────────────────────

// /**
//  * Query params cho API 3.
//  * Tất cả đều optional — backend có default value.
//  * Không có filter nghiệp vụ (chỉ pagination/sort).
//  */
// export interface GetProposalConversionParams {
//   page?: number; // Default: 1
//   limit?: number; // Default: 10
//   sortBy?: ProposalConversionSortBy; // Default: "conversionRate"
//   sortOrder?: SortOrder; // Default: "desc"
// }

// export type ProposalConversionSortBy =
//   | 'conversionRate'
//   | 'totalProposals'
//   | 'converted'
//   | 'departmentName'
//   | 'departmentId';

// // ─── API 4 — GET /api/dashboard/kpi/device-damage-trend ───────────────────────

// /**
//  * Query params cho API 4.
//  * limit default 12 = 12 tháng (1 năm).
//  * sortBy default "monthLabel", sortOrder default "desc" → tháng mới nhất trước.
//  * ⚠️ Frontend cần reverse() array khi hiển thị Line Chart timeline tăng dần.
//  */
// export interface GetDamageTrendParams {
//   page?: number; // Default: 1
//   limit?: number; // Default: 12
//   sortBy?: DamageTrendSortBy; // Default: "monthLabel"
//   sortOrder?: SortOrder; // Default: "desc"
// }

// export type DamageTrendSortBy = 'monthLabel' | 'year' | 'month' | 'totalReports';

// // ─── API 5 — GET /api/dashboard/kpi/top-damaged-devices ───────────────────────
// // ─── API 6 — GET /api/dashboard/kpi/top-damaged-inks ──────────────────────────

// /**
//  * Query params cho API 5 và API 6 (giống hệt nhau).
//  *
//  * fromDate / toDate: parse qua new Date() — không validate format ở backend.
//  *   → Frontend PHẢI dùng DatePicker để đảm bảo ISO string hợp lệ.
//  *   → Nên dùng dayjs().toISOString() khi gửi.
//  *
//  * department: ObjectId string — không validate ở backend.
//  */
// export interface GetTopDamagedParams {
//   department?: string; // ObjectId — không bắt buộc, không validate backend
//   fromDate?: string; // ISO string khuyến nghị — ví dụ: "2025-01-01T00:00:00.000Z"
//   toDate?: string; // ISO string khuyến nghị
//   page?: number; // Default: 1
//   limit?: number; // Default: 10
//   sortBy?: TopDamagedSortBy; // Default: "totalBroken"
//   sortOrder?: SortOrder; // Default: "desc"
// }

// export type TopDamagedSortBy = 'totalBroken' | 'totalReports' | 'deviceName';

// // ─── API 7 — GET /api/dashboard/device-stats ──────────────────────────────────

// /**
//  * Query params cho API 7.
//  *
//  * ⚠️ month và year là BẮT BUỘC — backend trả 400 nếu thiếu 1 trong 2.
//  *    Không có default value ở backend.
//  *    Frontend PHẢI set default = tháng/năm hiện tại khi Tab 7 mount lần đầu.
//  *
//  * Ví dụ default:
//  *   month = dayjs().month() + 1   (dayjs trả 0-11, +1 để ra 1-12)
//  *   year  = dayjs().year()
//  */
// export interface GetDeviceStatsParams {
//   month: number; // BẮT BUỘC — 1–12
//   year: number; // BẮT BUỘC — 4 chữ số
//   page?: number; // Default: 1
//   limit?: number; // Default: 20
//   sortBy?: DeviceStatsSortBy; // Default: "totalQuantity"
//   sortOrder?: SortOrder; // Default: "desc"
// }

// export type DeviceStatsSortBy = 'totalQuantity' | 'deviceName';

// // ─── Shared ────────────────────────────────────────────────────────────────────

// /** Hướng sort — dùng chung cho tất cả APIs có sorting */
// export type SortOrder = 'asc' | 'desc';

// src/constants/dashboard.constants.ts
//
// Dashboard Module — Constants
// Source: API_LAYER_SPEC.md §3.2 (Query Key Factory) · STATE_MAPPING.md §7 · DASHBOARD_ANALYSIS_V2.md

import type {
  GetProposalConversionParams,
  GetDamageTrendParams,
  GetTopDamagedParams,
  GetDeviceStatsParams,
} from '../types/dashboard/dashboard.dto';

export const DASHBOARD_QUERY_KEYS = {
  summary: ['dashboard', 'summary'] as const,

  department: (departmentId: string) =>
    ['dashboard', 'department', departmentId] as const,

  kpi: {
    proposalConversion: (params: GetProposalConversionParams) =>
      ['dashboard', 'kpi', 'proposal-conversion', params] as const,

    deviceDamageTrend: (params: GetDamageTrendParams) =>
      ['dashboard', 'kpi', 'device-damage-trend', params] as const,

    topDamagedDevices: (params: GetTopDamagedParams) =>
      ['dashboard', 'kpi', 'top-damaged-devices', params] as const,

    topDamagedInks: (params: GetTopDamagedParams) =>
      ['dashboard', 'kpi', 'top-damaged-inks', params] as const,
  },

  deviceStats: (params: GetDeviceStatsParams) =>
    ['dashboard', 'device-stats', params] as const,
} as const;

// ─── Cache Strategy ────────────────────────────────────────────────────────────
// Source: API_LAYER_SPEC.md §3.3 · STATE_MAPPING.md §7 — "Dashboard/KPI: 5 phút"

/** staleTime cho tất cả 7 dashboard queries — 5 phút */
export const DASHBOARD_STALE_TIME = 5 * 60 * 1000; // 300_000 ms

/** gcTime cho tất cả 7 dashboard queries — 10 phút */
export const DASHBOARD_GC_TIME = 10 * 60 * 1000; // 600_000 ms

// ─── Axios Timeout ─────────────────────────────────────────────────────────────
// Source: API_LAYER_SPEC.md §13.6 — "Dashboard analytics: 20 000ms"

/** Timeout override cho tất cả 7 dashboard API calls — 20 giây */
export const DASHBOARD_REQUEST_TIMEOUT = 20_000; // ms

// ─── Default Params ────────────────────────────────────────────────────────────
// Source: dashboard.controller.ts — destructured default values per endpoint

/** Default params cho API 3 */
export const DASHBOARD_PROPOSAL_CONVERSION_DEFAULTS: Required<GetProposalConversionParams> = {
  page: 1,
  limit: 50, // Ghi đè backend default 10 — ẩn pagination UI, lấy đủ dữ liệu 1 lần
  sortBy: 'conversionRate',
  sortOrder: 'desc',
};

/** Default params cho API 4 */
export const DASHBOARD_DAMAGE_TREND_DEFAULTS: Required<GetDamageTrendParams> = {
  page: 1,
  limit: 12, // 12 tháng — khớp backend default
  sortBy: 'monthLabel',
  sortOrder: 'asc', // ⚠️ Ghi đè backend default 'desc' — để chart hiển thị tăng dần trái→phải
};

/**
 * Default params ban đầu cho API 5 và API 6 (không filter).
 * Filter thực tế do user set qua UI — state lưu ở local useState.
 */
export const DASHBOARD_TOP_DAMAGED_DEFAULTS: GetTopDamagedParams = {
  page: 1,
  limit: 10, // Khớp backend default
  sortBy: 'totalBroken',
  sortOrder: 'desc',
};

// ─── Tab Keys ──────────────────────────────────────────────────────────────────
// Source: DASHBOARD_UI_SPEC.md §1 — AntD Tabs với 7 tabs

export const DASHBOARD_TAB_KEYS = {
  OVERVIEW: 'tab1', // Tổng quan — API 1
  BY_DEPARTMENT: 'tab2', // Theo phòng ban — API 2
  KPI_PROPOSAL: 'tab3', // KPI Đề xuất — API 3
  DAMAGE_TREND: 'tab4', // Xu hướng hư hỏng — API 4
  TOP_DEVICES: 'tab5', // Top thiết bị hỏng — API 5
  TOP_INKS: 'tab6', // Top mực hao hụt — API 6
  DEVICE_STATS: 'tab7', // Thống kê thiết bị — API 7
} as const;

export type DashboardTabKey =
  (typeof DASHBOARD_TAB_KEYS)[keyof typeof DASHBOARD_TAB_KEYS];

/** Tab mặc định khi vào Dashboard */
export const DASHBOARD_DEFAULT_TAB: DashboardTabKey = DASHBOARD_TAB_KEYS.OVERVIEW;

// ─── Month Labels ──────────────────────────────────────────────────────────────
// Source: DASHBOARD_ANALYSIS_V2.md §21 — "field _id chỉ là số 1-12, cần map sang label"

/**
 * Map từ số tháng (1–12) sang label hiển thị trên chart axis.
 * Dùng cho proposalsByMonth và reportsByMonth (Tab 1, Tab 2).
 * Tab 4 đã có monthLabel sẵn từ backend — không dùng map này.
 */
export const MONTH_LABEL_MAP: Record<number, string> = {
  1: 'Tháng 1',
  2: 'Tháng 2',
  3: 'Tháng 3',
  4: 'Tháng 4',
  5: 'Tháng 5',
  6: 'Tháng 6',
  7: 'Tháng 7',
  8: 'Tháng 8',
  9: 'Tháng 9',
  10: 'Tháng 10',
  11: 'Tháng 11',
  12: 'Tháng 12',
};

// ─── Device Stats Month Options ────────────────────────────────────────────────
// Source: DASHBOARD_UI_SPEC.md §5.3 — Select Tháng cho Tab 7

/** Options cho Select Tháng trong Tab 7 */
export const MONTH_SELECT_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: MONTH_LABEL_MAP[i + 1],
}));

/**
 * Số năm tối đa cho Select Năm trong Tab 7.
 * Tính từ năm hiện tại trở về quá khứ.
 * Ví dụ: YEAR_SELECT_RANGE = 5 → 5 năm gần nhất.
 */
export const YEAR_SELECT_RANGE = 5;

// ─── Error Messages ────────────────────────────────────────────────────────────
// Source: DASHBOARD_DATA_DISCOVERY.md §11 — error responses từ backend thực tế

export const DASHBOARD_ERROR_MESSAGES = {
  FORBIDDEN: 'Forbidden',
  ADMIN_ONLY: 'Chỉ ADMIN được truy cập dashboard',
  INVALID_DEPARTMENT_ID: 'Department ID không hợp lệ',
  DEPARTMENT_NOT_FOUND: 'Không tìm thấy khoa',
  DEVICE_STATS_MONTH_YEAR_REQUIRED: 'month và year là bắt buộc',
  REQUEST_TIMEOUT: 'Kết nối máy chủ thất bại',
  UNKNOWN: 'Có lỗi xảy ra, vui lòng thử lại',
} as const;

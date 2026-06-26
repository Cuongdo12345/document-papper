// src/hooks/queries/useDashboard.ts
//
// Dashboard Module — React Query Hooks
// Source: BUILD_DASHBOARD_API_LAYER.md · DASHBOARD_ANALYSIS_V2.md §18 · STATE_MAPPING.md §7.5
//
// Nguyên tắc (API_LAYER_SPEC.md §12.2):
//   - Hook layer extract .data.data từ raw AxiosResponse (Rule 2: select transform)
//   - enabled: chỉ fetch khi tab active (STATE_MAPPING.md §7.5 — "chỉ fetch khi vào tab")
//   - staleTime: 5 phút cho tất cả 7 hooks (không invalidate sau mutations — analytics)
//   - retry: kế thừa global config — retry 1 lần cho 5xx, không retry 4xx
//   - Không có onError toast tại hook — 403/500 đã xử lý bởi Axios interceptor global

import { useQuery } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { dashboardService } from "../../api/services/dashboard.service";
import {
  DASHBOARD_QUERY_KEYS,
  DASHBOARD_STALE_TIME,
  DASHBOARD_GC_TIME,
  DASHBOARD_PROPOSAL_CONVERSION_DEFAULTS,
  DASHBOARD_DAMAGE_TREND_DEFAULTS,
  DASHBOARD_TOP_DAMAGED_DEFAULTS,
} from "../../constants/dashboard.constants";
import type {
  AdminSummaryData,
  DepartmentSummaryData,
  ProposalConversionResponse,
  DamageTrendResponse,
  TopDamagedDevicesResponse,
  TopDamagedInksResponse,
  DeviceStatsResponse,
} from "../../types/dashboard/dashboard.types";
import type {
  GetProposalConversionParams,
  GetDamageTrendParams,
  GetTopDamagedParams,
  GetDeviceStatsParams,
} from "../../types/dashboard/dashboard.dto";

// ─── Shared error type ─────────────────────────────────────────────────────────

type DashboardApiError = AxiosError<{ message?: string; success?: boolean }>;

// ─── Hook 1 — useAdminSummary ──────────────────────────────────────────────────

/**
 * Lấy tổng quan hệ thống cho Tab 1 (Tổng quan).
 *
 * @param enabled  — true khi Tab 1 active. Mặc định true để hỗ trợ mount ngay lần đầu
 *                   (Tab 1 là tab mặc định — STATE_MAPPING.md §7.5 "lazy per tab").
 *
 * enabled không dùng activeTab trực tiếp ở đây — hook nhận boolean để reusable.
 * Caller (DashboardPage) tự quản lý: enabled={activeTab === DASHBOARD_TAB_KEYS.OVERVIEW}
 *
 * select: extract res.data.data → trả AdminSummaryData trực tiếp, không bọc envelope.
 */
export const useAdminSummary = (
  enabled = true,
  options?: Omit<
    UseQueryOptions<AdminSummaryData, DashboardApiError, AdminSummaryData>,
    "queryKey" | "queryFn" | "select" | "staleTime" | "gcTime"
  >,
) => {
  return useQuery<AdminSummaryData, DashboardApiError>({
    queryKey: DASHBOARD_QUERY_KEYS.summary,
    queryFn: () =>
      dashboardService.getAdminSummary().then((res) => res.data.data),
    staleTime: DASHBOARD_STALE_TIME,
    gcTime: DASHBOARD_GC_TIME,
    enabled,
    ...options,
  });
};

// ─── Hook 2 — useDepartmentDashboard ──────────────────────────────────────────

/**
 * Lấy thống kê 1 phòng ban cụ thể cho Tab 2 (Theo phòng ban).
 *
 * @param departmentId — ObjectId string. Hook chỉ enabled khi departmentId truthy.
 *   enabled pattern: enabled={!!departmentId && activeTab === DASHBOARD_TAB_KEYS.BY_DEPARTMENT}
 *
 * Backend validate:
 *   - 400 nếu departmentId không phải ObjectId hợp lệ
 *   - 404 nếu department không tồn tại
 *   → Cả 2 lỗi này được React Query đặt vào query.error — không toast ở đây.
 *   → Caller dùng query.error?.response?.status để render ErrorState phù hợp.
 *
 * select: extract res.data.data → DepartmentSummaryData.
 */
export const useDepartmentDashboard = (
  departmentId: string | undefined,
  enabled = true,
  options?: Omit<
    UseQueryOptions<DepartmentSummaryData, DashboardApiError>,
    "queryKey" | "queryFn" | "staleTime" | "gcTime" | "enabled"
  >,
) => {
  return useQuery<DepartmentSummaryData, DashboardApiError>({
    queryKey: DASHBOARD_QUERY_KEYS.department(departmentId ?? ""),
    queryFn: () =>
      dashboardService
        .getDepartmentStats(departmentId!)
        .then((res) => res.data.data),
    staleTime: DASHBOARD_STALE_TIME,
    gcTime: DASHBOARD_GC_TIME,
    // Không gọi API nếu chưa chọn phòng ban hoặc tab chưa active
    enabled: !!departmentId && enabled,
    ...options,
  });
};

// ─── Hook 3 — useProposalConversion ───────────────────────────────────────────

/**
 * Lấy KPI tỷ lệ chuyển đổi đề xuất → biên bản cho Tab 3.
 *
 * @param params — dùng DASHBOARD_PROPOSAL_CONVERSION_DEFAULTS nếu không truyền.
 *   Default override: limit=50 (không phải backend default 10) để ẩn pagination UI —
 *   đủ cover thực tế số phòng ban < 15.
 *
 * enabled pattern: enabled={activeTab === DASHBOARD_TAB_KEYS.KPI_PROPOSAL}
 *
 * select: extract res.data.data → ProposalConversionResponse (có items + pagination).
 * conversionRate là % với 1 chữ số thập phân — ví dụ 75.0, không phải 0.75.
 */
export const useProposalConversion = (
  params: GetProposalConversionParams = DASHBOARD_PROPOSAL_CONVERSION_DEFAULTS,
  enabled = true,
  options?: Omit<
    UseQueryOptions<ProposalConversionResponse, DashboardApiError>,
    "queryKey" | "queryFn" | "staleTime" | "gcTime" | "enabled"
  >,
) => {
  return useQuery<ProposalConversionResponse, DashboardApiError>({
    queryKey: DASHBOARD_QUERY_KEYS.kpi.proposalConversion(params),
    queryFn: () =>
      dashboardService
        .getProposalConversionKpi(params)
        .then((res) => res.data.data),
    staleTime: DASHBOARD_STALE_TIME,
    gcTime: DASHBOARD_GC_TIME,
    enabled,
    ...options,
  });
};

// ─── Hook 4 — useDamageTrend ───────────────────────────────────────────────────

/**
 * Lấy xu hướng hư hỏng theo tháng cho Tab 4 (Line Chart).
 *
 * @param params — dùng DASHBOARD_DAMAGE_TREND_DEFAULTS nếu không truyền.
 *   Default override QUAN TRỌNG: sortOrder='asc' (khác backend default 'desc')
 *   → items trả về theo thứ tự tháng tăng dần → Line Chart timeline đúng trái → phải.
 *   NẾU dùng backend default 'desc' thì phải items.slice().reverse() ở component.
 *
 * enabled pattern: enabled={activeTab === DASHBOARD_TAB_KEYS.DAMAGE_TREND}
 *
 * monthLabel format: "YYYY-MM" (có padding 0) — dùng trực tiếp làm X-axis label.
 */
export const useDamageTrend = (
  params: GetDamageTrendParams = DASHBOARD_DAMAGE_TREND_DEFAULTS,
  enabled = true,
  options?: Omit<
    UseQueryOptions<DamageTrendResponse, DashboardApiError>,
    "queryKey" | "queryFn" | "staleTime" | "gcTime" | "enabled"
  >,
) => {
  return useQuery<DamageTrendResponse, DashboardApiError>({
    queryKey: DASHBOARD_QUERY_KEYS.kpi.deviceDamageTrend(params),
    queryFn: () =>
      dashboardService
        .getDeviceDamageTrend(params)
        .then((res) => res.data.data),
    staleTime: DASHBOARD_STALE_TIME,
    gcTime: DASHBOARD_GC_TIME,
    enabled,
    ...options,
  });
};

// ─── Hook 5 — useTopDamagedDevices ────────────────────────────────────────────

/**
 * Lấy top thiết bị hỏng nhiều nhất cho Tab 5 (Horizontal Bar Chart).
 *
 * @param params — filter: department?, fromDate?, toDate?
 *   dùng DASHBOARD_TOP_DAMAGED_DEFAULTS (merge với params truyền vào) nếu không đủ.
 *
 * enabled pattern: enabled={activeTab === DASHBOARD_TAB_KEYS.TOP_DEVICES}
 *
 * ⚠️ NAMING: response field `deviceName` thực chất là meta.items.description của REPORT/CHECK_DAMAGE.
 *    Không phải meta.items.deviceName (field đó dành cho PROPOSAL, dùng ở Hook 7).
 *
 * fromDate/toDate: truyền ISO string — ví dụ dayjs(date).toISOString().
 *   Validate client-side: fromDate <= toDate trước khi gọi hook.
 */
export const useTopDamagedDevices = (
  params: GetTopDamagedParams = DASHBOARD_TOP_DAMAGED_DEFAULTS,
  enabled = true,
  options?: Omit<
    UseQueryOptions<TopDamagedDevicesResponse, DashboardApiError>,
    "queryKey" | "queryFn" | "staleTime" | "gcTime" | "enabled"
  >,
) => {
  const mergedParams: GetTopDamagedParams = {
    ...DASHBOARD_TOP_DAMAGED_DEFAULTS,
    ...params,
  };

  return useQuery<TopDamagedDevicesResponse, DashboardApiError>({
    queryKey: DASHBOARD_QUERY_KEYS.kpi.topDamagedDevices(mergedParams),
    queryFn: () =>
      dashboardService
        .getTopDamagedDevices(mergedParams)
        .then((res) => res.data.data),
    staleTime: DASHBOARD_STALE_TIME,
    gcTime: DASHBOARD_GC_TIME,
    enabled,
    ...options,
  });
};

// ─── Hook 6 — useTopDamagedInks ───────────────────────────────────────────────

/**
 * Lấy top mực hao hụt nhiều nhất cho Tab 6 (Horizontal Bar Chart).
 *
 * @param params — giống hệt Hook 5 — dùng DASHBOARD_TOP_DAMAGED_DEFAULTS.
 *
 * enabled pattern: enabled={activeTab === DASHBOARD_TAB_KEYS.TOP_INKS}
 *
 * ⚠️ NAMING: response field `deviceName` thực chất là meta.items.description của REPORT/CONFIRM_STATUS.
 *    Khác nguồn với Hook 5 (CHECK_DAMAGE) nhưng cùng response shape.
 *
 * Cấu trúc hook giống hệt useTopDamagedDevices — chỉ khác service function gọi.
 */
export const useTopDamagedInks = (
  params: GetTopDamagedParams = DASHBOARD_TOP_DAMAGED_DEFAULTS,
  enabled = true,
  options?: Omit<
    UseQueryOptions<TopDamagedInksResponse, DashboardApiError>,
    "queryKey" | "queryFn" | "staleTime" | "gcTime" | "enabled"
  >,
) => {
  const mergedParams: GetTopDamagedParams = {
    ...DASHBOARD_TOP_DAMAGED_DEFAULTS,
    ...params,
  };

  return useQuery<TopDamagedInksResponse, DashboardApiError>({
    queryKey: DASHBOARD_QUERY_KEYS.kpi.topDamagedInks(mergedParams),
    queryFn: () =>
      dashboardService
        .getTopDamagedInks(mergedParams)
        .then((res) => res.data.data),
    staleTime: DASHBOARD_STALE_TIME,
    gcTime: DASHBOARD_GC_TIME,
    enabled,
    ...options,
  });
};

// ─── Hook 7 — useDeviceStats ───────────────────────────────────────────────────

/**
 * Lấy thống kê số lượng thiết bị theo tháng/năm cho Tab 7.
 *
 * @param params — month (BẮT BUỘC), year (BẮT BUỘC), pagination/sort optional.
 *   Caller PHẢI resolve default month/year trước khi truyền:
 *     month = dayjs().month() + 1   ← dayjs().month() trả 0–11, +1 để ra 1–12
 *     year  = dayjs().year()
 *
 * enabled pattern: enabled={activeTab === DASHBOARD_TAB_KEYS.DEVICE_STATS}
 *   (Không cần guard !!params.month vì TypeScript đã enforce required field)
 *
 * ⚠️ month/year BẮT BUỘC ở cả TypeScript type lẫn backend runtime (400 nếu thiếu).
 *    Hook sẽ không gọi API cho đến khi enabled=true — caller quản lý điều này.
 *
 * ⚠️ NAMING: response field `deviceName` đến từ meta.items.deviceName của PROPOSAL.
 *    Đây là field ĐÚNG tên (khác Hook 5/6 — đó là REPORT.meta.items.description).
 *
 * Response có pagination thật — DataTable cần dùng server-side pagination.
 */
export const useDeviceStats = (
  params: GetDeviceStatsParams,
  enabled = true,
  options?: Omit<
    UseQueryOptions<DeviceStatsResponse, DashboardApiError>,
    "queryKey" | "queryFn" | "staleTime" | "gcTime" | "enabled"
  >,
) => {
  return useQuery<DeviceStatsResponse, DashboardApiError>({
    queryKey: DASHBOARD_QUERY_KEYS.deviceStats(params),
    queryFn: () =>
      dashboardService.getDeviceStats(params).then((res) => res.data.data),
    staleTime: DASHBOARD_STALE_TIME,
    gcTime: DASHBOARD_GC_TIME,
    enabled,
    ...options,
  });
};

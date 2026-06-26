// ============================================================================
// dashboard.service.ts
// 1 service file = 1 backend module (API_LAYER_SPEC.md §1.2)
// Chỉ gọi API — không business logic, không try/catch, return raw AxiosResponse
// ============================================================================

import type { AxiosResponse } from 'axios';
import { apiClient } from '../client';
import { DASHBOARD_ENDPOINTS } from '../endpoints';
import { DASHBOARD_REQUEST_TIMEOUT } from '../../constants/dashboard.constants';
import type {
  AdminSummaryData,
  DepartmentSummaryData,
  ProposalConversionResponse,
  DamageTrendResponse,
  TopDamagedDevicesResponse,
  TopDamagedInksResponse,
  DeviceStatsResponse,
  DashboardApiEnvelope,
} from '../../types/dashboard/dashboard.types';
import type {
  GetProposalConversionParams,
  GetDamageTrendParams,
  GetTopDamagedParams,
  GetDeviceStatsParams,
} from '../../types/dashboard/dashboard.dto';

// const { dashboard: ENDPOINTS } = API_ENDPOINTS;

export const dashboardService = {
  /** API 1 — GET /dashboard/admin-summary — không nhận params */
  getAdminSummary(): Promise<AxiosResponse<DashboardApiEnvelope<AdminSummaryData>>> {
    return apiClient.get(DASHBOARD_ENDPOINTS.adminSummary, {
      timeout: DASHBOARD_REQUEST_TIMEOUT,
    });
  },

  /** API 2 — GET /dashboard/department/:departmentId — path param bắt buộc */
  getDepartmentStats(
    departmentId: string,
  ): Promise<AxiosResponse<DashboardApiEnvelope<DepartmentSummaryData>>> {
    return apiClient.get(DASHBOARD_ENDPOINTS.departmentStats(departmentId), {
      timeout: DASHBOARD_REQUEST_TIMEOUT,
    });
  },

  /** API 3 — GET /dashboard/kpi/proposal-conversion — có pagination/sort */
  getProposalConversionKpi(
    params: GetProposalConversionParams,
  ): Promise<AxiosResponse<DashboardApiEnvelope<ProposalConversionResponse>>> {
    return apiClient.get(DASHBOARD_ENDPOINTS.proposalConversion, {
      params,
      timeout: DASHBOARD_REQUEST_TIMEOUT,
    });
  },

  /** API 4 — GET /dashboard/kpi/device-damage-trend — có pagination/sort */
  getDeviceDamageTrend(
    params: GetDamageTrendParams,
  ): Promise<AxiosResponse<DashboardApiEnvelope<DamageTrendResponse>>> {
    return apiClient.get(DASHBOARD_ENDPOINTS.deviceDamageTrend, {
      params,
      timeout: DASHBOARD_REQUEST_TIMEOUT,
    });
  },

  /** API 5 — GET /dashboard/kpi/top-damaged-devices — filter + pagination/sort */
  getTopDamagedDevices(
    params: GetTopDamagedParams,
  ): Promise<AxiosResponse<DashboardApiEnvelope<TopDamagedDevicesResponse>>> {
    return apiClient.get(DASHBOARD_ENDPOINTS.topDamagedDevices, {
      params,
      timeout: DASHBOARD_REQUEST_TIMEOUT,
    });
  },

  /** API 6 — GET /dashboard/kpi/top-damaged-inks — filter + pagination/sort */
  getTopDamagedInks(
    params: GetTopDamagedParams,
  ): Promise<AxiosResponse<DashboardApiEnvelope<TopDamagedInksResponse>>> {
    return apiClient.get(DASHBOARD_ENDPOINTS.topDamagedInks, {
      params,
      timeout: DASHBOARD_REQUEST_TIMEOUT,
    });
  },

  /** API 7 — GET /dashboard/device-stats — month/year BẮT BUỘC */
  getDeviceStats(
    params: GetDeviceStatsParams,
  ): Promise<AxiosResponse<DashboardApiEnvelope<DeviceStatsResponse>>> {
    return apiClient.get(DASHBOARD_ENDPOINTS.deviceStats, {
      params,
      timeout: DASHBOARD_REQUEST_TIMEOUT,
    });
  },
};
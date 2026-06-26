import { isAxiosError } from 'axios';
import { DASHBOARD_ERROR_MESSAGES } from '../constants/dashboard.constants';

interface DashboardErrorPayload {
  message?: string;
  success?: boolean;
}

export function extractDashboardErrorMessage(error: unknown): string {
  if (isAxiosError<DashboardErrorPayload>(error)) {
    return error.response?.data?.message ?? DASHBOARD_ERROR_MESSAGES.UNKNOWN;
  }
  return DASHBOARD_ERROR_MESSAGES.UNKNOWN;
}
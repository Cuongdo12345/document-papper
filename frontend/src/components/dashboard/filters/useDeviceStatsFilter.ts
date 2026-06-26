// src/components/dashboard/filters/useDeviceStatsFilter.ts
//
// Hook quản lý filter state cho Tab 7 — bao gồm default value resolution.
// Source: DASHBOARD_UI_SPEC.md §5.3
//
// month/year default:
//   defaultMonth = dayjs().month() + 1   (dayjs().month() trả 0-11, +1 để ra 1-12)
//   defaultYear  = dayjs().year()
//
// Set ngay tại useState initial → enabled={!!month && !!year} luôn true ngay khi mount,
// không bao giờ gọi API thiếu param (DASHBOARD_UI_SPEC.md §5.3 cuối đoạn).

import { useState } from 'react';
import dayjs from 'dayjs';
import type { DeviceStatsFilterValue } from './dashboard-filter.types';

export function useDeviceStatsFilter() {
  const [filter, setFilter] = useState<DeviceStatsFilterValue>(() => ({
    month: dayjs().month() + 1,
    year: dayjs().year(),
  }));

  const currentYear = dayjs().year();

  return {
    filter,
    setFilter,
    currentYear,
  };
}

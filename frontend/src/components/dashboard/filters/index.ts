// src/components/dashboard/filters/index.ts
//
// Dashboard Filters — barrel export

// Types
export type {
  DepartmentOption,
  DepartmentSelectorValue,
  TopDamagedFilterDraft,
  TopDamagedFilterApplied,
  DeviceStatsFilterValue,
  MonthOption,
  YearOption,
} from './dashboard-filter.types';
export { TOP_DAMAGED_FILTER_DRAFT_DEFAULT } from './dashboard-filter.types';

// Components
export { DepartmentFilterSelect } from './DepartmentFilterSelect';
export { DateRangeFilter, dateRangeToParams } from './DateRangeFilter';
export { TopDamagedFilterPanel } from './TopDamagedFilterPanel';
export { DeviceStatsFilterPanel } from './DeviceStatsFilterPanel';

// Hooks
export { useDeviceStatsFilter } from './useDeviceStatsFilter';

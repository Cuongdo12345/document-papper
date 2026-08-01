// Component
export { FilterBar } from './FilterBar'

// Types
export type {
  FilterBarProps,
  FilterField,
  FilterFieldType,
  FilterValues,
  SelectOption,
  SearchFilterField,
  SelectFilterField,
  DateRangeFilterField,
  AsyncSelectFilterField,
  CustomFilterField,
} from './FilterBar.types'

export {
  getDateRangeKeys,
  countActiveFilters,
} from './FilterBar.types'

// Preset field factories (re-export for convenience)
export {
  makeSearchField,
  makeDateRangeField,
  makeWorkflowStatusField,
  makeIsActiveField,
  makeProposalSubTypeField,
  makeReportSubTypeField,
  makeCategoryField,
  makeRoleField,
  makeRoleAsyncField,
  makeAuditActionField,
  makeDepartmentField,
  makeUserField,
  // Option constants
  WORKFLOW_STATUS_OPTIONS,
  IS_ACTIVE_OPTIONS,
  PROPOSAL_SUB_TYPE_OPTIONS,
  REPORT_SUB_TYPE_OPTIONS,
  DOCUMENT_CATEGORY_OPTIONS,
  ROLE_FILTER_OPTIONS,
  AUDIT_ACTION_OPTIONS,
} from './FilterBar.presets'

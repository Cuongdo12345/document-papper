/**
 * FilterBar — Usage Examples
 * Phủ toàn bộ 7 screens có filter panel:
 *   SCR-05 ProposalList, SCR-08 ReportList, SCR-11 WorkflowList,
 *   SCR-17 UserList, SCR-24 AuditList, SCR-25 AuditDashboard, SCR-26 Performance
 *
 * Mỗi example cho thấy cách kết hợp FilterBar với useTableFilter hook.
 * File này là tài liệu sống — không import vào production build.
 */

import { FilterBar } from './FilterBar'
import type { FilterValues } from './FilterBar.types'
import type { SelectOption } from './FilterBar.types'
import {
  makeSearchField,
  makeProposalSubTypeField,
  makeReportSubTypeField,
  makeDepartmentField,
  makeWorkflowStatusField,
  makeIsActiveField,
  makeDateRangeField,
  makeCategoryField,
  makeRoleAsyncField,
  makeAuditActionField,
  makeUserField,
  makeRoleField,
} from './FilterBar.presets'

// Mock fetch functions — trong production, caller tự truyền từ hooks
const fetchDepts = async (): Promise<SelectOption[]> => [
  { value: 'dept-id-1', label: 'Công nghệ thông tin' },
  { value: 'dept-id-2', label: 'Hành chính quản trị' },
]

const fetchRoles = async (): Promise<SelectOption[]> => [
  { value: 'role-id-1', label: 'ADMIN' },
  { value: 'role-id-2', label: 'IT' },
  { value: 'role-id-3', label: 'USER' },
]

const fetchUsers = async (): Promise<SelectOption[]> => [
  { value: 'user-id-1', label: 'Nguyễn Văn A' },
  { value: 'user-id-2', label: 'Trần Thị B' },
]

// ─────────────────────────────────────────────────────────────────────────────
// SCR-05 — ProposalListPage
// Filter: keyword, subType(3), department, workflowStatus, isActive, dateRange
// ─────────────────────────────────────────────────────────────────────────────

export const Ex_SCR05_ProposalFilter = ({
  values,
  onFilter,
  onReset,
  loading,
}: {
  values: FilterValues
  onFilter: (v: FilterValues) => void
  onReset: () => void
  loading: boolean
}) => (
  <FilterBar
    fields={[
      makeSearchField({ placeholder: 'Tìm theo tiêu đề, mã tài liệu...' }),
      makeProposalSubTypeField(),
      makeDepartmentField(fetchDepts),
      makeWorkflowStatusField(),
      makeIsActiveField(),
      makeDateRangeField({ fromKey: 'fromDate', toKey: 'toDate' }),
    ]}
    values={values}
    onFilter={onFilter}
    onReset={onReset}
    loading={loading}
    data-testid="proposal-filter-bar"
  />
)

// ─────────────────────────────────────────────────────────────────────────────
// SCR-08 — ReportListPage
// Filter: keyword, subType(2), department, workflowStatus, dateRange
// ─────────────────────────────────────────────────────────────────────────────

export const Ex_SCR08_ReportFilter = ({
  values,
  onFilter,
  onReset,
  loading,
}: {
  values: FilterValues
  onFilter: (v: FilterValues) => void
  onReset: () => void
  loading: boolean
}) => (
  <FilterBar
    fields={[
      makeSearchField({ placeholder: 'Tìm theo tiêu đề, mã biên bản...' }),
      makeReportSubTypeField(),
      makeDepartmentField(fetchDepts),
      makeWorkflowStatusField(),
      makeDateRangeField({ fromKey: 'fromDate', toKey: 'toDate' }),
    ]}
    values={values}
    onFilter={onFilter}
    onReset={onReset}
    loading={loading}
    data-testid="report-filter-bar"
  />
)

// ─────────────────────────────────────────────────────────────────────────────
// SCR-11 — WorkflowListPage
// Filter: category, workflowStatus, department
// Compact — chỉ 3 filters
// ─────────────────────────────────────────────────────────────────────────────

export const Ex_SCR11_WorkflowFilter = ({
  values,
  onFilter,
  onReset,
  loading,
}: {
  values: FilterValues
  onFilter: (v: FilterValues) => void
  onReset: () => void
  loading: boolean
}) => (
  <FilterBar
    fields={[
      makeCategoryField({ colSpan: 7 }),
      makeWorkflowStatusField({ colSpan: 7 }),
      makeDepartmentField(fetchDepts, { colSpan: 7 }),
    ]}
    values={values}
    onFilter={onFilter}
    onReset={onReset}
    loading={loading}
    data-testid="workflow-filter-bar"
  />
)

// ─────────────────────────────────────────────────────────────────────────────
// SCR-17 — UserListPage
// Filter: keyword, role (ObjectId), department, isActive, dateRange
// ─────────────────────────────────────────────────────────────────────────────

export const Ex_SCR17_UserFilter = ({
  values,
  onFilter,
  onReset,
  loading,
}: {
  values: FilterValues
  onFilter: (v: FilterValues) => void
  onReset: () => void
  loading: boolean
}) => (
  <FilterBar
    fields={[
      makeSearchField({ placeholder: 'Tìm theo username, họ tên...' }),
      makeRoleAsyncField(fetchRoles),
      makeDepartmentField(fetchDepts),
      makeIsActiveField(),
      makeDateRangeField({ fromKey: 'fromDate', toKey: 'toDate' }),
    ]}
    values={values}
    onFilter={onFilter}
    onReset={onReset}
    loading={loading}
    data-testid="user-filter-bar"
  />
)

// ─────────────────────────────────────────────────────────────────────────────
// SCR-24 — AuditListPage
// Filter: action (select enum), performedBy (async user), user (async user), dateRange
// ─────────────────────────────────────────────────────────────────────────────

export const Ex_SCR24_AuditFilter = ({
  values,
  onFilter,
  onReset,
  loading,
}: {
  values: FilterValues
  onFilter: (v: FilterValues) => void
  onReset: () => void
  loading: boolean
}) => (
  <FilterBar
    fields={[
      makeAuditActionField({ colSpan: 6 }),
      makeUserField(fetchUsers, {
        key: 'performedBy',
        label: 'Thực hiện bởi',
        colSpan: 6,
      }),
      makeUserField(fetchUsers, {
        key: 'user',
        label: 'Đối tượng',
        colSpan: 6,
      }),
      makeDateRangeField({
        fromKey: 'fromDate',
        toKey: 'toDate',
        colSpan: 6,
      }),
    ]}
    values={values}
    onFilter={onFilter}
    onReset={onReset}
    loading={loading}
    data-testid="audit-filter-bar"
  />
)

// ─────────────────────────────────────────────────────────────────────────────
// SCR-25 — AuditDashboardPage
// Filter: dateRange only (minimal)
// ─────────────────────────────────────────────────────────────────────────────

export const Ex_SCR25_AuditDashboardFilter = ({
  values,
  onFilter,
  onReset,
}: {
  values: FilterValues
  onFilter: (v: FilterValues) => void
  onReset: () => void
}) => (
  <FilterBar
    fields={[
      makeDateRangeField({
        label: 'Khoảng thời gian',
        fromKey: 'fromDate',
        toKey: 'toDate',
        colSpan: 10,
      }),
    ]}
    values={values}
    onFilter={onFilter}
    onReset={onReset}
    submitLabel="Áp dụng"
    data-testid="audit-dashboard-filter"
  />
)

// ─────────────────────────────────────────────────────────────────────────────
// SCR-26 — PerformancePage
// Filter: from + to date (API params: "from", "to")
// ─────────────────────────────────────────────────────────────────────────────

export const Ex_SCR26_PerformanceFilter = ({
  values,
  onFilter,
  onReset,
}: {
  values: FilterValues
  onFilter: (v: FilterValues) => void
  onReset: () => void
}) => (
  <FilterBar
    fields={[
      makeDateRangeField({
        label: 'Thời gian',
        fromKey: 'from',
        toKey: 'to',
        colSpan: 10,
      }),
    ]}
    values={values}
    onFilter={onFilter}
    onReset={onReset}
    data-testid="performance-filter-bar"
  />
)

// ─────────────────────────────────────────────────────────────────────────────
// Collapsible variant — dùng khi panel quá rộng (nhiều filters)
// ─────────────────────────────────────────────────────────────────────────────

export const Ex_CollapsibleFilter = ({
  values,
  onFilter,
  onReset,
  loading,
}: {
  values: FilterValues
  onFilter: (v: FilterValues) => void
  onReset: () => void
  loading: boolean
}) => (
  <FilterBar
    fields={[
      makeSearchField(),
      makeProposalSubTypeField(),
      makeDepartmentField(fetchDepts),
      makeWorkflowStatusField(),
      makeIsActiveField(),
      makeDateRangeField(),
    ]}
    values={values}
    onFilter={onFilter}
    onReset={onReset}
    loading={loading}
    collapsible
    defaultExpanded={false}
    data-testid="collapsible-filter-bar"
  />
)

// ─────────────────────────────────────────────────────────────────────────────
// Integration pattern với useTableFilter hook
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pattern chuẩn dùng FilterBar + useTableFilter + DataTable trong một Page:
 *
 * function ProposalListPage() {
 *   const { filters, setFilters, resetFilters, page, pageSize, setPage } = useTableFilter({
 *     isActive: 'true',  // default filter
 *   })
 *
 *   const { data, isLoading } = useDocumentList({
 *     category: 'PROPOSAL',
 *     ...filters,
 *     page,
 *     limit: pageSize,
 *   })
 *
 *   return (
 *     <>
 *       <PageHeader title="Danh sách Đề xuất" />
 *       <FilterBar
 *         fields={proposalFilterFields}
 *         values={filters}
 *         onFilter={setFilters}   ← setFilters auto-reset page=1
 *         onReset={resetFilters}
 *         loading={isLoading}
 *       />
 *       <DataTable
 *         dataSource={data?.data ?? []}
 *         columns={proposalColumns}
 *         pagination={data?.pagination}
 *         loading={isLoading}
 *         onTableChange={({ page }) => setPage(page)}
 *       />
 *     </>
 *   )
 * }
 */

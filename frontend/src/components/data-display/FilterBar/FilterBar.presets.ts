import type {
  SearchFilterField,
  SelectFilterField,
  DateRangeFilterField,
  AsyncSelectFilterField,
  SelectOption,
} from './FilterBar.types'

// ─────────────────────────────────────────────────────────────────────────────
// Field factory functions
//
// Mỗi factory tạo ra FilterField config cho một loại filter thường gặp.
// Caller dùng factories thay vì khai báo thủ công từng field object.
//
// Nguồn: PROJECT_UNDERSTANDING filter specs per screen:
//   SCR-05: keyword, subType(3), department, status, isActive, fromDate, toDate
//   SCR-08: keyword, subType(2), department, status, fromDate, toDate
//   SCR-11: category, status, department
//   SCR-17: keyword, role, department, isActive, fromDate, toDate
//   SCR-24: action, performedBy, user, fromDate, toDate
//   SCR-25: fromDate, toDate
//   SCR-26: from, to (date)
// ─────────────────────────────────────────────────────────────────────────────

// ── Search field ─────────────────────────────────────────────────────────────

/**
 * Tạo search input field.
 * Dùng ở: SCR-05 (keyword), SCR-08 (keyword), SCR-17 (keyword)
 */
export function makeSearchField(options?: {
  key?: string
  label?: string
  placeholder?: string
  colSpan?: number
  debounceMs?: number
}): SearchFilterField {
  return {
    type: 'search',
    key: options?.key ?? 'keyword',
    label: options?.label ?? 'Tìm kiếm',
    placeholder: options?.placeholder ?? 'Nhập từ khóa...',
    colSpan: options?.colSpan ?? 6,
    allowClear: true,
    debounceMs: options?.debounceMs ?? 400,
  }
}

// ── Date range field ──────────────────────────────────────────────────────────

/**
 * Tạo date range filter field (từ ngày — đến ngày).
 * Dùng ở: SCR-05, SCR-08, SCR-17, SCR-24, SCR-25, SCR-26
 */
export function makeDateRangeField(options?: {
  key?: string
  label?: string
  fromKey?: string
  toKey?: string
  colSpan?: number
}): DateRangeFilterField {
  return {
    type: 'dateRange',
    key: options?.key ?? 'dateRange',
    label: options?.label ?? 'Thời gian',
    fromKey: options?.fromKey ?? 'fromDate',
    toKey: options?.toKey ?? 'toDate',
    colSpan: options?.colSpan ?? 8,
    format: 'DD/MM/YYYY',
  }
}

// ── Workflow status filter ────────────────────────────────────────────────────

/** Options trạng thái duyệt — dùng ở SCR-05, SCR-08, SCR-11 */
export const WORKFLOW_STATUS_OPTIONS: SelectOption[] = [
  { value: 'pending', label: 'Chờ duyệt', color: 'warning' },
  { value: 'approved', label: 'Đã duyệt', color: 'success' },
  { value: 'rejected', label: 'Từ chối', color: 'error' },
]

/**
 * Tạo workflow status select filter.
 * Dùng ở: SCR-05 (status), SCR-08 (status), SCR-11 (status)
 */
export function makeWorkflowStatusField(options?: {
  key?: string
  colSpan?: number
}): SelectFilterField {
  return {
    type: 'select',
    key: options?.key ?? 'status',
    label: 'Trạng thái duyệt',
    placeholder: 'Tất cả trạng thái',
    options: WORKFLOW_STATUS_OPTIONS,
    allowClear: true,
    colSpan: options?.colSpan ?? 5,
  }
}

// ── isActive filter ───────────────────────────────────────────────────────────

/** Options trạng thái hoạt động */
export const IS_ACTIVE_OPTIONS: SelectOption[] = [
  { value: 'true', label: 'Hoạt động', color: 'success' },
  { value: 'false', label: 'Vô hiệu', color: 'default' },
]

/**
 * Tạo isActive filter.
 * Dùng ở: SCR-05 (isActive), SCR-17 (isActive)
 */
export function makeIsActiveField(options?: {
  key?: string
  colSpan?: number
}): SelectFilterField {
  return {
    type: 'select',
    key: options?.key ?? 'isActive',
    label: 'Trạng thái',
    placeholder: 'Tất cả',
    options: IS_ACTIVE_OPTIONS,
    allowClear: true,
    colSpan: options?.colSpan ?? 4,
  }
}

// ── Document subType filter ───────────────────────────────────────────────────

/** SubType options cho PROPOSAL — SCR-05 */
export const PROPOSAL_SUB_TYPE_OPTIONS: SelectOption[] = [
  { value: 'PROPOSE_REPAIR', label: 'Đề xuất sửa chữa', color: 'orange' },
  { value: 'PROPOSE_INK', label: 'Đề xuất mực in', color: 'cyan' },
  { value: 'PROPOSE_PROCUREMENT', label: 'Đề xuất mua sắm', color: 'green' },
]

/** SubType options cho REPORT — SCR-08 */
export const REPORT_SUB_TYPE_OPTIONS: SelectOption[] = [
  { value: 'CHECK_DAMAGE', label: 'Biên bản kiểm tra hư hỏng', color: 'orange' },
  { value: 'CONFIRM_STATUS', label: 'Biên bản xác nhận tình trạng', color: 'cyan' },
]

/**
 * Tạo proposal subType filter.
 * Dùng ở: SCR-05
 */
export function makeProposalSubTypeField(options?: {
  key?: string
  colSpan?: number
}): SelectFilterField {
  return {
    type: 'select',
    key: options?.key ?? 'subType',
    label: 'Loại đề xuất',
    placeholder: 'Tất cả loại',
    options: PROPOSAL_SUB_TYPE_OPTIONS,
    allowClear: true,
    colSpan: options?.colSpan ?? 6,
  }
}

/**
 * Tạo report subType filter.
 * Dùng ở: SCR-08
 */
export function makeReportSubTypeField(options?: {
  key?: string
  colSpan?: number
}): SelectFilterField {
  return {
    type: 'select',
    key: options?.key ?? 'subType',
    label: 'Loại biên bản',
    placeholder: 'Tất cả loại',
    options: REPORT_SUB_TYPE_OPTIONS,
    allowClear: true,
    colSpan: options?.colSpan ?? 7,
  }
}

// ── Document category filter ──────────────────────────────────────────────────

/** Category options — SCR-11 */
export const DOCUMENT_CATEGORY_OPTIONS: SelectOption[] = [
  { value: 'PROPOSAL', label: 'Đề xuất', color: 'blue' },
  { value: 'REPORT', label: 'Biên bản', color: 'purple' },
]

/**
 * Tạo document category filter.
 * Dùng ở: SCR-11 (WorkflowList)
 */
export function makeCategoryField(options?: {
  key?: string
  colSpan?: number
}): SelectFilterField {
  return {
    type: 'select',
    key: options?.key ?? 'category',
    label: 'Loại tài liệu',
    placeholder: 'Tất cả loại',
    options: DOCUMENT_CATEGORY_OPTIONS,
    allowClear: true,
    colSpan: options?.colSpan ?? 5,
  }
}

// ── Role filter ───────────────────────────────────────────────────────────────

/** Role options — SCR-17 */
export const ROLE_FILTER_OPTIONS: SelectOption[] = [
  { value: 'ADMIN', label: 'ADMIN', color: 'purple' },
  { value: 'IT', label: 'IT', color: 'blue' },
  { value: 'USER', label: 'USER', color: 'default' },
]

/**
 * Tạo role filter.
 * Dùng ở: SCR-17 (UserList)
 * NOTE: Caller truyền ObjectId nếu API cần ObjectId.
 *       Dùng asyncSelect thay vì select nếu roles load từ API.
 */
export function makeRoleField(options?: {
  key?: string
  colSpan?: number
}): SelectFilterField {
  return {
    type: 'select',
    key: options?.key ?? 'role',
    label: 'Vai trò',
    placeholder: 'Tất cả vai trò',
    options: ROLE_FILTER_OPTIONS,
    allowClear: true,
    colSpan: options?.colSpan ?? 5,
  }
}

// ── Audit action filter ───────────────────────────────────────────────────────

/** Audit action options — SCR-24 */
export const AUDIT_ACTION_OPTIONS: SelectOption[] = [
  { value: 'LOGIN', label: 'Đăng nhập' },
  { value: 'LOGOUT', label: 'Đăng xuất' },
  { value: 'CREATE', label: 'Tạo mới' },
  { value: 'UPDATE', label: 'Cập nhật' },
  { value: 'DELETE', label: 'Xóa' },
  { value: 'DISABLE', label: 'Vô hiệu hóa' },
  { value: 'RESTORE', label: 'Khôi phục' },
  { value: 'RESET_PASSWORD', label: 'Reset mật khẩu' },
  { value: 'CHANGE_PASSWORD', label: 'Đổi mật khẩu' },
  { value: 'FORGOT_PASSWORD', label: 'Quên mật khẩu' },
  { value: 'ASSIGN_ROLE', label: 'Gán vai trò' },
  { value: 'VIEW_DETAIL', label: 'Xem chi tiết' },
]

/**
 * Tạo audit action filter.
 * Dùng ở: SCR-24 (AuditList)
 */
export function makeAuditActionField(options?: {
  key?: string
  colSpan?: number
}): SelectFilterField {
  return {
    type: 'select',
    key: options?.key ?? 'action',
    label: 'Loại hành động',
    placeholder: 'Tất cả hành động',
    options: AUDIT_ACTION_OPTIONS,
    allowClear: true,
    colSpan: options?.colSpan ?? 6,
  }
}

// ── AsyncSelect — Department ──────────────────────────────────────────────────

/**
 * Tạo department async select filter.
 * Dùng ở: SCR-05, SCR-08, SCR-11, SCR-17
 * Caller truyền fetchFn để load từ GET /api/departments.
 */
export function makeDepartmentField(
  fetchDepartments: () => Promise<SelectOption[]>,
  options?: {
    key?: string
    colSpan?: number
  },
): AsyncSelectFilterField {
  return {
    type: 'asyncSelect',
    key: options?.key ?? 'department',
    label: 'Phòng ban',
    placeholder: 'Tất cả phòng ban',
    fetchOptions: fetchDepartments,
    queryKey: ['departments', 'list'],
    allowClear: true,
    colSpan: options?.colSpan ?? 5,
  }
}

/**
 * Tạo user async select filter (cho performedBy, user field trong audit).
 * Dùng ở: SCR-24 (performedBy, user)
 */
export function makeUserField(
  fetchUsers: () => Promise<SelectOption[]>,
  options?: {
    key?: string
    label?: string
    colSpan?: number
  },
): AsyncSelectFilterField {
  return {
    type: 'asyncSelect',
    key: options?.key ?? 'user',
    label: options?.label ?? 'Người dùng',
    placeholder: 'Tất cả người dùng',
    fetchOptions: fetchUsers,
    queryKey: ['users', 'filter-options'],
    allowClear: true,
    colSpan: options?.colSpan ?? 5,
  }
}

// ── Role async select (ObjectId-based, cho SCR-17 user filter) ────────────────

/**
 * Tạo role filter dạng async (load ObjectId từ API).
 * Dùng khi SCR-17 API cần ObjectId của role, không phải tên.
 */
export function makeRoleAsyncField(
  fetchRoles: () => Promise<SelectOption[]>,
  options?: {
    key?: string
    colSpan?: number
  },
): AsyncSelectFilterField {
  return {
    type: 'asyncSelect',
    key: options?.key ?? 'role',
    label: 'Vai trò',
    placeholder: 'Tất cả vai trò',
    fetchOptions: fetchRoles,
    queryKey: ['rbac', 'roles'],
    allowClear: true,
    colSpan: options?.colSpan ?? 5,
  }
}

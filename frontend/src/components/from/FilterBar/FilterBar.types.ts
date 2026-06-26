import type { CSSProperties, ReactNode } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// SelectOption — value/label pair dùng trong status, subType, category, role selects
// ─────────────────────────────────────────────────────────────────────────────

export interface SelectOption {
  value: string
  label: string
  /** Màu AntD Tag — dùng khi render option dạng colored tag */
  color?: string
  disabled?: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// FilterField — mô tả một ô filter trong FilterBar
//
// FilterBar là generic — không hardcode domain nào.
// Caller khai báo fields[] → FilterBar render đúng input type.
//
// 6 input types phủ toàn bộ nhu cầu của 7 screens có filter:
//
//  search      → keyword search (SCR-05,08,11,17)
//  select      → dropdown đơn: subType, status, isActive, category, role, action (SCR-05,08,11,17,24)
//  dateRange   → from + to date (SCR-05,08,17,24,25,26)
//  asyncSelect → load options từ API: department (SCR-05,08,11,17)
//  custom      → ReactNode bất kỳ — escape hatch cho field đặc biệt
// ─────────────────────────────────────────────────────────────────────────────

export type FilterFieldType = 'search' | 'select' | 'dateRange' | 'asyncSelect' | 'custom'

/** Base — tất cả field types đều có */
interface FilterFieldBase {
  /** Unique key — dùng làm URL param name */
  key: string
  /** Label hiển thị trên form item */
  label: string
  /** Placeholder text */
  placeholder?: string
  /** Độ rộng cột trong grid (antd Col span, default 6 = 1/4 width) */
  colSpan?: number
  /** Disable field này */
  disabled?: boolean
}

/** Search Input — full-text keyword */
export interface SearchFilterField extends FilterFieldBase {
  type: 'search'
  /** Cho phép xóa nhanh bằng X button. @default true */
  allowClear?: boolean
  /**
   * Debounce delay ms — FilterBar xử lý debounce nội bộ khi type là 'search'.
   * onFilter sẽ fire sau delay này.
   * @default 400
   */
  debounceMs?: number
}

/** Select — dropdown với fixed options list */
export interface SelectFilterField extends FilterFieldBase {
  type: 'select'
  /** Danh sách options */
  options: SelectOption[]
  /** Cho phép xóa selection. @default true */
  allowClear?: boolean
  /** Multiple selection. @default false */
  multiple?: boolean
}

/** Date Range — from + to date picker */
export interface DateRangeFilterField extends FilterFieldBase {
  type: 'dateRange'
  /**
   * Keys cho from/to — default là `${key}From` / `${key}To`.
   * Ví dụ key="date" → fromKey="dateFrom", toKey="dateTo"
   * Hoặc override: fromKey="fromDate", toKey="toDate"
   */
  fromKey?: string
  toKey?: string
  /** Format hiển thị. @default 'DD/MM/YYYY' */
  format?: string
}

/** AsyncSelect — load options từ API */
export interface AsyncSelectFilterField extends FilterFieldBase {
  type: 'asyncSelect'
  /**
   * Function fetch options — caller truyền vào.
   * FilterBar chỉ gọi khi component mount.
   */
  fetchOptions: () => Promise<SelectOption[]>
  /** React Query cache key — tránh re-fetch không cần thiết */
  queryKey: string[]
  /** Cho phép xóa. @default true */
  allowClear?: boolean
}

/** Custom — escape hatch cho field phức tạp */
export interface CustomFilterField extends FilterFieldBase {
  type: 'custom'
  /** Caller tự render input, FilterBar chỉ wrap trong Form.Item */
  render: (value: string | undefined, onChange: (v: string | undefined) => void) => ReactNode
}

/** Union of all field types */
export type FilterField =
  | SearchFilterField
  | SelectFilterField
  | DateRangeFilterField
  | AsyncSelectFilterField
  | CustomFilterField

// ─────────────────────────────────────────────────────────────────────────────
// FilterValues — object lưu trạng thái filter
// Key là FilterField.key, value là string (vì URL params là string)
// DateRange field tách thành 2 keys: fromKey + toKey
// ─────────────────────────────────────────────────────────────────────────────

export type FilterValues = Record<string, string | string[] | undefined>

// ─────────────────────────────────────────────────────────────────────────────
// FilterBar props
// ─────────────────────────────────────────────────────────────────────────────

export interface FilterBarProps {
  // ── Field definitions ────────────────────────────────────────────────────
  /**
   * Danh sách filter fields cần render.
   * Thứ tự = thứ tự hiển thị trong grid.
   */
  fields: FilterField[]

  // ── Controlled values ────────────────────────────────────────────────────
  /**
   * Giá trị filter hiện tại (controlled).
   * Thường được đồng bộ từ useTableFilter hook (URL searchParams).
   */
  values: FilterValues

  // ── Events ───────────────────────────────────────────────────────────────
  /**
   * Callback khi user click "Áp dụng" hoặc Enter trong search field.
   * Truyền full values object.
   */
  onFilter: (values: FilterValues) => void

  /**
   * Callback khi user click "Xóa bộ lọc".
   * FilterBar không tự clear — caller chịu trách nhiệm reset state.
   */
  onReset: () => void

  // ── Loading ───────────────────────────────────────────────────────────────
  /**
   * Disable buttons khi đang fetch data.
   * @default false
   */
  loading?: boolean

  // ── Layout ────────────────────────────────────────────────────────────────
  /**
   * Cho phép collapse/expand panel filter.
   * Khi collapsible=true, hiện icon mũi tên toggle.
   * @default false
   */
  collapsible?: boolean

  /**
   * Trạng thái ban đầu khi collapsible=true.
   * @default true (expanded)
   */
  defaultExpanded?: boolean

  /**
   * Số cột trong grid layout.
   * Mặc định: 4 (desktop), 2 (tablet), 1 (mobile).
   * Override toàn bộ nếu truyền vào.
   */
  columns?: number

  // ── Label buttons ─────────────────────────────────────────────────────────
  /**
   * Label cho nút submit.
   * @default 'Áp dụng'
   */
  submitLabel?: string

  /**
   * Label cho nút reset.
   * @default 'Xóa bộ lọc'
   */
  resetLabel?: string

  /**
   * Ẩn nút reset.
   * @default false
   */
  hideReset?: boolean

  // ── Style ─────────────────────────────────────────────────────────────────
  className?: string
  style?: CSSProperties
  'data-testid'?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal types (chỉ dùng bên trong FilterBar)
// ─────────────────────────────────────────────────────────────────────────────

/** State nội bộ của FilterBar — draft values trước khi submit */
export type DraftValues = FilterValues

/** Helper: lấy dateRange keys từ field */
export function getDateRangeKeys(field: DateRangeFilterField): {
  fromKey: string
  toKey: string
} {
  return {
    fromKey: field.fromKey ?? `${field.key}From`,
    toKey: field.toKey ?? `${field.key}To`,
  }
}

/** Helper: tính số fields đang có giá trị (để hiện badge "N bộ lọc đang áp dụng") */
export function countActiveFilters(values: FilterValues): number {
  return Object.values(values).filter(
    (v) => v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0),
  ).length
}

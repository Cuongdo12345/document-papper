import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Col, DatePicker, Form, Input, Row, Select, Space } from 'antd'
import {
  SearchOutlined,
  FilterOutlined,
  ClearOutlined,
  DownOutlined,
  UpOutlined,
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import type {
  FilterBarProps,
  FilterField,
  FilterValues,
  DraftValues,
  DateRangeFilterField,
  SelectFilterField,
  AsyncSelectFilterField,
  SearchFilterField,
  CustomFilterField,
} from './FilterBar.types'
import { getDateRangeKeys, countActiveFilters } from './FilterBar.types'
import styles from './FilterBar.module.css'
import dayjs from 'dayjs';

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components — một input type per component
// Tách nhỏ để dễ test và tránh re-render không cần thiết.
// ─────────────────────────────────────────────────────────────────────────────

/** Search input với debounce nội bộ */
function SearchInput({
  field,
  value,
  onChange,
}: {
  field: SearchFilterField
  value: string | undefined
  onChange: (v: string | undefined) => void
}) {
  const [local, setLocal] = useState(value ?? '')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync external value → local khi reset
  useEffect(() => {
    setLocal(value ?? '')
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    setLocal(v)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (field.debounceMs && field.debounceMs > 0) {
      debounceRef.current = setTimeout(() => {
        onChange(v || undefined)
      }, field.debounceMs)
    } else {
      onChange(v || undefined)
    }
  }

  const handleClear = () => {
    setLocal('')
    onChange(undefined)
  }

  return (
    <Input
      prefix={<SearchOutlined className={styles.searchIcon} />}
      placeholder={field.placeholder ?? 'Nhập từ khóa...'}
      value={local}
      onChange={handleChange}
      onClear={handleClear}
      allowClear={field.allowClear !== false}
      disabled={field.disabled}
      data-testid={`filter-search-${field.key}`}
    />
  )
}

/** Select với fixed options */
function SelectInput({
  field,
  value,
  onChange,
}: {
  field: SelectFilterField
  value: string | string[] | undefined
  onChange: (v: string | string[] | undefined) => void
}) {
  return (
    <Select
      placeholder={field.placeholder ?? 'Chọn...'}
      value={value}
      onChange={(v) => onChange(v ?? undefined)}
      allowClear={field.allowClear !== false}
      mode={field.multiple ? 'multiple' : undefined}
      disabled={field.disabled}
      style={{ width: '100%' }}
      options={field.options.map((opt) => ({
        value: opt.value,
        label: opt.label,
        disabled: opt.disabled,
      }))}
      data-testid={`filter-select-${field.key}`}
    />
  )
}

/** DateRange picker — from + to */
function DateRangeInput({
  field,
  values,
  onChange,
}: {
  field: DateRangeFilterField
  values: FilterValues
  onChange: (fromKey: string, toKey: string, from?: string, to?: string) => void
}) {
  const { fromKey, toKey } = getDateRangeKeys(field)
  const fmt = field.format ?? 'DD/MM/YYYY'
  // const dayjs = (await import('dayjs')).default

  const fromVal = values[fromKey]
    ? dayjs(values[fromKey] as string)
    : null
  const toVal = values[toKey]
    ? dayjs(values[toKey] as string)
    : null

  return (
    <DatePicker.RangePicker
      value={[fromVal, toVal]}
      format={fmt}
      disabled={field.disabled}
      allowEmpty={[true, true]}
      placeholder={['Từ ngày', 'Đến ngày']}
      style={{ width: '100%' }}
      onChange={(dates) => {
        const from = dates?.[0]?.toISOString()
        const to = dates?.[1]?.toISOString()
        onChange(fromKey, toKey, from, to)
      }}
      disabledDate={(current) => {
        // Chỉ block nếu to < from — validate bên trong DatePicker.RangePicker
        return false
      }}
      data-testid={`filter-daterange-${field.key}`}
    />
  )
}

/** AsyncSelect — load options từ API một lần khi mount */
function AsyncSelectInput({
  field,
  value,
  onChange,
}: {
  field: AsyncSelectFilterField
  value: string | undefined
  onChange: (v: string | undefined) => void
}) {
  const { data: options = [], isLoading } = useQuery({
    queryKey: field.queryKey,
    queryFn: field.fetchOptions,
    staleTime: 5 * 60_000, // departments ít thay đổi
  })

  return (
    <Select
      placeholder={field.placeholder ?? 'Chọn...'}
      value={value}
      onChange={(v) => onChange(v ?? undefined)}
      allowClear={field.allowClear !== false}
      loading={isLoading}
      disabled={field.disabled || isLoading}
      style={{ width: '100%' }}
      options={options.map((opt) => ({ value: opt.value, label: opt.label }))}
      data-testid={`filter-async-${field.key}`}
    />
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// FilterBar main component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * FilterBar — Generic filter panel cho tất cả List pages.
 *
 * Hoạt động theo pattern:
 *   1. Controlled từ bên ngoài — `values` là single source of truth
 *   2. Nội bộ duy trì `draft` state — user thay đổi input nhưng chưa submit
 *   3. Khi click "Áp dụng" → onFilter(draft) → parent cập nhật URL + refetch
 *   4. Search field là ngoại lệ — debounce rồi tự động submit (UX nhanh hơn)
 *   5. Khi click "Xóa bộ lọc" → onReset() → parent clear URL params
 *
 * Responsive grid:
 *   xl: 4 cột (mỗi field colSpan=6/24)
 *   lg: 3 cột
 *   md: 2 cột
 *   sm/xs: 1 cột
 *
 * @example
 * // SCR-05 ProposalListPage
 * <FilterBar
 *   fields={[
 *     makeSearchField(),
 *     makeProposalSubTypeField(),
 *     makeDepartmentField(fetchDepts),
 *     makeWorkflowStatusField(),
 *     makeIsActiveField(),
 *     makeDateRangeField(),
 *   ]}
 *   values={filters}
 *   onFilter={setFilters}
 *   onReset={resetFilters}
 *   loading={isLoading}
 * />
 */
export function FilterBar({
  fields,
  values,
  onFilter,
  onReset,
  loading = false,
  collapsible = false,
  defaultExpanded = true,
  submitLabel = 'Áp dụng',
  resetLabel = 'Xóa bộ lọc',
  hideReset = false,
  className,
  style,
  'data-testid': testId,
}: FilterBarProps) {
  // ── Draft state — copy của values, thay đổi khi user input ──────────────
  const [draft, setDraft] = useState<DraftValues>({ ...values })

  // ── Collapse state ────────────────────────────────────────────────────────
  const [expanded, setExpanded] = useState(defaultExpanded)

  // Sync draft khi values thay đổi từ bên ngoài (vd: user navigate, reset)
  useEffect(() => {
    setDraft({ ...values })
  }, [values])

  // ── Draft update helpers ──────────────────────────────────────────────────
  const updateDraft = useCallback((key: string, value: string | string[] | undefined) => {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }, [])

  const updateDraftDateRange = useCallback(
    (fromKey: string, toKey: string, from?: string, to?: string) => {
      setDraft((prev) => ({
        ...prev,
        [fromKey]: from,
        [toKey]: to,
      }))
    },
    [],
  )

  // ── Submit & Reset ────────────────────────────────────────────────────────
  const handleSubmit = useCallback(() => {
    onFilter(draft)
  }, [draft, onFilter])

  const handleReset = useCallback(() => {
    onReset()
    // draft sẽ được sync lại qua useEffect khi values được clear từ parent
  }, [onReset])

  // Search field auto-submit sau debounce
  const handleSearchChange = useCallback(
    (key: string, value: string | undefined) => {
      updateDraft(key, value)
      // Search tự submit ngay sau debounce (đã xử lý trong SearchInput)
      setDraft((prev) => {
        const next = { ...prev, [key]: value }
        onFilter(next)
        return next
      })
    },
    [updateDraft, onFilter],
  )

  // ── Render field theo type ────────────────────────────────────────────────
  const renderField = useCallback(
    (field: FilterField) => {
      switch (field.type) {
        case 'search':
          return (
            <SearchInput
              field={field}
              value={draft[field.key] as string | undefined}
              onChange={(v) => handleSearchChange(field.key, v)}
            />
          )

        case 'select':
          return (
            <SelectInput
              field={field as SelectFilterField}
              value={draft[field.key] as string | undefined}
              onChange={(v) => updateDraft(field.key, v as string | undefined)}
            />
          )

        case 'dateRange': {
          const f = field as DateRangeFilterField
          return (
            <DateRangeInput
              field={f}
              values={draft}
              onChange={updateDraftDateRange}
            />
          )
        }

        case 'asyncSelect':
          return (
            <AsyncSelectInput
              field={field as AsyncSelectFilterField}
              value={draft[field.key] as string | undefined}
              onChange={(v) => updateDraft(field.key, v)}
            />
          )

        case 'custom': {
          const f = field as CustomFilterField
          return f.render(
            draft[field.key] as string | undefined,
            (v) => updateDraft(field.key, v),
          )
        }

        default:
          return null
      }
    },
    [draft, handleSearchChange, updateDraft, updateDraftDateRange],
  )

  // ── Active filter count (cho badge trên collapse button) ─────────────────
  const activeCount = countActiveFilters(values)

  // ── Col span map per field ────────────────────────────────────────────────
  // Default: colSpan=6 → 6/24 = 1/4 width (4 cột trên desktop)
  // DateRange: colSpan=8 → 1/3 width
  const getColProps = (field: FilterField) => {
    const span = field.colSpan ?? 6
    return {
      xs: 24,
      sm: 24,
      md: Math.min(span * 2, 24),  // 2 cột trên tablet
      lg: span,
      xl: span,
    }
  }

  return (
    <div
      className={[styles.wrapper, className].filter(Boolean).join(' ')}
      style={style}
      data-testid={testId ?? 'filter-bar'}
    >
      {/* Collapse header — chỉ hiện khi collapsible=true */}
      {collapsible && (
        <div
          className={styles.collapseHeader}
          onClick={() => setExpanded((v) => !v)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-label={expanded ? 'Thu gọn bộ lọc' : 'Mở rộng bộ lọc'}
        >
          <Space>
            <FilterOutlined />
            <span className={styles.collapseTitle}>Bộ lọc</span>
            {activeCount > 0 && !expanded && (
              <span className={styles.activeBadge}>{activeCount}</span>
            )}
          </Space>
          {expanded ? <UpOutlined /> : <DownOutlined />}
        </div>
      )}

      {/* Filter fields grid */}
      {(!collapsible || expanded) && (
        <div className={styles.fieldsWrapper}>
          <Form layout="vertical" className={styles.form}>
            <Row gutter={[12, 8]} align="bottom">
              {/* Render từng field */}
              {fields.map((field) => (
                <Col key={field.key} {...getColProps(field)}>
                  <Form.Item
                    label={field.label}
                    className={styles.formItem}
                  >
                    {renderField(field)}
                  </Form.Item>
                </Col>
              ))}

              {/* Action buttons — luôn ở cuối, align bottom */}
              <Col
                xs={24}
                sm={24}
                md={24}
                lg={4}
                xl={4}
                className={styles.actionsCol}
              >
                <Form.Item label=" " className={styles.formItem}>
                  <Space className={styles.actionButtons}>
                    {!hideReset && (
                      <Button
                        icon={<ClearOutlined />}
                        onClick={handleReset}
                        disabled={loading || activeCount === 0}
                        data-testid="filter-reset-btn"
                      >
                        {resetLabel}
                      </Button>
                    )}
                    <Button
                      type="primary"
                      icon={<FilterOutlined />}
                      onClick={handleSubmit}
                      loading={loading}
                      data-testid="filter-submit-btn"
                    >
                      {submitLabel}
                    </Button>
                  </Space>
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </div>
      )}

      {/* Active filter summary — hiện khi có filter đang áp dụng */}
      {activeCount > 0 && (
        <div className={styles.activeSummary} data-testid="filter-active-summary">
          <span className={styles.activeSummaryText}>
            Đang lọc với {activeCount} điều kiện
          </span>
          {!hideReset && (
            <Button
              type="link"
              size="small"
              onClick={handleReset}
              className={styles.clearAllLink}
              data-testid="filter-clear-all-link"
            >
              Xóa tất cả
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

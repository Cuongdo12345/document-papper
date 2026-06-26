// src/components/dashboard/filters/dashboard-filter.types.ts
//
// Dashboard Module — Filter Types
// Source: DASHBOARD_UI_SPEC.md §5 · DASHBOARD_ANALYSIS.md §8 · dashboard.dto.ts (FE-08C)
//
// 3 nhóm filter trong Dashboard — KHÔNG dùng FilterBar (CMP-05):
//   Tab 2 — Department Selector (1 field, đơn giản)
//   Tab 5/6 — Filter Panel (3 field: department, fromDate, toDate)
//   Tab 7 — Filter Panel bắt buộc (2 field: month, year)
//
// Lý do không dùng FilterBar: SHARED_COMPONENTS_LIBRARY.md §3 CMP-05 —
// FilterBar thiết kế cho list pages nhiều field + URL sync + draft state phức tạp.
// Dashboard filter đơn giản hơn, không sync URL (DASHBOARD_UI_SPEC.md §12.3).

import type dayjs from 'dayjs';

// ─── Tab 2 — Department Selector ───────────────────────────────────────────────

/**
 * Option cho Select phòng ban — dùng chung Tab 2, Tab 5, Tab 6.
 * Build từ response GET /api/departments (departmentList query — ngoài phạm vi Dashboard module).
 */
export interface DepartmentOption {
  value: string; // departmentId (ObjectId string)
  label: string; // departmentName
}

/**
 * State của Tab 2 Department Selector.
 * Không có "filter form" thực sự — chỉ 1 giá trị chọn duy nhất, áp dụng ngay khi đổi
 * (không cần nút "Áp dụng" — DASHBOARD_UI_SPEC.md §5.1 không đề cập nút riêng).
 */
export interface DepartmentSelectorValue {
  departmentId: string | undefined; // undefined = chưa chọn
}

// ─── Tab 5 & 6 — Top Damaged Filter ────────────────────────────────────────────

/**
 * Draft state — giá trị user đang chỉnh trong filter panel, CHƯA submit.
 * Tách biệt với applied state để tránh fetch liên tục khi user đang thao tác.
 */
export interface TopDamagedFilterDraft {
  department: string | undefined; // ObjectId hoặc undefined (Tất cả phòng ban)
  dateRange: [dayjs.Dayjs | null, dayjs.Dayjs | null] | null; // RangePicker value
}

/**
 * Applied state — giá trị đã submit, truyền trực tiếp vào GetTopDamagedParams (dashboard.dto.ts).
 * fromDate/toDate đã convert sang ISO string trước khi đưa vào đây.
 */
export interface TopDamagedFilterApplied {
  department?: string;
  fromDate?: string; // ISO string — dayjs(date).toISOString()
  toDate?: string; // ISO string
}

/** Giá trị mặc định cho draft state khi mount Tab 5/6 lần đầu */
export const TOP_DAMAGED_FILTER_DRAFT_DEFAULT: TopDamagedFilterDraft = {
  department: undefined,
  dateRange: null,
};

// ─── Tab 7 — Device Stats Filter (bắt buộc) ────────────────────────────────────

/**
 * Filter Tab 7 — month/year BẮT BUỘC, khác Tab 5/6 (optional).
 * Không có draft/applied tách biệt — Tab 7 auto-trigger ngay khi đổi giá trị
 * (DASHBOARD_UI_SPEC.md §12.4 — "không cần nút Áp dụng riêng").
 */
export interface DeviceStatsFilterValue {
  month: number; // 1–12, bắt buộc
  year: number; // 4 chữ số, bắt buộc
}

/** Option cho Select Tháng — value 1-12, label "Tháng 1".."Tháng 12" */
export interface MonthOption {
  value: number;
  label: string;
}

/** Option cho Select Năm — value là số năm cụ thể */
export interface YearOption {
  value: number;
  label: string;
}

// ─── Status Filter ──────────────────────────────────────────────────────────────
//
// ⚠️ NEED MORE ANALYSIS:
// DASHBOARD_ANALYSIS.md và DASHBOARD_UI_SPEC.md KHÔNG đề cập bất kỳ filter nào theo
// workflowStatus, category, hay subType trong toàn bộ 7 tab Dashboard.
// 7 APIs (DASHBOARD_DATA_DISCOVERY.md) cũng không có query param dạng "status".
// Không tự tạo Status Filter vì không có cơ sở từ tài liệu nguồn — nếu nghiệp vụ
// cần filter này, phải bổ sung vào DASHBOARD_ANALYSIS.md và API trước.

// src/constants/department.constants.ts
//
// Nguồn: STATE_MAPPING_v2.md §7.4 · API_LAYER_SPEC.md §3
// ⚠️ Query key LIST phải kèm params — khác hoàn toàn v1 ['departments', 'list'] không params
// Lý do: GET /api/departments CÓ pagination/filter/sort — params khác → cache khác

import type { GetDepartmentsParams } from '../../types/department/department.dto';

// ─── Query Keys ────────────────────────────────────────────────────────────────

/**
 * Query key factory cho Department module
 * Nguồn: STATE_MAPPING_v2.md §8 + API_LAYER_SPEC.md §3.2
 *
 * ⚠️ QUAN TRỌNG: `list(params)` PHẢI có params trong key
 * STATE_MAPPING_v2.md Changelog #1:
 *   v1 sai: ['departments', 'list']        — không params
 *   v2 đúng: ['departments', 'list', params] — phải có params để cache riêng theo filter/page/sort
 */
export const DEPARTMENT_QUERY_KEYS = {
  /** Root scope — dùng để invalidate toàn bộ department cache */
  all: ['departments'] as const,

  /** List với đầy đủ filter/pagination/sort params */
  list: (params: GetDepartmentsParams) =>
    ['departments', 'list', params] as const,

  /** Detail theo ID */
  detail: (id: string) =>
    ['departments', 'detail', id] as const,
} as const;

// ─── Mutation Keys ─────────────────────────────────────────────────────────────

/**
 * Mutation keys cho DevTools tracking + có thể dùng với `useMutationState`
 * Nguồn: STATE_MAPPING_v2.md §8 (mutationKeys.departments.*)
 */
export const DEPARTMENT_MUTATION_KEYS = {
  create: ['departments', 'create'] as const,
  update: (id: string) => ['departments', 'update', id] as const,
  delete: (id: string) => ['departments', 'delete', id] as const,
} as const;

// ─── Cache Strategy ────────────────────────────────────────────────────────────

/**
 * staleTime: 5 phút — Department data thay đổi ít, đây là master data
 * gcTime: 15 phút — giữ cache lâu hơn để navigation giữa tabs nhanh
 * Nguồn: STATE_MAPPING_v2.md §7.4
 */
export const DEPARTMENT_STALE_TIME = 5 * 60_000;  // 5 phút
export const DEPARTMENT_GC_TIME    = 15 * 60_000; // 15 phút

// ─── List Defaults ─────────────────────────────────────────────────────────────

/**
 * Default params cho Department List — khớp với backend defaults (Audit confirmed)
 * Nguồn: STATE_MAPPING_v2.md §7.4 + Filter Forms section
 */
export const DEPARTMENT_LIST_DEFAULTS = {
  page:    1,
  sortBy:  'code',
  order:   'asc' as const,
  // limit: lấy từ preference.store.defaultPageSize (20) — không hardcode ở đây
} satisfies Partial<GetDepartmentsParams>;

// ─── Table Config ──────────────────────────────────────────────────────────────

/** Empty text hiển thị trong DataTable khi không có phòng ban nào */
export const DEPARTMENT_EMPTY_TEXT = 'Chưa có phòng ban nào';

// ─── FilterBar Config ──────────────────────────────────────────────────────────

/**
 * Keys của filter params — dùng khi parse/set URL SearchParams
 * Nguồn: DEPARTMENT_UI_SPEC.md §4
 */
export const DEPARTMENT_FILTER_KEYS = {
  keyword: 'keyword',
  code:    'code',
  name:    'name',
  page:    'page',
  limit:   'limit',
  sortBy:  'sortBy',
  order:   'order',
} as const;

export type DepartmentFilterKey = typeof DEPARTMENT_FILTER_KEYS[keyof typeof DEPARTMENT_FILTER_KEYS];

// ─── FilterBar Field Config ────────────────────────────────────────────────────

/**
 * Cấu hình 3 fields cho FilterBar — dùng tại DepartmentListPage
 * Nguồn: DEPARTMENT_UI_SPEC.md §4
 * Quyết định đã chốt: dùng FilterBar (không inline filter) — SHARED_COMPONENTS_LIBRARY.md §9
 */
export const DEPARTMENT_FILTER_FIELDS = [
  {
    type:        'search' as const,
    key:         DEPARTMENT_FILTER_KEYS.keyword,
    label:       'Tìm kiếm',
    placeholder: 'Tìm theo mã hoặc tên phòng ban...',
    debounceMs:  300,
    allowClear:  true,
    colSpan:     8,
  },
  // {
  //   type:        'search' as const,
  //   key:         DEPARTMENT_FILTER_KEYS.code,
  //   label:       'Mã phòng ban',
  //   placeholder: 'Lọc theo mã...',
  //   debounceMs:  300,
  //   allowClear:  true,
  //   colSpan:     8,
  // },
  // {
  //   type:        'search' as const,
  //   key:         DEPARTMENT_FILTER_KEYS.name,
  //   label:       'Tên phòng ban',
  //   placeholder: 'Lọc theo tên...',
  //   debounceMs:  300,
  //   allowClear:  true,
  //   colSpan:     8,
  // },
];

// ─── Error Messages ────────────────────────────────────────────────────────────

/**
 * Error messages dùng trong toast/error display
 * Nguồn: DEPARTMENT_MODULE_ANALYSIS.md §22
 * ⚠️ Message cụ thể từ backend khi xóa bị từ chối (400 — còn ràng buộc) chưa xác nhận
 *    → fallback sang đọc error.response?.data?.message từ API
 */
export const DEPARTMENT_ERROR_MESSAGES = {
  LOAD_LIST_FAILED:   'Không thể tải danh sách phòng ban',
  LOAD_DETAIL_FAILED: 'Không thể tải thông tin phòng ban',
  CREATE_FAILED:      'Tạo phòng ban thất bại',
  UPDATE_FAILED:      'Cập nhật phòng ban thất bại',
  DELETE_FAILED:      'Xóa phòng ban thất bại',
  NOT_FOUND:          'Không tìm thấy phòng ban',
  UNKNOWN:            'Có lỗi xảy ra, vui lòng thử lại',
} as const;

// ─── Success Messages ──────────────────────────────────────────────────────────

export const DEPARTMENT_SUCCESS_MESSAGES = {
  CREATE: 'Tạo phòng ban thành công',
  UPDATE: 'Cập nhật phòng ban thành công',
  DELETE: 'Xóa phòng ban thành công',
} as const;

// ─── Modal Config ──────────────────────────────────────────────────────────────

/** Modal width cố định cho Create/Edit form (2 field đơn giản) */
export const DEPARTMENT_MODAL_WIDTH = 480;

// ─── Delete Confirm Config ─────────────────────────────────────────────────────

/**
 * Cấu hình useConfirm() cho Delete Department
 * Nguồn: DEPARTMENT_UI_SPEC.md §8 — dùng useConfirm(), không dùng AppModal
 * Hard delete — cảnh báo rõ ràng không thể hoàn tác
 */
export const DEPARTMENT_DELETE_CONFIRM = {
  title:       'Xóa phòng ban',
  variant:     'critical' as const,
  confirmText: 'Xóa',
  cancelText:  'Hủy',
  //`Bạn có chắc muốn xóa "${name}"? <br /> Hành động này không thể hoàn tác.`
} as const;

// Thêm vào src/constants/department.constants.ts

export const DEPARTMENT_ROUTES = {
  LIST:          '/departments',
  DETAIL: (id: string) => `/departments/${id}`,
} as const
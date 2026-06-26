// // src/hooks/app/useTableFilter.ts
// //
// // Hook đồng bộ URL SearchParams ↔ filter/pagination/sort state cho List pages.
// //
// // Pattern sử dụng:
// //   const { filters, setFilters, resetFilters, page, pageSize, sortBy, order }
// //     = useTableFilter({ defaults, filterKeys })
// //
// // Nguyên tắc:
// //   - URL SearchParams là single source of truth — không có local useState riêng
// //   - Tất cả thay đổi (filter, page, sort) đều đi qua setFilters → cập nhật URL
// //   - React Query tự refetch khi params thay đổi (params derive từ URL)
// //   - Shareable URL: user copy link giữ nguyên filter/page/sort state

// import { useCallback, useMemo } from 'react';
// import { useSearchParams } from 'react-router-dom';

// // ─────────────────────────────────────────────────────────────────────────────
// // Types
// // ─────────────────────────────────────────────────────────────────────────────

// export type SortOrder = 'asc' | 'desc';

// /** Giá trị của 1 filter field từ URL — luôn là string hoặc undefined */
// export type FilterValues = Record<string, string | string[] | undefined>;

// /** Payload từ DataTable.onTableChange */
// export interface TableChangePayload {
//   page:      number;
//   pageSize:  number;
//   sortBy?:   string;
//   order?:    SortOrder;
// }

// export interface UseTableFilterOptions {
//   /**
//    * Default values cho các param.
//    * Được dùng khi URL không có param đó.
//    * Ví dụ: { page: 1, sortBy: 'code', order: 'asc', limit: 20 }
//    */
//   defaults?: {
//     page?:    number;
//     limit?:   number;
//     sortBy?:  string;
//     order?:   SortOrder;
//     [key: string]: string | number | undefined;
//   };

//   /**
//    * Danh sách key được phép đọc/ghi vào URL.
//    * Key không có trong list này sẽ bị bỏ qua khi reset.
//    * Ví dụ: ['keyword', 'code', 'name', 'page', 'limit', 'sortBy', 'order']
//    */
//   filterKeys?: string[];
// }

// export interface UseTableFilterReturn {
//   /** Toàn bộ filter values từ URL SearchParams (string | undefined) */
//   filters:      FilterValues;

//   /** Cập nhật một hoặc nhiều params vào URL cùng lúc */
//   setFilters:   (values: FilterValues) => void;

//   /** Xóa toàn bộ filter keys khỏi URL, giữ lại page=1 và sort defaults */
//   resetFilters: () => void;

//   /** Trang hiện tại (number, default 1) */
//   page:         number;

//   /** Số item mỗi trang (number, default 20) */
//   pageSize:     number;

//   /** Field đang sort (string) */
//   sortBy:       string;

//   /** Chiều sort ('asc' | 'desc') */
//   order:        SortOrder;
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // Constants
// // ─────────────────────────────────────────────────────────────────────────────

// const DEFAULT_PAGE      = 1;
// const DEFAULT_PAGE_SIZE = 20;
// const DEFAULT_SORT_BY   = '';
// const DEFAULT_ORDER     = 'asc' as SortOrder;

// // Keys được coi là pagination/sort — không bị xóa khi resetFilters
// const PAGINATION_SORT_KEYS = ['page', 'limit', 'sortBy', 'order'] as const;

// // ─────────────────────────────────────────────────────────────────────────────
// // Hook
// // ─────────────────────────────────────────────────────────────────────────────

// export function useTableFilter(
//   options: UseTableFilterOptions = {},
// ): UseTableFilterReturn {
//   const { defaults = {}, filterKeys = [] } = options;

//   const [searchParams, setSearchParams] = useSearchParams();

//   // ── Helpers ─────────────────────────────────────────────────────────────

//   /** Đọc string param từ URL, fallback về default */
//   const getParam = useCallback(
//     (key: string, fallback = ''): string => {
//       return searchParams.get(key) ?? String(defaults[key] ?? fallback);
//     },
//     [searchParams, defaults],
//   );

//   /** Đọc number param từ URL, fallback về default */
//   const getNumberParam = useCallback(
//     (key: string, fallback: number): number => {
//       const raw = searchParams.get(key);
//       if (raw === null) return (defaults[key] as number) ?? fallback;
//       const parsed = parseInt(raw, 10);
//       return isNaN(parsed) ? fallback : parsed;
//     },
//     [searchParams, defaults],
//   );

//   // ── Derived values ───────────────────────────────────────────────────────

//   const page = getNumberParam('page', DEFAULT_PAGE);

//   const pageSize = getNumberParam('limit', DEFAULT_PAGE_SIZE);

//   const sortBy = getParam('sortBy', DEFAULT_SORT_BY);

//   const order = getParam('order', DEFAULT_ORDER) as SortOrder;

//   /**
//    * Toàn bộ filter values từ URL.
//    * Bao gồm cả pagination/sort keys để caller có thể dùng trực tiếp.
//    */
//   const filters: FilterValues = useMemo(() => {
//     const result: FilterValues = {};

//     // Đọc tất cả filterKeys từ URL
//     const keysToRead =
//       filterKeys.length > 0
//         ? filterKeys
//         : Array.from(searchParams.keys());

//     keysToRead.forEach((key) => {
//       const value = searchParams.get(key);
//       result[key] = value ?? undefined;
//     });

//     // Đảm bảo pagination/sort luôn có giá trị (dùng defaults nếu không có trong URL)
//     if (!result['page'])   result['page']   = String(page);
//     if (!result['limit'])  result['limit']  = String(pageSize);
//     if (!result['sortBy']) result['sortBy'] = sortBy || undefined;
//     if (!result['order'])  result['order']  = order;

//     return result;
//   }, [searchParams, filterKeys, page, pageSize, sortBy, order]);

//   // ── Actions ──────────────────────────────────────────────────────────────

//   /**
//    * Cập nhật URL SearchParams.
//    * - Giá trị undefined / chuỗi rỗng → xóa key khỏi URL (Axios cũng bỏ qua undefined)
//    * - Merge với params hiện tại — không overwrite toàn bộ URL
//    */
//   const setFilters = useCallback(
//     (values: FilterValues) => {
//       setSearchParams(
//         (prev) => {
//           const next = new URLSearchParams(prev);

//           Object.entries(values).forEach(([key, value]) => {
//             if (value === undefined || value === '' || value === null) {
//               next.delete(key);
//             } else if (Array.isArray(value)) {
//               // Multi-value: xóa cũ rồi append từng giá trị
//               next.delete(key);
//               value.forEach((v) => {
//                 if (v !== undefined && v !== '') next.append(key, v);
//               });
//             } else {
//               next.set(key, String(value));
//             }
//           });

//           return next;
//         },
//         { replace: true }, // replace: true — không push vào browser history khi filter
//       );
//     },
//     [setSearchParams],
//   );

//   /**
//    * Reset toàn bộ filter keys về trạng thái ban đầu.
//    * - Xóa các filter keys (keyword, code, name, v.v.)
//    * - Giữ lại defaults cho pagination/sort
//    * - Reset page về 1
//    */
//   const resetFilters = useCallback(() => {
//     setSearchParams(
//       (prev) => {
//         const next = new URLSearchParams(prev);

//         // Xóa các filter keys (không phải pagination/sort)
//         const filterOnlyKeys = filterKeys.filter(
//           (k) => !(PAGINATION_SORT_KEYS as readonly string[]).includes(k),
//         );

//         filterOnlyKeys.forEach((key) => next.delete(key));

//         // Reset page về 1
//         next.set('page', '1');

//         // Giữ limit, sortBy, order từ defaults nếu có
//         if (defaults.limit)  next.set('limit',  String(defaults.limit));
//         if (defaults.sortBy) next.set('sortBy', defaults.sortBy);
//         if (defaults.order)  next.set('order',  defaults.order);

//         return next;
//       },
//       { replace: true },
//     );
//   }, [setSearchParams, filterKeys, defaults]);

//   // ── Return ───────────────────────────────────────────────────────────────

//   return {
//     filters,
//     setFilters,
//     resetFilters,
//     page,
//     pageSize,
//     sortBy,
//     order,
//   };
// }

// src/hooks/app/useTableFilter.ts
//
// Nguồn xác nhận:
// - STATE_MANAGEMENT_SPEC.md §1.2 Rule 2 — filter/pagination/sort KHÔNG dùng useState, dùng useSearchParams
// - STATE_MANAGEMENT_SPEC.md §9.2 Category E — debounce 300ms xử lý ở FilterBar (search field), không ở hook này
// - STATE_MANAGEMENT_SPEC.md §20 — file path: hooks/app/useTableFilter.ts, cùng nhóm usePermission.ts/useConfirm.ts
// - FRONTEND_FOUNDATION.md §4.6 — data flow: useTableFilter() đọc URL → filters object → query hook
//                                  → DataTable render → user đổi sort/page → useTableFilter.setFilter() → URL → re-trigger query
// - STATE_MAPPING_v2.md §644 — Department: keyword/code/name/page/limit/sortBy(default 'code')/order(default 'asc')
// - SHARED_COMPONENTS_LIBRARY.md §4/§6 — khớp type FilterValues, TableChangePayload, SortOrder, PageInfo của FilterBar/DataTable
//
// Quyết định đã chốt (theo yêu cầu):
// 1. Generic hook dùng chung mọi module — nhận config { filterKeys, defaultSortBy, ... } qua param,
//    không hardcode riêng Department/Document/User... — khớp pattern usePermission.ts (nhận args, trả object).
// 2. setFilters() LUÔN tự reset page về 1 — không cần page tự gọi resetPage() riêng.

import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { usePreferenceStore } from "../../store/preference.store";

// ─────────────────────────────────────────────────────────────────────────────
// Types — khớp với SHARED_COMPONENTS_LIBRARY.md §6 Shared Types
// ─────────────────────────────────────────────────────────────────────────────

export type SortOrder = "asc" | "desc";

/** Khớp FilterBar.values / FilterBar.onFilter — SHARED_COMPONENTS_LIBRARY.md §4 */
export type FilterValues = Record<string, string | string[] | undefined>;

/** Khớp DataTable.onTableChange payload — SHARED_COMPONENTS_LIBRARY.md §6 */
export interface TableChangePayload {
  page: number;
  pageSize: number;
  sortBy?: string;
  order?: SortOrder;
}

/** Config truyền vào hook — mỗi module tự khai báo theo GetXxxParams của mình */
export interface UseTableFilterConfig {
  /** Danh sách key filter của module (không gồm page/limit/sortBy/order) */
  filterKeys: string[];
  /** Sort field mặc định khi URL chưa có sortBy */
  defaultSortBy: string;
  /** Thứ tự mặc định — default 'asc' nếu không truyền */
  defaultOrder?: SortOrder;
  /** Page mặc định — default 1 nếu không truyền */
  defaultPage?: number;
  /**
   * Limit mặc định — nếu không truyền, lấy từ preference.store.defaultPageSize
   * (đúng STATE_MAPPING_v2.md §5: "limit default preference.store.defaultPageSize — không hardcode")
   */
  defaultLimit?: number;
}

export interface UseTableFilterReturn<
  TParams extends Record<string, unknown> = Record<string, unknown>,
> {
  /** Chỉ các field trong filterKeys — truyền trực tiếp vào FilterBar.values */
  filters: FilterValues;
  page: number;
  limit: number;
  sortBy: string;
  order: SortOrder;
  /** filters + page + limit + sortBy + order — ghép sẵn để truyền trực tiếp vào query hook (params) */
  params: TParams;
  /** Truyền vào FilterBar.onFilter — set lại URL SearchParams, LUÔN reset page về 1 */
  setFilters: (values: FilterValues) => void;
  /** Truyền vào FilterBar.onReset — clear toàn bộ filterKeys khỏi URL, reset page về 1 */
  resetFilters: () => void;
  /** Truyền vào DataTable.onTableChange — cập nhật page/limit/sortBy/order */
  setTableChange: (change: TableChangePayload) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useTableFilter<
  TParams extends Record<string, unknown> = Record<string, unknown>,
>(config: UseTableFilterConfig): UseTableFilterReturn<TParams> {
  const {
    filterKeys,
    defaultSortBy,
    defaultOrder = "asc",
    defaultPage = 1,
    defaultLimit,
  } = config;

  const [searchParams, setSearchParams] = useSearchParams();

  // preference.store.defaultPageSize — chỉ đọc khi caller không tự truyền defaultLimit
  const storeDefaultLimit = usePreferenceStore((s) => s.defaultPageSize);
  const resolvedDefaultLimit = defaultLimit ?? storeDefaultLimit;

  // ── Đọc state từ URL SearchParams (nguồn sự thật duy nhất — không dùng useState) ──

  const filters = useMemo<FilterValues>(() => {
    const result: FilterValues = {};
    filterKeys.forEach((key) => {
      const values = searchParams.getAll(key);
      if (values.length === 0) return;
      result[key] = values.length > 1 ? values : values[0];
    });
    return result;
  }, [searchParams, filterKeys]);

  const page = Number(searchParams.get("page") ?? defaultPage);
  const limit = Number(searchParams.get("limit") ?? resolvedDefaultLimit);
  const sortBy = searchParams.get("sortBy") ?? defaultSortBy;
  const order = (searchParams.get("order") as SortOrder | null) ?? defaultOrder;

  // const params = useMemo(
  //   () => ({ ...filters, page, limit, sortBy, order }) as TParams,
  //   [filters, page, limit, sortBy, order],
  // );

  // ✅ Sửa — ép qua unknown trước, đúng theo thông báo TS gợi ý
  const params = useMemo(
    () => ({ ...filters, page, limit, sortBy, order }) as unknown as TParams,
    [filters, page, limit, sortBy, order],
  );

  // ── Ghi state vào URL SearchParams ──

  const setFilters = useCallback(
    (values: FilterValues) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);

        filterKeys.forEach((key) => {
          next.delete(key);
          const value = values[key];

          if (value === undefined || value === "") return;

          if (Array.isArray(value)) {
            value.forEach((v) => next.append(key, v));
          } else {
            next.set(key, value);
          }
        });

        // Quyết định đã chốt: setFilters() LUÔN tự reset page=1
        next.set("page", "1");

        return next;
      });
    },
    [setSearchParams, filterKeys],
  );

  const resetFilters = useCallback(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      filterKeys.forEach((key) => next.delete(key));
      next.set("page", "1");
      return next;
    });
  }, [setSearchParams, filterKeys]);

  const setTableChange = useCallback(
    (change: TableChangePayload) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);

        next.set("page", String(change.page));
        next.set("limit", String(change.pageSize));

        if (change.sortBy) {
          next.set("sortBy", change.sortBy);
        } else {
          next.delete("sortBy");
        }

        if (change.order) {
          next.set("order", change.order);
        } else {
          next.delete("order");
        }

        return next;
      });
    },
    [setSearchParams],
  );

  return {
    filters,
    page,
    limit,
    sortBy,
    order,
    params,
    setFilters,
    resetFilters,
    setTableChange,
  };
}

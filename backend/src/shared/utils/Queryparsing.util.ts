// shared/utils/queryParsing.util.ts
import ApiError from "../errors/ApiError";
import { Model } from "mongoose";
import { APP_UTC_OFFSET } from "../constants/timezone.constant";

export type SortOrder = "asc" | "desc";

export interface ParsedPagination {
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: SortOrder;
}

export interface ParsePaginationOptions {
  /**
   * Danh sách field hợp lệ cho sortBy — chặn client truyền field bất kỳ
   * (kể cả path lồng nhau/không tồn tại) thẳng vào `$sort` của aggregation.
   * Trước đây mọi controller dashboard nhận `sortBy` từ query rồi đưa thẳng
   * vào `sortStage[sortBy] = ...` không whitelist.
   */
  allowedSortBy: readonly string[];
  defaultSortBy: string;
  defaultSortOrder?: SortOrder;
  defaultLimit?: number;
  /** Giới hạn cứng limit tối đa — tránh client truyền limit rất lớn làm aggregation nặng. */
  maxLimit?: number;
}

/**
 * Parse + validate toàn bộ query param phân trang/sắp xếp dùng chung cho
 * mọi endpoint dashboard, thay vì mỗi controller tự parse tay
 * (page/limit/sortBy/sortOrder lặp lại 5 lần, không clamp limit, không
 * whitelist sortBy, không validate sortOrder).
 */
export const parsePaginationQuery = (
  query: Record<string, any>,
  options: ParsePaginationOptions,
): ParsedPagination => {
  const {
    allowedSortBy,
    defaultSortBy,
    defaultSortOrder = "desc",
    defaultLimit = 10,
    maxLimit = 100,
  } = options;

  let page = Number(query.page);
  if (!Number.isFinite(page) || page < 1) {
    page = 1;
  }

  let limit = Number(query.limit);
  if (!Number.isFinite(limit) || limit < 1) {
    limit = defaultLimit;
  }
  if (limit > maxLimit) {
    limit = maxLimit;
  }

  const requestedSortBy = query.sortBy != null ? String(query.sortBy) : defaultSortBy;
  const sortBy = allowedSortBy.includes(requestedSortBy) ? requestedSortBy : defaultSortBy;

  const requestedSortOrder = String(query.sortOrder ?? defaultSortOrder).toLowerCase();
  const sortOrder: SortOrder = requestedSortOrder === "asc" ? "asc" : "desc";

  return { page, limit, sortBy, sortOrder };
};

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * BR-09 (DEV-097, 2026-09-29) — đổi 1 mốc của khoảng ngày ("Từ ngày"/"Đến
 * ngày") thành `Date`.
 *
 * Vì sao cần: ô `<input type="date">` ở frontend gửi chuỗi `YYYY-MM-DD`, và
 * `new Date("2026-09-29")` theo chuẩn JS là 00:00 **UTC** = 07:00 sáng giờ VN
 * (bất kể TZ của process). Hệ quả trước đây: "Đến ngày 29/9" (`$lte`) chỉ lấy
 * tới 07:00 sáng 29/9 → bỏ sót gần hết dữ liệu của chính ngày đó; "Từ ngày"
 * bỏ sót 0h–7h của ngày đầu.
 *
 * Quy ước mới — chỉ áp cho chuỗi CHỈ CÓ NGÀY `YYYY-MM-DD`:
 *   - `start` → 00:00:00.000 giờ VN của ngày đó;
 *   - `end`   → 23:59:59.999 giờ VN của ngày đó (bao trọn cả ngày, dùng với `$lte`).
 * Chuỗi có giờ đầy đủ (ISO datetime, vd client gửi `toISOString()`) giữ
 * nguyên như cũ — client đã chỉ định chính xác thời điểm.
 *
 * KHÔNG validate — giá trị sai trả `Invalid Date` y như `new Date(...)` cũ
 * (các call site có DTO riêng validate trước). Cần throw 400 thì dùng
 * `parseOptionalDate`.
 */
export const parseDateRangeBound = (value: unknown, bound: "start" | "end"): Date => {
  const raw = String(value).trim();
  if (DATE_ONLY_PATTERN.test(raw)) {
    const time = bound === "start" ? "00:00:00.000" : "23:59:59.999";
    return new Date(`${raw}T${time}${APP_UTC_OFFSET}`);
  }
  return new Date(raw);
};

/**
 * Parse 1 query param dạng ngày (fromDate/toDate) — throw 400 rõ ràng nếu
 * client truyền giá trị không parse được thành Date, thay vì âm thầm tạo ra
 * `Invalid Date` (trước đây `new Date(String(fromDate))` không được validate,
 * `Invalid Date` lọt vào `$match.createdAt.$gte` khiến Mongo trả kết quả
 * không như mong đợi mà không báo lỗi gì).
 *
 * BR-09 (DEV-097): thêm `bound` — chuỗi `YYYY-MM-DD` hiểu theo ngày giờ VN,
 * xem `parseDateRangeBound`.
 */
export const parseOptionalDate = (
  value: unknown,
  fieldName: string,
  bound: "start" | "end",
): Date | undefined => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const date = parseDateRangeBound(value, bound);
  if (Number.isNaN(date.getTime())) {
    throw ApiError.badRequest(`${fieldName} không hợp lệ`);
  }

  return date;
};

/* =========================================================================
   PHẦN BỔ SUNG — 3 hàm dưới đây còn thiếu so với những gì `dashboard.service.ts`
   / `export.service.ts` (module excel) đang cần, migrate nguyên vẹn từ
   `dashboard.utils.ts` cũ (giờ xoá, dùng chung 1 nguồn duy nhất ở đây).
========================================================================= */
 
/** Chuyển {sortBy, sortOrder} đã parse thành 1 sort stage dùng thẳng trong pipeline aggregate. */
export const buildSortStage = (sortBy: string, sortOrder: SortOrder): Record<string, 1 | -1> => ({
  [sortBy]: sortOrder === "asc" ? 1 : -1,
});
 
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
 
export const buildPaginationMeta = (page: number, limit: number, total: number): PaginationMeta => ({
  page,
  limit,
  total,
  totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
});
 
/**
 * Gộp pattern "chạy pipeline 2 lần" (1 lần $count, 1 lần lấy data theo
 * trang) từng lặp lại ở mọi service phân trang (dashboard lẫn
 * import-history của module excel) thành 1 lần round-trip DB duy nhất bằng
 * `$facet`.
 */
export const runPaginatedAggregate = async <T = any>(
  model: Model<any>,
  basePipeline: any[],
  pagination: { page: number; limit: number; sortStage: Record<string, 1 | -1> },
): Promise<{ items: T[]; pagination: PaginationMeta }> => {
  const { page, limit, sortStage } = pagination;
  const skip = (page - 1) * limit;
 
  const [result] = await model.aggregate([
    ...basePipeline,
    {
      $facet: {
        items: [{ $sort: sortStage }, { $skip: skip }, { $limit: limit }],
        totalCount: [{ $count: "total" }],
      },
    },
  ]);
 
  const items: T[] = result?.items ?? [];
  const total: number = result?.totalCount?.[0]?.total ?? 0;
 
  return { items, pagination: buildPaginationMeta(page, limit, total) };
};
 
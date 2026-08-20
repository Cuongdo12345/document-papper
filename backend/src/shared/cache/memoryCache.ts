/**
 * MEMORY CACHE (generic, TTL-based)
 * =================================
 * Cache in-memory dùng chung cho các kết quả tính toán "nặng nhưng ít thay
 * đổi trong khoảng thời gian ngắn" — điển hình là các API dashboard dùng
 * `aggregate`: dù đã tối ưu bằng `$facet`/`Promise.all`, mỗi lần gọi vẫn
 * phải quét + tính toán lại từ đầu. Nếu nhiều user cùng mở dashboard trong
 * vài chục giây, không cần tính lại cho mỗi request — trả kết quả cache là
 * đủ mới trong ngữ cảnh "xem tổng quan" (không phải giao dịch tài chính
 * cần chính xác tuyệt đối theo thời gian thực).
 *
 * Cùng pattern với `services/rbac/permission.cache.ts` đã có sẵn trong
 * project (Map + TTL) để nhất quán code style, không thêm dependency mới
 * (Redis) chỉ vì 1 nhu cầu cache đơn giản, single-instance.
 *
 * ⚠️ GIỚI HẠN (giống permission.cache.ts): đây là cache TRONG RAM CỦA 1
 * PROCESS. Nếu sau này chạy nhiều instance (PM2 cluster/nhiều pod), mỗi
 * instance giữ cache riêng — không đồng bộ giữa các node. Ở quy mô hiện
 * tại (1 instance) không sao; cần chuyển sang Redis nếu scale ngang và cần
 * cache nhất quán giữa các node.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

/**
 * Trả về giá trị cache nếu còn hạn; nếu không (chưa có hoặc hết hạn), gọi
 * `compute()` để lấy giá trị mới, lưu lại vào cache rồi trả về.
 *
 * Nhiều request cùng lúc bị cache-miss (vd 5 user cùng mở dashboard trong
 * cùng 1ms) sẽ CÙNG gọi `compute()` riêng lẻ (không có request-coalescing)
 * — chấp nhận được vì đây chỉ là tối ưu thêm, không phải yêu cầu bắt buộc
 * chỉ 1 lần tính; version sau có thể thêm coalescing bằng cách cache luôn
 * cả Promise đang pending nếu thấy cần.
 */
export const getOrSetCache = async <T>(
  key: string,
  ttlMs: number,
  compute: () => Promise<T>,
): Promise<T> => {
  const entry = cache.get(key);
  if (entry && Date.now() < entry.expiresAt) {
    return entry.value as T;
  }

  const value = await compute();
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
  return value;
};

/** Xoá 1 key cụ thể — dùng khi có action ghi dữ liệu cần cache mới ngay (ít dùng cho dashboard, chủ yếu để đủ bộ API). */
export const clearCacheKey = (key: string): void => {
  cache.delete(key);
};

/** Xoá theo prefix — vd xoá hết cache liên quan "dashboard:" sau 1 thao tác ghi lớn (import Excel, bulk update...). */
export const clearCacheByPrefix = (prefix: string): void => {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
};

export const clearAllMemoryCache = (): void => {
  cache.clear();
};

import { useEffect, useState } from "react";

/**
 * Debounce 1 giá trị (thường dùng cho input tìm kiếm trước khi đưa vào query
 * key React Query — tránh gọi API mỗi lần gõ phím). Đã dự trù ở
 * `FE_ARCHITECTURE.md` Mục 3 (`hooks/` — "usePermission, useDebounce...").
 */
export function useDebounce<T>(value: T, delayMs = 400): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

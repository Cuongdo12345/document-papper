const BLOCK = "animate-pulse rounded-lg bg-muted";

/**
 * [FE-37] Khung chờ đúng hình bố cục `DashboardSummaryLayout` (1 KPI chính + khối
 * KPI phụ, biểu đồ, danh sách) — thay vòng xoay giữa trang, tránh bố cục nhảy
 * khi dữ liệu về. Dùng chung cho Admin Summary + Department Summary.
 */
export function SummarySkeleton({ label }: { label: string }) {
  return (
    <div className="space-y-4" role="status" aria-label={label}>
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className={`h-[92px] sm:w-72 sm:shrink-0 ${BLOCK}`} />
        <div className={`h-[92px] flex-1 ${BLOCK}`} />
      </div>
      <div className={`h-60 ${BLOCK}`} />
      <div className={`h-44 ${BLOCK}`} />
    </div>
  );
}

/** [FE-37] Khung chờ cho widget dạng "lưới KPI + hàng chip + bảng" (Tài sản, Thiết bị y tế). */
export function KpiWidgetSkeleton({ label, cards }: { label: string; cards: 2 | 4 }) {
  return (
    <div className="space-y-3" role="status" aria-label={label}>
      <div className={cards === 4 ? "grid grid-cols-2 gap-3 sm:grid-cols-4" : "grid grid-cols-2 gap-3"}>
        {Array.from({ length: cards }, (_, i) => (
          <div key={i} className={`h-[74px] ${BLOCK}`} />
        ))}
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className={`h-9 w-28 ${BLOCK}`} />
        ))}
      </div>
      <div className={`h-40 ${BLOCK}`} />
    </div>
  );
}

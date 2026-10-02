import { BarChart3 } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";

interface TrendSeries {
  label: string;
  color: "primary" | "chart-2";
  data: { label: string; value: number }[];
}

interface MonthlyTrendBarsProps {
  series: TrendSeries[];
  /** Nhãn trục — merge theo THỨ TỰ (KHÔNG theo `label` string, vì backend trả `_id` số tháng 1-12 hoặc `monthLabel` "YYYY-MM" khác nhau tuỳ endpoint). */
  categories: string[];
  /** [FE-37] Tên biểu đồ cho trình đọc màn hình. */
  label?: string;
  /** [FE-37] Lời nhắn khi không có dữ liệu (không có tháng nào, hoặc mọi tháng đều 0). */
  emptyMessage?: string;
}

/**
 * `primary`/`chart-2` — KHÔNG dùng `info`: `--primary` (H240) và `--info`
 * (H235) quá gần hue, đã đo bằng `validate_palette.js` (dataviz skill) —
 * normal-vision ΔE 11.3, dưới ngưỡng bắt buộc 15 (không phân biệt được kể
 * cả mắt thường). `--chart-2` (H185, xem `index.css`) đã validate PASS.
 */
const COLOR_CLASS: Record<TrendSeries["color"], { bar: string; dot: string }> = {
  primary: { bar: "bg-primary", dot: "bg-primary" },
  "chart-2": { bar: "bg-chart-2", dot: "bg-chart-2" },
};

/**
 * FE-09 (nâng cấp UI) — bar chart CSS thuần (KHÔNG thêm charting library —
 * CLAUDE.md Mục 25: không cài dependency chỉ vì tiện). Áp mark spec theo
 * dataviz skill: thanh mảnh + bo góc đầu dữ liệu, khoảng cách 2px giữa các
 * thanh, legend luôn hiện với >=2 series, tooltip hover per-column (CSS
 * `group-hover`, không cần JS state) thay vì chỉ dựa `title` native — chỉ
 * trực quan hoá dữ liệu API thật, không nội suy/làm mượt.
 *
 * [FE-37] Mỗi cột focus được (Tab, hoặc chạm trên điện thoại) → hiện tooltip +
 * có `aria-label` đọc đủ số liệu tháng đó — trước đây chỉ xem được bằng rê
 * chuột. Cột "mọc" từ đáy lên, lệch nhịp nhẹ theo tháng (tắt khi hệ điều hành
 * bật giảm chuyển động — rule chung ở `index.css`). Toàn bộ = 0 thì hiện trạng
 * thái rỗng thay vì 1 hàng cột lùn tối thiểu trông như lỗi hiển thị.
 */
export function MonthlyTrendBars({ series, categories, label = "Biểu đồ cột theo tháng", emptyMessage }: MonthlyTrendBarsProps) {
  const allValues = series.flatMap((s) => s.data.map((d) => d.value));
  const maxValue = Math.max(1, ...allValues);

  if (categories.length === 0 || allValues.every((v) => v === 0)) {
    return <EmptyState icon={BarChart3} title="Chưa có dữ liệu" message={emptyMessage} className="py-8" />;
  }

  return (
    <div className="space-y-3">
      {series.length > 1 && (
        <div className="flex flex-wrap items-center gap-3">
          {series.map((s) => (
            <div key={s.label} className="flex items-center gap-1.5 text-xs">
              <span className={`size-2.5 shrink-0 rounded-full ${COLOR_CLASS[s.color].dot}`} aria-hidden="true" />
              <span className="text-muted-foreground">{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* `overflow-x-auto` kéo theo cắt cả chiều dọc → tooltip phía trên cột từng bị cắt mất.
          `pt-20 -mt-20`: chừa chỗ cho tooltip BÊN TRONG vùng cuộn mà không đổi bố cục. */}
      <div role="list" aria-label={label} className="-mt-20 flex items-end gap-2 overflow-x-auto pt-20 pb-1">
        {categories.map((cat, i) => {
          const values = series.map((s) => ({ label: s.label, value: s.data[i]?.value ?? 0, color: s.color }));
          const total = values.reduce((sum, v) => sum + v.value, 0);

          return (
            <div
              key={cat}
              role="listitem"
              tabIndex={0}
              aria-label={`${cat}: ${values.map((v) => `${v.label} ${v.value}`).join(", ")}`}
              className="group relative flex min-w-9 flex-1 flex-col items-center gap-1.5 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {/* Tooltip — hiện khi hover HOẶC focus cột (bàn phím/chạm), CSS thuần không cần JS state, theo dataviz skill Mục "hover layer by default".
                  `aria-hidden`: nội dung đã có ở `aria-label` của cột, tránh trình đọc màn hình đọc 2 lần. */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute bottom-full z-10 mb-1.5 hidden min-w-max -translate-x-1/2 rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs whitespace-nowrap text-popover-foreground shadow-md group-hover:block group-focus:block"
                style={{ left: "50%" }}
              >
                <p className="mb-1 font-medium">{cat}</p>
                {values.map((v) => (
                  <p key={v.label} className="flex items-center gap-1.5">
                    <span className={`size-1.5 shrink-0 rounded-full ${COLOR_CLASS[v.color].dot}`} aria-hidden="true" />
                    <span className="text-muted-foreground">{v.label}:</span>
                    <span className="font-medium">{v.value}</span>
                  </p>
                ))}
              </div>

              {/* `pt-4` — chừa chỗ cho nhãn giá trị của thanh cao nhất (100%), tránh bị cắt ở mép trên card. */}
              <div className="flex h-36 w-full items-end justify-center gap-0.5 rounded-t-sm pt-4">
                {values.map((v) => {
                  const heightPct = total === 0 ? 2 : Math.max(3, (v.value / maxValue) * 100);
                  return (
                    <div key={v.label} className="relative flex h-full w-full items-end justify-center">
                      {/* Nhãn giá trị TRỰC TIẾP trên thanh — CHỈ khi 1 series (dataviz skill: "selective direct labels,
                          never a number on every point" — với >=2 series con số dày đặc sẽ rối, tooltip hover đã đủ). */}
                      {series.length === 1 && v.value > 0 && (
                        <span
                          aria-hidden="true"
                          className="absolute text-[10px] font-medium text-muted-foreground animate-in fade-in-0 duration-500"
                          style={{ bottom: `calc(${heightPct}% + 4px)` }}
                        >
                          {v.value}
                        </span>
                      )}
                      <div
                        className={`w-full origin-bottom animate-bar-grow rounded-t-sm transition-opacity group-hover:opacity-80 group-focus:opacity-80 ${COLOR_CLASS[v.color].bar}`}
                        style={{ height: `${heightPct}%`, animationDelay: `${i * 25}ms` }}
                      />
                    </div>
                  );
                })}
              </div>
              <span aria-hidden="true" className="text-[10px] text-muted-foreground">
                {cat}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

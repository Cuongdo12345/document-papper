// src/components/charts/BarChartWidget/BarChartWidget.tsx
//
// Generic BarChart widget — tự xử lý Loading/Empty/Error/Data, dùng cho:
//   Tab 1: proposalsByMonth, reportsByMonth (vertical), documentsByDepartment (horizontal)
//   Tab 7: device-stats (vertical)
//
// Khác với 4 chart component chuyên biệt (ProposalConversionChart, DeviceDamageTrendChart,
// TopDamagedDevicesChart, TopDamagedInksChart — đã build FE-08E Phần 2) — những chart đó
// tự gọi hook riêng. BarChartWidget này là PRESENTATIONAL THUẦN, nhận data qua props,
// không tự fetch — vì Tab 1/2/7 dùng chung 1 query cho nhiều widget con.
//
// Source: DASHBOARD_UI_SPEC.md §4.6, §8.3, §10.2, §11.2

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { theme, Empty } from "antd";
import { ChartSkeleton } from "../../dashboard/charts/shared";


export interface BarChartWidgetProps<T> {
  title?: string;
  data: T[];
  loading: boolean;
  /** field dùng làm trục category (X cho vertical, Y cho horizontal) */
  dataKeyX: keyof T & string;
  /** field dùng làm trục giá trị */
  dataKeyY: keyof T & string;
  /** 'vertical' = thanh đứng (default), 'horizontal' = thanh ngang */
  layout?: "vertical" | "horizontal";
  /** Text hiển thị khi data rỗng — bắt buộc truyền theo đúng ngữ cảnh widget */
  emptyText: string;
  height?: number;
  /** Custom tooltip label — default dùng tên field */
  tooltipLabel?: string;
  barColor?: string;
}

export function BarChartWidget<T extends Record<string, any>>({
  data,
  loading,
  dataKeyX,
  dataKeyY,
  layout = "vertical",
  emptyText,
  height = 280,
  tooltipLabel,
  barColor,
}: BarChartWidgetProps<T>) {
  const { token } = theme.useToken();
  const resolvedColor = barColor ?? token.colorPrimary;

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return <ChartSkeleton height={height} showTitle={false} />;
  }

  // ── Empty ──────────────────────────────────────────────────────────────────
  if (data.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height,
        }}
      >
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText} />
      </div>
    );
  }

  // ── Horizontal layout (documentsByDepartment) ────────────────────────────
  if (layout === "horizontal") {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 8, right: 24, left: 0, bottom: 8 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            horizontal={false}
            stroke={token.colorBorderSecondary}
          />
          <YAxis
            type="category"
            dataKey={dataKeyX as string}
            width={140}
            tick={{ fontSize: 12 }}
          />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
          <Tooltip formatter={(v: any) => [v, tooltipLabel ?? dataKeyY]} />
          <Bar
            dataKey={dataKeyY as string}
            fill={resolvedColor}
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  // ── Vertical layout (default — month charts, device-stats) ──────────────
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 24, left: 0, bottom: 8 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={token.colorBorderSecondary}
        />
        <XAxis dataKey={dataKeyX as string} tick={{ fontSize: 12 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} width={40} />
        <Tooltip formatter={(v: any) => [v, tooltipLabel ?? dataKeyY]} />
        <Bar
          dataKey={dataKeyY as string}
          fill={resolvedColor}
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

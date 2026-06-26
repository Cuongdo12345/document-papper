import type { MetricCardColorToken } from './MetricCard.types'

// ─────────────────────────────────────────────────────────────────────────────
// COLOR TOKEN MAP
// Nguồn: DASHBOARD_UI_SPEC.md §3.4
//
// Map token name → AntD CSS variable. Dùng CSS variable (không hardcode hex)
// để tự động đổi theo theme nếu ConfigProvider theme thay đổi.
// 'colorPurple' không phải token chuẩn của AntD — dùng fallback hex khi cần.
// ─────────────────────────────────────────────────────────────────────────────

export const METRIC_CARD_COLOR_MAP: Record<MetricCardColorToken, string> = {
  colorPrimary: 'var(--ant-color-primary, #1677ff)',
  colorInfo:    'var(--ant-color-info, #1677ff)',
  colorSuccess: 'var(--ant-color-success, #52c41a)',
  colorWarning: 'var(--ant-color-warning, #faad14)',
  colorError:   'var(--ant-color-error, #ff4d4f)',
  colorPurple:  '#722ed1', // Không có AntD token chuẩn cho purple — hardcode fallback
}

export function resolveMetricCardColor(token: MetricCardColorToken = 'colorPrimary'): string {
  return METRIC_CARD_COLOR_MAP[token] ?? METRIC_CARD_COLOR_MAP.colorPrimary
}

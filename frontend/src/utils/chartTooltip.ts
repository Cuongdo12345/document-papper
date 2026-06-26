// src/utils/chartTooltip.ts
//
// Helper dùng chung cho prop `formatter` của Recharts <Tooltip>.
//
// Lý do tồn tại: Recharts định nghĩa formatter nhận `ValueType | undefined`
// (ValueType = number | string | Array<number | string>), trong khi cách viết
// tay thông thường `(value: number) => [...]` quá hẹp → TS báo lỗi ts(2322)
// "Type '(value: number) => [number, string]' is not assignable to type
// 'Formatter<ValueType, NameType>'".
//
// Dùng hàm này thay cho việc viết formatter inline ở từng chart để tránh lặp
// lại lỗi type này mỗi khi thêm chart mới.

/**
 * Tạo formatter cho Tooltip — ép giá trị về number, gắn label cố định.
 *
 * @example
 * <Tooltip formatter={formatTooltipValue('Số báo cáo')} />
 * <Tooltip formatter={formatTooltipValue('Số lượng hỏng')} />
 */
export const formatTooltipValue = (label: string) => (value: unknown) => {
  const numericValue = typeof value === 'number' ? value : Number(value ?? 0);
  return [numericValue, label] as [number, string];
};

/**
 * Biến thể có format string tùy chỉnh (vd: thêm "%" cho conversionRate).
 *
 * @example
 * <Tooltip formatter={formatTooltipValueWith('%', (v) => `${v}`)} />
 */
export const formatTooltipValueWith =
  (label: string, format: (value: number) => string) => (value: unknown) => {
    const numericValue = typeof value === 'number' ? value : Number(value ?? 0);
    return [format(numericValue), label] as [string, string];
  };
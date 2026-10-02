import type { MedicalDeviceClass } from "@/types/medicalDevice.types";

/**
 * [MỚI DEV-084] Nhãn + tông màu cho phân loại thiết bị y tế A/B/C/D — theo
 * quy định phân loại rủi ro (TT 42/2016/TT-BYT) RỦI RO TĂNG DẦN A→D. Trước
 * đây `MedicalDeviceSummaryWidget.tsx` dùng 1 màu xám (`variant="default"`)
 * cho cả 4 loại — user yêu cầu thêm màu sắc phân biệt. Chọn thang màu NGỮ
 * NGHĨA tăng dần theo mức rủi ro (không phải màu tuỳ hứng): A thấp nhất
 * (success) → B (info) → C (warning) → D cao nhất (destructive, cùng tông
 * đã dùng cho "Đã quá hạn" ở KpiCard cùng widget) — nhất quán nguyên tắc
 * dataviz "status color phải có ý nghĩa, không chọn ngẫu nhiên".
 *
 * Tách file riêng (không định nghĩa trong `MedicalDeviceSummaryWidget.tsx`)
 * để dùng lại được ở `MedicalDevicesByClassModal.tsx` mà không lặp code.
 */
export const DEVICE_CLASS_CONFIG: Record<
  MedicalDeviceClass,
  { label: string; variant: "default" | "success" | "warning" | "destructive" | "info" | "primary" }
> = {
  A: { label: "Loại A", variant: "success" },
  B: { label: "Loại B", variant: "info" },
  C: { label: "Loại C", variant: "warning" },
  D: { label: "Loại D", variant: "destructive" },
};

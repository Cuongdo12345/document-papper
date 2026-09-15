import { create } from "zustand";

export type ToastVariant = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  variant: ToastVariant;
  message: string;
}

interface ToastState {
  toasts: ToastItem[];
  push: (variant: ToastVariant, message: string) => void;
  dismiss: (id: string) => void;
}

const AUTO_DISMISS_MS = 4000;

/**
 * Toast store — transient UI state (KHÔNG persist, KHÔNG server state).
 * Tự viết nhẹ thay vì thêm dependency mới (Mục 28 FE-01: "Không thêm thư
 * viện mới nếu shadcn/toast hoặc hệ thống hiện tại đã đáp ứng" — chưa có hệ
 * thống nào tồn tại, nên chọn phương án ít phụ thuộc nhất).
 */
export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (variant, message) => {
    const id = crypto.randomUUID();
    set((s) => ({ toasts: [...s.toasts, { id, variant, message }] }));
    setTimeout(() => get().dismiss(id), AUTO_DISMISS_MS);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** API tiện dụng — gọi từ bất kỳ đâu (component/hook), KHÔNG cần `useToastStore()` trực tiếp. */
export const toast = {
  success: (message: string) => useToastStore.getState().push("success", message),
  error: (message: string) => useToastStore.getState().push("error", message),
  warning: (message: string) => useToastStore.getState().push("warning", message),
  info: (message: string) => useToastStore.getState().push("info", message),
};

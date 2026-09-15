import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * UI state store — CHỈ state UI thuần (KHÔNG server data, KHÔNG auth data).
 * STATE_MAPPING.md Mục 2.2 / FE_FOUNDATION_SPEC.md Mục 10.
 *
 * `sidebarCollapsed` persist qua `localStorage` (đây là NGOẠI LỆ duy nhất
 * cho phép persist theo STATE_MAPPING.md — chỉ là default UI preference,
 * không phải dữ liệu nghiệp vụ). `mobileNavOpen` KHÔNG persist (trạng thái
 * tạm thời của phiên hiện tại, luôn đóng lại khi load trang mới).
 */
interface UIState {
  sidebarCollapsed: boolean;
  mobileNavOpen: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  openMobileNav: () => void;
  closeMobileNav: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      mobileNavOpen: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      openMobileNav: () => set({ mobileNavOpen: true }),
      closeMobileNav: () => set({ mobileNavOpen: false }),
    }),
    {
      name: "dp_ui_prefs",
      partialize: (state) => ({ sidebarCollapsed: state.sidebarCollapsed }),
    },
  ),
);

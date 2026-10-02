import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "light" | "dark";

/**
 * UI state store — CHỈ state UI thuần (KHÔNG server data, KHÔNG auth data).
 * STATE_MAPPING.md Mục 2.2 / FE_FOUNDATION_SPEC.md Mục 10.
 *
 * `sidebarCollapsed`/`theme` persist qua `localStorage` (đây là NGOẠI LỆ duy
 * nhất cho phép persist theo STATE_MAPPING.md — chỉ là default UI preference,
 * không phải dữ liệu nghiệp vụ). `mobileNavOpen` KHÔNG persist (trạng thái
 * tạm thời của phiên hiện tại, luôn đóng lại khi load trang mới).
 *
 * [FE-30] `theme` — CHỈ "light"/"dark" (user chọn, KHÔNG có "system" theo
 * yêu cầu). Class `.dark` trên `<html>` được áp bởi `useThemeSync()`
 * (`hooks/useThemeSync.ts`) + 1 đoạn script inline trong `index.html` để
 * tránh FOUC (nháy sai theme trước khi React mount) — đọc THẲNG cùng key
 * `dp_ui_prefs` này, phải đồng bộ nếu đổi cấu trúc persist.
 *
 * [FE-36] `permissionGroupOrder` — thứ tự nhóm quyền user tự kéo thả ở trang
 * Phân quyền (`RolePermissionMatrix`). Cũng chỉ là UI preference theo trình
 * duyệt, dùng chung cho mọi role; `[]` = mặc định A→Z.
 */
interface UIState {
  sidebarCollapsed: boolean;
  mobileNavOpen: boolean;
  theme: Theme;
  permissionGroupOrder: string[];
  setPermissionGroupOrder: (order: string[]) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  openMobileNav: () => void;
  closeMobileNav: () => void;
  toggleTheme: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      mobileNavOpen: false,
      theme: "light",
      permissionGroupOrder: [],
      setPermissionGroupOrder: (order) => set({ permissionGroupOrder: order }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      openMobileNav: () => set({ mobileNavOpen: true }),
      closeMobileNav: () => set({ mobileNavOpen: false }),
      toggleTheme: () => set((s) => ({ theme: s.theme === "dark" ? "light" : "dark" })),
    }),
    {
      name: "dp_ui_prefs",
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        theme: state.theme,
        permissionGroupOrder: state.permissionGroupOrder,
      }),
    },
  ),
);

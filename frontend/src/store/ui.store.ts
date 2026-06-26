// src/store/ui.store.ts
//
// UI Store — Zustand persist 'ui-storage'.
// Source: FRONTEND_MEMORY_v1.md §5 — "ui.store.ts: sidebarCollapsed — persist localStorage"
//
// Chỉ chứa state UI thuần (không phải auth, không phải server data).
// Dùng ở: MainLayout (Sidebar collapse/expand), SidebarCollapseButton.

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface UIState {
  /** Sidebar đang thu gọn (64px) hay mở rộng (240px) */
  sidebarCollapsed: boolean

  /** Đảo trạng thái collapsed — dùng cho SidebarCollapseButton onClick */
  toggleSidebar: () => void

  /** Set trực tiếp — dùng khi cần force 1 trạng thái cụ thể (vd: auto-collapse khi resize) */
  setSidebarCollapsed: (collapsed: boolean) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,

      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
    }),
    {
      name: 'ui-storage',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
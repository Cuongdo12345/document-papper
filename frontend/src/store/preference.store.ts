// src/store/preference.store.ts
//
// Preference Store — lưu user preference cần persist qua reload.
// Nguồn: STATE_MAPPING_v2.md §6 (Preference Store) · FRONTEND_MEMORY_v2.md
//        (Folder Structure + state shape) · USE_TABLE_FILTER.md (consumer:
//        useTableFilter đọc defaultPageSize làm defaultLimit).
//
// Pattern giống auth.store.ts / ui.store.ts đã build trước — Zustand persist
// middleware, KHÔNG đọc/ghi localStorage trực tiếp ở component nào khác.
//
// Persist key: 'preference-storage'
// Partialize: chỉ persist `defaultPageSize` (STATE_MAPPING_v2.md §6: "Partialize:
// chỉ persist defaultPageSize") — store hiện tại chỉ có field này nên partialize
// thực chất persist toàn bộ state, nhưng khai báo rõ ràng để an toàn nếu sau này
// có field khác không cần persist (ví dụ flag tạm thời trong-memory).

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PreferenceState {
  /**
   * Page size mặc định cho mọi DataTable trong hệ thống.
   * STATE_MAPPING_v2.md §6: Type number, Default 20.
   * Source: user action đổi page size trong bất kỳ bảng nào → ghi lại làm
   * default cho lần sau (áp dụng toàn cục, không phải riêng theo từng table).
   */
  defaultPageSize: number;
}

interface PreferenceActions {
  /**
   * Cập nhật defaultPageSize — gọi khi user đổi page size trong bất kỳ
   * DataTable nào (qua DataTable.onTableChange → pageSize mới).
   * STATE_MAPPING_v2.md §6: "Update Trigger: setDefaultPageSize(size) khi
   * user thay đổi page size trong table".
   */
  setDefaultPageSize: (size: number) => void;
}

export type PreferenceStore = PreferenceState & PreferenceActions;

// ─── Default value ──────────────────────────────────────────────────────────────

const DEFAULT_PAGE_SIZE = 10;

// ─── Store ────────────────────────────────────────────────────────────────────

export const usePreferenceStore = create<PreferenceStore>()(
  persist(
    (set) => ({
      // ── Initial State
      defaultPageSize: DEFAULT_PAGE_SIZE,

      // ── Actions
      setDefaultPageSize: (size) => {
        set({ defaultPageSize: size });
      },
    }),
    {
      name: 'preference-storage',
      storage: createJSONStorage(() => localStorage),
      // Chỉ persist defaultPageSize — khớp STATE_MAPPING_v2.md §6 "Partialize"
      partialize: (state) => ({
        defaultPageSize: state.defaultPageSize,
      }),
    },
  ),
);

// ─── Selector tiện ích ──────────────────────────────────────────────────────────
//
// Dùng trong useTableFilter (USE_TABLE_FILTER.md §4 — defaultLimit đọc từ
// preference.store.defaultPageSize, KHÔNG đọc localStorage trực tiếp):
//
//   const defaultPageSize = usePreferenceStore((s) => s.defaultPageSize);
//
// hoặc gọi ngoài React (vd trong useTableFilter khi cần giá trị tại thời điểm
// init, không subscribe re-render):
//
//   const defaultPageSize = usePreferenceStore.getState().defaultPageSize;

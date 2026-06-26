// src/store/notification.store.ts
import { create } from 'zustand';

// Theo STATE_MAPPING.md §5 — Notification Store
// In-memory (không persist) — bridge giữa Axios interceptor (ngoài React)
// và AntD message/notification UI layer (trong React)

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  message: string;
}

interface NotificationState {
  queue: NotificationItem[];
  push: (type: NotificationType, message: string) => void;
  remove: (id: string) => void;
  clear: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  queue: [],

  push: (type, message) =>
    set((state) => ({
      queue: [
        ...state.queue,
        { id: crypto.randomUUID(), type, message },
      ],
    })),

  remove: (id) =>
    set((state) => ({
      queue: state.queue.filter((item) => item.id !== id),
    })),

  clear: () => set({ queue: [] }),
}));

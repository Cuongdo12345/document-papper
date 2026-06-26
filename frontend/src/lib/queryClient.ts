// src/lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query';

// Theo API_LAYER_SPEC.md §12.4 — QueryClient Configuration

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30 giây
      gcTime: 5 * 60 * 1000, // 5 phút
      retry: (failCount, error: any) => {
        const status = error?.response?.status;
        // Không retry 400, 401, 403, 404, 409
        if ([400, 401, 403, 404, 409].includes(status)) return false;
        return status >= 500 && failCount < 1;
      },
      retryDelay: 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0,
    },
  },
});

import { QueryClient } from "@tanstack/react-query";

/**
 * QueryClient global defaults — FE_FOUNDATION_SPEC.md Mục 11.
 * Không over-configure: 4xx không retry (lỗi nghiệp vụ/permission, retry vô
 * ích); 5xx/network retry tối đa 2 lần.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      refetchOnWindowFocus: true,
      retry: (failureCount, error) => {
        const status = (error as { response?: { status?: number } })?.response?.status;
        if (status && status >= 400 && status < 500) return false;
        return failureCount < 2;
      },
    },
    mutations: {
      retry: false,
    },
  },
});

import { RouterProvider } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { queryClient } from "@/lib/queryClient";
import { router } from "@/routes";
import { Toaster } from "@/components/shared/Toaster";
import { useAuthBootstrap } from "@/hooks/useAuthBootstrap";
import { LoadingState } from "@/components/shared/LoadingState";

/**
 * Provider hierarchy — FE_FOUNDATION_SPEC.md Mục 16:
 * QueryClientProvider (server state) bọc ngoài RouterProvider (routing đọc
 * auth state từ Zustand — không cần Provider riêng, Zustand không dùng
 * Context). `Toaster` mount ĐÚNG 1 LẦN ở gốc app (Mục 28 FE-01). Devtools
 * CHỈ bundle ở dev build (Mục 26).
 *
 * FE-01 MICRO-FIX (Session Restore): `useAuthBootstrap()` phải chạy XONG
 * (thử refresh bằng refreshToken localStorage) TRƯỚC khi `RouterProvider`
 * render — tránh `ProtectedRoute`/`PublicRoute`/`RootRedirect` đọc
 * `isAuthenticated=false` tạm thời (accessToken in-memory chưa kịp restore)
 * rồi redirect `/login` sai ngay khi reload trang.
 */
function App() {
  const isInitializing = useAuthBootstrap();

  return (
    <QueryClientProvider client={queryClient}>
      {isInitializing ? (
        <LoadingState variant="spinner" fullScreen label="Đang khôi phục phiên đăng nhập..." />
      ) : (
        <RouterProvider router={router} />
      )}
      <Toaster />
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}

export default App;

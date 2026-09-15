import { useAuthStore } from "@/stores/authStore";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useLogin } from "@/features/auth/hooks/useLogin";
import { useLogout } from "@/features/auth/hooks/useLogout";

/**
 * Facade tiện dụng cho auth state — KHÔNG tạo state mới, chỉ compose lại
 * 2 nguồn đã có (single source of truth theo từng loại dữ liệu,
 * FE_FOUNDATION_SPEC.md Mục 10/32):
 *   - `authStore` (Zustand)  → accessToken/isAuthenticated (session flag).
 *   - `useCurrentUser()` (React Query, `["users","me"]`) → user đầy đủ
 *     (permissions[], role.isSystemRole...) — nguồn DUY NHẤT cho profile.
 *
 * Không lưu lại `user` một lần nữa ở đây — tránh "user ở Zustand + user ở
 * React Query" không lý do (Mục 32 FE-01 spec).
 */
export function useAuth() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { data: user, isLoading: isUserLoading } = useCurrentUser();
  const loginMutation = useLogin();
  const logoutMutation = useLogout();

  return {
    user: user ?? null,
    isAuthenticated,
    // "Đang khôi phục phiên": đã có accessToken (isAuthenticated=true) NHƯNG
    // user CHƯA load xong — dùng để tránh flash /403 hoặc render UI thiếu
    // thông tin ở ProtectedRoute/Header.
    isLoading: isAuthenticated && isUserLoading,
    login: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    loginError: loginMutation.error,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
  };
}

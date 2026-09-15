import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";

/** Route `/` — điều hướng 1 bước duy nhất, không qua trung gian `/app`. */
export function RootRedirect() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return <Navigate to={isAuthenticated ? "/app" : "/login"} replace />;
}

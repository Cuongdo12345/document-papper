/**
 * `refreshToken` CHỈ đọc/ghi qua module này (KHÔNG qua Zustand) — tránh
 * re-render không cần thiết khi token đổi. FE_FOUNDATION_SPEC.md Mục 7.
 * `accessToken` KHÔNG lưu ở đây — in-memory trong authStore (Zustand).
 */
const REFRESH_TOKEN_KEY = "dp_refresh_token";

export const tokenStorage = {
  getRefreshToken(): string | null {
    try {
      return localStorage.getItem(REFRESH_TOKEN_KEY);
    } catch {
      return null;
    }
  },
  setRefreshToken(token: string): void {
    try {
      localStorage.setItem(REFRESH_TOKEN_KEY, token);
    } catch {
      // localStorage không khả dụng (private mode/quota) — bỏ qua, không crash app.
    }
  },
  clearRefreshToken(): void {
    try {
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    } catch {
      // ignore
    }
  },
};

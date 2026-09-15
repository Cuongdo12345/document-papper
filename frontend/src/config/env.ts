/**
 * Đọc + validate biến môi trường (Vite bundle mọi biến VITE_* vào client —
 * KHÔNG đặt secret ở đây). FE_FOUNDATION_SPEC.md Mục 22.
 */

function readRequiredEnv(key: string): string {
  const value = import.meta.env[key];
  if (!value) {
    throw new Error(
      `[config/env] Thiếu biến môi trường bắt buộc "${key}" — kiểm tra file .env (xem .env.example).`,
    );
  }
  return value;
}

export const env = {
  apiBaseUrl: readRequiredEnv("VITE_API_BASE_URL"),
  mode: import.meta.env.MODE,
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
} as const;

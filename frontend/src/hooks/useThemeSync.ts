import { useEffect } from "react";
import { useUIStore } from "@/stores/uiStore";

/**
 * [FE-30] Đồng bộ `theme` (`stores/uiStore.ts`) → class `.dark` trên
 * `<html>` (Tailwind v4 `@custom-variant dark (&:is(.dark *))`,
 * `index.css`). Gọi ĐÚNG 1 LẦN ở gốc app (`App.tsx`), giống pattern
 * `Toaster`. Lần render đầu KHÔNG gây FOUC vì `index.html` đã có sẵn 1
 * script inline set class trước khi React mount — hook này chỉ giữ đồng
 * bộ cho các lần đổi theme sau đó.
 */
export function useThemeSync() {
  const theme = useUIStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);
}

import { useEffect, useRef, useState } from "react";

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Ease-out bậc 3 — chạy nhanh lúc đầu, chậm dần khi gần tới giá trị cuối. */
export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * [FE-37] Số KPI "đếm tăng" từ giá trị đang hiển thị tới `target` (lần đầu từ 0).
 * Khi dữ liệu đổi (VD bấm "Làm mới") đếm tiếp từ số cũ, không nhảy về 0. Bỏ
 * hiệu ứng, hiện ngay số cuối nếu hệ điều hành bật "giảm chuyển động".
 */
export function useCountUp(target: number, duration = 450): number {
  const reduced = prefersReducedMotion();
  const [display, setDisplay] = useState(0);
  const displayRef = useRef(display);

  useEffect(() => {
    const from = displayRef.current;
    if (reduced || from === target) return;

    const start = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      const next = Math.round(from + (target - from) * easeOutCubic(t));
      displayRef.current = next;
      setDisplay(next);
      if (t < 1) frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [target, duration, reduced]);

  // Giảm chuyển động: trả thẳng số cuối, không chạy hiệu ứng.
  return reduced ? target : display;
}

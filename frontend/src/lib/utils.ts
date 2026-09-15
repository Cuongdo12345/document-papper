import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Gộp className theo convention shadcn/ui — clsx cho điều kiện, twMerge cho
 * loại trùng class Tailwind xung đột (vd "p-2 p-4" -> giữ "p-4").
 * FE_FOUNDATION_SPEC.md Mục 14.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

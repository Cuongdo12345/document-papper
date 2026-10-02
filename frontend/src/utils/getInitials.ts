/**
 * [MỚI DEV-079] Tách ra file riêng (trước đây định nghĩa cục bộ ở
 * `Header.tsx`) — để `components/shared/Avatar.tsx` CHỈ export component
 * (oxlint `react/only-export-components`, giữ nguyên baseline warning).
 */
export function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  const last = parts[parts.length - 1]?.[0] ?? "";
  const first = parts.length > 1 ? parts[0]?.[0] ?? "" : "";
  return (first + last).toUpperCase() || "?";
}

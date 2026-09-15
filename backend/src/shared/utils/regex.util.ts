// shared/utils/regex.util.ts

/**
 * DEV-010/IMP-015 (H-08=SEC-36=RV06-02): escape ký tự đặc biệt của regex
 * trước khi đưa `keyword`/field tìm kiếm của client vào `$regex` — chặn rủi
 * ro ReDoS / lỗi regex khi giá trị chứa ký tự có nghĩa đặc biệt trong regex.
 *
 * Trước đây định nghĩa cục bộ trong `documents.mapper.ts` (chỉ Documents
 * dùng được, do có 2 lớp file cùng thư mục domain) — nay chuyển sang
 * `shared/utils/` để Departments/RBAC/Assets tái sử dụng đúng cùng 1 hàm
 * thay vì mỗi domain tự viết lại (đúng CLAUDE.md §11 — ưu tiên implementation
 * đã có, không tạo bản sao).
 */
export const escapeRegex = (text: string): string =>
  text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

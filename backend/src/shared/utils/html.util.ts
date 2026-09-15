/**
 * html.util.ts — DEV-015/MEDIUM-10 (RV10-02, HTML/Email injection).
 *
 * `escapeHtml()` neutralize 5 ký tự đặc biệt HTML (`&`, `<`, `>`, `"`, `'`)
 * trước khi nội suy free-text (VD `fullName`, `Notification.message`) vào
 * template email HTML — trước đây nội suy trực tiếp, cho phép HTML/email
 * injection qua dữ liệu người dùng tự đặt (tên, tiêu đề Document...); nếu FE
 * (ngoài phạm vi repo) render lại bằng cách không escape, có thể là stored
 * XSS thật.
 *
 * Không dùng thư viện ngoài (`dompurify`/`sanitize-html`...) — chỉ cần escape
 * 5 ký tự cơ bản cho ngữ cảnh chèn vào text node HTML đơn giản (không có nhu
 * cầu render rich HTML từ input người dùng), tránh thêm dependency không cần
 * thiết cho 1 nhu cầu nhỏ (CLAUDE.md — ưu tiên EXISTING/SIMPLE hơn NEW DEPENDENCY).
 */
export const escapeHtml = (value: unknown): string => {
  const str = String(value ?? "");

  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

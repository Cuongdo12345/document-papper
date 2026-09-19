/**
 * Roadmap C2 (Quản lý phiên đăng nhập, DEV-069, 2026-09-19) — phân tích
 * chuỗi User-Agent thô thành nhãn ngắn gọn dễ đọc ("Chrome trên Windows")
 * để hiển thị "danh sách thiết bị" cho user, KHÔNG cài thêm dependency
 * (`ua-parser-js`...) — chỉ cần đúng 2 thông tin (tên trình duyệt + hệ điều
 * hành), không cần độ chính xác tuyệt đối (engine version, device model...)
 * mà các thư viện đầy đủ cung cấp, nên tự viết regex đơn giản cho các
 * trường hợp phổ biến (CLAUDE.md Mục 25 — không cài package chỉ vì tiện).
 * Fallback: trả nguyên chuỗi UA (cắt ngắn) nếu không nhận diện được.
 */

const BROWSER_PATTERNS: [RegExp, string][] = [
  // Thứ tự QUAN TRỌNG: Edge/OPR chứa "Chrome" trong UA của chính nó, phải
  // check các trình duyệt dựa-trên-Chromium ĐẶC THÙ trước "Chrome" chung.
  [/Edg\//, "Edge"],
  [/OPR\//, "Opera"],
  [/Chrome\//, "Chrome"],
  [/Firefox\//, "Firefox"],
  [/Safari\//, "Safari"], // Chrome cũng chứa "Safari/" trong UA — luôn để SAU Chrome.
];

const OS_PATTERNS: [RegExp, string][] = [
  [/Windows NT/, "Windows"],
  // ⚠️ Thứ tự QUAN TRỌNG: UA thật của Safari/iOS luôn chứa "like Mac OS X"
  // (chuỗi tương thích ngược lịch sử của Apple, VD: "iPhone; CPU iPhone OS
  // 17_0 like Mac OS X") — PHẢI check iPhone/iPad TRƯỚC "Mac OS X", nếu
  // không mọi thiết bị iOS sẽ bị nhận nhầm thành macOS (bug thật, phát hiện
  // qua unit test với chuỗi UA iPhone thật).
  [/iPhone|iPad|iOS/, "iOS"],
  [/Mac OS X/, "macOS"],
  [/Android/, "Android"],
  [/Linux/, "Linux"],
];

export function parseUserAgent(userAgent?: string | null): { browser: string; os: string } {
  if (!userAgent) return { browser: "Không xác định", os: "Không xác định" };

  const browser = BROWSER_PATTERNS.find(([re]) => re.test(userAgent))?.[1] ?? "Trình duyệt khác";
  const os = OS_PATTERNS.find(([re]) => re.test(userAgent))?.[1] ?? "Hệ điều hành khác";

  return { browser, os };
}

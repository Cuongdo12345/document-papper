import { ApiPerformanceModel } from "../../models/apiPerformance/apiPerformance.model";

/**
 * PERFORMANCE LOG BUFFER
 * ======================
 * Trước đây `performance.middleware.ts` gọi `ApiPerformanceModel.create()`
 * (1 lệnh ghi Mongo) cho MỖI request đi qua server — ở traffic vừa/cao đây
 * là nguồn ghi liên tục, cạnh tranh I/O/connection-pool với các query
 * nghiệp vụ thật (vì dùng chung 1 kết nối MongoDB).
 *
 * File này tách riêng phần "gom dữ liệu + ghi xuống DB" ra khỏi middleware:
 *  - Middleware chỉ có nhiệm vụ đo thời gian rồi gọi `pushPerformanceLog()`
 *    (đẩy vào RAM, cực nhanh, không I/O).
 *  - Buffer này tự flush theo 1 trong 2 điều kiện, cái nào tới trước:
 *      1) Đủ `FLUSH_SIZE` bản ghi trong buffer, HOẶC
 *      2) Đã quá `FLUSH_INTERVAL_MS` kể từ lần flush gần nhất.
 *  - Khi flush, dùng `insertMany(..., { ordered: false })` — 1 lệnh ghi
 *    Mongo cho cả loạt request thay vì N lệnh riêng lẻ → giảm số round-trip
 *    xuống DB tới 50-100 lần tuỳ FLUSH_SIZE.
 *
 * Vẫn giữ nguyên MongoDB hiện tại (không tách sang DB/service riêng) vì:
 *  - Batch + sampling đã giảm tải ghi rất nhiều, đủ cho quy mô hiện tại.
 *  - Dashboard hiệu năng (`getPerformanceDashboard`) đang query trực tiếp
 *    bằng `aggregate` trên chính collection này — tách sang hệ thống ngoài
 *    (ELK/Prometheus) sẽ phải viết lại toàn bộ phần đó, chưa cần thiết ở
 *    quy mô traffic hiện tại. Có thể nâng cấp lên hướng đó sau nếu đo được
 *    ghi log thực sự là nút thắt cổ chai.
 */

export interface PerformanceLogEntry {
  method: string;
  endpoint: string;
  status: number;
  totalTime: number;
  user?: unknown;
  isSlow: boolean;
  createdAt: Date;
}

const FLUSH_SIZE = 50;
const FLUSH_INTERVAL_MS = 10_000; // 10 giây

let buffer: PerformanceLogEntry[] = [];
let flushTimer: NodeJS.Timeout | null = null;

const flush = async (): Promise<void> => {
  if (buffer.length === 0) return;

  // Lấy hết batch hiện tại ra và reset buffer NGAY (tránh race condition:
  // request mới push vào trong lúc đang insertMany bất đồng bộ).
  const batch = buffer;
  buffer = [];

  try {
    await ApiPerformanceModel.insertMany(batch, { ordered: false });
  } catch (err) {
    // Batch insert lỗi (vd 1 vài document sai schema) không được làm crash
    // app — đây là log phụ trợ, mất vài bản ghi performance không ảnh
    // hưởng nghiệp vụ chính.
    console.error("[performanceLogBuffer] Flush thất bại:", err);
  }
};

const ensureTimer = (): void => {
  if (flushTimer) return;

  flushTimer = setInterval(() => {
    void flush();
  }, FLUSH_INTERVAL_MS);

  // Không giữ process Node sống chỉ vì timer này (quan trọng khi test/script
  // ngắn hạn chạy xong muốn thoát ngay, không phải đợi timer).
  flushTimer.unref();
};

export const pushPerformanceLog = (entry: PerformanceLogEntry): void => {
  buffer.push(entry);
  ensureTimer();

  if (buffer.length >= FLUSH_SIZE) {
    void flush();
  }
};

/**
 * Flush thủ công — dùng khi graceful shutdown (SIGTERM/SIGINT) để không mất
 * nốt phần buffer còn lại đang chờ trong RAM lúc server tắt.
 */
export const flushPerformanceLogBuffer = (): Promise<void> => flush();

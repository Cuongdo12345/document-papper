// backend/src/__tests__/e2e/setup.ts
//
// MỚI (DEV-048, 2026-09-12) — hạ tầng test HTTP/E2E ĐẦU TIÊN của dự án.
// Trước đây (xem `docs/30_DEVELOPMENT_COMPLETION_AUDIT.md` Mục 6/9 #5):
// "0 integration test, 0 HTTP/E2E test trên toàn bộ 116 endpoint" — mọi xác
// nhận "DONE" chỉ dừng ở unit test (mock DB) hoặc đọc code tĩnh, CHƯA từng
// có 1 request HTTP thật nào xác nhận hành vi middleware/route ĐẦY ĐỦ (auth
// → RBAC → controller → service → DB → response).
//
// DÙNG `mongodb-memory-server` (MongoMemoryReplSet, KHÔNG phải instance
// đơn) — BẮT BUỘC vì `withTransaction()` (dùng xuyên suốt Document/Workflow)
// yêu cầu MongoDB là replica set, không chạy được trên standalone (xem
// `shared/utils/withTransaction.ts`). Instance riêng cho MỖI file test E2E
// (không dùng chung DB dev thật) — an toàn, không đụng dữ liệu thật, chạy
// song song được nhiều máy/CI mà không xung đột.
//
// CHỦ Ý set `process.env.MONGO_URI`/`JWT_SECRET`/`JWT_REFRESH_SECRET`
// TRƯỚC khi bất kỳ module nào của app được `require`/`import` — nhiều
// module đọc biến này ở module-scope (VD `config/database/database.ts`),
// import sớm hơn sẽ đọc phải giá trị `undefined`/cũ.

import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";

let replSet: MongoMemoryReplSet | undefined;

/**
 * Khởi động 1 MongoDB in-memory (1-node replica set) + set ENV cần thiết +
 * connect mongoose. Gọi trong `beforeAll` của MỖI file test E2E.
 */
export const startE2EDatabase = async (): Promise<void> => {
  // Ghim version MongoDB binary — bản "latest" mặc định của
  // `mongodb-memory-server` từng gây lỗi handshake không tương thích với
  // driver nội bộ của chính thư viện này trên máy Windows đã test (lỗi
  // "Missing required sub-document 'driver' in the client metadata
  // document" ngay lúc khởi tạo replica set). 7.0.x là bản ổn định, tương
  // thích tốt với `mongoose`/`mongodb` driver v7 đang dùng trong dự án.
  process.env.MONGOMS_VERSION ??= "7.0.14";
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const uri = replSet.getUri();

  process.env.MONGO_URI = uri;
  // Giá trị bất kỳ, chỉ cần tồn tại — JWT thật ký/verify trong quá trình
  // test, KHÔNG dùng để xác thực với hệ thống ngoài nào.
  process.env.JWT_SECRET ??= "e2e-test-jwt-secret";
  process.env.JWT_REFRESH_SECRET ??= "e2e-test-jwt-refresh-secret";
  process.env.CLIENT_URL ??= "http://localhost:5173";

  mongoose.set("strictQuery", false);
  await mongoose.connect(uri);
};

/** Đóng kết nối + tắt in-memory server. Gọi trong `afterAll`. */
export const stopE2EDatabase = async (): Promise<void> => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  await replSet?.stop();
};

/**
 * Xoá TOÀN BỘ dữ liệu giữa các test (giữ nguyên connection/replica set) —
 * dùng trong `afterEach`/`beforeEach` khi 1 file test có NHIỀU `it()` cần
 * state sạch, tránh 1 test rò dữ liệu ảnh hưởng test sau.
 */
export const clearE2EDatabase = async (): Promise<void> => {
  const collections = mongoose.connection.collections;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
};

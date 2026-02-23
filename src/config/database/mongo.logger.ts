import mongoose from "mongoose";

interface MongoDebugOptions {
  enabled: boolean;
  slowMs: number;
}

// ===== MONGO DEBUG OPTIONS =====
// Bật debug mode cho MongoDB để log chi tiết các truy vấn và hoạt động của database, giúp dễ dàng theo dõi và debug trong quá trình phát triển.
// MONGO_DEBUG=true sẽ log tất cả các truy vấn MongoDB, trong khi MONGO_SLOW_MS=200 sẽ log các truy vấn mất hơn 200ms, giúp phát hiện các truy vấn chậm.
// Trong môi trường production, nên tắt debug mode để tránh log quá nhiều thông tin nhạy cảm và giảm overhead.
// Lưu ý: Các biến này nên được cấu hình khác nhau giữa development và production để đảm bảo hiệu suất và bảo mật.
// Các options này được lấy từ biến môi trường, đảm bảo linh hoạt và không hardcode trong code. MONGO_DEBUG có thể bật/tắt debug mode, còn MONGO_SLOW_MS giúp xác định ngưỡng cho các truy vấn chậm.
// Ví dụ: trong development có thể bật MONGO_DEBUG=true để log tất cả, còn trong production có thể tắt MONGO_DEBUG và chỉ log các truy vấn chậm với MONGO_SLOW_MS=200
const options: MongoDebugOptions = {
  enabled: process.env.MONGO_DEBUG === "true",
  slowMs: Number(process.env.MONGO_SLOW_MS || 200),
};

export const registerMongoLogger = () => {
  if (!options.enabled) return;

  mongoose.set("debug", function (
    collectionName: string,
    method: string,
    query: any,
    doc: any,
    optionsQuery: any
  ) {
    const start = Date.now();

    // execute after event loop để đo thời gian thật
    setImmediate(() => {
      const duration = Date.now() - start;

      const log = {
        collection: collectionName,
        method,
        duration: `${duration}ms`,
        query,
        doc,
      };

      // ===== QUERY CHẬM =====
      if (duration > options.slowMs) {
        console.warn("🐢 Mongo SLOW QUERY");
        console.warn(JSON.stringify(log, null, 2));
        return;
      }

      // ===== DEV LOG =====
      if (process.env.NODE_ENV === "development") {
        console.log("📘 Mongo Query");
        console.log(JSON.stringify(log, null, 2));
      }
      
      //✔ Highlight index thiếu
      if (method === "find" && duration > options.slowMs) {
      console.warn("⚠️ Possible missing index:", collectionName, query);
}
    });
  });
};
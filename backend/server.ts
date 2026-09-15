import dotenv from "dotenv";
dotenv.config();

import http from "http";
import app from "./src/app";
import { connectDB } from "./src/config/database/database";
import { registerMongoEvents } from "./src/config/database/database.events";
import { registerMongoShutdown } from "./src/config/database/database.shutdown";
import { registerCronJobs } from "./src/shared/cron";


// ==============================
// Validate ENV
// ==============================

if (!process.env.PORT) {
  throw new Error("❌ PORT is not defined in environment variables");
}

if (!process.env.MONGO_URI) {
  throw new Error("❌ MONGO_URI is not defined in environment variables");
}

// DEV-014/MEDIUM-09: `app.ts` truyền thẳng `process.env.CLIENT_URL` vào
// `cors({ origin: ... })` — nếu biến này thiếu, thư viện `cors` fail-OPEN
// (mặc định `Access-Control-Allow-Origin: *`) thay vì fail-CLOSED, trong khi
// `credentials: true` vẫn bật. Validate fail-fast NGAY LÚC KHỞI ĐỘNG, cùng
// cơ chế với PORT/MONGO_URI ở trên — không để server chạy với cấu hình CORS
// mở toàn bộ do thiếu ENV ngoài ý muốn.
if (!process.env.CLIENT_URL) {
  throw new Error("❌ CLIENT_URL is not defined in environment variables");
}

// DEV-021/SEC-03: `JWT_SECRET`/`JWT_REFRESH_SECRET` trước đây được đọc bằng
// non-null assertion (`process.env.JWT_SECRET!`) hoặc type-cast (`as
// string`) ở `auth.middleware.ts`/`auth.helper.ts` — không có check tồn tại
// tường minh như PORT/MONGO_URI/CLIENT_URL. Nếu 1 trong 2 biến thiếu ở môi
// trường triển khai, lỗi CHỈ xuất hiện khi có request đầu tiên gọi tới
// verify/sign với `undefined` (dễ bị bỏ sót khi review triển khai) thay vì
// fail-fast ngay lúc khởi động — cùng cơ chế với 3 biến ở trên.
if (!process.env.JWT_SECRET) {
  throw new Error("❌ JWT_SECRET is not defined in environment variables");
}

if (!process.env.JWT_REFRESH_SECRET) {
  throw new Error("❌ JWT_REFRESH_SECRET is not defined in environment variables");
}

const PORT = Number(process.env.PORT);

// ==============================
// Bootstrap function
// ==============================

const startServer = async () => {
  try {
    // 1️⃣ Connect MongoDB
    await connectDB();
    registerMongoEvents();
    registerMongoShutdown();

     // 1.5️⃣ Đăng ký cron jobs (Giai đoạn 4 — cảnh báo Asset). Đặt SAU khi
    // DB kết nối xong vì cron job cần query được DB ngay khi tới lịch chạy.
    registerCronJobs();

    // 4️⃣ Create HTTP server
    const server = http.createServer(app);

    server.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
      console.log(`📘 Swagger docs at http://localhost:${PORT}/api-docs`);
    });

    // ==============================
    // Handle unexpected errors
    // ==============================

    process.on("unhandledRejection", (reason) => {
      console.error("❌ Unhandled Rejection:", reason);
      server.close(() => process.exit(1));
    });

    process.on("uncaughtException", (error) => {
      console.error("❌ Uncaught Exception:", error);
      server.close(() => process.exit(1));
    });

  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

// ==============================
// Start app
// ==============================

startServer();


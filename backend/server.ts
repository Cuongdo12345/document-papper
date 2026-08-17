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


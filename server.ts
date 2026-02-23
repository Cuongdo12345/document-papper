import dotenv from "dotenv";
dotenv.config();

import http from "http";
import app from "./src/app";
import { connectDB } from "./src/config/database/database";
import { registerMongoEvents } from "./src/config/database/database.events";
import { registerMongoShutdown } from "./src/config/database/database.shutdown";
import { setupSwagger } from "./src/config/swagger";
import { errorHandler } from "./src/shared/errors/errorHandler";

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

    // 2️⃣ Swagger
    setupSwagger(app);

    // 3️⃣ Global error handler (must be after routes)
    app.use(errorHandler);

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

// import dotenv from "dotenv";
// dotenv.config();
// import app from "./src/app";
// import { connectDB } from "./src/config/database/database";
// import { registerMongoEvents } from "./src/config/database/database.events";
// import { registerMongoShutdown } from "./src/config/database/database.shutdown";
// // import {registerMongoLogger} from "./src/config/database/mongo.logger";
// import { setupSwagger } from "./src/config/swagger";
// import {errorHandler} from "./src/shared/errors/errorHandler";

// // ===== MONGO CONNECTION =====
// // Đảm bảo rằng biến môi trường MONGO_URI đã được thiết lập trước khi chạy ứng dụng, nếu không sẽ throw lỗi ngay khi khởi động
// // Có thể thêm tính năng kiểm tra kết nối MongoDB khi ứng dụng khởi động và log rõ ràng nếu kết nối thất bại, giúp dễ dàng debug trong môi trường production
// // registerMongoLogger();
// connectDB();
// registerMongoEvents();
// registerMongoShutdown();
// setupSwagger(app);

// app.use(errorHandler);
// app.listen(process.env.PORT, () => {
//   console.log(`🚑 Server running at http://localhost:${process.env.PORT}`);
// });

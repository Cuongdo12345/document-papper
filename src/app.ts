import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";

import documentRoutes from "./routes/document.route";
import departmentRoutes from "./routes/department.routes";
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import userAuditRoutes from "./routes/userAudit.routes";
import performanceRoutes from "./routes/performance.routes";
import dashboardRoutes from "./routes/dashboard.route";
import exportRoutes from "./routes/export-excel.route"

import { performanceMiddleware } from "./middlewares/performance.middleware";
import { errorHandler } from "./middlewares/error.middleware";

const app = express();

/* ===============================
   🔐 SECURITY MIDDLEWARE
================================= */
// Sử dụng Helmet để bảo vệ ứng dụng khỏi các lỗ hổng bảo mật phổ biến
app.use(helmet());

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST", "PATCH", "DELETE", "PUT"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
  })
);

// Tăng giới hạn kích thước body để hỗ trợ upload file lớn
app.use(express.json({ limit: "10mb" }));
// Nén response để cải thiện hiệu suất
app.use(compression());
app.use(cookieParser());

// Ghi log chi tiết trong development
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

/* ===============================
   🚦 RATE LIMIT (auth)
================================= */
// Giới hạn số lần đăng nhập để ngăn chặn brute-force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // giới hạn 20 request mỗi 15 phút
  message: "Too many login attempts, please try later",
});
// Chỉ áp dụng rate limit cho các route auth
app.use("/api/auths", authLimiter);

/* ===============================
   📈 PERFORMANCE TRACKING
================================= */
// Middleware này sẽ tính thời gian xử lý của mỗi request và log ra console
app.use(performanceMiddleware);

/* ===============================
   🚀 ROUTES
================================= */

app.use("/api/documents", documentRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/auths", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/user-audits", userAuditRoutes);
app.use("/api/performances", performanceRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/export", exportRoutes);

/* ===============================
   ❌ GLOBAL ERROR HANDLER
================================= */
// Middleware này sẽ bắt tất cả lỗi không được xử lý ở các route trước đó và trả về response chuẩn
app.use(errorHandler);

export default app;

// import express from "express";
// import documentRoutes from "./routes/document.route";
// import departmentRoutes from "./routes/department.routes";
// import authRoutes from "./routes/auth.routes";
// import userRoutes from "./routes/user.routes";
// import userAuditRoutes from "./routes/userAudit.routes";
// import performanceRoutes from "./routes/performance.routes";

// // 🔹 app chính, gắn route và middleware
// const app = express();

// app.use(express.json());
// app.use("/api/documents", documentRoutes);
// app.use("/api/departments", departmentRoutes);
// app.use("/api/auths", authRoutes);
// app.use("/api/users", userRoutes);
// app.use("/api/user-audits", userAuditRoutes);
// app.use("/api/performances", performanceRoutes);

// export default app;

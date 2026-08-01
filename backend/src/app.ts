import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import { randomUUID } from "crypto";

import documentRoutes from "./routes/documents/document.route";
import departmentRoutes from "./routes/departments/department.routes";
import authRoutes from "./routes/auth/auth.routes";
import userRoutes from "./routes/users/user.routes";
import userAuditRoutes from "./routes/users/userAudit.routes";
import performanceRoutes from "./routes/performances/performance.routes";
import dashboardRoutes from "./routes/dashboard/dashboard.route";
import exportRoutes from "./routes/excel/excel.route";
import uploadRoutes from "./routes/upload/upload.routes";
import workflowRoutes from "./routes/documents/workflow.routes";
import rbacRoutes from "./routes/rbac/rbac.routes";
import notificationRoutes from "./routes/notifications/notification.routes";
import assetRoutes from "./routes/assets/asset.routes";
import assetCategoryRoutes from "./routes/assets/assetCategory.routes";

import { performanceMiddleware } from "./middlewares/performance.middleware";
import { errorHandler } from "./middlewares/error.middleware";
import { setupSwagger } from "./config/swagger/swagger";


const app = express();

/* ===============================
   🆔 REQUEST ID
================================= */
// Sửa #5 (DOCUMENT_ERROR_ANALYSIS.md — structured logging): gắn 1 ID duy
// nhất cho mỗi request NGAY TỪ ĐẦU (trước mọi middleware/route khác), để
// `error.middleware.ts` log kèm được `requestId`, giúp đối chiếu 1 lỗi cụ
// thể giữa log server và báo lỗi của client (client nhận lại qua header
// `X-Request-Id` để tiện báo lỗi). Dùng `crypto.randomUUID()` built-in của
// Node — không cần thêm dependency.
app.use((req, res, next) => {
  (req as any).id = randomUUID();
  res.setHeader("X-Request-Id", (req as any).id);
  next();
});

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
    credentials: true,
  }),
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

// Cấu hình swagger load API
setupSwagger(app);

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
app.use("/api/upload", uploadRoutes);
app.use("/api/workflows", workflowRoutes);
app.use("/api/rbac", rbacRoutes)
app.use("/api/notifications", notificationRoutes)
app.use("/api/assets", assetRoutes)
app.use("/api/asset-categories", assetCategoryRoutes)

/* ===============================
   ❌ GLOBAL ERROR HANDLER
================================= */

// Middleware này sẽ bắt tất cả lỗi không được xử lý ở các route trước đó và trả về response chuẩn
app.use(errorHandler);

export default app;

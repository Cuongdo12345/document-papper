import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
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
import assetCategoryRoutes from "./routes/assets/assetCategory.routes";
import medicalDeviceRoutes from "./routes/assets/medicalDevice.routes";
import assetMaintenancePlanRoutes from "./routes/assets/assetMaintenancePlan.routes";
import assetRoutes from "./routes/assets/asset.routes";
import inventoryRoutes from "./routes/inventory/inventory.routes";
import vendorRoutes from "./routes/vendors/vendor.routes";
import contractRoutes from "./routes/vendors/contract.routes";
import systemDesignRoutes from "./routes/systemDesign/systemDesign.routes";

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
// DEV-023/ARCH-26: trước đây có 2 rate-limiter ĐỘC LẬP cùng cấu hình (20
// req/15 phút) áp cho cùng 1 nhóm route `/api/auths/*` — `authLimiter` mount
// RỘNG ở đây (toàn bộ prefix `/api/auths`) VÀ `authRateLimiter`
// (`middlewares/authRateLimiter.middleware.ts`) gắn RIÊNG ở
// `register`/`login`/`refresh-token` (`auth.routes.ts`) — 2 bộ đếm KHÔNG
// chia sẻ store, dễ nhầm lẫn khi cần chỉnh ngưỡng (sửa 1 chỗ tưởng đủ).
// Hợp nhất còn 1 nguồn: xoá limiter chung ở đây, dùng
// `authRateLimiter` (đã có `ApiError.tooManyRequests` + doc-comment rõ
// ràng hơn) gắn TƯỜNG MINH ở từng route trong `auth.routes.ts` — bao gồm
// cả `reset-password` (trước đây chỉ được bảo vệ NGẦM qua limiter chung ở
// đây, nay được gắn tường minh để không mất bảo vệ khi bỏ mount rộng này).
// `forgot-password` CHỦ Ý không dùng `authRateLimiter` — đã có giới hạn
// riêng ở tầng service (3 req/15 phút/user, xem comment
// `authRateLimiter.middleware.ts`), 2 cơ chế phục vụ 2 mục đích khác nhau.

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
app.use("/api/assets/asset-categories", assetCategoryRoutes)
app.use("/api/assets/medical-devices", medicalDeviceRoutes)
// Roadmap B2 (2026-09-15) — PHẢI mount TRƯỚC "/api/assets" (assetRoutes)
// bên dưới, cùng lý do assetCategoryRoutes/medicalDeviceRoutes: Express
// khớp theo thứ tự đăng ký, "/api/assets" (path rộng hơn, có :id ở route
// con) sẽ "nuốt" mất "/api/assets/maintenance-plans" nếu bị đăng ký trước.
app.use("/api/assets/maintenance-plans", assetMaintenancePlanRoutes)
app.use("/api/assets", assetRoutes)
// Roadmap B3 (2026-09-15) — module MỚI, không có prefix con nào khác cần
// mount trước (không giống các nhánh /api/assets/* ở trên).
app.use("/api/inventory", inventoryRoutes)
// Roadmap B4 (2026-09-16) — 2 module MỚI, độc lập, không có prefix con nào
// khác trùng/lồng nhau cần quan tâm thứ tự mount.
app.use("/api/vendors", vendorRoutes)
app.use("/api/contracts", contractRoutes)
app.use("/api/system-design", systemDesignRoutes)

/* ===============================
   ❌ GLOBAL ERROR HANDLER
================================= */

// Middleware này sẽ bắt tất cả lỗi không được xử lý ở các route trước đó và trả về response chuẩn
app.use(errorHandler);

export default app;

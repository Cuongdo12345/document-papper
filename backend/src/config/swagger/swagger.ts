import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import path from "path";
import { Express } from "express";

/**
 * BR-18 (docs/31_BACKEND_CODE_REVIEW.md, DEV-104, 2026-09-30): `/api-docs`
 * (Swagger UI) trước đây bật vô điều kiện ở mọi môi trường — ai biết địa chỉ
 * cũng xem được toàn bộ API và gọi thử ngay trên trình duyệt (`persistAuthorization`),
 * không cần đăng nhập để xem (RV00-03).
 *
 * Nay MẶC ĐỊNH TẮT, chỉ bật khi:
 *   - `NODE_ENV === "development"`, hoặc
 *   - ENV `ENABLE_API_DOCS === "true"` (vd máy chủ thử nghiệm).
 * Thiếu cấu hình → tắt (fail-closed): quên đặt `NODE_ENV` trên production vẫn
 * KHÔNG mở trang này. Cùng kiểu `ALLOW_SELF_REGISTER` (BR-01).
 */
export const isApiDocsEnabled = (env: NodeJS.ProcessEnv = process.env): boolean =>
  env.ENABLE_API_DOCS === "true" || env.NODE_ENV === "development";

/** Trả `true` nếu đã mount `/api-docs`, `false` nếu đang tắt (khi đó không nạp cả file YAML). */
export const setupSwagger = (app: Express): boolean => {
  if (!isApiDocsEnabled()) return false;

  const swaggerPath = path.join(__dirname, "../../docs/openAPI.yaml");

  const swaggerDocument = YAML.load(swaggerPath);

  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerDocument, {
      swaggerOptions: {
        persistAuthorization: true,
      },
      explorer: true,
      customSiteTitle: "Document Papper API Docs",
    }),
  );
  return true;
};

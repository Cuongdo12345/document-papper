/**
 * BR-18 (docs/31_BACKEND_CODE_REVIEW.md, DEV-104, 2026-09-30) — E2E trên APP
 * THẬT (`app.ts`): `/api-docs` mặc định tắt, bật bằng `ENABLE_API_DOCS=true`
 * hoặc `NODE_ENV=development`.
 *
 * Kiểm cả 2 chiều: chỉ kiểm "tắt" thì vẫn pass dù ai đó xoá dòng
 * `setupSwagger(app)` trong `app.ts`; chiều "bật" chứng minh route thật sự
 * được nối vào app.
 *
 * Không cần DB (2 route này không chạm Mongo) nên nạp app 2 lần với cấu hình
 * khác nhau qua `jest.resetModules()`.
 */
import request from "supertest";

const loadApp = async (env: Record<string, string | undefined>) => {
  jest.resetModules();
  process.env.JWT_SECRET ??= "e2e-test-jwt-secret";
  process.env.JWT_REFRESH_SECRET ??= "e2e-test-jwt-refresh-secret";
  process.env.CLIENT_URL ??= "http://localhost:5173";
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  return (await import("../../app")).default;
};

describe("E2E — /api-docs bật/tắt trên app thật (BR-18)", () => {
  const saved = { NODE_ENV: process.env.NODE_ENV, ENABLE_API_DOCS: process.env.ENABLE_API_DOCS };

  afterAll(() => {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  it("mặc định (production, không ENABLE_API_DOCS) -> /api-docs 404, API thật vẫn chạy (401 khi thiếu token)", async () => {
    const app = await loadApp({ NODE_ENV: "production", ENABLE_API_DOCS: undefined });

    expect((await request(app).get("/api-docs/")).status).toBe(404);
    expect((await request(app).get("/api-docs")).status).toBe(404);
    // Không làm hỏng route khác.
    expect((await request(app).get("/api/users")).status).toBe(401);
  });

  it("ENABLE_API_DOCS=true -> /api-docs phục vụ Swagger UI (200)", async () => {
    const app = await loadApp({ NODE_ENV: "production", ENABLE_API_DOCS: "true" });

    const res = await request(app).get("/api-docs/");
    expect(res.status).toBe(200);
    expect(res.text).toContain("Document Papper API Docs");
  });

  it("NODE_ENV=development -> /api-docs phục vụ Swagger UI (200), đúng máy dev hiện tại", async () => {
    const app = await loadApp({ NODE_ENV: "development", ENABLE_API_DOCS: undefined });

    expect((await request(app).get("/api-docs/")).status).toBe(200);
  });
});

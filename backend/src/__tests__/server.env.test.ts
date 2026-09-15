/**
 * DEV-021/SEC-03 — regression test: `server.ts` phải fail-fast (throw) ngay
 * lúc khởi động nếu thiếu `JWT_SECRET`/`JWT_REFRESH_SECRET`, cùng cơ chế
 * với `PORT`/`MONGO_URI`/`CLIENT_URL` đã có sẵn — trước fix, thiếu 2 biến
 * này chỉ lộ lỗi khi có request ĐẦU TIÊN gọi verify/sign JWT (dễ bị bỏ sót
 * khi review triển khai).
 *
 * `server.ts` nằm NGOÀI `src/` (project root) — import bằng đường dẫn tương
 * đối `../../server` từ `src/__tests__/`. File này tự gọi `startServer()`
 * (connect MongoDB thật) ở cuối module — nhưng lệnh `throw` (nếu thiếu ENV)
 * luôn xảy ra Ở TRÊN lệnh gọi đó trong thứ tự evaluate module, nên mọi test
 * dưới đây CHỦ Ý luôn thiếu đúng 1 biến để đảm bảo throw xảy ra TRƯỚC khi
 * `startServer()` (và mọi I/O thật: MongoDB, cron...) có cơ hội chạy.
 *
 * Mock `dotenv` để `dotenv.config()` (chạy đầu file `server.ts`) không nạp
 * đè giá trị thật từ `.env` lên các biến đã bị xoá trong test.
 */
jest.mock("dotenv", () => ({ config: jest.fn() }));

describe("server.ts — fail-fast ENV validation (DEV-021/SEC-03)", () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
    // Luôn có sẵn 3 biến ENV đã fail-fast từ trước (PORT/MONGO_URI/CLIENT_URL)
    // để cô lập đúng behaviour của 2 check MỚI (JWT_SECRET/JWT_REFRESH_SECRET).
    process.env.PORT = "5000";
    process.env.MONGO_URI = "mongodb://127.0.0.1:27017/test-db";
    process.env.CLIENT_URL = "http://localhost:3000";
    process.env.JWT_SECRET = "test-secret";
    process.env.JWT_REFRESH_SECRET = "test-refresh-secret";
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it("throw ngay khi thiếu JWT_SECRET", () => {
    delete process.env.JWT_SECRET;

    expect(() => require("../../server")).toThrow(/JWT_SECRET is not defined/);
  });

  it("throw ngay khi thiếu JWT_REFRESH_SECRET", () => {
    delete process.env.JWT_REFRESH_SECRET;

    expect(() => require("../../server")).toThrow(/JWT_REFRESH_SECRET is not defined/);
  });
});

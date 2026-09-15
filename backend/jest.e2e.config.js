/** @type {import('ts-jest').JestConfigWithTsJest} */
// MỚI (DEV-048, 2026-09-12) — config RIÊNG cho test HTTP/E2E (supertest +
// mongodb-memory-server), TÁCH KHỎI `jest.config.js` (unit test, mock DB):
//   - `testMatch` chỉ khớp đúng thư mục `__tests__/e2e/`, đuôi `.e2e-test.ts`
//     (KHÔNG phải `.test.ts`) — để `npx jest`/`npm test` (unit, nhanh) không
//     vô tình chạy cả E2E (chậm hơn nhiều — khởi động MongoDB in-memory).
//   - `maxWorkers: 1` — mỗi file E2E tự khởi động 1 MongoMemoryReplSet
//     riêng; chạy song song nhiều worker cùng lúc tốn RAM/CPU không cần
//     thiết cho quy mô test hiện tại (5-10 luồng).
//   - `testTimeout` cao hơn hẳn unit test — khởi động MongoDB in-memory +
//     nhiều request HTTP thật/1 test chậm hơn unit test (mock) đáng kể.
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src/__tests__/e2e"],
  testMatch: ["**/*.e2e-test.ts"],
  maxWorkers: 1,
  testTimeout: 60_000,
  transform: {
    "^.+\\.ts$": ["ts-jest", { tsconfig: "tsconfig.test.json" }],
  },
};

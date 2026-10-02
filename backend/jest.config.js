// BR-09 (DEV-097): cố định giờ VN cho test — giống `src/config/timezone.ts`
// ở runtime thật. Đặt ở đây (process cha) để mọi worker jest kế thừa, test
// cho kết quả như nhau dù máy chạy test (CI...) để UTC.
process.env.TZ = "Asia/Ho_Chi_Minh";

/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.test.ts"],
  clearMocks: true,
  transform: {
    "^.+\\.ts$": ["ts-jest", { tsconfig: "tsconfig.test.json" }],
  },
  // Không tính coverage cho scripts/ (script vận hành, không phải logic
  // nghiệp vụ cần test) hay các file .d.ts.
  collectCoverageFrom: ["src/**/*.ts", "!src/**/*.d.ts"],
  coverageDirectory: "coverage",
};

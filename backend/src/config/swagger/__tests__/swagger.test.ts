/**
 * BR-18 (DEV-104) — `/api-docs` mặc định TẮT, chỉ bật ở development hoặc khi
 * `ENABLE_API_DOCS=true`. Test cả hàm quyết định lẫn việc route thật có được
 * mount hay không (request HTTP vào app express trần, không cần DB).
 */
import express from "express";
import request from "supertest";
import { isApiDocsEnabled, setupSwagger } from "../swagger";

describe("isApiDocsEnabled (BR-18)", () => {
  it.each([
    [{}, false],
    [{ NODE_ENV: "production" }, false],
    [{ NODE_ENV: "test" }, false],
    [{ NODE_ENV: "staging" }, false],
    [{ NODE_ENV: "development" }, true],
    [{ NODE_ENV: "production", ENABLE_API_DOCS: "true" }, true],
    [{ ENABLE_API_DOCS: "true" }, true],
    // Chỉ đúng chuỗi "true" mới bật (cùng ALLOW_SELF_REGISTER, BR-01).
    [{ NODE_ENV: "production", ENABLE_API_DOCS: "1" }, false],
    [{ NODE_ENV: "production", ENABLE_API_DOCS: "TRUE" }, false],
    [{ NODE_ENV: "production", ENABLE_API_DOCS: "" }, false],
    [{ NODE_ENV: "production", ENABLE_API_DOCS: "false" }, false],
    // NODE_ENV viết khác chữ thường không được coi là development.
    [{ NODE_ENV: "Development" }, false],
  ])("%j -> %s", (env, expected) => {
    expect(isApiDocsEnabled(env as NodeJS.ProcessEnv)).toBe(expected);
  });

  it("mặc định đọc process.env", () => {
    const saved = { ...process.env };
    try {
      delete process.env.ENABLE_API_DOCS;
      process.env.NODE_ENV = "production";
      expect(isApiDocsEnabled()).toBe(false);
      process.env.ENABLE_API_DOCS = "true";
      expect(isApiDocsEnabled()).toBe(true);
    } finally {
      process.env = saved;
    }
  });
});

describe("setupSwagger — mount route thật (BR-18)", () => {
  const savedEnv = { ...process.env };
  afterEach(() => {
    process.env = { ...savedEnv };
  });

  it("production, không có ENABLE_API_DOCS -> KHÔNG mount, /api-docs trả 404", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.ENABLE_API_DOCS;
    const app = express();

    expect(setupSwagger(app)).toBe(false);
    expect((await request(app).get("/api-docs/")).status).toBe(404);
    expect((await request(app).get("/api-docs")).status).toBe(404);
  });

  it("thiếu NODE_ENV (quên cấu hình trên server) -> vẫn TẮT, 404", async () => {
    delete process.env.NODE_ENV;
    delete process.env.ENABLE_API_DOCS;
    const app = express();

    expect(setupSwagger(app)).toBe(false);
    expect((await request(app).get("/api-docs/")).status).toBe(404);
  });

  it("development -> mount, /api-docs trả trang Swagger UI (200)", async () => {
    process.env.NODE_ENV = "development";
    delete process.env.ENABLE_API_DOCS;
    const app = express();

    expect(setupSwagger(app)).toBe(true);
    const res = await request(app).get("/api-docs/");
    expect(res.status).toBe(200);
    expect(res.text).toContain("Document Papper API Docs");
  });

  it("production + ENABLE_API_DOCS=true -> mount (bật chủ động)", async () => {
    process.env.NODE_ENV = "production";
    process.env.ENABLE_API_DOCS = "true";
    const app = express();

    expect(setupSwagger(app)).toBe(true);
    expect((await request(app).get("/api-docs/")).status).toBe(200);
  });
});

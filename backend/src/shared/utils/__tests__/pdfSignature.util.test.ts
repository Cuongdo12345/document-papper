import crypto from "crypto";

// Roadmap B5 (2026-09-18) — test THẬT (không mock crypto), dùng 1 cặp khoá
// RSA sinh riêng cho test này (KHÔNG dùng khoá .env thật) — set env TRƯỚC
// lần gọi sign/verify ĐẦU TIÊN vì module cache khoá LAZY (chỉ đọc
// `process.env` ở lần gọi đầu, xem `pdfSignature.util.ts::getPrivateKey`).
describe("pdfSignature.util", () => {
  let signPayload: typeof import("../pdfSignature.util").signPayload;
  let verifySignature: typeof import("../pdfSignature.util").verifySignature;
  let hashPayload: typeof import("../pdfSignature.util").hashPayload;

  beforeAll(() => {
    const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });
    process.env.PDF_SIGN_PRIVATE_KEY = Buffer.from(privateKey).toString("base64");
    process.env.PDF_SIGN_PUBLIC_KEY = Buffer.from(publicKey).toString("base64");

    // Import SAU khi set env — tránh phụ thuộc thứ tự load module của Jest.
    const mod = require("../pdfSignature.util");
    signPayload = mod.signPayload;
    verifySignature = mod.verifySignature;
    hashPayload = mod.hashPayload;
  });

  it("hashPayload trả sha256 hex ổn định cho cùng input", () => {
    const h1 = hashPayload("hello");
    const h2 = hashPayload("hello");
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
  });

  it("hashPayload trả hash khác nhau cho input khác nhau", () => {
    expect(hashPayload("hello")).not.toBe(hashPayload("world"));
  });

  it("signPayload + verifySignature roundtrip đúng", () => {
    const { signature, algorithm } = signPayload("abc123");
    expect(algorithm).toBe("RSA-SHA256");
    expect(verifySignature("abc123", signature)).toBe(true);
  });

  it("verifySignature trả false nếu payload bị đổi sau khi ký (phát hiện tampering)", () => {
    const { signature } = signPayload("original-content");
    expect(verifySignature("tampered-content", signature)).toBe(false);
  });

  it("verifySignature trả false (không throw) với signature sai định dạng", () => {
    expect(verifySignature("abc", "not-a-valid-base64-signature-@@@")).toBe(false);
  });

  it("signPayload throw lỗi rõ ràng nếu PDF_SIGN_PRIVATE_KEY chưa cấu hình", () => {
    jest.resetModules();
    const original = process.env.PDF_SIGN_PRIVATE_KEY;
    delete process.env.PDF_SIGN_PRIVATE_KEY;
    const freshMod = require("../pdfSignature.util");
    expect(() => freshMod.signPayload("x")).toThrow(/PDF_SIGN_PRIVATE_KEY/);
    process.env.PDF_SIGN_PRIVATE_KEY = original;
  });
});

/** BR-08 (DEV-096) — parse ENV `TRUST_PROXY`, mặc định tắt, chặn giá trị quá rộng. */
import { parseTrustProxy } from "../trustProxy.util";

describe("parseTrustProxy (BR-08)", () => {
  it.each([undefined, "", "   ", "0", "false", "FALSE"])("%p -> false (tắt, mặc định)", (raw) => {
    expect(parseTrustProxy(raw)).toBe(false);
  });

  it.each([
    ["1", 1],
    ["2", 2],
    [" 2 ", 2],
  ])("%p -> %p lớp proxy", (raw, expected) => {
    expect(parseTrustProxy(raw)).toBe(expected);
  });

  it.each(["true", "TRUE", "-1", "1.5", "abc", "loopback"])("%p -> throw (fail-fast)", (raw) => {
    expect(() => parseTrustProxy(raw)).toThrow(/TRUST_PROXY không hợp lệ/);
  });
});

import { parseUserAgent } from "../userAgent.helper";

describe("parseUserAgent (Roadmap C2, DEV-069, 2026-09-19)", () => {
  it("nhận diện Chrome trên Windows", () => {
    expect(
      parseUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
      ),
    ).toEqual({ browser: "Chrome", os: "Windows" });
  });

  it("nhận diện Safari trên macOS (KHÔNG nhầm thành Chrome dù cùng chứa 'Safari/')", () => {
    expect(
      parseUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
      ),
    ).toEqual({ browser: "Safari", os: "macOS" });
  });

  it("nhận diện Edge trên Windows (KHÔNG nhầm thành Chrome dù UA của Edge cũng chứa 'Chrome/')", () => {
    expect(
      parseUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36 Edg/120.0",
      ),
    ).toEqual({ browser: "Edge", os: "Windows" });
  });

  it("nhận diện Firefox trên Linux", () => {
    expect(parseUserAgent("Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0")).toEqual({
      browser: "Firefox",
      os: "Linux",
    });
  });

  it("nhận diện Android/iOS", () => {
    expect(parseUserAgent("Mozilla/5.0 (Linux; Android 14) Chrome/120.0 Mobile Safari/537.36").os).toBe("Android");
    expect(parseUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1").os).toBe("iOS");
  });

  it("trả về 'Không xác định' nếu thiếu User-Agent, fallback nếu không nhận diện được", () => {
    expect(parseUserAgent(undefined)).toEqual({ browser: "Không xác định", os: "Không xác định" });
    expect(parseUserAgent("")).toEqual({ browser: "Không xác định", os: "Không xác định" });
    expect(parseUserAgent("mot-chuoi-la")).toEqual({ browser: "Trình duyệt khác", os: "Hệ điều hành khác" });
  });
});

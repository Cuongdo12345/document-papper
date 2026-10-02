/**
 * BR-05 (DEV-094) — `memoryCache` giờ có trần số mục: khi đầy, dọn mục hết
 * hạn trước, vẫn đầy thì bỏ mục ghi cũ nhất. Trước đây Map lớn dần vô hạn.
 */
import {
  MAX_CACHE_ENTRIES,
  clearAllMemoryCache,
  getCacheSize,
  getOrSetCache,
  getOrSetCacheSync,
} from "../memoryCache";

const value = (v: unknown) => () => Promise.resolve(v);

describe("memoryCache (BR-05)", () => {
  beforeEach(() => {
    clearAllMemoryCache();
    jest.useRealTimers();
  });

  it("trả giá trị cache khi còn hạn, không gọi lại compute", async () => {
    const compute = jest.fn().mockResolvedValue(1);
    await getOrSetCache("k", 10_000, compute);
    await getOrSetCache("k", 10_000, compute);
    expect(compute).toHaveBeenCalledTimes(1);
  });

  it("ghi quá trần: số mục KHÔNG vượt MAX_CACHE_ENTRIES, mục cũ nhất bị bỏ", async () => {
    for (let i = 0; i < MAX_CACHE_ENTRIES + 50; i++) {
      await getOrSetCache(`k${i}`, 60_000, value(i));
    }
    expect(getCacheSize()).toBe(MAX_CACHE_ENTRIES);

    // k0 (cũ nhất) đã bị bỏ -> compute chạy lại; mục mới nhất vẫn còn.
    const recompute = jest.fn().mockResolvedValue("new");
    await getOrSetCache("k0", 60_000, recompute);
    expect(recompute).toHaveBeenCalledTimes(1);

    const newest = jest.fn();
    await getOrSetCache(`k${MAX_CACHE_ENTRIES + 49}`, 60_000, newest);
    expect(newest).not.toHaveBeenCalled();
  });

  it("khi đầy: ưu tiên dọn mục HẾT HẠN trước, giữ mục còn hạn dù cũ hơn", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-09-29T00:00:00Z"));

    // 1 mục sống lâu, ghi TRƯỚC.
    await getOrSetCache("long-lived", 3_600_000, value("keep"));
    // Lấp đầy phần còn lại bằng mục TTL ngắn.
    for (let i = 1; i < MAX_CACHE_ENTRIES; i++) {
      await getOrSetCache(`short${i}`, 1_000, value(i));
    }
    expect(getCacheSize()).toBe(MAX_CACHE_ENTRIES);

    jest.setSystemTime(new Date("2026-09-29T00:00:05Z")); // mục TTL 1s đã hết hạn
    await getOrSetCache("trigger", 60_000, value("t"));

    expect(getCacheSize()).toBe(2); // chỉ còn long-lived + trigger
    const compute = jest.fn();
    await getOrSetCache("long-lived", 3_600_000, compute);
    expect(compute).not.toHaveBeenCalled();
  });

  it("ghi lại cùng khoá không làm tăng số mục", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-09-29T00:00:00Z"));
    await getOrSetCache("same", 1_000, value(1));
    jest.setSystemTime(new Date("2026-09-29T00:00:05Z"));
    await getOrSetCache("same", 1_000, value(2));
    expect(getCacheSize()).toBe(1);
  });
});

describe("memoryCache — getOrSetCacheSync (BR-21/DEV-107)", () => {
  beforeEach(() => {
    clearAllMemoryCache();
    jest.useRealTimers();
  });

  it("còn hạn: trả giá trị cache, KHÔNG gọi lại compute", () => {
    const compute = jest.fn().mockReturnValue("v");
    expect(getOrSetCacheSync("s", 10_000, compute)).toBe("v");
    expect(getOrSetCacheSync("s", 10_000, compute)).toBe("v");
    expect(compute).toHaveBeenCalledTimes(1);
  });

  it("hết hạn: tính lại và trả giá trị mới", () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const compute = jest.fn().mockReturnValueOnce("cũ").mockReturnValueOnce("mới");

    expect(getOrSetCacheSync("s", 1_000, compute)).toBe("cũ");
    jest.setSystemTime(new Date("2026-01-01T00:00:00.999Z"));
    expect(getOrSetCacheSync("s", 1_000, compute)).toBe("cũ");
    jest.setSystemTime(new Date("2026-01-01T00:00:01.000Z"));
    expect(getOrSetCacheSync("s", 1_000, compute)).toBe("mới");
    expect(compute).toHaveBeenCalledTimes(2);
  });

  it("compute ném lỗi: lỗi được ném ra và KHÔNG cache gì (lần sau tính lại)", () => {
    const compute = jest.fn().mockImplementationOnce(() => { throw new Error("hỏng"); }).mockReturnValueOnce("ok");

    expect(() => getOrSetCacheSync("s", 10_000, compute)).toThrow("hỏng");
    expect(getCacheSize()).toBe(0);
    expect(getOrSetCacheSync("s", 10_000, compute)).toBe("ok");
  });

  it("dùng chung Map với bản async: cùng khoá thì bản đồng bộ đọc được giá trị bản async đã ghi, và chịu chung trần số mục", async () => {
    await getOrSetCache("chung", 10_000, () => Promise.resolve("từ async"));
    const compute = jest.fn();
    expect(getOrSetCacheSync("chung", 10_000, compute)).toBe("từ async");
    expect(compute).not.toHaveBeenCalled();

    clearAllMemoryCache();
    for (let i = 0; i < MAX_CACHE_ENTRIES + 10; i++) getOrSetCacheSync(`k${i}`, 60_000, () => i);
    expect(getCacheSize()).toBe(MAX_CACHE_ENTRIES);
  });
});

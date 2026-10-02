import { describe, expect, it } from "vitest";
import { easeOutCubic, prefersReducedMotion } from "../useCountUp";

describe("easeOutCubic", () => {
  it("bắt đầu ở 0, kết thúc đúng 1", () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
  });

  it("tăng dần và chạy nhanh hơn tuyến tính ở nửa đầu", () => {
    const samples = [0, 0.25, 0.5, 0.75, 1].map(easeOutCubic);
    for (let i = 1; i < samples.length; i++) expect(samples[i]).toBeGreaterThan(samples[i - 1]);
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
  });
});

describe("prefersReducedMotion", () => {
  it("không có window/matchMedia (SSR, test Node) -> false, không ném lỗi", () => {
    expect(prefersReducedMotion()).toBe(false);
  });
});

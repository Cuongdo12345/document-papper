/**
 * BR-09 (DEV-097) — mốc "Từ ngày/Đến ngày": chuỗi `YYYY-MM-DD` hiểu theo NGÀY
 * GIỜ VIỆT NAM, "Đến ngày" bao trọn cả ngày. Trước đây `new Date("2026-09-29")`
 * = 00:00 UTC = 07:00 sáng giờ VN.
 */
import { parseDateRangeBound, parseOptionalDate } from "../Queryparsing.util";

describe("parseDateRangeBound (BR-09)", () => {
  it("YYYY-MM-DD, start -> 00:00:00.000 giờ VN (= 17:00 UTC hôm trước)", () => {
    expect(parseDateRangeBound("2026-09-29", "start").toISOString()).toBe("2026-09-28T17:00:00.000Z");
  });

  it("YYYY-MM-DD, end -> 23:59:59.999 giờ VN (= 16:59:59.999 UTC cùng ngày)", () => {
    expect(parseDateRangeBound("2026-09-29", "end").toISOString()).toBe("2026-09-29T16:59:59.999Z");
  });

  it("khoảng [start, end] của cùng 1 ngày bao trọn đúng 24 giờ", () => {
    const start = parseDateRangeBound("2026-09-01", "start").getTime();
    const end = parseDateRangeBound("2026-09-01", "end").getTime();
    expect(end - start).toBe(24 * 60 * 60 * 1000 - 1);
  });

  it("chuỗi có giờ đầy đủ (ISO) giữ nguyên thời điểm client chỉ định", () => {
    expect(parseDateRangeBound("2026-09-29T10:15:00.000Z", "end").toISOString()).toBe("2026-09-29T10:15:00.000Z");
    expect(parseDateRangeBound("2026-09-29T08:00:00+07:00", "start").toISOString()).toBe("2026-09-29T01:00:00.000Z");
  });

  it("giá trị sai -> Invalid Date (không throw, giữ hành vi cũ)", () => {
    expect(Number.isNaN(parseDateRangeBound("abc", "start").getTime())).toBe(true);
  });
});

describe("parseOptionalDate (BR-09)", () => {
  it("rỗng -> undefined", () => {
    expect(parseOptionalDate("", "toDate", "end")).toBeUndefined();
    expect(parseOptionalDate(undefined, "toDate", "end")).toBeUndefined();
  });

  it("YYYY-MM-DD áp đúng mốc theo bound", () => {
    expect(parseOptionalDate("2026-09-29", "toDate", "end")!.toISOString()).toBe("2026-09-29T16:59:59.999Z");
  });

  it("giá trị sai -> 400", () => {
    expect(() => parseOptionalDate("abc", "fromDate", "start")).toThrow(expect.objectContaining({ status: 400 }));
  });
});

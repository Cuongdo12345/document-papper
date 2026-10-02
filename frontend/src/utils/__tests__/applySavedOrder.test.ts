import { describe, expect, it } from "vitest";
import { applySavedOrder, moveItem } from "../applySavedOrder";

describe("applySavedOrder", () => {
  it("chưa lưu thứ tự -> giữ nguyên thứ tự gốc", () => {
    expect(applySavedOrder(["A", "B", "C"], [])).toEqual(["A", "B", "C"]);
  });

  it("đã lưu -> theo đúng thứ tự đã lưu", () => {
    expect(applySavedOrder(["A", "B", "C"], ["C", "A", "B"])).toEqual(["C", "A", "B"]);
  });

  it("key mới chưa có trong thứ tự đã lưu -> nối vào cuối theo thứ tự gốc", () => {
    expect(applySavedOrder(["A", "B", "C", "D"], ["C", "A"])).toEqual(["C", "A", "B", "D"]);
  });

  it("key đã lưu nhưng không còn tồn tại -> bị bỏ qua", () => {
    expect(applySavedOrder(["A", "B"], ["X", "B", "A"])).toEqual(["B", "A"]);
  });
});

describe("moveItem", () => {
  it("chuyển xuống", () => {
    expect(moveItem(["A", "B", "C", "D"], 0, 2)).toEqual(["B", "C", "A", "D"]);
  });

  it("chuyển lên", () => {
    expect(moveItem(["A", "B", "C", "D"], 3, 1)).toEqual(["A", "D", "B", "C"]);
  });

  it("chỉ số ngoài phạm vi hoặc trùng -> trả nguyên mảng", () => {
    const list = ["A", "B"];
    expect(moveItem(list, 0, 0)).toBe(list);
    expect(moveItem(list, -1, 1)).toBe(list);
    expect(moveItem(list, 0, 5)).toBe(list);
  });
});

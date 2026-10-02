import { describe, expect, it } from "vitest";
import { splitSelectionByActive } from "../splitSelectionByActive";

const rows = [
  { _id: "a", isActive: true },
  { _id: "b", isActive: false },
  { _id: "c", isActive: true },
  { _id: "d" as string, isActive: undefined as boolean | undefined },
];
const isActive = (r: (typeof rows)[number]) => r.isActive !== false;

describe("splitSelectionByActive", () => {
  it("chỉ chọn dòng đang hoạt động -> chỉ có activeIds", () => {
    expect(splitSelectionByActive(rows, new Set(["a", "c"]), isActive)).toEqual({ activeIds: ["a", "c"], inactiveIds: [] });
  });

  it("chỉ chọn dòng đã ẩn -> chỉ có inactiveIds", () => {
    expect(splitSelectionByActive(rows, new Set(["b"]), isActive)).toEqual({ activeIds: [], inactiveIds: ["b"] });
  });

  it("chọn lẫn -> tách đúng 2 nhóm, bỏ qua dòng không được chọn", () => {
    expect(splitSelectionByActive(rows, new Set(["a", "b", "d"]), isActive)).toEqual({ activeIds: ["a", "d"], inactiveIds: ["b"] });
  });

  it("id đã chọn nhưng không có trong rows (đã rời trang) -> bị bỏ qua", () => {
    expect(splitSelectionByActive(rows, new Set(["zzz"]), isActive)).toEqual({ activeIds: [], inactiveIds: [] });
  });
});

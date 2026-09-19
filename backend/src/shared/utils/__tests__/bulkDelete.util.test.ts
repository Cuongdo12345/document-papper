// (DEV-060 — Xoá mềm hàng loạt, 2026-09-16) Test cho helper dùng chung
// `runBulkDelete`.
import ApiError from "../../errors/ApiError";
import { runBulkDelete } from "../bulkDelete.util";

describe("runBulkDelete (DEV-060)", () => {
  it("toàn bộ id thành công → deletedIds đủ, failed rỗng", async () => {
    const deleteOne = jest.fn().mockResolvedValue(true);

    const result = await runBulkDelete(["a", "b", "c"], deleteOne);

    expect(result.deletedIds).toEqual(["a", "b", "c"]);
    expect(result.failed).toEqual([]);
    expect(deleteOne).toHaveBeenCalledTimes(3);
  });

  it("1 id lỗi ApiError → tách riêng vào failed kèm đúng message, không chặn id khác", async () => {
    const deleteOne = jest
      .fn()
      .mockResolvedValueOnce(true)
      .mockRejectedValueOnce(ApiError.badRequest("Không thể xoá vì còn tham chiếu"))
      .mockResolvedValueOnce(true);

    const result = await runBulkDelete(["a", "b", "c"], deleteOne);

    expect(result.deletedIds).toEqual(["a", "c"]);
    expect(result.failed).toEqual([{ id: "b", message: "Không thể xoá vì còn tham chiếu" }]);
  });

  it("lỗi không phải ApiError → dùng message fallback chung", async () => {
    const deleteOne = jest.fn().mockRejectedValue(new Error("unexpected"));

    const result = await runBulkDelete(["a"], deleteOne);

    expect(result.failed).toEqual([{ id: "a", message: "Xoá thất bại" }]);
  });

  it("mảng id rỗng → trả kết quả rỗng, không gọi deleteOne", async () => {
    const deleteOne = jest.fn();

    const result = await runBulkDelete([], deleteOne);

    expect(result).toEqual({ deletedIds: [], failed: [] });
    expect(deleteOne).not.toHaveBeenCalled();
  });
});

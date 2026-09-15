import { DeleteDocumentsByMonthDTO } from "../documents.dto";

// DEV-021/SEC-12 — `DELETE /api/documents/delete-by-month` trước đây KHÔNG
// có validateBody nào (route tự comment "chưa xử lý validation ở đây"),
// kết hợp `deleteDocumentsByMonthService` dùng `new Date(year, month-1, 1)`
// trực tiếp không tự validate — input bất thường có thể tạo Invalid
// Date/NaN trong filter của 1 thao tác xoá hàng loạt.
describe("documents.dto — DeleteDocumentsByMonthDTO (DEV-021/SEC-12)", () => {
  it("từ chối nếu thiếu month hoặc year", () => {
    expect(DeleteDocumentsByMonthDTO.safeParse({ year: 2026 }).success).toBe(false);
    expect(DeleteDocumentsByMonthDTO.safeParse({ month: 9 }).success).toBe(false);
  });

  it("từ chối month ngoài khoảng 1-12", () => {
    expect(DeleteDocumentsByMonthDTO.safeParse({ month: 0, year: 2026 }).success).toBe(false);
    expect(DeleteDocumentsByMonthDTO.safeParse({ month: 13, year: 2026 }).success).toBe(false);
  });

  it("từ chối month/year không phải số (VD chuỗi chữ, hoặc object kiểu NoSQL-injection)", () => {
    expect(DeleteDocumentsByMonthDTO.safeParse({ month: "abc", year: 2026 }).success).toBe(false);
    expect(
      DeleteDocumentsByMonthDTO.safeParse({ month: 9, year: { $gt: 0 } }).success,
    ).toBe(false);
  });

  it("từ chối year ngoài khoảng hợp lệ (2000-2100)", () => {
    expect(DeleteDocumentsByMonthDTO.safeParse({ month: 9, year: 1999 }).success).toBe(false);
    expect(DeleteDocumentsByMonthDTO.safeParse({ month: 9, year: 2101 }).success).toBe(false);
  });

  it("chấp nhận month/year hợp lệ, coerce đúng thành number", () => {
    const result = DeleteDocumentsByMonthDTO.safeParse({ month: 9, year: 2026 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.month).toBe(9);
      expect(result.data.year).toBe(2026);
    }
  });

  it("category/subType/department là optional, department phải đúng ObjectId format nếu có", () => {
    expect(
      DeleteDocumentsByMonthDTO.safeParse({ month: 9, year: 2026 }).success,
    ).toBe(true);
    expect(
      DeleteDocumentsByMonthDTO.safeParse({
        month: 9,
        year: 2026,
        department: "khong-phai-objectid",
      }).success,
    ).toBe(false);
    expect(
      DeleteDocumentsByMonthDTO.safeParse({
        month: 9,
        year: 2026,
        department: "507f1f77bcf86cd799439011",
      }).success,
    ).toBe(true);
  });
});

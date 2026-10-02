import { CreateDepartmentDTO, UpdateDepartmentDTO, QueryDepartmentDTO } from "../departments.dto";

// DEV-021/SEC-11 — `department.routes.ts` trước đây KHÔNG có validateBody
// nào. Khi wire lại, phát hiện 2 DTO có sẵn đã LỆCH `department.model.ts`
// thật (khai `description`/`isActive` không tồn tại trong schema) — sửa lại
// đúng chỉ còn `code`/`name` trước khi wire. Test này khoá đúng shape mới.
describe("departments.dto (DEV-021/SEC-11)", () => {
  describe("CreateDepartmentDTO", () => {
    it("từ chối nếu thiếu code hoặc name", () => {
      expect(CreateDepartmentDTO.safeParse({ name: "Khoa Nội" }).success).toBe(false);
      expect(CreateDepartmentDTO.safeParse({ code: "NOI" }).success).toBe(false);
    });

    it("từ chối code/name rỗng", () => {
      const result = CreateDepartmentDTO.safeParse({ code: "", name: "" });
      expect(result.success).toBe(false);
    });

    it("chấp nhận payload hợp lệ (chỉ code/name)", () => {
      const result = CreateDepartmentDTO.safeParse({ code: "NOI", name: "Khoa Nội" });
      expect(result.success).toBe(true);
    });

    it("bỏ qua field lạ không còn tồn tại trong schema thật (description/isActive)", () => {
      const result = CreateDepartmentDTO.safeParse({
        code: "NOI",
        name: "Khoa Nội",
        description: "field không còn tồn tại trong department.model.ts",
        isActive: true,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).not.toHaveProperty("description");
        expect(result.data).not.toHaveProperty("isActive");
      }
    });
  });

  describe("UpdateDepartmentDTO", () => {
    it("từ chối object rỗng (cần ít nhất 1 field để cập nhật)", () => {
      const result = UpdateDepartmentDTO.safeParse({});
      expect(result.success).toBe(false);
    });

    it("chấp nhận chỉ đổi 1 field (name hoặc code)", () => {
      expect(UpdateDepartmentDTO.safeParse({ name: "Khoa Ngoại" }).success).toBe(true);
      expect(UpdateDepartmentDTO.safeParse({ code: "NGOAI" }).success).toBe(true);
    });

    it("từ chối code/name rỗng nếu có truyền", () => {
      expect(UpdateDepartmentDTO.safeParse({ name: "" }).success).toBe(false);
      expect(UpdateDepartmentDTO.safeParse({ code: "" }).success).toBe(false);
    });
  });

  // [DEV-086] Cùng pattern `QueryAssetCategoryDTO.isActive` — coerce string
  // "true"/"false" (từ query string HTTP) sang boolean, không truyền -> `undefined`
  // (để service tự map thành mặc định `true`, KHÔNG áp mặc định ở DTO).
  describe("QueryDepartmentDTO.isActive", () => {
    it("không truyền -> undefined (service tự mặc định active-only)", () => {
      const result = QueryDepartmentDTO.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.isActive).toBeUndefined();
    });

    it('"true"/"false" -> boolean tương ứng', () => {
      const trueResult = QueryDepartmentDTO.safeParse({ isActive: "true" });
      const falseResult = QueryDepartmentDTO.safeParse({ isActive: "false" });
      expect(trueResult.success && trueResult.data.isActive).toBe(true);
      expect(falseResult.success && falseResult.data.isActive).toBe(false);
    });

    it("giá trị khác 'true'/'false' bị từ chối", () => {
      expect(QueryDepartmentDTO.safeParse({ isActive: "yes" }).success).toBe(false);
    });
  });
});

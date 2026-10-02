import {
  CreateUserDTO,
  ChangePasswordDTO,
  ResetPasswordByAdminDTO,
  UpdateAvatarDTO,
} from "../users.dto";

const VALID_OBJECT_ID = "507f1f77bcf86cd799439011";

describe("users.dto — password policy (DEV-021/SEC-02)", () => {
  describe("CreateUserDTO.password", () => {
    it("từ chối password 7 ký tự", () => {
      const result = CreateUserDTO.safeParse({
        username: "admin_tao",
        password: "1234567",
        fullName: "Nguyễn Văn B",
        role: VALID_OBJECT_ID,
      });
      expect(result.success).toBe(false);
    });

    it("chấp nhận password đúng 8 ký tự", () => {
      const result = CreateUserDTO.safeParse({
        username: "admin_tao",
        password: "12345678",
        fullName: "Nguyễn Văn B",
        role: VALID_OBJECT_ID,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("ChangePasswordDTO", () => {
    it("từ chối newPassword 7 ký tự dù oldPassword hợp lệ", () => {
      const result = ChangePasswordDTO.safeParse({
        oldPassword: "12345",
        newPassword: "1234567",
        confirmPassword: "1234567",
      });
      expect(result.success).toBe(false);
    });

    it("oldPassword vẫn CHỈ cần 5 ký tự (xác thực mật khẩu CŨ, KHÔNG bị nâng ngưỡng)", () => {
      const result = ChangePasswordDTO.safeParse({
        oldPassword: "12345",
        newPassword: "12345678",
        confirmPassword: "12345678",
      });
      expect(result.success).toBe(true);
    });

    it("vẫn từ chối khi newPassword/confirmPassword không khớp", () => {
      const result = ChangePasswordDTO.safeParse({
        oldPassword: "12345",
        newPassword: "12345678",
        confirmPassword: "khac-nhau",
      });
      expect(result.success).toBe(false);
    });
  });

  // DEV-021/SEC-02 — trước đây route `PATCH /api/users/reset-password/:id`
  // KHÔNG có validateBody/DTO nào (đọc thẳng `req.body.newPassword: any`).
  describe("ResetPasswordByAdminDTO (mới, SEC-02)", () => {
    it("từ chối nếu thiếu newPassword", () => {
      const result = ResetPasswordByAdminDTO.safeParse({});
      expect(result.success).toBe(false);
    });

    it("từ chối newPassword dưới 8 ký tự", () => {
      const result = ResetPasswordByAdminDTO.safeParse({ newPassword: "1234567" });
      expect(result.success).toBe(false);
    });

    it("chấp nhận newPassword đúng 8 ký tự", () => {
      const result = ResetPasswordByAdminDTO.safeParse({ newPassword: "12345678" });
      expect(result.success).toBe(true);
    });
  });

  // [MỚI DEV-079] Avatar — lưu base64 thẳng trong User document (không qua
  // file/multer), xem giải thích ở `users.dto.ts`.
  describe("UpdateAvatarDTO (mới, DEV-079)", () => {
    // PNG 1x1 hợp lệ tối thiểu — đủ để test regex + size, không cần ảnh thật.
    const VALID_PNG =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

    it("chấp nhận data URI PNG hợp lệ, kích thước nhỏ", () => {
      const result = UpdateAvatarDTO.safeParse({ avatar: VALID_PNG });
      expect(result.success).toBe(true);
    });

    it("từ chối chuỗi không phải data URI", () => {
      const result = UpdateAvatarDTO.safeParse({ avatar: "not-a-data-url" });
      expect(result.success).toBe(false);
    });

    it("từ chối MIME type không nằm trong danh sách cho phép (vd image/gif)", () => {
      const result = UpdateAvatarDTO.safeParse({ avatar: "data:image/gif;base64,AAAA" });
      expect(result.success).toBe(false);
    });

    it("từ chối ảnh vượt quá 300KB (giải mã)", () => {
      // 500,000 ký tự base64 hợp lệ (chia hết cho 4, không cần padding) ≈
      // 375,000 byte giải mã — vượt ngưỡng 300KB (307,200 byte).
      const oversized = `data:image/png;base64,${"A".repeat(500_000)}`;
      const result = UpdateAvatarDTO.safeParse({ avatar: oversized });
      expect(result.success).toBe(false);
    });

    it("từ chối nếu thiếu field avatar", () => {
      const result = UpdateAvatarDTO.safeParse({});
      expect(result.success).toBe(false);
    });
  });
});

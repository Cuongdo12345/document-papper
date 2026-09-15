import { LoginDTO, RegisterDTO, ResetPasswordDTO } from "../auths.dto";

// DEV-021/SEC-02 — regression test cho ngưỡng độ dài mật khẩu MỚI (min(5) →
// min(8)) ở đúng các field ĐẶT MẬT KHẨU MỚI, và xác nhận KHÔNG đụng
// `LoginDTO.password` (xác thực mật khẩu CŨ đã tồn tại — nâng ngưỡng ở đó
// sẽ khoá đăng nhập của user có mật khẩu 5-7 ký tự tạo dưới policy cũ).
describe("auths.dto — password policy (DEV-021/SEC-02)", () => {
  describe("RegisterDTO.password", () => {
    const base = {
      username: "user_moi",
      email: "user@example.com",
      fullName: "Nguyễn Văn A",
    };

    it("từ chối password 7 ký tự (dưới ngưỡng mới)", () => {
      const result = RegisterDTO.safeParse({
        ...base,
        password: "abcdefg",
        confirmPassword: "abcdefg",
      });
      expect(result.success).toBe(false);
    });

    it("chấp nhận password đúng 8 ký tự", () => {
      const result = RegisterDTO.safeParse({
        ...base,
        password: "abcdefgh",
        confirmPassword: "abcdefgh",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("ResetPasswordDTO.newPassword", () => {
    it("từ chối newPassword 7 ký tự", () => {
      const result = ResetPasswordDTO.safeParse({
        token: "raw-token",
        newPassword: "1234567",
      });
      expect(result.success).toBe(false);
    });

    it("chấp nhận newPassword đúng 8 ký tự", () => {
      const result = ResetPasswordDTO.safeParse({
        token: "raw-token",
        newPassword: "12345678",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("LoginDTO.password — KHÔNG bị nâng ngưỡng (xác thực mật khẩu CŨ)", () => {
    it("vẫn chấp nhận password 5 ký tự (user có mật khẩu tạo dưới policy cũ vẫn đăng nhập được)", () => {
      const result = LoginDTO.safeParse({
        username: "user_cu",
        password: "12345",
      });
      expect(result.success).toBe(true);
    });

    it("vẫn từ chối password dưới 5 ký tự (ngưỡng gốc, không đổi)", () => {
      const result = LoginDTO.safeParse({
        username: "user_cu",
        password: "1234",
      });
      expect(result.success).toBe(false);
    });
  });
});

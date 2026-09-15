import jwt from "jsonwebtoken";
import { generateAccessToken } from "../auth.helper";

// DEV-021/SEC-04 — regression test: `generateAccessToken()` phải CHỈ ký
// `{id}` vào payload JWT. Trước fix, chữ ký hàm còn cho phép truyền thêm
// `role`/`department`, và cả `login()`/`refresh()` (auths.service.ts) đều
// truyền đủ — JWT chỉ ký (sign), không mã hoá, nên bất kỳ ai decode token
// cũng đọc được `role`/`department` object đã populate dù `authenticate`
// middleware không hề dùng tới. Test này khoá lại đúng shape payload để
// chặn regression nếu sau này ai đó vô tình truyền thêm field.
describe("auth.helper — generateAccessToken (DEV-021/SEC-04)", () => {
  beforeAll(() => {
    process.env.JWT_SECRET = "test-secret";
  });

  it("payload JWT CHỈ chứa 'id' (+ iat/exp mặc định của jwt), không có role/department", () => {
    const token = generateAccessToken({ id: "user-123" });
    const decoded = jwt.decode(token) as Record<string, unknown>;

    expect(decoded).toMatchObject({ id: "user-123" });
    expect(decoded).not.toHaveProperty("role");
    expect(decoded).not.toHaveProperty("department");
    // Chỉ 3 field: id (business) + iat/exp (chuẩn JWT tự thêm).
    expect(Object.keys(decoded).sort()).toEqual(["exp", "iat", "id"]);
  });

  it("không cho phép truyền thêm field lạ vào payload ở compile-time (regression cho SEC-04)", () => {
    // @ts-expect-error — chữ ký hàm sau fix chỉ nhận {id: any}, truyền thêm
    // role/department phải bị TypeScript chặn ngay lúc biên dịch. Nếu dòng
    // này KHÔNG còn báo lỗi type nữa (VD ai đó nới lỏng lại chữ ký hàm),
    // `tsc --noEmit`/`ts-jest` sẽ fail vì thiếu lỗi mong đợi ở @ts-expect-error.
    generateAccessToken({ id: "user-123", role: { name: "ADMIN" } });
  });
});

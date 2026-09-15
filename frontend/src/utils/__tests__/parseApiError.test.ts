import { describe, it, expect } from "vitest";
import { parseApiError } from "@/utils/parseApiError";

/** Mô phỏng AxiosError tối thiểu — `axios.isAxiosError()` chỉ check `isAxiosError===true`. */
function mockAxiosError(status: number | undefined, data: unknown) {
  return {
    isAxiosError: true,
    response: status === undefined ? undefined : { status, data },
  };
}

describe("parseApiError", () => {
  it("shape chuẩn success:false + errorCode BAD_REQUEST (Zod) → fieldErrors từ details[].path", () => {
    const err = mockAxiosError(400, {
      success: false,
      message: "Dữ liệu không hợp lệ",
      errorCode: "BAD_REQUEST",
      details: [{ code: "too_small", path: ["password"], message: "Mật khẩu quá ngắn" }],
    });
    const result = parseApiError(err);
    expect(result.errorCode).toBe("BAD_REQUEST");
    expect(result.fieldErrors).toEqual([{ path: "password", message: "Mật khẩu quá ngắn" }]);
  });

  it("shape chuẩn success:false + errorCode VALIDATION_ERROR (Mongoose) → messages là string[] thuần", () => {
    const err = mockAxiosError(400, {
      success: false,
      message: "Lỗi validate",
      errorCode: "VALIDATION_ERROR",
      details: ["Field A không hợp lệ", "Field B không hợp lệ"],
    });
    const result = parseApiError(err);
    expect(result.errorCode).toBe("VALIDATION_ERROR");
    expect(result.messages).toEqual(["Field A không hợp lệ", "Field B không hợp lệ"]);
  });

  it("domain Upload — response chỉ có {message}, KHÔNG có success/errorCode", () => {
    const err = mockAxiosError(404, { message: "Không tìm thấy file" });
    const result = parseApiError(err);
    expect(result.message).toBe("Không tìm thấy file");
    expect(result.errorCode).toBe("UNKNOWN");
  });

  it("network error/timeout — không có response → message tự đặt phía FE", () => {
    const err = mockAxiosError(undefined, undefined);
    const result = parseApiError(err);
    expect(result.errorCode).toBe("NETWORK_ERROR");
    expect(result.message).toMatch(/kết nối/i);
  });

  it("lỗi 401 chuẩn (sai mật khẩu) — message hiển thị trực tiếp, không lộ chi tiết kỹ thuật", () => {
    const err = mockAxiosError(401, {
      success: false,
      message: "Tên đăng nhập hoặc mật khẩu không đúng",
      errorCode: "UNAUTHORIZED",
    });
    const result = parseApiError(err);
    expect(result.message).toBe("Tên đăng nhập hoặc mật khẩu không đúng");
    expect(result.status).toBe(401);
  });
});

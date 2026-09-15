import { Request } from "express";
import ApiError from "../../shared/errors/ApiError";
import { errorHandler } from "../error.middleware";

const fn = () => jest.fn() as any;

const makeRes = () => {
  const res: any = {};
  res.status = fn().mockReturnValue(res);
  res.json = fn().mockReturnValue(res);
  return res;
};

const makeReq = () => ({ method: "GET", originalUrl: "/api/test" }) as unknown as Request;

describe("error.middleware — errorHandler (DEV-021/SEC-23)", () => {
  let consoleErrorSpy: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("lỗi không xác định (500, không phải ApiError/CastError/ValidationError/MulterError): trả message GENERIC, KHÔNG lộ err.message gốc ra client", () => {
    const res = makeRes();
    const err = new Error("connection ECONNREFUSED 127.0.0.1:27017 — chi tiết nội bộ driver MongoDB");

    errorHandler(err, makeReq(), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    const jsonPayload = res.json.mock.calls[0][0];
    expect(jsonPayload.message).not.toContain("ECONNREFUSED");
    expect(jsonPayload.message).not.toContain("27017");
    expect(jsonPayload.message).toBe("Đã có lỗi xảy ra, vui lòng thử lại sau");
    expect(jsonPayload.success).toBe(false);

    // Chi tiết lỗi thật vẫn phải được log đầy đủ ở server (không mất thông
    // tin debug, chỉ ẩn với client).
    expect(consoleErrorSpy).toHaveBeenCalled();
    const loggedPayload = JSON.parse(consoleErrorSpy.mock.calls[0][0] as string);
    expect(loggedPayload.message).toContain("ECONNREFUSED");
  });

  it("err không có .message (edge case) vẫn trả message generic ở nhánh 500, không throw", () => {
    const res = makeRes();
    const err: any = {};

    expect(() => errorHandler(err, makeReq(), res, jest.fn())).not.toThrow();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json.mock.calls[0][0].message).toBe("Đã có lỗi xảy ra, vui lòng thử lại sau");
  });

  it("err có status 4xx hợp lệ nhưng không khớp nhánh nào ở trên: vẫn giữ err.message (không phải lỗi nội bộ, không cần ẩn)", () => {
    const res = makeRes();
    const err: any = new Error("lý do 409 cụ thể, không nhạy cảm");
    err.status = 409;

    errorHandler(err, makeReq(), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json.mock.calls[0][0].message).toBe("lý do 409 cụ thể, không nhạy cảm");
  });

  it("ApiError vẫn hoạt động đúng như cũ (không bị ảnh hưởng bởi thay đổi SEC-23 ở nhánh fallback)", () => {
    const res = makeRes();
    const err = ApiError.badRequest("Thiếu trường bắt buộc");

    errorHandler(err, makeReq(), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Thiếu trường bắt buộc",
        errorCode: "BAD_REQUEST",
      }),
    );
  });

  describe("MongoDB duplicate key (E11000) — nhánh mới, DEV note FE-14 #24", () => {
    it("trùng username: trả 409 + message rõ nghĩa kèm giá trị, KHÔNG lộ message driver gốc", () => {
      const res = makeRes();
      const err: any = new Error(
        "E11000 duplicate key error collection: hospital_documents.users index: username_1 dup key: { username: \"phongkhth\" }",
      );
      err.code = 11000;
      err.keyValue = { username: "phongkhth" };

      errorHandler(err, makeReq(), res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(409);
      const jsonPayload = res.json.mock.calls[0][0];
      expect(jsonPayload.success).toBe(false);
      expect(jsonPayload.message).toBe('Tên đăng nhập "phongkhth" đã tồn tại');
      expect(jsonPayload.errorCode).toBe("DUPLICATE_KEY");
      expect(jsonPayload.message).not.toContain("E11000");
      expect(jsonPayload.message).not.toContain("hospital_documents");
    });

    it("field unique không có trong bảng nhãn (chưa biết trước): fallback dùng đúng tên field, không throw", () => {
      const res = makeRes();
      const err: any = new Error("E11000 duplicate key error");
      err.code = 11000;
      err.keyValue = { someUnmappedField: "abc" };

      errorHandler(err, makeReq(), res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json.mock.calls[0][0].message).toBe('someUnmappedField "abc" đã tồn tại');
    });

    it("keyValue thiếu (edge case) vẫn trả 409 với message chung, không throw", () => {
      const res = makeRes();
      const err: any = new Error("E11000 duplicate key error");
      err.code = 11000;

      expect(() => errorHandler(err, makeReq(), res, jest.fn())).not.toThrow();
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json.mock.calls[0][0].message).toBe("Dữ liệu đã tồn tại");
    });
  });
});

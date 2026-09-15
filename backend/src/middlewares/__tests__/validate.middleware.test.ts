import { z } from "zod";
import { Request } from "express";
import { validateBody, validateParams, validateQuery } from "../validate.middleware";

/**
 * Regression test cho BUG NGHIÊM TRỌNG phát hiện khi code FE-03 (2026-09-05):
 * Express 5 định nghĩa `req.query` là accessor CHỈ CÓ getter (không setter)
 * trên prototype (`express/lib/request.js` — `defineGetter`). Gán trực tiếp
 * `req.query = ...` throw `TypeError`, khiến MỌI route dùng `validateQuery`
 * crash 500 (đã verify thật: `/users`, `/documents`, `/rbac/roles` trước bản
 * vá). Test dưới đây mô phỏng ĐÚNG hành vi accessor getter-only đó trên mock
 * `req` để bug này không thể tái diễn mà không bị test bắt.
 */
const makeReqWithGetterOnlyQuery = (queryValue: Record<string, unknown>): Request => {
  const req: any = { params: {}, body: {} };
  // Mô phỏng chính xác cách Express 5 định nghĩa `req.query`: accessor
  // CHỈ CÓ getter (configurable:true, KHÔNG có `set`) — gán trực tiếp
  // `req.query = x` sẽ throw TypeError giống hệt Express 5 thật.
  Object.defineProperty(req, "query", {
    configurable: true,
    enumerable: true,
    get: () => queryValue,
  });
  return req as Request;
};

describe("validate.middleware — validateQuery (Express 5 getter-only req.query regression)", () => {
  const schema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
  });

  it("KHÔNG throw TypeError khi req.query là accessor getter-only (bug Express 5 đã sửa)", () => {
    const req = makeReqWithGetterOnlyQuery({ page: "2", limit: "20" });
    const next = jest.fn();

    expect(() => validateQuery(schema)(req, {} as any, next)).not.toThrow();
    expect(next).toHaveBeenCalledWith(); // next() gọi không kèm error
  });

  it("req.query sau khi validate chứa đúng data đã coerce (page/limit thành number)", () => {
    const req = makeReqWithGetterOnlyQuery({ page: "2", limit: "20" });
    const next = jest.fn();

    validateQuery(schema)(req, {} as any, next);

    expect(req.query).toEqual({ page: 2, limit: 20 });
  });

  it("query không hợp lệ -> next(ApiError.badRequest), KHÔNG throw", () => {
    const req = makeReqWithGetterOnlyQuery({ page: "0" }); // page phải >= 1
    const next = jest.fn();

    expect(() => validateQuery(schema)(req, {} as any, next)).not.toThrow();
    expect(next).toHaveBeenCalledTimes(1);
    const errArg = next.mock.calls[0][0];
    expect(errArg.status).toBe(400);
  });
});

describe("validate.middleware — validateBody/validateParams (không bị ảnh hưởng, req.body/req.params không phải accessor)", () => {
  it("validateBody gán lại req.body đúng data đã parse", () => {
    const schema = z.object({ name: z.string().min(1) });
    const req = { body: { name: "  test  " } } as unknown as Request;
    const next = jest.fn();

    validateBody(schema)(req, {} as any, next);

    expect(req.body).toEqual({ name: "  test  " });
    expect(next).toHaveBeenCalledWith();
  });

  it("validateParams gán lại req.params đúng data đã parse", () => {
    const schema = z.object({ id: z.string().min(1) });
    const req = { params: { id: "abc123" } } as unknown as Request;
    const next = jest.fn();

    validateParams(schema)(req, {} as any, next);

    expect(req.params).toEqual({ id: "abc123" });
    expect(next).toHaveBeenCalledWith();
  });
});

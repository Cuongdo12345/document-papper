/**
 * BR-20 (DEV-106) — `authenticate`: (1) chỉ 1 truy vấn cho user + role, giữ
 * đúng hình dạng `req.user` cũ; (2) không `console.error` với lỗi xác thực
 * bình thường, nhưng vẫn log lỗi hạ tầng và lỗi cấu hình (thiếu JWT_SECRET).
 */
import jwt from "jsonwebtoken";
import { Types } from "mongoose";

jest.mock("../../models/users/user.model", () => ({ User: { aggregate: jest.fn(), findById: jest.fn() } }));
jest.mock("../../models/rbac/role.model", () => ({ Role: { collection: { name: "roles" }, find: jest.fn() } }));

import { User } from "../../models/users/user.model";
import { Role } from "../../models/rbac/role.model";
import { authenticate } from "../auth.middleware";

const mockedUser = User as any;
const SECRET = "unit-test-secret";
const userId = new Types.ObjectId();
const roleId = new Types.ObjectId();

const sign = (payload: object, opts: jwt.SignOptions = {}, secret = SECRET) =>
  jwt.sign(payload, secret, { algorithm: "HS256", ...opts });

const run = async (token?: string) => {
  const req: any = { headers: token ? { authorization: `Bearer ${token}` } : {} };
  const next = jest.fn();
  await authenticate(req, {} as any, next);
  return { req, next, err: next.mock.calls[0]?.[0] };
};

describe("authenticate (BR-20)", () => {
  let errorSpy: jest.SpyInstance;
  const savedSecret = process.env.JWT_SECRET;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = SECRET;
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
  });
  afterEach(() => {
    errorSpy.mockRestore();
    if (savedSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = savedSecret;
  });

  describe("1 truy vấn cho user + role", () => {
    const dbUser = {
      _id: userId,
      department: new Types.ObjectId(),
      isActive: true,
      role: { _id: roleId, name: "IT", isSystemRole: false },
    };

    it("token hợp lệ -> gọi aggregate ĐÚNG 1 lần (không findById/populate), gắn req.user đúng hình dạng cũ", async () => {
      mockedUser.aggregate.mockResolvedValue([dbUser]);

      const { req, next } = await run(sign({ id: userId.toString() }));

      expect(next).toHaveBeenCalledWith();
      expect(mockedUser.aggregate).toHaveBeenCalledTimes(1);
      expect(mockedUser.findById).not.toHaveBeenCalled();
      expect((Role as any).find).not.toHaveBeenCalled();
      expect(req.user).toEqual({
        _id: userId,
        role: { _id: roleId, name: "IT", isSystemRole: false },
        department: dbUser.department,
        isActive: true,
        permissions: [],
      });
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it("pipeline: $match đúng _id, $lookup role (collection lấy từ model), chỉ chọn name + isSystemRole mặc định false", async () => {
      mockedUser.aggregate.mockResolvedValue([dbUser]);

      await run(sign({ id: userId.toString() }));

      const pipeline = mockedUser.aggregate.mock.calls[0][0];
      expect(pipeline[0]).toEqual({ $match: { _id: userId } });
      const lookup = pipeline[1].$lookup;
      expect(lookup).toMatchObject({ from: "roles", localField: "role", foreignField: "_id", as: "role" });
      expect(lookup.pipeline).toEqual([{ $project: { name: 1, isSystemRole: { $ifNull: ["$isSystemRole", false] } } }]);
    });

    it("role không còn (đã xoá) -> req.user.role = null như populate cũ, không văng lỗi", async () => {
      mockedUser.aggregate.mockResolvedValue([{ ...dbUser, role: null }]);

      const { req, next } = await run(sign({ id: userId.toString() }));

      expect(next).toHaveBeenCalledWith();
      expect(req.user.role).toBeNull();
    });
  });

  describe("lỗi xác thực bình thường -> 401, KHÔNG console.error", () => {
    const expect401 = (err: any) => expect(err).toMatchObject({ status: 401, message: "Token không hợp lệ" });

    it("không có token", async () => {
      const { err } = await run();
      expect401(err);
      expect(mockedUser.aggregate).not.toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it("token hết hạn", async () => {
      const { err } = await run(sign({ id: userId.toString() }, { expiresIn: -10 }));
      expect401(err);
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it("token sai chữ ký", async () => {
      const { err } = await run(sign({ id: userId.toString() }, {}, "secret-khac"));
      expect401(err);
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it("token rác", async () => {
      const { err } = await run("khong-phai-jwt");
      expect401(err);
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it("payload thiếu id / id sai định dạng", async () => {
      expect401((await run(sign({}))).err);
      expect401((await run(sign({ id: "khong-phai-objectid" }))).err);
      expect(mockedUser.aggregate).not.toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it("user không tồn tại / bị vô hiệu hoá", async () => {
      mockedUser.aggregate.mockResolvedValueOnce([]);
      expect401((await run(sign({ id: userId.toString() }))).err);

      mockedUser.aggregate.mockResolvedValueOnce([{ _id: userId, isActive: false, role: null }]);
      expect401((await run(sign({ id: userId.toString() }))).err);

      expect(errorSpy).not.toHaveBeenCalled();
    });
  });

  describe("lỗi BẤT THƯỜNG vẫn được log (giữ mục đích của Sửa A4)", () => {
    it("lỗi hạ tầng (DB down) -> vẫn 401 cho client nhưng có console.error", async () => {
      mockedUser.aggregate.mockRejectedValue(new Error("MongoNetworkError: connection closed"));

      const { err } = await run(sign({ id: userId.toString() }));

      expect(err).toMatchObject({ status: 401, message: "Token không hợp lệ" });
      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy.mock.calls[0][1]).toEqual(expect.objectContaining({ message: expect.stringContaining("MongoNetworkError") }));
    });

    it("thiếu JWT_SECRET (lỗi cấu hình, cũng là JsonWebTokenError) -> có console.error", async () => {
      const token = sign({ id: userId.toString() });
      delete process.env.JWT_SECRET;

      const { err } = await run(token);

      expect(err).toMatchObject({ status: 401 });
      expect(errorSpy).toHaveBeenCalledTimes(1);
    });
  });
});

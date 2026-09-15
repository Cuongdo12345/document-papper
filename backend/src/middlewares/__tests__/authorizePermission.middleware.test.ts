import { getCachedPermissions } from "../../services/rbac/permission.cache";
import { Policy } from "../../models/rbac/policy.model";
import UserAudit from "../../models/users/userAudit.model";
import { evaluatePolicyConditionSafely } from "../../shared/utils/Policycondition.evaluator";
import { authorizePermission } from "../authorizePermission.middleware";

jest.mock("../../services/rbac/permission.cache");
jest.mock("../../models/rbac/policy.model");
jest.mock("../../models/users/userAudit.model");
jest.mock("../../shared/utils/Policycondition.evaluator");

const mockedGetCachedPermissions = jest.mocked(getCachedPermissions);
const mockedPolicyFind = Policy.find as unknown as jest.Mock;
const mockedEvaluate = jest.mocked(evaluatePolicyConditionSafely);

beforeEach(() => {
  // `auditAdminBypass` (nhánh ADMIN bypass) gọi `.catch()` trực tiếp lên kết
  // quả `UserAudit.create(...)` — phải trả về Promise thật (resolve) chứ
  // không phải `undefined` mặc định của auto-mock, nếu không `.catch` sẽ lỗi
  // "Cannot read properties of undefined".
  (UserAudit.create as unknown as jest.Mock).mockResolvedValue({});
});

const makeReq = (user: any) => ({ user } as any);
const makeRes = () => ({} as any);

describe("authorizePermission middleware", () => {
  it("gọi next(ApiError 401) nếu chưa đăng nhập (req.user rỗng)", async () => {
    const next = jest.fn();
    const middleware = authorizePermission("DOCUMENT_VIEW");
    await middleware(makeReq(undefined), makeRes(), next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 401 }));
  });

  it("BYPASS toàn bộ check nếu role.isSystemRole===true, không cần load permission", async () => {
    const next = jest.fn();
    const middleware = authorizePermission("DOCUMENT_CREATE"); // permission cụ thể nào không quan trọng — test ADMIN bypass bất kể permission yêu cầu
    const req = makeReq({ _id: "admin-1", role: { name: "ADMIN", isSystemRole: true } });
    await middleware(req, makeRes(), next);
    expect(next).toHaveBeenCalledWith(); // next() không kèm error = cho qua
    expect(mockedGetCachedPermissions).not.toHaveBeenCalled();
  });

  // 🔒 MỚI (DEV-047, 2026-09-12 — DEV-001A Phase B hoàn tất): regression test
  // cho ĐÚNG hành vi bảo mật vừa siết lại — trước đây `role.name === "ADMIN"`
  // ĐƠN THUẦN (không cần `isSystemRole`) cũng bypass được (lưới đỡ Phase A,
  // chính là gốc rễ RV02-01 — đổi tên 1 role bất kỳ thành chuỗi "ADMIN" là
  // bypass được toàn bộ hệ thống). Nay CHỈ cờ `isSystemRole` mới có tác dụng.
  it("🔒 role.name === 'ADMIN' NHƯNG isSystemRole KHÔNG true: KHÔNG còn bypass (đóng RV02-01 — role rename hijack)", async () => {
    mockedGetCachedPermissions.mockResolvedValue([]); // role "ADMIN" giả này không có permission thật nào
    const next = jest.fn();
    const middleware = authorizePermission("DOCUMENT_CREATE");
    const req = makeReq({ _id: "fake-admin-1", role: { name: "ADMIN", isSystemRole: false } });
    await middleware(req, makeRes(), next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 403 }));
    // Phải rơi xuống bước load permission thật (bước 3) — không bypass ở bước 2 nữa.
    expect(mockedGetCachedPermissions).toHaveBeenCalled();
  });

  // DEV-022/RV02-02 — regression test: `denyPermissions` KHÔNG có bất kỳ
  // tác dụng nào với user đang giữ role ADMIN, dù field này tồn tại trên
  // user object — bypass ở bước 2 xảy ra TRƯỚC khi middleware có cơ hội
  // đọc tới `denyPermissions` (việc đó chỉ xảy ra bên trong
  // `getCachedPermissions()`/`getUserEffectivePermissions()`, xem
  // `permission.service.test.ts` cho phần "deny logic hoạt động đúng với
  // user THƯỜNG"). Test này khoá lại đúng hành vi ĐÃ BIẾT (không phải bug
  // cần sửa) để tránh regression nếu ai đó vô tình đổi thứ tự check.
  it("ADMIN bypass bỏ qua denyPermissions hoàn toàn (RV02-02, hành vi ĐÃ BIẾT — không phải bug)", async () => {
    const next = jest.fn();
    const middleware = authorizePermission("DOCUMENT_DELETE");
    const req = makeReq({
      _id: "admin-2",
      role: { name: "ADMIN", isSystemRole: true },
      // Dù user này bị gán denyPermissions cho đúng permission đang yêu cầu,
      // ADMIN vẫn được cho qua — middleware không bao giờ đọc field này.
      denyPermissions: ["DOCUMENT_DELETE"],
    });
    await middleware(req, makeRes(), next);
    expect(next).toHaveBeenCalledWith();
    expect(mockedGetCachedPermissions).not.toHaveBeenCalled();
  });

  it("cho qua nếu user CÓ đúng permission yêu cầu (RBAC)", async () => {
    mockedGetCachedPermissions.mockResolvedValue(["DOCUMENT_VIEW", "DOCUMENT_UPDATE"]);
    const next = jest.fn();
    const middleware = authorizePermission("DOCUMENT_VIEW");
    const req = makeReq({ _id: "u1", role: { name: "USER" } });
    await middleware(req, makeRes(), next);
    expect(next).toHaveBeenCalledWith();
  });

  it("chặn 403 nếu user KHÔNG có permission yêu cầu và không bật ABAC", async () => {
    mockedGetCachedPermissions.mockResolvedValue(["DOCUMENT_VIEW"]);
    const next = jest.fn();
    const middleware = authorizePermission("ASSET_DELETE");
    const req = makeReq({ _id: "u1", role: { name: "USER" } });
    await middleware(req, makeRes(), next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 403 }));
  });

  it("requireAll=true: PHẢI có ĐỦ tất cả permission trong mảng mới cho qua", async () => {
    mockedGetCachedPermissions.mockResolvedValue(["DOCUMENT_VIEW"]); // thiếu DOCUMENT_UPDATE
    const next = jest.fn();
    const middleware = authorizePermission(["DOCUMENT_VIEW", "DOCUMENT_UPDATE"], {
      requireAll: true,
    });
    const req = makeReq({ _id: "u1", role: { name: "USER" } });
    await middleware(req, makeRes(), next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 403 }));
  });

  it("requireAll=false (mặc định): chỉ cần 1 trong nhiều permission là đủ", async () => {
    mockedGetCachedPermissions.mockResolvedValue(["DOCUMENT_UPDATE"]);
    const next = jest.fn();
    const middleware = authorizePermission(["DOCUMENT_VIEW", "DOCUMENT_UPDATE"]);
    const req = makeReq({ _id: "u1", role: { name: "USER" } });
    await middleware(req, makeRes(), next);
    expect(next).toHaveBeenCalledWith();
  });

  it("thiếu RBAC nhưng ABAC Policy khớp điều kiện → vẫn cho qua", async () => {
    mockedGetCachedPermissions.mockResolvedValue([]); // không có RBAC permission nào
    mockedPolicyFind.mockResolvedValue([{ condition: "user.department == resource.department" }]);
    mockedEvaluate.mockReturnValue(true); // policy evaluator nói: điều kiện đúng
    const next = jest.fn();
    const middleware = authorizePermission("DOCUMENT_VIEW", {
      enablePolicies: true,
      resource: "DOCUMENT",
      action: "READ",
    });
    const req = makeReq({ _id: "u1", role: { name: "USER" }, department: "KHOA_A" });
    await middleware(req, makeRes(), next);
    expect(next).toHaveBeenCalledWith();
  });

  it("ABAC bật nhưng KHÔNG có Policy nào khớp điều kiện → vẫn 403", async () => {
    mockedGetCachedPermissions.mockResolvedValue([]);
    mockedPolicyFind.mockResolvedValue([{ condition: "user.department == resource.department" }]);
    mockedEvaluate.mockReturnValue(false); // điều kiện KHÔNG khớp
    const next = jest.fn();
    const middleware = authorizePermission("DOCUMENT_VIEW", {
      enablePolicies: true,
      resource: "DOCUMENT",
      action: "READ",
    });
    const req = makeReq({ _id: "u1", role: { name: "USER" } });
    await middleware(req, makeRes(), next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 403 }));
  });

  it("lỗi khi evaluate 1 policy KHÔNG làm sập middleware — vẫn tiếp tục xét policy khác/trả 403 thay vì throw 500", async () => {
    mockedGetCachedPermissions.mockResolvedValue([]);
    mockedPolicyFind.mockResolvedValue([{ condition: "syntax(( sai" }]);
    mockedEvaluate.mockImplementation(() => {
      throw new Error("Lỗi cú pháp policy");
    });
    const next = jest.fn();
    const middleware = authorizePermission("DOCUMENT_VIEW", {
      enablePolicies: true,
      resource: "DOCUMENT",
      action: "READ",
    });
    const req = makeReq({ _id: "u1", role: { name: "USER" } });
    await middleware(req, makeRes(), next);
    // Không throw 500 do lỗi evaluator — vẫn xử lý như "policy này không pass", kết quả cuối là 403.
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 403 }));
  });
});

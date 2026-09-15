jest.mock("../../../models/users/user.model");

import { User } from "../../../models/users/user.model";
import { getUserEffectivePermissions } from "../permission.service";

const mockedUser = User as any;

const makePopulateChain = (resolvedUser: any) => {
  const chain: any = {};
  chain.populate = jest.fn().mockReturnValue(chain);
  chain.then = (resolve: any) => Promise.resolve(resolvedUser).then(resolve);
  return chain;
};

/**
 * DEV-022/RV02-02 — regression test cho phần "control" của finding: xác
 * nhận `denyPermissions` HOẠT ĐỘNG ĐÚNG (loại bỏ khỏi kết quả cuối) cho user
 * THƯỜNG (không phải ADMIN) — đây CHÍNH LÀ cơ chế mà `authorizePermission`
 * middleware KHÔNG BAO GIỜ gọi tới cho user ADMIN (do bypass ở bước 2, xem
 * `authorizePermission.middleware.test.ts` — test "ADMIN bypass bỏ qua
 * denyPermissions"). 2 test file này ghép lại xác nhận đầy đủ hành vi đã
 * biết của RV02-02: deny logic ĐÚNG, nhưng KHÔNG BAO GIỜ được thực thi cho
 * ADMIN.
 */
describe("permission.service — getUserEffectivePermissions (DEV-022/RV02-02)", () => {
  it("loại bỏ permission nằm trong denyPermissions khỏi kết quả cuối (user thường)", async () => {
    mockedUser.findById.mockReturnValue(
      makePopulateChain({
        _id: "u1",
        role: {
          permissions: [{ name: "DOCUMENT_VIEW" }, { name: "DOCUMENT_DELETE" }],
        },
        extraPermissions: [{ name: "ASSET_VIEW" }],
        denyPermissions: [{ name: "DOCUMENT_DELETE" }],
      }),
    );

    const result = await getUserEffectivePermissions("u1");

    expect(result).toEqual(
      expect.arrayContaining(["DOCUMENT_VIEW", "ASSET_VIEW"]),
    );
    expect(result).not.toContain("DOCUMENT_DELETE");
  });

  it("denyPermissions rỗng: không loại bỏ gì, giữ nguyên role+extra permissions", async () => {
    mockedUser.findById.mockReturnValue(
      makePopulateChain({
        _id: "u1",
        role: { permissions: [{ name: "DOCUMENT_VIEW" }] },
        extraPermissions: [],
        denyPermissions: [],
      }),
    );

    const result = await getUserEffectivePermissions("u1");

    expect(result).toEqual(["DOCUMENT_VIEW"]);
  });
});

/**
 * DEV-080 — E2E: cây danh mục tài sản, qua HTTP THẬT (supertest + MongoDB
 * in-memory). Unit test (`assetCategory.service.tree.test.ts`) dùng mock
 * Model — file này xác nhận các query thật (`$in` con cháu, `$unset`, duyệt
 * tổ tiên) chạy đúng trên MongoDB thật, không chỉ đúng trên mock.
 *
 * Không có route/permission mới (chỉ đổi quy tắc trên route sẵn có (GĐ 8: nay là /api/it-assets)
 * `ASSET_CATEGORY_*`/`ASSET_*`) — không cần test 403 mới theo CLAUDE.md §18.
 */
import request from "supertest";
import { startE2EDatabase, stopE2EDatabase } from "./setup";
import { seedDepartments, seedRbac, seedUser } from "./seedTestData";

const PASSWORD = "Password123";

describe("E2E — Cây danh mục tài sản (DEV-080)", () => {
  let app: import("express").Express;
  let token: string;
  let deptId: string;
  const ids: Record<string, string> = {};

  const api = () => ({
    post: (url: string, body: any) => request(app).post(url).set("Authorization", `Bearer ${token}`).send(body),
    put: (url: string, body: any) => request(app).put(url).set("Authorization", `Bearer ${token}`).send(body),
    get: (url: string) => request(app).get(url).set("Authorization", `Bearer ${token}`),
  });

  const createCategory = async (code: string, parent?: string) => {
    const res = await api().post("/api/it-assets/categories", {
      code,
      name: `Danh mục ${code}`,
      // DEV-112: danh mục gốc phải chọn loại tài sản; con kế thừa.
      ...(parent ? { parentCategory: ids[parent] } : { assetType: "IT" }),
    });
    expect(res.status).toBe(201);
    ids[code] = res.body.data._id;
  };

  beforeAll(async () => {
    await startE2EDatabase();
    app = (await import("../../app")).default;
    const roleIds = await seedRbac();
    deptId = (await seedDepartments()).deptA;
    await seedUser({ username: "tree_admin", password: PASSWORD, fullName: "Admin cây", roleId: roleIds.ADMIN, departmentId: deptId });
    token = (await request(app).post("/api/auths/login").send({ username: "tree_admin", password: PASSWORD })).body.data.accessToken;

    // ROOT → GROUP → LEAF ; OTHER (gốc riêng)
    await createCategory("ROOT");
    await createCategory("GROUP", "ROOT");
    await createCategory("LEAF", "GROUP");
    await createCategory("OTHER");
  }, 60_000);

  afterAll(async () => {
    await stopE2EDatabase();
  });

  it("tạo tài sản vào danh mục NHÓM → 400; vào danh mục LÁ → 201", async () => {
    const toGroup = await api().post("/api/it-assets", { category: ids.GROUP, department: deptId, name: "Máy test nhóm" });
    expect(toGroup.status).toBe(400);
    expect(toGroup.body.message).toContain("cấp cuối");

    const toLeaf = await api().post("/api/it-assets", { category: ids.LEAF, department: deptId, name: "Máy test lá" });
    expect(toLeaf.status).toBe(201);
    ids.ASSET = toLeaf.body.data._id;
  });

  it("sửa tài sản chuyển sang danh mục NHÓM → 400", async () => {
    const res = await api().put(`/api/it-assets/${ids.ASSET}`, { category: ids.ROOT });
    expect(res.status).toBe(400);
  });

  it("lọc GET /assets theo danh mục GỐC → gồm tài sản ở danh mục cháu; theo nhánh khác → rỗng", async () => {
    const byRoot = await api().get(`/api/it-assets?category=${ids.ROOT}`);
    expect(byRoot.status).toBe(200);
    expect(byRoot.body.data.map((a: any) => a._id)).toEqual([ids.ASSET]);

    const byOther = await api().get(`/api/it-assets?category=${ids.OTHER}`);
    expect(byOther.body.data).toHaveLength(0);
  });

  it("đặt cha của ROOT = LEAF (cháu của nó) → 400 vòng lặp", async () => {
    const res = await api().put(`/api/it-assets/categories/${ids.ROOT}`, { parentCategory: ids.LEAF });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain("con/cháu");
  });

  it("tạo danh mục con dưới LEAF (đang chứa tài sản) → 400", async () => {
    const res = await api().post("/api/it-assets/categories", { code: "UNDER_LEAF", name: "x", parentCategory: ids.LEAF });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain("chứa tài sản");
  });

  it("DEV-081 — lọc danh sách danh mục theo `level`/`group` + phân trang ở server", async () => {
    const codes = async (qs: string) => {
      const res = await api().get(`/api/it-assets/categories?limit=50&${qs}`);
      expect(res.status).toBe(200);
      return res.body.data.map((c: any) => c.code).sort();
    };

    expect(await codes("level=leaf")).toEqual(["LEAF", "OTHER"]);
    expect(await codes("level=group")).toEqual(["GROUP", "ROOT"]);
    // Nhánh của ROOT: mọi con cháu, KHÔNG gồm chính ROOT.
    expect(await codes(`group=${ids.ROOT}`)).toEqual(["GROUP", "LEAF"]);
    expect(await codes(`group=${ids.ROOT}&level=leaf`)).toEqual(["LEAF"]);
    expect(await codes(`group=${ids.OTHER}`)).toEqual([]);

    const paged = await api().get("/api/it-assets/categories?level=leaf&limit=1&page=2");
    expect(paged.body.data).toHaveLength(1);
    expect(paged.body.pagination).toMatchObject({ page: 2, limit: 1, total: 2, totalPages: 2 });
  });

  it("parentCategory = null → gỡ cha thật trong DB (GET trả không có danh mục cha)", async () => {
    // DEV-112: thành danh mục gốc thì phải chọn loại (cùng loại cũ nên tài sản trong nhánh không bị ảnh hưởng).
    const res = await api().put(`/api/it-assets/categories/${ids.GROUP}`, { parentCategory: null, assetType: "IT" });
    expect(res.status).toBe(200);

    const detail = await api().get(`/api/it-assets/categories/${ids.GROUP}`);
    expect(detail.body.data.parentCategory).toBeUndefined();

    // Gỡ xong, lọc theo ROOT không còn gồm tài sản của nhánh GROUP.
    const byRoot = await api().get(`/api/it-assets?category=${ids.ROOT}`);
    expect(byRoot.body.data).toHaveLength(0);
  });
});

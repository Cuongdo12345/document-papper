/**
 * BR-06 (docs/31_BACKEND_CODE_REVIEW.md, DEV-100, 2026-09-30) — E2E: khoa/phòng
 * đã xoá mềm (DEV-086) KHÔNG nhận dữ liệu mới, qua HTTP THẬT (supertest +
 * MongoDB in-memory). Kèm phần user duyệt thêm: không xoá được khoa còn vật tư
 * đang hoạt động hoặc dự trù vật tư đang chờ.
 *
 * Không có route/permission mới — chỉ thêm điều kiện vào route có sẵn.
 */
import request from "supertest";
import { startE2EDatabase, stopE2EDatabase } from "./setup";
import { seedRbac, seedDepartments, seedUser } from "./seedTestData";
import Department from "../../models/departments/department.model";
import { User } from "../../models/users/user.model";
import { Document } from "../../models/documents/document.model";
import { ConsumableItem } from "../../models/inventory/consumableItem.model";

const PASSWORD = "Password123";

describe("E2E — Khoa đã xoá mềm không nhận dữ liệu mới (BR-06)", () => {
  let app: import("express").Express;
  let token: string;
  let roleIds: Record<string, string>;
  let activeDept: string;
  let deletedDept: string;
  const deletedMsg = `Khoa/phòng "Khoa đã xoá" đã bị xoá (ngừng hoạt động)`;

  const api = {
    post: (url: string, body?: any) => request(app).post(url).set("Authorization", `Bearer ${token}`).send(body),
    put: (url: string, body?: any) => request(app).put(url).set("Authorization", `Bearer ${token}`).send(body),
    delete: (url: string) => request(app).delete(url).set("Authorization", `Bearer ${token}`),
  };

  const createDept = async (code: string, name: string) => {
    const res = await api.post("/api/departments", { code, name });
    expect(res.status).toBe(201);
    return res.body.data._id as string;
  };

  beforeAll(async () => {
    await startE2EDatabase();
    app = (await import("../../app")).default;
    roleIds = await seedRbac();
    activeDept = (await seedDepartments()).deptA;

    await seedUser({ username: "br06_admin", password: PASSWORD, fullName: "Admin", roleId: roleIds.ADMIN, departmentId: activeDept });
    token = (await request(app).post("/api/auths/login").send({ username: "br06_admin", password: PASSWORD })).body.data.accessToken;

    // Xoá mềm qua đúng API (khoa rỗng nên được phép xoá).
    deletedDept = await createDept("DAXOA", "Khoa đã xoá");
    expect((await api.delete(`/api/departments/${deletedDept}`)).status).toBe(200);
  }, 60_000);

  afterAll(async () => {
    await stopE2EDatabase();
  });

  describe("tạo mới vào khoa đã xoá -> 400, không ghi gì", () => {
    it("tạo user (role USER)", async () => {
      const res = await api.post("/api/users", {
        username: "br06_new_user", password: "Password123", fullName: "User mới", role: roleIds.USER, department: deletedDept,
      });
      expect(res.status).toBe(400);
      expect(res.body.message).toBe(deletedMsg);
      expect(await User.exists({ username: "br06_new_user" })).toBeNull();
    });

    it("tạo user role KHÁC USER (trước đây không kiểm tra khoa)", async () => {
      const res = await api.post("/api/users", {
        username: "br06_new_it", password: "Password123", fullName: "IT mới", role: roleIds.IT, department: deletedDept,
      });
      expect(res.status).toBe(400);
      expect(res.body.message).toBe(deletedMsg);
    });

    it("tạo tài liệu (ADMIN, không bị chặn bởi phạm vi khoa)", async () => {
      const res = await api.post("/api/documents/proposal", {
        category: "PROPOSAL", subType: "PROPOSE_PROCUREMENT", title: "Đề xuất BR-06", department: deletedDept, meta: { note: "br06" },
      });
      expect(res.status).toBe(400);
      expect(res.body.message).toBe(deletedMsg);
      expect(await Document.exists({ department: deletedDept })).toBeNull();
    });

    it("tạo vật tư tiêu hao", async () => {
      const res = await api.post("/api/inventory/items", { name: "Găng tay", unit: "hộp", department: deletedDept });
      expect(res.status).toBe(400);
      expect(res.body.message).toBe(deletedMsg);
      expect(await ConsumableItem.exists({ department: deletedDept })).toBeNull();
    });

    it("tạo dự trù vật tư", async () => {
      const res = await api.post("/api/inventory/requests", {
        department: deletedDept, requestMonth: "2026-10",
        items: [{ consumableItem: "507f1f77bcf86cd799439011", quantity: 1, unitPrice: 1000 }],
      });
      expect(res.status).toBe(400);
      expect(res.body.message).toBe(deletedMsg);
    });

    it("khoa đang hoạt động vẫn tạo bình thường (đối chứng)", async () => {
      const res = await api.post("/api/inventory/items", { name: "Khẩu trang", unit: "hộp", department: activeDept });
      expect(res.status).toBe(201);
    });
  });

  describe("sửa user — chỉ chặn khi ĐỔI sang khoa đã xoá", () => {
    it("đổi user sang khoa đã xoá -> 400, khoa giữ nguyên", async () => {
      const u = await seedUser({ username: "br06_move", password: PASSWORD, fullName: "Chuyển khoa", roleId: roleIds.USER, departmentId: activeDept });
      const res = await api.put(`/api/users/${u._id}`, { department: deletedDept });
      expect(res.status).toBe(400);
      expect(res.body.message).toBe(deletedMsg);
      expect(String((await User.findById(u._id))!.department)).toBe(activeDept);
    });

    it("user ĐANG thuộc khoa đã xoá, form gửi lại đúng khoa cũ khi sửa tên -> 200", async () => {
      // Dữ liệu cũ: user được gán khi khoa còn hoạt động, khoa bị ẩn sau đó
      // (mô phỏng trực tiếp ở DB — qua API thì không xoá được khoa còn user).
      const legacyDept = await createDept("CU", "Khoa cũ");
      const u = await seedUser({ username: "br06_legacy", password: PASSWORD, fullName: "Tên cũ", roleId: roleIds.USER, departmentId: legacyDept });
      await Department.updateOne({ _id: legacyDept }, { isActive: false });

      const res = await api.put(`/api/users/${u._id}`, { fullName: "Tên mới", department: legacyDept });
      expect(res.status).toBe(200);
      expect((await User.findById(u._id))!.fullName).toBe("Tên mới");
    });
  });

  describe("khôi phục dữ liệu thuộc khoa đã xoá -> chặn (user duyệt thêm)", () => {
    it("khôi phục user: vô hiệu hoá -> xoá khoa -> khôi phục -> 400, user vẫn vô hiệu", async () => {
      const dept = await createDept("KPUSER", "Khoa khôi phục user");
      const u = await seedUser({ username: "br06_restore", password: PASSWORD, fullName: "Khôi phục", roleId: roleIds.USER, departmentId: dept });
      expect((await api.delete(`/api/users/${u._id}`)).status).toBe(200);
      expect((await api.delete(`/api/departments/${dept}`)).status).toBe(200);

      const res = await request(app).patch(`/api/users/restore/${u._id}`).set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(400);
      expect(res.body.message).toBe(`Khoa/phòng "Khoa khôi phục user" đã bị xoá (ngừng hoạt động)`);
      expect((await User.findById(u._id))!.isActive).toBe(false);
    });

    it("khôi phục vật tư hàng loạt: dòng thuộc khoa đã xoá bị từ chối, dòng khác vẫn khôi phục", async () => {
      const dept = await createDept("KPVT", "Khoa khôi phục vật tư");
      const gone = await api.post("/api/inventory/items", { name: "Gạc", unit: "gói", department: dept });
      const kept = await api.post("/api/inventory/items", { name: "Băng dính", unit: "cuộn", department: activeDept });
      const ids = [gone.body.data._id, kept.body.data._id];
      expect((await api.post("/api/inventory/items/bulk-delete", { ids })).status).toBe(200);
      expect((await api.delete(`/api/departments/${dept}`)).status).toBe(200);

      const res = await api.post("/api/inventory/items/bulk-restore", { ids });
      expect(res.status).toBe(200);
      expect(res.body.data.deletedIds).toEqual([kept.body.data._id]);
      expect(res.body.data.failed).toEqual([
        { id: gone.body.data._id, message: `Khoa/phòng "Khoa khôi phục vật tư" đã bị xoá (ngừng hoạt động)` },
      ]);
      expect((await ConsumableItem.findById(gone.body.data._id))!.isActive).toBe(false);
    });
  });

  describe("xoá khoa còn vật tư / dự trù (user duyệt thêm)", () => {
    it("còn vật tư đang hoạt động -> 400, khoa vẫn hoạt động", async () => {
      const dept = await createDept("CONVATTU", "Khoa còn vật tư");
      expect((await api.post("/api/inventory/items", { name: "Bông", unit: "gói", department: dept })).status).toBe(201);

      const res = await api.delete(`/api/departments/${dept}`);
      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Không thể xoá khoa vì vẫn còn vật tư tiêu hao đang hoạt động thuộc khoa này");
      expect((await Department.findById(dept))!.isActive).toBe(true);
    });

    it("còn dự trù đang chờ (PENDING) -> 400; vật tư đã ẩn không chặn", async () => {
      const dept = await createDept("CONDUTRU", "Khoa còn dự trù");
      const item = await api.post("/api/inventory/items", { name: "Cồn", unit: "chai", department: dept });
      expect(item.status).toBe(201);
      const req = await api.post("/api/inventory/requests", {
        department: dept, requestMonth: "2026-10",
        items: [{ consumableItem: item.body.data._id, quantity: 2, unitPrice: 5000 }],
      });
      expect(req.status).toBe(201);
      // Ẩn vật tư để chỉ còn dự trù PENDING là lý do chặn.
      await ConsumableItem.updateOne({ _id: item.body.data._id }, { isActive: false });

      const res = await api.delete(`/api/departments/${dept}`);
      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Không thể xoá khoa vì vẫn còn dự trù vật tư đang chờ của khoa này");
    });
  });
});

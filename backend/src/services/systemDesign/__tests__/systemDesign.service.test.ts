import mongoose from "mongoose";
import { getSystemDesignService } from "../systemDesign.service";

/**
 * DEV-073 (2026-09-21) — test KHÔNG mock model nào, cố ý dùng schema
 * Mongoose THẬT (đúng mục đích: endpoint đọc trực tiếp schema thật, không
 * parse tài liệu). Không cần kết nối DB — chỉ đọc metadata schema đã
 * compile sẵn trong process (`model.schema.paths`, `model.collection.name`
 * đều là thuộc tính tĩnh, không gọi query nào).
 */
describe("systemDesign.service — getSystemDesignService (DEV-073)", () => {
  it("trả đủ toàn bộ model hiện có — khớp số lượng mongoose.modelNames()", () => {
    const result = getSystemDesignService();

    expect(result.totalModels).toBe(mongoose.modelNames().length);
    expect(result.models).toHaveLength(mongoose.modelNames().length);
    // Guard chống false-positive nếu buildModelDomainMap() lỡ không require
    // được file nào (vd đường dẫn models/ sai) — khi đó mongoose.modelNames()
    // cũng sẽ rỗng theo và assertion trên vẫn PASS dù thực tế endpoint hỏng.
    expect(result.totalModels).toBeGreaterThanOrEqual(31); // 31 model CONFIRMED tại DEV-071 (2026-09-21), có thể tăng thêm sau này
  });

  it("mỗi model có module (domain) suy ra được từ thư mục — không rơi vào 'unknown'", () => {
    const result = getSystemDesignService();

    for (const model of result.models) {
      expect(model.module).not.toBe("unknown");
      expect(model.fields.length).toBeGreaterThan(0);
    }
  });

  it("modules suy ra đúng từ tên thư mục domain thật (vendors = Vendor + Contract)", () => {
    const result = getSystemDesignService();
    const vendorsModule = result.modules.find((m) => m.name === "vendors");

    expect(vendorsModule?.models.slice().sort()).toEqual(["Contract", "Vendor"]);
  });

  it("phát hiện đúng quan hệ ref trực tiếp từ schema — 4 dạng khai báo khác nhau đã xác nhận có thật trong source", () => {
    const result = getSystemDesignService();
    const relationsOf = (modelName: string) => result.relationships.filter((r) => r.model === modelName);

    // ObjectId đơn: User.role -> Role
    expect(relationsOf("User")).toContainEqual({ model: "User", field: "role", ref: "Role" });

    // Mảng shorthand ({type:[ObjectId], ref}): User.extraPermissions[] -> Permission
    expect(relationsOf("User")).toContainEqual({ model: "User", field: "extraPermissions[]", ref: "Permission" });

    // Mảng object-literal ([{type:ObjectId, ref}]): Contract.assets[] -> Asset
    expect(relationsOf("Contract")).toContainEqual({ model: "Contract", field: "assets[]", ref: "Asset" });

    // Subdocument đệ quy: WorkflowInstance.steps[].approvedBy -> User
    expect(relationsOf("WorkflowInstance")).toContainEqual({
      model: "WorkflowInstance",
      field: "steps[].approvedBy",
      ref: "User",
    });

    // Self-reference: Document.referenceTo[] -> Document
    expect(relationsOf("Document")).toContainEqual({ model: "Document", field: "referenceTo[]", ref: "Document" });
  });

  // [DEV-086] ĐỔI model mẫu từ Department -> Counter: Department nay có
  // `deletedBy` (ref thật -> User, xoá mềm) nên KHÔNG còn "0 ObjectId" —
  // đây là quan hệ THẬT (đúng ý đồ suy diễn của hàm), không phải false-positive
  // cần assert bằng 0 nữa. Counter (`key`/`seq`, không field nào là ObjectId)
  // vẫn giữ đúng ý nghĩa gốc của test này.
  it("KHÔNG có quan hệ ảo nào bị suy diễn cho model không có ref thật (Counter chỉ 2 field, không có ObjectId nào)", () => {
    const result = getSystemDesignService();
    const counterRelations = result.relationships.filter((r) => r.model === "Counter");

    expect(counterRelations).toHaveLength(0);
  });

  // [DEV-086] Department nay có xoá mềm (cùng convention AssetCategory) —
  // `deletedBy` là quan hệ THẬT tới User, phải xuất hiện đúng trong sơ đồ
  // System Design (không phải model "mồ côi" như trước).
  it("Department có quan hệ deletedBy -> User (DEV-086, xoá mềm)", () => {
    const result = getSystemDesignService();
    const departmentRelations = result.relationships.filter((r) => r.model === "Department");

    expect(departmentRelations).toContainEqual({ model: "Department", field: "deletedBy", ref: "User" });
  });
});

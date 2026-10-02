import mongoose, { Document as MongoDoc, Schema } from "mongoose";
import type { IDepartment } from "../../interfaces/departments/department.interface";

const DepartmentSchema = new Schema<IDepartment>(
  {
    code: { type: String, required: true, unique: true, uppercase: true }, // CNTT, HCQT, KHTH
    name: { type: String, required: true, trim: true },
    createdAt: { type: Date, default: Date.now }, // Công nghệ thông tin

    // [DEV-086] Xoá mềm — cùng field/convention với AssetCategory
    // (`assetCategory.model.ts`). `code` giữ nguyên `unique: true` KHÔNG
    // partial filter — mã đã xoá mềm KHÔNG được tái sử dụng, cùng lý do
    // AssetCategory/Document giữ mã cũ duy nhất vĩnh viễn (tránh nhầm lẫn
    // báo cáo/lịch sử).
    isActive: { type: Boolean, default: true },
    deletedBy: { type: Schema.Types.ObjectId, ref: "User" },
    deletedAt: { type: Date, default: undefined },
  },
  { timestamps: true },
);

export default mongoose.model<IDepartment>("Department", DepartmentSchema);

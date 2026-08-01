import mongoose, { Document as MongoDoc, Schema } from "mongoose";
import type { IDepartment } from "../../interfaces/departments/department.interface";

const DepartmentSchema = new Schema<IDepartment>(
  {
    code: { type: String, required: true, unique: true, uppercase: true }, // CNTT, HCQT, KHTH
    name: { type: String, required: true, trim: true },
    createdAt: { type: Date, default: Date.now }, // Công nghệ thông tin
  },
  { timestamps: true },
);

export default mongoose.model<IDepartment>("Department", DepartmentSchema);

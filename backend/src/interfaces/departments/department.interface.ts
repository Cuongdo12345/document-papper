import type { Document as MongoDoc, Types } from "mongoose";

export interface IDepartment extends MongoDoc {
  code: string; // CNTT, HCQT, KHTH
  name: string; // Công nghệ thông tin
  createdAt: Date;
  // [DEV-086] Xoá mềm — cùng field/convention với AssetCategory.
  isActive: boolean;
  deletedBy?: Types.ObjectId;
  deletedAt?: Date;
}

import type { Document as MongoDoc } from "mongoose";

export interface IDepartment extends MongoDoc {
  code: string; // CNTT, HCQT, KHTH
  name: string; // Công nghệ thông tin
  createdAt: Date;
}

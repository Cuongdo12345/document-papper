import type { Types } from "mongoose";

export interface IUser {
  username: string;
  password: string;
  fullName: string;
  email?: string;
  department?: Types.ObjectId;
  role: Types.ObjectId;
  extraPermissions: Types.ObjectId[];
  denyPermissions: Types.ObjectId[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
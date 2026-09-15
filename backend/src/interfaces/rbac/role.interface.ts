import type { Types } from "mongoose";

export interface IRole {
  name: string;
  permissions: Types.ObjectId[];
  // 🔒 DEV-001A — security identity bất biến của Super Admin, TÁCH khỏi
  // display name `name` (có thể đổi qua UpdateRoleDTO, dù DEV-001 đã khoá
  // rename literal "ADMIN"). KHÔNG được expose qua CreateRoleDTO/UpdateRoleDTO
  // — chỉ set được qua migration script, không qua API công khai.
  isSystemRole?: boolean;
}

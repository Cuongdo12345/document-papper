
import { Types } from "mongoose";

declare global {
  namespace Express {
    interface Request {
      // =================================================
      // AUTH USER
      // =================================================

      user?: {
        _id: Types.ObjectId;

        // 🔐 Role
        role: {
          _id: Types.ObjectId;
          name: string;
          // 🔒 DEV-001A — security identity bất biến của Super Admin, đọc
          // từ `Role.isSystemRole` (populate ở auth.middleware.ts). Dùng
          // thay cho so khớp `name === "ADMIN"` ở mọi authorization decision.
          isSystemRole?: boolean;
        };

        // 🧠 Computed permissions
        // DEV-025/ARCH-17: type khai báo `string[]` không phản ánh đúng
        // vòng đời request THẬT — có 2 giai đoạn: ngay sau `authenticate`
        // (auth.middleware.ts) field này LUÔN là `[]` (rỗng), chỉ được
        // populate đúng giá trị SAU KHI `authorizePermission.middleware.ts`
        // chạy xong. Bất kỳ code nào đọc `req.user.permissions` TRƯỚC
        // `authorizePermission` (vd 1 middleware khác chạy sớm hơn trong
        // chain) sẽ nhận `[]` sai một cách ÂM THẦM — TypeScript không cảnh
        // báo vì kiểu dữ liệu vẫn đúng `string[]`, chỉ giá trị runtime sai
        // thời điểm. Không đổi type (narrowing sẽ over-engineer cho 1 rủi ro
        // LOW, chưa có evidence bug thật) — chỉ ghi rõ ràng buộc thứ tự
        // middleware tại đây để code sau này không đọc nhầm.
        permissions: string[];

        // 🏢 Department
        department?: Types.ObjectId;

        // ⚡ trạng thái user
        isActive?: boolean;

        // 🔥 optional flags
        // isSuperAdmin?: boolean;
      };

      // =================================================
      // ABAC RESOURCE
      // =================================================

      resource?: unknown;

      // =================================================
      // SPECIFIC RESOURCE TYPES
      // =================================================

      document?: any;

      workflow?: any;

      departmentResource?: any;

      // =================================================
      // AUTH CONTEXT
      // =================================================

      authContext?: {
        action?: string;

        resource?: string;

        policiesChecked?: boolean;

        permissionSource?: 
          | "ROLE"
          | "POLICY"
          | "RESOURCE_PERMISSION";

        grantedBy?: string;
      };
    }
  }
}

export {};



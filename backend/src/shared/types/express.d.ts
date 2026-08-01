
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
        };

        // 🧠 Computed permissions
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



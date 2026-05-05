// declare global {
//   namespace Express {
//     interface Request {
//       user?: {
//         id: string;
//         role: "ADMIN" | "USER" | "IT";
//         department: string;
//         permissions: string[];
//       };
//     }
//   }
// }

// export {};




//Refactor dữ liệu lại theo chuẩn RBAC
import { Types } from "mongoose";

declare global {
  namespace Express {
    interface Request {
      user?: {
        _id: Types.ObjectId;

        // 🔐 Role (đã populate)
        role: {
          _id: Types.ObjectId;
          name: string;
        };

        // 🧠 Permission đã tính toán
        permissions: string[];

        // 🏢 Department
        department?: Types.ObjectId;

        // ⚡ Optional (nên có)
        isActive?: boolean;
      };
    }
  }
}

export {};
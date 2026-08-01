import type { Types } from "mongoose";
import type { DocumentCategory, DocumentSubType } from "../../models/documents/document.model";

/* ===== INTERFACE ===== */

export interface IDocument {
  category: DocumentCategory;
  subType: DocumentSubType;
  title: string;
  documentCode?: string;
  isActive?: boolean;
  department: Types.ObjectId;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  deletedBy?: Types.ObjectId;
  workflowInstanceId?: Types.ObjectId;

  // status: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";

  /** 🔗 Biên bản trỏ về giấy đề xuất */
  referenceTo?: Types.ObjectId[];

  /** Dữ liệu động theo từng loại giấy */
  meta: Record<string, any>;

  /**
   * 🔗 GIAI ĐOẠN 3 (module Asset) — liên kết Document với 1 Asset cụ thể.
   * CHỈ dùng cho `subType === PROPOSE_REPAIR` (bắt buộc, validate ở
   * `document.service.ts`). Khi workflow của document này duyệt xong TOÀN
   * BỘ (`workflowStatus: "approved"`), asset tương ứng tự động chuyển sang
   * `UNDER_MAINTENANCE` — xem `workflow.service.ts` (`approveStep`) và
   * `services/assets/assetMaintenance.service.ts`.
   *
   * Với `subType === CONFIRM_STATUS` (biên bản xác nhận tình trạng sau sửa
   * chữa), KHÔNG set field này trực tiếp — asset được suy ra gián tiếp qua
   * `referenceTo` trỏ về document `PROPOSE_REPAIR` gốc.
   */
  relatedAsset?: Types.ObjectId;

  serviceDate?: Date;
  actualCost?: number;
  workflowStatus: "pending" | "approved" | "rejected" | "cancelled" | "completed";


  signedBy?: {
    role: string;
    user?: Types.ObjectId;
    signedAt?: Date;
  }[];

  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;
}
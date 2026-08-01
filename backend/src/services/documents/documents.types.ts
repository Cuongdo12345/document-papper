import { DocumentCategory, DocumentSubType } from "../../models/documents/document.model";

export interface CreateDocumentPayload {
  userId: any;
  category: DocumentCategory;
  subType: DocumentSubType;
  title: string;
  department: any;
  referenceTo?: any;
  meta?: any;
  /** 🔗 Giai đoạn 3 (module Asset) — xem `document.model.ts` (`relatedAsset`) */
  relatedAsset?: any;
}

export interface UpdateDocumentPayload {
  id: any;
  userId: any;
  /**
   * Department của người gọi — dùng để kiểm tra ownership theo phòng ban,
   * đồng bộ với ràng buộc "khác khoa" đã có ở Create (Missing Validation #4).
   * Controller cần truyền `req.user.department` vào đây.
   */
  callerDepartment?: any;
  /** Bỏ qua ràng buộc department/khoá-theo-workflow nếu là admin. */
  isAdmin?: boolean;
  updateData: any;
}

export interface DeleteDocumentPayload {
  id: any;
  userId: any;
  role: string;
}


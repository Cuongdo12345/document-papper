// constants/document.rules.ts
import {
  DocumentCategory,
  DocumentSubType,
} from "../../models/documents/document.model";

export const DOCUMENT_RULES: Record<
  DocumentSubType,
  {
    category: DocumentCategory;
    requireReference?: boolean;
    referenceSubType?: DocumentSubType;
  }
> = {
  // ===== BIÊN BẢN =====
  CHECK_DAMAGE: {
    category: DocumentCategory.REPORT,
    requireReference: true,
    referenceSubType: DocumentSubType.PROPOSE_REPAIR,
  },

  // DEV-005/IMP-005 (C-02=RV05-01=ARCH-12, xác nhận nghiệp vụ với chủ dự án
  // 2026-09-01): rule này KHÔNG đổi (giá trị gốc, ĐÚNG) — PROPOSE_INK ↔
  // CONFIRM_STATUS, không liên quan Asset.status. Bug gốc (Asset kẹt vĩnh
  // viễn UNDER_MAINTENANCE) thực ra nằm ở `workflow.service.ts:
  // syncAssetOnDocumentApproved` (đã sửa: đổi nhánh xử lý từ CONFIRM_STATUS
  // sang CHECK_DAMAGE — REPORT đúng rule tham chiếu PROPOSE_REPAIR). Xem
  // `docs/development/tasks/DEV-005.md`.
  CONFIRM_STATUS: {
    category: DocumentCategory.REPORT,
    requireReference: true,
    referenceSubType: DocumentSubType.PROPOSE_INK,
  },

  // ===== ĐỀ XUẤT =====
  PROPOSE_REPAIR: {
    category: DocumentCategory.PROPOSAL,
    // requireReference: true,
    // referenceSubType: DocumentSubType.CHECK_DAMAGE,
  },

  PROPOSE_INK: {
    category: DocumentCategory.PROPOSAL,
    requireReference: false,
  },

  PROPOSE_PROCUREMENT: {
    category: DocumentCategory.PROPOSAL,
    requireReference: false,
  },

  // ===== TÀI LIỆU THAM KHẢO =====
  MANUAL: {
    category: DocumentCategory.REFERENCE,
    requireReference: false,
  },
};

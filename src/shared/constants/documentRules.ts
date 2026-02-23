// constants/document.rules.ts
import { DocumentCategory, DocumentSubType } from "../../models/document.model";

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

  CONFIRM_STATUS: {
    category: DocumentCategory.REPORT,
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
};

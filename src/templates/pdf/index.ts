// templates/pdf/index.ts
import { DocumentSubType } from "../../models/document.model";
import { buildCheckDamagePDF } from "../../shared/constants/report/report.check-damage";
import { buildConfirmStatusPDF } from "../../shared/constants/report/report.confirm-status";
import { buildProposeRepairPDF } from "../../shared/constants/report/proposal.repair";

export const buildPdfDefinition = (document: any) => {
  switch (document.subType) {
    case DocumentSubType.CHECK_DAMAGE:
      return buildCheckDamagePDF(document);

    case DocumentSubType.CONFIRM_STATUS:
      return buildConfirmStatusPDF(document);

    case DocumentSubType.PROPOSE_REPAIR:
      return buildProposeRepairPDF(document);

    default:
      throw new Error("Chưa hỗ trợ mẫu PDF này");
  }
};

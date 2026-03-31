import { Document } from "../../models/document.model";
import { buildInspectionText } from "../helpers/parse-doc"
/**
 * Build load map song song CONFIRM_STATUS, CHECK_DAMAGE
 * @param subType 
 * @returns 
 */
export const buildMapFromReports = async (subType: string) => {
  const docs = await Document.find({ subType, isActive: true })
    .select("referenceTo meta.items")
    .lean();

  const map = new Map<string, any>();

  for (const doc of docs) {
    if (!doc.referenceTo?.length) continue;

    const key = doc.referenceTo[0].toString();
    const data = buildInspectionText(doc.meta?.items || []);

    map.set(key, data);
  }

  return map;
};
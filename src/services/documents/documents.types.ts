import { DocumentCategory, DocumentSubType } from "../../models/document.model";

export interface CreateDocumentPayload {
  userId: any;
  category: DocumentCategory;
  subType: DocumentSubType;
  title: string;
  department: any;
  referenceTo?: any;
  meta?: any;
}

export interface UpdateDocumentPayload {
  id: any;
  userId: any;
  updateData: any;
}

export interface DeleteDocumentPayload {
  id: any;
  userId: any;
  role: string;
}
/**
 * Khớp `document.model.ts`/`document.interface.ts` thật (xác nhận qua source,
 * FE-04, 2026-09-05). `GET /documents` (list) VÀ `GET /documents/:id` (detail)
 * CÙNG populate `department`/`createdBy`/`referenceTo` (khác Users/Departments
 * — xem `documents.query.ts:findDocuments/getDocumentDetailService`).
 * `relatedAsset` KHÔNG được populate ở cả 2 endpoint — chỉ là ObjectId string.
 */

export const DOCUMENT_CATEGORIES = ["PROPOSAL", "REPORT", "REFERENCE"] as const;
export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

export const DOCUMENT_SUB_TYPES = [
  "PROPOSE_REPAIR",
  "PROPOSE_INK",
  "PROPOSE_PROCUREMENT",
  "CHECK_DAMAGE",
  "CONFIRM_STATUS",
  "MANUAL",
] as const;
export type DocumentSubType = (typeof DOCUMENT_SUB_TYPES)[number];

/** `subType` hợp lệ theo từng `category` — DOCUMENT_DOMAIN_MAP.md Mục 1 (CONFIRMED). */
export const SUB_TYPES_BY_CATEGORY: Record<DocumentCategory, DocumentSubType[]> = {
  PROPOSAL: ["PROPOSE_REPAIR", "PROPOSE_INK", "PROPOSE_PROCUREMENT"],
  REPORT: ["CHECK_DAMAGE", "CONFIRM_STATUS"],
  REFERENCE: ["MANUAL"],
};

/** `POST /documents/proposal` — endpoint hiện tại CHỈ tạo được PROPOSAL (DOCUMENT_DOMAIN_MAP.md Mục 3). */
export const CREATABLE_SUB_TYPES: DocumentSubType[] = SUB_TYPES_BY_CATEGORY.PROPOSAL;

export type WorkflowStatus = "pending" | "approved" | "rejected" | "cancelled" | "completed";
export const WORKFLOW_STATUSES: WorkflowStatus[] = ["pending", "approved", "rejected", "cancelled", "completed"];

export interface DocumentReferenceRef {
  _id: string;
  subType: string;
  title: string;
  documentCode: string;
}

/** Meta shape THEO SUBTYPE — CONFIRMED bằng dữ liệu thật (GET /documents?subType=...), KHÔNG suy đoán. */
export interface RepairMeta {
  issue?: string;
  repairResult?: "REPAIRED" | "UNREPAIRABLE";
  [key: string]: unknown;
}
export interface ProcurementItem {
  deviceName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  note?: string;
}
export interface ProcurementMeta {
  items: ProcurementItem[];
  totalAmount: number;
  [key: string]: unknown;
}
export interface InspectionItem {
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice?: number;
  [key: string]: unknown;
}
export interface InspectionMeta {
  inspectionResult?: string;
  items?: InspectionItem[];
  [key: string]: unknown;
}
/** `meta` DTO là `z.record()` tự do — không có schema cứng, giữ index signature cho subType chưa có mẫu thật (MANUAL). */
export type DocumentMeta = RepairMeta | ProcurementMeta | InspectionMeta | Record<string, unknown>;

export interface Document {
  _id: string;
  documentCode: string;
  category: DocumentCategory;
  subType: DocumentSubType;
  title: string;
  isActive: boolean;
  department: { _id: string; code: string; name: string } | null;
  createdBy: { _id: string; username: string; fullName: string } | null;
  workflowStatus: WorkflowStatus;
  workflowInstanceId?: string;
  relatedAsset?: string;
  referenceTo: DocumentReferenceRef[];
  meta: DocumentMeta;
  serviceDate?: string;
  actualCost?: number;
  signedBy: { role: string; user?: string; signedAt?: string }[];
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

/** Khớp `QueryDocumentDTO`. */
export interface GetDocumentsParams {
  page?: number;
  limit?: number;
  sortBy?: "createdAt" | "updatedAt" | "title" | "documentCode" | "serviceDate" | "actualCost";
  order?: "asc" | "desc";
  keyword?: string;
  /** [MỚI 2026-09-18, DEV-063] Tìm toàn văn (title+documentCode+nội dung/ghi chú trong `meta`) — tách riêng khỏi `keyword`, khi truyền field này backend BỎ QUA `sortBy`/`order` (sort theo mức độ liên quan). */
  fullTextSearch?: string;
  isActive?: boolean;
  category?: DocumentCategory;
  subType?: DocumentSubType;
  department?: string;
  createdBy?: string;
  relatedAsset?: string;
  workflowStatus?: WorkflowStatus;
  fromDate?: string;
  toDate?: string;
}

/**
 * Roadmap A4 (Document versioning) — 1 bản ghi lịch sử nội dung ĐÃ BỊ thay
 * thế (KHÔNG bao gồm nội dung hiện tại — dùng `Document.title`/`meta` cho
 * cái đó). `editedBy` = người đã TẠO RA nội dung này, KHÔNG PHẢI người đã
 * thay thế nó (xem comment gốc backend `updateDocumentService`).
 */
export interface DocumentVersion {
  _id: string;
  document: string;
  versionNumber: number;
  title: string;
  meta: DocumentMeta;
  editedBy: { _id: string; username: string; fullName: string } | null;
  editedAt: string;
  createdAt: string;
}

/** Khớp `CreateDocumentDTO` — route `/documents/proposal` (category luôn "PROPOSAL", xem CREATABLE_SUB_TYPES). */
export interface CreateDocumentRequest {
  category: "PROPOSAL";
  subType: DocumentSubType;
  title: string;
  department: string;
  meta?: Record<string, unknown>;
  relatedAsset?: string;
}

/** Khớp `UpdateDocumentDTO` — `DOCUMENT_UPDATE_WHITELIST = ["title","meta"]`, KHÔNG field nào khác. */
export interface UpdateDocumentRequest {
  title?: string;
  meta?: Record<string, unknown>;
}

/* =========================================================================
   EXCEL (FE-15, roadmap Mục 20) — xác nhận trực tiếp `excel.service.ts`/
   `excel.controller.ts`. `GET /export/*` KHÔNG có `validateQuery` (0 Zod DTO,
   cùng gap đã ghi nhận ở Dashboard) — FE tự validate month/year đi CÙNG NHAU
   trước khi gọi.
========================================================================= */

/** `subType` export chỉ chấp nhận 3 giá trị PROPOSAL (`VALID_PROPOSAL_SUBTYPES`), KHÔNG phải toàn bộ `DocumentSubType`. */
export type DocumentExportSubType = "PROPOSE_REPAIR" | "PROPOSE_INK" | "PROPOSE_PROCUREMENT";

/** Khớp query thật của `exportDocumentsExcelPRO` — `department` bị controller GHI ĐÈ theo `req.user.department` nếu không phải ADMIN, FE vẫn gửi lên bình thường (server tự xử lý). */
export interface ExportDocumentsExcelParams {
  month?: number;
  year?: number;
  department?: string;
  status?: WorkflowStatus;
  /** Nhiều subType nối bằng dấu phẩy — khớp `String(subType).split(",")` ở service. */
  subType?: DocumentExportSubType[];
}

/** Preview row của `importDocumentsExcel` khi `dryRun:true` — `action` luôn 1 trong 2 (Document là DOMAIN DUY NHẤT hỗ trợ update qua import, khác Asset). */
export interface DocumentImportPreviewRow {
  row: number;
  action: "create" | "update";
  department: string;
  title: string;
  deviceName: string;
  willCreateReport: boolean;
}

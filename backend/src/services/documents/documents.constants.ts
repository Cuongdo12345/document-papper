export const DOCUMENT_UPDATE_WHITELIST = [
  "title",
  "meta"
] as const;

/**
 * Danh sách field được phép filter trực tiếp (exact-match) ở API List
 * (`getAllDocumentsService`) và Delete theo tháng (`deleteDocumentsByMonthService`).
 * Dùng chung qua `buildDocumentFilter` (documents.mapper.ts) để tránh:
 *  - Duplicate Logic #2 (2 nơi tự viết lại filter tương tự nhau)
 *  - Missing Validation #1 (`Object.assign(filter, filters)` đưa thẳng query
 *    param lạ vào MongoDB filter — rủi ro NoSQL injection)
 */
export const FILTERABLE_DOCUMENT_FIELDS = [
  "category",
  "subType",
  "department",
  "workflowStatus",
  "createdBy",
  "relatedAsset",  // ← nếu không có dòng này, filter sẽ bị bỏ qua dù truyền query
] as const;
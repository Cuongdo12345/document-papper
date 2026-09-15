/**
 * Khớp `ImportHistory` model (`backend/src/models/importAudit/importhistory.model.ts`)
 * — dùng CHUNG bởi `importDocumentsExcel` VÀ `importAssetsExcel` (2 service
 * ghi cùng 1 collection, KHÔNG có field phân biệt domain nào — `fileName` là
 * gợi ý duy nhất, không đáng tin cậy tuyệt đối). Endpoint đọc lại
 * (`GET /export/import-history`) chỉ gate bằng permission
 * `DOCUMENT_EXCEL_HISTORY`.
 *
 * RBAC gap ĐÃ FIX (2026-09-10, theo yêu cầu user): role `PHONG_VAT_TU_TTB`
 * (import Asset qua Excel được, có `ASSET_EXCEL_IMPORT`) trước đây KHÔNG có
 * `DOCUMENT_EXCEL_HISTORY` nên không xem được lịch sử import của chính mình.
 * Đã gán thêm permission này cho role trong `rolePermission.map.ts` + chạy
 * lại `scripts/seed-rbac.ts` (KHÔNG đổi tên permission — đi đúng tiền lệ dự
 * án "đổi tên đã-deploy rủi ro hơn thêm quyền mới"; mô tả seed sẵn có "Xem
 * lịch sử nhập Excel" vốn đã trung lập, không riêng Document). Xem
 * `docs/frontend/tasks/FE-15.md` Mục 1 và `docs/frontend/FRONTEND_MEMORY.md`
 * Known Issues #26.
 */
export interface ImportHistoryItem {
  _id: string;
  importedBy: { _id: string; username: string; fullName: string } | null;
  fileName: string;
  mode: "dryRun" | "commit";
  status: "success" | "partial" | "failed";
  totalRows: number;
  created: number;
  updated: number;
  reportsCreated: number;
  errorCount: number;
  errors: { row: number; message: string }[];
  createdAt: string;
}

export interface GetImportHistoryParams {
  page?: number;
  limit?: number;
  sortBy?: "createdAt" | "status" | "totalRows";
  order?: "asc" | "desc";
}

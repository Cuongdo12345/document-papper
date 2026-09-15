// backend/src/services/documents/documents.scope.ts
//
// MỚI (DEV-041, 2026-09-11 — user xác nhận triển khai sau khi xem review
// RBAC toàn diện): gộp "department-scope" (ai được xem/sửa Document của
// khoa nào) về ĐÚNG 1 chỗ. Trước đây mỗi endpoint tự cài đặt riêng 1 kiểu
// (`getAllDocumentsService`/`getReportsByProposalService`/
// `updateDocumentService`) — không dùng chung khái niệm nào — là nguyên
// nhân trực tiếp gây chuỗi 5 lần vá liên tiếp cùng 1 chủ đề (DEV-030 → 034
// → 038 → 039 → 040): sửa đúng 1 chỗ, 3 chỗ còn lại không tự đồng bộ theo.
// Xem full evidence ở `docs/development/tasks/DEV-041.md` Mục 1.3, 3.2C.
//
// ⚠️ REFACTOR CÓ KIỂM SOÁT — KHÔNG đổi hành vi hiện tại ở bất kỳ call site
// nào, chỉ RÚT các đoạn logic giống hệt nhau ra 1 nơi để tránh lặp/lệch.
//
// PHẠM VI — chỉ gộp 3 nơi dùng CÙNG 1 khái niệm ("xem" list/reports +
// ownership "cùng khoa" của update). KHÔNG gộp:
//   - `GET /documents/:id` (chi tiết) — cơ chế KHÁC HẲN về tầng thực thi:
//     chạy ở `authorizePermission.middleware.ts` (bước 6, ABAC), đánh giá
//     bằng DSL riêng (`Policycondition.evaluator.ts`) trên dữ liệu lưu
//     trong DB (`Policy` collection), KHÔNG PHẢI hàm TypeScript gọi được từ
//     đây. Vẫn giữ nguyên 3 Policy (`document-view-detail-same-department`/
//     `-pending-approver`/`-workflow-participant-role`, seed ở
//     `scripts/seed-rbac.ts`) + route `:id` nhận thêm permission
//     `DOCUMENT_VIEW_ALL_DEPARTMENTS` làm lựa chọn thay thế
//     `DOCUMENT_VIEW_DETAIL` (`document.route.ts`). Đây là "nơi thứ 4" của
//     bức tranh tổng — CÙNG khái niệm nghiệp vụ, khác lớp thực thi, không
//     thể (và không nên) ép về chung 1 hàm TS.
//   - `deleteDocumentService` — KHÔNG có department-scope, chỉ ADMIN được
//     xoá (`role === "ADMIN" || isSystemRole`), không có trục "cùng khoa".
//   - `restoreDocumentService` — dùng OWNERSHIP (`createdBy === userId` qua
//     `validateRestorePermission`), trục hoàn toàn khác department-scope.

export interface DepartmentScopeActor {
  isAdmin: boolean;
  /**
   * Permission `DOCUMENT_VIEW_ALL_DEPARTMENTS` (DEV-040) — CỜ RIÊNG chỉ áp
   * dụng cho hành động XEM (list/detail/reports). KHÔNG được đọc bởi
   * update/delete/restore — cố tình, tránh leo thang quyền ngoài phạm vi đã
   * xác nhận với user lúc tạo permission này.
   */
  canViewAllDepartments?: boolean;
}

/**
 * So khớp 2 giá trị (ObjectId hoặc string) là "cùng phòng ban". An toàn khi
 * 1 trong 2 rỗng/undefined (luôn trả `false`, không throw).
 */
export const isSameDepartment = (a: any, b: any): boolean =>
  !!a && !!b && a.toString() === b.toString();

/**
 * Có được xem Document/Report của TẤT CẢ phòng ban không (bỏ qua rule
 * "chỉ xem cùng khoa", DEV-009A/DEV-030). Dùng cho MỌI endpoint thuộc hành
 * động XEM (list, reports theo proposal) — KHÔNG dùng cho update/delete/
 * restore.
 */
export const canViewAcrossDepartments = (actor: DepartmentScopeActor): boolean =>
  actor.isAdmin || !!actor.canViewAllDepartments;

/**
 * Áp `filter.department` cho query danh sách Document — ép về đúng khoa
 * người gọi nếu KHÔNG được xem tất cả phòng ban. Fail-closed: thiếu
 * `callerDepartment` → `null` (KHÔNG khớp document nào), thay vì
 * `undefined` (Mongo bỏ qua field `undefined`, tương đương không lọc gì —
 * lộ toàn bộ dữ liệu, xem giải thích gốc ở lịch sử `getAllDocumentsService`,
 * DEV-030). Dùng ở `getAllDocumentsService`.
 */
export const applyDepartmentFilter = (
  filter: Record<string, any>,
  actor: DepartmentScopeActor & { callerDepartment?: any },
): void => {
  if (!canViewAcrossDepartments(actor)) {
    filter.department = actor.callerDepartment ?? null;
  }
};

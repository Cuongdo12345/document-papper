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

/**
 * DEV-030 — department-scoping cho `GET /documents` (danh sách).
 * Đồng bộ pattern với `UpdateDocumentPayload` (`callerDepartment`/`isAdmin`
 * truyền từ `req.user`, controller chịu trách nhiệm suy ra `isAdmin`).
 */
export interface GetAllDocumentsPayload {
  query: any;
  callerDepartment?: any;
  isAdmin?: boolean;
  // MỚI (DEV-040, 2026-09-10 — user báo lỗi: "muốn IT được xem tài liệu tất
  // cả các khoa"). Người gọi có permission `DOCUMENT_VIEW_ALL_DEPARTMENTS`
  // (controller tự tra qua `getCachedPermissions`, KHÔNG đọc `req.user.
  // permissions` — field đó luôn rỗng, xem `auth.middleware.ts`) — bỏ qua ép
  // `filter.department` giống `isAdmin`, xem `getAllDocumentsService`.
  canViewAllDepartments?: boolean;
}

/**
 * DEV-030 (bổ sung) — department-scoping cho `GET /:proposalId/reports`.
 * Cùng lý do với `GetAllDocumentsPayload`: đây là 1 đường đọc Document khác
 * (qua proposal → reports tham chiếu), phải chặn tương đương `GET /:id`
 * (DEV-009A) và `GET /documents` (DEV-030), nếu không sẽ là đường vòng lộ
 * thông tin proposal/report của phòng ban khác.
 */
export interface GetReportsByProposalPayload {
  proposalId: any;
  callerDepartment?: any;
  isAdmin?: boolean;
  // MỚI (2026-09-10, DEV-038 — bug user báo qua tab "Lịch sử duyệt"): role
  // của người gọi, dùng để nới lỏng check department nếu role này từng
  // tham gia BẤT KỲ bước duyệt nào của workflow gắn với proposal này — xem
  // giải thích đầy đủ ở `getReportsByProposalService`.
  callerRole?: string;
  // MỚI (DEV-040, 2026-09-10) — đồng bộ với `GetAllDocumentsPayload`, cùng
  // permission `DOCUMENT_VIEW_ALL_DEPARTMENTS`.
  canViewAllDepartments?: boolean;
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
  // 🔒 DEV-001A — security identity bất biến, ưu tiên hơn `role` (display
  // name literal, giữ lại làm lưới đỡ Phase A). Optional để không breaking
  // caller nào khác chưa cập nhật (mặc định coi như false nếu thiếu).
  isSystemRole?: boolean;
}

/** DEV-006 — xoá (soft-delete) hàng loạt Document theo tháng/năm. */
export interface DeleteDocumentsByMonthPayload {
  month: number;
  year: number;
  filters?: Record<string, any>;
  /** Dùng để gán `deletedBy`, đồng bộ pattern với `deleteDocumentService()`. */
  userId: any;
  // 🔒 MỚI (DEV-044, 2026-09-12 — Remaining Issue ghi nhận từ DEV-006, xác
  // nhận lại ở `docs/30_DEVELOPMENT_COMPLETION_AUDIT.md` Mục 3): trước đây
  // hàm này KHÔNG nhận `role`/`isSystemRole` — chỉ cần permission
  // `DOCUMENT_DELETE` (route-level) là xoá hàng loạt được, trong khi xoá ĐƠN
  // LẺ (`DeleteDocumentPayload` ngay trên) đã yêu cầu ADMIN thật từ trước.
  // Bulk-delete có blast radius LỚN HƠN xoá đơn lẻ nhiều lần (có thể xoá cả
  // tháng dữ liệu của MỌI phòng ban) nên càng cần guard chặt hơn, không phải
  // lỏng hơn — thêm 2 field này để `deleteDocumentsByMonthService` áp ĐÚNG
  // guard ADMIN-only đã có ở `deleteDocumentService`.
  role: string;
  isSystemRole?: boolean;
}


import { Request, Response } from "express";
import {
  createDocumentService,
  getDocumentDetailService,
  getAllDocumentsService,
  updateDocumentService,
  deleteDocumentService,
  getReportsByProposalService,
  restoreDocumentService,
  deleteDocumentsByMonthService,
  getDocumentVersionsService,
} from "../../services/documents/document.service";

import { catchAsync } from "../../shared/utils/catchAsync";
import ApiError from "../../shared/errors/ApiError";
// DEV-040 (2026-09-10): tra permission trực tiếp qua cache — KHÔNG dùng
// `req.user.permissions` (field đó LUÔN rỗng, `auth.middleware.ts` chỉ khởi
// tạo `[]`, không nơi nào gán lại — xem `shared/types/express.d.ts`).
import { getCachedPermissions } from "../../services/rbac/permission.cache";
import { PERMISSIONS } from "../../shared/constants/permission.constant";

/* ===============================
   CREATE
=============================== */
export const createDocuments = catchAsync(async (req: Request, res: Response) => {

  const doc = await createDocumentService({
    userId: req.user!._id,
    ...req.body,
  });

  res.status(201).json({
    success: true,
    message: "Tạo document thành công",
    data: doc,
  });
});

/* ===============================
   GET DETAIL
=============================== */
export const getDocumentById = catchAsync(async (req: Request, res: Response) => {

  const doc = await getDocumentDetailService(req.params.id);

  res.json({
    success: true,
    message: "Lấy chi tiết document thành công",
    data: doc,
  });
});

/* ===============================
   GET VERSION HISTORY (Roadmap A4)
=============================== */
export const getDocumentVersions = catchAsync(async (req: Request, res: Response) => {
  const versions = await getDocumentVersionsService(req.params.id);

  res.json({
    success: true,
    message: "Lấy lịch sử phiên bản thành công",
    data: versions,
  });
});

/* ===============================
   GET ALL
=============================== */
export const getAllDocuments = catchAsync(async (req: Request, res: Response) => {

  // DEV-030: department-scoping cho danh sách — đồng bộ cách suy ra `isAdmin`
  // đã dùng ở `updateDocuments` bên dưới (DEV-001A: ưu tiên `isSystemRole`).
  //
  // DEV-040 (2026-09-10): thêm `canViewAllDepartments` — permission
  // `DOCUMENT_VIEW_ALL_DEPARTMENTS` (IT đã được gán) cho phép bypass
  // department-scoping giống `isAdmin`, xem `getAllDocumentsService`.
  const userPermissions = await getCachedPermissions(req.user!._id.toString());

  const result = await getAllDocumentsService({
    query: req.query,
    callerDepartment: req.user!.department,
    // 🔒 DEV-001A Phase B hoàn tất (DEV-047, 2026-09-12).
    isAdmin: req.user!.role.isSystemRole === true,
    canViewAllDepartments: userPermissions.includes(PERMISSIONS.DOCUMENT_VIEW_ALL_DEPARTMENTS),
  });

  res.json({
    success: true,
    ...result,
  });
});

/* ===============================
   UPDATE
=============================== */
export const updateDocuments = catchAsync(async (req: Request, res: Response) => {

  // Bổ sung `callerDepartment`/`isAdmin` (BREAKING CHANGE ở
  // `document.service.ts` — xem MODULE_P1_SECURITY_PLAN.md #2):
  // `updateDocumentService` giờ kiểm tra ownership theo department + khoá
  // sửa khi document đã `workflowStatus: "approved"`, đồng bộ với ràng buộc
  // "khác khoa" đã có ở Create. Trước đây bất kỳ ai có permission
  // `DOCUMENT_UPDATE` sửa được mọi document của mọi phòng ban.
  const document = await updateDocumentService({
    id: req.params.id,
    userId: req.user!._id,
    callerDepartment: req.user!.department,
    // 🔒 DEV-001A Phase B hoàn tất (DEV-047, 2026-09-12).
    isAdmin: req.user!.role.isSystemRole === true,
    updateData: req.body,
  });

  res.json({
    success: true,
    message: "Cập nhật document thành công",
    data: document,
  });
});

/* ===============================
   DELETE (SOFT)
=============================== */
export const deleteDocuments = catchAsync(async (req: Request, res: Response) => {

  const user = req.user!;

  // Sửa Bug B12 (nghiêm trọng — production-breaking, không chỉ rủi ro bảo
  // mật): trước đây truyền `role: user.role` — nguyên object đã populate
  // `{ _id, name }` (theo `auth.middleware.ts`) — vào service, trong khi
  // `deleteDocumentService` so sánh `role !== "ADMIN"` bằng string. So sánh
  // `object !== string` bằng `!==` trong JS LUÔN `true` → điều kiện throw
  // forbidden luôn đúng → tính năng xoá document hỏng hoàn toàn cho MỌI
  // user, kể cả Admin thật. Đối chiếu: `restoreDocuments` ở dưới đã làm đúng
  // (`req.user?.role.name === "ADMIN"`) — nay đồng bộ cùng cách dùng.
  const doc = await deleteDocumentService({
    id: req.params.id,
    userId: user._id,
    role: user.role.name,
    // 🔒 DEV-001A: ưu tiên cờ security identity, giữ `role` (literal) làm lưới đỡ (Phase A).
    isSystemRole: user.role.isSystemRole === true,
  });

  res.json({
    success: true,
    message: "Xóa document thành công",
    data: doc._id,
  });
});

/* ===============================
   DELETE BY MONTH
=============================== */
export const deleteDocumentsByMonth = catchAsync(async (req: Request, res: Response) => {

  const { month, year, category, subType, department } = req.body;

  if (!month || !year) {
    // Sửa Technical Debt (chuẩn hoá error handling): trước đây `return
    // res.status(400).json(...)` trực tiếp thay vì throw `ApiError`, không
    // nhất quán với toàn bộ handler còn lại trong file (đều để lỗi bubble
    // qua `catchAsync` → global error handler). Không gây bug chức năng
    // (vẫn trả đúng 400) nhưng response envelope trước đây thiếu
    // `errorCode` mà global error handler thường gắn kèm cho các lỗi khác.
    throw ApiError.badRequest("month và year là bắt buộc");
  }

  const result = await deleteDocumentsByMonthService({
    month,
    year,
    filters: { category, subType, department },
    // DEV-006 — cần userId để gán `deletedBy` (soft-delete), đồng bộ pattern
    // với `deleteDocuments` (xoá đơn lẻ) ở trên.
    userId: req.user!._id,
    // MỚI (DEV-044, 2026-09-12) — đồng bộ đúng cách `deleteDocuments` (xoá
    // đơn lẻ) ở trên đã truyền, để service áp guard ADMIN-only.
    role: req.user!.role.name,
    isSystemRole: req.user!.role.isSystemRole === true,
  });

  res.json({
    success: true,
    message: "Xóa dữ liệu thành công",
    data: result,
  });
});

/* ===============================
   GET REPORTS BY PROPOSAL
=============================== */
export const getReportsByProposals = catchAsync(async (req: Request, res: Response) => {

  // DEV-030 (bổ sung): department-scoping, đồng bộ `getAllDocuments` ở trên.
  // `callerRole` MỚI (2026-09-10, DEV-038) — cho phép ngoại lệ "từng tham
  // gia workflow" bất kể phòng ban, xem `getReportsByProposalService`.
  // `canViewAllDepartments` MỚI (2026-09-10, DEV-040) — đồng bộ `getAllDocuments`.
  const userPermissions = await getCachedPermissions(req.user!._id.toString());

  const data = await getReportsByProposalService({
    proposalId: req.params.proposalId,
    callerDepartment: req.user!.department,
    // 🔒 DEV-001A Phase B hoàn tất (DEV-047, 2026-09-12).
    isAdmin: req.user!.role.isSystemRole === true,
    callerRole: req.user!.role.name,
    canViewAllDepartments: userPermissions.includes(PERMISSIONS.DOCUMENT_VIEW_ALL_DEPARTMENTS),
  });

  res.json({
    success: true,
    message: "Lấy reports thành công",
    data,
  });
});

/* ===============================
   RESTORE
=============================== */
export const restoreDocuments = catchAsync(async (req: Request, res: Response) => {

  const result = await restoreDocumentService({
    documentId: req.params.id,
    userId: req.user!._id,
    // 🔒 DEV-001A Phase B hoàn tất (DEV-047, 2026-09-12).
    isAdmin: req.user?.role.isSystemRole === true,
  });

  res.json({
    success: true,
    ...result,
  });
});


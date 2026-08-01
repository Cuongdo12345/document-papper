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
} from "../../services/documents/document.service";

import { catchAsync } from "../../shared/utils/catchAsync";
import ApiError from "../../shared/errors/ApiError";

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
   GET ALL
=============================== */
export const getAllDocuments = catchAsync(async (req: Request, res: Response) => {

  const result = await getAllDocumentsService(req.query);

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
    isAdmin: req.user!.role.name === "ADMIN",
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

  const result = await deleteDocumentsByMonthService(
    month,
    year,
    { category, subType, department }
  );

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

  const data = await getReportsByProposalService(req.params.proposalId);

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
    isAdmin: req.user?.role.name === "ADMIN",
  });

  res.json({
    success: true,
    ...result,
  });
});


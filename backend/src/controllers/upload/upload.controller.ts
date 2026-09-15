import fs from "fs";
import { saveFilesToDB, getFilesService, type ListFilesParams } from "../../services/upload/upload.service";
import { Upload } from "../../models/uploadFiles/upload.model";
import { Request, Response } from "express";
import { buildPaginationMeta } from "../../shared/utils/Queryparsing.util";
import { resolveUploadedFilePath } from "../../shared/utils/uploadStorage.util";

// DEV-007/IMP-008..010 — mọi guard/scope dưới đây dùng chung 1 điều kiện
// ADMIN-bypass, đồng bộ pattern đã dùng xuyên suốt codebase. 🔒 DEV-001A
// Phase B hoàn tất (DEV-047, 2026-09-12): chỉ còn đọc cờ security identity
// `isSystemRole`, đã gỡ lưới đỡ literal "ADMIN".
const isAdminCaller = (req: Request): boolean =>
  req.user?.role.isSystemRole === true;

// upload
export const uploadFiles = async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];

    const result = await saveFilesToDB(files, req.user!._id);

    // DEV-025/ARCH-23: thêm `success: true` — đồng bộ theo convention chung
    // `{success, message?, data?}` dùng ở hầu hết controller khác (vd
    // `document.controller.ts`), trước đây domain Upload thiếu field này.
    return res.json({
      success: true,
      message: "Upload success",
      data: result,
    });
  } catch (err: any) {
    // DEV-021/SEC-23: trước đây trả thẳng `err.message` gốc ra client — nhánh
    // catch riêng lẻ này không đi qua `errorHandler` tập trung (đồng bộ hoá
    // toàn bộ pattern error-handling của domain Upload là ARCH-09, ngoài
    // phạm vi task này). Log chi tiết ở server, chỉ trả message generic.
    console.error("[uploadFiles] Lỗi khi upload file:", err);
    res.status(500).json({ message: "Đã có lỗi xảy ra khi upload file, vui lòng thử lại sau" });
  }
};

// list files
// DEV-007/IMP-009 (H-09c=SEC-32=RV09-03, quyết định nghiệp vụ đã xác nhận
// với chủ dự án 2026-09-01): trước đây trả TOÀN BỘ file của MỌI user,
// không phân trang. Nay: user thường chỉ thấy file MÌNH upload, ADMIN xem
// được tất cả; có phân trang (page/limit, mặc định 1/10).
//
// ⚠️ MỚI (tìm kiếm/lọc, 2026-09-12, theo yêu cầu user): `req.query` đã qua
// `validateQuery(QueryUploadDTO)` (`upload.routes.ts`) — page/limit/sortBy/
// order đã coerce + có default, `keyword`/`fromDate`/`toDate` đã validate
// hợp lệ trước khi tới đây. Logic dựng filter + gọi DB đã RÚT sang
// `getFilesService()` (`upload.service.ts`) — controller giờ chỉ còn parse
// query + format response, đúng flow chuẩn Controller → Service → Model
// (trước đây domain Upload là NGOẠI LỆ duy nhất tự làm việc này thẳng
// trong controller, xem comment cũ đã xoá + `upload.service.ts` đầu file).
export const getFiles = async (req: Request, res: Response) => {
  const { page, limit, sortBy, order } = req.query as unknown as ListFilesParams;

  const { items, total } = await getFilesService(req.query as unknown as ListFilesParams, {
    isAdmin: isAdminCaller(req),
    userId: req.user!._id,
  });

  // DEV-025/ARCH-23: thêm `success: true` cho đồng bộ convention chung.
  res.json({
    success: true,
    data: items,
    pagination: buildPaginationMeta(page, limit, total),
  });
};

// file detail
// DEV-007/IMP-010 (H-09d=SEC-33=RV09-04): IDOR đầy đủ trước đây — bất kỳ
// user có `VIEW_FILE_DETAIL` cũng xem được file của người khác. Nay chỉ
// chủ sở hữu (`uploadedBy`) hoặc ADMIN mới xem được — cùng pattern 403 đã
// dùng ở `documents.validator.ts:validateRestorePermission` cho ownership
// mismatch (không phải 404 — endpoint này đã yêu cầu permission
// `VIEW_FILE_DETAIL` nên không cần obscure sự tồn tại của resource).
export const getFileDetail = async (req: Request, res: Response) => {
  const file = await Upload.findById(req.params.id);

  if (!file) {
    return res.status(404).json({ message: "Không timg thấy file" });
  }
  if(file.isDeleted === true ) {
    return res.status(404).json({ message: "File đã được xóa rồi" });
  }

  if (!isAdminCaller(req) && file.uploadedBy?.toString() !== req.user?._id?.toString()) {
    return res.status(403).json({ message: "Bạn không có quyền xem file này" });
  }

  // DEV-025/ARCH-23: trước đây trả THẲNG document Mongoose (`res.json(file)`,
  // không wrapper) — lệch convention chung `{success, message?, data?}` dùng
  // ở hầu hết controller khác. Bọc lại, KHÔNG đổi field bên trong `file`.
  res.json({ success: true, data: file });
};

// download file (nội dung file thật, KHÔNG phải metadata)
// [FE-15] MỚI — trước đây `fileUrl` (`/uploads/<filename>`) trả về ở
// `getFiles`/`getFileDetail` là ĐƯỜNG DẪN CHẾT: không có `express.static`
// nào phục vụ thư mục `uploads/`, nên FE không có cách nào thực sự tải được
// nội dung file (xác nhận qua grep toàn backend — 0 route serve tĩnh thư
// mục này). Endpoint riêng ở đây, CHỦ Ý KHÔNG dùng `express.static` cho cả
// thư mục — `express.static` phục vụ file công khai theo path, bỏ qua HOÀN
// TOÀN `authenticate`/ownership check, sẽ làm những file `getFileDetail`
// đang chặn (DEV-007/IMP-010: chỉ chủ sở hữu/ADMIN xem được) trở nên public
// với bất kỳ ai đoán/biết được URL. Route này tái dùng ĐÚNG guard đó trước
// khi `res.download()`.
export const downloadFile = async (req: Request, res: Response) => {
  const file = await Upload.findById(req.params.id);

  if (!file) {
    return res.status(404).json({ message: "Không tìm thấy file" });
  }
  if (file.isDeleted === true) {
    return res.status(404).json({ message: "File đã được xóa rồi" });
  }
  if (!isAdminCaller(req) && file.uploadedBy?.toString() !== req.user?._id?.toString()) {
    return res.status(403).json({ message: "Bạn không có quyền tải file này" });
  }

  // Schema `Upload` khai `fileUrl`/`fileName` là `String` thường (không
  // `required:true`) nên Mongoose suy ra kiểu `string | null | undefined` —
  // guard tường minh thay vì ép kiểu `!`, dữ liệu rác (thiếu field) trả 404
  // rõ ràng thay vì để `path.join`/`res.download` nhận `undefined`.
  if (!file.fileUrl || !file.fileName) {
    return res.status(404).json({ message: "File thiếu dữ liệu, không thể tải" });
  }

  // (A2, 2026-09-15) tách sang `resolveUploadedFilePath()` dùng chung —
  // calibration certificate download giờ cần đúng logic này, xem
  // `shared/utils/uploadStorage.util.ts`.
  const filePath = resolveUploadedFilePath(file.fileUrl);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: "File không còn tồn tại trên server" });
  }

  res.download(filePath, file.fileName);
};

// delete file (soft delete)
// DEV-007/IMP-010 — cùng guard ownership/ADMIN với getFileDetail ở trên.
export const deleteFile = async (req: Request, res: Response) => {
  const file = await Upload.findById(req.params.id);

  if (!file) {
    return res.status(404).json({ message: "File not found" });
  }

  if (!isAdminCaller(req) && file.uploadedBy?.toString() !== req.user?._id?.toString()) {
    return res.status(403).json({ message: "Bạn không có quyền xoá file này" });
  }

  file.isDeleted = true;
  await file.save();

  // DEV-025/ARCH-23: thêm `success: true` cho đồng bộ convention chung.
  res.json({ success: true, message: "File deleted" });
};



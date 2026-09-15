import { Upload } from "../../models/uploadFiles/upload.model";
import { escapeRegex } from "../../shared/utils/regex.util";

// DEV-007/IMP-008 (H-09b=SEC-31=RV09-02): trước đây KHÔNG gán `uploadedBy`
// dù schema `Upload` đã có sẵn field này — file "vô chủ", là tiền đề trực
// tiếp cho IDOR ở IMP-009/010 (không có chủ sở hữu thì không thể check
// ownership). Nay bắt buộc truyền `userId` để gán khi lưu.
export const saveFilesToDB = async (files: Express.Multer.File[], userId: any) => {
  const data = files.map((file: Express.Multer.File) => ({
    fileName: file.originalname,
    fileUrl: `/uploads/${file.filename}`,
    fileSize: file.size,
    mimeType: file.mimetype,
    uploadedBy: userId,
  }));

  const result = await Upload.insertMany(data);

  return result;
};

/**
 * Dùng cho cách không cần model lưu db
 * export interface UploadedFile {
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: Date;
}

 export const mapUploadedFiles = (
  files: Express.Multer.File[]
): UploadedFile[] => {
  return files.map(file => ({
    fileName: file.originalname,
    fileUrl: `/uploads/${file.filename}`,
    fileSize: file.size,
    mimeType: file.mimetype,
    uploadedAt: new Date()
  }));
};
 */

/* =========================================================================
   LIST FILES — tìm kiếm/lọc (MỚI 2026-09-12, theo yêu cầu user)
   Trước đây `getFiles()` (`upload.controller.ts`) tự dựng filter + gọi
   `Upload.find()` trực tiếp trong controller (không có service riêng cho
   thao tác này) — lệch flow chuẩn "Controller → Service → Model" mà các
   domain khác (Document/Asset/Department/RBAC) đều theo (CLAUDE.md Mục 14).
   Rút logic ra đây NHÂN TIỆN lúc thêm search/filter mới, thay vì tiếp tục
   phình to controller. `buildFilesFilter` tách riêng khỏi phần gọi DB để
   test được thuần logic không cần mock Mongoose — cùng tinh thần
   `documents.scope.ts` (`applyDepartmentFilter`).
========================================================================= */

export interface FilesFilterQuery {
  keyword?: string;
  mimeType?: string;
  uploadedBy?: string;
  fromDate?: string;
  toDate?: string;
}

export interface FilesFilterCaller {
  /** `req.user?.role.isSystemRole === true` — xem `isAdminCaller()` (`upload.controller.ts`). */
  isAdmin: boolean;
  userId: any;
}

/**
 * Dựng filter Mongo cho `Upload.find()`.
 *
 * - Non-admin: LUÔN ép `uploadedBy = caller.userId` (DEV-007/IMP-009) —
 *   `uploadedBy` trong `query` (nếu client cố truyền) bị bỏ qua hoàn toàn,
 *   không có nhánh nào để non-admin dò xem file người khác qua field lọc
 *   mới này.
 * - ADMIN: xem tất cả theo mặc định; nếu truyền `uploadedBy` thì lọc thêm
 *   theo đúng người đó (tính năng lọc thật, chỉ có ý nghĩa với ADMIN vì
 *   ADMIN là caller DUY NHẤT thấy file của nhiều người).
 */
export const buildFilesFilter = (
  query: FilesFilterQuery,
  caller: FilesFilterCaller,
): Record<string, any> => {
  const { keyword, mimeType, uploadedBy, fromDate, toDate } = query;
  const filter: Record<string, any> = { isDeleted: false };

  if (!caller.isAdmin) {
    filter.uploadedBy = caller.userId;
  } else if (uploadedBy) {
    filter.uploadedBy = uploadedBy;
  }

  if (keyword) {
    filter.fileName = { $regex: escapeRegex(keyword), $options: "i" };
  }

  if (mimeType) {
    filter.mimeType = mimeType;
  }

  // `fromDate`/`toDate` đã được `QueryUploadDTO` validate là parse được
  // trước khi tới đây (cùng pattern `getAllDocumentsService`).
  if (fromDate || toDate) {
    filter.createdAt = {};
    if (fromDate) filter.createdAt.$gte = new Date(fromDate);
    if (toDate) filter.createdAt.$lte = new Date(toDate);
  }

  return filter;
};

export interface ListFilesParams extends FilesFilterQuery {
  page: number;
  limit: number;
  sortBy: "createdAt" | "fileName" | "fileSize";
  order: "asc" | "desc";
}

export const getFilesService = async (params: ListFilesParams, caller: FilesFilterCaller) => {
  const { page, limit, sortBy, order } = params;
  const filter = buildFilesFilter(params, caller);
  const skip = (page - 1) * limit;
  const sort: Record<string, 1 | -1> = { [sortBy]: order === "asc" ? 1 : -1 };

  const [items, total] = await Promise.all([
    Upload.find(filter).sort(sort).skip(skip).limit(limit),
    Upload.countDocuments(filter),
  ]);

  return { items, total };
};

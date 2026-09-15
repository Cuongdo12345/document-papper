import express from "express";
import { createUploader } from "../../services/upload/upload.middleware";
import {
  uploadFiles,
  getFiles,
  getFileDetail,
  downloadFile,
  deleteFile
} from "../../controllers/upload/upload.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorizePermission } from "../../middlewares/authorizePermission.middleware";
import { validateQuery } from "../../middlewares/validate.middleware";
import { QueryUploadDTO } from "../../dto/uploadFiles/upload.dto";

const router = express.Router();

// DEV-007/IMP-007 (H-09a=SEC-30=RV09-01, xác nhận với chủ dự án
// 2026-09-01): trước đây gọi `createUploader()` KHÔNG tham số → nhận MỌI
// mime-type. Giới hạn đúng loại file đính kèm phổ biến của hệ thống quản lý
// tài liệu nội bộ: PDF/ảnh scan/Office (văn bản, bảng tính).
const uploader = createUploader({
  allowedTypes: [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  ],
});

router.post("/", authenticate, authorizePermission("UPLOAD_FILES"), uploader.array("files"), uploadFiles);
router.get("/", authenticate, authorizePermission("VIEW_FILES"), validateQuery(QueryUploadDTO), getFiles);
router.get("/:id", authenticate, authorizePermission("VIEW_FILE_DETAIL"), getFileDetail);
// [FE-15] Tải nội dung file thật — cùng permission `VIEW_FILE_DETAIL` (xem
// được chi tiết file thì tải được file, cùng 1 mức truy cập), đặt SAU
// "GET /:id" nhưng khác path ("/:id/download" có 2 segment) nên không xung
// đột thứ tự route (cùng nguyên tắc đã ghi ở `asset.routes.ts` cho "/export").
router.get("/:id/download", authenticate, authorizePermission("VIEW_FILE_DETAIL"), downloadFile);
router.delete("/:id", authenticate, authorizePermission("DELETE_FILE"), deleteFile);

export default router;
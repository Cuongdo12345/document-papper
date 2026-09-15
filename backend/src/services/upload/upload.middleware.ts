import multer from "multer";
import path from "path";
import fs from "fs";
import ApiError from "../../shared/errors/ApiError";

/**
 * 👉 🔥 Điểm mạnh:
Có thể custom theo từng API
Tái sử dụng cực mạnh
 */

// tạo folder
const uploadDir = path.join(__dirname, "../../../uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// storage
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),

  // DEV-015/MEDIUM-08 (Path Traversal, SEC-16): `file.originalname` do client
  // gửi lên (header multipart), KHÔNG được tin tưởng — nếu chứa `../` (hoặc
  // path separator khác) và ghép thẳng vào filename, có nguy cơ ghi file ra
  // NGOÀI `uploadDir` dự kiến. `path.basename()` chỉ giữ lại phần tên file
  // cuối cùng, loại bỏ mọi thành phần thư mục/traversal trước khi ghép với
  // timestamp — áp dụng cho CẢ `POST /api/upload` VÀ `certificateUploader`
  // (Calibration, `medicalDevice.routes.ts`) vì cả 2 dùng chung `storage` này
  // qua `createUploader()`.
  filename: (_, file, cb) => {
    const safeOriginalName = path.basename(file.originalname);
    const uniqueName = `${Date.now()}-${safeOriginalName}`;
    cb(null, uniqueName);
  }
});

// middleware factory (QUAN TRỌNG)
export const createUploader = (options?: {
  maxSize?: number;
  allowedTypes?: string[];
}) => {
  return multer({
    storage,
    limits: {
      fileSize: options?.maxSize || 10 * 1024 * 1024
    },
    fileFilter: (_, file, cb) => {
      if (!options?.allowedTypes) return cb(null, true);

      if (options.allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        // DEV-017/MEDIUM-13 (RV08-01): trước đây `new Error(...)` thô — KHÔNG
        // phải instance `MulterError` (lỗi từ fileFilter không được multer
        // wrap lại), nên KHÔNG được nhánh MulterError của error.middleware.ts
        // bắt được, rơi vào 500 chung. `ApiError` được error.middleware.ts xử
        // lý ở nhánh ĐẦU TIÊN (bất kể nguồn gốc lỗi) — map đúng 400 + message
        // rõ ràng.
        cb(ApiError.badRequest("Loại file không được phép"));
      }
    }
  });
};
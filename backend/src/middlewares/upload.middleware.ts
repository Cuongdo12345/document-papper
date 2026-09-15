import multer from "multer";
import path from "path";
import ApiError from "../shared/errors/ApiError";

// Số lượng tập tin được phép dùng
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const storage = multer.memoryStorage();

const fileFilter: multer.Options["fileFilter"] = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  //Check điều kiện chỉ cho phép file đuôi .xlsx, .xls
  // DEV-017/MEDIUM-13 (RV08-01): `new Error(...)` thô trước đây rơi vào
  // nhánh 500 chung của error.middleware.ts (không phải instance
  // `MulterError`, không được nhánh MulterError bắt) — dùng `ApiError` để
  // được xử lý đúng 400 ở nhánh ĐẦU TIÊN của error.middleware.ts.
  if (![".xlsx", ".xls"].includes(ext)) {
    return cb(ApiError.badRequest("Chỉ cho phép file Excel (.xlsx, .xls)"));
  }

  cb(null, true);
};

export const uploadExcel = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter,
});


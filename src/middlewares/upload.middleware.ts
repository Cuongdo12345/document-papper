import multer from "multer";
import path from "path";

// Số lượng tập tin được phép dùng
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const storage = multer.memoryStorage();

const fileFilter: multer.Options["fileFilter"] = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  
  //Check điều kiện chỉ cho phép file đuôi .xlsx, .xls
  if (![".xlsx", ".xls"].includes(ext)) {
    return cb(new Error("Chỉ cho phép file Excel (.xlsx, .xls)"));
  }

  cb(null, true);
};

export const uploadExcel = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter,
});


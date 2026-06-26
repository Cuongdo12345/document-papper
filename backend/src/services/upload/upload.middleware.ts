import multer from "multer";
import path from "path";
import fs from "fs";

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

  filename: (_, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
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
        cb(new Error("File type not allowed"));
      }
    }
  });
};
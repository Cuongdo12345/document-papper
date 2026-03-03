import multer from "multer";
import path from "path";
import { Request } from "express";


const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const storage = multer.memoryStorage();

const fileFilter: multer.Options["fileFilter"] = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

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


// const storage = multer.diskStorage({
//   destination: (req:Request, file, cb) => {
//     cb(null, "uploads/");
//   },
//   filename: (req, file, cb) => {
//     cb(null, `import-${Date.now()}.xlsx`);
//   },
// });

// export const uploadExcel = multer({
//   storage,
//   fileFilter: (req, file, cb) => {
//     if (
//       file.mimetype.includes("spreadsheet") ||
//       file.originalname.endsWith(".xlsx")
//     ) {
//       cb(null, true);
//     } else {
//       cb(new Error("Chỉ chấp nhận file Excel"));
//     }
//   },
// });

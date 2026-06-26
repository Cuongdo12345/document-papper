import { saveFilesToDB } from "../services/upload/upload.service";
import { Upload } from "../models/uploadFiles/upload.model";
import { Request, Response } from "express";

// upload
export const uploadFiles = async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];

    const result = await saveFilesToDB(files);

    return res.json({
      message: "Upload success",
      data: result,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// list files
export const getFiles = async (req: Request, res: Response) => {
  const files = await Upload.find({ isDeleted: false });

  res.json(files);
};

// file detail
export const getFileDetail = async (req: Request, res: Response) => {
  const file = await Upload.findById(req.params.id);

  if (!file) {
    return res.status(404).json({ message: "File not found" });
  }

  res.json(file);
};

// delete file (soft delete)
export const deleteFile = async (req: Request, res: Response) => {
  const file = await Upload.findById(req.params.id);

  if (!file) {
    return res.status(404).json({ message: "File not found" });
  }

  file.isDeleted = true;
  await file.save();

  res.json({ message: "File deleted" });
};

// import { Request, Response } from "express";
// import { mapUploadedFiles } from "../services/upload/upload.service";
// import { validateFiles } from "../services/upload/upload.validator";

// // upload 1 file
// export const uploadSingle = (req: Request, res: Response) => {
//   if (!req.file) {
//     return res.status(400).json({ message: "No file uploaded" });
//   }

//   const [file] = mapUploadedFiles([req.file]);

//   return res.json({
//     message: "Upload single file success",
//     data: file
//   });
// };

// // upload nhiều file
// export const uploadMultiple = (req:Request, res:Response) => {
//   try {
//     const files = req.files as Express.Multer.File[];

//     validateFiles(files, {
//       maxFiles: 5,
//       maxFileSize: 5 * 1024 * 1024, // 5MB mỗi file
//       maxTotalSize: 20 * 1024 * 1024, // 20MB tổng
//       allowedTypes: [
//         "image/png",
//         "image/jpeg",
//         "application/pdf"
//       ]
//     });

//     const result = mapUploadedFiles(files);

//     return res.json({
//       message: "Upload multiple files success",
//       data: result
//     });

//   } catch (error:any) {
//     return res.status(400).json({
//       message: error.message
//     });
//   }
// };

// /**
//  * Custom validate theo từng API (điểm mạnh)
//  * Upload Avatar:
//    validateFiles(files, {
//    maxFiles: 1,
//    maxFileSize: 2 * 1024 * 1024,
//    allowedTypes: ["image/png", "image/jpeg"]
// });
//  */

// /**
//  * Custom validate theo từng API (điểm mạnh)
//  * Upload Document:
//   validateFiles(files, {
//   maxFiles: 10,
//   maxFileSize: 10 * 1024 * 1024,
//   allowedTypes: [
//     "application/pdf",
//     "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
//   ]
// });
//  */

// /**
//  * Custom validate theo từng API (điểm mạnh)
//  * Upload Excel:
//   validateFiles(files, {
//   maxFiles: 1,
//   allowedTypes: [
//     "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
//   ]
// });
//  */

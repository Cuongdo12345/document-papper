import { Upload } from "../../models/uploadFiles/upload.model";

export const saveFilesToDB = async (files: Express.Multer.File[]) => {
  const data = files.map((file: Express.Multer.File) => ({
    fileName: file.originalname,
    fileUrl: `/uploads/${file.filename}`,
    fileSize: file.size,
    mimeType: file.mimetype
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
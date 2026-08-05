import { saveFilesToDB } from "../../services/upload/upload.service";
import { Upload } from "../../models/uploadFiles/upload.model";
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
    return res.status(404).json({ message: "Không timg thấy file" });
  }
  if(file.isDeleted === true ) {
    return res.status(404).json({ message: "File đã được xóa rồi" });
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



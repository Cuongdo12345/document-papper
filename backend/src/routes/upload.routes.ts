import express from "express";
import { createUploader } from "../services/upload/upload.middleware";
import {
  uploadFiles,
  getFiles,
  getFileDetail,
  deleteFile
} from "../controllers/upload.controller";

const router = express.Router();

const uploader = createUploader();

router.post("/", uploader.array("files"), uploadFiles);
router.get("/", getFiles);
router.get("/:id", getFileDetail);
router.delete("/:id", deleteFile);

export default router;
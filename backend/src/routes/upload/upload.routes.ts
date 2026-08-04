import express from "express";
import { createUploader } from "../../services/upload/upload.middleware";
import {
  uploadFiles,
  getFiles,
  getFileDetail,
  deleteFile
} from "../../controllers/upload/upload.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorizePermission } from "../../middlewares/authorizePermission.middleware";

const router = express.Router();

const uploader = createUploader();

router.post("/", authenticate, authorizePermission("UPLOAD_FILES"), uploader.array("files"), uploadFiles);
router.get("/", authenticate, authorizePermission("VIEW_FILES"), getFiles);
router.get("/:id", authenticate, authorizePermission("VIEW_FILE_DETAIL"), getFileDetail);
router.delete("/:id", authenticate, authorizePermission("DELETE_FILE"), deleteFile);

export default router;
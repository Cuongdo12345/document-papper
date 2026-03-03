import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import { exportDocumentsExcel, importDocumentsExcelData, syncDepartmentData  } from "../controllers/export-excel.controller"
import { uploadExcel } from "../middlewares/upload.middleware"

const router = Router();

router.get("/export-documents-excel", authenticate, exportDocumentsExcel);
router.post("/import-proposal", authenticate, uploadExcel.single("file"),importDocumentsExcelData);
router.post("/departments/sync-from-excel", authenticate, uploadExcel.single("file"), syncDepartmentData);

export default router;
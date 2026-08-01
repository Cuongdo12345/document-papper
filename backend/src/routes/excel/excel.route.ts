import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import {
  exportDocumentsExcel,
  importDocumentsExcelData,
  syncDepartmentData,
  downloadImportTemplate,
  getImportHistory,
} from "../../controllers/excel/excel.controller";
import { uploadExcel } from "../../middlewares/upload.middleware";

const router = Router();

router.get("/export-documents-excel", authenticate, exportDocumentsExcel);

// 🟠 File mẫu để tải về trước khi import — giúp user điền đúng cột ngay từ đầu.
router.get("/template", authenticate, downloadImportTemplate);

// 🟠 Hỗ trợ dry-run: POST .../import-proposal?dryRun=true để xem trước, không
// truyền (hoặc dryRun=false) để import thật — cùng 1 route, không cần route riêng.
router.post(
  "/import-proposal",
  authenticate,
  uploadExcel.single("file"),
  importDocumentsExcelData,
);

router.post(
  "/departments/sync-from-excel",
  authenticate,
  uploadExcel.single("file"),
  syncDepartmentData,
);

// 🟢 Lịch sử import (audit trail) — ADMIN xem tất cả, user thường chỉ xem của mình.
router.get("/import-history", authenticate, getImportHistory);

export default router;

// import { Router } from "express";
// import { authenticate } from "../middlewares/auth.middleware";
// import { exportDocumentsExcel, importDocumentsExcelData, syncDepartmentData} from "../controllers/excel.controller"
// import { uploadExcel } from "../middlewares/upload.middleware"

// const router = Router();

// router.get("/export-documents-excel", authenticate, exportDocumentsExcel);
// router.post("/import-proposal", authenticate, uploadExcel.single("file"),importDocumentsExcelData);
// router.post("/departments/sync-from-excel", authenticate, uploadExcel.single("file"), syncDepartmentData);

// export default router;

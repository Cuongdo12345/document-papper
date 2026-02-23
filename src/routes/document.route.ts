import { Router } from "express";
import {
  createDocuments,
  // exportDocumentPDF,
  getDocumentById,
  getAllDocuments,
  getReportsByProposals,
  updateDocuments,
  deleteDocuments,
  restoreDocuments
} from "../controllers/document.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { authorizePermission } from "../middlewares/authorizePermission.middleware"; 
// import {performanceMiddleware} from "../middlewares/performance.middleware";
// import {exportDocumentsExcel,exportDocumentsPDF} from "../controllers/document.export.controller";


const router = Router();

router.post("/proposal", authenticate, createDocuments);
router.get("/", authenticate,  getAllDocuments);
router.get("/:id", authenticate,  getDocumentById);
router.put("/:id", authenticate,  updateDocuments);
router.delete("/:id", authenticate,  deleteDocuments);
router.patch("/restore/:id", authenticate,  restoreDocuments);
router.get("/:proposalId/reports",authenticate, getReportsByProposals);
// router.get("/export-pdf/:id",authenticate, exportDocumentPDF);

export default router;

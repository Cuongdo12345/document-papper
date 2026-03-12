import { Router } from "express";
import {
  createDocuments,
  getDocumentById,
  getAllDocuments,
  getReportsByProposals,
  updateDocuments,
  deleteDocuments,
  restoreDocuments,
  deleteDocumentsByMonth
} from "../controllers/document.controller";
import { authenticate } from "../middlewares/auth.middleware";
import {uploadExcel} from "../middlewares/upload.middleware"
import { authorizePermission } from "../middlewares/authorizePermission.middleware"; 
// import {performanceMiddleware} from "../middlewares/performance.middleware";
// import {exportDocumentsExcel,exportDocumentsPDF} from "../controllers/document.export.controller";


const router = Router();

router.post("/proposal", authenticate, createDocuments);
router.get("/",  getAllDocuments);
router.get("/:id", authenticate,  getDocumentById);
router.put("/:id", authenticate,  updateDocuments);
router.delete("/delete-by-month", authenticate,  deleteDocumentsByMonth);
router.delete("/:id", authenticate,  deleteDocuments);
router.patch("/restore/:id", authenticate,  restoreDocuments);
router.get("/:proposalId/reports",authenticate, getReportsByProposals);

  
export default router;

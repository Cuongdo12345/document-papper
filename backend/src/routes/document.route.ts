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
import { authorizePermission } from "../middlewares/authorizePermission.middleware";
// import {performanceMiddleware} from "../middlewares/performance.middleware";
// import {exportDocumentsExcel,exportDocumentsPDF} from "../controllers/document.export.controller";


const router = Router();

router.post("/proposal", authenticate, authorizePermission("DOCUMENT_CREATE"), createDocuments);
router.get("/", authenticate, authorizePermission("DOCUMENT_READ") ,getAllDocuments);
router.get("/:id", authenticate, authorizePermission("DOCUMENT_DETAIL"), getDocumentById);
router.put("/:id", authenticate, authorizePermission("DOCUMENT_UPDATE"), updateDocuments);
// router.put("/:id/status", authenticate, updateStatusDocuments);
router.delete("/delete-by-month", authenticate, authorizePermission("DOCUMENT_DELETE"), deleteDocumentsByMonth);
router.delete("/:id", authenticate, authorizePermission("DOCUMENT_DELETE"), deleteDocuments);
router.patch("/restore/:id", authenticate, authorizePermission("DOCUMENT_UPDATE"), restoreDocuments);
router.get("/:proposalId/reports",authenticate, authorizePermission("DOCUMENT_READ"), getReportsByProposals);

  
export default router;

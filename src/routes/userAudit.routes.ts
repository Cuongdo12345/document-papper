import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import { authorizePermission } from "../middlewares/authorizePermission.middleware";
import {getAuditLogs,getAuditDashboard } from "../controllers/userAudit.controller";
import { validateQuery } from "../middlewares/validate.middleware";
import {performanceMiddleware} from "../middlewares/performance.middleware";

// import { getAuditLogsQuerySchema } from "../dtos/userAudit.dto";

const router = Router();

// router.get("/:userId",authenticate,authorize("ADMIN"), getUserAudit);
router.get("/", authenticate, authorizePermission("AUDIT_VIEW"), getAuditLogs);
router.get("/dashboard",authenticate, authorizePermission("AUDIT_VIEW_DASHBOARD"), getAuditDashboard);

export default router;

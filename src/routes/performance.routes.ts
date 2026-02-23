import { Router } from "express";
import { getPerformanceDashboard } from "../controllers/performance.controller";
import { authorizePermission } from "../middlewares/authorizePermission.middleware";
import { authenticate } from "../middlewares/auth.middleware";
import {performanceMiddleware} from "../middlewares/performance.middleware";

const router = Router();

router.get("/dashboard", authenticate, getPerformanceDashboard);

export default router;
import { Router } from "express";
import {
    adminDashboardSummary,
    getDepartmentDashboard,
    getProposalConversionByDepartment,
    getDeviceDamageTrend,
    getTopDamagedDevices
} from "../controllers/dashboard.controller";
import { authenticate } from "../middlewares/auth.middleware";
const router = Router();

// 🏥 ADMIN DASHBOARD SUMMARY
router.get("/admin-summary", authenticate, adminDashboardSummary);
router.get("/department/:departmentId", authenticate, getDepartmentDashboard);  
router.get("/kpi/proposal-conversion", authenticate, getProposalConversionByDepartment);
router.get("/kpi/device-damage-trend", authenticate, getDeviceDamageTrend); 
router.get("/kpi/top-damaged-devices", authenticate, getTopDamagedDevices); 


export default router;
import { Router } from "express";
import {
    adminDashboardSummary,
    getDepartmentDashboard,
    getProposalConversionByDepartment,
    getDeviceDamageTrend,
    getTopDamagedDevices,
    getDashboardDeviceStatsData,
    getTopDamagedInk
} from "../controllers/dashboard.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { authorizePermission } from "../middlewares/authorizePermission.middleware";
const router = Router();

// 🏥 ADMIN DASHBOARD SUMMARY
router.get("/admin-summary", authenticate, authorizePermission("DASHBOARD_READ") ,adminDashboardSummary);
router.get("/department/:departmentId", authenticate, authorizePermission("DASHBOARD_READ"), getDepartmentDashboard);  
router.get("/kpi/proposal-conversion", authenticate, authorizePermission("DASHBOARD_READ"), getProposalConversionByDepartment);
router.get("/kpi/device-damage-trend", authenticate, authorizePermission("DASHBOARD_READ"), getDeviceDamageTrend); 
router.get("/kpi/top-damaged-devices", authenticate, authorizePermission("DASHBOARD_READ"), getTopDamagedDevices);
router.get("/kpi/top-damaged-inks", authenticate, authorizePermission("DASHBOARD_READ"), getTopDamagedInk);
router.get("/device-stats", authenticate, authorizePermission("DASHBOARD_READ"), getDashboardDeviceStatsData) 


export default router;
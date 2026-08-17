import { Router } from "express";
import {
    adminDashboardSummary,
    getDepartmentDashboard,
    getProposalConversionByDepartment,
    getDeviceDamageTrend,
    getTopDamagedDevices,
    getDashboardDeviceStatsData,
    getTopDamagedInk,
    getAssetDashboardSummary,
    getAssetWarrantyExpiring,
    getAssetMaintenanceOverdue,
    getMedicalDeviceDashboardSummary,
    getMedicalDeviceCalibrationDue
} from "../../controllers/dashboard/dashboard.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorizePermission } from "../../middlewares/authorizePermission.middleware";
const router = Router();

// 🏥 ADMIN DASHBOARD SUMMARY
router.get("/admin-summary", authenticate, authorizePermission("DASHBOARD_READ") ,adminDashboardSummary);
router.get("/department/:departmentId", authenticate, authorizePermission("DASHBOARD_READ"), getDepartmentDashboard);  
router.get("/kpi/proposal-conversion", authenticate, authorizePermission("DASHBOARD_READ"), getProposalConversionByDepartment);
router.get("/kpi/device-damage-trend", authenticate, authorizePermission("DASHBOARD_READ"), getDeviceDamageTrend); 
router.get("/kpi/top-damaged-devices", authenticate, authorizePermission("DASHBOARD_READ"), getTopDamagedDevices);
router.get("/kpi/top-damaged-inks", authenticate, authorizePermission("DASHBOARD_READ"), getTopDamagedInk);
router.get("/device-stats", authenticate, authorizePermission("DASHBOARD_READ"), getDashboardDeviceStatsData) 

// 🔗 GIAI ĐOẠN 4 (module Asset)
router.get("/assets/summary", authenticate, authorizePermission("DASHBOARD_READ"), getAssetDashboardSummary);
router.get("/assets/warranty-expiring", authenticate, authorizePermission("DASHBOARD_READ"), getAssetWarrantyExpiring);
router.get("/assets/maintenance-overdue", authenticate, authorizePermission("DASHBOARD_READ"), getAssetMaintenanceOverdue);

// 🔗 GIAI ĐOẠN 4 (module Quản lý Thiết bị Y tế) — dùng CHUNG permission
// DASHBOARD_READ với mọi route dashboard khác (kể cả của module Asset ở
// trên) — nhất quán: "xem dashboard" là 1 concern riêng, tách khỏi
// MEDICAL_DEVICE_VIEW (vốn dùng cho xem CHI TIẾT 1 thiết bị qua :assetId).
router.get("/medical-devices/summary", authenticate, authorizePermission("DASHBOARD_READ"), getMedicalDeviceDashboardSummary);
router.get("/medical-devices/calibration-due", authenticate, authorizePermission("DASHBOARD_READ"), getMedicalDeviceCalibrationDue);

export default router;
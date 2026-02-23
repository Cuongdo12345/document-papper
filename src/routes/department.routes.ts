import { Router } from "express";
import {
  createDepartment,
  getAllDepartments,
  updateDepartment,
  deleteDepartment,
  getDepartmentById,
} from "../controllers/department.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { authorizePermission } from "../middlewares/authorizePermission.middleware";
// import {performanceMiddleware} from "../middlewares/performance.middleware";

const router = Router();

router.post("/", authenticate, authorizePermission("DEPARTMENT_CREATE"), createDepartment);
router.get("/", authenticate, authorizePermission("DEPARTMENT_VIEW"), getAllDepartments);
router.get("/:id", authenticate, authorizePermission("DEPARTMENT_VIEW_DETAIL"), getDepartmentById);
router.put("/:id", authenticate, authorizePermission("DEPARTMENT_UPDATE"), updateDepartment);
router.delete("/:id", authenticate, authorizePermission("DEPARTMENT_DELETE"), deleteDepartment);

export default router;

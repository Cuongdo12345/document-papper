import express from "express";
import { createPermission,
         getPermissions,
         updatePermission,
         deletePermission,
         createRole,
         getRoles,
         updateRole,
         deleteRole,
         assignPermissionsToRole,
         createPolicy,
         getPolicies,
         updatePolicy,
         deletePolicy
 } from "../controllers/rbac.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = express.Router();

// Permission
router.post("/permissions", authenticate, createPermission);
router.get("/permissions", authenticate, getPermissions);
router.put("/permissions/:id", authenticate, updatePermission);
router.delete("/permissions/:id", authenticate, deletePermission);

// Role
router.post("/roles", authenticate, createRole);
router.get("/roles", authenticate, getRoles);
router.put("/roles/:id", authenticate, updateRole);
router.delete("/roles/:id", authenticate, deleteRole);
router.post("/roles/:id/assign-permissions", authenticate, assignPermissionsToRole);

// Policy
router.post("/policies", authenticate, createPolicy);
router.get("/policies", authenticate, getPolicies);
router.put("/policies/:id", authenticate, updatePolicy);
router.delete("/policies/:id", authenticate, deletePolicy);

export default router;
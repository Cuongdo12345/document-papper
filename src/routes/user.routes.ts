import { Router } from "express";
import { createUser, 
         getUsers, 
         deleteUser, 
         getUserById, 
         updateUser,
         restoreUser,
         changePasswordUser,
         resetPasswordByAdmin,
         getMe, 
         updateMe } from "../controllers/user.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { authorizePermission } from "../middlewares/authorizePermission.middleware";

const router = Router();

router.post("/",authenticate, createUser);
router.get("/", authenticate, getUsers);
router.get("/me", authenticate, getMe);
router.get("/:id", authenticate, getUserById);
router.patch("/me", authenticate, updateMe);
router.put("/:id", authenticate, authorizePermission("USER_UPDATE"), updateUser);
router.delete("/:id", authenticate, authorizePermission("USER_DELETE"), deleteUser);
router.patch("/restore/:id", authenticate, authorizePermission("USER_RESTORE"), restoreUser);
router.patch("/change-password", authenticate, authorizePermission("USER_CHANGE_PASSWORD"), changePasswordUser);
router.patch("/reset-password/:id", authenticate, authorizePermission("SYSTEM_ADMIN"), resetPasswordByAdmin);
export default router;
// authorizePermission("AUDIT_VIEW")
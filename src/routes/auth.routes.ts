import { Router } from "express";
import {
  login,
  refreshAccessToken,
  logout,
  forgotPassword,
  resetPassword
} from "../controllers/auth.controller";
import { authenticate } from "../middlewares/auth.middleware";
import {performanceMiddleware} from "../middlewares/performance.middleware";
import { authorizePermission } from "../middlewares/authorizePermission.middleware";

const router = Router();

router.post("/login", login);
router.post("/refresh-token", refreshAccessToken);
router.post("/logout", authenticate, logout);
router.post("/forgot-password",forgotPassword);
router.post("/reset-password", resetPassword);

export default router;

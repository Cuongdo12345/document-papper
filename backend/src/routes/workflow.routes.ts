import express from "express";
import * as controller from "../controllers/workflow.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = express.Router();

router.post("/templates", authenticate ,controller.createTemplate);
router.post("/submit", authenticate ,controller.submit);
router.post("/:id/approve", authenticate ,controller.approve);
router.post("/:id/reject", authenticate ,controller.reject);

export default router;
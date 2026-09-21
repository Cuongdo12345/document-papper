import { Router } from "express";
import { getSystemDesign } from "../../controllers/systemDesign/systemDesign.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorizePermission } from "../../middlewares/authorizePermission.middleware";

/**
 * DEV-073 (2026-09-21) — dùng LẠI permission `SYSTEM_DESIGN_VIEW` đã tạo ở
 * DEV-072 (đã seed trong DB dev thật, gán cho Role `IT` + `ADMIN`) thay vì
 * tạo permission trùng mục đích mới — CLAUDE.md §11 "Existing Implementation
 * First". Permission đó lúc DEV-072 chỉ gate trang FE tĩnh; nay gate THÊM
 * đúng route backend thật cho cùng tính năng "xem System Design" — không
 * đổi ý nghĩa permission, chỉ mở rộng phạm vi áp dụng của quyền hiện có.
 */
const router = Router();

router.get("/", authenticate, authorizePermission("SYSTEM_DESIGN_VIEW"), getSystemDesign);

export default router;

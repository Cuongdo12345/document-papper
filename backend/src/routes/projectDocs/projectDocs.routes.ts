import { Router } from "express";
import { listProjectDocs, getProjectDoc } from "../../controllers/projectDocs/projectDocs.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorizePermission } from "../../middlewares/authorizePermission.middleware";

/**
 * DEV-075 (2026-09-21) — dùng LẠI permission `SYSTEM_DESIGN_VIEW` (đã tạo ở
 * DEV-072, seed sẵn cho Role IT/ADMIN) thay vì tạo permission mới — cùng đối
 * tượng người xem (dev/admin) với trang "System Design", cùng lý do "nội bộ,
 * không public" (12 tài liệu này có cả `09_SECURITY_ANALYSIS.md`,
 * `12_ISSUES_AND_RISKS.md` — chứa finding bảo mật chi tiết). CLAUDE.md §11
 * "Existing Implementation First" — không nhân bản permission cùng mục đích.
 */
const router = Router();

router.get("/", authenticate, authorizePermission("SYSTEM_DESIGN_VIEW"), listProjectDocs);
router.get("/:id", authenticate, authorizePermission("SYSTEM_DESIGN_VIEW"), getProjectDoc);

export default router;

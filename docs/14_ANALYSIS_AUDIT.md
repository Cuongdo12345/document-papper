# Phase 14 — Analysis Audit

> Loại: POST-ANALYSIS AUDIT (không phải re-run Phase 01→13). Ngày: 2026-08-31.
> Mục tiêu: xác minh các kết luận QUAN TRỌNG của Phase 01→13 với source code hiện tại, dựa trên bằng chứng đã có từ 16 module code review (REVIEW-00→16), Global Security Review (`docs/20_GLOBAL_SECURITY_REVIEW.md`) và Global Architecture Review (`docs/21_GLOBAL_ARCHITECTURE_REVIEW.md`) — theo đúng SKILL.md Rule 07 ("Global review ưu tiên đọc review documents thay vì đọc lại source"). KHÔNG đọc lại toàn bộ repository, KHÔNG re-run Phase 01→13.

---

## 1. Audit Objective

Xác minh mức độ CÒN CHÍNH XÁC của các kết luận quan trọng trong `docs/01_PROJECT_OVERVIEW.md` → `docs/13_FINAL_PROJECT_REPORT.md` (13-phase historical baseline) so với:

1. Source code hiện tại (branch `main`, commit nền `5b58fb1`, cộng thêm working-tree changes chưa commit — xem mục 2).
2. Kết quả 16 module code review (REVIEW-00→16, thực hiện 2026-08-30→31, SAU khi 13-phase baseline hoàn thành) — các review này đã tự verify lại nhiều finding gốc bằng cách đọc trực tiếp source, nên là nguồn xác minh trung gian đáng tin cậy nhất, mới hơn baseline.
3. 2 Global Review vừa hoàn thành (`20_GLOBAL_SECURITY_REVIEW.md`, `21_GLOBAL_ARCHITECTURE_REVIEW.md`).

Không audit lại từng chi tiết nhỏ — ưu tiên: finding CRITICAL/HIGH, kết luận kiến trúc/API/database/RBAC/business rule mang tính quyết định, và các điểm có khả năng đã thay đổi giữa 2 mốc thời gian.

---

## 2. Current Project State

- **Branch**: `main`. **Commit nền**: `5b58fb1` ("update", 2026-08-30) — cùng commit mà `00_PROJECT_MEMORY.md` đã ghi nhận là hiện trạng mới nhất trước đợt module-review.
- **Working tree**: CÓ thay đổi chưa commit, xác nhận qua `git status`/`git diff --stat`:

| File | Thay đổi |
|---|---|
| `backend/src/controllers/users/user.controller.ts` | +14 dòng |
| `backend/src/docs/openAPI.yaml` | +48 dòng |
| `backend/src/dto/users/users.dto.ts` | +9 dòng |
| `backend/src/routes/users/user.routes.ts` | +15 dòng |
| `backend/src/services/users/users.service.ts` | +34 dòng |
| `backend/src/shared/constants/permission.constant.ts` | +7 dòng |

Tổng: 6 file, 127 dòng thêm, **0 dòng xoá** — toàn bộ là bổ sung thuần tuý, không sửa/xoá logic hiện có.

- **Đối chiếu với tài liệu đã ghi nhận**: `00_PROJECT_MEMORY.md` (mục "Security hardening — TASK-002") mô tả chính xác bộ thay đổi này: thêm endpoint `PATCH /api/users/:id/role` (wire lại `assignRole()`), permission mới `USER_ASSIGN_ROLE`, cập nhật OpenAPI tương ứng. **CONFIRMED khớp 100%** — không phát hiện thay đổi nào khác ngoài dự kiến, working tree đúng như trạng thái đã bàn giao ở `SESSION_HANDOFF.md`.
- **Untracked**: `.claude/`, `CLAUDE.md`, `"Claude architecture.md"`, `docs/` — đây là toàn bộ knowledge-base (bao gồm chính tài liệu audit này) chưa được `git add`/commit — khớp ghi nhận ở `00_PROJECT_MEMORY.md` ("Context init — 2026-08-30").
- **Không có git reset/thay đổi Git state nào được thực hiện trong audit này** (chỉ đọc `git status`/`git branch`/`git log`/`git diff --stat`).

---

## 3. Audit Methodology

Theo đúng yêu cầu token-optimization (SKILL.md §6, Rule 07):

```
PROJECT_MEMORY (đã đọc đầy đủ, nhiều lần trong session)
  → 16 module review REVIEW-00→16 (đã đọc TOÀN VĂN: 00, 04, 05, 06, 07, 16;
     đã có tóm tắt chi tiết kèm ID finding cụ thể từ PROJECT_MEMORY cho: 01,02,03,
     08,09,10,11,12-Cron,13-Shared,14,15)
  → 2 Global Review vừa hoàn thành (Security, Architecture — đọc toàn văn, tự viết)
  → Phase gốc cụ thể (02_ARCHITECTURE.md, 04_DATABASE_ANALYSIS.md,
     09_SECURITY_ANALYSIS.md — đã đọc toàn văn ở các bước trước trong session)
  → 12_ISSUES_AND_RISKS.md (đọc mục TOP 10 + risk matrix để đối chiếu ISS-01→10)
  → source code trực tiếp CHỈ khi cần verify 1 điểm cụ thể (git status/diff --stat)
```

**Không đọc lại toàn văn**: `01_PROJECT_OVERVIEW.md`, `03_BACKEND_ANALYSIS.md`, `05_API_ANALYSIS.md`, `06_FRONTEND_ANALYSIS.md`, `07_AUTH_RBAC_ANALYSIS.md`, `08_BUSINESS_LOGIC.md`, `10_PERFORMANCE_ANALYSIS.md`, `11_TECHNICAL_DEBT.md`, `13_FINAL_PROJECT_REPORT.md` — nội dung liên quan của các file này đã được đối chiếu/verify lại đầy đủ thông qua 16 module review (mới hơn, đọc trực tiếp source ở thời điểm gần nhất) và được tóm tắt có ID cụ thể trong `00_PROJECT_MEMORY.md`. Áp dụng đúng nguyên tắc SKILL.md Rule 04 ("Không đọc lại historical analysis nếu module review trước đã cung cấp đủ context").

**Phân loại** dùng cho mỗi finding: `CONFIRMED` / `PARTIALLY CONFIRMED` / `INCORRECT` / `OUTDATED` / `UNKNOWN` — không suy đoán khi thiếu evidence.

---

## 4. Architecture Audit

**Nguồn đối chiếu**: `docs/02_ARCHITECTURE.md` (Phase 02) vs `docs/21_GLOBAL_ARCHITECTURE_REVIEW.md` (vừa hoàn thành, tổng hợp 8 module review).

| Kết luận Phase 02 | Trạng thái | Evidence |
|---|---|---|
| Monolith, layered theo domain, không microservices, không event bus | **CONFIRMED** | `21_GLOBAL_ARCHITECTURE_REVIEW.md` §0/§3 xác nhận lại, không phát hiện thay đổi kiến trúc tổng thể |
| Không có circular dependency | **CONFIRMED** | `21_GLOBAL_ARCHITECTURE_REVIEW.md` Mục 2 — xác nhận độc lập ở cả tầng cross-cutting (REVIEW-00 §3) lẫn toàn bộ dependency graph domain (DAG thuần) |
| Dashboard import thẳng Model domain khác — "coupling chặt nhất hệ thống" | **CONFIRMED** | ARCH-01 (`21_GLOBAL_ARCHITECTURE_REVIEW.md`) — REVIEW-07 xác nhận lại pattern này không đổi ở source hiện tại |
| Domain `documents` là domain tách rõ nhất (`.validator/.mapper/.query.ts`) | **CONFIRMED, bổ sung mới**: đây KHÔNG chỉ là đặc điểm domain phức tạp nhất mà còn là **INCONSISTENCY kiến trúc** — không domain nào khác áp dụng lại pattern này | ARCH-22 — thông tin này KHÔNG có trong Phase 02 (Phase 02 chỉ mô tả hiện tượng, không đánh giá đây là thiếu nhất quán) |
| Transaction: side-effect (Notification, sync Asset) chủ đích nằm ngoài transaction chính | **CONFIRMED**, có bổ sung hệ quả cụ thể mới | ARCH-18 — `16_DATABASE_CROSS_DOMAIN_REVIEW.md` §C.1 xác nhận hệ quả thực tế: nếu `syncAssetOnDocumentApproved` lỗi, Document/WorkflowInstance đã commit "approved" nhưng Asset không cập nhật |

**Gap mới phát hiện SAU Phase 02, chưa từng có trong baseline gốc**: không có cơ chế authorization/department-scoping tập trung — mỗi domain tự làm khác nhau (ARCH-06, HIGH). Phase 02 chỉ mô tả sự TỒN TẠI của ABAC (§6.2 bước 5) mà không đánh giá nó có hoạt động hay không — Phase 07/09 (sau đó) mới xác nhận ABAC chết runtime (SEC-07/ISS-03), nhưng KHÔNG domain nào trong 13-phase baseline liên kết việc "ABAC chết" với hệ quả cụ thể "3 domain độc lập (Documents/Assets/Dashboard) tự làm scoping không nhất quán" — đây là **bổ sung mới** từ Global Architecture Review, không phải audit lại điều đã biết.

---

## 5. Backend Audit

**Nguồn đối chiếu**: tóm tắt Phase 03 trong `00_PROJECT_MEMORY.md` vs `docs/module-reviews/00_FOUNDATION_CODE_REVIEW.md` (đọc toàn văn).

| Kết luận Phase 03 | Trạng thái | Evidence |
|---|---|---|
| `POST /documents/proposal` thiếu `authorizePermission` | **CONFIRMED, vẫn mở** | RV05-02 (REVIEW-05), xác nhận LẦN THỨ 3 độc lập ở `15_API_CONTRACT_REVIEW.md` §6.3 |
| Nhiều `validateQuery` bị comment out | **CONFIRMED, PHẠM VI RỘNG HƠN đã biết** | Phase 03 không liệt kê đủ 12-13 vị trí — REVIEW-03/05/10 + API Contract Review (§7.1) bổ sung danh sách đầy đủ hơn |
| Response format không đồng nhất (auth/upload) | **CONFIRMED, vẫn mở** | RV09-07 (`upload.controller.ts` không dùng `catchAsync`/`ApiError` — NGOẠI LỆ DUY NHẤT toàn hệ thống, xác nhận ở REVIEW-09) |
| Dead code (`loadDocument`, `mongo.logger`, `errorHandler` cũ) | **CONFIRMED, không đổi qua 2 commit** | RV00-06 (`00_FOUNDATION_CODE_REVIEW.md`) — xác nhận lại đúng y nguyên ở `f4ce8e9`→`5b58fb1`, không dọn |

**Không phát hiện conflict/incorrect nào** giữa Phase 03 và source hiện tại ở phạm vi đã đối chiếu.

---

## 6. Database Audit

**Nguồn đối chiếu**: `docs/04_DATABASE_ANALYSIS.md` (đọc toàn văn trong session trước) vs `docs/module-reviews/16_DATABASE_CROSS_DOMAIN_REVIEW.md` (đọc toàn văn, tự viết).

| Kết luận Phase 04 | Trạng thái | Evidence |
|---|---|---|
| 7/21 model không có index ngoài `_id` (`RefreshToken`, `Role`, `Permission`, `Policy`, `WorkflowTemplate`, `WorkflowInstance`, `Upload`) | **CONFIRMED, không đổi** | RV05-08 xác nhận lại `WorkflowInstance`; không có module review nào phát hiện index mới được thêm |
| `WorkflowInstance` là risk cao nhất (COLLSCAN qua `$expr`) | **CONFIRMED, không đổi** | RV05-08 (REVIEW-05) |
| 2 lỗ hổng hard-delete không check tham chiếu ngược (Document→month-delete, Asset→relatedAsset) | **CONFIRMED, MỞ RỘNG PHẠM VI đáng kể** | Phase 04 chỉ ghi nhận 2 vị trí — `16_DATABASE_CROSS_DOMAIN_REVIEW.md` (RV16-01) phát hiện THÊM 1 chuỗi tham chiếu 2 tầng chưa từng biết (`MedicalDeviceProfile`→`CalibrationRecord`), NGHIÊM TRỌNG HƠN 2 vị trí cũ vì không có bất kỳ đường dọn nào (kể cả thủ công qua API) |
| Transaction yêu cầu MongoDB replica set, chưa xác minh môi trường thật | **UNKNOWN, không đổi** | Không module review nào xác minh được hạ tầng thật — vẫn đúng nguyên trạng thái Phase 02/04 |

**Bổ sung mới ngoài baseline Phase 04**: RV16-02 (User.department có thể bị gán ObjectId không tồn tại khi update không kèm role), RV16-03 (disable User không đồng bộ Asset.assignedTo) — 2 finding này KHÔNG có trong Phase 04 gốc, phát sinh từ việc trace cross-domain sâu hơn ở REVIEW-16.

---

## 7. API Audit

**Nguồn đối chiếu**: tóm tắt Phase 05 trong `00_PROJECT_MEMORY.md` vs `docs/module-reviews/15_API_CONTRACT_REVIEW.md` (đối chiếu Implemented vs OpenAPI, đã đọc các mục trọng yếu §6.1-6.4, §7.1).

| Kết luận Phase 05 | Trạng thái | Evidence |
|---|---|---|
| 116 endpoint/87 path khớp gần hoàn hảo `openAPI.yaml` | **CONFIRMED, chính xác hơn dự kiến** | REVIEW-13/15 đối chiếu đầy đủ 117 endpoint (sau khi thêm `PATCH /users/:id/role`) — khớp TUYỆT ĐỐI 100% về endpoint inventory + Authentication (public/Bearer) trên cả 12 domain |
| Pagination bug 3 domain | **CONFIRMED, đúng và mở rộng thêm bằng chứng** | Documents (RV05-03/ISS-08), Users, Notifications (RV10-01 — hậu quả nặng hơn dự kiến: `skip=NaN` có khả năng lỗi hẳn request phổ biến nhất) |
| File upload không serve qua HTTP | **CONFIRMED, không đổi** | RV00-01/RV09-09 — không tìm thấy `express.static` cho `/uploads` ở bất kỳ đâu |

**Finding QUAN TRỌNG chưa từng có trong Phase 05 gốc** (gap thật trong baseline, không phải lỗi baseline): 3 chuỗi permission dùng ở route (`USER_READ`, `USER_DETAIL`, `DOCUMENT_DETAIL`) KHÔNG tồn tại trong `permission.constant.ts` — chỉ lộ ra khi REVIEW-13/15 đối chiếu chéo route code với catalog permission (bài tập mà Phase 05 gốc không thực hiện, vì Phase 05 tập trung path/method/request/response, không đối chiếu permission string với catalog thật). Đây là **gap phạm vi trong phân tích gốc**, không phải Phase 05 sai.

---

## 8. Frontend Audit

**Trạng thái**: **KHÔNG THAY ĐỔI — CONFIRMED N/A.** Không có `client/`/`web/`/`app/` nào trong repo (đã xác nhận lại qua cấu trúc thư mục quan sát được xuyên suốt toàn bộ 16 module review — không review nào phát hiện thư mục frontend mới). Repo vẫn chỉ có `backend/`.

---

## 9. Authentication Audit

**Nguồn đối chiếu**: tóm tắt Phase 07 (§ Auth) trong `00_PROJECT_MEMORY.md` vs `docs/module-reviews/01_AUTH_CODE_REVIEW.md` (tóm tắt), `docs/09_SECURITY_ANALYSIS.md` §1 (đọc toàn văn).

| Kết luận Phase 07 | Trạng thái | Evidence |
|---|---|---|
| JWT payload dư thừa `role`/`department` | **CONFIRMED, không đổi** | SEC-04 |
| Bất đối xứng revoke token khi đổi mật khẩu (`changePassword` không revoke, 3 luồng khác có) | **CONFIRMED, không đổi** | SEC-01 |
| Chống account-enumeration + timing attack (login/forgotPassword) | **CONFIRMED, điểm tốt, không đổi** | SEC-19 (đối trọng), xác nhận lại ở `09_SECURITY_ANALYSIS.md` §1 |

**Finding MỚI, chưa từng có trong Phase 07 gốc**: `RV01-02` (refresh token lưu **PLAINTEXT**, không hash — khác `PasswordResetToken` đã hash SHA-256) và `RV01-01` (`refresh()` không bọc `jwt.verify()` trong try/catch → lỗi 500 rò rỉ message thư viện). Cả 2 đến từ REVIEW-01 (đọc sâu `auths.service.ts` mà Phase 07 gốc không đào tới mức chi tiết này).

---

## 10. RBAC Audit

**Nguồn đối chiếu**: tóm tắt Phase 07 (§ RBAC) trong Memory vs `docs/module-reviews/02_RBAC_CODE_REVIEW.md` (tóm tắt chi tiết trong Memory).

| Kết luận Phase 07/09/12 | Trạng thái | Evidence |
|---|---|---|
| Privilege escalation ADMIN qua `PUT /users/:id` (ISS-01/SEC-05) | **RESOLVED** (đã fix 2026-08-30, xác nhận lại qua working-tree hiện tại KHÔNG chứa fix này nữa vì đã commit ở `5b58fb1` — đúng, TASK-001 đã merge vào commit nền) | `docs/tasks/TASK-001.md`, `12_ISSUES_AND_RISKS.md:49` |
| ABAC/Policy chết hoàn toàn ở runtime (ISS-03) | **CONFIRMED, không đổi, vẫn Critical Risk** | `12_ISSUES_AND_RISKS.md:208`; xác nhận lại ARCH-06 |
| `getUserEffectivePermissions` công thức đúng, có guard chống dữ liệu mồ côi | **CONFIRMED, điểm tốt** | Không module review nào phản bác |

**Finding CRITICAL MỚI, KHÔNG CÓ trong Phase 07/09/12 gốc — gap quan trọng nhất phát hiện được ở audit này**: `RV02-01` — rename Role thành `"ADMIN"` tạo backdoor persistence, hoàn toàn độc lập với ISS-01 (đã fix) và **KHÔNG bị ảnh hưởng bởi bản vá TASK-001/002**. Đây là 1 con đường tấn công dẫn tới CÙNG hậu quả (full ADMIN bypass) mà toàn bộ 13-phase baseline KHÔNG hề đề cập — vì cơ chế bypass dựa trên so khớp CHUỖI `role.name === "ADMIN"` (đã biết từ Phase 07 §6.2) nhưng chưa ai trong 13-phase baseline đặt câu hỏi "điều gì xảy ra nếu ĐỔI TÊN 1 role khác thành ADMIN". Đã ghi nhận là **CRITICAL, vẫn OPEN** trong `20_GLOBAL_SECURITY_REVIEW.md` §1.

---

## 11. Business Logic Audit

**Nguồn đối chiếu**: tóm tắt Phase 08 trong Memory vs `docs/module-reviews/05_DOCUMENTS_CODE_REVIEW.md`, `06_ASSETS_CODE_REVIEW.md`, `07_DASHBOARD_CODE_REVIEW.md` (đọc toàn văn).

| Kết luận Phase 08 | Trạng thái | Evidence |
|---|---|---|
| Status machine đầy đủ Document/Workflow/Asset | **PARTIALLY CONFIRMED** — machine tồn tại đúng như mô tả, NHƯNG có 1 nhánh chuyển trạng thái KHÔNG BAO GIỜ THỰC THI ĐÚNG (xem dưới) | RV05-01 |
| CalibrationRecord rules (Rule MD1/MD3) | **CONFIRMED, không đổi, có positive finding bổ sung** | RV06-09 — cơ chế `committed` flag dọn file mồ côi tinh vi hơn baseline Phase 08 ghi nhận |

**Finding CRITICAL, KHÔNG CÓ trong Phase 08 gốc**: `RV05-01` — `DOCUMENT_RULES.CONFIRM_STATUS.referenceSubType` (yêu cầu `PROPOSE_INK`) mâu thuẫn trực tiếp với `syncAssetOnDocumentApproved()` (hard-code tìm `PROPOSE_REPAIR`) — khiến nhánh nghiệp vụ "xác nhận tình trạng sau sửa chữa" **không bao giờ đồng bộ Asset**, Asset kẹt vĩnh viễn ở `UNDER_MAINTENANCE`. Được củng cố bởi **3 bằng chứng độc lập khác** (RV07-05 dashboard KPI, RV08-06 Excel import/export) đều đồng thuận hướng `CONFIRM_STATUS↔PROPOSE_INK` là đúng, chỉ `workflow.service.ts` lệch. Phase 08 (business logic gốc) **không phát hiện mâu thuẫn này** — đây là gap thật trong baseline, đã được đóng lại đầy đủ bởi REVIEW-05/07/08.

---

## 12. Security Audit

**Nguồn đối chiếu**: `docs/09_SECURITY_ANALYSIS.md` (đọc toàn văn) vs `docs/20_GLOBAL_SECURITY_REVIEW.md` (đọc toàn văn, tự viết — đã tổng hợp đầy đủ 27 SEC-finding gốc + toàn bộ RVxx-yy liên quan security từ 16 module review).

Đã audit đầy đủ ở `20_GLOBAL_SECURITY_REVIEW.md` — không lặp lại chi tiết ở đây. Tóm tắt kết quả:

| Hạng mục | Trạng thái |
|---|---|
| 27 SEC-finding gốc (Phase 09) | **1 RESOLVED (SEC-05), 26 còn lại đều CONFIRMED không đổi hoặc mở rộng phạm vi** (không có SEC-finding nào bị chứng minh INCORRECT) |
| Finding CRITICAL mới ngoài baseline | 1 (`RV02-01`, xem mục 10) |
| Finding HIGH mới ngoài baseline | 10 (chi tiết: `20_GLOBAL_SECURITY_REVIEW.md` §2) — đáng chú ý nhất: chuỗi 4 finding IDOR domain Upload (`RV09-01→04`), `resetPassword()` thiếu safeguard ADMIN (`RV03-01`) |

**Kết luận audit**: Phase 09 (Security Analysis gốc) có độ chính xác CAO — không phát hiện finding nào bị REVIEW-00→16 chứng minh là sai (INCORRECT). Khoảng trống chủ yếu là PHẠM VI (Phase 09 chưa đào đủ sâu vào từng domain cụ thể — vd domain Upload không được phân tích chi tiết ở Phase 09, chỉ tới REVIEW-09 mới lộ ra 4 finding HIGH).

---

## 13. Performance Audit

**Nguồn đối chiếu**: tóm tắt Phase 10 (16 finding PERF-01→16) trong Memory vs các module review liên quan (`06_ASSETS_CODE_REVIEW.md` RV06-07, `07_DASHBOARD_CODE_REVIEW.md` RV07-02, tóm tắt `08_IMPORT_EXPORT_CODE_REVIEW.md`, `11_PERFORMANCE_CODE_REVIEW.md` trong Memory).

| Kết luận Phase 10 | Trạng thái | Evidence |
|---|---|---|
| PERF-03 (Document thiếu index `isActive`) | **CONFIRMED, MỞ RỘNG PHẠM VI** | RV07-02 — cùng gap tồn tại ở `Asset` (5/6 aggregate dashboard Asset bị ảnh hưởng tương tự), Phase 10 chỉ ghi nhận cho `Document` |
| PERF-07 (Excel import N+1 transaction, ≤5000/file) | **PARTIALLY CONFIRMED — bổ sung SẮC THÁI QUAN TRỌNG** | Tóm tắt REVIEW-08 trong Memory: *"nay xác nhận đây là ĐÁNH ĐỔI CÓ CHỦ ĐÍCH ghi rõ trong comment, không phải sơ suất"* — Phase 10 liệt kê như 1 performance risk thuần, REVIEW-08 làm rõ đây là quyết định kiến trúc có ý thức (ưu tiên tránh 1 transaction khổng lồ) |
| PERF-09 (N+1 Role/User query trong cron alerts) | **CONFIRMED, không đổi** | RV06-07 cross-ref |
| Không có cache layer ngoài (Redis) | **CONFIRMED, không đổi** | Xác nhận lại nhiều lần (RV00-07, ARCH-16) |

**Finding MỚI ngoài Phase 10**: `RV11-02` — `endpoint` trong `ApiPerformance` ghi theo `req.route.path` KHÔNG bao gồm `req.baseUrl` — làm nhiều domain khác nhau bị gộp lẫn vào cùng nhóm thống kê, hỏng chính mục đích dashboard hiệu năng. Đây là bug về TÍNH ĐÚNG của metrics, Phase 10 gốc không phát hiện (vì Phase 10 phân tích query pattern, không phân tích chính module đo hiệu năng).

---

## 14. Technical Debt Audit

**Nguồn đối chiếu**: tóm tắt Phase 11 (30 mục TD-01→30) trong Memory vs Global Architecture Review + REVIEW-13 (Shared).

| Kết luận Phase 11 | Trạng thái | Evidence |
|---|---|---|
| ABAC dead architecture là mục nghiêm trọng nhất | **CONFIRMED, không đổi, được nâng cấp thành finding kiến trúc hệ thống** | ARCH-06 (Global Architecture Review) — liên kết ABAC dead với hệ quả cụ thể (scoping không nhất quán 3 domain) mà Phase 11 chưa làm |
| `WorkflowInstance.steps[].role` free string | **CONFIRMED, không đổi** | Xác nhận lại nhiều lần (Phase 02/04, REVIEW-05) |
| 2 lớp nguồn permission không đồng bộ | **CONFIRMED, MỞ RỘNG cụ thể hơn** | `13_SHARED_CODE_REVIEW.md` #1 (tóm tắt Memory) — xác định rõ chính xác là `permission.descriptors.ts` (dead, chứa data SAI) vs map thật dùng bởi `seed-rbac.ts` — Phase 11 gốc có thể chỉ ghi nhận ở mức khái quát hơn |
| 7 vị trí dead code tích luỹ | **CONFIRMED, SỐ LƯỢNG THỰC TẾ CAO HƠN** | Tổng hợp từ các module review: RV00-06 (4 vị trí cross-cutting), RV05-09 (~500 dòng workflow.service.ts), RV06-05 (~280 dòng assetAssignment.service.ts), RV08-07 (~207 dòng excel.service.ts), 13_SHARED #5 (4 vị trí bổ sung) — tổng số vị trí xác nhận được qua module review CAO HƠN con số 7 mà Phase 11 liệt kê ban đầu (có thể do TD-01→30 đã tính gộp theo cách khác, chưa đối chiếu 1-1 được — ghi nhận UNKNOWN mức khớp chính xác con số) |

---

## 15. Issues Audit

**Nguồn đối chiếu**: `docs/12_ISSUES_AND_RISKS.md` (đọc mục TOP 10 + risk matrix trực tiếp trong audit này) vs kết quả 16 module review.

| ID | Kết luận gốc | Trạng thái hiện tại | Evidence |
|---|---|---|---|
| ISS-01 | Privilege escalation ADMIN — Critical Risk | **RESOLVED** | `docs/tasks/TASK-001.md`, xác nhận lại qua git (mục 2) |
| ISS-02 | Hard-delete Document không check ref — Critical Risk | **CONFIRMED, vẫn OPEN** | RV05-05, RV05-10 |
| ISS-03 | ABAC dead runtime — Critical Risk | **CONFIRMED, vẫn OPEN, có hệ quả mới được xác định (ARCH-06)** | Xem mục 10, 14 |
| ISS-04 | NoSQL operator injection — High Risk | **CONFIRMED, PHẠM VI RỘNG HƠN** | RV02-03, RV03-02/03 mở rộng sang UserAudit + Users list ngoài RBAC/Departments đã biết |
| ISS-05 | WorkflowInstance COLLSCAN — High Risk | **CONFIRMED, vẫn OPEN** | RV05-08 |
| ISS-06 | Excel N+1 transaction — High Risk | **PARTIALLY CONFIRMED (xem mục 13 — đánh đổi có chủ đích, không phải oversight)** | Tóm tắt REVIEW-08 |
| ISS-07 | Zero test coverage — Critical Risk (dài hạn) | **CONFIRMED, vẫn đúng 100%** | `00_PROJECT_MEMORY.md` xác nhận lại 2026-08-30: không có `jest`/`ts-jest` trong dependencies, không file `.test.ts` nào — tình trạng KHÔNG đổi qua toàn bộ quá trình 16 module review (không review nào thêm test) |
| ISS-08 | Pagination Documents hỏng — High Risk | **CONFIRMED, vẫn OPEN, fix đã "sẵn sàng" (DTO viết đúng) nhưng chưa "nối dây"** | RV05-03 |
| ISS-09 | Proposal thiếu authorization — Critical Risk | **CONFIRMED, vẫn OPEN, xác nhận ĐỘC LẬP 3 lần** | SEC-06, RV05-02, `15_API_CONTRACT_REVIEW.md` §6.3 |
| ISS-10 | Replica set chưa xác minh — Unclassified | **UNKNOWN, không đổi** | Không module review nào có khả năng xác minh (ngoài phạm vi source code) |

**Kết luận**: TOP 10 Issues của Phase 12 **VẪN CHÍNH XÁC 90%** — chỉ ISS-01 đã đổi trạng thái (RESOLVED), ISS-06 cần thêm 1 sắc thái (chủ đích, không phải oversight), 9/10 còn lại giữ nguyên đánh giá risk. Không có ISS nào bị chứng minh SAI (INCORRECT).

---

## 16. Risks Audit

Risk register tổng thể (51+ issue) của Phase 12 **không được audit chi tiết từng mục** ở đây (ngoài phạm vi 22-mục yêu cầu ưu tiên finding quan trọng — SKILL.md §6). TOP 10 Risks đã audit đầy đủ ở Mục 15. Risk mới phát sinh SAU Phase 12, chưa từng được risk-register hoá:

- **RV02-01** (CRITICAL) — nên được thêm vào risk register như 1 Critical Risk mới, độc lập với ISS-01.
- **RV16-01** (HIGH) — MedicalDeviceProfile/CalibrationRecord orphan vĩnh viễn — risk data-integrity mới, nghiêm trọng hơn ISS-02 về tính KHÔNG THỂ KHÔI PHỤC (ISS-02 ít nhất còn dữ liệu Document khác không bị ảnh hưởng cấu trúc; RV16-01 không có đường sửa nào qua API).
- **RV09-01→04** (4×HIGH, domain Upload) — chưa từng nằm trong risk register gốc (Phase 12 không phân tích sâu domain Upload).

---

## 17. Confirmed Findings

(Danh sách rút gọn — finding QUAN TRỌNG NHẤT đã xác minh khớp 100% giữa baseline và source hiện tại, không đổi)

- Kiến trúc monolith layered theo domain, không circular dependency (Mục 4).
- ABAC/Policy chết hoàn toàn runtime — ISS-03/SEC-07 (Mục 10, 14).
- `WorkflowInstance` không có index, COLLSCAN ở endpoint tần suất cao — ISS-05/RV05-08 (Mục 6, 15).
- `POST /documents/proposal` thiếu `authorizePermission` — ISS-09/SEC-06/RV05-02 (Mục 7, 12, 15) — xác nhận ĐỘC LẬP 3 lần qua các thời điểm khác nhau.
- Pagination `GET /documents` hỏng hoàn toàn dù DTO đã viết đúng — ISS-08/RV05-03 (Mục 7, 15).
- `RefreshToken` không có index trên `token`, không TTL — Phase 04 (Mục 6).
- Zero test coverage, không có Jest hoạt động dù có config trỏ tới — ISS-07 (Mục 15).
- Không có secret hard-code trong source, `.env` không commit — SEC-19/20 (Mục 12, đối trọng tích cực).
- ISS-01 (privilege escalation ADMIN qua `PUT /users/:id`) — **RESOLVED** (Mục 10).

---

## 18. Partially Confirmed Findings

- **Status machine Document/Workflow/Asset (Phase 08)**: đúng như mô tả NHƯNG có 1 nhánh chuyển trạng thái (CONFIRM_STATUS→Asset) không bao giờ thực thi đúng do bug RV05-01 — machine tồn tại, hành vi thực tế lệch (Mục 11).
- **PERF-07/ISS-06 (Excel N+1 transaction)**: đúng về mặt hiện tượng, nhưng Phase 10/12 mô tả như performance risk thuần, thực tế là đánh đổi kiến trúc có chủ đích, đã document trong code (Mục 13, 15).
- **TD (7 vị trí dead code)**: đúng hướng, nhưng số lượng thực tế xác nhận qua module review có vẻ cao hơn — chưa đối chiếu được 1-1 chính xác giữa 2 cách đếm (Mục 14).

---

## 19. Incorrect / Outdated Findings

### 19.1 — INCORRECT: `GET /api/performances/dashboard` "check `role.name===ADMIN` cứng trong controller"

- **Nguồn**: `docs/05_API_ANALYSIS.md` (Phase 05, ghi nhận theo tóm tắt trong `docs/module-reviews/11_PERFORMANCE_CODE_REVIEW.md`).
- **OLD**: Phase 05 ghi nhận endpoint này có check `role.name === "ADMIN"` cứng trong controller.
- **NEW**: REVIEW-11 (`RV11-01`) đọc trực tiếp source hiện tại xác nhận **KHÔNG CÓ** check này — route chỉ có `authenticate`, không có `authorizePermission` nào, permission `PERFORMANCE_VIEW` được nhắc trong comment nhưng chưa từng được định nghĩa trong `permission.constant.ts`.
- **REASON**: Theo CLAUDE.md §3 (source code > historical documentation) — source hiện tại là nguồn sự thật; không xác định được đây là do source đã bị sửa SAU thời điểm Phase 05 phân tích, hay Phase 05 ghi nhận sai ngay từ đầu (UNKNOWN, không đủ evidence git blame trong phạm vi audit này).
- **Impact**: Đã phân loại lại thành **HIGH** trong `20_GLOBAL_SECURITY_REVIEW.md` (HIGH-10) — bất kỳ user đăng nhập nào cũng xem được dashboard hiệu năng toàn hệ thống.

### 19.2 — OUTDATED: Ghi chú "chưa có `authorizePermission`" ở 3 nhóm route trong OpenAPI/comment source (không phải Phase 01-13 nhưng liên quan trực tiếp tính chính xác tài liệu dự án)

- **Nguồn**: `backend/src/docs/openAPI.yaml` (description) + comment đầu file `workflow.routes.ts`.
- **OLD**: Cả 2 nơi mô tả nhóm route `/api/workflows/*`, `/api/export/import-proposal`, `/api/export/departments/sync-from-excel` "chỉ yêu cầu `authenticate`, CHƯA có `authorizePermission`".
- **NEW**: `15_API_CONTRACT_REVIEW.md` §6.3 xác nhận code HIỆN TẠI đã có ĐẦY ĐỦ `authorizePermission` cho toàn bộ các route này từ lâu — 3 lớp tài liệu (2 nêu trên + có thể cả nhận thức người review sau) cùng lỗi thời theo 1 hướng AN TOÀN (đánh giá THẤP hơn mức bảo mật thật).
- **REASON**: Code đã được vá an toàn hơn SAU thời điểm các ghi chú này được viết, nhưng ghi chú không được cập nhật lại. Không phải lỗi bảo mật (hướng lệch an toàn) nhưng RỦI RO NGƯỢC: nếu ai đó "sửa lại cho khớp comment" sẽ tự tạo ra lỗ hổng thật.
- **Impact**: LOW (documentation hygiene), đã ghi nhận đầy đủ ở REVIEW-13/15, không cần hành động khẩn.

**Không phát hiện finding nào của Phase 01-13 bị chứng minh HOÀN TOÀN SAI (nội dung kết luận ngược lại thực tế) ngoài mục 19.1** — đại đa số finding gốc vẫn đúng, chỉ cần cập nhật phạm vi/sắc thái (xem Mục 18).

---

## 20. Unknowns

- Môi trường production thật có phải MongoDB replica set hay không (ISS-10) — bắt buộc cho `withTransaction` hoạt động đúng, ảnh hưởng 5 file service. Không thể xác minh bằng static analysis.
- Có reverse proxy nào serve tĩnh `backend/uploads/` ở production hay không — quyết định mức độ nghiêm trọng thực tế của RV00-01/RV09-01→04 (IDOR domain Upload).
- Dữ liệu Role/Permission THẬT trong MongoDB **production** (chỉ đã audit DB dev) — ảnh hưởng trực tiếp mức độ khai thác thực tế của RV02-01 (CRITICAL, mục 10) và ISS-09.
- Số lượng chính xác "vị trí dead code" theo cách đếm gốc của Phase 11 (TD, con số 7) so với tổng hợp từ module review (mục 14) — chưa đối chiếu 1-1 được trong phạm vi audit này.
- `CLIENT_URL`/`trust proxy` có luôn được set đúng ở mọi môi trường triển khai thật hay không.
- Nội dung `DANH-GIA-TONG-THE.md`, `luong-du-lieu-DMS.html`, `mongodb-transaction-setup-guide.md` — vẫn UNKNOWN xuyên suốt từ Phase 01, KHÔNG được audit trong phạm vi Phase 14 này (ngoài scope ưu tiên).

---

## 21. Important Changes Since Phase 13

1. **TASK-001 (2026-08-30)**: Fix ISS-01/SEC-05/SEC-08 — chặn gán role ADMIN qua `update()`, clear permission cache khi role đổi. **RESOLVED**, đã merge vào commit nền `5b58fb1`.
2. **TASK-002 (2026-08-30)**: Chặn `create()` tạo user ADMIN trực tiếp (đối xứng TASK-001); thêm permission `USER_ASSIGN_ROLE` + endpoint `PATCH /api/users/:id/role` (wire lại `assignRole()` — trước đây dead code). Phần OpenAPI + gán permission cho DB dev: đã hoàn thành SAU commit nền, hiện nằm trong **working-tree chưa commit** (xác nhận ở Mục 2 — khớp chính xác 127 dòng thêm, 6 file).
3. **16 module code review (REVIEW-00→16, 2026-08-30→31)**: đã tự verify lại phần lớn baseline Phase 01-13 bằng cách đọc trực tiếp source ở thời điểm gần nhất — phát hiện thêm nhiều finding MỚI không có trong baseline gốc, quan trọng nhất:
   - `RV02-01` (CRITICAL, chưa fix) — backdoor persistence qua rename Role thành "ADMIN".
   - `RV05-01` (CRITICAL, chưa fix) — mâu thuẫn business rule khiến Asset không bao giờ đồng bộ sau CONFIRM_STATUS.
   - `RV16-01` (HIGH, chưa fix) — MedicalDeviceProfile/CalibrationRecord mồ côi vĩnh viễn khi hard-delete Asset.
   - Chuỗi 4 finding HIGH domain Upload (`RV09-01→04`).
   - 3 chuỗi permission string không tồn tại trong catalog (`15_API_CONTRACT_REVIEW.md` §6.1).
4. **2 Global Review (`20_GLOBAL_SECURITY_REVIEW.md`, `21_GLOBAL_ARCHITECTURE_REVIEW.md`, 2026-08-31)**: tổng hợp toàn bộ finding trên thành 2 tài liệu dedup theo severity, có mục lục chéo theo trọng tâm nghiệp vụ/kiến trúc.
5. **1 finding INCORRECT được sửa** (Mục 19.1) — Phase 05 ghi nhận sai về authorization của performance dashboard, đã đính chính.

---

## 22. Recommended Next Actions

Theo đúng CLAUDE.md §31/§39 — các hoạt động sau là **TÙY CHỌN**, chỉ thực hiện khi có yêu cầu tường minh:

1. **Ưu tiên cao nhất nếu chuyển sang sửa code**: xử lý `RV02-01` (CRITICAL, backdoor Role rename) — cùng mức độ nghiêm trọng với ISS-01 đã fix nhưng CHƯA được đụng tới bởi TASK-001/002.
2. **Cập nhật risk register**: bổ sung `RV02-01`, `RV16-01`, chuỗi `RV09-01→04` vào `docs/12_ISSUES_AND_RISKS.md` nếu muốn risk register phản ánh đầy đủ hiện trạng (không bắt buộc, tài liệu vẫn có giá trị tham khảo qua `00_PROJECT_MEMORY.md` + 2 Global Review hiện tại).
3. **Đính chính Phase 05**: cập nhật `docs/05_API_ANALYSIS.md` cho mục 19.1 (performance dashboard authorization) nếu muốn tài liệu lịch sử hết lỗi thời — không bắt buộc vì `00_PROJECT_MEMORY.md`/module review đã ghi nhận đúng.
4. **Phase 15 (Architecture Review)**: đã CÓ SẴN dưới dạng `docs/21_GLOBAL_ARCHITECTURE_REVIEW.md` — không cần chạy lại nếu chấp nhận tài liệu này thay thế.
5. **Phase 17 (Security Hardening Plan)**: là bước tự nhiên tiếp theo sau Phase 14 + Global Security Review — tổng hợp danh sách CRITICAL/HIGH thành kế hoạch fix có thứ tự ưu tiên, CHỈ khi người dùng yêu cầu.
6. **Không tự động chạy Phase 15 hay bất kỳ phase nào khác** — chờ yêu cầu tường minh (đúng quy tắc CLAUDE.md/SKILL.md).

---

**PHASE 14 COMPLETED**

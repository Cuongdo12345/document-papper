# 08 — BUSINESS LOGIC ANALYSIS

> Phase: 08 — Business Logic Analysis
> Phạm vi: business domain, entities, actors, business rules, workflow, status machine, side-effects. Không phân tích lại kiến trúc/API/DB chi tiết (đã ở Phase 02-05), không đánh giá security theo mức độ (Phase 09).
> Nguồn: source code thực tế tại commit `f4ce8e9083e16c01177f53a3871b66cfde4133b8` (branch `main`), re-clone xác nhận khớp commit với `00_PROJECT_MEMORY.md`.
> Quy ước: **CONFIRMED** = evidence trực tiếp trong source. **INFERRED** = suy luận hợp lý, chưa đọc trực tiếp dòng code liên quan. **UNKNOWN** = chưa đủ evidence.
> **Đã review lại (self-review)**: đọc bổ sung toàn văn `submitWorkflow`, `approveStep`, phần đầu `createDocumentService` để xác minh các claim ban đầu. Kết quả: nâng cấp 1 mục từ INFERRED→CONFIRMED (UserAudit action "CREATE"), bổ sung 2 rule mới bị bỏ sót (D6b, D6c), bổ sung bối cảnh lịch sử cho RULE W2, bổ sung side-effect `submitWorkflow` (có gửi email) vào bảng Side Effects — không phát hiện claim nào sai, chỉ có thiếu sót do phạm vi đọc ban đầu chưa đủ rộng.

---

## 1. Business Domains

| Domain | Purpose | Entities chính | Actors | Operations chính | Dependencies |
|---|---|---|---|---|---|
| **Documents** | Quản lý tài liệu (đề xuất/biên bản/tham chiếu) gắn với quy trình duyệt | `Document` | Người tạo, Admin | Create, List, Detail, Update, Delete (soft), Delete-by-month (hard, bulk), Restore | Workflow, RBAC, Notifications, Assets |
| **Workflow** | Quy trình duyệt đa cấp gắn với Document | `WorkflowTemplate`, `WorkflowInstance` | Người tạo Document, Approver (theo `role` từng bước), Admin | Create template, Submit, Approve, Reject, Cancel, Complete, Pending list | Documents, RBAC (Role), Notifications, Assets (side-effect) |
| **Assets** | Quản lý vòng đời tài sản vật lý (không phải thiết bị y tế chuyên biệt) | `Asset`, `AssetCategory`, `AssetAssignmentHistory` | Người quản lý tài sản (IT/Phòng vật tư), người được cấp phát | CRUD, Assign/Transfer/Return, Check-in (kiểm kê QR), Alerts (cron), Import/Export Excel | Documents (relatedAsset), Notifications, Departments |
| **Medical Devices** | Mở rộng của Asset dành riêng cho thiết bị y tế (phân loại A/B/C/D, kiểm định) | `MedicalDeviceProfile`, `CalibrationRecord` | Nhân viên kiểm định, người quản lý thiết bị | Tạo/xem/sửa profile, ghi nhận kiểm định, cảnh báo hạn kiểm định (cron) | Assets (1-1 qua `asset`), Notifications |
| **RBAC** | Quản lý quyền truy cập (Role/Permission) + ABAC (Policy — dead runtime, xem Phase 07) | `Role`, `Permission`, `Policy` | Admin | CRUD Role/Permission/Policy, gán quyền cho Role | Users (check đang dùng trước khi xoá) |
| **Users** | Quản lý tài khoản người dùng + nhật ký thao tác | `User`, `UserAudit` | Admin, chính user | CRUD user, đổi/reset mật khẩu, restore | RBAC (role), Departments |
| **Departments** | Quản lý danh mục khoa/phòng | `Department` | Admin | CRUD | Dùng bởi Documents, Assets, Users |
| **Notifications** | Thông báo nội bộ, sinh ra như side-effect của domain khác | `Notification` | Người nhận (mọi user) | List, mark-read, delete | Không phụ thuộc domain nào (chỉ bị gọi TỪ domain khác) |
| **Auth** | Đăng ký/đăng nhập/quên-đổi mật khẩu, token | `RefreshToken`, `PasswordResetToken` | Mọi user (kể cả chưa đăng nhập) | Register/Login/Refresh/Logout/Forgot/Reset | Users, RBAC (gán role mặc định) |
| **Dashboard** | Thống kê tổng hợp, chỉ đọc | — (aggregate) | Người có quyền `DASHBOARD_READ` | Xem báo cáo | Documents, Assets, MedicalDevice, Users, Departments (đọc thẳng model — Phase 02 §7) |
| **Excel/Export** | Import/Export dữ liệu hàng loạt qua file Excel | `ImportHistory` | Người có quyền export/import tương ứng | Export Document/Asset, Import Document (dry-run/commit), sync Department | Documents, Departments, Assets |
| **Upload** | Lưu trữ file chung (khác Excel) | `Upload` | Người có quyền `UPLOAD_FILES` | Upload/list/detail/delete | Không phụ thuộc domain nghiệp vụ nào |
| **Performances** | Theo dõi hiệu năng API (không phải nghiệp vụ y tế/tài liệu) | `ApiPerformance` | Admin (check cứng trong controller) | Xem dashboard hiệu năng | — |

---

## 2. Business Rules (RULE → EVIDENCE → SOURCE → FUNCTION)

### 2.1 Documents

**RULE D0 — Mỗi thao tác Create/Update/Delete Document đều ghi `UserAudit` với action string tương ứng (`"CREATE"`/`"UPDATE"`/`"DELETE"`), CÙNG transaction với thao tác chính.**
- EVIDENCE: đọc trực tiếp `UserAudit.create([{..., action: "CREATE", note: "Tạo document"}], {session})` trong `createDocumentService` — xác nhận CONFIRMED (trước đây Phase 04 chỉ ghi INFERRED cho hàm Create).
- SOURCE: `document.service.ts:createDocumentService/updateDocumentService/deleteDocumentService`
- Trạng thái: **CONFIRMED** (nâng cấp từ INFERRED sau khi review lại toàn văn).

**RULE D1 — Document Update bị khoá theo `department` và theo `workflowStatus`.**
- EVIDENCE: không phải Admin thì (a) chỉ sửa được document cùng department, (b) không sửa được khi `workflowStatus` là `"approved"` hoặc `"completed"`.
- SOURCE: `services/documents/document.service.ts`
- FUNCTION: `updateDocumentService` (dòng 341–365)
- Trạng thái: **CONFIRMED**. (Giải quyết UNKNOWN Phase 03/04: có check department-scoping ở Update, trước đây chưa xác nhận.)

**RULE D2 — Update chỉ ghi nhận thay đổi thật, tránh audit "giả".**
- EVIDENCE: so sánh `JSON.stringify` field cũ/mới trước khi ghi `UserAudit`; nếu không có thay đổi thật, trả về document nguyên trạng, không ghi audit, không `save()`.
- SOURCE: `document.service.ts:updateDocumentService` (dòng 381–387)
- Trạng thái: **CONFIRMED**.

**RULE D3 — Update chỉ cho sửa field trong whitelist (`title`, `meta`), field khác bị 400.**
- EVIDENCE: `DOCUMENT_UPDATE_WHITELIST`, throw `badRequest` nếu có field lạ trong `updateData`.
- SOURCE: `document.service.ts:updateDocumentService`, `documents.constants.ts`
- Trạng thái: **CONFIRMED** (xác nhận lại Phase 03).

**RULE D4 — Xoá (soft-delete) Document chỉ dành cho ADMIN, kiểm tra tham chiếu ngược trước khi xoá PROPOSAL.**
- EVIDENCE: `if (role !== "ADMIN") throw forbidden`; nếu `category === "PROPOSAL"`, đếm REPORT còn tham chiếu (`countReportsByProposal`) — nếu >0, chặn xoá (400).
- SOURCE: `document.service.ts:deleteDocumentService` (dòng 416–464)
- Trạng thái: **CONFIRMED** — giải quyết dứt điểm UNKNOWN từ Phase 03/04 ("chưa xác nhận `deleteDocumentService` có gọi `countReportsByProposal` hay không"). Guard THẬT SỰ tồn tại và hoạt động.

**RULE D5 — Bulk hard-delete theo tháng không kiểm tra tham chiếu ngược (đã ghi nhận Phase 04, xác nhận lại).**
- EVIDENCE: `deleteDocumentsByMonthService` gọi `Document.deleteMany(query)` trực tiếp, không gọi `countReportsByProposal`/check `WorkflowInstance`/`Notification.resourceId`.
- SOURCE: `document.service.ts:deleteDocumentsByMonthService`
- Trạng thái: **CONFIRMED** (không đọc lại toàn bộ, kế thừa Phase 04 §12.1 — không có thay đổi).

**RULE D6 — 1 Asset không được có 2 đề xuất `PROPOSE_REPAIR` đang pending song song.**
- EVIDENCE: `findPendingRepairProposalForAsset` được gọi trong `createDocumentService` trước khi tạo document mới subType `PROPOSE_REPAIR`.
- SOURCE: `document.service.ts:createDocumentService`, `documents.query.ts`
- Trạng thái: **CONFIRMED** (xác nhận lại Phase 03).

**RULE D6b — `PROPOSE_REPAIR` bắt buộc `relatedAsset` tồn tại và đang active, VÀ Asset không được ở trạng thái `DISPOSED`/`LOST`.** *(bổ sung sau review, đọc kỹ lại toàn bộ `createDocumentService`)*
- EVIDENCE: `if (asset.status === DISPOSED || asset.status === LOST) throw badRequest(...)` — không cho tạo đề xuất sửa chữa cho tài sản đã thanh lý/mất.
- SOURCE: `document.service.ts:createDocumentService` (dòng ~92-99)
- Trạng thái: **CONFIRMED**, phát hiện MỚI (bỏ sót ở bản đầu tiên của Phase 08).

**RULE D6c — `relatedAsset` được lưu cho CẢ `PROPOSE_REPAIR` lẫn `MANUAL` (không chỉ `PROPOSE_REPAIR`) — đã sửa 1 bug âm thầm trước đó.**
- EVIDENCE: comment tường minh trong code: *"Trước đây field này bị ép `undefined` cho MỌI subType khác PROPOSE_REPAIR — nếu không sửa dòng này, client gửi `relatedAsset` kèm document MANUAL sẽ bị ÂM THẦM BỎ QUA"*.
- SOURCE: `document.service.ts:createDocumentService` (dòng ~140-150)
- Trạng thái: **CONFIRMED**, phát hiện MỚI.

**RULE D7 — REPORT–PROPOSAL là quan hệ 1-1 ở tầng ứng dụng dù schema là mảng.**
- EVIDENCE: `validateReference` throw nếu `referenceTo` có >1 phần tử; document tham chiếu phải cùng department.
- SOURCE: `documents.validator.ts:validateReference`
- Trạng thái: **CONFIRMED** (xác nhận lại Phase 03/04).

**RULE D8 — Restore Document chỉ chủ sở hữu hoặc Admin.**
- SOURCE: `documents.validator.ts:validateRestorePermission`
- Trạng thái: **CONFIRMED** (xác nhận lại Phase 03).

### 2.2 Workflow

**RULE W1 — `steps[].role` (WorkflowTemplate) phải khớp 1 Role tồn tại thật trong DB tại thời điểm tạo Template.**
- SOURCE: `workflow.service.ts:createWorkflowTemplate`
- Trạng thái: **CONFIRMED** (xác nhận lại Phase 02).

**RULE W2 — Approve/Reject chỉ được thực hiện bởi đúng role của bước hiện tại (`currentStep`), và chỉ khi `wf.status === "pending"`.**
- SOURCE: `workflow.service.ts:approveStep` (dòng 225+), `rejectStep` (dòng 329+)
- Trạng thái: **CONFIRMED**.
- **Bối cảnh lịch sử (đọc kỹ lại comment khi review)**: đây từng là 1 lỗ hổng nghiêm trọng đã được vá — comment ngay trước `approveStep` ghi rõ: *"Sửa Missing Validation #9 (nghiêm trọng nhất module Workflow): trước đây `approveStep` nhận `userId` nhưng KHÔNG dùng để kiểm tra quyền — bất kỳ user đăng nhập nào cũng approve được bất kỳ step nào, không cần đúng vai trò `step.role`"*. Tương tự, comment trước `approveStep` (dòng 234-236) cũng ghi nhận 1 lỗi khác đã sửa: workflow đã `"rejected"` từng có thể bị gọi `approveStep` tiếp để "hồi sinh" thành `"approved"` — nay đã chặn bằng check `wf.status !== "pending"`. Đây là bằng chứng cho thấy code hiện tại đã trải qua ít nhất 2 vòng sửa lỗi bảo mật/logic quan trọng, không phải thiết kế ban đầu.

**RULE W3 — `rejectStep` có guard `step` tồn tại (bổ sung so với thiết kế gốc, tự ghi trong comment là sửa lỗi "Logic Bug #6").**
- EVIDENCE: `if (!step) throw ApiError.badRequest("Invalid step")` — dòng 348.
- SOURCE: `workflow.service.ts:rejectStep`
- Trạng thái: **CONFIRMED**, phát hiện MỚI (chi tiết cụ thể hơn Phase 02, vốn chỉ trace `approveStep`).

**RULE W4 — Reject 1 bước bất kỳ → toàn bộ workflow chuyển `"rejected"` ngay (không phải chỉ bước đó).**
- SOURCE: `workflow.service.ts:rejectStep` (`wf.status = "rejected"`)
- Trạng thái: **CONFIRMED**.

**RULE W5 — Cancel workflow: CHỈ được phép khi CHƯA có bước nào tiến triển (`currentStep === 0` và bước 0 còn `"pending"`), và CHỈ người tạo Document (không phải approver/admin) được huỷ.**
- SOURCE: `workflow.service.ts:cancelWorkflow` (dòng 505–553)
- Trạng thái: **CONFIRMED**, phát hiện MỚI, chi tiết hoá đầy đủ (trước đây chỉ biết hàm tồn tại qua tên export — Phase 03 UNKNOWN).

**RULE W6 — Complete workflow: chỉ hợp lệ khi `wf.status === "approved"` (không phải pending/rejected/cancelled), và CHỈ người tạo Document được đánh dấu hoàn tất.**
- SOURCE: `workflow.service.ts:completeWorkflow` (dòng 571–614)
- Trạng thái: **CONFIRMED**, phát hiện MỚI. Ý nghĩa nghiệp vụ: `"approved"` = được phép làm; `"completed"` = việc thực tế đã xong (khác biệt tường minh, có giải thích trong comment code).

**RULE W7 — `cancelWorkflow`/`completeWorkflow` KHÔNG sinh Notification nào** (khác `approveStep`/`rejectStep`/`submitWorkflow` đều có `createNotification`/`notifyUsersByRoleName`).
- EVIDENCE: đọc toàn bộ 2 hàm — không có lời gọi `createNotification`/`notifyUsersByRoleName`/`notifyUsersByDepartment` nào.
- SOURCE: `workflow.service.ts:cancelWorkflow`, `completeWorkflow`
- Trạng thái: **CONFIRMED** — xác nhận lại phát hiện đã ghi trong `00_PROJECT_MEMORY.md` ("cancelWorkflow không tạo notification, unique"), Phase 08 xác nhận thêm `completeWorkflow` CŨNG không tạo notification (mở rộng phát hiện — trước đây chỉ ghi nhận cho `cancelWorkflow`).

**RULE W8 — Approve bước cuối cùng → đồng bộ trạng thái Asset (side-effect ngoài transaction).**
- SOURCE: `workflow.service.ts:approveStep` → `startAssetMaintenanceService`/`resolveAssetMaintenanceService`
- Trạng thái: **CONFIRMED** (xác nhận lại Phase 02).

**RULE W9 — Transaction đã được khôi phục dựa trên giả định MongoDB ĐÃ chuyển sang replica set.**
- EVIDENCE: comment tường minh trong `document.service.ts` và `workflow.service.ts`: *"✅ KHÔI PHỤC TRANSACTION (MongoDB đã chuyển sang replica set — xem `withTransaction.ts`)"*.
- SOURCE: `document.service.ts` (dòng 46), `workflow.service.ts` (dòng 23)
- Trạng thái: **CONFIRMED theo comment code** — đây là tuyên bố của đội phát triển trong chính source, không phải suy diễn của Claude. Tuy nhiên **KHÔNG có bằng chứng runtime/hạ tầng thực tế** (vd file cấu hình triển khai, connection string thật) xác nhận môi trường production hiện tại có đúng là replica set hay không — phân loại lại UNKNOWN (hạ tầng) → **giảm mức độ rủi ro** so với Phase 02-04 (trước đây hoàn toàn không có bất kỳ tín hiệu nào), nhưng chưa đủ để đóng UNKNOWN hoàn toàn.

### 2.3 Assets & Medical Devices

**RULE A1 — Asset Status Machine (bảo trì) chỉ có 2 hàm chuyển trạng thái chính thức, mọi điều kiện đều có guard rõ ràng.**
- Chi tiết đầy đủ ở mục 4 (Status Machines).
- SOURCE: `services/assets/assetDevice/assetMaintenance.service.ts`
- Trạng thái: **CONFIRMED**.

**RULE A2 — `RESERVED` và `LOST` là 2 giá trị enum KHÔNG BAO GIỜ được set bởi bất kỳ code path nào hiện có.**
- EVIDENCE: `grep` toàn bộ `services/assets/` cho `AssetStatus.RESERVED`/`AssetStatus.LOST` chỉ xuất hiện trong ĐIỀU KIỆN CHECK (`!== RESERVED`), không có dòng `asset.status = AssetStatus.RESERVED` hay `= AssetStatus.LOST` nào. Comment tự thừa nhận: *"chưa có luồng nào tự set RESERVED, nhưng service đã cho phép trước"* (`assetAssignment.service.ts` dòng 52).
- SOURCE: `assetAssignment.service.ts` (dòng 49–52, 231–232)
- Trạng thái: **CONFIRMED** — giải quyết dứt điểm UNKNOWN đã ghi trong `00_PROJECT_MEMORY.md` ("Asset RESERVED/LOST status transition path chưa xác nhận"). Kết luận: đây là code phòng thủ trước (defensive/forward-compatible), không phải bug — nhưng đúng là 2 trạng thái này hiện "chết" (không có nghiệp vụ nào tạo ra chúng qua các API đã đọc).

**RULE A3 — Assign/Transfer/Return đều ghi `AssetAssignmentHistory` (append-only) qua transaction 3 lần gọi.**
- SOURCE: `assetAssignment.service.ts` (dòng 55, 136, 216)
- Trạng thái: **CONFIRMED** (xác nhận lại Phase 04 §9.6).

**RULE A4 — Assign chỉ cho phép khi Asset đang `IN_STOCK` hoặc `RESERVED`; Transfer chỉ khi `IN_USE`; Return chỉ khi `IN_USE` hoặc `RESERVED`.**
- SOURCE: `assetAssignment.service.ts` (dòng 70–74, 150, 231–235)
- Trạng thái: **CONFIRMED**, phát hiện MỚI chi tiết hoá (Phase 04 chỉ liệt kê enum, chưa trace điều kiện chuyển trạng thái).

**RULE A5 — Xoá mềm Asset bị chặn nếu đang `IN_USE` hoặc `UNDER_MAINTENANCE`.**
- SOURCE: `asset.service.ts:deleteAssetService` (dòng 187–194)
- Trạng thái: **CONFIRMED**, phát hiện MỚI (Phase 04 chỉ suy luận "INFERRED", nay đã đọc trực tiếp).

**RULE A6 — Hard-delete Asset bắt buộc đã soft-delete trước; KHÔNG kiểm tra `Document.relatedAsset` (comment lỗi thời từ "Giai đoạn 1" vẫn còn nguyên dù field đã tồn tại từ "Giai đoạn 3").**
- SOURCE: `asset.service.ts:hardDeleteAssetService` (dòng 204–240)
- Trạng thái: **CONFIRMED** — xác nhận lại nguyên văn Phase 04 §12.2, không có thay đổi.

**RULE MD1 — Ghi nhận kiểm định (`CalibrationRecord`) không cho phép ngày `calibratedAt` cũ hơn hoặc bằng lần kiểm định gần nhất đã lưu — chặn ghi đè lùi hạn kiểm định kế tiếp.**
- SOURCE: `calibrationRecord.service.ts:createCalibrationRecordService` (dòng 104–119)
- Trạng thái: **CONFIRMED**, phát hiện MỚI.

**RULE MD2 — Không cho cung cấp đồng thời file upload VÀ `certificateFileUrl` dạng string.**
- SOURCE: `calibrationRecord.service.ts` (dòng 73–80)
- Trạng thái: **CONFIRMED**, phát hiện MỚI.

**RULE MD3 — Kiểm định "tự nguyện" (ngoài lịch bắt buộc, `requiresCalibration === false`) vẫn được phép ghi nhận — quyết định nghiệp vụ tường minh, không phải thiếu sót.**
- SOURCE: comment `calibrationRecord.service.ts` (dòng 98–102)
- Trạng thái: **CONFIRMED**.

**RULE MD4 — File chứng nhận kiểm định được multer ghi lên disk TRƯỚC khi validate nghiệp vụ chạy → có thể để lại file mồ côi nếu validate sau đó fail; code có cơ chế dọn best-effort qua try/catch + cờ `committed`.**
- SOURCE: `calibrationRecord.service.ts` (dòng 50–66)
- Trạng thái: **CONFIRMED**, phát hiện MỚI (bổ sung cho Phase 03/05 vốn chỉ ghi nhận "file lưu disk, không truy cập được qua HTTP" — nay có thêm rủi ro rác file mồ côi tầng nghiệp vụ, không phải tầng hạ tầng).

### 2.4 RBAC (không lặp lại chi tiết Phase 07, chỉ bổ sung góc nhìn Business)

**RULE R1 — Xoá Permission/Role có guard chống dangling reference tới User; xoá Role KHÔNG check `WorkflowTemplate/Instance.steps[].role` theo tên.**
- Trạng thái: **CONFIRMED**, kế thừa nguyên văn Phase 04 §8.3/12.3, không đọc lại.

**RULE R2 — Privilege escalation qua `PUT /api/users/:id`.**
- Trạng thái: **CONFIRMED**, kế thừa nguyên văn Phase 07 §9.2, không đọc lại (đã kỹ ở Phase 07, ngoài phạm vi đọc sâu thêm ở Phase 08).

---

## 3. Workflow chi tiết (START → ACTION → VALIDATION → RULE → DB → STATUS → NEXT)

### 3.1 Vòng đời đầy đủ của 1 Document + Workflow (happy path)

```
START: User đăng nhập, có quyền tạo Document
→ ACTION: POST /api/documents/proposal {category, subType, title, department, meta, referenceTo?}
→ VALIDATION: Zod shape (CreateDocumentDTO)
→ RULE: validateDocumentRule (subType khớp category) → validateReference (nếu cần referenceTo,
         cùng department, đúng 1 phần tử) → (nếu PROPOSE_REPAIR) không trùng đề xuất pending khác
→ DB: generateDocumentCode() [Counter atomic, ngoài transaction] → withTransaction:
      Document.create + UserAudit.create("CREATE" — INFERRED, chưa đọc dòng cụ thể action string)
→ STATUS: Document.workflowStatus = "pending" (default, CHƯA gắn workflow instance nào ở bước này)
→ SIDE EFFECT: notifyUsersByDepartment (ngoài transaction)
→ NEXT ACTION: (riêng biệt) POST /api/workflows/submit {documentId, templateId}

START: submitWorkflow(documentId, templateId)  *(đọc đầy đủ khi review lại)*
→ VALIDATION: `WorkflowTemplate` phải tồn tại (404 nếu không)
→ DB: withTransaction: WorkflowInstance.create (copy `steps` từ Template, set status="pending"
      từng step, currentStep=0) + Document.findByIdAndUpdate (gắn `workflowInstanceId`,
      `workflowStatus:"pending"`)
→ SIDE EFFECT: notifyUsersByRoleName(steps[0].role, {type: WORKFLOW_STEP_ASSIGNED, sendEmail:true})
              — CÓ gửi email (khác notification tạo Document — chỉ in-app, không email)
→ NEXT ACTION: approveStep / rejectStep lặp lại theo từng bước

START: approveStep (lặp lại cho từng bước)
→ VALIDATION: role người gọi khớp `steps[currentStep].role`; wf.status === "pending"
→ DB: cập nhật step, tăng currentStep HOẶC (nếu là bước cuối) wf.status="approved" +
      Document.workflowStatus="approved" [trong 1 transaction]
→ SIDE EFFECT (nếu bước cuối): syncAssetOnDocumentApproved → Asset status đổi (nếu có relatedAsset)
→ SIDE EFFECT: Notification tới người tạo (nếu xong) hoặc role bước kế tiếp
→ STATUS: Document.workflowStatus: pending → approved (khi hết bước)

START: completeWorkflow (chỉ khi đã "approved")
→ VALIDATION: chỉ người tạo Document, wf.status phải đúng "approved"
→ DB: wf.status="completed", Document.workflowStatus="completed" [transaction]
→ SIDE EFFECT: KHÔNG có (Rule W7)
→ STATUS: approved → completed (trạng thái cuối, không có next action nghiệp vụ nào tiếp theo
          được xác nhận trong source đã đọc)
```

### 3.2 Nhánh Reject

```
START: rejectStep (bất kỳ bước nào, khi wf.status === "pending")
→ VALIDATION: role người gọi khớp step hiện tại; step phải tồn tại (Rule W3)
→ DB: step.status="rejected", wf.status="rejected" NGAY (không chờ hết vòng),
      Document.workflowStatus="rejected" [transaction]
→ SIDE EFFECT: Notification tới người tạo Document (WORKFLOW_REJECTED, priority HIGH)
→ STATUS: pending → rejected (trạng thái cuối — CHƯA xác nhận có cách nào "resubmit"
          document đã bị reject hay phải tạo Document mới — UNKNOWN, xem mục 10)
```

### 3.3 Nhánh Cancel

```
START: cancelWorkflow (chỉ khi currentStep===0 và bước 0 còn "pending" — CHƯA ai duyệt)
→ VALIDATION: CHỈ người tạo Document (không phải admin/approver)
→ DB: wf.status="cancelled", Document.workflowStatus="cancelled" [transaction]
→ SIDE EFFECT: KHÔNG có Notification (Rule W7)
→ STATUS: pending → cancelled (trạng thái cuối)
```

### 3.4 Vòng đời sửa chữa Asset (PROPOSE_REPAIR → CONFIRM_STATUS)

```
START: User tạo Document subType=PROPOSE_REPAIR, relatedAsset=<assetId>
→ RULE: không được trùng đề xuất pending khác cho cùng asset (Rule D6)
→ (submit + approve toàn bộ workflow của Document này)
→ SIDE EFFECT bước cuối: startAssetMaintenanceService
   → RULE: Asset phải đang IN_USE hoặc IN_STOCK → chuyển UNDER_MAINTENANCE,
           set maintenanceStartedAt
→ NEXT ACTION: User tạo Document subType=CONFIRM_STATUS, referenceTo=<PROPOSE_REPAIR gốc>
→ (submit + approve toàn bộ workflow của Document CONFIRM_STATUS)
→ SIDE EFFECT bước cuối: resolveAssetMaintenanceService(outcome)
   → RULE: Asset phải đang UNDER_MAINTENANCE
   → outcome=REPAIRED      → Asset.status = IN_USE, xoá maintenanceStartedAt
   → outcome=UNREPAIRABLE  → Asset.status = DISPOSED, xoá maintenanceStartedAt
→ STATUS: UNDER_MAINTENANCE → (IN_USE | DISPOSED)
```

---

## 4. Status Machines

### 4.1 `Document.workflowStatus`

```
pending ──(approveStep, đủ toàn bộ bước)──> approved ──(completeWorkflow)──> completed
pending ──(rejectStep, bất kỳ bước nào)───> rejected
pending ──(cancelWorkflow, CHỈ khi chưa ai duyệt)──> cancelled
```

| Transition | Ai được phép | Điều kiện | Side effect |
|---|---|---|---|
| pending → approved | Approver đúng role bước cuối | `wf.status==="pending"`, đúng role từng bước | Notification, sync Asset (nếu có) |
| pending → rejected | Approver đúng role bước hiện tại | `wf.status==="pending"`, step tồn tại | Notification (HIGH priority) |
| pending → cancelled | CHỈ người tạo Document | `currentStep===0` và bước 0 `"pending"` | KHÔNG có |
| approved → completed | CHỈ người tạo Document | `wf.status==="approved"` | KHÔNG có |

**Không xác nhận được (UNKNOWN)**: có transition nào đưa `rejected`/`cancelled` quay lại `pending` (resubmit) hay không — không thấy hàm nào trong `workflow.service.ts` (9 hàm export đã đọc đủ) làm việc này. **INFERRED**: quy trình có khả năng là "tạo Document mới" thay vì resubmit workflow cũ khi bị reject/cancel — nhưng đây là suy luận, KHÔNG có evidence trực tiếp xác nhận đây là chủ đích thiết kế.

### 4.2 `Asset.status`

```
IN_STOCK ──(assignAssetService)──> IN_USE ──(transferAssetService, khác user/dept)──> IN_USE
IN_STOCK/RESERVED ──(assign)──> IN_USE
IN_USE/RESERVED ──(returnAssetService)──> IN_STOCK
IN_USE/IN_STOCK ──(startAssetMaintenanceService, qua workflow PROPOSE_REPAIR)──> UNDER_MAINTENANCE
UNDER_MAINTENANCE ──(resolveAssetMaintenanceService, outcome=REPAIRED)──> IN_USE
UNDER_MAINTENANCE ──(resolveAssetMaintenanceService, outcome=UNREPAIRABLE)──> DISPOSED
(bất kỳ trạng thái nào, trừ IN_USE/UNDER_MAINTENANCE) ──(deleteAssetService, soft-delete)──> [isActive=false]
```

- `RESERVED`, `LOST`: **tồn tại trong enum, được CHECK trong điều kiện, nhưng KHÔNG có code path nào SET các giá trị này** (Rule A2 — CONFIRMED). Đây là 2 trạng thái "chết" theo nghĩa: hệ thống hiện tại không có nghiệp vụ nào tạo ra chúng qua các service đã đọc.
- `DISPOSED`: trạng thái cuối theo code đã đọc — không thấy hàm nào chuyển NGƯỢC từ `DISPOSED` sang trạng thái khác (INFERRED — hợp lý về nghiệp vụ: tài sản đã thanh lý không dùng lại).

### 4.3 `MedicalDeviceProfile` / `CalibrationRecord` — không phải status machine rời rạc

Không có field `status` enum riêng cho profile — chỉ có `lastCalibrationDate`/`nextCalibrationDueDate` được cập nhật MỖI LẦN tạo `CalibrationRecord` mới (ngày càng tăng, do Rule MD1 chặn ghi lùi). Không phải state machine theo nghĩa transitions rời rạc, mà là "chuỗi timestamp tăng dần".

---

## 5. Business Actors

| Actor | Xác định qua | Permission/Check | Action đặc trưng | Resource |
|---|---|---|---|---|
| **ADMIN** | `role.name === "ADMIN"` (string match) | Bypass toàn bộ `authorizePermission` | Mọi action, + xoá Document (Rule D4 yêu cầu CHÍNH XÁC role này) | Mọi resource |
| **Người tạo Document** (owner) | `document.createdBy === userId` | Không cần permission RBAC riêng cho 1 số action | Restore Document (Rule D8), Cancel Workflow (Rule W5), Complete Workflow (Rule W6) | Chỉ resource do chính mình tạo |
| **Approver** (theo role của bước workflow) | `req.user.role.name === step.role` (string match tên Role) | `WORKFLOW_APPROVE`/`WORKFLOW_REJECT` (RBAC coarse-grained) + đúng role của bước hiện tại (check thêm ở Service) | Approve/Reject đúng bước đang chờ | 1 `WorkflowInstance` cụ thể |
| **User thường (đã đăng nhập)** | JWT hợp lệ, không có permission đặc biệt | Chỉ cần `authenticate` | Tạo Document proposal (Rule confirmed Phase 03/05/07 — KHÔNG cần permission), xem/sửa Notification của mình | Notification của chính mình (`recipient`) |
| **Người quản lý tài sản** (role có `ASSET_*` permission) | RBAC coarse-grained | Theo permission cụ thể (`ASSET_CREATE`, `ASSET_ASSIGN`...) | CRUD Asset, Assign/Transfer/Return | Asset (không có ownership/department-scoping riêng ở tầng Service — UNKNOWN nếu có check department nào khác, ngoài phạm vi đọc sâu Phase 08) |
| **Nhân viên kiểm định** (role có `MEDICAL_DEVICE_CALIBRATE`) | RBAC coarse-grained | Permission-based | Ghi nhận `CalibrationRecord` | 1 `MedicalDeviceProfile` cụ thể |

**Lưu ý (CONFIRMED, kế thừa Phase 07)**: RBAC Matrix thiết kế "trên giấy" (`ROLE_PERMISSIONS`) liệt kê 6 role nghiệp vụ cụ thể (`IT`, `USER`, `TRUONG_KHOA`, `DIEU_DUONG_TRUONG`, `BAN_GIAM_DOC`, `PHONG_VAT_TU_TTB`) nhưng KHÔNG có cơ chế đảm bảo đây là dữ liệu Role/Permission thật trong DB — bảng actor ở trên chỉ mô tả actor Ở MỨC CODE (dựa vào permission constant + check role.name), không khẳng định role nào trong DB thật đang giữ actor nào.

---

## 6. Business Data Flow (bổ sung, không lặp Phase 02 §9)

```
User action: Ghi nhận kiểm định thiết bị y tế
→ API: POST /api/assets/medical-devices/:assetId/calibration-records (multipart)
→ Middleware: authenticate → authorizePermission("MEDICAL_DEVICE_CALIBRATE")
             → certificateUploader.single("certificateFile") [ghi file lên disk NGAY, trước service]
→ Service: createCalibrationRecordService
  → Validation: assetId hợp lệ, không gửi cả file+URL cùng lúc, Asset.isActive,
                MedicalDeviceProfile tồn tại, calibratedAt mới hơn lần trước (Rule MD1)
  → Business rule: cho phép kiểm định tự nguyện (Rule MD3)
  → Database: withTransaction: CalibrationRecord.create + MedicalDeviceProfile.update
              (lastCalibrationDate, nextCalibrationDueDate)
  → Side effect: nếu lỗi SAU khi nhận file nhưng TRƯỚC/SAU transaction, dọn file mồ côi
                 best-effort (Rule MD4)
→ Response: {success, data: record}
```

---

## 7. Side Effects (tổng hợp toàn hệ thống, theo domain)

| Nguồn | Side effect | Đồng bộ/Bất đồng bộ | Trong/ngoài transaction |
|---|---|---|---|
| `createDocumentService` | `notifyUsersByDepartment` (DOCUMENT_SUBMITTED, chỉ in-app, KHÔNG gửi email — chủ đích tránh spam email toàn phòng ban) | Đồng bộ (await) | Ngoài |
| `submitWorkflow` | `notifyUsersByRoleName` (WORKFLOW_STEP_ASSIGNED, **CÓ gửi email**, `sendEmail:true`) tới role của bước đầu tiên | Đồng bộ | Ngoài |
| `approveStep` | `syncAssetOnDocumentApproved` (đổi Asset status) | Đồng bộ, bọc try/catch riêng (không rollback Document nếu lỗi — Phase 02 §7) | Ngoài |
| `approveStep` | Notification (người tạo hoặc role bước kế) | Đồng bộ | Ngoài |
| `rejectStep` | Notification (WORKFLOW_REJECTED, HIGH priority) | Đồng bộ | Ngoài |
| `cancelWorkflow`, `completeWorkflow` | **KHÔNG có** (Rule W7) | — | — |
| `UserAudit.create` (Create/Update/Delete Document) | Ghi nhật ký thao tác | Đồng bộ | **Trong** transaction (khác Notification) |
| `assetAlerts.cron` (08:00 hàng ngày) | Check bảo hành sắp hết hạn + bảo trì quá hạn → Notification | Bất đồng bộ (cron riêng) | Ngoài |
| `medicalDeviceAlerts.cron` (08:05 hàng ngày) | Check hạn kiểm định → Notification | Bất đồng bộ (cron riêng, chạy sau assetAlerts 5 phút, chủ đích tránh trùng giờ) | Ngoài |
| `forgotPassword`/`resetPassword` | Gửi email (Nodemailer) | Đồng bộ nhưng lỗi bị nuốt (Phase 03) | Ngoài |
| `calibrationRecord.service` | Ghi file lên disk (trước service chạy, qua Multer) + dọn best-effort nếu lỗi | Đồng bộ | Ngoài (không phải DB transaction, là filesystem side-effect) |
| `excel.service` (import) | Ghi `ImportHistory` + tạo hàng loạt `Document` | Đồng bộ | Trong 1 transaction bao ngoài (Phase 04 §9.6) |
| `performanceMiddleware` | Ghi `ApiPerformance` (buffer RAM, flush 10s/50 bản ghi) | Bất đồng bộ (buffer) | Ngoài |

**Không có** external API call, SMS, payment nào (xác nhận lại Phase 02 §8).

---

## 8. Business Logic Location

| Vị trí | Mức độ tập trung logic | Ghi chú |
|---|---|---|
| **Service layer** | CHIẾM ĐA SỐ tuyệt đối | Toàn bộ rule quan trọng (status transition, ownership, department-scoping, guard chống trùng lặp) nằm ở `*.service.ts` — khớp pattern kiến trúc đã ghi nhận Phase 02/03. |
| **Validator riêng** (`documents.validator.ts`) | Một phần | Tách rule "phụ thuộc DB" (reference, department) khỏi shape validation — chỉ domain `documents` có tách riêng này. |
| **Model (Mongoose)** | RẤT ÍT | Không có `pre`/`post` hook nào (Phase 04 §5) — mọi logic phụ trợ nằm ở Service, model chỉ định nghĩa shape/enum. |
| **Controller** | HẦU NHƯ KHÔNG CÓ (đúng thiết kế) | Controller mỏng, chỉ gọi service — đúng pattern đã ghi nhận Phase 02/03, ngoại trừ 2 chỗ check `role.name==="ADMIN"` cứng trong controller (`performances`, `excel export` — đã ghi Phase 05 §7, không phải business rule mới). |
| **Middleware** | Cross-cutting, KHÔNG chứa business rule cụ thể | `authorizePermission` chỉ check permission chung, KHÔNG biết ownership/department (rule đó nằm ở Service — vd Rule D1). |
| **Frontend** | N/A | Không tồn tại (Phase 06). |

**Đánh giá phân tán (CONFIRMED, không suy diễn thêm)**: business logic **tập trung tốt** ở tầng Service — không phát hiện rule quan trọng nào bị lặp lại rải rác ở nhiều tầng khác nhau cho CÙNG 1 domain (khác với vấn đề đã ghi nhận ở Phase 03/04 là "trùng lặp validate enum ở 2-3 tầng", nhưng đó là phòng thủ nhiều lớp có chủ đích, không phải phân tán logic thiếu kiểm soát). Điểm ngoại lệ đáng chú ý duy nhất: 2 nơi check `role.name==="ADMIN"` cứng trong Controller thay vì Service/Middleware (đã biết từ Phase 05, không phải phát hiện mới).

---

## 9. Business Inconsistencies (mới phát hiện ở Phase 08, không lặp Phase 02-07)

| # | Vấn đề | Evidence | Mức độ |
|---|---|---|---|
| 1 | `completeWorkflow` không sinh Notification, khác toàn bộ transition khác (submit/approve/reject) — người tạo Document phải tự biết để bấm "complete", không có nhắc nhở nào | `workflow.service.ts:completeWorkflow`, không có `createNotification` | MỞ RỘNG Rule W7 đã biết cho `cancelWorkflow` — Phase 08 xác nhận thêm áp dụng cho `completeWorkflow` |
| 2 | `RESERVED`/`LOST` là 2 trạng thái Asset không có đường vào (dead status) — Enum tồn tại, validate check tồn tại, nhưng không nghiệp vụ nào set được qua các service hiện có | `assetAssignment.service.ts` | MỚI, mức THẤP (không phải lỗi, nhưng là tính năng chưa hoàn thiện đã tự thừa nhận trong comment) |
| 3 | Không có cách "resubmit" 1 workflow đã `rejected`/`cancelled` — phải tạo Document hoàn toàn mới (UNKNOWN liệu đây có phải chủ đích) | Không tìm thấy hàm nào trong `workflow.service.ts` xử lý việc này | MỚI, cần xác minh thêm (UNKNOWN) |
| 4 | File chứng nhận kiểm định ghi lên disk TRƯỚC khi mọi validate nghiệp vụ chạy — rủi ro rác file mồ côi nếu request lỗi nhiều lần (đã có cơ chế dọn best-effort nhưng không đảm bảo 100%, vd process crash giữa chừng) | `calibrationRecord.service.ts` dòng 50-66 | MỚI, mức THẤP–TRUNG BÌNH (rác đĩa, không phải mất dữ liệu) |
| 5 | Comment về transaction ("MongoDB đã chuyển sang replica set") là tuyên bố một phía trong code, không có evidence hạ tầng độc lập xác nhận | `document.service.ts`, `workflow.service.ts` | Ghi nhận để KHÔNG tự động tin tưởng tuyệt đối — vẫn giữ nguyên mức thận trọng như Phase 02-04 dù có tín hiệu tích cực hơn |

---

## 10. Unknowns (chuyển sang phase sau)

- Có cơ chế "resubmit" cho Document sau khi Workflow bị `rejected`/`cancelled` hay không, hay bắt buộc tạo Document mới — chưa tìm thấy code nào xử lý, cần xác nhận thêm nếu có yêu cầu cụ thể.
- Môi trường production thực tế có đúng là MongoDB replica set hay không — comment code khẳng định có, nhưng không có bằng chứng hạ tầng độc lập (deployment config, connection string thật) để xác nhận 100% — carry-over từ Phase 02/04, giảm mức độ nhưng chưa đóng.
- Rà soát department-scoping cho toàn bộ endpoint Asset/Medical Device theo `:id` (chỉ xác nhận rule status-transition, chưa xác nhận có check department nào khác ngoài các rule đã liệt kê) — carry-over Phase 07 §9.7.
- Nội dung `excel.service.ts` (import Document hàng loạt) — chỉ xác nhận có transaction bao ngoài (Phase 04 §9.6), chưa đọc chi tiết rule nghiệp vụ khi import (dry-run vs commit khác nhau thế nào).
- Nội dung 2 file tài liệu có sẵn `DANH-GIA-TONG-THE.md`, `luong-du-lieu-DMS.html` — vẫn UNKNOWN xuyên suốt từ Phase 01, có thể chứa mô tả nghiệp vụ bổ sung nhưng chưa đọc.

---

**PHASE 08 COMPLETED**

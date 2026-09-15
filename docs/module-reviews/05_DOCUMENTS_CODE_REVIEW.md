# 05 — DOCUMENTS / CORE BUSINESS — CODE REVIEW

> REVIEW-05. Chỉ review, KHÔNG sửa source. Phạm vi: domain `documents` (Document CRUD + Workflow duyệt đa cấp) — route → middleware → controller → DTO/validation → service → query → model.
>
> Nguồn đọc trực tiếp (source hiện tại, commit `5b58fb1`+ working tree):
> `backend/src/routes/documents/{document.route.ts,workflow.routes.ts}`,
> `backend/src/controllers/documents/{document.controller.ts,workflow.controller.ts}`,
> `backend/src/dto/documents/{documents.dto.ts,workflow.dto.ts}`,
> `backend/src/services/documents/{document.service.ts,workflow.service.ts,documents.validator.ts,documents.mapper.ts,documents.query.ts,documents.constants.ts,documents.types.ts}`,
> `backend/src/models/documents/{document.model.ts,workflowInstance.model.ts,workflowTemplate.model.ts,counter.model.ts}`,
> `backend/src/shared/constants/documentRules.ts`, `backend/src/shared/utils/{generateDocumentCode.ts,getNext.ts,withTransaction.ts}`,
> `backend/src/middlewares/authorizePermission.middleware.ts`, `backend/src/services/notifications/notification.service.ts` (chỉ phần liên quan side-effect).
>
> Baseline đã đọc trước khi verify source: `docs/00_PROJECT_MEMORY.md`, `docs/03_BACKEND_ANALYSIS.md` §5–6, `docs/04_DATABASE_ANALYSIS.md` §4.9–4.11/§9.2–9.3/§12, `docs/05_API_ANALYSIS.md`, `docs/07_AUTH_RBAC_ANALYSIS.md`, `docs/08_BUSINESS_LOGIC.md` §2.1/§3/§4, `docs/12_ISSUES_AND_RISKS.md` (ISS-02/06/08/09/18/20/26/37).
>
> **Quan trọng**: so với baseline Phase 03/04/08 (đọc ở thời điểm trước), `document.service.ts` đã được refactor đáng kể (1113 → 591 dòng, nhiều hardening: whitelist filter, escape regex, ownership theo department, transaction, audit đầy đủ kể cả Restore). `workflow.service.ts` vẫn 1120 dòng nhưng **~500 dòng cuối (614→1120) là code cũ bị comment nguyên khối, không còn chạy** — xem RV05-09. Toàn bộ finding dưới đây được xác minh lại trên source HIỆN TẠI, không giả định baseline vẫn đúng.

---

## A. TÓM TẮT

| # | ID | Severity | Category | Trạng thái |
|---|----|----------|----------|------------|
| 1 | RV05-01 | **CRITICAL** | Business Logic | CONFIRMED |
| 2 | RV05-02 | HIGH | Authorization | CONFIRMED (=ISS-09, vẫn mở) |
| 3 | RV05-03 | HIGH | API / Validation | CONFIRMED (=ISS-08, vẫn mở dù DTO đã sẵn sàng) |
| 4 | RV05-04 | HIGH | Authorization / Data integrity | CONFIRMED |
| 5 | RV05-05 | HIGH | Data integrity | CONFIRMED (=ISS-02, vẫn mở) |
| 6 | RV05-06 | MEDIUM | Data integrity / Workflow | CONFIRMED |
| 7 | RV05-07 | MEDIUM | Race condition | POTENTIAL RISK |
| 8 | RV05-08 | MEDIUM | Performance | CONFIRMED (= PERF-03/Phase04 §9.3, vẫn mở) |
| 9 | RV05-09 | LOW-MEDIUM | Maintainability | CONFIRMED |
| 10 | RV05-10 | LOW | API / Validation | CONFIRMED (=ISS-26, vẫn mở) |
| 11 | RV05-11 | INFO (positive) | — | CONFIRMED |

0 finding CRITICAL mới ngoài RV05-01 — đây là finding **CRITICAL mới nhất từ đầu chuỗi REVIEW-00→05** (không phải RBAC/privilege escalation như RV02-01, mà là **business logic tự mâu thuẫn khiến 1 nhánh nghiệp vụ chính không bao giờ chạy đúng**).

---

## B. FINDINGS CHI TIẾT

### RV05-01 — `CONFIRM_STATUS` không bao giờ đồng bộ được Asset do mâu thuẫn `referenceSubType` (CRITICAL, CONFIRMED)

- **File 1 (rule tạo document)**: `backend/src/shared/constants/documentRules.ts`
- **Function/Class**: `DOCUMENT_RULES.CONFIRM_STATUS`
- **File 2 (dùng reference lúc duyệt xong)**: `backend/src/services/documents/workflow.service.ts`
- **Function/Class**: `syncAssetOnDocumentApproved()`

**Observed behavior**:
`DOCUMENT_RULES.CONFIRM_STATUS.referenceSubType = DocumentSubType.PROPOSE_INK` (`documentRules.ts:22-26`) — nghĩa là khi tạo document `CONFIRM_STATUS`, `documents.validator.ts:validateReference()` **chỉ chấp nhận** `referenceTo` trỏ tới 1 document có `subType === "PROPOSE_INK"`; nếu client gửi `referenceTo` trỏ tới `PROPOSE_REPAIR` (đúng theo flow nghiệp vụ mô tả ở `08_BUSINESS_LOGIC.md` §3.1 — "PROPOSE_REPAIR → duyệt xong → CONFIRM_STATUS referenceTo=<PROPOSE_REPAIR gốc>"), request bị từ chối 400 ("Sai loại reference").

Ngược lại, khi workflow của `CONFIRM_STATUS` được duyệt xong toàn bộ, `approveStep()` gọi `syncAssetOnDocumentApproved(document, actorUserId)`, và nhánh `CONFIRM_STATUS` (`workflow.service.ts:120-144`) tìm document gốc bằng:

```ts
const proposalDoc = await Document.findOne({
  _id: proposalId,
  subType: DocumentSubType.PROPOSE_REPAIR,   // ← hard-code PROPOSE_REPAIR
});
if (!proposalDoc?.relatedAsset) return;
```

Vì `referenceTo` của bất kỳ `CONFIRM_STATUS` nào tạo hợp lệ (qua validator ở trên) **chỉ có thể** trỏ tới `PROPOSE_INK` (không phải `PROPOSE_REPAIR`), điều kiện `subType: DocumentSubType.PROPOSE_REPAIR` ở query này **không bao giờ khớp** → `proposalDoc` luôn `null` → `!proposalDoc?.relatedAsset` luôn đúng → hàm `return` sớm, `resolveAssetMaintenanceService(...)` **không bao giờ được gọi**.

**Evidence**:
- `backend/src/shared/constants/documentRules.ts:22-26`
- `backend/src/services/documents/workflow.service.ts:120-144`
- Đối chiếu business flow mong đợi: `docs/08_BUSINESS_LOGIC.md` dòng 252-259 ("subType=PROPOSE_REPAIR ... → subType=CONFIRM_STATUS, referenceTo=<PROPOSE_REPAIR gốc>").

**Impact**: Toàn bộ luồng nghiệp vụ "xác nhận tình trạng sau sửa chữa" (`CONFIRM_STATUS`) — vốn là bước ĐÓNG VÒNG ĐỜI sửa chữa Asset (đưa asset từ `UNDER_MAINTENANCE` quay lại `IN_USE` hoặc chuyển `DISPOSED`) — **im lặng không có tác dụng gì trên Asset**, dù workflow vẫn báo "approved" bình thường (không có lỗi nào lộ ra, vì `syncAssetOnDocumentApproved` chủ đích bọc try/catch và `return` sớm không log). Hệ quả thực tế: mọi Asset từng vào `UNDER_MAINTENANCE` qua `PROPOSE_REPAIR` sẽ **kẹt vĩnh viễn ở `UNDER_MAINTENANCE`** trừ khi có ai sửa tay trực tiếp trong DB — sai lệch dashboard/KPI theo trạng thái Asset, và về mặt vận hành thực tế nhân viên không biết vì UI vẫn báo "duyệt thành công".
Ngoài ra, vì `referenceSubType` bị set sai, **không có cách hợp lệ nào để tạo `CONFIRM_STATUS` tham chiếu `PROPOSE_REPAIR`** — kể cả khi cố tình muốn tuân theo đúng flow ở `08_BUSINESS_LOGIC.md`, request sẽ bị validator chặn ngay từ bước tạo.

**Recommendation**: Xác nhận lại chủ đích nghiệp vụ thật (không tự suy đoán) — nếu đúng như flow đã mô tả ở `08_BUSINESS_LOGIC.md` (CONFIRM_STATUS tham chiếu PROPOSE_REPAIR), sửa `DOCUMENT_RULES.CONFIRM_STATUS.referenceSubType` thành `DocumentSubType.PROPOSE_REPAIR` (đồng bộ với query cứng ở `syncAssetOnDocumentApproved`). Đây là thay đổi 1 dòng nhưng ảnh hưởng dữ liệu Asset đang chạy — cần rà soát xem đã có `CONFIRM_STATUS` nào được tạo (chắc chắn tham chiếu nhầm `PROPOSE_INK` hoặc bị chặn hoàn toàn) trước khi sửa.

**Confidence**: HIGH (2 đoạn code trực tiếp mâu thuẫn nhau, đọc nguyên văn, không suy diễn).

---

### RV05-02 — `POST /api/documents/proposal` vẫn thiếu authorization check (HIGH, CONFIRMED — kế thừa ISS-09)

- **File**: `backend/src/routes/documents/document.route.ts:29-35`
- **Function/Class**: route `POST /proposal`

**Observed behavior**: Dòng `authorizePermission("DOCUMENT_CREATE")` vẫn bị comment out trong source hiện tại. Route chỉ có `authenticate` → bất kỳ user đã đăng nhập nào (bất kể role) đều tạo được Document proposal.

**Evidence**:
```ts
router.post(
  "/proposal",
  authenticate,
  // authorizePermission("DOCUMENT_CREATE"),
  validateBody(CreateDocumentDTO),
  createDocuments,
);
```
Đối chiếu các route khác trong CÙNG file (`GET /`, `GET /:id`, `PUT /:id`, `DELETE /:id`, `PATCH /restore/:id`) đều có `authorizePermission` đầy đủ — xác nhận đây KHÔNG phải pattern chung của domain, chỉ riêng route này bị thiếu.

**Impact**: Vi phạm least-privilege — vẫn đúng y nguyên như ISS-09 (`docs/12_ISSUES_AND_RISKS.md` dòng 170-180) dù các route khác trong cùng file đã được hardening đáng kể (validateBody/validateParams đã gắn đầy đủ ở lượt sửa gần đây — xem comment `[P1-4/P1.10]`). Đây là 1 trong 2 việc "immediate action" độ ưu tiên cao nhất của Phase 12 (#3 trong TOP 10) **vẫn CHƯA được thực hiện**.

**Recommendation**: Bỏ comment `authorizePermission("DOCUMENT_CREATE")` — thay đổi 1 dòng, rủi ro thấp (đã có sẵn permission constant, chỉ cần đảm bảo role hợp lệ đã được gán permission này trong DB).

**Confidence**: HIGH.

---

### RV05-03 — Pagination `GET /api/documents` vẫn hỏng dù DTO đã viết đúng hoàn chỉnh (HIGH, CONFIRMED — kế thừa ISS-08)

- **File 1**: `backend/src/routes/documents/document.route.ts:39-45`
- **File 2**: `backend/src/services/documents/document.service.ts:207-297` (`getAllDocumentsService`)
- **File 3**: `backend/src/dto/documents/documents.dto.ts:73-117` (`QueryDocumentDTO`)

**Observed behavior**: `validateQuery(QueryDocumentDTO)` vẫn bị comment out ở route `GET /`:
```ts
router.get(
  "/",
  authenticate,
  authorizePermission("DOCUMENT_VIEW"),
  // validateQuery(QueryDocumentDTO),
  getAllDocuments,
);
```
Trong khi đó, `QueryDocumentDTO` (đọc toàn văn) **đã được viết lại đúng và đầy đủ** — `page`/`limit` dùng `z.coerce.number()` để tự ép kiểu string→number từ query string, đúng chính xác thứ mà `getAllDocumentsService` cần (`Number.isInteger(page) && page > 0 ? page : 1`). Comment trong chính file DTO còn ghi rõ: *"trước đây DTO cũ chặn mọi request list không kèm filter"* (đã sửa) — nhưng không có comment nào ghi nhận việc `validateQuery` chưa được gắn lại vào route.

Vì middleware validate không chạy, `req.query.page`/`req.query.limit` tới `getAllDocumentsService` vẫn là **kiểu `string`** (Express query string mặc định), không phải `number`. `Number.isInteger("2")` → `false` → luôn rơi vào nhánh mặc định `pageNum = 1`, `limitNum = 10`.

**Evidence**: đọc trực tiếp `document.route.ts:39-45` (dòng bị comment) + `document.service.ts:276-278` (`Number.isInteger(page)`) + `documents.dto.ts:74-75` (`z.coerce.number()` — chứng minh DTO đã có giải pháp đúng nhưng không được thi hành).

**Impact**: Y hệt ISS-08 đã ghi nhận ở Phase 12 — client gửi `?page=2&limit=20` **vẫn luôn nhận về trang 1/10 bản ghi**, bất kể dataset lớn tới đâu. Đây KHÔNG phải finding mới về bản chất, nhưng quan trọng để xác nhận: **fix đã được chuẩn bị sẵn (DTO hoàn chỉnh) nhưng chưa được "nối dây"** — chỉ còn thiếu 1 dòng bỏ comment, khác với nhiều finding khác vẫn cần code mới.

**Recommendation**: Bỏ comment `validateQuery(QueryDocumentDTO)`. Trước khi bật, xác nhận không có consumer nào hiện đang phụ thuộc (vô tình) vào hành vi "luôn trang 1" hiện tại.

**Confidence**: HIGH.

---

### RV05-04 — Không có department-scoping khi ĐỌC Document (list & detail), dù có khi SỬA (HIGH, CONFIRMED — finding MỚI)

- **File 1**: `backend/src/services/documents/document.service.ts:207-297` (`getAllDocumentsService`)
- **File 2**: `backend/src/services/documents/document.service.ts:302-318` (`getDocumentDetailService`)
- **File 3 (đối chứng)**: `backend/src/services/documents/document.service.ts:323-411` (`updateDocumentService`)

**Observed behavior**: `updateDocumentService` **CÓ** kiểm tra ownership theo phòng ban:
```ts
if (!isAdmin && callerDepartment && document.department.toString() !== callerDepartment.toString()) {
  throw ApiError.forbidden("Không có quyền sửa document của phòng ban khác");
}
```
Nhưng `getAllDocumentsService` và `getDocumentDetailService` **không có bất kỳ ràng buộc tương đương nào**. `getDocumentDetailService(id)` chỉ nhận `id`, gọi `validateObjectId` rồi `findActiveDocument(id)` — không nhận `callerDepartment`/`isAdmin` từ controller, không so sánh gì với người gọi. `getAllDocumentsService(query)` chỉ filter theo `department` NẾU client tự nguyện truyền query param đó (`buildDocumentFilter` chỉ áp field khi `input[field] !== undefined`) — không có logic nào tự động giới hạn kết quả về đúng phòng ban của người gọi khi họ không phải Admin.

**Evidence**: đối chiếu trực tiếp `document.controller.ts` — `getDocumentById`/`getAllDocuments` handler chỉ gọi service với `req.params.id`/`req.query`, **không truyền** `req.user!.department` (khác hẳn `updateDocuments` handler có truyền `callerDepartment: req.user!.department`).

**Impact**: Bất kỳ user nào có permission `DOCUMENT_VIEW`/`DOCUMENT_DETAIL` (permission cấp hệ thống, không phân biệt phòng ban theo RBAC hiện tại — xem `docs/07_AUTH_RBAC_ANALYSIS.md`) có thể:
1. Liệt kê TOÀN BỘ document của MỌI phòng ban qua `GET /api/documents` (không lọc mặc định theo phòng ban của mình).
2. Xem chi tiết BẤT KỲ document nào của phòng ban khác qua `GET /api/documents/:id` chỉ cần biết/đoán ID.

Đây là rò rỉ dữ liệu liên phòng ban (đề xuất mua sắm, biên bản hư hỏng, chi phí thực tế `actualCost`...) — nếu thiết kế nghiệp vụ chủ đích là "mỗi phòng ban chỉ xem tài liệu của mình" (ngụ ý bởi chính ràng buộc đã áp ở Update), thì Read đang là khe hở lớn nhất của cả module vì đây là 2 endpoint dùng thường xuyên nhất.

**Chưa xác nhận (UNKNOWN)**: đây có phải chủ đích thiết kế hay không (VD: có thể hệ thống chủ đích cho phép "xem toàn hệ thống, chỉ chặn sửa theo phòng ban" — 1 mô hình hợp lý về mặt nghiệp vụ đối với hồ sơ nội bộ minh bạch). Cần xác nhận với chủ dự án trước khi coi đây là bug cần vá.

**Recommendation**: Nếu chủ đích là "chỉ xem tài liệu phòng ban mình" (giống Update), bổ sung filter mặc định theo `callerDepartment` khi user không phải Admin cho cả List và Detail, đồng bộ với ràng buộc đã có ở Update. Nếu chủ đích là "xem toàn hệ thống", nên ghi chú rõ trong code/docs để tránh hiểu nhầm là thiếu sót khi review sau này.

**Confidence**: HIGH (evidence code), nhưng **INFERRED** về việc đây có phải "bug" theo ý định nghiệp vụ ban đầu hay không.

---

### RV05-05 — Hard-delete Document theo tháng vẫn không kiểm tra tham chiếu ngược (HIGH, CONFIRMED — kế thừa ISS-02, không đổi)

- **File**: `backend/src/services/documents/document.service.ts:469-492` (`deleteDocumentsByMonthService`)
- **File phụ**: `backend/src/services/documents/documents.query.ts:73-75` (`deleteDocumentsByFilter`)

**Observed behavior**: Hàm gọi thẳng `Document.deleteMany(query)` — hard delete thật, không soft-delete, không kiểm tra `WorkflowInstance.documentId`, `Document.referenceTo[]` (của document KHÁC ngoài phạm vi tháng bị xoá), hay `Notification.resourceId` đang trỏ tới các document sắp xoá.

**Evidence**:
```ts
export const deleteDocumentsByMonthService = async (month, year, filters = {}) => {
  const query = { createdAt: { $gte: start, $lte: end }, ...buildDocumentFilter(filters) };
  const result = await deleteDocumentsByFilter(query); // Document.deleteMany(query)
  return { deletedCount: result.deletedCount };
};
```
So sánh với `deleteDocumentService` (xoá đơn lẻ) — hàm này CÓ check `countReportsByProposal` trước khi cho xoá PROPOSAL (RV05 không tìm thấy vấn đề mới ở nhánh xoá đơn lẻ về mặt reference check). `deleteDocumentsByMonthService` không dùng chung guard này — bất đối xứng rõ ràng giữa 2 con đường xoá cùng loại tài nguyên.

**Impact**: Không đổi so với ISS-02 (`docs/12_ISSUES_AND_RISKS.md` §65-72, xếp Critical Risk ở Phase 12) — xoá hàng loạt theo tháng để lại `WorkflowInstance.documentId` mồ côi, `Document.referenceTo[]` của REPORT khác trỏ tới PROPOSAL đã biến mất, `Notification.resourceId` lỗi khi FE deep-link.

**Recommendation**: Không đổi so với khuyến nghị Phase 12 — bổ sung check tham chiếu tương tự `countReportsByProposal` (mở rộng cho `WorkflowInstance`/`Notification`) trước khi `deleteMany`, hoặc chuyển hẳn sang soft-delete hàng loạt để nhất quán với domain khác.

**Confidence**: HIGH.

---

### RV05-06 — Soft-delete Document không chặn/đồng bộ WorkflowInstance đang hoạt động của chính nó (MEDIUM, CONFIRMED — finding MỚI)

- **File 1**: `backend/src/services/documents/document.service.ts:416-464` (`deleteDocumentService`)
- **File 2**: `backend/src/services/documents/workflow.service.ts` (`approveStep`, `rejectStep`, `cancelWorkflow`, `completeWorkflow`)

**Observed behavior**: `deleteDocumentService` (soft-delete, chỉ ADMIN) không kiểm tra `document.workflowStatus`/`workflowInstanceId` trước khi set `isActive = false` — 1 document đang `workflowStatus: "pending"` (giữa chừng workflow) vẫn xoá mềm được bình thường.

Sau khi soft-delete, `getDocumentDetailService`/`findActiveDocument` (filter `isActive: true`) sẽ trả 404 cho document này — nhưng `WorkflowInstance` liên quan **không hề bị đụng tới**, và cả 4 hàm xử lý workflow (`approveStep`, `rejectStep`, `cancelWorkflow`, `completeWorkflow`) đều load Document qua `Document.findById`/`findByIdAndUpdate` **KHÔNG filter `isActive`** — nghĩa là approver vẫn thấy item này trong `getPendingApprovalsForRole` (query thẳng `WorkflowInstance`, không join/check `Document.isActive`) và vẫn approve/reject được bình thường, kể cả kích hoạt side-effect `syncAssetOnDocumentApproved` (đổi trạng thái Asset thật) cho 1 document đã bị Admin xoá mềm.

**Evidence**: `document.service.ts:416-464` (không có dòng nào đọc/set `workflowStatus`/`workflowInstanceId`); `workflow.service.ts:231` (`WorkflowInstance.findById`, không liên quan Document.isActive), `workflow.service.ts:263-277` (`Document.findByIdAndUpdate(wf.documentId, {...})` — không filter `isActive`).

**Impact**: Dữ liệu/state không nhất quán giữa "Document đã bị Admin ẩn" và "Workflow của nó vẫn tiếp tục chạy công khai, có tác dụng thật lên Asset" — người dùng thường thấy document 404 nhưng approver vẫn xử lý được, và các side-effect (đổi Asset status) vẫn xảy ra cho 1 tài liệu về mặt danh nghĩa "đã xoá".

**Recommendation**: Cân nhắc 1 trong 2: (a) chặn xoá mềm nếu `workflowStatus === "pending"` (bắt buộc huỷ workflow trước), hoặc (b) khi soft-delete, đồng thời set `WorkflowInstance.status = "cancelled"` nếu đang `pending`, trong cùng transaction.

**Confidence**: HIGH (evidence code trực tiếp), impact thực tế phụ thuộc tần suất Admin xoá document giữa chừng workflow — **UNKNOWN** mức độ xảy ra trong thực tế vận hành.

---

### RV05-07 — Race condition (TOCTOU) khi chặn trùng đề xuất sửa chữa cho 1 Asset (MEDIUM, POTENTIAL RISK)

- **File**: `backend/src/services/documents/document.service.ts:94-129` (`createDocumentService`)
- **File phụ**: `backend/src/services/documents/documents.query.ts:27-34` (`findPendingRepairProposalForAsset`)

**Observed behavior**: Guard chặn 2 đề xuất `PROPOSE_REPAIR` "pending" cùng lúc cho 1 asset dùng pattern read-rồi-write không atomic:
```ts
const pendingProposal = await findPendingRepairProposalForAsset(relatedAsset);
if (pendingProposal) throw ApiError.badRequest(...);
// ... (sau đó mới) documentCode = await generateDocumentCode(...); rồi withTransaction tạo Document
```
Không có unique index cấp DB nào ràng buộc "tối đa 1 `PROPOSE_REPAIR` `pending` cho mỗi `relatedAsset`" (khác hẳn `documentCode` — có `unique: true` ở tầng schema, chống trùng tuyệt đối). Giữa lúc `findPendingRepairProposalForAsset` trả về `null` và lúc `Document.create` thực sự chạy trong transaction, 1 request khác hoàn toàn có thể chen vào và tạo 1 `PROPOSE_REPAIR` khác cho CÙNG asset.

**Evidence**: đọc trực tiếp thứ tự lệnh trong `createDocumentService`; `document.model.ts` không có index/constraint nào trên tổ hợp `(relatedAsset, subType, workflowStatus)`.

**Impact**: Nếu 2 request tạo đề xuất sửa chữa cho cùng 1 asset gửi gần như đồng thời (khả năng thấp trong thao tác thủ công qua UI, cao hơn nếu có tích hợp/automation gọi API), cả 2 có thể vượt qua guard và tạo 2 workflow độc lập tranh nhau đổi trạng thái asset — đúng đúng kịch bản mà comment trong code mô tả là guard này nhằm ngăn chặn.

**Recommendation**: Đánh giá mức độ rủi ro thực tế (tần suất request đồng thời cho cùng 1 asset — thường THẤP vì đây là thao tác người dùng thủ công), cân nhắc thêm partial unique index MongoDB (`{relatedAsset:1, subType:1}` với filter `workflowStatus:"pending"`) nếu cần chống tuyệt đối.

**Confidence**: MEDIUM — lỗ hổng lý thuyết CONFIRMED qua code, nhưng khả năng khai thác thực tế trong vận hành bình thường (không phải cố ý tấn công) chưa được đánh giá — **UNKNOWN** mức độ ưu tiên vá so với các finding khác.

---

### RV05-08 — `WorkflowInstance` vẫn không có index nào ngoài `_id` — hộp thư chờ duyệt luôn COLLSCAN (MEDIUM, CONFIRMED — không đổi so với Phase 04 §9.3)

- **File**: `backend/src/models/documents/workflowInstance.model.ts`
- **Function/Class**: `getPendingApprovalsForRole` (`workflow.service.ts:457-492`)

**Observed behavior**: Model hiện tại (đọc toàn văn) chỉ có field, không có bất kỳ `.index(...)` nào — không index trên `status`, `documentId`, hay bất kỳ field nào khác. `getPendingApprovalsForRole` filter bằng `{status: "pending", $expr: {$eq: [{$arrayElemAt: ["$steps.role", "$currentStep"]}, role]}}` — MongoDB không thể dùng index cho phần `$expr` (đánh giá per-document), và không có index trên `status` để thu hẹp tập ứng viên trước.

**Evidence**: đọc trực tiếp `workflowInstance.model.ts` (không có dòng `.index()` nào trong file, chỉ có `{timestamps:true}` ở schema option) + `workflow.service.ts:466-471`.

**Impact**: Không đổi so với đánh giá Phase 04 — đây là endpoint được gọi thường xuyên nhất bởi mọi approver ("hộp thư chờ duyệt"), mỗi lần gọi là 1 COLLSCAN đầy đủ trên toàn bộ collection `WorkflowInstance`. Mức độ nghiêm trọng thực tế phụ thuộc số lượng bản ghi (UNKNOWN, cần dữ liệu production thật — carry-over từ Phase 04/10/12).

**Recommendation**: Không đổi so với Phase 04 — thêm index tối thiểu `{status: 1}` (thu hẹp tập trước khi evaluate `$expr`), cân nhắc thêm `{documentId: 1}` cho `getWorkflowByDocument`.

**Confidence**: HIGH.

---

### RV05-09 — ~500 dòng code chết (dead code) bị comment nguyên khối cuối `workflow.service.ts` (LOW-MEDIUM, CONFIRMED — finding MỚI)

- **File**: `backend/src/services/documents/workflow.service.ts:616-1120`

**Observed behavior**: File dài 1120 dòng, nhưng logic thực sự đang chạy kết thúc ở dòng 614 (`completeWorkflow`). Toàn bộ phần còn lại (dòng 616 tới hết file, đã xác minh bằng cách lọc mọi dòng không bắt đầu bằng `//` hoặc trống — chỉ còn đúng 1 dòng `};` mồ côi) là bản sao CŨ của chính 5 hàm phía trên (`createWorkflowTemplate`, `syncAssetOnDocumentApproved`, `submitWorkflow`, `approveStep`, và phần đầu `rejectStep` bị cắt giữa chừng — file kết thúc dở dang trong khối comment), từ giai đoạn TRƯỚC khi thêm `withTransaction`, được giữ lại bằng cách comment toàn bộ thay vì xoá.

**Evidence**: `awk 'NR>=614' workflow.service.ts | grep -v "^//" | grep -v "^$"` chỉ trả về đúng 1 dòng (`};`) — xác nhận toàn bộ phần còn lại là comment.

**Impact**: Không ảnh hưởng runtime (code chết không chạy), nhưng file 1120 dòng mà chỉ ~55% là code thật gây khó khăn đáng kể khi review/bảo trì — người đọc mới phải tự phân biệt đâu là logic đang chạy. Cùng loại rủi ro với TD-01 nhóm "dead code tích luỹ" đã ghi nhận ở Phase 11 (`docs/11_TECHNICAL_DEBT.md`), nhưng đây là khối lớn nhất trong toàn bộ 7 vị trí đã biết.

**Recommendation**: Xoá hẳn khối comment (đã có Git history lưu lại nếu cần tham khảo bản cũ) — không thuộc phạm vi "sửa code" của task REVIEW-05 (chỉ review), ghi nhận để xử lý ở task refactor riêng nếu được yêu cầu.

**Confidence**: HIGH.

---

### RV05-10 — `DELETE /documents/delete-by-month` vẫn không có `validateBody` cho `month`/`year` (LOW, CONFIRMED — kế thừa ISS-26, không đổi)

- **File**: `backend/src/routes/documents/document.route.ts:71-76`
- **File phụ**: `backend/src/controllers/documents/document.controller.ts:117-142`

**Observed behavior**: Route tự ghi chú rõ đây là chủ đích tạm thời ("DTO validate cho month/year/filters... chưa xử lý ở đây"). Controller chỉ check `if (!month || !year) throw badRequest` (falsy check, không validate kiểu/khoảng giá trị — VD `month: "abc"` vẫn qua được check `!month` vì string không rỗng là truthy).

**Evidence**: `document.route.ts:68-76` (comment + không có `validateBody`); `document.controller.ts:121-129`.

**Impact**: `month`/`year` không hợp lệ (VD chuỗi không phải số, `month: 13`) không bị chặn ở tầng validate — rơi xuống `new Date(year, month - 1, 1)` ở service, có thể tạo `Date` không như mong đợi (JS `Date` tự "tràn" tháng, VD `month=13` → tháng 1 năm sau) thay vì trả lỗi 400 rõ ràng cho client.

**Recommendation**: Bổ sung DTO validate `month` (1-12)/`year` (khoảng hợp lý) — đã ghi nhận từ Phase 12, độ ưu tiên thấp do endpoint này chỉ dành cho Admin (`DOCUMENT_DELETE`), bề mặt tấn công hẹp.

**Confidence**: HIGH.

---

### RV05-11 — Positive findings (không phải bug, ghi nhận theo yêu cầu đối chiếu baseline)

Domain `documents` cho thấy nhiều dấu hiệu đã được hardening chủ động kể từ baseline Phase 03/04/08, tốt hơn hẳn 1 số domain khác đã review (RBAC, Users):

1. **Transaction đầy đủ**: mọi chuỗi ghi nhiều bước quan trọng (Create/Update/Delete/Restore Document; Submit/Approve/Reject/Cancel/Complete Workflow) đều bọc `withTransaction`, đúng cặp write (Document/WorkflowInstance + UserAudit) — không phát hiện write "mồ côi" nào nằm ngoài transaction mà lẽ ra phải ở trong.
2. **Whitelist filter nhất quán**: `buildDocumentFilter` (dùng chung cho List và Delete-by-month) chặn NoSQL injection qua field lạ — mẫu hình này đã được Phase 12 khuyến nghị nhân rộng sang domain khác (RBAC/Departments/UserAudit vẫn còn hở theo RV02-03/RV03-02/RV03-03/RV04-04).
3. **Escape regex**: `escapeRegex()` áp dụng trước khi đưa `keyword` vào `$regex` — chống ReDoS, cũng là mẫu hình tốt chưa được nhân rộng đầy đủ (Department vẫn thiếu — RV04-04).
4. **Audit trail đầy đủ**: kể cả `Restore` (dễ bị bỏ sót nhất) cũng ghi `UserAudit` — tốt hơn hẳn 1 số domain khác.
5. **`documentCode` chống trùng đúng chuẩn**: Counter pattern + atomic `$inc` + unique index, không dùng `countDocuments` (tránh race condition kinh điển).
6. **Role-per-step đã được implement thật** ở `approveStep`/`rejectStep` (so khớp `step.role !== role` → forbidden) — dù comment ở đầu `workflow.routes.ts` vẫn nói "chưa xử lý" (comment đã LỖI THỜI, không phản ánh đúng code hiện tại — ghi nhận là documentation drift nhẹ, không phải lỗ hổng thật).

---

## C. CÁC MỤC ĐÃ XÁC MINH LẠI, KHÔNG PHÁT HIỆN THÊM VẤN ĐỀ

- `validateReference`/`buildReferenceArray`: đúng như baseline, ràng buộc 1-1 giữa REPORT/CONFIRM_STATUS và document tham chiếu được thực thi nhất quán ở cả validator lẫn mapper.
- `DOCUMENT_UPDATE_WHITELIST` (`title`, `meta`) — đúng như Phase 03, `updateDocumentService` throw nếu có field lạ ngoài whitelist.
- `deleteDocumentService` (xoá đơn lẻ) — CÓ gọi `countReportsByProposal` trước khi xoá PROPOSAL (giải quyết UNKNOWN cũ từ Phase 03/04, đã CONFIRMED lại ở Phase 08, xác nhận lần nữa ở review này).
- `validateStatusTransition`/`validateStatusPermission` (`documents.validator.ts:111-133`) — xác nhận vẫn là dead code, tự đánh dấu deprecated trong comment, không có consumer nào gọi trong phạm vi các file đã đọc ở review này (Document/Workflow controller & service).
- Cơ chế "resubmit" workflow sau khi `rejected`/`cancelled` — xác nhận lại: KHÔNG có hàm nào trong `workflow.service.ts` xử lý việc này (kể cả ở phần code chết RV05-09) — **UNKNOWN** liệu đây có phải chủ đích thiết kế (phải tạo Document mới) hay thiếu sót, giữ nguyên carry-over từ Phase 08.

---

## D. UNKNOWN CÒN TỒN ĐỌNG (không đủ evidence tĩnh để kết luận)

- RV05-04: có phải chủ đích nghiệp vụ cho "xem toàn hệ thống, chỉ chặn sửa theo phòng ban" hay là thiếu sót — cần xác nhận với chủ dự án.
- RV05-06: tần suất Admin xoá mềm document đang mid-workflow trong thực tế vận hành.
- RV05-07: tần suất request tạo `PROPOSE_REPAIR` đồng thời cho cùng 1 asset trong thực tế.
- Số lượng bản ghi thực tế `WorkflowInstance`/`Document` (ảnh hưởng mức độ nghiêm trọng RV05-08) — carry-over Phase 04/10/12, cần dữ liệu production thật.
- Cơ chế resubmit workflow sau reject/cancel — carry-over Phase 08.

---

**Review hoàn tất. Không có thay đổi nào được thực hiện trên source code trong quá trình review này.**

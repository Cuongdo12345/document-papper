# 21 — GLOBAL ARCHITECTURE REVIEW

> Loại: Tổng hợp xuyên-tài-liệu (KHÔNG phải 1 phase/review mới, KHÔNG đọc lại toàn bộ source) | Ngày tạo: 2026-08-31 | Cập nhật lần 2: 2026-08-31 (hợp nhất `docs/15_ARCHITECTURE_REVIEW.md`) | KHÔNG refactor.
>
> **Nguồn đã đọc**: `CLAUDE.md`, `docs/02_ARCHITECTURE.md` (Phase 02, baseline kiến trúc), `docs/module-reviews/{00,04,05,06,07,16}_*_CODE_REVIEW.md` (đọc toàn văn), `docs/module-reviews/15_API_CONTRACT_REVIEW.md`, `docs/module-reviews/16_DATABASE_CROSS_DOMAIN_REVIEW.md`, `docs/00_PROJECT_MEMORY.md` (đối chiếu tóm tắt REVIEW-01/02/03/08/09/10/11/12-Cron/13-Shared/14 — các review này không đọc lại toàn văn trong tài liệu này, chỉ dùng tóm tắt đã có sẵn kèm ID finding cụ thể trong Memory), và **`docs/15_ARCHITECTURE_REVIEW.md`** (đọc toàn văn — bổ sung ở lần cập nhật này, xem ghi chú dưới).
>
> **⚠️ CẬP NHẬT (2026-08-31): `docs/15_ARCHITECTURE_REVIEW.md` NAY ĐÃ TỒN TẠI** — file này được tạo SAU tài liệu hiện tại (ở Phase 15, cùng ngày), nên bản gốc của `21_GLOBAL_ARCHITECTURE_REVIEW.md` đã ghi chú "file không tồn tại" — ghi chú đó nay ĐÃ OUTDATED và được thay bằng đoạn này. Quan hệ giữa 2 tài liệu: `15_ARCHITECTURE_REVIEW.md` đọc trực tiếp `02_ARCHITECTURE.md`/`03_BACKEND_ANALYSIS.md`/`05_API_ANALYSIS.md` theo cấu trúc 18-mục yêu cầu riêng và đã tự đối chiếu ngược lại tài liệu này (dùng lại ID `ARCH-01→26` không lặp nội dung, chỉ đánh số tiếp `ARCH-27→35` cho finding thật sự mới). Lần cập nhật này hợp nhất 9 finding mới đó (`ARCH-27→35`) VÀO ĐÚNG các mục phân loại tương ứng bên dưới (Layer Violations/Coupling/Cohesion/Duplicate Logic/Inconsistent Patterns/Shared Leakage) — không tạo mục riêng trùng lặp, không sửa lại nội dung 26 finding gốc `ARCH-01→26`.
>
> **Nguyên tắc**: mỗi finding dưới đây có evidence trực tiếp trích từ 1 module review hoặc `docs/15_ARCHITECTURE_REVIEW.md` đã tồn tại (trích dẫn ID gốc `RVxx-yy` hoặc mục cụ thể) — không tạo finding mới từ suy đoán, không đọc lại source ngoài phạm vi đã cho phép. Không sửa code.

---

## 0. Tóm tắt điều hành

Kiến trúc tổng thể (monolith, layered theo domain, Phase 02) về cơ bản **nhất quán và có chủ đích tốt** — controller mỏng, error handling tập trung, transaction pattern rõ ràng ở domain lõi. Tuy nhiên, tổng hợp 8 module review cho thấy 4 vấn đề kiến trúc mang tính **hệ thống** (lặp lại ở ≥3 domain độc lập, không phải lỗi cục bộ 1 file):

1. **Không có cơ chế authorization/scoping tập trung** — mỗi domain tự phát minh lại (hoặc không làm) ownership/department-scoping check, dẫn tới enforcement không nhất quán (Documents, Assets, Dashboard). Nguyên nhân gốc: tầng ABAC (được thiết kế đúng cho việc này) chết hoàn toàn ở runtime.
2. **Data-access layer (`*.query.ts`) chỉ tồn tại ở domain `documents`** — mọi domain khác để Service gọi thẳng Model, phá vỡ tính nhất quán của pattern kiến trúc đã định hình.
3. **Kỷ luật dọn dead-code không nhất quán** — có domain tự dọn triệt để (Dashboard), có domain để lại hàng trăm dòng code chết trong file đang hoạt động (Workflow, Asset Assignment, Excel).
4. **Ràng buộc tham chiếu (referential integrity) chỉ được validate 1 chiều ("tạo mới"), không có ở chiều "huỷ nguồn" ("xoá"/"vô hiệu hoá")** — lặp lại độc lập ở Department, Asset, Document, User — cho thấy đây không phải sai sót ngẫu nhiên mà là khoảng trống trong chính triết lý thiết kế validate của hệ thống.
5. **Ranh giới Route↔Service không được type-system ràng buộc** (`ARCH-27`, bổ sung từ `docs/15_ARCHITECTURE_REVIEW.md`) — Service layer (Documents/Users/Notifications) ngầm giả định Middleware `validateQuery` đã coerce string→number, nhưng route thực tế bị comment — không có cơ chế nào (type, test, lint) phát hiện khi giả định đó sai. Đây LÀ root cause kiến trúc của bug pagination đã biết ở 3 domain (không phải 3 bug riêng lẻ) — domain `Asset` là ngoại lệ DUY NHẤT làm đúng (`parseInt` tường minh), chứng minh đây là vấn đề tính nhất quán, không phải giới hạn kỹ thuật.

Không phát hiện **circular dependency** nào ở bất kỳ tầng nào đã review (§2) — xác nhận LẦN THỨ 3 độc lập (Phase 02, REVIEW-00, `15_ARCHITECTURE_REVIEW.md`).

---

## 1. Layer Violations

### ARCH-01 — Dashboard import thẳng Model của domain khác, bỏ qua Service layer

- **Evidence gốc**: `docs/02_ARCHITECTURE.md` §7 (Module Dependencies) — *"Dashboard ──▶ Documents, Assets, MedicalDevice, Users, Departments (dashboard.service.ts, assetDashboard.service.ts, medicalDeviceDashboard.service.ts import THẲNG model của các domain khác — KHÔNG gọi qua service — đây là điểm coupling chặt nhất trong hệ thống)"*.
- **Xác nhận lại bởi**: `docs/module-reviews/07_DASHBOARD_CODE_REVIEW.md` (đọc trực tiếp `assetDashboard.service.ts`/`medicalDeviceDashboard.service.ts` đối chiếu `document.model.ts`/`asset.model.ts` — không phát hiện thay đổi so với Phase 02, pattern vẫn giữ nguyên ở source hiện tại).
- **Nhận xét**: Đây là vi phạm layering "chính thức" của kiến trúc `routes→controller→service→model` khi 1 domain Service đọc thẳng Model domain khác thay vì qua Service tương ứng của domain đó. Được đánh giá là **rủi ro thấp trong thực tế** (chỉ ĐỌC, không ghi — REVIEW-07 xác nhận Dashboard "coupling rộng nhất nhưng nông nhất"), nhưng là layer violation thật về mặt kiến trúc: đổi field/enum ở domain bị phụ thuộc (vd `AssetStatus`) đòi hỏi rà tay sang `assetDashboard.service.ts` dù về nguyên tắc domain đó không nên biết chi tiết nội bộ Model của domain khác.
- **Mức độ**: MEDIUM (kiến trúc), thấp về rủi ro vận hành.

### ARCH-02 — Excel service đọc thẳng Model `Department`, bỏ qua `departments.service.ts`

- **Evidence gốc**: `docs/02_ARCHITECTURE.md` §7 — *"Excel ──▶ Departments, ImportAudit... excel.service.ts đọc thẳng model Department + ghi ImportHistory"*.
- **Nhận xét**: Cùng loại vi phạm với ARCH-01, ở domain Excel/Import-Export. `excel.service.ts` (996 dòng — xem ARCH-06) trực tiếp gọi `Department.findOne(...)`/tương đương thay vì qua `departments.service.ts`.
- **Mức độ**: LOW-MEDIUM.

### ARCH-03 — `authorizePermission` middleware ghi thẳng vào `UserAudit` model (RBAC layer chạm domain Users)

- **Evidence gốc**: `docs/02_ARCHITECTURE.md` §7 — *"Middlewares (authorizePermission) ──▶ RBAC (Policy, permission.cache) + Users (UserAudit)"*; §6.2 bước 2 (Super Admin bypass ghi audit log qua `UserAudit.create`).
- **Nhận xét**: Tầng middleware cross-cutting (không thuộc domain nào) ghi trực tiếp vào Model của domain `Users` — hợp lý về mặt thực dụng (audit bypass ADMIN cần ghi ngay tại điểm xảy ra), nhưng là 1 layer violation nhẹ (middleware thường không nên có domain knowledge). Không có finding riêng nào ở REVIEW-00 phản đối thiết kế này (REVIEW-00 §3 xác nhận không phát hiện vấn đề ở middleware order/circular dependency) — ghi nhận như 1 quan sát kiến trúc, không phải bug.
- **Mức độ**: INFO/LOW.

### ARCH-27 — Service tin tưởng ngầm Middleware đã coerce dữ liệu — vi phạm ranh giới trách nhiệm Route↔Service (MỚI, từ `docs/15_ARCHITECTURE_REVIEW.md` §5.1/§11)

- **Evidence gốc**: `docs/05_API_ANALYSIS.md` §4.4-4.6 (đọc toàn văn ở Phase 15) — 3 domain độc lập cùng mắc lỗi: `document.service.ts:getAllDocumentsService` dùng `Number.isInteger(page)` (kiểm tra KIỂU, không parse) → luôn fallback trang 1; `users.service.ts:getList` không có phòng thủ nào (`skip=(page-1)*limit` với `page`/`limit` có thể là string thô/`undefined`); `notification.controller.ts` dùng type assertion (`as unknown as {page:number}` — chỉ có tác dụng lúc biên dịch, KHÔNG chuyển đổi giá trị runtime).
- **Nhận xét**: Đây là ví dụ RÕ NHẤT trong toàn bộ codebase về hậu quả của "hợp đồng ngầm giữa 2 tầng không được type-system ràng buộc" — Service được viết với giả định 1 side-effect của Middleware (`validateQuery` coerce string→number) mà không có cách nào TypeScript/runtime phát hiện khi Middleware đó bị tắt (comment out — xem ARCH-24). `asset.service.ts` là NGOẠI LỆ DUY NHẤT dùng đúng `parseInt(page,10)` tường minh, không phụ thuộc Middleware — chứng minh đội phát triển CÓ NĂNG LỰC làm đúng, vấn đề là tính nhất quán khi áp dụng.
- **Liên hệ**: Là PHÂN TÍCH CƠ CHẾ (root cause kiến trúc) cho ARCH-24 (`validateQuery` bị comment không đồng đều, Mục 10) — ARCH-24 mô tả HIỆN TƯỢNG, ARCH-27 giải thích TẠI SAO hiện tượng đó gây hậu quả nghiêm trọng đến vậy.
- **Mức độ**: **HIGH** (kiến trúc — điểm yếu kiến trúc MỚI quan trọng nhất phát hiện được ở Phase 15, đã XẢY RA THẬT ở 3 domain, không phải rủi ro lý thuyết).

### ARCH-34 — 2 hàm business-logic cũ (`validateStatusTransition`/`validateStatusPermission`) còn tồn tại song song logic mới, thiết kế không còn khớp schema hiện tại (MỚI, từ `docs/15_ARCHITECTURE_REVIEW.md` §11)

- **Evidence gốc**: `docs/03_BACKEND_ANALYSIS.md` §6.2 — 2 hàm trong `services/documents/documents.validator.ts` tự đánh dấu `deprecated` trong comment, viết cho thiết kế `DocumentStatus`/`repairStatus` CŨ (đã bị thay bằng `workflowStatus` xử lý qua `workflow.service.ts`).
- **Nhận xét**: Tồn tại song song với validate logic MỚI mà không rõ ràng cái nào đang thực sự chịu trách nhiệm cho rule gì — nhầm lẫn trách nhiệm khi review domain Document (1 người có thể tưởng rule status transition nằm ở đây, thực tế đã chuyển hẳn sang `workflow.service.ts`). Chưa xác nhận 100% không còn consumer nào khác gọi 2 hàm này (UNKNOWN, tự ghi nhận ở `03_BACKEND_ANALYSIS.md`).
- **Mức độ**: LOW-MEDIUM (Responsibility violation — trách nhiệm rule không rõ ràng, không phải bug runtime).

---

## 2. Circular Dependencies

**Không phát hiện circular dependency nào** ở bất kỳ tầng nào đã review:

- `docs/02_ARCHITECTURE.md` §7 xác nhận tường minh: *"Chiều ngược lại KHÔNG tồn tại: Assets/Notifications/RBAC không import ngược lại bất kỳ thứ gì từ `services/documents/` — dependency là MỘT CHIỀU"* (Documents phụ thuộc nhiều domain khác, không domain nào phụ thuộc ngược lại Documents).
- `docs/module-reviews/00_FOUNDATION_CODE_REVIEW.md` §3 xác nhận tường minh ở tầng cross-cutting: *"Circular dependency: không phát hiện ở tầng foundation/cross-cutting (middlewares/shared/config)... các file này chỉ phụ thuộc model/utils, không phụ thuộc ngược lại middleware khác."*
- Toàn bộ dependency graph mô tả ở Phase 02 §7 (Documents→{Assets, Notifications, RBAC, Users}, RBAC→Users, Auth→{Users, RBAC}, Dashboard→{Documents, Assets, MedicalDevice, Users, Departments}, Excel→{Departments, ImportAudit}, Cron→{Assets, Notifications}) là **DAG (Directed Acyclic Graph)** thuần — không có cạnh khứ hồi nào được ghi nhận ở bất kỳ module review nào đã đọc.

**Kết luận**: đây là điểm mạnh kiến trúc đã xác nhận, không cần theo dõi thêm trừ khi có domain mới được thêm vào.

---

## 3. Coupling & Cross-Domain Coupling

### ARCH-04 — Cụm phụ thuộc trung tâm Documents↔Assets↔Notifications↔RBAC (coupling sâu nhất hệ thống)

- **Evidence gốc**: `docs/02_ARCHITECTURE.md` §7 (mục "Giải thích dependency quan trọng nhất"): Documents→RBAC (validate `steps[].role` khớp Role có thật lúc tạo Template), Documents→Assets (`syncAssetOnDocumentApproved` đổi trạng thái Asset khi workflow duyệt xong), Documents→Notifications (mọi chuyển bước duyệt bắn Notification).
- **Xác nhận/mở rộng bởi**: `docs/module-reviews/05_DOCUMENTS_CODE_REVIEW.md` (RV05-01 — mâu thuẫn logic ngay tại điểm nối Documents→Assets, `CONFIRM_STATUS.referenceSubType` vs hard-code `PROPOSE_REPAIR` trong `syncAssetOnDocumentApproved`), `docs/module-reviews/16_DATABASE_CROSS_DOMAIN_REVIEW.md` §C.1 (xác nhận lại chuỗi `Document→Workflow→Asset` có ít nhất 4 điểm hở độc lập, tất cả đều nằm ở đúng cụm coupling này).
- **Nhận xét**: Đây là domain có coupling sâu NHẤT (vừa đọc vừa ghi chéo, không chỉ đọc như Dashboard) — không có event bus/domain event/interface trung gian nào giảm nhẹ coupling này (Phase 02 §7: *"không có event bus, không có domain event, không có interface/abstraction trung gian"*). Hệ quả trực tiếp: 1 thay đổi enum/rule ở `documentRules.ts` phải đồng bộ tay với `workflow.service.ts` — chính RV05-01 là bằng chứng cụ thể việc đồng bộ tay này đã thất bại (2 vị trí lệch nhau).
- **Mức độ**: HIGH (kiến trúc) — đây là root cause kiến trúc cho phép 1 finding CRITICAL (RV05-01) tồn tại mà không bị phát hiện qua compile-time/type-check nào.

### ARCH-05 — Phòng thủ tham chiếu bất đối xứng: chặt ở chiều "tạo", lỏng ở chiều "huỷ nguồn" — lặp lại ở ≥3 domain độc lập

- **Evidence gốc**: `docs/module-reviews/16_DATABASE_CROSS_DOMAIN_REVIEW.md` §C.2 (kết luận trace `User→Asset→Assignment→Department`): *"domain Assignment (Asset↔User↔Department) có phòng thủ TỐT ở chiều 'tạo mới' (assertUserExists/assertDepartmentExists) nhưng KHÔNG có phòng thủ nào ở chiều 'huỷ nguồn' (xoá Department — RV04-01, disable User — RV16-03) — đây là root cause chung"*.
- **Xác nhận thêm bởi**: `docs/module-reviews/04_DEPARTMENTS_CODE_REVIEW.md` (RV04-01 — `deleteDepartmentService` không check `Asset`/`AssetAssignmentHistory`), `docs/module-reviews/06_ASSETS_CODE_REVIEW.md` (RV06-03 — `hardDeleteAssetService` không check `Document.relatedAsset`), `16_DATABASE_CROSS_DOMAIN_REVIEW.md` (RV16-01 — hard-delete Asset không check `MedicalDeviceProfile`, nghiêm trọng nhất vì không có đường dọn nào kể cả thủ công), `docs/module-reviews/05_DOCUMENTS_CODE_REVIEW.md` (RV05-05 — `deleteDocumentsByMonthService` không check `WorkflowInstance`/`referenceTo`/`Notification`).
- **Nhận xét kiến trúc**: Đây KHÔNG phải 4 lỗi độc lập ngẫu nhiên — là 1 pattern kiến trúc lặp lại nhất quán trên toàn hệ thống: mọi ràng buộc tham chiếu trong code hiện có đều được implement dưới dạng "write-time check tại nơi TẠO quan hệ mới" (assign/create), không có domain nào implement "back-reference check tại nơi HUỶ nguồn" (delete/disable) như 1 concern chung. Đây là khoảng trống trong triết lý thiết kế, không phải thiếu sót cục bộ từng file — cùng 1 pattern sửa (thêm `Model.exists({ref: id})` trước khi xoá/disable) cần áp dụng nhất quán ở ≥5 vị trí thay vì vá riêng lẻ.
- **Mức độ**: HIGH (kiến trúc, ảnh hưởng data integrity toàn hệ thống).

### ARCH-06 — Authorization/department-scoping bị áp dụng không nhất quán giữa các domain (do thiếu cơ chế tập trung)

- **Evidence gốc**:
  - `docs/module-reviews/05_DOCUMENTS_CODE_REVIEW.md` (RV05-04) — `updateDocumentService` CÓ check `callerDepartment`, nhưng `getAllDocumentsService`/`getDocumentDetailService` (Read) KHÔNG có — bất đối xứng NGAY TRONG CÙNG 1 domain.
  - `docs/module-reviews/06_ASSETS_CODE_REVIEW.md` (RV06-04) — domain Asset KHÔNG có department-scoping ở BẤT KỲ đâu (Read lẫn Assignment) — khác Documents, nhất quán theo kiểu "hoàn toàn không có" thay vì bất đối xứng.
  - `docs/module-reviews/07_DASHBOARD_CODE_REVIEW.md` (RV07-01) — 11/12 endpoint Dashboard không có scoping, chỉ `adminDashboardSummary` có check nghiêm ngặt hơn route.
- **Root cause chung được xác nhận độc lập ở Phase 09 (đã dẫn trong Global Security Review, SEC-07)**: tầng ABAC (`Policy` model, `Policycondition.evaluator.ts`, `loadDocument.middleware.ts`) được thiết kế ĐÚNG cho chính bài toán resource-level/scoping authorization này, nhưng **hoàn toàn không được wire vào bất kỳ route nào** — 103 lệnh gọi `authorizePermission()` không truyền `enablePolicies`/`resource`/`action` (`docs/02_ARCHITECTURE.md` §6.2 bước 5 mô tả cơ chế; `docs/module-reviews/00_FOUNDATION_CODE_REVIEW.md` không phản đối thiết kế nhưng cũng không xác nhận nó hoạt động).
- **Nhận xét kiến trúc**: Vì không có 1 cơ chế cross-cutting THẬT SỰ hoạt động cho department-scoping, mỗi domain phải tự cài đặt (hoặc quên cài đặt) ownership check theo cách riêng — dẫn tới 3 domain độc lập có 3 mức độ nhất quán khác nhau (Documents: bất đối xứng Read/Write; Assets: hoàn toàn không có; Dashboard: chỉ 1/12 endpoint). Đây là ví dụ điển hình của **"đáng lẽ nên là 1 middleware/concern chung, thực tế lại là logic rải rác cấp service"** — đúng loại vấn đề kiến trúc mà ABAC vốn được thiết kế để giải quyết nhưng chưa từng vận hành.
- **Mức độ**: HIGH (kiến trúc, không phải chỉ là finding bảo mật cục bộ).

### ARCH-32 — `GET /api/assets/:id/documents` dùng permission domain khác (`DOCUMENT_VIEW` thay vì `ASSET_*`) (MỚI, từ `docs/15_ARCHITECTURE_REVIEW.md` §8, INFO không phải bug)

- **Evidence gốc**: `docs/05_API_ANALYSIS.md` §7 mục 4 — route thuộc route-tree `assets/` nhưng quyền truy cập được quyết định bởi permission catalog domain `documents`, có comment giải thích rõ đây là quyết định tường minh (không phải sơ suất) — phản ánh đúng bản chất dữ liệu trả về (danh sách Document liên quan) hơn là vị trí route.
- **Nhận xét**: Là 1 dạng "permission cross-domain wiring" hợp lý nhưng cần ghi chú rõ khi audit RBAC theo route-prefix, dễ bị hiểu nhầm là thiếu sót nếu chỉ nhìn qua danh sách permission theo domain.
- **Mức độ**: INFO (module dependency, quyết định có chủ đích).

---

## 4. Cohesion Problems

### ARCH-07 — `excel.service.ts` (996 dòng) gánh logic Import/Export cho nhiều domain không liên quan trong 1 file

- **Evidence gốc**: `docs/00_PROJECT_MEMORY.md` (tóm tắt REVIEW-08): *"Đã review... `excel.service.ts` (996 dòng, đọc toàn văn)..."*; `docs/02_ARCHITECTURE.md` §7 xác nhận `excel.service.ts` phụ thuộc trực tiếp `Department` model + `ImportHistory` + domain đang export tuỳ endpoint (Documents/Assets).
- **Nhận xét**: File đơn lẻ vừa xử lý import/export Document, vừa import Asset (theo `assetExcel.service.ts` — file riêng, cho thấy ít nhất Asset ĐÃ được tách), vừa sync Department từ Excel. Cohesion thấp: 1 file đảm nhiệm nhiều concern (parsing Excel, business rule Document, ghi ImportHistory, đọc Department) thay vì mỗi domain sở hữu logic import/export của chính nó (như Asset đã làm với `assetExcel.service.ts` riêng biệt).
- **Mức độ**: MEDIUM (maintainability).

### ARCH-08 — `workflow.service.ts`: cohesion bị pha loãng bởi ~500 dòng code chết chiếm gần một nửa file

- **Evidence gốc**: `docs/module-reviews/05_DOCUMENTS_CODE_REVIEW.md` (RV05-09): *"`workflow.service.ts` vẫn 1120 dòng nhưng ~500 dòng cuối (614→1120) là code chết bị comment nguyên khối, không còn chạy"* — nghĩa là chỉ ~55% file là code thật đang chạy.
- **Nhận xét**: Không phải lỗi logic, nhưng làm giảm khả năng nắm bắt cohesion thật của file khi review/bảo trì — người đọc phải tự phân biệt phần nào đang chạy. Cùng vấn đề ở `assetAssignment.service.ts` (xem ARCH-11).
- **Mức độ**: LOW-MEDIUM (maintainability).

### ARCH-33 — Domain `upload`: cohesion thấp giữa validate/business logic/middleware factory (MỚI, từ `docs/15_ARCHITECTURE_REVIEW.md` §10)

- **Evidence gốc**: `docs/03_BACKEND_ANALYSIS.md` §11.1 — business logic (`saveFilesToDB`), validate (`upload.validator.ts:validateFiles` — viết ra nhưng KHÔNG được gọi, dead code) và middleware factory (`createUploader`) nằm rải rác trong `services/upload/`; controller tự làm việc lẽ ra middleware/service nên làm (error formatting thủ công thay vì qua `ApiError` — liên hệ ARCH-09).
- **Nhận xét**: `createUploader` tự có logic validate riêng, KHÔNG dùng `validateFiles` dù hàm này viết đầy đủ logic (max size, max total size, max files, allowed types). Củng cố nhận định đã có ở ARCH-23 (Mục 10): domain Upload là nơi TẬP TRUNG NHIỀU NHẤT các lệch khỏi convention chung (response shape, error handling, nay thêm cohesion) — dấu hiệu domain phát triển sớm/tách biệt, chưa được đồng bộ lại.
- **Mức độ**: MEDIUM (maintainability).

---

## 5. Fat Controllers

### ARCH-09 — Không phát hiện fat controller nào — pattern "controller mỏng" được giữ nhất quán, TRỪ 1 ngoại lệ

- **Evidence gốc (pattern chung, positive)**: `docs/02_ARCHITECTURE.md` §9.3 — *"controller mỏng (không chứa logic) → service chứa toàn bộ logic"*; xác nhận lại nhiều lần ở các module review đã đọc toàn văn (00, 04, 05, 06, 07) — không ghi nhận finding "fat controller" nào ở bất kỳ đâu.
- **Ngoại lệ duy nhất đã xác nhận**: `docs/00_PROJECT_MEMORY.md` (tóm tắt REVIEW-09, RV09-07) — `upload.controller.ts` **không dùng `catchAsync`/`ApiError`** như 100% controller khác đã review — tự `try/catch` + `res.status(500).json({message: err.message})` (cũng là nguồn của SEC-23 trong Global Security Review). Đây không hẳn là "fat" về khối lượng logic, mà là lệch khỏi kiến trúc error-handling chuẩn của toàn hệ thống ngay tại tầng controller.
- **Mức độ**: LOW (kiến trúc) nhưng đáng chú ý vì là ngoại lệ DUY NHẤT trong toàn bộ codebase đã review.

---

## 6. Fat Services

### ARCH-10 — `document.service.ts`/`workflow.service.ts`: service gộp nhiều trách nhiệm (validate + transaction + audit + side-effect notification)

- **Evidence gốc**: `docs/module-reviews/05_DOCUMENTS_CODE_REVIEW.md` — xác nhận `document.service.ts` đã được refactor 1113→591 dòng (giảm đáng kể, có tách `.validator.ts`/`.mapper.ts`/`.query.ts` riêng — domain TỐT NHẤT về tách trách nhiệm, theo `docs/02_ARCHITECTURE.md` §3.3: *"Domain `documents` là domain tách rõ nhất... cho thấy đây là domain phức tạp nhất và được refactor nhiều nhất"*), nhưng `workflow.service.ts` vẫn giữ nguyên 1120 dòng (phần code thật ~620 dòng) đảm nhiệm: state machine approve/reject/cancel/complete + gọi sang Assets (`syncAssetOnDocumentApproved`) + gọi sang Notifications + transaction orchestration.
- **Nhận xét**: `document.service.ts` là ví dụ TỐT về việc tách fat service thành các file chuyên trách (`.validator.ts`/`.mapper.ts`/`.query.ts`) — pattern này KHÔNG được áp dụng lại cho `workflow.service.ts` dù đây là service phức tạp tương đương (orchestrate nhiều domain khác — xem ARCH-04). Đây là sự bất nhất quán TRONG CÙNG 1 domain, không phải fat service đơn thuần.
- **Mức độ**: MEDIUM (maintainability), liên hệ trực tiếp ARCH-04 (coupling sâu → khó tách nếu không có ranh giới rõ).

### ARCH-11 — `assetAssignment.service.ts`: 604 dòng, chỉ ~53% là code thật đang chạy

- **Evidence gốc**: `docs/module-reviews/06_ASSETS_CODE_REVIEW.md` (RV06-05): *"File dài 604 dòng, logic thực sự chạy kết thúc ở dòng 323... Toàn bộ phần còn lại (dòng 325→hết file) là bản sao CŨ của chính 4 hàm phía trên, từ giai đoạn TRƯỚC khi thêm withTransaction"* — xác nhận bằng lệnh lọc dòng không phải comment/blank, không còn dòng code thật nào sau dòng 325.
- **Nhận xét**: Cùng loại vấn đề với ARCH-08 (workflow.service.ts) — service quan trọng nhất của tiểu module Assignment bị "phình" bởi code chết, không phải bởi logic thật quá nhiều. So sánh trực tiếp: Dashboard (RV07-07 #8) ĐÃ xoá hẳn 250 dòng code chết tương tự ở lần refactor gần nhất — cho thấy đây là vấn đề kỷ luật dọn dẹp không đồng đều giữa các domain (xem ARCH-15), không phải giới hạn kỹ thuật.
- **Mức độ**: LOW-MEDIUM (maintainability).

---

## 7. Duplicate Business Logic

### ARCH-12 — Business rule "CONFIRM_STATUS↔PROPOSE_INK/REPAIR" được hard-code độc lập ở ≥4 vị trí, không có nguồn sự thật duy nhất — 1 trong 4 vị trí lệch

- **Evidence gốc**: `docs/module-reviews/05_DOCUMENTS_CODE_REVIEW.md` (RV05-01, CRITICAL) — `documentRules.ts` khai `CONFIRM_STATUS.referenceSubType = PROPOSE_INK`, trong khi `workflow.service.ts:syncAssetOnDocumentApproved` hard-code query `subType: PROPOSE_REPAIR` — 2 nguồn định nghĩa cùng 1 rule nghiệp vụ, KHÔNG có 1 constant dùng chung.
- **Bằng chứng mở rộng (2 vị trí độc lập khác cùng dùng đúng cặp `PROPOSE_INK`)**: `docs/module-reviews/07_DASHBOARD_CODE_REVIEW.md` (RV07-05 — `topDamagedInkService` group theo `CONFIRM_STATUS`, khớp ý nghĩa "mực" = PROPOSE_INK); tóm tắt REVIEW-08 trong `docs/00_PROJECT_MEMORY.md` (RV08-06 — *"`excel.service.ts` (CẢ import lẫn export) dùng nhất quán cặp PROPOSE_INK↔CONFIRM_STATUS"* — bằng chứng độc lập THỨ BA, ở nơi xử lý dữ liệu thật nhiều nhất).
- **Nhận xét kiến trúc**: Đây là ví dụ rõ nhất trong toàn bộ codebase về hậu quả của **duplicate business logic không qua 1 nguồn sự thật (`documentRules.ts` lẽ ra phải là single source of truth nhưng `workflow.service.ts` không tham chiếu tới nó mà tự hard-code giả định riêng)**. 3/4 vị trí độc lập đồng thuận 1 hướng, chỉ 1 vị trí (`workflow.service.ts`) lệch — nhưng vì không có ràng buộc kiến trúc nào buộc các vị trí này phải cùng đọc từ 1 nguồn, sự lệch pha này tồn tại âm thầm (không có lỗi biên dịch, không có test nào bắt được).
- **Mức độ**: CRITICAL (đã được phân loại ở Global Security/Business Logic — nêu lại đây dưới góc độ kiến trúc: đây là hậu quả trực tiếp của thiếu ràng buộc "single source of truth" cho business rule).

### ARCH-13 — `runPaginatedAggregate` được cài đặt 2 lần độc lập (1 dùng chung, 1 cục bộ) — 1 file thứ 3 tự viết `$facet` tay riêng

- **Evidence gốc**: `docs/module-reviews/07_DASHBOARD_CODE_REVIEW.md` (RV07-04): `dashboard.service.ts` tự định nghĩa `runPaginatedAggregate` RIÊNG (gắn cứng model `Document`) thay vì dùng bản tổng quát đã có sẵn ở `shared/utils/Queryparsing.util.ts` (nhận `Model` bất kỳ). `medicalDeviceDashboard.service.ts` dùng ĐÚNG bản dùng chung — chứng minh bản dùng chung hoạt động tốt và được biết tới, chỉ `dashboard.service.ts` không áp dụng (lý do lịch sử, tự ghi nhận trong comment). `assetDashboard.service.ts` tự viết `$facet` bằng tay theo cách thứ 3.
- **Nhận xét**: 3 cách làm cùng 1 việc trong cùng 1 domain (Dashboard) — sửa logic `$facet` chung (vd đổi cấu trúc response phân trang) cần sửa ở 3 nơi thay vì 1.
- **Mức độ**: LOW-MEDIUM (maintainability).

### ARCH-14 — `permission.descriptors.ts` là bản mô tả RBAC trùng lặp, dữ liệu SAI/lệch so với nguồn thật đang dùng

- **Evidence gốc**: tóm tắt `13_SHARED_CODE_REVIEW.md` trong `docs/00_PROJECT_MEMORY.md`: *"`permission.descriptors.ts` là dead code (không ai import) nhưng comment khẳng định sai rằng nó đang được `seed-rbac.ts` dùng... `seed-rbac.ts` thực tế dùng 1 map mô tả permission RIÊNG, độc lập, đã đúng bộ (có `USER_ASSIGN_ROLE`) trong khi `permission.descriptors.ts` bị bỏ sót — nếu file này từng được import, sẽ crash ngay do chính guard tự viết."*
- **Nhận xét**: Duplicate data-definition kinh điển — 2 danh sách permission mô tả cùng 1 tập dữ liệu, không đồng bộ, và comment trong code còn mô tả SAI quan hệ giữa 2 file này (khẳng định file dead đang được dùng thật) — tăng rủi ro nếu người sau tin theo comment.
- **Mức độ**: MEDIUM-HIGH (đã ghi nhận ở REVIEW-13/Shared, nêu lại đây dưới góc độ "duplicate business/config data").

### ARCH-35 — 2 cấu hình Multer riêng biệt không dùng chung 1 factory (MỚI, từ `docs/15_ARCHITECTURE_REVIEW.md` §13)

- **Evidence gốc**: `docs/03_BACKEND_ANALYSIS.md` §5.2 — `middlewares/upload.middleware.ts` (`uploadExcel`, memory storage, dùng cho import Excel) và `services/upload/upload.middleware.ts` (`createUploader`, disk storage, dùng cho domain Upload chung + calibration certificate) là 2 factory Multer ĐỘC LẬP, không chia sẻ logic chung.
- **Nhận xét**: Không hẳn "duplicate logic" theo nghĩa chặt (mục đích khác nhau: memory vs disk storage) nhưng là 2 nguồn cấu hình Multer riêng biệt, dễ nhầm lẫn khi cần sửa 1 rule chung (vd giới hạn kích thước file toàn hệ thống phải sửa 2 nơi). Chấp nhận được ở quy mô hiện tại, ghi nhận cho tham khảo nếu có thêm loại upload thứ 3 (nên cân nhắc 1 factory chung có tham số storage type).
- **Mức độ**: LOW.

---

## 8. Shared (`shared/`) Leakage

### ARCH-15 — Kỷ luật dọn dead-code không nhất quán giữa các domain (bản thân sự KHÔNG nhất quán là 1 shared/cross-cutting concern bị thiếu)

- **Evidence gốc tổng hợp** (không phải 1 finding đơn lẻ mà là pattern lặp lại):
  - `docs/module-reviews/00_FOUNDATION_CODE_REVIEW.md` (RV00-06) — 4 vị trí dead code cross-cutting còn nguyên qua 2 commit (`loadDocument.middleware.ts`, `mongo.logger.ts`, `errorHandler.ts` deprecated, ~55 dòng comment trong `database.ts`).
  - `docs/module-reviews/05_DOCUMENTS_CODE_REVIEW.md` (RV05-09) — ~500 dòng trong `workflow.service.ts`.
  - `docs/module-reviews/06_ASSETS_CODE_REVIEW.md` (RV06-05) — ~280 dòng trong `assetAssignment.service.ts`.
  - Tóm tắt `08_IMPORT_EXPORT_CODE_REVIEW.md` trong Memory (RV08-07) — ~207 dòng trong `excel.service.ts`.
  - **Đối trọng tích cực**: `docs/module-reviews/07_DASHBOARD_CODE_REVIEW.md` (RV07-07 #8) — `dashboard.service.ts` đã **XOÁ HẲN** ~250 dòng code chết tương tự ở lần refactor gần nhất, tự ghi nhận trong "GHI CHÚ REFACTOR" #7 — chứng minh đây KHÔNG phải giới hạn kỹ thuật, mà là khác biệt về kỷ luật/quy trình giữa các đợt refactor domain khác nhau.
- **Nhận xét kiến trúc**: Không có 1 quy ước/lint rule/CI check nào trong repo (đã xác nhận không có CI/CD — REVIEW-14) ngăn code chết bị comment thay vì xoá — mỗi lần refactor domain phụ thuộc hoàn toàn vào kỷ luật cá nhân của người thực hiện tại thời điểm đó. Đây là 1 "shared concern" (code hygiene) đáng lẽ cần 1 chuẩn chung nhưng không tồn tại.
- **Mức độ**: LOW-MEDIUM (maintainability, không ảnh hưởng runtime).

### ARCH-16 — Giới hạn kiến trúc "single-instance in-memory" bị nhân đôi ở 2 vị trí cache riêng biệt trong `shared/`

- **Evidence gốc**: `docs/02_ARCHITECTURE.md` §6.4 (permission cache) + `docs/module-reviews/00_FOUNDATION_CODE_REVIEW.md` (RV00-07) — `memoryCache.ts` (dùng bởi Dashboard) và `permission.cache.ts` (dùng bởi RBAC) là 2 implementation `Map` in-memory ĐỘC LẬP, cùng chung 1 giới hạn kiến trúc (không đồng bộ giữa nhiều instance nếu scale ngang), nhưng KHÔNG dùng chung 1 giải pháp — đã tự ghi nhận trong comment source cả 2 file.
- **Nhận xét**: 2 lần giải quyết (không đầy đủ) cho cùng 1 bài toán kiến trúc (caching cross-request) — nếu quyết định chuyển sang Redis trong tương lai, cần đồng bộ cả 2 thay vì xử lý riêng lẻ (đã tự khuyến nghị đúng trong RV00-07).
- **Mức độ**: INFO/LOW — chấp nhận được ở quy mô 1 instance hiện tại (tự đánh giá đúng trong code).

### ARCH-17 — Type `req.user.permissions: string[]` không phản ánh đúng vòng đời thực tế 2 giai đoạn — hợp đồng type bị rò rỉ sai lệch qua `shared/types`

- **Evidence gốc**: tóm tắt `13_SHARED_CODE_REVIEW.md` trong `docs/00_PROJECT_MEMORY.md`, mục #6: *"`req.user.permissions: string[]` không phản ánh đúng 2 giai đoạn population thật (luôn `[]` ngay sau `authenticate`, chỉ đúng sau `authorizePermission`)"*.
- **Nhận xét**: Đây là 1 dạng "shared type leakage" — type declaration dùng chung (Express `Request` augmentation, thường đặt ở `shared/types/`) hứa hẹn 1 hợp đồng dữ liệu (`permissions` luôn có giá trị đúng) nhưng hành vi runtime thực tế phụ thuộc thứ tự middleware đã chạy qua — bất kỳ code nào đọc `req.user.permissions` TRƯỚC khi `authorizePermission` chạy (vd trong 1 middleware tuỳ chỉnh khác, hoặc code tương lai) sẽ nhận `[]` sai một cách âm thầm, không có lỗi type nào cảnh báo.
- **Mức độ**: LOW (chưa có evidence bug thật xảy ra, là rủi ro cấu trúc).

### ARCH-30 — Không có structured logger (winston/pino) — toàn hệ thống dùng `console.*` trực tiếp (MỚI, từ `docs/15_ARCHITECTURE_REVIEW.md` §16)

- **Evidence gốc**: `docs/03_BACKEND_ANALYSIS.md` §8 — toàn bộ log qua `console.log/warn/error` trực tiếp; `error.middleware.ts` tự thừa nhận trong comment "đây KHÔNG phải structured logger thực thụ... vẫn dùng `console.error`, chỉ đổi FORMAT"; không có log rotation, log aggregation (ELK/Loki), external logging service (Datadog/Sentry).
- **Nhận xét**: Đây là 1 "shared cross-cutting concern" (logging) đáng lẽ cần 1 giải pháp dùng chung nhưng chưa từng được đầu tư — chưa từng được ghi nhận trong `02_ARCHITECTURE.md` hay bản gốc tài liệu này (`21_GLOBAL_ARCHITECTURE_REVIEW.md`), chỉ lộ ra khi Phase 15 đọc toàn văn `03_BACKEND_ANALYSIS.md`.
- **Mức độ**: LOW-MEDIUM (chấp nhận được ở quy mô 1 instance hiện tại — tương tự ARCH-16 — nhưng hạn chế observability khi cần debug production/scale ngang).

---

## 9. Transaction Boundary Issues

### ARCH-18 — Side-effect (Notification, đồng bộ Asset) được thiết kế CHỦ ĐÍCH nằm ngoài transaction chính — đánh đổi có ý thức nhưng tạo cửa sổ không nhất quán

- **Evidence gốc**: `docs/02_ARCHITECTURE.md` §9.3 (Nhận xét về Request/Response flow): *"Side-effect (Notification, đồng bộ Asset) được thiết kế chủ đích nằm ngoài DB transaction chính: nếu side-effect lỗi, nghiệp vụ chính (ghi Document/WorkflowInstance) vẫn giữ nguyên kết quả đã commit"*.
- **Xác nhận hệ quả cụ thể bởi**: `docs/module-reviews/16_DATABASE_CROSS_DOMAIN_REVIEW.md` §C.1 — *"`syncAssetOnDocumentApproved` chạy NGOÀI transaction chính của `approveStep`... nếu bước này lỗi, `WorkflowInstance`/`Document` đã commit 'approved' nhưng `Asset` không được cập nhật"*.
- **Nhận xét**: Đây LÀ đánh đổi có chủ đích, được document rõ trong cả Phase 02 lẫn code — không phải bug ẩn. Nhưng khi kết hợp với ARCH-12 (RV05-01, bug khiến nhánh sync Asset không bao giờ chạy đúng cho CONFIRM_STATUS), 2 vấn đề CỘNG DỒN: (1) transaction boundary vốn đã chấp nhận rủi ro "Asset có thể không đồng bộ nếu lỗi", (2) CỘNG THÊM 1 bug khiến 1 nhánh KHÔNG BAO GIỜ đồng bộ ngay cả khi không có lỗi gì — 2 vấn đề độc lập nhưng cùng biểu hiện ra ngoài là "Asset kẹt trạng thái", dễ nhầm lẫn nguyên nhân khi debug nếu không đọc cả 2 tài liệu.
- **Mức độ**: MEDIUM (kiến trúc — đánh đổi hợp lý nhưng cần giám sát/log rõ khi side-effect lỗi thật, hiện `syncAssetOnDocumentApproved` bọc try/catch im lặng theo RV05-01).

### ARCH-19 — Counter atomic ($inc) sinh mã (`documentCode`/`assetCode`) nằm NGOÀI transaction chính — chấp nhận "gap" để tránh trùng

- **Evidence gốc**: `docs/module-reviews/16_DATABASE_CROSS_DOMAIN_REVIEW.md` (kế thừa Phase 04 §13.2, xác nhận lại không đổi): `documentCode`/`assetCode` được sinh qua `Counter.findOneAndUpdate($inc)` TRƯỚC khi vào `withTransaction` — nếu transaction sau đó abort, số đã cấp phát không hoàn trả (tạo gap trong dãy số, nhưng KHÔNG tạo trùng số — đúng mục tiêu thiết kế, có comment tự giải thích rõ trong `generateDocumentCode.ts`).
- **Nhận xét**: Đây là đánh đổi kiến trúc CÓ CHỦ ĐÍCH và ĐÚNG (ưu tiên "không trùng" hơn "không có gap") — ghi nhận như 1 ranh giới transaction đã được thiết kế cẩn thận, KHÔNG phải finding cần sửa. Nêu ở đây để đối chiếu với ARCH-18 (cùng dạng "transaction boundary hẹp hơn phạm vi nghiệp vụ" nhưng ARCH-19 là chủ đích tốt, ARCH-18 có rủi ro thật).
- **Mức độ**: INFO (đối trọng tích cực).

### ARCH-20 — Import Excel Document: N+1 transaction (1 transaction/dòng) thay vì batch — ranh giới transaction ở mức hạt quá nhỏ so với phạm vi nghiệp vụ "1 file import"

- **Evidence gốc**: tóm tắt `08_IMPORT_EXPORT_CODE_REVIEW.md` trong `docs/00_PROJECT_MEMORY.md`: *"PERF-07 (Import Document Excel — N+1 transaction per-row, tối đa 5000 transaction/file, nay xác nhận đây là ĐÁNH ĐỔI CÓ CHỦ ĐÍCH ghi rõ trong comment, không phải sơ suất)"*.
- **Nhận xét kiến trúc**: Về mặt transaction boundary, "1 file import" là 1 đơn vị nghiệp vụ nhưng được cài đặt thành N transaction độc lập (N = số dòng) — nghĩa là 1 file import 5000 dòng có thể kết thúc với trạng thái "commit dở dang" (dòng 1-2000 thành công, dòng 2001 lỗi, dòng 2002+ không chạy) mà không có cách nào rollback toàn bộ file như 1 đơn vị — đã được đội phát triển ý thức rõ và đánh đổi (comment tự giải thích), không phải bug.
- **Mức độ**: MEDIUM (kiến trúc — ranh giới transaction không khớp ranh giới nghiệp vụ, nhưng có chủ đích, có thể chấp nhận tuỳ yêu cầu "all-or-nothing" có thực sự cần cho import hay không).

### ARCH-21 — Truy vấn dò trùng lặp khi Import chạy TRƯỚC transaction, không atomic

- **Evidence gốc**: tóm tắt `08_IMPORT_EXPORT_CODE_REVIEW.md` trong Memory (RV08-04): *"dò trùng lặp Proposal khi import (`Document.findOne` theo title/department/createdAt/deviceName) chạy TRƯỚC transaction, không atomic → 2 import đồng thời cùng dòng dữ liệu có thể tạo trùng lặp thay vì create+update"*.
- **Nhận xét**: Cùng loại vấn đề TOCTOU (time-of-check-to-time-of-use) đã ghi nhận ở domain khác (`RV05-07` — chặn trùng đề xuất sửa chữa Asset, cũng đọc-rồi-mới-transaction) — 1 pattern lặp lại: check tồn tại chạy TRƯỚC `withTransaction` thay vì bên TRONG, khiến window race condition mở ra giữa check và write thật.
- **Mức độ**: LOW-MEDIUM (POTENTIAL RISK, phụ thuộc tần suất import đồng thời thực tế).

---

## 10. Inconsistent Patterns

### ARCH-22 — Data-access layer (`*.query.ts`) chỉ tồn tại ở domain `documents`, không áp dụng cho domain khác

- **Evidence gốc**: `docs/02_ARCHITECTURE.md` §3.3 (*"Domain `documents` là domain tách rõ nhất... Pattern này lặp lại (với mức độ tách file khác nhau) ở các domain khác"* — nhưng chỉ Documents có đủ `.validator.ts`/`.mapper.ts`/`.query.ts`/`.types.ts`/`.constants.ts`); xác nhận lại tường minh ở Phase 04 §7 (trích trong `docs/module-reviews/16_DATABASE_CROSS_DOMAIN_REVIEW.md` khi đối chiếu domain khác): *"pattern tách `.query.ts` KHÔNG phải chuẩn chung toàn hệ thống — chỉ domain `documents` áp dụng. Các domain khác (rbac, users, assets, departments) để Service gọi thẳng Model."*
- **Nhận xét**: Đây là inconsistency kiến trúc rõ ràng nhất giữa các domain — không phải sai, nhưng có nghĩa là "kiến trúc chuẩn" của hệ thống trên thực tế có 2 biến thể tồn tại song song (Documents: 5 lớp; domain khác: 3 lớp routes→controller→service→model trực tiếp) mà không có tài liệu nào giải thích khi nào nên dùng biến thể nào cho domain mới.
- **Mức độ**: MEDIUM (maintainability/onboarding — người mới không rõ nên theo mẫu nào khi tạo domain mới).

### ARCH-23 — Response shape không đồng nhất: domain Upload lệch khỏi convention `{success, message, data}`

- **Evidence gốc**: `docs/02_ARCHITECTURE.md` §5 (*"Chuẩn hoá response: `{success, message?, data?}` — pattern lặp lại ở hầu hết controller"*); tóm tắt `09_UPLOAD_CODE_REVIEW.md` trong Memory: `GET /api/upload`, `GET /api/upload/:id` trả trực tiếp document `Upload` (không wrapper) — đã ghi nhận từ Phase 05, xác nhận lại không đổi ở REVIEW-09 (RV09-07 liên hệ, SEC-25).
- **Nhận xét**: Cùng domain Upload là nơi lệch khỏi NHIỀU convention chung nhất trong toàn hệ thống đã review (response shape KHÔNG chuẩn — mục này; error handling KHÔNG chuẩn — ARCH-09; authorization/ownership KHÔNG áp dụng — đã nêu ở Global Security Review) — cho thấy đây là domain được phát triển tách biệt/sớm hơn, chưa được đồng bộ lại theo chuẩn chung đã hình thành ở các domain sau.
- **Mức độ**: LOW-MEDIUM.

### ARCH-24 — `validateQuery` bị comment out không đồng đều — pattern middleware validate được thiết kế chung nhưng enforcement rải rác theo từng route

- **Evidence gốc**: `docs/02_ARCHITECTURE.md` §5 mô tả pattern chuẩn: *"Validation: Zod schema... gắn qua middleware `validateBody`/`validateParams`/`validateQuery`, chạy TRƯỚC khi vào controller"*. Thực tế: `docs/module-reviews/15_API_CONTRACT_REVIEW.md` §7.1 xác nhận 12-13 route có dòng `validateQuery(...)` bị comment — trải rộng qua Documents (RV05-03), Users (RV03-02), UserAudit (RV03-03), Notifications (RV10-01), Assets, RBAC, Workflow — không tập trung ở 1 domain mà rải rác gần như khắp hệ thống.
- **Nhận xét**: Bản thân middleware/pattern được thiết kế đúng và NHẤT QUÁN (`validateBody`/`Params`/`Query` cùng 1 cơ chế `safeParse`+`next(ApiError)`, xác nhận ở `docs/module-reviews/00_FOUNDATION_CODE_REVIEW.md` §3) — vấn đề KHÔNG nằm ở thiết kế middleware mà ở việc ENFORCE nó không nhất quán theo từng route/PR riêng lẻ theo thời gian, không có cơ chế nào (test/lint) phát hiện khi 1 dòng bị comment "tạm thời" rồi bị quên bỏ comment lại.
- **Mức độ**: MEDIUM (đã phân tích tác động bảo mật/hiệu năng cụ thể ở Global Security Review — nêu lại đây thuần dưới góc độ "kiến trúc enforcement không có safety net").

### ARCH-25 — Permission string dùng trong route là literal, không được đối chiếu kiểu với catalog `PERMISSIONS` — cho phép drift không bị bắt

- **Evidence gốc**: `docs/module-reviews/15_API_CONTRACT_REVIEW.md` §6.1 — 3 route dùng chuỗi permission (`"USER_READ"`, `"USER_DETAIL"`, `"DOCUMENT_DETAIL"`) KHÔNG tồn tại trong `permission.constant.ts`, không bị bất kỳ compile-time hay runtime check nào chặn lại — hệ thống chỉ "âm thầm" luôn trả 403 cho non-ADMIN vì permission đó không match được bất kỳ Permission document nào trong DB.
- **Nhận xét kiến trúc**: Đây là hệ quả của việc dùng string literal thay vì 1 cơ chế ràng buộc kiểu (TypeScript union type từ `keyof typeof PERMISSIONS`, hoặc enum) cho tham số `authorizePermission(...)` — TypeScript (`strict: true`, theo REVIEW-00) không bắt được lỗi này vì tham số được khai kiểu `string` chung chung. Đây là 1 khoảng trống type-safety cụ thể, không phải chỉ là "gõ nhầm 1 lần".
- **Mức độ**: MEDIUM (kiến trúc/type-safety — khuyến nghị đổi chữ ký `authorizePermission` sang nhận union type ràng buộc từ `PERMISSIONS`, ngoài phạm vi review này).

### ARCH-28 — `.env.example` không đồng bộ với biến môi trường thực tế dùng trong code (MỚI, từ `docs/15_ARCHITECTURE_REVIEW.md` §16)

- **Evidence gốc**: `docs/03_BACKEND_ANALYSIS.md` §7.1 — `MONGO_MAX_POOL_SIZE`/`MONGO_MIN_POOL_SIZE` dùng thật trong `database.ts` (default 20/2) nhưng KHÔNG xuất hiện trong `.env.example`; `CLIENT_URL` khai TRÙNG LẶP 2 lần (2 nhóm khác nhau, cùng 1 biến); `JWT_EXPIRES_IN` comment-out và KHÔNG dùng ở bất kỳ đâu trong `src/` (biến chết, đúng như đã comment — không phải discrepancy thật); `MONGO_DEBUG`/`MONGO_SLOW_MS` được tài liệu hoá đầy đủ nhưng tính năng đọc chúng (`mongo.logger.ts:registerMongoLogger()`) là dead code — người vận hành đọc `.env.example` sẽ tưởng nhầm 2 biến này đang hoạt động.
- **Nhận xét**: `.env.example` là tài liệu vận hành quan trọng nhất cho người deploy mới — không phản ánh đúng 100% hiện trạng tạo rủi ro cấu hình sai khi triển khai môi trường mới. Việc sửa nhỏ, rủi ro thấp, lợi ích vận hành cao.
- **Mức độ**: MEDIUM (Configuration — không ảnh hưởng runtime trực tiếp nhưng ảnh hưởng độ tin cậy tài liệu vận hành).

### ARCH-29 — `validateParams(IdParamDTO)` thiếu nhất quán ở RBAC/Departments (MỚI, từ `docs/15_ARCHITECTURE_REVIEW.md` §5.2)

- **Evidence gốc**: `docs/05_API_ANALYSIS.md` §5.1 — `rbac.routes.ts` chỉ có `validateParams` ở `GET /:id`, THIẾU ở toàn bộ `PUT`/`DELETE` theo `:id` (Permission/Role/Policy); `department.routes.ts` KHÔNG có `validateParams` ở BẤT KỲ route nào.
- **Nhận xét**: `:id` không hợp lệ rơi vào Mongoose `CastError` (được `error.middleware.ts` map về 400) thay vì bị chặn RÕ RÀNG ở tầng route — hành vi cuối giống nhau (400) nhưng đường đi khác nhau, giảm tính đoán trước của API boundary. Không phải lỗ hổng, nhưng là inconsistency ở đúng lớp có trách nhiệm rõ ràng nhất (route validation).
- **Mức độ**: MEDIUM.

### ARCH-31 — Tên field pagination lệch giữa domain (`totalPages` vs `totalPage`) (MỚI, từ `docs/15_ARCHITECTURE_REVIEW.md` §5.3)

- **Evidence gốc**: `docs/05_API_ANALYSIS.md` §6.3 — Documents trả `pagination:{...,totalPages}`, Users trả `pagination:{...,totalPage}` (thiếu "s") — 2 domain cùng khái niệm, tên field khác nhau.
- **Nhận xét**: Bất kỳ client nào (kể cả tương lai nếu có frontend) phải tự biết field name khác nhau theo từng domain thay vì dùng chung 1 type — cùng nhóm "response contract không đồng nhất" với ARCH-23 (Upload).
- **Mức độ**: LOW.

### ARCH-26 — 2 rate-limiter độc lập cùng cấu hình cho cùng 1 phạm vi route

- **Evidence gốc**: `docs/module-reviews/00_FOUNDATION_CODE_REVIEW.md` (RV00-04) — `app.ts` (`authLimiter`) và `authRateLimiter.middleware.ts` (`authRateLimiter`) cấu hình giống hệt nhau (20 req/15min), áp cho cùng nhóm route `/api/auths/*`, 2 bộ đếm độc lập không chia sẻ store.
- **Nhận xét**: Duplicate middleware setup — không sai về hiệu quả (vẫn chặn đúng), nhưng là 2 nguồn cấu hình cho cùng 1 concern, rủi ro khi cần điều chỉnh ngưỡng (sửa 1 chỗ tưởng đủ).
- **Mức độ**: LOW.

---

## 11. Tổng hợp theo mức độ

> Cập nhật lần 2 (2026-08-31): đã gộp 9 finding mới `ARCH-27→35` từ `docs/15_ARCHITECTURE_REVIEW.md`. Tổng số finding: **35** (`ARCH-01→35`).

| Mức độ | Số lượng | ID |
|---|---|---|
| CRITICAL (kiến trúc là root cause) | 1 | ARCH-12 (= RV05-01, nêu lại dưới góc độ thiếu single-source-of-truth) |
| HIGH | 4 | ARCH-04, ARCH-05, ARCH-06, **ARCH-27 (MỚI)** |
| MEDIUM | 15 | ARCH-01, ARCH-07, ARCH-10, ARCH-14, ARCH-18, ARCH-20, ARCH-22, ARCH-24, ARCH-25, **ARCH-28 (MỚI)**, **ARCH-29 (MỚI)**, **ARCH-33 (MỚI)** (+ARCH-02/08/11/13/21/23 ở mức LOW-MEDIUM, xem chi tiết từng mục) |
| LOW / LOW-MEDIUM | 13 | ARCH-02, ARCH-03, ARCH-08, ARCH-11, ARCH-13, ARCH-17, ARCH-21, ARCH-23, ARCH-26, **ARCH-30 (MỚI)**, **ARCH-31 (MỚI)**, **ARCH-34 (MỚI)**, **ARCH-35 (MỚI)** |
| INFO (positive/đối trọng) | 3 | ARCH-16, ARCH-19, **ARCH-32 (MỚI)**; + Mục 2 (không có circular dependency), + đối trọng dọn dead-code tốt của Dashboard (nêu trong ARCH-15) |

---

## 12. Điểm kiến trúc TỐT đã xác nhận (đối trọng, để khách quan)

- **Không có circular dependency** ở bất kỳ tầng nào đã review (Mục 2).
- **Controller mỏng nhất quán** trên toàn hệ thống, chỉ 1 ngoại lệ (`upload.controller.ts`, ARCH-09).
- **Error handling tập trung** qua `ApiError` + `catchAsync` + `errorHandler` — pattern nhất quán, không phát hiện lỗi logic ở tầng cross-cutting (REVIEW-00 §3).
- **Transaction pattern rõ ràng, có tài liệu hoá đầy đủ** (`withTransaction.ts` tự document yêu cầu replica set) và đánh đổi transaction-boundary đều CÓ CHỦ ĐÍCH, có comment giải thích (ARCH-18, ARCH-19, ARCH-20) — không phải sơ suất ngẫu nhiên dù có rủi ro đi kèm.
- **Domain `documents` là ví dụ tốt về tách trách nhiệm** (`.validator.ts`/`.mapper.ts`/`.query.ts`) — mẫu hình nên nhân rộng (ARCH-22 nêu đây là inconsistency, nhưng bản thân mẫu hình Documents là điểm tốt cần lan toả, không phải cần loại bỏ).
- **Dashboard domain** là ví dụ tốt nhất về kỷ luật dọn dead-code (ARCH-15) và validate input chặt chẽ (`month`/`year`/`fromDate`/`toDate`) — nên dùng làm chuẩn tham chiếu khi refactor domain khác.
- **`Policycondition.evaluator.ts`** (dù ABAC dead ở runtime — ARCH-06) tự viết tokenizer/parser an toàn, không dùng `eval`/`Function` — thiết kế đúng đắn nếu sau này được kích hoạt.
- **Asset domain xử lý pagination ĐÚNG** (`parseInt` tường minh, MỚI từ `docs/15_ARCHITECTURE_REVIEW.md` §14) trong khi 3 domain khác sai (ARCH-27) — bằng chứng đội phát triển CÓ NĂNG LỰC làm đúng, vấn đề là tính nhất quán khi áp dụng, không phải giới hạn kỹ thuật.
- **API/OpenAPI đồng bộ CAO BẤT THƯỜNG** (MỚI từ `docs/15_ARCHITECTURE_REVIEW.md` §14): `05_API_ANALYSIS.md` §9 — 87 path/116 operation khớp TUYỆT ĐỐI giữa `openAPI.yaml` và routes thực tế (0 path documented-nhưng-không-implement, 0 path implement-nhưng-không-documented), kể cả `openAPI.yaml` còn tự ghi cảnh báo bảo mật khớp chính xác với code thật (vd endpoint `/documents/proposal`) — mức đồng bộ tài liệu-code cao hơn hẳn phần còn lại của codebase.
- **Chống enumeration/timing attack nhất quán** ở `login`/`forgotPassword` (MỚI từ `docs/15_ARCHITECTURE_REVIEW.md` §14, `03_BACKEND_ANALYSIS.md` §6.1) — thiết kế bảo mật chủ động, không phải tình cờ.

---

## 13. Unknowns / cần xác minh thêm (không suy đoán)

- Ý định kiến trúc thật của việc chỉ Documents có `.query.ts` riêng — có phải lộ trình dự kiến áp dụng dần cho domain khác (chưa kịp làm) hay là quyết định có chủ đích chỉ dành cho domain phức tạp nhất? (ARCH-22) — chưa có tài liệu nào xác nhận.
- Kế hoạch scale-out (nhiều instance/pod) có nằm trong roadmap gần hay không — quyết định mức độ ưu tiên của ARCH-16 (Redis hoá cache) và tương tự cho Upload (lưu local disk, đã ghi nhận ở Phase 02 §10 nhưng chưa xác minh).
- Có nên coi ABAC (ARCH-06 root cause) là hướng đi đúng cần hoàn thiện, hay nên gỡ bỏ và thay bằng 1 middleware department-scoping đơn giản hơn, tường minh hơn — quyết định kiến trúc cần chủ dự án, không tự suy đoán.

---

**Không có refactor nào được thực hiện trong quá trình tổng hợp tài liệu này.**

# 31 — Review toàn bộ backend (lỗi + hiệu năng)

**Ngày:** 2026-09-29
**Phạm vi:** `backend/src`, khoảng 21.000 dòng (22 file route, 27 controller, 51 service, 33 model, 8 middleware).
**Yêu cầu của user:** review từng module xem còn lỗi hay phần cần xử lý, và kiểm tra hiệu năng.
**Trạng thái:** CHỈ BÁO CÁO. Chưa sửa gì. Mọi hạng mục chờ user chọn.

## Cách làm

1. Đối chiếu lại **92 phát hiện OPEN** của đợt review cũ (REVIEW-00 → 16, ngày 2026-08-30, commit `5b58fb1`) với code hiện tại. Bảng `review-index/CODE_REVIEW_SUMMARY.md` chưa được cập nhật sau hơn 40 task DEV. Kết quả nằm ở Mục 4.
2. Quét toàn bộ 210 route bằng script (chỉ đọc) để tìm route thiếu `authenticate`, `authorizePermission` hoặc `validate*`.
3. Quét mẫu N+1 (`await` trong vòng lặp), regex dựng từ input, `limit` không có giới hạn trên, và `Department.findById` không lọc xoá mềm.
4. Đọc chi tiết các service chính: auth, users, rbac, documents, workflow, assets, inventory, vendors/contract, notification, upload, excel, pdf, dashboard, cron.
5. Đo thật trên DB dev (script chỉ đọc, đã xoá): số bản ghi, dung lượng và index của 34 collection; phân bố `useraudits`; `refreshtokens` hết hạn.
6. Chạy `npm audit --omit=dev`.

Mức độ tin cậy mặc định là **HIGH** (đã đọc code và/hoặc đo DB). Mục nào khác sẽ ghi rõ.

---

## 1. Phát hiện theo mức độ

### HIGH

#### BR-01: Route `/auths/register` public nhưng frontend không dùng. Ai cũng tự tạo được tài khoản USER.

> **[ĐÃ SỬA 2026-09-29, `DEV-090.md`]** Route mặc định tắt (404). Chỉ bật khi ENV `ALLOW_SELF_REGISTER=true`.

- **File:** `routes/auth/auth.routes.ts:46`, `services/auth/auths.service.ts::register()`.
- **Hiện trạng:**
  - Route không cần đăng nhập (chỉ có rate limit). Tài khoản tạo ra có role `USER`, `isActive: true`, không có khoa.
  - Frontend không gọi route này (grep toàn bộ `frontend/src`, chỉ thấy 1 dòng comment).
- **Tác động:** tài khoản tự đăng ký có ngay quyền của USER:
  - `DOCUMENT_CREATE/UPDATE/DELETE/VIEW`.
  - `ASSET_VIEW`, `CONSUMABLE_VIEW`: xem được **toàn bộ tài sản và vật tư**, vì hai domain này không giới hạn theo khoa.
  - `WORKFLOW_SUBMIT`: kết hợp với BR-02.

  Riêng danh sách tài liệu thì an toàn nhờ fail-closed khi user không có khoa. Kế hoạch deploy đưa app ra internet (`PRODUCTION_DEPLOYMENT_PLAN.md`).
- **Đề xuất:** bỏ route, hoặc gắn permission quản trị, hoặc bật/tắt bằng biến môi trường (mặc định tắt).

#### BR-02: `submitWorkflow` không kiểm tra gì. Có thể mở khoá lại tài liệu đã duyệt.

> **[ĐÃ SỬA 2026-09-29, `DEV-091.md`]** Đã kiểm tra (a) + (b) + (c). Với (c), user chọn quy tắc "cùng khoa hoặc Admin" và không giới hạn loại tài liệu.

- **File:** `services/documents/workflow.service.ts:182`, `controllers/documents/workflow.controller.ts:42`. Route chỉ cần `WORKFLOW_SUBMIT`, và role `USER` có quyền này.
- **Hiện trạng:** service nhận `documentId` + `templateId` rồi tạo `WorkflowInstance` và set `Document.workflowStatus = "pending"`. Không kiểm tra:
  - (a) tài liệu có tồn tại và còn hoạt động;
  - (b) đã có workflow `pending`/`approved`/`completed` chưa;
  - (c) người submit có phải người tạo hoặc cùng khoa.
- **Tác động:**
  - Submit lại một tài liệu **đã duyệt** đưa trạng thái về `pending`, và `updateDocumentService` **cho sửa lại** tiêu đề/nội dung (khoá chỉ áp cho `approved`/`completed`).
  - Nếu là `PROPOSE_REPAIR`, khi duyệt lại, `startAssetMaintenanceService` chạy thêm lần nữa trên tài sản.
  - Submit được tài liệu của khoa khác.
  - Tạo được nhiều workflow `pending` cho cùng một tài liệu.
  - Submit với `documentId` không tồn tại tạo ra instance mồ côi (`findByIdAndUpdate` trả `null` mà không báo lỗi).
- **Lưu ý:** frontend chỉ hiện nút Submit đúng lúc, nhưng backend không chặn.

#### BR-03: Tạo tài liệu tin `department` do client gửi lên.

> **[ĐÃ SỬA 2026-09-29, `DEV-092.md` + `FE-40.md`]** Chỉ được tạo cho khoa của mình. Tạo cho khoa khác cần là ADMIN hoặc có permission MỚI `DOCUMENT_CREATE_ALL_DEPARTMENTS` (user chọn). Import Excel tài liệu chưa kiểm tra phạm vi khoa (ghi nhận ở DEV-092 mục 6).

- **File:** `controllers/documents/document.controller.ts:27-32`, `services/documents/document.service.ts:76`.
- **Hiện trạng:**
  - Frontend (`DocumentCreatePage.tsx:65-87`) khoá ô khoa về đúng khoa của user khi user không có `DEPARTMENT_VIEW`.
  - Backend thì không kiểm tra lại.
  - Trong khi đó sửa tài liệu (`isSameDepartment`) và xem danh sách (`applyDepartmentFilter`) đều **đã** giới hạn theo khoa, nên hành vi không nhất quán.
- **Tác động:** gọi API trực tiếp là tạo được tài liệu vào khoa bất kỳ, và thông báo `DOCUMENT_SUBMITTED` gửi tới toàn bộ khoa đó.

### MEDIUM

#### BR-04: Mỗi request của ADMIN ghi một bản ghi audit (đo thật: 90,6% bảng audit).

> **[ĐÃ SỬA 2026-09-29, `DEV-093.md`]** Chỉ ghi `ADMIN_BYPASS` khi quyền hiệu lực của Admin không đủ, tức bypass thực sự có tác dụng. Đã đổi nhãn 9.829 bản ghi cũ từ `AUDIT_DASHBOARD_VIEW` sang `ADMIN_BYPASS` bằng migration.

- **File:** `middlewares/authorizePermission.middleware.ts::auditAdminBypass`.
- **Đo trên DB dev:**
  - **9.680 / 10.687** bản ghi `useraudits` là "ADMIN bypass", riêng 7 ngày gần nhất có **2.853** bản.
  - Các bản ghi này mang nhãn sai `AUDIT_DASHBOARD_VIEW`.
  - Mỗi lần ghi phải cập nhật **9 index**.
- **Tác động:**
  - Bảng audit phình theo số request chứ không theo số hành động, nên trang "Nhật ký audit" bị ngập log vô nghĩa.
  - Ghi thêm một lần mỗi request, tốn chi phí ghi và index.
- **Đề xuất:** bỏ, hoặc chỉ ghi các permission nhạy cảm, hoặc gộp và lấy mẫu.

#### BR-05: `memoryCache` không bao giờ xoá mục hết hạn. Ba endpoint Dashboard nhận `limit` tuỳ ý.

> **[ĐÃ SỬA 2026-09-29, `DEV-094.md`]** Cache có trần 500 mục (dọn mục hết hạn trước, rồi mới bỏ mục cũ nhất). Ba endpoint dùng `parsePaginationQuery` (tối đa 100), và khoá cache chỉ gồm tham số đã parse.

- **File:**
  - `shared/cache/memoryCache.ts`: mục hết hạn chỉ bị ghi đè khi request đúng khoá đó lần nữa.
  - `controllers/dashboard/dashboard.controller.ts:277, 291, 383`: khoá cache chứa `JSON.stringify(req.query)` và truyền thẳng `req.query`.
  - `services/dashboard/assetDashboard.service.ts:122, 166`, `workflowDashboard.service.ts:13`: `parseInt(limit)` không có giới hạn trên.
- **Tác động:**
  - Bất kỳ user có `DASHBOARD_READ` gửi `?x=<ngẫu nhiên>` là tạo thêm mục cache vĩnh viễn, RAM tăng dần.
  - `?limit=1000000` sẽ tải toàn bộ dữ liệu kèm populate.
  - `?limit=abc` cho ra `NaN`.
- **Đề xuất:** dọn mục hết hạn định kỳ và đặt giới hạn số mục; dùng `parsePaginationQuery` (có sẵn, tối đa 100) cho 3 endpoint này; chỉ đưa các tham số đã parse vào khoá cache.

#### BR-06: Khoa đã xoá mềm (DEV-086) vẫn nhận dữ liệu mới ở 10 chỗ.

> **[ĐÃ SỬA 2026-09-30, `DEV-100.md`]**
> - Cả 10 chỗ trả 400 `Khoa/phòng "X" đã bị xoá (ngừng hoạt động)`; import Excel báo lỗi theo dòng.
> - Sửa user chỉ chặn khi **đổi** sang khoa đã xoá.
> - Sửa thêm (user duyệt):
>   - không xoá được khoa còn vật tư đang hoạt động hoặc dự trù PENDING;
>   - chặn khôi phục user và vật tư vào khoa đã xoá.

- **Các chỗ tra khoa không lọc `isActive`** (`Department.findById`/`find`):
  - Tạo và sửa user: `users.service.ts:61, 248`.
  - Tạo tài liệu: `generateDocumentCode.ts:28`.
  - Tạo tài sản: `asset.service.ts:33`, `generateAssetCode.ts:19`.
  - Cấp phát/luân chuyển: `assetAssignment.service.ts:22`.
  - Vật tư: `consumableItem.service.ts:53`.
  - Dự trù vật tư: `consumableRequest.service.ts:63`.
  - Import Excel tài sản: `assetExcel.service.ts:329`.
  - Import Excel tài liệu: `departmentLookup.helper.ts:29`.
- **Tác động:** giao diện chỉ hiện khoa đang hoạt động, nhưng gọi API trực tiếp, và nhất là **import Excel** (tra theo tên/mã), sẽ âm thầm gắn dữ liệu vào khoa đã ẩn.

#### BR-07: `WorkflowInstance` thiếu index `documentId`.

> **[ĐÃ SỬA 2026-09-29, `DEV-095.md`]** Đã thêm `{documentId:1, createdAt:-1}` (không unique). Trên DB dev, `explain` xác nhận các truy vấn theo `documentId` dùng `IXSCAN`.

- **File:** `models/documents/workflowInstance.model.ts`. DB chỉ có `{status, createdAt}` và `{steps.role, createdAt}`.
- **Truy vấn bị ảnh hưởng** (đều phải quét toàn collection):
  - `loadDocument.middleware.ts:67, 91`: 2 truy vấn theo `documentId` ở **mỗi lần mở chi tiết tài liệu**, xem lịch sử phiên bản và xuất PDF.
  - `workflow.service.ts:486` (`getWorkflowByDocument`).
  - `document.service.ts:776`.
- Hiện mới 9 bản ghi nên chưa thấy chậm, nhưng mỗi tài liệu được submit thêm một bản ghi.

#### BR-08: Thiếu `app.set("trust proxy")`, trong khi kế hoạch deploy dùng Cloudflare + Nginx.

> **[ĐÃ SỬA 2026-09-29, `DEV-096.md`]** Dùng ENV `TRUST_PROXY` (số lớp proxy), mặc định tắt; giá trị `true` bị từ chối lúc khởi động. Kế hoạch deploy đã ghi `TRUST_PROXY=2` cùng cấu hình Nginx.

- **File:** `app.ts` (không có dòng này).
- **Tác động khi chạy sau proxy:**
  - `req.ip` là IP của proxy, nên rate limit đăng nhập/refresh/OTP (100 lần / 15 phút) **dùng chung cho mọi người dùng**: đủ người đăng nhập là tất cả bị chặn.
  - IP lưu ở "Phiên đăng nhập" (DEV-069) cũng sai.

#### BR-09: Múi giờ. KPI theo tháng và audit theo ngày đang gom nhóm theo UTC.

> **[ĐÃ SỬA 2026-09-29, `DEV-097.md`]**
> - Aggregation truyền `timezone: "Asia/Ho_Chi_Minh"` (6 chỗ).
> - `process.env.TZ` được cố định giờ VN lúc khởi động.
> - Sửa thêm lỗi phát hiện trong lúc làm: bộ lọc "Từ ngày/Đến ngày" (`YYYY-MM-DD`) giờ tính trọn ngày theo giờ VN, áp cho 8 chỗ.

- **Gom nhóm theo UTC** (`$month`/`$dateToString` không truyền `timezone`):
  - `dashboard.service.ts:136, 150, 253, 268, 429`.
  - `userAudits.service.ts:133`.
  - Tài liệu tạo từ 0h–7h sáng ngày mùng 1 (giờ Việt Nam) bị đếm vào tháng trước. Audit từ 0h–7h bị tính vào ngày hôm trước. Lỗi này xảy ra **bất kể server đặt ở đâu**.
- **Mốc tháng/năm theo giờ server:**
  - `document.service.ts:663` (xoá theo tháng), `assetMaintenancePlan.service.ts:195`, `dashboard.service.ts:98, 222` (đầu năm).
  - Không có `TZ` trong `.env`/`server.ts`/kế hoạch deploy. Nếu server chạy UTC, các mốc này lệch 7 giờ.
  - Các cron thì đã đặt `Asia/Ho_Chi_Minh` đúng.

#### BR-10: Thư viện phụ thuộc có 14 lỗ hổng (8 high).

> **[ĐÃ SỬA 2026-09-30, `DEV-099.md`]**
> - `npm audit fix` (không `--force`) và nâng mức tối thiểu trong `package.json` (mongoose 9.10.3, multer 2.4.0, nodemailer 9.1.1, express-rate-limit 8.7.0, morgan 1.12.1). Gỡ `@tailwindcss/vite` (backend không dùng).
> - Còn **3 moderate, user chấp nhận**:
>   - `uuid` qua `exceljs`: chỉ gọi `v4()`, không có `buf`.
>   - `nodemailer` ×2: cần bản 10.x (major); project chỉ có 1 transport và người nhận là 1 chuỗi lấy từ DB.
> - Mongoose 9.10 làm lộ 23 lỗi kiểu (filter chặt hơn). Đã sửa, chỉ ở tầng kiểu.

- `npm audit --omit=dev` báo lỗi ở các gói: `mongoose` (prototype pollution / `$nor` trong sanitizeFilter; code không dùng sanitizeFilter), `multer` (DoS), `nodemailer`, `express-rate-limit` / `ip-address`, `morgan`, `js-yaml`, `qs`, `tmp`, `brace-expansion`, `nanoid`, `body-parser`.
- Hầu hết có **bản vá không phá vỡ tương thích** (`npm audit fix`).
- Riêng `exceljs` → `uuid` chỉ vá được bằng cách hạ phiên bản (breaking). Lỗi `uuid` chỉ xảy ra khi truyền `buf`, rủi ro thực tế thấp.

#### BR-11: Xoá tài liệu theo tháng không nhất quán với xoá từng cái, và bị N+1.

> **[ĐÃ SỬA 2026-09-29, `DEV-098.md`]**
> - (a) Bỏ qua tài liệu có workflow chờ duyệt **thật** (`workflowInstanceId` + `pending`). Sửa kèm lỗi ở xoá từng cái: tài liệu chưa gửi duyệt trước đây bị chặn nhầm, vì `workflowStatus` mặc định là `"pending"`.
> - (b) Ghi 1 dòng audit tổng hợp, cùng transaction với thao tác xoá.
> - (c) Dò đề xuất còn biên bản bằng 1 truy vấn `distinct` thay cho N+1.

- **File:** `document.service.ts:639-719`.
- **Hiện trạng:**
  - (a) **Không chặn tài liệu đang có workflow pending**. Xoá từng cái thì chặn (RV05-06).
  - (b) Không ghi `UserAudit`.
  - (c) Vòng `for` gọi `countReportsByProposal` **tuần tự cho từng đề xuất**: một tháng vài trăm đề xuất là vài trăm truy vấn. Có thể thay bằng 1 aggregate.

### LOW-MEDIUM / LOW

| ID | Vấn đề | Vị trí |
|---|---|---|
| BR-12 | **[ĐÃ SỬA 2026-09-30, `DEV-101.md`: dùng `escapeRegex` ở cả 3 chỗ]** Regex dựng thẳng từ input **chưa escape**. Đây là 3 chỗ duy nhất còn sót (mọi chỗ khác đã dùng `escapeRegex`). Input như `(` gây lỗi truy vấn, và mở cửa cho regex injection. | `users.service.ts:136` (keyword), `:650-651` (tìm phiên đăng nhập) |
| BR-13 | **[ĐÃ SỬA 2026-09-30, `DEV-110.md`: TTL cho `RefreshToken` (xoá đúng lúc hết hạn) và `Notification` (90 ngày); `UserAudit` user chốt KHÔNG đặt TTL, giữ vô hạn]** `RefreshToken` không có TTL: **520/526 token đã hết hạn vẫn nằm trong DB**. `useraudits` và `notifications` không có chính sách lưu giữ. | `models/auth/refreshToken.model.ts` |
| BR-14 | **[ĐÃ SỬA 2026-09-30, `DEV-102.md`: kiểm tra OTP atomic bằng `findOneAndUpdate` + `$inc`; sửa kèm lỗi dùng 1 mã nhiều lần]** Bộ đếm sai OTP là đọc → cộng → ghi (không atomic), nên gửi song song vượt được giới hạn 5 lần. Đã được giảm thiểu nhờ rate limit 100 lần / 15 phút / IP (nhưng xem BR-08). | `auths.service.ts:323-331, 379-388` |
| BR-15 | **[ĐÃ SỬA PHẦN SỐ FILE 2026-09-30, `DEV-103.md` + `FE-41.md`: tối đa 10 file/request. Phần kiểm tra nội dung file (MIME do client khai) user chọn CHƯA làm, ghi nhận ở DEV-103 Mục 5]** Upload `uploader.array("files")` **không giới hạn số file** mỗi request (mỗi file ≤ 10MB), nên có thể làm đầy ổ đĩa. MIME type do client khai báo. | `routes/upload/upload.routes.ts:30` |
| BR-16 | Xoá vĩnh viễn tài sản không kiểm tra tham chiếu từ `Document.relatedAsset`, `Contract.assets`, lịch sử cấp phát, kế hoạch bảo trì (RV06-03 vẫn còn). | `asset.service.ts:256` |
| BR-17 | **[ĐÃ SỬA 2026-09-30, `DEV-105.md`: chỉ nạp biên bản của đúng các đề xuất được xuất]** Xuất Excel tài liệu tải **toàn bộ** biên bản CONFIRM_STATUS/CHECK_DAMAGE của cả hệ thống, dù chỉ xuất 1 khoa hoặc 1 tháng (RV08-03 vẫn còn). Tốn thêm theo năm. | `shared/helpers/buildMapReports.ts` |
| BR-18 | **[ĐÃ SỬA 2026-09-30, `DEV-104.md`: mặc định tắt, bật ở dev hoặc `ENABLE_API_DOCS=true`]** `/api-docs` (Swagger) bật vô điều kiện ở mọi môi trường (RV00-03 vẫn còn). | `app.ts:107` |
| BR-19 | **[ĐÃ SỬA 2026-09-30, `DEV-109.md`: bỏ 3 index thừa khỏi schema, xoá 7 index cũ trên DB dev bằng `scripts/migrate-drop-redundant-indexes.ts`; production cần chạy script khi deploy]** Index thừa làm chậm ghi. `useraudits`: `{user}`, `{performedBy}`, `{action}` trùng tiền tố với các index kép. `apiperformances`: 2 index `createdAt` (RV11-04). `notifications`: `{recipient}`. `documents`: `{referenceTo}`. | models tương ứng |
| BR-20 | **[ĐÃ SỬA 2026-09-30, `DEV-106.md`: 1 truy vấn `$lookup`; không log lỗi xác thực bình thường]** `authenticate` chạy 2 truy vấn mỗi request (user + populate role). Mỗi token hết hạn in `console.error` kèm stack, gây nhiễu log. | `middlewares/auth.middleware.ts` |
| BR-21 | **[ĐÃ SỬA 2026-09-30, `DEV-107.md`: cache kết quả quét 60 giây, ~40ms → ~0,2ms]** System Design đọc đồng bộ khoảng 130 file task mỗi request (chỉ admin dùng, ít gọi). | `services/systemDesign/relatedDocs.ts:39-42` |
| BR-22 | **[ĐÃ SỬA 2026-09-30, `DEV-108.md`: `catchAsync` + `ApiError`, lỗi cùng format chung; upload không kèm file → 400 thay vì 500]** Upload controller không dùng `catchAsync`/`ApiError`, response khác format chung. Express 5 đã tự chuyển lỗi async nên không bị treo request. | `controllers/upload/upload.controller.ts` |

---

## 2. Câu hỏi nghiệp vụ (UNKNOWN, cần chủ dự án quyết)

> **[2026-10-01] User quyết định: GIỮ NGUYÊN hiện trạng cho cả Q1–Q3, quy trình sẽ chỉnh sửa sau.** Không đổi code. Hành vi hiện tại đã xác minh lại trong code: duyệt/hộp chờ duyệt/thông báo chỉ theo role (không theo khoa), gửi duyệt thì kiểm tra khoa; controller tài sản/vật tư/Dashboard không lọc theo khoa của người gọi (chỉ route "tài liệu của tài sản" có lọc); `GET /workflow/:id` và `/workflow/document/:documentId` chỉ cần `WORKFLOW_VIEW`. Rủi ro còn lại: lộ dữ liệu/email giữa các khoa. Khi quy trình được chốt lại, xem bảng hướng xử lý trong phiên trao đổi (Q1 quyết định Q3 và một phần Q2).

- **Q1: Duyệt theo role trên toàn bệnh viện, không theo khoa.** Hộp chờ duyệt (`getPendingApprovalsForRole`) và thông báo/email (`notifyUsersByRoleName`) chỉ khớp theo role. Như vậy **mọi Trưởng khoa đều thấy và duyệt được tài liệu của mọi khoa**, và đều nhận email khi có tài liệu cần duyệt. Đây có phải chủ ý không?
- **Q2: Tài sản, vật tư và Dashboard không giới hạn theo khoa với USER** (RV06-04, RV07-01 vẫn còn). Đây có phải chủ ý không? Câu trả lời ảnh hưởng mức nghiêm trọng của BR-01.
- **Q3:** `GET /workflow/:id` và `/workflow/document/:documentId` chỉ cần `WORKFLOW_VIEW`, không giới hạn theo khoa. Endpoint trả về mã và tiêu đề tài liệu của khoa khác.

## 3. Hiệu năng: tổng quan

- **Quy mô dữ liệu hiện tại nhỏ.** Collection lớn nhất là `useraudits` (10,7 nghìn bản ghi, 1,8MB), trong đó 90% là log thừa (BR-04). `documents` có 278 bản ghi, `assets` có 119.
- **Điểm tốt:**
  - Các truy vấn danh sách chính đều có index phù hợp.
  - Export Excel dùng cursor + stream.
  - Tồn kho dùng transaction, và `session.withTransaction` tự thử lại khi xung đột ghi.
  - Log hiệu năng API có batch + lấy mẫu + TTL.
  - Dashboard có cache.
  - Ký PDF cache khoá, dùng pdfmake (nhẹ).
- **Rủi ro khi dữ liệu và lượng người dùng tăng, theo thứ tự ưu tiên:**
  1. BR-04: ghi thừa mỗi request của admin.
  2. BR-05: RAM của cache tăng dần.
  3. BR-07: thiếu index `documentId`.
  4. BR-11: N+1 khi xoá theo tháng.
  5. BR-17: xuất Excel tải toàn bộ biên bản.
  6. BR-20: 2 truy vấn mỗi request.
  7. Các cron cảnh báo gửi thông báo tuần tự từng mục. Chạy mỗi ngày với dữ liệu nhỏ nên chấp nhận được.

## 4. Đối chiếu review cũ (REVIEW-00 → 16): đã xác minh ĐÃ SỬA

Đã xác minh trực tiếp trong code, bảng `CODE_REVIEW_SUMMARY.md` vẫn ghi OPEN:

- **Nền tảng:** RV00-02 (lỗi 500 lộ message), RV00-05 (JWT fail-fast).
- **Auth:** RV01-01 (refresh lỗi 500), RV01-02 (refresh token lưu hash).
- **RBAC:** RV02-01 (đổi tên role thành ADMIN), RV02-03 (injection qua filter resource/action: DTO ép kiểu string).
- **Users:** RV03-01 (reset mật khẩu ADMIN), RV03-02 (ép ObjectId), RV03-03 (validate query UserAudit), RV03-04 (validate khoa).
- **Departments:** RV04-01 (chặn xoá khoa còn tài sản), RV04-04 (escape regex).
- **Documents:**
  - RV05-01 (luồng CHECK_DAMAGE), RV05-02 (thiếu `DOCUMENT_CREATE`), RV05-03 (validate query).
  - RV05-04 (giới hạn theo khoa khi đọc), RV05-05 (xoá theo tháng chuyển sang xoá mềm), RV05-07 (TOCTOU).
  - RV05-06 mới sửa cho xoá từng cái; xoá theo tháng vẫn còn (BR-11).
- **Assets:** RV06-01 (`isActive` trong whitelist), RV06-02 (escape regex), RV06-08 (VersionError → 409).
- **Import/Export:** RV08-01 (lỗi multer → 400).
- **Upload:** RV09-01 (whitelist MIME), RV09-02/03/04 (chủ sở hữu + chặn IDOR), RV09-05 (`path.basename`), RV09-06 (phân trang).
- **Notification:** RV10-01 (validate query), RV10-02 (escape HTML email).
- **Performance:** RV11-01 (permission), RV11-02 (`baseUrl`).

**Vẫn còn:**
- Đã gộp vào báo cáo này: RV00-03 (BR-18), RV01-04 (BR-13), RV06-03 (BR-16), RV08-03 (BR-17), RV11-04 (BR-19), RV05-08 (BR-07, mới một phần).
- Câu hỏi nghiệp vụ Q2: RV06-04, RV07-01.
- Chưa xác minh lại lần này: RV01-03 (chưa có refresh token rotation, xác nhận qua `auth.controller.ts:57`), RV02-02, RV07-03, RV15-*, RV16-*.

## 5. Chưa làm trong đợt này

- Không sửa code, không sửa DB.
- Chưa review frontend.
- Chưa chạy load test.
- Chưa cập nhật `review-index/CODE_REVIEW_SUMMARY.md`: nên làm trong cùng task sửa lỗi, để trạng thái OPEN/RESOLVED phản ánh đúng.

# REVIEW-15 — API CONTRACT (Implemented vs OpenAPI)

Status: DONE (review only — không sửa OpenAPI, không sửa source)
Date: 2026-08-31
Phạm vi: so sánh API **THỰC SỰ IMPLEMENTED** (đọc trực tiếp toàn bộ 15 file route + middleware chain) với **OpenAPI** (`backend/src/docs/openAPI.yaml`, 4293 dòng, 117 operation) trên 12 domain: Auth, Users, Departments, Documents, Workflow, Assets (kể cả Asset Category, Medical Device), Dashboard, Upload, Import/Export, Notification, Performance, RBAC.

**KHÔNG review lại business logic** — mọi finding về nghiệp vụ (workflow status machine, quy tắc CONFIRM_STATUS/PROPOSE_INK, transaction, race condition...) đã có ở các REVIEW-00→14, chỉ được TRÍCH DẪN khi liên quan trực tiếp tới sự khớp/lệch giữa doc và implementation, không đánh giá lại đúng/sai nghiệp vụ.

## 0. Tóm tắt điều hành

- **Tồn kho endpoint (path + method): KHỚP HOÀN TOÀN 117/117** trên cả 12 domain — không có endpoint nào implemented mà thiếu trong OpenAPI, và không có endpoint nào trong OpenAPI mà không tồn tại trong code. Đây là kết quả bất ngờ tốt so với các dự án cùng quy mô — OpenAPI của project này được duy trì rất sát code.
- **Authentication (public vs cần Bearer token): KHỚP HOÀN TOÀN** — cả 5 endpoint public (`security: []`) đều đúng chính xác 5 route không có `authenticate` middleware trong code, không thừa không thiếu.
- **Finding nghiêm trọng nhất — KHÔNG phải lệch giữa doc và code, mà là 2 bên CÙNG SAI**: 3 endpoint (`GET /api/users`, `GET /api/users/{id}`, `GET /api/documents/{id}`) dùng chuỗi permission (`USER_READ`, `USER_DETAIL`, `DOCUMENT_DETAIL`) **KHÔNG TỒN TẠI** trong `permission.constant.ts` — cả code lẫn OpenAPI đều nhất trí dùng đúng 3 chuỗi sai này, nên xét thuần theo "doc khớp code" thì đây là MATCH, nhưng bản chất là **3 endpoint không thể được cấp quyền hợp lệ cho BẤT KỲ role nào ngoài ADMIN** (ADMIN bypass qua `role.name === "ADMIN"`, không đọc permission string) — kể cả khi role IT đã được cấu hình đúng `DOCUMENT_VIEW_DETAIL` trong `rolePermission.map.ts`, quyền đó **không bao giờ khớp** với chuỗi `"DOCUMENT_DETAIL"` mà route thực sự kiểm tra. Đây là finding MỚI, chưa từng được ghi nhận ở REVIEW-03 (Users) hay REVIEW-05 (Documents) — chỉ lộ ra khi đối chiếu chéo 3 nguồn (route code, `permission.constant.ts`, OpenAPI) cùng lúc như review này.
- **3 vị trí DOCUMENTATION DRIFT đáng chú ý** (doc nói "chưa có authorizePermission", nhưng code hiện tại ĐÃ CÓ — doc bị bỏ quên sau khi code được vá): `POST /api/workflows/templates` (và ngầm định cả nhóm `/api/workflows/*`), `POST /api/export/import-proposal`, `POST /api/export/departments/sync-from-excel`. Hướng lệch này AN TOÀN hơn (làm hệ thống trông kém bảo mật hơn thực tế), nhưng vẫn cần sửa vì gây hiểu nhầm nghiêm trọng cho người đọc API docs.
- **1 nhóm DOCUMENTATION DRIFT nhỏ**: OpenAPI ghi "permission DOCUMENT_READ" ở 3 chỗ, code thực tế dùng `DOCUMENT_VIEW` (tồn tại, đúng, được gán role) — chỉ là chuỗi hiển thị trong doc sai tên, không ảnh hưởng hành vi thật.
- **1 nhóm DOCUMENTATION DRIFT hệ thống ở tầng Validation**: 13 endpoint có `validateQuery(...)` bị comment trong route (đã biết từ nhiều review trước — RV03/05/07/08/10 etc.), nhưng OpenAPI chỉ có đúng 1/13 (`GET /api/documents`) ghi chú rõ "KHÔNG thực sự được Zod validate" — 12 endpoint còn lại vẫn khai `parameters` với `schema` kiểu dữ liệu cụ thể (integer, ObjectId, date...) như thể được server validate/coerce, không có bất kỳ cảnh báo nào.

## 1. Tài liệu đã đọc trước khi review (theo yêu cầu)

- `CLAUDE.md` (đã có trong context phiên làm việc).
- `docs/00_PROJECT_MEMORY.md` (đã đọc đầy đủ ở đầu phiên — không cần đọc lại).
- `docs/05_API_ANALYSIS.md` — baseline lịch sử Phase 05: ghi nhận "116 endpoint/87 path khớp gần hoàn hảo openAPI.yaml, pagination bug 3 domain, file upload không serve qua HTTP". Số liệu hiện tại (117 endpoint sau khi thêm `PATCH /users/{id}/role` ở TASK-002) nhất quán với xu hướng "khớp gần hoàn hảo" đã ghi nhận — review này XÁC NHẬN LẠI bằng phương pháp trực tiếp (đọc từng route + đếm operation) thay vì tin lại con số cũ.
- Module review liên quan: `00_FOUNDATION`, `01_AUTH`, `02_RBAC`, `03_USERS`, `04_DEPARTMENTS`, `05_DOCUMENTS`, `06_ASSETS`, `07_DASHBOARD`, `08_IMPORT_EXPORT`, `09_UPLOAD`, `10_NOTIFICATION`, `11_PERFORMANCE`, `13_SHARED`, `14_CONFIG` — dùng để KHÔNG lặp lại finding nghiệp vụ đã có, chỉ trích dẫn khi liên quan tới trục so sánh doc/code.

## 2. OpenAPI thực tế tìm thấy

`backend/src/docs/openAPI.yaml` — OpenAPI 3.0.3, 4293 dòng, load bởi `config/swagger/swagger.ts` qua `yamljs` (đường dẫn `../../docs/openAPI.yaml`), serve tại `/api-docs`. Đây là file DUY NHẤT định nghĩa API contract — không có file OpenAPI/Swagger nào khác trong repo (đã xác nhận ở REVIEW-14).

## 3. Phương pháp

1. Trích xuất TOÀN BỘ `router.get/post/put/patch/delete(...)` từ 15 file route (đọc trực tiếp, không dùng lại kết quả review cũ) — 117 operation.
2. Trích xuất TOÀN BỘ path+method từ `openAPI.yaml` bằng parser dòng-lệnh (regex khớp `^  /path:` rồi `^    method:`) — 117 operation.
3. Diff 2 danh sách theo domain (dựa trên prefix mount ở `app.ts`).
4. Trích xuất TOÀN BỘ chuỗi permission dùng thật trong `authorizePermission("...")` (73 lượt gọi, loại trùng), diff với `Object.keys` của `PERMISSIONS` (76 permission) — 2 chiều: dùng-nhưng-không-định-nghĩa, và định-nghĩa-nhưng-không-dùng-ở-đâu.
5. Trích xuất TOÀN BỘ chuỗi `permission XXX` xuất hiện trong text OpenAPI (71 lượt, loại trùng), diff với cả 2 tập trên.
6. Kiểm tra `security: []` override trong OpenAPI so với route nào thực sự có/không có `authenticate`.
7. Grep toàn bộ `// validateQuery(...)` bị comment trong route, đối chiếu từng endpoint tương ứng trong OpenAPI có/không có ghi chú tương xứng.
8. Đọc trực tiếp 1 số block "GHI CHÚ TỪ REVIEW" đã có sẵn trong OpenAPI để xác minh còn đúng với code hiện tại hay đã lỗi thời.

## 4. Đối chiếu tồn kho endpoint theo domain (Endpoint / Method / Path)

| Domain | Mount prefix | Số endpoint implemented | Số endpoint trong OpenAPI | Kết quả |
|---|---|---|---|---|
| Auth | `/api/auths` | 6 | 6 | **MATCH** |
| Users | `/api/users` | 11 | 11 | **MATCH** |
| RBAC | `/api/rbac` | 16 | 16 | **MATCH** |
| Departments | `/api/departments` | 5 | 5 | **MATCH** |
| Documents | `/api/documents` | 8 | 8 | **MATCH** |
| Workflow | `/api/workflows` | 9 | 9 | **MATCH** |
| Assets (core) | `/api/assets` | 19 | 19 | **MATCH** |
| Medical Device | `/api/assets/medical-devices` | 6 | 6 | **MATCH** |
| Asset Category | `/api/assets/asset-categories` | 7 | 7 | **MATCH** |
| Dashboard | `/api/dashboard` | 12 | 12 | **MATCH** |
| Notification | `/api/notifications` | 5 | 5 | **MATCH** |
| Import/Export (Excel) | `/api/export` | 5 | 5 | **MATCH** |
| Upload | `/api/upload` | 4 | 4 | **MATCH** |
| User Audit | `/api/user-audits` | 3 | 3 | **MATCH** |
| Performance | `/api/performances` | 1 | 1 | **MATCH** |
| **Tổng** | | **117** | **117** | **MATCH tuyệt đối** |

Đã kiểm tra từng path cụ thể (không chỉ đếm số lượng) cho toàn bộ 15 domain — không phát hiện path nào lệch tên/segment, không phát hiện method nào bị đổi (vd GET thành POST), không phát hiện route "ẩn" nào tồn tại trong code mà thiếu hoàn toàn trong OpenAPI hay ngược lại.

**Kết luận trục Endpoint/Method/Path: MATCH toàn bộ 12 domain.**

## 5. Authentication

| Endpoint | Code có `authenticate`? | OpenAPI có `security: []` override? | Kết quả |
|---|---|---|---|
| `POST /api/auths/register` | Không | Có | MATCH |
| `POST /api/auths/login` | Không | Có | MATCH |
| `POST /api/auths/refresh-token` | Không | Có | MATCH |
| `POST /api/auths/logout` | **CÓ** | Không (kế thừa `security: [bearerAuth: []]` toàn cục) | MATCH |
| `POST /api/auths/forgot-password` | Không | Có | MATCH |
| `POST /api/auths/reset-password` | Không | Có | MATCH |

Toàn bộ 111 endpoint còn lại đều có `authenticate` trong code và không có override `security: []` trong OpenAPI (kế thừa `security: [bearerAuth: []]` khai ở top-level) — đã spot-check nhiều domain, không phát hiện endpoint nào có `authenticate` trong code nhưng lại bị OpenAPI đánh dấu public (hoặc ngược lại).

**Kết luận trục Authentication: MATCH tuyệt đối, chính xác tới từng endpoint.**

## 6. Authorization — trục có nhiều finding nhất

### 6.1. FINDING NGHIÊM TRỌNG NHẤT — 3 permission string dùng trong code (và được OpenAPI ghi lại y hệt) KHÔNG TỒN TẠI trong catalog thật (MATCH giữa doc/code, nhưng CẢ HAI CÙNG SAI so với `permission.constant.ts`)

Đã trích xuất toàn bộ 73 lượt gọi `authorizePermission("...")` thực tế trong 15 file route, diff với 76 key của `PERMISSIONS` (`shared/constants/permission.constant.ts`):

| Chuỗi permission dùng trong route | Route | OpenAPI ghi gì | Có tồn tại trong `PERMISSIONS`? | Permission ĐÚNG lẽ ra phải dùng |
|---|---|---|---|---|
| `"USER_READ"` | `GET /api/users` (`user.routes.ts:46`) | `summary: ... (permission USER_READ)` — dòng 232 | **KHÔNG** | `USER_VIEW` (tồn tại, KHÔNG được gán cho role nào ngoài không ai) |
| `"USER_DETAIL"` | `GET /api/users/{id}` (`user.routes.ts:56`) | `summary: ... (permission USER_DETAIL)` — dòng 323 | **KHÔNG** | `USER_VIEW_DETAIL` (tồn tại, KHÔNG được gán cho role nào) |
| `"DOCUMENT_DETAIL"` | `GET /api/documents/{id}` (`document.route.ts:54`) | `summary: ... (permission DOCUMENT_DETAIL)` — dòng 1072 | **KHÔNG** | `DOCUMENT_VIEW_DETAIL` (tồn tại, **ĐÃ được gán cho role IT** trong `rolePermission.map.ts`) |

- **Bằng chứng**: `scripts/seed-rbac.ts` (script seed RBAC thật, đã review ở REVIEW-13) chỉ tạo `Permission` document cho từng key trong `Object.values(PERMISSIONS)` — 3 chuỗi `USER_READ`/`USER_DETAIL`/`DOCUMENT_DETAIL` **KHÔNG BAO GIỜ được seed vào DB** dưới bất kỳ hình thức nào (không phải lỗi "quên seed", mà là "không thể seed" vì chuỗi này không nằm trong nguồn dữ liệu). Do đó, kể cả ADMIN chủ động đi vào UI RBAC và cố gán "quyền USER_READ" cho 1 role, thao tác đó KHÔNG THỂ thực hiện được vì không có `Permission` nào tên vậy tồn tại trong hệ thống.
- **Hệ quả cụ thể, đã verify chéo với `rolePermission.map.ts`**: role `IT` được cấu hình ĐÚNG với `PERMISSIONS.DOCUMENT_VIEW_DETAIL` (dòng tương ứng trong `rolePermission.map.ts`, domain Documents) — nhưng vì route thực tế kiểm tra chuỗi `"DOCUMENT_DETAIL"` (không phải `"DOCUMENT_VIEW_DETAIL"`), user role IT **KHÔNG BAO GIỜ vượt qua được** `authorizePermission("DOCUMENT_DETAIL")` dù đã được cấp đúng quyền theo thiết kế trên giấy. Chỉ ADMIN (bypass hoàn toàn qua so khớp `role.name === "ADMIN"`, không đọc permission string) mới gọi được `GET /api/documents/{id}` — nghĩa là **TRONG THỰC TẾ, không role nào ngoài ADMIN từng xem được chi tiết 1 Document qua đúng endpoint này**, kể cả khi RBAC được cấu hình "đúng" theo tài liệu thiết kế.
- Tương tự cho `GET /api/users`/`GET /api/users/{id}` — dù đây có thể là CHỦ ĐÍCH (chỉ ADMIN được xem danh sách/chi tiết user khác), điểm đáng lưu ý là: **`USER_VIEW`/`USER_VIEW_DETAIL` hiện KHÔNG được gán cho bất kỳ role nào** trong `rolePermission.map.ts` (kể cả nếu sửa đúng chuỗi permission, vẫn cần thêm bước gán quyền mới có hiệu lực cho role khác ADMIN) — nên UNKNOWN liệu đây là 2 lớp phòng thủ cố ý (permission chưa gán VÀ tên permission sai) hay 1 lỗi gõ nhầm (`USER_READ`/`USER_DETAIL`) tình cờ trùng với ý định "chỉ ADMIN mới được xem".
- **Vì sao chưa từng bị phát hiện qua REVIEW-03/REVIEW-05**: 2 review đó tập trung vào business logic/security bên trong service (NoSQL injection, ADMIN guard...), không đối chiếu chuỗi permission dùng ở route với catalog `permission.constant.ts` — đây là loại lỗi CHỈ lộ ra khi làm đúng bài tập "đối chiếu API contract" như REVIEW-15 này.
- **Phân loại theo yêu cầu**: xét thuần "doc so với code" → **MATCH** (OpenAPI copy đúng y hệt chuỗi sai từ code, cho thấy OpenAPI rất có thể được viết bằng cách đọc trực tiếp tham số `authorizePermission(...)` mà không verify chéo với `permission.constant.ts`). Nhưng đây là **bug Authorization nghiêm trọng** cần ghi nhận riêng, không thể gọi đơn thuần là "tài liệu tốt" chỉ vì khớp.
- **Confidence**: HIGH — xác nhận bằng đối chiếu trực tiếp 3 nguồn độc lập (route code, `permission.constant.ts`, `rolePermission.map.ts`), không suy đoán.

### 6.2. DOCUMENTATION DRIFT — OpenAPI ghi "permission DOCUMENT_READ", code dùng `DOCUMENT_VIEW` (LOW, CONFIRMED)

| Vị trí trong OpenAPI | Endpoint | Code thực tế dùng |
|---|---|---|
| Dòng 981 | `GET /api/documents` | `authorizePermission("DOCUMENT_VIEW")` |
| Dòng 1182 | `GET /api/documents/{proposalId}/reports` | `authorizePermission("DOCUMENT_VIEW")` |
| Dòng 1844 | `GET /api/assets/{id}/documents` | `authorizePermission("DOCUMENT_VIEW")` |

`DOCUMENT_VIEW` TỒN TẠI trong `permission.constant.ts`, ĐÚNG, được gán cho cả role IT và USER trong `rolePermission.map.ts` — chức năng hoạt động hoàn toàn bình thường. Đây THUẦN TÚY là lỗi hiển thị text trong tài liệu (`DOCUMENT_READ` có lẽ là tên gọi dự kiến ban đầu, chưa từng thực sự implement, còn sót lại trong 3 dòng summary/description). Không ảnh hưởng hành vi runtime.

### 6.3. DOCUMENTATION DRIFT — 3 cảnh báo "chưa có authorizePermission" đã LỖI THỜI, code hiện tại ĐÃ CÓ (MEDIUM, CONFIRMED — hướng lệch AN TOÀN nhưng gây hiểu nhầm)

Grep toàn bộ OpenAPI cho các cụm "GHI CHÚ TỪ REVIEW BẢO MẬT" — chỉ có đúng 4 vị trí loại này, đối chiếu từng vị trí với code THẬT hiện tại:

| Endpoint | OpenAPI nói gì (description) | OpenAPI `summary` cùng chỗ nói gì | Code thật (đọc trực tiếp route) | Kết luận |
|---|---|---|---|---|
| `POST /api/documents/proposal` | "chỉ yêu cầu `authenticate`, `authorizePermission("DOCUMENT_CREATE")` đang bị comment" | (không ghi permission trong summary) | `document.route.ts:32`: `// authorizePermission("DOCUMENT_CREATE"),` — **VẪN đang bị comment thật** | **MATCH** — ghi chú vẫn đúng hiện trạng (=RV05-02, chưa fix) |
| `POST /api/workflows/templates` | "toàn bộ nhóm route `/api/workflows/*` hiện chỉ yêu cầu `authenticate`, CHƯA gắn `authorizePermission`" | "(permission WORKFLOW_TEMPLATE_CREATE)" — **NGAY DÒNG TRÊN** | `workflow.routes.ts`: **TẤT CẢ 9 route đều có `authorizePermission(...)`** (`WORKFLOW_TEMPLATE_CREATE`, `WORKFLOW_SUBMIT`, `WORKFLOW_APPROVE`, `WORKFLOW_REJECT`, `WORKFLOW_VIEW` x3, `WORKFLOW_CANCEL`, `WORKFLOW_COMPLETE`) | **DOCUMENTATION DRIFT** — description tự mâu thuẫn với chính `summary` ngay phía trên nó trong cùng 1 endpoint |
| `POST /api/export/import-proposal` | "chỉ yêu cầu `authenticate`, KHÔNG có `authorizePermission`" | "(permission DOCUMENT_EXCEL_IMPORT)" | `excel.route.ts:22-28`: có `authorizePermission("DOCUMENT_EXCEL_IMPORT")` | **DOCUMENTATION DRIFT** — cùng dạng mâu thuẫn nội bộ |
| `POST /api/export/departments/sync-from-excel` | "chỉ yêu cầu `authenticate`, KHÔNG có `authorizePermission`" | "(permission EXCEL_DEPARTMENT_SYNC)" | `excel.route.ts:30-36`: có `authorizePermission("EXCEL_DEPARTMENT_SYNC")` | **DOCUMENTATION DRIFT** — cùng dạng mâu thuẫn nội bộ |

**Nhận xét quan trọng**: đây không chỉ là "OpenAPI cũ chưa cập nhật" thông thường — bản thân **`workflow.routes.ts` cũng có comment đầu file (dòng 28-35) tự nhận "CHỦ Ý KHÔNG THÊM `authorizePermission` ở file này trong lượt sửa này"**, dù code NGAY BÊN DƯỚI đã gắn `authorizePermission` cho toàn bộ 9 route. Nghĩa là có **3 lớp tài liệu cùng lỗi thời theo đúng 1 hướng** (comment đầu file trong chính source `workflow.routes.ts`, description trong OpenAPI, và có thể cả nhận thức của người review sau này nếu chỉ đọc comment mà không đọc kỹ từng route) — trong khi CODE THỰC TẾ đã được vá an toàn hơn nhiều so với những gì cả 2 tài liệu đó mô tả. Hướng lệch này không tạo lỗ hổng bảo mật (ngược lại, đánh giá thấp mức độ an toàn thật của hệ thống), nhưng cần sửa vì: (1) gây tốn thời gian điều tra lại cho người review sau nếu tin theo comment/doc thay vì đọc code, (2) nếu ai đó "sửa lại cho khớp comment" (xoá nhầm `authorizePermission` để "khớp" với ghi chú "chưa có") sẽ TỰ TẠO RA lỗ hổng thật từ 1 hiểu lầm tài liệu.
- **Cross-check bổ sung**: các endpoint `GET /api/workflows/pending`, `/document/{documentId}`, `/{id}`, `{id}/approve`, `{id}/reject`, `{id}/cancel`, `{id}/complete` trong OpenAPI ĐỀU ghi đúng "(permission WORKFLOW_XXX)" trong `summary` của TỪNG endpoint — nghĩa là chỉ riêng 1 khối `description` ở endpoint ĐẦU TIÊN (`/templates`) mang ghi chú lỗi thời dạng "cả nhóm", không lặp lại ở 8 endpoint còn lại — xác nhận đây là 1 đoạn text sót lại từ version cũ, không phải chủ đích áp dụng cho toàn nhóm.

### 6.4. Permission được định nghĩa nhưng KHÔNG được enforce ở bất kỳ route nào (UNKNOWN/INFO, không phải bug xác nhận được)

Diff `PERMISSIONS` (76 key) với tập permission thực sự dùng trong `authorizePermission()` (73 lượt gọi, một số trùng lặp) cho thấy 7 permission ĐỊNH NGHĨA nhưng KHÔNG BAO GIỜ xuất hiện trong bất kỳ lệnh gọi `authorizePermission()` nào:

| Permission | Ghi chú |
|---|---|
| `SYSTEM_ADMIN` | Đúng thiết kế — đây là cờ cho cơ chế bypass (`role.name === "ADMIN"`), không phải permission kiểm tra qua `authorizePermission()`. KHÔNG phải bug. |
| `USER_VIEW`, `USER_VIEW_DETAIL` | Chính là 2 permission ĐÚNG LẼ RA phải được dùng thay cho `USER_READ`/`USER_DETAIL` (xem mục 6.1) — tồn tại trong catalog nhưng chưa từng được route nào tham chiếu tới. |
| `DOCUMENT_VIEW_DETAIL` | Chính là permission ĐÚNG LẼ RA phải dùng thay `DOCUMENT_DETAIL` (xem mục 6.1) — ĐÃ được gán cho role IT nhưng vô dụng vì route không bao giờ kiểm tra đúng tên này. |
| `ASSET_DISPOSE` | Định nghĩa, có description, ĐÃ được gán cho role `PHONG_VAT_TU_TTB` trong `rolePermission.map.ts` — nhưng không route nào (`asset.routes.ts` hay bất kỳ đâu) gọi `authorizePermission("ASSET_DISPOSE")`. Comment trong `asset.service.ts:214` xác nhận đây là permission "dành cho Giai đoạn 3 (thanh lý qua workflow Document)" — có khả năng việc thanh lý hiện được kiểm soát gián tiếp qua `WORKFLOW_APPROVE` (bước duyệt Document loại thanh lý) thay vì check trực tiếp ở tầng route Asset. **UNKNOWN** — cần xác nhận với chủ dự án đây là permission CHƯA WIRE (todo) hay đã lỗi thời (nên xoá). |
| `AUDIT_VIEW_DETAIL` | Định nghĩa, có description ("Xem chi tiết 1 bản ghi audit") nhưng KHÔNG có endpoint `GET /api/user-audits/{id}` nào tồn tại trong code lẫn OpenAPI — khớp với chính comment trong `userAudit.routes.ts` xác nhận đã CHỦ ĐỘNG XOÁ 1 route chết dạng `GET /:userId` trước đây dùng permission kiểu này. **UNKNOWN nhẹ** — nhiều khả năng là permission mồ côi còn sót lại sau khi xoá route, không phải thiếu sót cần bổ sung gấp. |
| `SYSTEM_SETTING` | Định nghĩa, có description, KHÔNG route nào dùng, KHÔNG gán cho role nào trong `rolePermission.map.ts` (kể cả ADMIN cụ thể — dù ADMIN có mọi permission qua `Object.values(PERMISSIONS)` nên vẫn "có" nó về mặt dữ liệu). Có khả năng là permission dự phòng cho tính năng cấu hình hệ thống CHƯA implement. **UNKNOWN**, không phải bug. |

## 7. Validation — trục có finding hệ thống thứ 2

### 7.1. 12/13 endpoint có `validateQuery` bị comment KHÔNG được OpenAPI cảnh báo (MEDIUM, CONFIRMED)

Đã grep toàn bộ route cho `// validateQuery(...)` — 13 endpoint xác nhận query params KHÔNG thực sự được Zod validate/coerce ở tầng route (đã ghi nhận rải rác ở RV03-02, RV05-03, RV07 (không áp dụng — Dashboard đã có validate riêng), RV08, RV09, RV10-01 qua các review trước — KHÔNG re-derive nghiệp vụ ở đây, chỉ đối chiếu với OpenAPI):

| # | Endpoint | DTO bị comment | OpenAPI có cảnh báo "chưa validate" không? |
|---|---|---|---|
| 1 | `GET /api/users` | `GetUsersQueryDTO` | ❌ Không — `parameters` khai types như đã validate |
| 2 | `GET /api/documents` | `QueryDocumentDTO` | ✅ **CÓ** — dòng 983-984, ghi rõ "KHÔNG thực sự được Zod validate" |
| 3 | `GET /api/workflows/pending` | `QueryPendingApprovalsDTO` | ❌ Không |
| 4 | `GET /api/notifications` | `QueryNotificationDTO` | ❌ Không |
| 5 | `GET /api/assets` | `QueryAssetDTO` | ❌ Không |
| 6 | `GET /api/assets/{id}/assignment-history` | `QueryAssetAssignmentHistoryDTO` | ❌ Không |
| 7 | `GET /api/assets/asset-categories` | `QueryAssetCategoryDTO` | ❌ Không |
| 8 | `GET /api/rbac/permissions` | `GetPermissionsQueryDTO` | ❌ Không |
| 9 | `GET /api/rbac/roles` | `GetRolesQueryDTO` | ❌ Không |
| 10 | `GET /api/rbac/policies` | `GetPoliciesQueryDTO` | ❌ Không |
| 11 | `GET /api/user-audits` | `GetAuditLogsQueryDTO` | ❌ Không |
| 12 | `GET /api/user-audits/export` | `ExportAuditLogsQueryDTO` | ❌ Không |
| 13 | `GET /api/user-audits/dashboard` | `GetAuditDashboardQueryDTO` | ❌ Không |

Ví dụ cụ thể đã verify (`GET /api/user-audits`, dòng ~3060-3080 OpenAPI): khai `parameters` gồm `PageParam`/`LimitParam` (kiểu integer), `performedBy`/`user` (kiểu `ObjectIdRef`), `fromDate` (kiểu `date`) — trình bày y hệt như đã được server validate/coerce đúng kiểu, không có bất kỳ dòng `description`/ghi chú nào nhắc rằng `validateQuery` bị comment trong route thật. Client dựa vào OpenAPI để tích hợp có thể tin nhầm rằng gửi `page=abc` sẽ bị 400 — thực tế sẽ lọt xuống service với giá trị không hợp lệ (hành vi cụ thể ra sao là nghiệp vụ, đã có ở review khác, không nhắc lại ở đây).

**Phân loại: DOCUMENTATION DRIFT (nhóm 12 endpoint)** — OpenAPI trình bày contract "chặt" hơn thực tế đang enforce. Endpoint duy nhất xử lý đúng (`GET /api/documents`) cho thấy đây là việc HOÀN TOÀN LÀM ĐƯỢC (đã có 1 precedent tốt trong chính file này), chỉ là chưa được áp dụng nhất quán cho 12 endpoint còn lại.

### 7.2. Departments — request body chưa từng được validate ở tầng route (không phải bị comment, mà CHƯA TỪNG wire) (đối chiếu với RV04-03, không re-derive)

`POST /api/departments` và `PUT /api/departments/{id}` trong OpenAPI khai `requestBody` đầy đủ với `$ref: CreateDepartmentRequest`/tương đương, cùng response `400: BadRequest` — ngụ ý có validate schema chuẩn. Đã xác nhận lại (không phải finding mới — trích dẫn `RV04-03`, REVIEW-04): `department.routes.ts` **CHƯA TỪNG gắn `validateBody`** cho 2 route này (không phải bị comment như các trường hợp ở mục 7.1 — DTO `CreateDepartmentDTO`/`UpdateDepartmentDTO` tồn tại đầy đủ nhưng chưa từng được wire vào route từ đầu). Cùng bản chất DOCUMENTATION DRIFT như mục 7.1, xếp chung nhóm Validation.

## 8. Request Body / Response / Status code — quan sát bổ sung (không đi sâu, tránh review lại nghiệp vụ)

- Đã spot-check response schema của 1 số endpoint quan trọng (`POST /api/users`, `GET /api/departments`, `POST /api/documents/proposal`, `POST /api/workflows/{id}/complete`) — cấu trúc response (`message`/`data`/`success`) được OpenAPI mô tả khớp với format controller thực tế trả về ở các mẫu đã kiểm tra. Không phát hiện field bị đổi tên hay kiểu dữ liệu sai ở các mẫu đã spot-check.
- **Không đi sâu đối chiếu type từng field của MỌI schema cho cả 117 endpoint** — nằm ngoài khả năng review thủ công ở mức effort hợp lý cho 1 lượt review; đây là hạng mục nên làm bằng công cụ tự động (vd `openapi-diff`, hoặc test contract tự động chạy request thật rồi so schema) nếu cần độ chính xác 100%. Ghi nhận là **UNKNOWN ở mức chi tiết field-by-field**, KHÔNG phải "đã kiểm tra và không có vấn đề".
- **Status code cho lỗi runtime không mong muốn** (vd `RV01-01` — REVIEW-01: `refresh()` không bọc `jwt.verify()`, token hỏng/hết hạn có thể trả 500 thay vì 401) — đây là bug đã biết, KHÔNG re-derive ở đây, chỉ lưu ý: OpenAPI cho `POST /api/auths/refresh-token` chỉ khai `400`/`401`/`429`, không khai `500` (thông lệ phổ biến — hầu hết OpenAPI spec không khai 500 cho path cụ thể) — nên đây KHÔNG tính là "documentation drift" theo nghĩa hẹp (thiếu 500 ở mọi endpoint là chuẩn chung của cả file, không riêng gì endpoint này), chỉ là hệ quả của 1 bug nghiệp vụ đã biết khiến hành vi THẬT lệch khỏi những gì tài liệu liệt kê — đã có finding riêng ở REVIEW-01, không lặp lại.
- **Response format không đồng nhất giữa domain** (1 số response có field `success: boolean`, 1 số không — TD đã ghi nhận từ Phase 11) — OpenAPI PHẢN ÁNH ĐÚNG sự không đồng nhất này (khai `success` cho domain có, không khai cho domain không có) — nghĩa là OpenAPI trung thực với thực trạng, đây là vấn đề NHẤT QUÁN NỘI BỘ của response format (đã biết, TD), không phải drift giữa doc và code.

## 9. Bảng phân loại tổng hợp theo 12 domain

| Domain | Endpoint/Method/Path | Authentication | Authorization | Validation | Response/Status |
|---|---|---|---|---|---|
| Auth | MATCH | MATCH | N/A (không dùng RBAC) | MATCH (đã review Auth DTO ở REVIEW-01, không đổi) | MATCH (spot-check) |
| Users | MATCH | MATCH | **MATCH nhưng SAI catalog** (mục 6.1 — `USER_READ`/`USER_DETAIL`) | DOCUMENTATION DRIFT (`GET /` thiếu cảnh báo — mục 7.1) | MATCH (spot-check) |
| Departments | MATCH | MATCH | MATCH | DOCUMENTATION DRIFT (body chưa từng validate — mục 7.2, =RV04-03) | MATCH (spot-check) |
| Documents | MATCH | **MATCH nhưng SAI catalog** (`DOCUMENT_DETAIL`) + DOCUMENTATION DRIFT nhỏ (`DOCUMENT_READ`, mục 6.2) + MATCH đúng cho gap đã biết (`DOCUMENT_CREATE` comment, mục 6.3) | DOCUMENTATION DRIFT (`GET /` — NHƯNG là 1/13 endpoint DUY NHẤT có cảnh báo đúng, mục 7.1) | MATCH (spot-check) |
| Workflow | MATCH | **DOCUMENTATION DRIFT lỗi thời** (mục 6.3 — cảnh báo "chưa có authorizePermission" sai so với code hiện tại) | DOCUMENTATION DRIFT (`GET /pending` — mục 7.1) | MATCH (spot-check) |
| Assets (core+category+medical) | MATCH | MATCH (permission dùng đúng catalog ở mọi route) | DOCUMENTATION DRIFT (`GET /`, `/asset-categories`, `/:id/assignment-history` — mục 7.1); `DOCUMENT_READ` drift nhỏ ở `/:id/documents` (mục 6.2) | MATCH (spot-check) |
| Dashboard | MATCH | MATCH | MATCH (không có validateQuery bị comment ở domain này) | MATCH (spot-check) |
| Notification | MATCH | N/A (chủ đích không dùng RBAC — ownership theo `recipient`, đã ghi rõ trong cả code lẫn cần xác nhận OpenAPI có ghi chú tương tự — có, xem dưới) | DOCUMENTATION DRIFT (`GET /` — mục 7.1) | MATCH (spot-check) |
| Import/Export (Excel) | MATCH | **DOCUMENTATION DRIFT lỗi thời** (mục 6.3 — 2/5 endpoint) | MATCH (domain này không có validateQuery bị comment — chỉ có multipart file, đã review kỹ ở REVIEW-08) | MATCH (spot-check) |
| Upload | MATCH | MATCH | MATCH | MATCH (đã có finding riêng RV09-01→04 về nghiệp vụ, không phải doc/code drift) |
| RBAC | MATCH | MATCH | DOCUMENTATION DRIFT (3 endpoint `GET /permissions`, `/roles`, `/policies` — mục 7.1) | MATCH (spot-check) |
| User Audit | MATCH | MATCH (permission dùng đúng) | DOCUMENTATION DRIFT (cả 3 endpoint — mục 7.1) | MATCH (spot-check) |
| Performance | MATCH | MATCH theo nghĩa hẹp (OpenAPI không khai `security` riêng, không khai permission nào — đúng với code KHÔNG có `authorizePermission`, chỉ có `authenticate`; đây CHÍNH LÀ finding nghiệp vụ RV11-01 đã biết, không phải drift tài liệu — code và doc THỐNG NHẤT với nhau về việc thiếu permission check) | N/A | MATCH |

### Kiểm tra riêng: Notification có ghi chú "ownership theo recipient, không cần permission" trong OpenAPI không?

Đã kiểm tra: OpenAPI cho `GET /api/notifications` không có ghi chú tường minh giải thích LÝ DO thiếu permission check (khác với code — `notification.routes.ts:11-18` có hẳn đoạn comment dài giải thích đây là CHỦ ĐÍCH, ownership theo `recipient`). Đây là 1 khoảng trống tài liệu nhỏ (LOW) — OpenAPI và code cùng "khớp" về mặt HÀNH VI (không route nào yêu cầu permission), nhưng OpenAPI không giải thích được TẠI SAO cho người đọc docs bên ngoài (không có quyền đọc source code) — khác hẳn `/api/workflows`/`/api/documents/proposal` đã có hẳn 1 khối "GHI CHÚ TỪ REVIEW" giải thích rất kỹ. Ghi nhận là điểm có thể cải thiện, không phải lỗi.

## 10. Cross-reference với review khác

- Mục 6.1 (permission string không tồn tại) là finding HOÀN TOÀN MỚI, không trùng với bất kỳ finding nào ở `RV03-*` (REVIEW-03 Users) hay `RV05-*` (REVIEW-05 Documents) — cả 2 review đó không kiểm tra chuỗi permission dùng ở route đối chiếu với `permission.constant.ts`.
- Mục 6.3 liên quan trực tiếp đến `RV05-02` (REVIEW-05, `DOCUMENT_CREATE` vẫn bị comment — ĐÃ xác nhận vẫn đúng, không phải drift) nhưng làm rõ thêm: NGOÀI `DOCUMENT_CREATE` (thật sự vẫn thiếu), còn ÍT NHẤT 2 nhóm route khác (`workflows/*`, `export/import-proposal` + `export/departments/sync-from-excel`) mà tài liệu THỜI ĐIỂM ĐÓ có thể đã đúng nhưng nay đã LỖI THỜI theo hướng ngược lại (code đã được vá, tài liệu chưa cập nhật) — cần lưu ý khi đọc lại `RV05-02`/lịch sử review để không nhầm 2 loại "thiếu authorizePermission" (1 loại vẫn thật sự thiếu, 1 loại chỉ còn thiếu trong TÀI LIỆU).
- Mục 7 (Validation) tổng hợp và xác nhận LẠI (không phát hiện gì mới về mặt code) các finding `validateQuery` bị comment đã có ở `RV03-02/03`, `RV05-03`, `RV10-01`, và các route RBAC/Assets/UserAudit đã biết — giá trị tăng thêm của REVIEW-15 là xác nhận OpenAPI có/không phản ánh đúng khoảng trống này, không phải phát hiện lại chính khoảng trống.
- `RV04-03` (REVIEW-04, DTO Department chưa wire) được xác nhận lại ở mục 7.2 từ góc nhìn "OpenAPI ngụ ý có validate nhưng thực tế không".

## 11. Ghi chú ngoài phạm vi (không xử lý trong review này)

- Đối chiếu chi tiết TỪNG field trong request/response schema cho cả 117 endpoint — cần công cụ tự động hoặc test contract, ngoài khả năng review thủ công ở effort hợp lý (xem mục 8).
- Quyết định permission ĐÚNG cho `GET /api/users`/`GET /api/users/{id}` nên là gì (`USER_VIEW`/`USER_VIEW_DETAIL` hay giữ nguyên "chỉ ADMIN") — đây là quyết định nghiệp vụ/bảo mật, cần người có thẩm quyền, KHÔNG tự ý suy đoán hay sửa trong review-only này.
- Sửa OpenAPI (xoá 3 ghi chú lỗi thời ở mục 6.3, sửa `DOCUMENT_READ`→`DOCUMENT_VIEW` ở mục 6.2, thêm cảnh báo "chưa validate" cho 12 endpoint ở mục 7.1) — đều là thay đổi tài liệu, KHÔNG thực hiện theo đúng yêu cầu "Không sửa OpenAPI".
- Sửa code (đổi `USER_READ`→`USER_VIEW`, `USER_DETAIL`→`USER_VIEW_DETAIL`, `DOCUMENT_DETAIL`→`DOCUMENT_VIEW_DETAIL`, xoá comment lỗi thời đầu `workflow.routes.ts`) — KHÔNG thực hiện theo đúng yêu cầu "Không sửa source".

---
**Không có OpenAPI hay source code nào bị sửa trong quá trình review này**, đúng yêu cầu "Không sửa OpenAPI. Không sửa source. DỪNG."

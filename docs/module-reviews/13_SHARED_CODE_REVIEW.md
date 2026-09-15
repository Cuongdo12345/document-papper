# REVIEW-13 — SHARED

Status: DONE (review only, không sửa code)
Date: 2026-08-31
Scope: `backend/src/shared/{cache,constants,errors,helpers,performance,types,utils}/**` — toàn bộ 24 file, đọc đầy đủ 100%. Đối chiếu chéo với consumer thực tế ở `services/`, `middlewares/`, `scripts/` khi cần xác minh (không review sâu các file đó — chỉ dùng để xác nhận cách `shared/` được dùng).

## 1. Danh sách file đã inspect

```
cache/memoryCache.ts
constants/documentRules.ts
constants/excel.constants.ts
constants/permission.constant.ts       (đang có diff uncommitted — xem mục 7)
constants/permission.descriptors.ts
constants/rolePermission.map.ts
constants/workflow-docs.ts
errors/ApiError.ts
errors/errorHandler.ts
helpers/auth.helper.ts
helpers/buildMapReports.ts
helpers/departmentLookup.helper.ts
helpers/generate-code.ts
helpers/generateAssetCode.ts
helpers/importHeaderValidator.helper.ts
helpers/importStatus.helper.ts
helpers/parse-doc.ts
helpers/passwordReset.template.ts
performance/performanceLogBuffer.ts
types/express.d.ts
utils/Mongoid.util.ts
utils/Policycondition.evaluator.ts
utils/Queryparsing.util.ts
utils/catchAsync.ts
utils/formatDate.ts
utils/formatFileSize.ts
utils/generateDocumentCode.ts
utils/getNext.ts
utils/mailer.ts
utils/withTransaction.ts
```

Đối chiếu chéo bên ngoài `shared/` (để xác nhận consumer, KHÔNG phải review sâu các file này):
`backend/scripts/seed-rbac.ts`, `backend/src/services/documents/documents.validator.ts`, `backend/src/services/dashboard/{dashboard,medicalDeviceDashboard}.service.ts`, `backend/src/middlewares/{auth,error}.middleware.ts`, `backend/src/services/auth/auths.service.ts`.

## 2. Tổng quan kiến trúc thư mục `shared/`

`shared/` đóng vai trò cross-cutting library dùng chung cho toàn bộ domain (`documents`, `assets`, `users`, `rbac`, `excel`, `dashboard`...). Không có barrel/`index.ts` tổng — mỗi consumer import trực tiếp từng file, đây là lựa chọn hợp lý ở quy mô hiện tại (tránh 1 file trung tâm phải biết hết mọi export).

**Quy ước đặt tên KHÔNG nhất quán (LOW, Maintainability):** hầu hết file dùng `camelCase.ts` (`memoryCache.ts`, `getNext.ts`, `catchAsync.ts`...) nhưng 2 file dùng `PascalCase` (`Mongoid.util.ts`, `Policycondition.evaluator.ts`, `Queryparsing.util.ts` — 3 file, tất cả trong `utils/`). Không ảnh hưởng chức năng, chỉ là điểm không đồng bộ style dễ nhận thấy khi liệt kê thư mục.

## 3. Duplicate utilities

### FINDING #1 — `runPaginatedAggregate` bị viết TRÙNG LẶP thay vì tái dùng bản dùng chung (MEDIUM, CONFIRMED)

- File nguồn dùng chung: `backend/src/shared/utils/Queryparsing.util.ts:120-142`, hàm `runPaginatedAggregate(model: Model<any>, basePipeline, pagination)` — đã được thiết kế tổng quát, nhận `model` làm tham số CHÍNH XÁC để mọi domain tái dùng được (comment tại chỗ ghi rõ: "Gộp pattern 'chạy pipeline 2 lần'... từng lặp lại ở mọi service phân trang").
- Observed:
  - `backend/src/services/dashboard/medicalDeviceDashboard.service.ts:21,204` — import và dùng ĐÚNG bản dùng chung này.
  - `backend/src/services/dashboard/dashboard.service.ts:66-91` — tự định nghĩa lại 1 hàm `runPaginatedAggregate` cục bộ, logic giống hệt 100% bản dùng chung (cùng dùng `$facet`/`$sort`/`$skip`/`$limit`/`$count`, cùng công thức `totalPages`), chỉ khác duy nhất: hard-code `Document.aggregate(...)` thay vì nhận `model` làm tham số — đúng chỗ mà bản dùng chung đã tổng quát hoá sẵn để tránh việc này. Được gọi lại ở 4 chỗ trong cùng file (dòng 352, 407, 475, 540).
- Impact: 2 nguồn implementation cho cùng 1 logic phân trang — sửa bug/tối ưu ở 1 nơi (vd đổi field trả về `totalCount` key, thêm `collation`, thêm giới hạn `maxTimeMS`...) không tự động áp dụng cho nơi còn lại. Đây chính là finding đã được ghi nhận từ góc nhìn "trong file" ở `RV07-04` (REVIEW-07 Dashboard, "2 pattern `runPaginatedAggregate` song song") — review này xác nhận thêm: bản dùng chung ở `shared/utils/` ĐÃ tồn tại và ĐÃ được thiết kế đúng để dùng chung, `dashboard.service.ts` chỉ đơn giản là chưa migrate sang dùng nó (không phải thiếu utility, mà là utility có sẵn nhưng bị bỏ qua).
- Confidence: HIGH.

### Cận-trùng lặp đã được NGĂN CHẶN bằng comment cảnh báo (ghi nhận, không phải bug)

Cả `utils/catchAsync.ts` và `utils/mailer.ts` đều có comment tự cảnh báo kiểu "nếu project đã có sẵn 1 file tương tự, dùng lại bản đó thay vì file này":
- `catchAsync.ts:7-10`: đã verify — **không có bản `catchAsync` nào khác trong `backend/src`** (grep toàn bộ `src/`, chỉ 1 định nghĩa). Không phải finding, nhưng đáng ghi nhận: comment thể hiện code được viết trong điều kiện KHÔNG chắc chắn đã rà soát hết codebase tại thời điểm viết — may mắn không dẫn tới trùng lặp thật ở đây, khác với trường hợp Finding #1 (nơi rà soát đã không được thực hiện đến nơi đến chốn).
- `mailer.ts:17-19`: đã verify — **không có `nodemailer.createTransport` nào khác trong `backend/src`**, đây là mailer duy nhất. Không phải finding.

### Không phát hiện trùng lặp ở các nhóm còn lại

`ApiError`, `withTransaction`, `getNextSequence`, `toOptionalObjectId`, `parsePaginationQuery`/`parseOptionalDate`, `PolicyConditionParser` — mỗi hàm có đúng 1 nơi định nghĩa, được tái dùng đúng cách ở nhiều domain khác nhau (`generateDocumentCode.ts` và `generateAssetCode.ts` cùng gọi chung `getNextSequence`, không tự viết lại logic Counter).

## 4. Circular dependencies

Đã dựng lại đồ thị import NỘI BỘ `shared/` (`grep` toàn bộ import tương đối giữa các file trong 7 thư mục): mọi cạnh đều đi 1 chiều vào `errors/ApiError.ts` (leaf, không import gì từ `shared/` khác) hoặc `utils/getNext.ts` — **không phát hiện chu trình (cycle) nào**. Ví dụ: `constants/rolePermission.map.ts` → `constants/permission.constant.ts` (1 chiều, permission.constant.ts không import ngược lại).

Cũng kiểm tra chiều `models/` ↔ `shared/`: nhiều file `shared/helpers|utils` import model (`Department`, `Document`, `Counter`) — hướng đi ĐÚNG (shared phụ thuộc model, không phải ngược lại). Grep toàn bộ `models/**` tìm import từ `shared/` → **không có kết quả nào** — models không phụ thuộc ngược vào `shared/`, nên không có cycle 2 tầng này.

Kết luận: **không có circular dependency** trong phạm vi đã review.

## 5. Global state

3 module-level mutable state được xác nhận trong `shared/`, cả 3 đều CÓ CHỦ ĐÍCH và có comment giải thích rõ giới hạn:

| File | State | Giới hạn đã tự ghi nhận trong code |
|---|---|---|
| `cache/memoryCache.ts:28` | `const cache = new Map<string, CacheEntry<unknown>>()` | Cache TRONG RAM CỦA 1 PROCESS — không đồng bộ giữa nhiều instance nếu scale ngang (comment ghi rõ, cùng dạng với `services/rbac/permission.cache.ts` ngoài phạm vi review này) |
| `performance/performanceLogBuffer.ts:43-44` | `let buffer: PerformanceLogEntry[]`, `let flushTimer` | Buffer trong RAM, chấp nhận mất vài bản ghi performance nếu crash giữa 2 lần flush (log phụ trợ, không phải nghiệp vụ chính) — đã review chi tiết ở RV11-06 (REVIEW-11), tại đây chỉ xác nhận lại đúng vị trí thuộc `shared/` |
| `utils/mailer.ts:21` | `let transporter: Transporter \| null = null` | Singleton connection pool SMTP — đúng pattern chuẩn cho nodemailer, tránh mở nhiều pool song song |

**Không phát hiện global state nào KHÔNG có chủ đích** (không có biến module-level nào bị "quên" không lý do). `getOrSetCache` (mục cache) tự nhận trong comment: nhiều request cache-miss đồng thời sẽ gọi `compute()` riêng lẻ (không coalescing) — đây là hạn chế đã biết, chấp nhận được, không phải bug.

**Ghi chú liên quan (INFO, không phải finding riêng của `shared/`):** `constants/permission.descriptors.ts:157-176` chạy code tự-validate (so sánh `PERMISSIONS` vs `PERMISSION_DESCRIPTORS`, `throw` nếu lệch) NGAY LÚC MODULE ĐƯỢC IMPORT (side-effect ở top-level, không nằm trong hàm) — đây là dạng "hidden execution at import time" cần lưu ý khi đọc code (không thấy được logic này nếu chỉ xem cách file được gọi), nhưng bản thân cơ chế guard là hợp lý. Vấn đề thực tế của cơ chế này nằm ở mục 8 (Hidden business logic) — vì nó **không hề chạy** trong luồng thật.

## 6. Cache correctness

`memoryCache.ts` (`getOrSetCache`/`clearCacheKey`/`clearCacheByPrefix`/`clearAllMemoryCache`):

- Logic TTL đúng: so `Date.now() < entry.expiresAt` trước khi trả cache, tính lại + `cache.set` khi miss/hết hạn — không có off-by-one hay lỗi so sánh.
- `clearCacheByPrefix` duyệt `cache.keys()` rồi `delete` ngay trong vòng lặp cùng lúc — **AN TOÀN** với `Map` trong JS (xoá key hiện tại trong lúc `for...of` trên `Map.keys()` không làm hỏng iterator, khác với xoá phần tử đang duyệt của `Array` bằng index) — không phải bug.
- Đã đối chiếu với REVIEW-07 (RV07-03): `clearCacheByPrefix`/`clearCacheKey` **có tồn tại và đúng cú pháp** nhưng **KHÔNG được gọi ở bất kỳ đâu** trong `dashboard.service.ts` (nơi duy nhất dùng `getOrSetCache`) — nghĩa là cache dashboard hiện chỉ hết hạn tự nhiên theo TTL 30s, không bao giờ bị invalidate chủ động khi có ghi dữ liệu (import Excel hàng loạt, bulk update). Đây là finding đã ghi nhận ở REVIEW-07 phía consumer; xác nhận lại từ phía `shared/` rằng bản thân 2 hàm invalidate được viết ĐÚNG, vấn đề nằm ở việc KHÔNG được gọi, không phải cache logic sai.
- Không phát hiện memory-leak rõ ràng: `Map` chỉ phình to theo số lượng `key` cache khác nhau (hữu hạn theo số tổ hợp filter dashboard thực tế dùng), không có cơ chế xoá entry hết hạn chủ động (entry hết hạn chỉ bị ghi đè khi đúng key đó được gọi lại) — ở quy mô cache dashboard hiện tại (vài chục key) không đáng lo, nhưng về lý thuyết nếu key được sinh động (vd nhúng theo từng userId) sẽ phình vô hạn. Hiện tại (đã xác nhận ở REVIEW-07) key cache dashboard là cố định theo endpoint+filter, không theo user — rủi ro này KHÔNG áp dụng ở cách dùng thực tế hiện có.

## 7. Duplicate data / lệch đồng bộ — `permission.descriptors.ts` (MEDIUM-HIGH, CONFIRMED — finding nổi bật nhất của review này)

**Bối cảnh:** `constants/permission.constant.ts` đang có 1 diff CHƯA COMMIT tại thời điểm review (thêm `USER_ASSIGN_ROLE`, TASK-002).

**Phát hiện chuỗi 3 lớp:**

1. **`permission.descriptors.ts` là dead code hoàn toàn (KHÔNG ai import).** Grep toàn bộ `backend/` cho `permission.descriptors`/`PERMISSION_DESCRIPTORS` — kết quả DUY NHẤT là chính file này tự tham chiếu (`import { PERMISSIONS } from "./permission.constant"` ở dòng 38 và tự dùng ở phần validate cuối file). Không route/controller/service/script nào import `PERMISSION_DESCRIPTORS`.

2. **Header comment của file (dòng 1-36) mô tả sai vai trò thực tế của nó.** Nguyên văn: *"từ nay nếu ai thêm permission mới vào `permission.constant.ts` mà quên khai ở đây, `npm run seed:rbac` sẽ báo lỗi ngay, không để lọt tới production."* — Điều này **KHÔNG ĐÚNG với source hiện tại**: `backend/scripts/seed-rbac.ts` (bản thật đang active, dòng 146-456; bản cũ hơn ở dòng 1-144 đã bị comment nguyên khối) **không hề import** `permission.descriptors.ts` — nó tự định nghĩa 1 cấu trúc dữ liệu KHÁC hoàn toàn: `PERMISSION_DESCRIPTIONS: Record<string, string>` (dòng 205-315 của `seed-rbac.ts`), độc lập 100% với `PERMISSION_DESCRIPTORS` (mảng `{name, resource, action, description}`). Đây là 2 nguồn "mô tả permission" song song, không liên thông, một cái đang thực sự chạy (trong `seed-rbac.ts`) và một cái đã bị bỏ quên (`permission.descriptors.ts`), nhưng comment file bị bỏ quên vẫn khẳng định nó đang bảo vệ hệ thống.
   - Không có cách nào phân biệt bằng cách đọc riêng `permission.descriptors.ts` rằng nó đã "chết" — phải đọc chéo sang `seed-rbac.ts` mới phát hiện ra. Đây đúng dạng "hidden business logic" mà đề bài yêu cầu review: 1 cơ chế an toàn tưởng như đang hoạt động (và được document rất chi tiết, thuyết phục) nhưng thực chất không được kích hoạt.

3. **Hệ quả cụ thể ngay lúc này:** vì `USER_ASSIGN_ROLE` (đang uncommitted trong `permission.constant.ts`) đã được thêm đúng cách vào `PERMISSION_DESCRIPTIONS` của `seed-rbac.ts` (dòng 215: `USER_ASSIGN_ROLE: "Gán role cho người dùng..."`) NHƯNG **CHƯA được thêm vào mảng `PERMISSION_DESCRIPTORS`** trong `permission.descriptors.ts` (đã đọc toàn bộ mảng — không có dòng nào cho `USER_ASSIGN_ROLE`). Guard tự-kiểm tra ở cuối `permission.descriptors.ts` (dòng 160-176) SẼ throw `Error` ngay lập tức **NẾU CÓ BẤT KỲ AI/FILE NÀO import file này trong tương lai** — nhưng vì hiện tại không ai import, lỗi này nằm im, không hiển lộ, không chặn được gì (đúng như tình huống mà chính comment ở đầu file mô tả là ĐÃ được ngăn chặn — thực tế thì KHÔNG).
- Impact: (a) 2 nguồn dữ liệu mô tả permission trùng lặp nội dung, khác cấu trúc, phải sửa tay ở CẢ 2 nơi mỗi khi thêm permission mới (thực tế: người thêm `USER_ASSIGN_ROLE` đã sửa `seed-rbac.ts` — đúng chỗ được dùng thật — nhưng bỏ sót `permission.descriptors.ts`, đúng là hệ quả tự nhiên của việc tồn tại 2 nguồn song song); (b) tài liệu trong code (comment) đưa ra lời hứa an toàn sai sự thật, có thể khiến người review sau này chủ quan tin rằng cơ chế chống lệch dữ liệu đã được đảm bảo.
- Confidence: HIGH (xác nhận trực tiếp bằng đọc toàn bộ nội dung 2 file + grep toàn repo, không suy đoán).
- Khuyến nghị (KHÔNG thực hiện trong review này): hoặc (1) xoá hẳn `permission.descriptors.ts` nếu `resource`/`action` structured descriptor không còn cần cho mục đích nào, hoặc (2) wire nó vào `seed-rbac.ts` thay cho `PERMISSION_DESCRIPTIONS` cục bộ (hợp nhất về 1 nguồn), và trong cả 2 trường hợp đều cần bổ sung `USER_ASSIGN_ROLE` nếu giữ lại file. Quyết định thuộc về người có thẩm quyền, ngoài phạm vi "chỉ review" của REVIEW-13.

## 8. Error hierarchy

- **Đơn giản, phẳng, nhất quán:** đúng 1 class lỗi tuỳ chỉnh trong toàn bộ `backend/src` — `ApiError extends Error` (`errors/ApiError.ts`) — xác nhận bằng grep `extends Error`/`extends ApiError` toàn `src/`, không có class lỗi domain-specific nào khác (không có `ValidationError`, `NotFoundError` con cháu riêng). Static factory method (`badRequest`/`unauthorized`/`forbidden`/`notFound`/`conflict`/`internal`/`tooManyRequests`) đủ cho toàn bộ nhu cầu hiện có, không over-engineer.
- **`errorHandler.ts` (dead code đã tự đánh dấu @deprecated) — xác nhận lại, không phải finding mới:** file này KHÔNG được `app.ts` import (đã verify: chỉ có `middlewares/error.middleware.ts` được wire làm global handler). Chính file `errorHandler.ts` đã tự ghi chú rõ đây là "footgun" tiềm ẩn (2 file cùng tên export `errorHandler`, rủi ro IDE auto-import nhầm) và đã tự thêm `console.warn` phòng vệ nếu vô tình bị gọi lại — cách xử lý hợp lý cho tình huống chưa dám xoá hẳn. Không lặp lại thành finding riêng vì đã tự nhận diện đầy đủ trong chính code, chỉ xác nhận nó vẫn đúng hiện trạng.
- **`ApiError.details?: any`** — kiểu `any` cho field vốn dùng để trả chi tiết lỗi validate ra client (`middlewares/error.middleware.ts:76`: `...(err.details && { details: err.details })`) — không có ràng buộc cấu trúc, mỗi call site tự quyết định shape của `details` (có nơi truyền `{ mismatches }`, có nơi không truyền gì). Đây là điểm type-safety yếu nhưng CHẤP NHẬN ĐƯỢC cho 1 field lỗi hiển thị tự do — không phải bug, chỉ ghi nhận (LOW).

## 9. Type safety

- **`types/express.d.ts` — `req.user.permissions: string[]` không phản ánh đúng vòng đời 2 giai đoạn của field này (LOW, CONFIRMED).** Xác nhận tại `backend/src/middlewares/auth.middleware.ts:58`: `authenticate` luôn set `permissions: []` (comment ngay tại chỗ: "để authorize xử lý sau"), giá trị thật chỉ được điền bởi `authorizePermission.middleware.ts` (chạy SAU, ngoài phạm vi review này) chạy sau đó trong cùng request. Type khai báo `string[]` không phân biệt được 2 trạng thái này — code đọc `req.user.permissions` ở bất kỳ đâu GIỮA 2 middleware (về lý thuyết, nếu có middleware xen giữa) sẽ compile qua nhưng nhận `[]` rỗng, không có cách nào để TypeScript cảnh báo. Rủi ro thấp vì thực tế 2 middleware luôn chạy liền kề trong mọi route hiện có (không xác minh được điều này cho MỌI route trong phạm vi review này — ngoài scope).
- **`utils/Mongoid.util.ts`, `utils/Queryparsing.util.ts`, `utils/Policycondition.evaluator.ts`, `utils/generateDocumentCode.ts`, `helpers/generateAssetCode.ts`** — đều có kiểu tham số/trả về tường minh, không dùng `any` cho input/output chính (chỉ dùng `any` cục bộ cho AST node nội bộ của `Policycondition.evaluator.ts`, chấp nhận được vì đây là interpreter tự viết, ép kiểu AST chặt hơn sẽ over-engineer so với nhu cầu).
- **`helpers/departmentLookup.helper.ts:33`, `helpers/buildMapReports.ts:13`** — trả về `Map<string, any>` (giá trị là document Mongoose thô) — chấp nhận được vì đây là internal helper, không phải public API/DTO.
- Không phát hiện lỗi type khiến sai lệch runtime (không có `as any` để né lỗi thật, các chỗ dùng `any` đều có lý do ghi chú rõ trong comment).

## 10. Hidden business logic

Business rule thật sự đáng chú ý nằm rải rác trong `constants/` — không phải bug nhưng CẦN đọc kỹ vì ảnh hưởng luồng nghiệp vụ nếu sửa nhầm:

- **`constants/documentRules.ts`** — bảng ánh xạ `DocumentSubType → {category, requireReference, referenceSubType}` là nguồn sự thật DUY NHẤT cho việc 1 loại giấy có bắt buộc tham chiếu hay không, và tham chiếu tới loại nào. Đã đối chiếu: `CONFIRM_STATUS.referenceSubType = PROPOSE_INK` — xác nhận ĐỘC LẬP LẦN THỨ 3 (sau `RV07-05` ở Dashboard và `RV08-06` ở Excel import/export) rằng bảng này NHẤT QUÁN với 2 domain khác, càng củng cố kết luận đã có ở `RV05-01` (REVIEW-05): lỗi mismatch `PROPOSE_REPAIR` nằm ở `workflow.service.ts:syncAssetOnDocumentApproved`, KHÔNG phải ở `documentRules.ts`. `Record<DocumentSubType, ...>` là kiểu TypeScript exhaustive (bắt buộc đủ mọi key của enum tại compile-time) — xác nhận không thể có `DocumentSubType` nào bị thiếu rule mà không gây lỗi biên dịch, cơ chế tự-đảm bảo tốt.
- **`constants/permission.constant.ts` + `rolePermission.map.ts`** — đây thực chất LÀ bảng phân quyền RBAC của toàn hệ thống dưới dạng "constants". `rolePermission.map.ts` chứa quyết định nghiệp vụ tinh vi (comment tại chỗ giải thích rõ từng trường hợp CỐ TÌNH không cấp quyền — vd `ASSET_DELETE_PERMANENT`/`ASSET_CATEGORY_DELETE_PERMANENT` cố tình không gán cho IT, `WORKFLOW_TEMPLATE_CREATE` cố tình không gán cho IT) — đây là dạng "logic nghiệp vụ ẩn trong data" đúng nghĩa: đọc code (`authorizePermission.middleware.ts`, ngoài phạm vi review) sẽ không thấy được các quyết định này, phải đọc đúng file constant mới hiểu được "ai được làm gì và tại sao". Đánh giá: đây là cách làm ĐÚNG cho loại dữ liệu này (bảng cấu hình tĩnh, có comment giải thích từng quyết định) — không phải finding, chỉ lưu ý cho người đọc review.
- **`workflow-docs.ts` + phần cuối `documents.validator.ts`** — xem mục 11 (Dead code), đây là ví dụ "hidden business logic" ĐÃ LỖI THỜI: `DOCUMENT_STATUS = PENDING/IN_PROGRESS/DONE` không khớp bất kỳ field nào còn tồn tại trong `Document` model hiện tại (model dùng `workflowStatus`, luồng trạng thái thật chạy qua `workflow.service.ts`) — nhưng file vẫn được `import` (dù hàm dùng nó là dead code) nên VẪN xuất hiện trong kết quả tìm kiếm "ai dùng constant này", dễ gây nhầm lẫn cho người mới đọc code tưởng đây là luồng trạng thái đang chạy thật.
- **Mục 7 ở trên (`permission.descriptors.ts`)** là finding "hidden business logic" nổi bật nhất: 1 cơ chế validate tưởng đang bảo vệ hệ thống (và được document rất tự tin) nhưng thực chất không được kích hoạt.

## 11. Dead code / code chết dạng comment (Maintainability)

Tiếp tục đúng pattern đã ghi nhận lặp lại ở nhiều review trước (`RV05-09`, `RV06-05`, `RV08-07` — code chết bị COMMENT NGUYÊN KHỐI thay vì xoá hẳn), `shared/` có thêm ít nhất 4 vị trí cùng dạng:

| File | Dòng | Nội dung bị comment |
|---|---|---|
| `helpers/importHeaderValidator.helper.ts` | 74-103 | Bản cũ của `validateImportHeaderRow` (trước khi thêm tham số `columns` tuỳ chọn cho Asset import) |
| `helpers/parse-doc.ts` | 136-219 | Bản cũ (không throw validate) của `parseInspectionJSONLike`/`buildInspectionText` |
| `utils/formatDate.ts` | 96-129 | Bản cũ (không có `parseExcelDateStrict`) của `parseExcelDate` |
| `helpers/generate-code.ts` | 1-8 | Bản cũ (không validate rỗng) của `generateDepartmentCode` |

Không phát hiện block code chết LỚN (hàng trăm dòng) như ở `workflow.service.ts`/`assetAssignment.service.ts`/`excel.service.ts` — các block ở `shared/` đều nhỏ (dưới 90 dòng/file), nhưng số lượng vị trí (4/24 file, ~17%) cho thấy đây là thói quen viết code phổ biến trong toàn dự án, không riêng 1 module. Ghi nhận (LOW-MEDIUM, tổng hợp) — không lặp lại thành finding riêng cho từng file, gộp chung 1 mục vì cùng bản chất và cùng múc độ rủi ro thấp (không ảnh hưởng runtime, chỉ ảnh hưởng khả năng đọc/audit code).

`scripts/seed-rbac.ts:1-144` cũng cùng dạng (toàn bộ phiên bản đầu bị comment, bản thật nằm từ dòng 146 trở đi) — ghi nhận vì được đọc chéo trong review này, dù `scripts/` nằm ngoài phạm vi `shared/`.

**`helpers/parse-doc.ts:1-3`** — comment đầu file thể hiện SỰ KHÔNG CHẮC CHẮN về đường dẫn import của chính file đang đọc ("chưa xác nhận được path chính xác trong phạm vi các file đã đọc") — đã verify: `buildMapReports.ts` import đúng qua `"../helpers/parse-doc"` và hoạt động bình thường (đường dẫn đúng). Comment này không sai về mặt kỹ thuật hiện tại nhưng là dấu hiệu code được viết/sửa bởi ai đó (người hoặc AI) không có đủ ngữ cảnh toàn repo tại thời điểm viết — LOW, chỉ là nhiễu comment, không phải bug.

## 12. Coupling

- **`shared/` → `models/`**: nhiều file (`buildMapReports.ts`, `departmentLookup.helper.ts`, `generateAssetCode.ts`, `generateDocumentCode.ts`, `documents.validator.ts` phía consumer) import trực tiếp Mongoose model. Đây là coupling CÓ CHỦ ĐÍCH và hợp lý cho 1 backend Express+Mongoose cỡ vừa — tách thêm 1 tầng repository/interface sẽ là over-engineering không cần thiết ở quy mô này (đúng nguyên tắc "No Over-Engineering" của CLAUDE.md §12).
- **Điểm coupling đáng chú ý nhất: `helpers/` vs `utils/` không có ranh giới rõ ràng.** `generateAssetCode.ts` (sinh mã tài sản, dùng Counter) nằm ở `helpers/`, trong khi `generateDocumentCode.ts` (sinh mã tài liệu, CÙNG PATTERN, cùng gọi chung `getNextSequence`, comment cấu trúc gần như giống hệt nhau) lại nằm ở `utils/`. Tương tự, `auth.helper.ts` (sinh JWT/hash token — thiên về "utility thuần" không phụ thuộc model) nằm ở `helpers/`, trong khi `Mongoid.util.ts`/`Queryparsing.util.ts` (thiên về business validation, có domain logic) nằm ở `utils/`. Không tìm thấy quy tắc phân biệt nào giữa 2 thư mục (`helpers/` = ? , `utils/` = ?) — nhiều khả năng chỉ là lựa chọn tuỳ thời điểm của người viết từng file. (LOW-MEDIUM, Maintainability) — không phải lỗi chức năng, nhưng khiến người mới cần tìm 1 hàm phải tra CẢ 2 thư mục thay vì đoán được vị trí theo quy ước.
- Không phát hiện coupling ngược nguy hiểm nào (`shared/` không phụ thuộc `services/`/`controllers/`/`routes/` — đã verify bằng grep, đúng nguyên tắc lớp dưới không phụ thuộc lớp trên).

## 13. Bảo mật — phát hiện thêm 1 điểm cùng lớp với finding đã biết (MEDIUM, CONFIRMED)

**`helpers/passwordReset.template.ts` — HTML injection qua `fullName` chưa escape**, cùng loại lỗ hổng đã ghi nhận ở `RV10-02` (REVIEW-10 Notification, file `notification.service.ts`), nhưng ở 1 file KHÁC chưa từng được liệt kê:

- File/Function: `buildPasswordResetEmail()` (`helpers/passwordReset.template.ts:6-43`), gọi từ `services/auth/auths.service.ts:384-387` với `fullName: user.fullName`.
- Observed: `fullName` (dữ liệu do user/admin nhập khi tạo/sửa tài khoản, nằm ngoài phạm vi review này để xác nhận có validate ký tự đặc biệt hay không) được nội suy trực tiếp vào chuỗi HTML (`<p>${greeting}</p>` với `greeting = fullName ? \`Xin chào ${fullName},\` : ...`) không qua bất kỳ hàm escape HTML nào, rồi email này được gửi thật qua `sendMail()` (`utils/mailer.ts`).
- Impact: nếu `fullName` của 1 user chứa markup HTML (vd `<img src=x onerror=...>`), email reset password gửi tới CHÍNH user đó (không phải tới nạn nhân khác — đây là email gửi cho chủ tài khoản dùng `fullName` của chính họ) sẽ chứa HTML/script được render bởi mail client — mức độ rủi ro thực tế THẤP HƠN so với `RV10-02` (nơi `title`/`message` của Document do 1 user tạo có thể ảnh hưởng tới email gửi cho NGƯỜI KHÁC qua notification broadcast) vì ở đây kẻ tấn công (nếu tự đặt `fullName` độc hại) chỉ tự ảnh hưởng tới email của chính mình — trừ khi có 1 luồng khác cho phép user A đặt `fullName` hiển thị trong email gửi cho user B (KHÔNG xác nhận được trong phạm vi review này, UNKNOWN).
- Confidence: MEDIUM (lỗ hổng kỹ thuật CONFIRMED bằng đọc code trực tiếp; mức độ khai thác thực tế phụ thuộc luồng validate `fullName` ở module Users — ngoài phạm vi `shared/`, đã review ở REVIEW-03 nhưng không phát hiện việc escape HTML tại đó).
- Khuyến nghị (không thực hiện): áp dụng cùng hướng xử lý đã đề xuất ở `RV10-02` (escape HTML entity cho mọi biến nội suy vào template email) cho cả 2 file cùng lúc, vì cùng 1 lớp lỗ hổng.

## 14. Tổng hợp finding

| # | Mức độ | Hạng mục | Tóm tắt |
|---|---|---|---|
| 1 | MEDIUM-HIGH | Duplicate data + Hidden business logic | `permission.descriptors.ts` là dead code (không ai import) nhưng comment khẳng định sai rằng nó đang được `seed-rbac.ts` dùng để chống lệch dữ liệu; `seed-rbac.ts` thực tế dùng 1 map mô tả permission RIÊNG, độc lập, đã đúng bộ (có `USER_ASSIGN_ROLE`) trong khi `permission.descriptors.ts` bị bỏ sót `USER_ASSIGN_ROLE` — nếu file này từng được import, sẽ crash ngay do chính guard tự viết |
| 2 | MEDIUM | Duplicate utilities | `dashboard.service.ts` tự viết lại `runPaginatedAggregate` thay vì dùng bản dùng chung tổng quát hơn ở `shared/utils/Queryparsing.util.ts` (đã được thiết kế đúng để tái dùng — đối chứng: `medicalDeviceDashboard.service.ts` dùng đúng cách); củng cố thêm cho `RV07-04` |
| 3 | MEDIUM | Security (HTML injection) | `passwordReset.template.ts` nội suy `fullName` vào HTML email không escape — cùng lớp lỗ hổng với `RV10-02`, phạm vi ảnh hưởng hẹp hơn |
| 4 | LOW-MEDIUM | Coupling/Maintainability | Không có ranh giới rõ ràng giữa `helpers/` và `utils/` — các hàm cùng pattern (`generateAssetCode`/`generateDocumentCode`) nằm ở 2 thư mục khác nhau không theo quy tắc nào |
| 5 | LOW-MEDIUM | Dead code (tổng hợp) | 4 vị trí code chết bị comment nguyên khối thay vì xoá (`importHeaderValidator.helper.ts`, `parse-doc.ts`, `formatDate.ts`, `generate-code.ts`) — cùng thói quen đã ghi nhận ở review khác |
| 6 | LOW | Type safety | `req.user.permissions: string[]` không phản ánh đúng 2 giai đoạn population thật (luôn `[]` ngay sau `authenticate`, chỉ đúng sau `authorizePermission`) |
| 7 | LOW | Naming convention | 3/24 file dùng PascalCase (`Mongoid.util.ts`, `Policycondition.evaluator.ts`, `Queryparsing.util.ts`) trong khi phần còn lại dùng camelCase |
| 8 | LOW | Comment hygiene | `parse-doc.ts` có comment thể hiện không chắc chắn về đường dẫn import của chính nó (đã verify đường dẫn thực tế đúng) |

**Không phát hiện**: circular dependency nào trong `shared/` hoặc giữa `shared/` ↔ `models/`; error hierarchy vẫn đơn giản/nhất quán (1 class `ApiError` duy nhất); cache TTL/xoá-theo-prefix logic đúng (vấn đề nằm ở phía consumer không gọi invalidate, đã biết từ REVIEW-07); global state đều có chủ đích và giới hạn được ghi chú rõ.

## 15. Cross-reference với review khác

- Finding #2 (mục 3) củng cố `RV07-04` (REVIEW-07 Dashboard).
- Finding #3 (mục 13) cùng lớp lỗ hổng với `RV10-02` (REVIEW-10 Notification).
- Mục 10 (`documentRules.ts`) là bằng chứng ĐỘC LẬP THỨ 3 củng cố `RV05-01` (REVIEW-05 Documents/Workflow), sau `RV07-05` và `RV08-06`.
- `errors/errorHandler.ts` dead code trùng với phát hiện gốc "Sửa #4" (`DOCUMENT_ERROR_ANALYSIS.md`) — không phải finding mới, chỉ xác nhận hiện trạng chưa đổi.

## 16. Ghi chú ngoài scope (không xử lý trong review này)

- Luồng validate `fullName` khi tạo/sửa User (có giới hạn ký tự đặc biệt hay không) — thuộc REVIEW-03 (Users), không phải `shared/`.
- `authorizePermission.middleware.ts` (nơi thực sự điền `req.user.permissions`) — thuộc REVIEW-02 (RBAC), chỉ được nhắc tới ở đây để giải thích finding #6.
- Quyết định giữ/xoá/hợp nhất `permission.descriptors.ts` — cần người có thẩm quyền quyết định, không tự ý xử lý trong review-only.

---
**Không có code nào bị sửa trong quá trình review này**, đúng yêu cầu "Không sửa code. DỪNG."

# 10 — NOTIFICATION — CODE REVIEW

> REVIEW-10. Chỉ review, KHÔNG sửa source. Phạm vi: `controllers/notifications`, `services/notifications`, `models/notifications`, `dto/notifications`, cùng `shared/utils/mailer.ts` (Nodemailer, dùng chung nhưng trọng tâm review là cách module Notification dùng nó).
>
> Nguồn đọc trực tiếp: `backend/src/routes/notifications/notification.routes.ts`, `backend/src/controllers/notifications/notification.controller.ts`, `backend/src/services/notifications/notification.service.ts` (304 dòng, đọc toàn văn), `backend/src/models/notifications/{notification.model.ts,notification.types.ts}`, `backend/src/dto/notifications/notification.dto.ts`, `backend/src/shared/utils/mailer.ts`.
>
> Baseline đã đọc trước khi verify source: `docs/00_PROJECT_MEMORY.md` (đã ghi nhận PERF-09: `notifyUsersByRoleName` N+1 Role/User query, và "createNotification gửi email không await — thiết kế tốt").
>
> **Nhận xét tổng quan**: Đây là module có tư duy bảo mật IDOR TỐT NHẤT trong toàn bộ chuỗi review tới nay — MỌI hàm đọc/sửa/xoá đều filter cứng theo `recipient === userId`, có comment giải thích rõ ràng "đây là điểm chặn IDOR quan trọng nhất". Điểm yếu chính KHÔNG nằm ở authorization mà ở 1 lỗ hổng chức năng nghiêm trọng (RV10-01) lặp lại đúng mẫu hình đã thấy nhiều lần ở các domain khác: `validateQuery` bị comment out ở route — nhưng ở module này hậu quả nặng hơn (khả năng lỗi runtime, không chỉ "im lặng sai mặc định" như ISS-08).

---

## A. TÓM TẮT

| # | ID | Severity | Category | Trạng thái |
|---|----|----------|----------|------------|
| 1 | RV10-01 | **HIGH** | Functional Bug / API contract | CONFIRMED (code), INFERRED (hành vi runtime cụ thể) — finding MỚI |
| 2 | RV10-02 | MEDIUM | Security (HTML/Email Injection) | CONFIRMED — finding MỚI |
| 3 | RV10-03 | MEDIUM | Reliability (Retry/Dead-letter) | CONFIRMED — finding MỚI |
| 4 | RV10-04 | LOW-MEDIUM | Configuration | CONFIRMED — finding MỚI (cross-ref RV00-05) |
| 5 | RV10-05 | LOW | Maintainability | CONFIRMED — finding MỚI |
| 6 | RV10-06 | LOW | Duplicate/Idempotency | POTENTIAL RISK — finding MỚI |
| 7 | RV10-07 | INFO (positive) | — | CONFIRMED |

---

## B. FINDINGS CHI TIẾT

### RV10-01 — `GET /api/notifications`: `validateQuery` bị comment out → `page`/`limit` là `undefined` khi client không truyền, khả năng lỗi runtime; filter `isRead` bị hỏng do lệch kiểu string/boolean (HIGH, CONFIRMED code / INFERRED runtime — finding MỚI)

- **File 1**: `backend/src/routes/notifications/notification.routes.ts:20-25`
- **File 2**: `backend/src/controllers/notifications/notification.controller.ts:11-31` (`list`)
- **File 3**: `backend/src/services/notifications/notification.service.ts:192-222` (`getNotificationsForUser`)
- **File 4**: `backend/src/dto/notifications/notification.dto.ts:13-23` (`QueryNotificationDTO`)

**Observed behavior**: Route:
```ts
router.get(
  "/",
  authenticate,
  // validateQuery(QueryNotificationDTO),
  list,
);
```
`QueryNotificationDTO` đã viết ĐÚNG và ĐẦY ĐỦ (`z.coerce.number().default(1)`/`.default(20)` cho `page`/`limit`, `.transform()` chuyển `isRead` từ string `"true"/"false"` sang boolean thật) — NHƯNG middleware validate KHÔNG được gắn vào route.

Hệ quả 1 — **page/limit `undefined` khi client gọi endpoint đơn giản nhất (không kèm query param nào)**:
```ts
// controller
const { page, limit, isRead, type } = req.query as unknown as {...};  // page/limit = undefined nếu client không truyền
// service
const skip = (options.page - 1) * options.limit;  // (undefined - 1) * undefined = NaN
...
.skip(skip)      // .skip(NaN)
.limit(options.limit)  // .limit(undefined)
```
`req.query.page` là `string | undefined` ở runtime (type assertion `as unknown as {page:number}` chỉ đánh lừa TypeScript ở compile-time, KHÔNG coerce giá trị thật). Với request PHỔ BIẾN NHẤT (`GET /api/notifications`, không kèm query param nào — FE mở trang thông báo lần đầu), `options.page`/`options.limit` là `undefined` → `skip = NaN`.

Hệ quả 2 — **filter `isRead` không hoạt động ngay cả khi client CÓ truyền**: nếu client gọi `GET /api/notifications?isRead=true`, thiếu `validateQuery` nghĩa là `.transform()` không chạy → `options.isRead` là CHUỖI `"true"` (không phải boolean `true`). `getNotificationsForUser` gán thẳng `filter.isRead = options.isRead` → MongoDB query trở thành `{isRead: "true"}` (string) trong khi field thật trong DB là kiểu `Boolean` — MongoDB so sánh CHẶT KIỂU (type-sensitive equality), `{isRead: "true"}` KHÔNG BAO GIỜ khớp bất kỳ document nào có `isRead: true` (boolean) — filter theo trạng thái đã đọc/chưa đọc **luôn trả về mảng rỗng**, dù dữ liệu thực tế có tồn tại.

**Evidence**: đọc toàn văn cả 4 file — route thiếu `validateQuery`; DTO có `.transform()` xử lý đúng nhưng không chạy; service không tự phòng thủ (không có `Number()`/default fallback cho `page`/`limit` như 1 số domain khác đã làm, VD `assetAssignment.service.ts:getAssetAssignmentHistoryService` dùng `Math.max(parseInt(page,10),1)`).

**Impact**:
- **`skip = NaN`**: tuỳ hành vi cụ thể của phiên bản MongoDB Node driver đang dùng (INFERRED, chưa test runtime theo nguyên tắc review), khả năng cao nhất là driver validate `skip` phải là số nguyên hợp lệ và throw lỗi (`MongoInvalidArgumentError` hoặc tương đương) — nếu đúng vậy, **request đơn giản nhất tới endpoint được dùng nhiều nhất của cả module (badge chuông thông báo) sẽ lỗi 500** thay vì trả trang 1 mặc định. Đây là mức độ nghiêm trọng CAO HƠN ISS-08 (Documents pagination) — ISS-08 chỉ "luôn trả trang 1/10" (sai âm thầm nhưng không lỗi), còn ở đây khả năng là LỖI HẲN, không trả được response nào.
- **`filter.isRead` lệch kiểu**: bất kỳ FE nào dùng tab "Chưa đọc"/"Đã đọc" (lọc qua `?isRead=true|false`) sẽ LUÔN thấy danh sách rỗng — tính năng lọc theo trạng thái đọc coi như hỏng hoàn toàn.

**Recommendation**: Bỏ comment `validateQuery(QueryNotificationDTO)` — 1 dòng, DTO đã sẵn sàng và đúng, rủi ro thay đổi thấp.

**Confidence**: HIGH cho phần code (page/limit/isRead chắc chắn không được coerce); MEDIUM cho hệ quả runtime chính xác của `skip(NaN)` (cần test/benchmark để xác nhận có throw hay không, nhưng CONFIRMED là filter `isRead` hỏng dù ở nhánh nào).

---

### RV10-02 — Nội dung email KHÔNG được escape trước khi nhúng vào HTML — rủi ro HTML/Email injection từ dữ liệu do user kiểm soát gián tiếp (MEDIUM, CONFIRMED — finding MỚI)

- **File**: `backend/src/services/notifications/notification.service.ts:91-108` (`sendEmailForNotification`)
- **Đối chiếu**: các điểm gọi `createNotification`/`notifyUsersByDepartment` với `message` chứa nội dung do user nhập (VD `document.service.ts`: `` `Tài liệu "${title}" vừa được tạo...` `` — `title` là `Document.title`, field free-text người dùng tự đặt khi tạo Document).

**Observed behavior**:
```ts
await sendMail({
  to: user.email,
  subject: title,
  html: `<p>${message}</p>`,   // ← nhúng thẳng, không escape HTML entity
});
```
`title`/`message` truyền vào đây bắt nguồn (qua nhiều lớp) từ dữ liệu do USER kiểm soát — VD `Document.title` (không có ràng buộc ký tự đặc biệt ở tầng DTO `CreateDocumentDTO`, chỉ `z.string().min(1)`), `Asset.name`, ghi chú... Không có bước encode HTML entity (`&`, `<`, `>`, `"`) nào trước khi nội suy vào chuỗi HTML gửi qua email.

**Evidence**: đọc toàn văn `sendEmailForNotification` — không có hàm escape/sanitize nào được gọi lên `title`/`message` trước dòng `html: <p>${message}</p>`.

**Impact**: Nếu 1 user đặt `Document.title` (hoặc field khác lọt vào `message` của notification) chứa HTML/script (VD `<img src=x onerror=alert(1)>`), nội dung này được nhúng NGUYÊN VĂN vào email HTML gửi tới NGƯỜI KHÁC (đồng nghiệp/quản lý nhận notification). Mức độ khai thác thực tế phụ thuộc client email của người nhận (nhiều mail client hiện đại tự sanitize HTML nhận được, giảm nhẹ rủi ro XSS cổ điển) nhưng vẫn là lỗ hổng HTML injection CONFIRMED ở tầng code — tối thiểu có thể phá layout email, tối đa tuỳ mail client có thể chạy tracking pixel/link giả mạo tinh vi hơn. Notification `message` cũng được trả nguyên văn qua API `GET /notifications` — nếu FE render trực tiếp bằng `dangerouslySetInnerHTML`/tương đương (KHÔNG xác nhận được, FE ngoài phạm vi repo), đây có thể là stored XSS thật trong ứng dụng web.

**Recommendation**: Escape HTML entity cho `title`/`message` trước khi nhúng vào `html` ở `sendEmailForNotification` (hoặc dùng thư viện email-safe templating). Xem xét thêm giới hạn ký tự đặc biệt ở tầng DTO tạo Document/Asset nếu muốn chặn từ gốc.

**Confidence**: HIGH (đường đi dữ liệu CONFIRMED qua code), mức độ khai thác thực tế UNKNOWN (phụ thuộc mail client/FE rendering, ngoài phạm vi review source-code backend).

---

### RV10-03 — Không có cơ chế retry/dead-letter cho email gửi thất bại — lỗi bị nuốt vĩnh viễn (MEDIUM, CONFIRMED — finding MỚI)

- **File 1**: `backend/src/services/notifications/notification.service.ts:74-80` (`createNotification`, nhánh `sendEmail`)
- **File 2**: `backend/src/shared/utils/mailer.ts:53-63` (`sendMail`)

**Observed behavior**: `sendEmailForNotification(...).catch((err) => console.error(...))` — nếu `sendMail` throw (SMTP down, timeout, sai config, quota vượt...), lỗi CHỈ được log ra console, KHÔNG có retry, KHÔNG có cơ chế đánh dấu "cần gửi lại sau", KHÔNG có job nền quét các notification có `sendEmail: true` (ngụ ý) nhưng `channelsSent` thiếu `"email"` để thử gửi lại.

**Evidence**: đọc toàn văn `createNotification`/`sendEmailForNotification`/`mailer.ts` — không có `setTimeout`/retry loop/queue (Bull, RabbitMQ...) nào liên quan tới gửi mail; `channelsSent` chỉ được cập nhật MỘT LẦN, ngay sau lần gửi (thành công hay thất bại đều không tạo thêm cơ hội thử lại).

**Impact**: Nếu SMTP server tạm thời gián đoạn đúng lúc có nhiều notification quan trọng cần gửi (VD `WORKFLOW_STEP_ASSIGNED` — email HIGH priority báo approver có việc cần duyệt), TOÀN BỘ các email đó **mất vĩnh viễn**, người nhận chỉ còn thấy in-app notification (nếu họ không chủ động mở app, họ sẽ không biết có việc cần xử lý). Field `channelsSent` (thiết kế đúng để "debug khi user báo không nhận được email" — theo comment gốc) chỉ giúp XÁC NHẬN việc gửi thất bại SAU KHI user phàn nàn, không có cách nào để hệ thống TỰ PHỤC HỒI.

**Recommendation**: Cân nhắc thêm 1 trong 2: (a) job nền định kỳ quét `Notification` có `priority: HIGH` và thiếu `EMAIL` trong `channelsSent` (trong khoảng thời gian gần đây) để thử gửi lại 1 lần; (b) tích hợp hàng đợi thực thụ (Bull/BullMQ + Redis) nếu khối lượng email tăng đủ lớn để đáng đầu tư.

**Confidence**: HIGH.

---

### RV10-04 — `mailer.ts` không fail-fast khi thiếu biến môi trường SMTP — lỗi chỉ lộ ra khi gửi mail đầu tiên (LOW-MEDIUM, CONFIRMED — finding MỚI, cross-ref RV00-05)

- **File**: `backend/src/shared/utils/mailer.ts:23-37` (`getTransporter`)

**Observed behavior**: `getTransporter()` tạo `nodemailer.createTransport({host: process.env.SMTP_HOST, ...})` mà KHÔNG kiểm tra `SMTP_HOST`/`SMTP_USER`/`SMTP_PASS` có tồn tại hay không trước khi tạo transporter. Nếu thiếu biến môi trường, `nodemailer.createTransport` vẫn tạo được object transporter (không throw ngay) — lỗi chỉ xuất hiện KHI THỰC SỰ GỬI MAIL LẦN ĐẦU (`mailer.sendMail(...)` throw do không kết nối được SMTP với config rỗng/sai).

**Evidence**: đọc toàn văn `getTransporter` — không có `if (!process.env.SMTP_HOST) throw ...` nào.

**Impact**: Cùng loại rủi ro đã ghi nhận RV00-05 (`JWT_SECRET` không fail-fast) — hệ thống khởi động "thành công" (server start bình thường) dù cấu hình SMTP sai/thiếu hoàn toàn, và vấn đề chỉ lộ ra ở PRODUCTION khi có sự kiện đầu tiên cần gửi email (kết hợp RV10-03: lỗi đó cũng chỉ bị log, không ai chủ động biết trừ khi theo dõi log server).

**Recommendation**: Thêm validate biến môi trường SMTP bắt buộc ở thời điểm khởi động app (cùng chỗ/cùng cách đã áp dụng hoặc nên áp dụng cho `JWT_SECRET` — RV00-05), hoặc ít nhất log 1 cảnh báo RÕ RÀNG lúc khởi động nếu thiếu cấu hình email.

**Confidence**: HIGH.

---

### RV10-05 — `CreateNotificationDTO.resourceType` thiếu giá trị `"Asset"` — DTO không đồng bộ với `NotificationResourceType`, nhưng vô hại vì DTO chưa từng được dùng thật (LOW, CONFIRMED — finding MỚI)

- **File 1**: `backend/src/dto/notifications/notification.dto.ts:31-43` (`CreateNotificationDTO`)
- **File 2**: `backend/src/models/notifications/notification.types.ts:42-48` (`NotificationResourceType`)

**Observed behavior**: `NotificationResourceType` enum (nguồn thật, dùng trong model/service) có 4 giá trị: `DOCUMENT`, `WORKFLOW_INSTANCE`, `IMPORT_HISTORY`, `ASSET` (bổ sung ở Giai đoạn 4 module Asset). `CreateNotificationDTO.resourceType` chỉ liệt kê 3 giá trị đầu (`z.enum(["Document", "WorkflowInstance", "ImportHistory"])`) — THIẾU `"Asset"`, dù DTO này được viết SAU thời điểm `ASSET` đã tồn tại (comment trong file nhắc tới cả `document.service.ts`/`excel.service.ts`/`rbac.service.ts` nhưng không nhắc `assetAlerts.service.ts`).

**Evidence**: đọc trực tiếp cả 2 enum — đối chiếu giá trị.

**Impact**: Về mặt RUNTIME, `grep` xác nhận `CreateNotificationDTO` KHÔNG hề được `.parse()`/dùng làm validator thật ở bất kỳ đâu (comment trong chính file DTO cũng xác nhận "KHÔNG mount lên route public... dùng làm type hợp đồng nội bộ") — nên lệch enum này KHÔNG gây lỗi thực tế. Ghi nhận thuần vì đây là 2 nguồn "sự thật" (source of truth) dễ trôi lệch — đúng loại rủi ro đã lặp lại nhiều lần trong dự án (permission string, sortBy whitelist...).

**Recommendation**: Đồng bộ lại `CreateNotificationDTO.resourceType` với `NotificationResourceType`, hoặc xoá hẳn DTO này nếu xác nhận không có kế hoạch dùng làm validator thật (tránh duy trì 1 "hợp đồng" không ai enforce).

**Confidence**: HIGH.

---

### RV10-06 — Không có ràng buộc chống trùng lặp (idempotency) khi tạo Notification (LOW, POTENTIAL RISK — finding MỚI)

- **File**: `backend/src/models/notifications/notification.model.ts`, `backend/src/services/notifications/notification.service.ts`

**Observed behavior**: `Notification.create(...)` không có unique index hay check "đã tồn tại notification tương tự chưa" nào trước khi tạo — mỗi lời gọi `createNotification`/broadcast helper luôn tạo bản ghi MỚI.

**Evidence**: đọc toàn văn `notification.model.ts` (3 index, không có index unique nào liên quan tổ hợp recipient+resourceId+type).

**Impact**: THẤP trong vận hành bình thường (các điểm gọi `createNotification` đều nằm SAU khi transaction nghiệp vụ chính đã commit — xem REVIEW-05, không có rủi ro tạo trùng do retry transaction). Rủi ro CÒN LẠI chỉ tới từ việc CLIENT double-submit hành động nghiệp vụ gốc (VD bấm "duyệt" 2 lần liên tiếp trước khi UI kịp cập nhật) — khi đó KHÔNG PHẢI notification module gây lỗi, mà notification chỉ "trung thực" phản ánh 2 lần gọi nghiệp vụ đã xảy ra (nếu nghiệp vụ gốc có race-condition, notification sẽ nhân đôi theo — xem cross-ref RV05-07/RV06-08/RV08-04 ở các review trước, đều là race condition tại NGHIỆP VỤ GỐC, không phải ở tầng notification).

**Recommendation**: Không cần sửa riêng ở module Notification — nếu các race condition ở tầng nghiệp vụ gốc (RV05-07/RV06-08/RV08-04) được vá, hệ quả trùng lặp notification cũng tự hết theo.

**Confidence**: MEDIUM — bản thân module Notification không có lỗi độc lập, chỉ là "không có lớp phòng thủ cuối" nếu tầng trên có vấn đề.

---

### RV10-07 — Positive findings

1. **IDOR protection nhất quán và có chủ đích RÕ RÀNG NHẤT trong toàn bộ hệ thống tính tới nay**: `markAsRead`, `markAllAsRead`, `deleteNotification`, `getNotificationsForUser` ĐỀU filter cứng theo `recipient === userId` ngay trong query (không phải check SAU khi đọc) — không có endpoint nào trong module này lộ khả năng đọc/sửa/xoá notification của người khác. Route file còn có comment giải thích rõ TẠI SAO không cần `authorizePermission` (resource sở hữu theo user, enforce ở tầng service) — đây là quyết định kiến trúc có chủ đích, không phải thiếu sót.
2. **`createNotification` không bao giờ throw ra ngoài** — đúng nguyên tắc "notification là tác vụ phụ, không được làm fail nghiệp vụ chính", nhất quán với mẫu hình tốt đã thấy ở `auditAdminBypass` (RBAC) và nhiều nơi khác.
3. **Gửi email đúng nghĩa fire-and-forget**: không `await` chặn caller, có `.catch()` riêng, và cập nhật `channelsSent` CHỈ SAU KHI gửi thành công thật (không ghi nhận "đã gửi" trước khi biết kết quả) — thiết kế đúng, tránh optimistic-tracking sai.
4. **`Promise.allSettled` cho broadcast** (`notifyUsersByRoleName`/`notifyUsersByDepartment`/`notifyUserIds`) — 1 user lỗi (VD thiếu email) không chặn gửi cho những user còn lại trong danh sách.
5. **Index đúng trọng tâm truy vấn chính**: `{recipient:1, createdAt:-1}` và `{recipient:1, isRead:1, createdAt:-1}` khớp chính xác pattern "danh sách của 1 user, ưu tiên chưa đọc, mới nhất trước" — có giải thích rõ trong comment, đúng tư duy thiết kế index theo query pattern thực tế thay vì đoán.
6. **`getUnreadCount` tách riêng khỏi `getNotificationsForUser`** — cho phép FE poll badge chuông thường xuyên bằng 1 `countDocuments` rẻ, không phải kéo cả danh sách mỗi lần — tư duy hiệu năng đúng cho use-case polling tần suất cao.
7. **`notifyUsersByDepartment` loại trừ đúng người tạo** (`excludeUserId`) — tránh tự thông báo cho chính mình, chi tiết nhỏ nhưng thể hiện chăm chút trải nghiệm.

---

## C. CÁC MỤC ĐÃ XÁC MINH LẠI, KHÔNG PHÁT HIỆN THÊM VẤN ĐỀ

- **`notifyUsersByRoleName`**: xác nhận lại N+1 pattern đã ghi nhận PERF-09 (tự `Role.findOne` + `User.find` mỗi lần gọi) — không phát hiện thêm vấn đề mới ngoài đã biết, không lặp lại chi tiết ở đây.
- **`deleteNotification` hard-delete (không soft-delete)**: có lý do nghiệp vụ hợp lý ghi rõ trong comment (notification không cần giữ lịch sử sau khi user chủ động dọn) — không phải thiếu sót.
- **`readAt`/`isRead` cập nhật đúng cặp, không có trường hợp `isRead:true` mà `readAt` rỗng** (trong nhánh code chính — xem RV10-01 về vấn đề filter, không phải vấn đề ở logic set field).
- **`resourceId` không dùng Mongoose `refPath`** (polymorphic reference thủ công) — quyết định có chủ đích, ghi rõ lý do "giữ tường minh và dễ audit" trong comment, không phát hiện vấn đề gì khi đối chiếu cách các domain khác populate `resourceId` (Document/Asset/WorkflowInstance).

---

## D. UNKNOWN CÒN TỒN ĐỌNG

- RV10-01: hành vi CHÍNH XÁC của MongoDB Node driver khi nhận `skip: NaN` (throw lỗi hay âm thầm bỏ qua) — phụ thuộc phiên bản driver đang dùng, cần test runtime để xác nhận 100%.
- RV10-02: FE có render `notification.message` bằng cách cho phép HTML thô hay không (`dangerouslySetInnerHTML`/tương đương) — ngoài phạm vi repo backend, quyết định mức độ nghiêm trọng thực tế (HTML injection thuần vs XSS thật trong web app).
- RV10-03: tần suất/thời lượng gián đoạn SMTP trong vận hành thực tế — quyết định mức độ ưu tiên đầu tư cơ chế retry.

---

**Review hoàn tất. Không có thay đổi nào được thực hiện trên source code trong quá trình review này.**

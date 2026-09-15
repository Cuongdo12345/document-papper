# REVIEW-12 — CRON / BACKGROUND JOBS

Status: DONE (review only, no code changed)
Date: 2026-08-31
Scope: `backend/src/shared/cron/**`, các service/controller/route liên quan (`assetAlerts`, `medicalDeviceAlerts`), điểm gọi trong `backend/server.ts`.

## 1. Phạm vi đã inspect

```
backend/server.ts                                                  (nơi gọi registerCronJobs())
backend/src/shared/cron/index.ts                                   (registry tổng)
backend/src/shared/cron/assetAlerts.cron.ts                        (cron 08:00 — cảnh báo Asset)
backend/src/shared/cron/medicalDeviceAlerts.cron.ts                (cron 08:05 — cảnh báo Thiết bị Y tế)
backend/src/services/assets/assetDevice/assetAlerts.service.ts     (logic chạy thật của cron Asset)
backend/src/services/assets/medicalDevice/medicalDeviceAlerts.service.ts (logic chạy thật của cron Thiết bị Y tế)
backend/src/controllers/assets/asset.controller.ts                 (POST /api/assets/alerts/run)
backend/src/controllers/assets/medicalDevice.controller.ts         (POST /api/assets/medical-devices/alerts/run)
backend/src/routes/assets/asset.routes.ts
backend/src/routes/assets/medicalDevice.routes.ts
backend/src/services/notifications/notification.service.ts         (notifyUsersByRoleName)
node_modules/node-cron (v4.6.0, package.json + node-cron.d.ts)      (xác nhận API/khả năng thật của thư viện đang dùng)
```

Toàn hệ thống hiện có **đúng 2 cron job**, không có job nào khác (không tìm thấy `setInterval`/`node-schedule`/`agenda`/`bull` nào đóng vai trò cron trong `backend/src`).

## 2. Kiến trúc tổng quan (CONFIRMED)

```
server.ts: startServer()
  → connectDB()
  → registerMongoEvents() / registerMongoShutdown()
  → registerCronJobs()          ← gọi ĐÚNG 1 LẦN, SAU khi DB connect xong
  → http.createServer(app).listen()
```

`shared/cron/index.ts` chỉ làm nhiệm vụ registry (import + gọi `register...Cron()` từng file), không chứa logic riêng — đúng như comment mô tả. Mỗi cron job có 1 file `*.cron.ts` độc lập, mirror cấu trúc nhau. Đây là pattern rõ ràng, dễ mở rộng, không có vấn đề kiến trúc.

Mỗi job đều expose thêm 1 API trigger tay (`POST .../alerts/run`, có `authenticate` + `authorizePermission`) gọi thẳng cùng 1 hàm `run...Service()` mà cron gọi — không có code trùng lặp giữa 2 đường vào.

## 3. Scheduling

| Job | Lịch | Timezone | Ghi chú |
|---|---|---|---|
| Asset warranty/maintenance | `0 8 * * *` (08:00 hàng ngày) | `Asia/Ho_Chi_Minh` (chỉ định rõ) | Comment giải thích rõ lý do chọn giờ và lý do ép timezone |
| Medical device calibration | `5 8 * * *` (08:05 hàng ngày) | `Asia/Ho_Chi_Minh` (chỉ định rõ) | Lệch 5 phút so với job trên — theo comment là để tránh 2 cron cùng ghi Notification/gửi email tại cùng thời điểm khởi động ca hành chính |

**CONFIRMED (HIGH):** cả 2 job đều truyền `{ timezone: "Asia/Ho_Chi_Minh" }` cho `cron.schedule()`. Đây là điểm đúng — nếu không set, `node-cron` mặc định dùng giờ hệ điều hành, môi trường container/cloud thường chạy UTC sẽ làm job chạy sai giờ (lệch 7 tiếng so với ý định). Không có finding nào ở mục timezone.

**Nhận xét (LOW, không phải bug):** lịch 08:00 / 08:05 là hằng số hard-code trong từng file (`ASSET_ALERTS_CRON_SCHEDULE`, `MEDICAL_DEVICE_ALERTS_CRON_SCHEDULE`), không đọc từ ENV. Muốn đổi giờ chạy phải sửa code + deploy lại, không thể chỉnh qua config/ENV. Chấp nhận được ở quy mô hiện tại (2 job, tần suất thấp), nhưng nếu số cron tăng lên sẽ đáng cân nhắc đưa ra ENV.

## 4. Duplicate execution / tránh gửi trùng thông báo

Có 2 pattern khác nhau, CHỦ Ý khác nhau theo đúng comment trong code:

- **Cảnh báo "gửi 1 lần"** (`checkWarrantyExpiringService`, `checkCalibrationDueService`): dùng flag `warrantyAlertSentAt` / `calibrationAlertSentAt` (null → đã gửi = set `now`) để không gửi lặp lại mỗi ngày cho cùng 1 asset/profile. Flag được reset khi dữ liệu liên quan đổi (ví dụ ngày hết hạn bảo hành đổi, hoặc có bản ghi kiểm định mới) — logic ở ngoài phạm vi review này (nằm ở `updateAssetService`/`createCalibrationRecordService`), **không verify lại trong review này (ngoài scope REVIEW-12)**.
- **Cảnh báo "nhắc lặp lại"** (`checkMaintenanceOverdueService`): CHỦ Ý không có flag "đã gửi" — mỗi ngày cron chạy vẫn gửi lại cho tới khi asset ra khỏi trạng thái `UNDER_MAINTENANCE`. Đây là quyết định thiết kế được ghi rõ trong comment, không phải thiếu sót.

**FINDING #1 — Idempotency giữa "notify" và "đánh dấu đã gửi" KHÔNG ATOMIC (MEDIUM, CONFIRMED)**

- File: `backend/src/services/assets/assetDevice/assetAlerts.service.ts`, hàm `checkWarrantyExpiringService()` (dòng ~101-121); mirror y hệt ở `backend/src/services/assets/medicalDevice/medicalDeviceAlerts.service.ts`, hàm `checkCalibrationDueService()` (dòng ~102-138).
- Observed: với mỗi asset/profile, code `await notifyUsersByRoleName(...)` XONG rồi mới `asset.warrantyAlertSentAt = now; await asset.save();` — 2 thao tác riêng biệt, KHÔNG bọc transaction, không có `try/catch` cục bộ quanh cặp thao tác này.
- Failure scenario: nếu process bị kill / server restart / DB mất kết nối đúng giữa lúc `notifyUsersByRoleName` đã tạo xong notification (và có thể đã gửi email) nhưng TRƯỚC khi `asset.save()` chạy xong, thì `warrantyAlertSentAt` vẫn là `null`. Lần cron chạy kế tiếp (hôm sau) sẽ coi asset đó là "chưa từng cảnh báo" và gửi lại — user nhận thông báo/email trùng cho cùng 1 sự kiện.
- Impact: gửi trùng notification/email cho quản trị viên IT — gây phiền nhưng không sai dữ liệu nghiệp vụ (không mất cảnh báo, chỉ dư cảnh báo). Xác suất xảy ra thấp (cần crash đúng thời điểm rất hẹp) nhưng có thể xảy ra bất cứ khi nào server restart giữa lúc cron đang chạy (đúng theo yêu cầu review "Restart behavior").
- Confidence: HIGH (đọc trực tiếp code, không suy đoán).

**Đối chiếu ngược lại (điểm làm ĐÚNG, ghi nhận để không bị hiểu nhầm là thiếu sót):** guard `hasValidRecipients()` ở đầu mỗi service (kiểm tra role "IT" tồn tại + có ít nhất 1 user active) được cả 2 file cài đặt và có comment giải thích rất rõ lý do — đây chính là để tránh một dạng "silent failure" nguy hiểm hơn: nếu không có guard này, asset sẽ bị đánh dấu `sentAt = now` dù chưa từng gửi được cho ai, và cron sẽ KHÔNG BAO GIỜ thử lại vĩnh viễn. Guard này xử lý đúng rủi ro "gửi thiếu vĩnh viễn", nhưng không xử lý rủi ro "gửi trùng khi crash giữa chừng" nêu ở Finding #1 — 2 rủi ro khác nhau, guard hiện tại chỉ che 1 trong 2.

## 5. Retry

- **Không có retry logic nào** cho notification/email thất bại ở cấp cron — `notifyUsersByRoleName()` dùng `Promise.allSettled()` khi gửi cho nhiều user (1 user lỗi không chặn user khác) nhưng KHÔNG retry lại user bị lỗi, và bọc toàn bộ trong `try/catch` chỉ để `console.error`, không throw lên trên (`backend/src/services/notifications/notification.service.ts:118-139`).
- Hệ quả: nếu `createNotification()` cho 1 user cụ thể lỗi (ví dụ lỗi gửi email), user đó âm thầm không nhận được cảnh báo ở lần chạy đó, và vì asset/profile đã được set `warrantyAlertSentAt`/`calibrationAlertSentAt` = now ngay sau đó (xem Finding #1 — thao tác này không biết gì về việc gửi lẻ tẻ có user nào fail), cron sẽ KHÔNG thử gửi lại cho asset đó nữa dù có user bị miss.
- **FINDING #2 — Không phân biệt "gửi thành công cho ít nhất 1 user" và "gửi thất bại cho toàn bộ user" khi đánh dấu đã gửi (LOW/MEDIUM, CONFIRMED)**
  - File/Function: như Finding #1.
  - Observed: `notifyUsersByRoleName` trả về `Promise<void>` (không trả số lượng thành công/thất bại thực tế trong `Promise.allSettled`), nên caller (`checkWarrantyExpiringService`/`checkCalibrationDueService`) không có cách nào biết có bao nhiêu user thực sự nhận được — vẫn `asset.warrantyAlertSentAt = now` vô điều kiện ngay sau khi gọi xong, kể cả khi TẤT CẢ user trong role đều gửi lỗi.
  - Impact: trong trường hợp xấu (ví dụ mail server down đúng lúc cron chạy), toàn bộ user "IT" có thể không nhận được cảnh báo nào cho asset đó, nhưng cron vẫn coi là "đã xử lý xong" và không bao giờ thử lại — đúng loại "silent failure nguy hiểm nhất" mà chính comment trong code đã cảnh báo cho trường hợp "không có user nào" (`hasValidRecipients`), nhưng KHÔNG che được trường hợp "có user nhưng gửi lỗi hết".
  - Confidence: MEDIUM (dựa trên đọc code trực tiếp; chưa có log/monitoring thực tế xác nhận đã từng xảy ra — phần "đã từng xảy ra chưa" là UNKNOWN).

## 6. Error handling

- Cả 2 cron job (`assetAlerts.cron.ts`, `medicalDeviceAlerts.cron.ts`) đều bọc callback trong `try/catch`, chỉ `console.error` khi lỗi, **KHÔNG throw** — đúng nguyên tắc đã ghi rõ trong comment: "1 lần cron chạy lỗi không được làm crash cả server". Đây là điểm làm đúng.
- Log lỗi hiện chỉ ra `console.error`/`console.warn`, không có tích hợp với hệ thống log tập trung hay alerting riêng (ví dụ Sentry) — nếu cron lỗi lặp lại nhiều ngày liên tục (ví dụ do bug trong query), sẽ không ai được chủ động báo trừ khi có người chủ động đọc log server. Đây là **UNKNOWN/ngoài scope observability**, không phải lỗi của module cron — ghi nhận để tham khảo, không phải finding cần sửa trong review này.

## 7. Concurrency

**FINDING #3 — Không có cơ chế chống chạy song song / chống chạy trùng khi scale nhiều instance (LOW, CONFIRMED theo evidence hiện có; MỨC ĐỘ RỦI RO THỰC TẾ = UNKNOWN vì chưa xác nhận được mô hình deploy)**

- File: `backend/src/shared/cron/assetAlerts.cron.ts`, `medicalDeviceAlerts.cron.ts`.
- Observed: `node-cron` phiên bản đang dùng (`node-cron@4.6.0`, xác nhận tại `backend/node_modules/node-cron/package.json`) hỗ trợ sẵn các option `noOverlap`, `distributed`, `runCoordinator`, `distributedLease`, `maxExecutions` trong `TaskOptions` (xem `node-cron.d.ts`) — nhưng CẢ 2 file cron trong project đều CHỈ truyền `{ timezone: ... }`, không dùng bất kỳ option chống-overlap/chống-trùng nào.
- Impact tiềm ẩn:
  1. Nếu app được chạy nhiều hơn 1 process/instance (PM2 cluster mode, nhiều container/pod cùng trỏ 1 DB), MỖI instance sẽ tự đăng ký và tự chạy cron riêng theo đúng lịch — dẫn tới cùng 1 thời điểm 08:00, N instance cùng chạy `runAssetAlertsService()` song song. Vì thao tác notify+save không atomic (Finding #1) và không có lock, có khả năng gửi trùng thông báo nhiều lần (N lần thay vì 1).
  2. Nếu 1 lần chạy cron của chính nó bị "chạy lâu" bất thường (ví dụ query chậm do dữ liệu lớn) và job kế tiếp tới lịch trước khi job trước xong — vì các job này chạy 1 lần/ngày (đủ margin rất lớn), khả năng 2 lần chạy của CÙNG 1 job chồng lên nhau gần như không xảy ra trong thực tế, đây chủ yếu là rủi ro lý thuyết ("Long-running jobs" — xem mục 8).
- Evidence hiện có KHÔNG xác nhận được mô hình deploy thực tế của project này (không tìm thấy `Dockerfile`, `docker-compose.yml`, hay cấu hình PM2/`ecosystem.config.js` nào trong repo ở thời điểm review) — do đó rủi ro #1 (nhiều instance) là **UNKNOWN về khả năng xảy ra thực tế**, chỉ CONFIRMED về mặt "code không có guard chống việc đó".
- Khuyến nghị (không thực hiện trong review này — ngoài scope "review-only"): nếu tương lai deploy nhiều instance, cân nhắc bật `distributed: true` + `runCoordinator` (node-cron 4.x hỗ trợ sẵn) hoặc dùng advisory lock ở DB (ví dụ 1 document "cron_lock" với `findOneAndUpdate` có điều kiện) trước khi chạy `run...Service()`.

## 8. Transaction

**FINDING #4 — Không dùng MongoDB transaction cho vòng lặp notify+save (liên quan trực tiếp Finding #1) (thông tin bổ sung, không tính là finding riêng)**

- Cả 2 service lặp `for (const asset of assets) { await notify...; asset.field = now; await asset.save(); }` tuần tự, KHÔNG dùng `session`/transaction MongoDB.
- Vì `notifyUsersByRoleName` tự nó cũng ghi vào collection `Notification` (qua `createNotification`, nằm ngoài phạm vi review này), một transaction đúng nghĩa sẽ cần bọc cả "tạo Notification" + "set sentAt" trong cùng 1 session để đảm bảo atomic — hiện tại KHÔNG có. Đây chính là nguyên nhân gốc của Finding #1, không phải vấn đề riêng biệt.
- Việc có cần transaction ở đây hay không là **INFERRED, không phải CONFIRMED requirement**: do hệ quả chỉ là gửi trùng thông báo (không mất dữ liệu, không sai lệch nghiệp vụ tài chính/tồn kho), mức độ nghiêm trọng thấp — quyết định có đầu tư transaction hay không nên do người có thẩm quyền nghiệp vụ quyết định, không tự ý thêm trong review này.

## 9. Long-running jobs

- Cả 2 job hiện tại xử lý dữ liệu bằng `Model.find(...)` KHÔNG phân trang/`cursor()`, rồi `for...of` tuần tự gọi `await` cho từng document (không dùng `Promise.all` song song). Với dataset lớn (nhiều nghìn asset/profile tới hạn cùng lúc), thời gian chạy sẽ tăng tuyến tính và có thể kéo dài đáng kể — nhưng đây là nhận xét về **performance**, không phải lỗi correctness, và ngoài phạm vi "duyệt sâu performance" của REVIEW-12 (đã có phase Performance riêng — mục 10 CLAUDE.md). Ghi nhận (LOW) để tham khảo, không phải blocking finding.
- Không có timeout riêng đặt cho job (không dùng `executeTimeout` dù `node-cron@4.6.0` hỗ trợ) — nếu 1 lần chạy bị treo (ví dụ query DB hang), job sẽ không tự bị hủy, nhưng cũng không chặn request HTTP nào khác (chạy nền, không dùng chung request/response) — rủi ro thấp.

## 10. Restart behavior

- **CONFIRMED:** `registerCronJobs()` được gọi trong `server.ts` SAU `connectDB()` thành công (dòng 33-39) — đúng nguyên tắc "cron cần DB sẵn sàng trước khi tới lịch chạy". Nếu server restart, cron được đăng ký lại từ đầu theo lịch tuyệt đối (`node-cron` tính giờ theo wall-clock, không có state persist giữa các lần restart) — không có "lịch bị lỡ sẽ tự chạy bù" (không dùng `missedExecutionTolerance`/catch-up nào). Nghĩa là: nếu server down đúng lúc 08:00-08:05 và chỉ lên lại sau đó, ngày hôm đó sẽ KHÔNG có cảnh báo nào chạy (phải đợi API trigger tay hoặc đợi tới 08:00 hôm sau).
  - Đây là hành vi NGẦM ĐỊNH của việc dùng in-process cron (`node-cron`) chạy cùng tiến trình Node server — không phải bug, nhưng là một **hạn chế kiến trúc đáng ghi nhận** (khác với cron ở tầng OS hoặc job scheduler ngoài, vốn chạy độc lập với vòng đời process ứng dụng).
  - Có API trigger tay (`POST /alerts/run`) làm phương án bù đắp hợp lý cho hạn chế này — đã có sẵn, không cần thêm gì trong review này.

## 11. Timezone

Đã review ở mục 3 — cả 2 job đều set `timezone: "Asia/Ho_Chi_Minh"` tường minh, có comment giải thích đúng rủi ro (server host ở UTC). Không có finding.

## 12. Tổng hợp findings

| # | Mức độ | Hạng mục | Tóm tắt |
|---|---|---|---|
| 1 | MEDIUM | Idempotency / Restart | `notify` rồi mới `save(sentAt)` không atomic — crash giữa chừng có thể gây gửi trùng cảnh báo ở lần chạy kế tiếp. |
| 2 | LOW/MEDIUM | Retry / Error handling | Đánh dấu "đã gửi" vô điều kiện dù `notifyUsersByRoleName` có thể đã gửi lỗi cho toàn bộ user trong role — không retry, không phân biệt thành công/thất bại thực tế. |
| 3 | LOW (rủi ro thực tế UNKNOWN) | Concurrency / Duplicate execution | Không dùng option `noOverlap`/`distributed` sẵn có của `node-cron@4.6.0` — nếu tương lai scale nhiều instance sẽ chạy trùng cron ở mọi instance, không có lock. |
| 4 | Thông tin bổ sung | Transaction | Không có transaction bọc "tạo Notification" + "set sentAt" — là nguyên nhân gốc của #1, mức đầu tư sửa nên do chủ nghiệp vụ quyết định. |

Không phát hiện vấn đề ở: Scheduling cấu hình sai, Timezone, việc gọi `registerCronJobs()` (đúng 1 lần, đúng thời điểm), cấu trúc file/registry cron, và cơ chế chặn crash server khi cron lỗi (try/catch đã có).

## 13. Ghi chú ngoài scope (không sửa trong review này)

- Logic reset `warrantyAlertSentAt`/`calibrationAlertSentAt` khi dữ liệu đổi (`updateAssetService`, `createCalibrationRecordService`) — CHƯA verify trong review này, thuộc phạm vi Document/Asset service, không phải `shared/cron`.
- `createNotification()` (đường gửi email thật) — CHƯA đọc chi tiết, ngoài phạm vi "cron scheduling/idempotency/retry" đã nêu ở đầu bài; nếu cần audit sâu về gửi email (rate limit, template, bounce handling) nên là 1 review riêng.
- Mô hình deploy thực tế (single instance hay multi-instance/PM2 cluster) — UNKNOWN, cần xác nhận với người phụ trách hạ tầng để đánh giá đúng mức độ ưu tiên của Finding #3.

---
**Không có code nào bị sửa trong quá trình review này**, đúng yêu cầu "Không sửa code. DỪNG."

# 10 — PERFORMANCE ANALYSIS

> Phase: 10 — Performance Analysis
> Phạm vi: bottleneck/performance risk dựa trên source code (Database, Backend, API, Frontend, File Processing). KHÔNG benchmark (chưa có môi trường đo), KHÔNG khẳng định hệ thống thực tế chậm nếu chưa đo.
> Nguồn: re-clone tại thời điểm Phase 10 — commit `f4ce8e9083e16c01177f53a3871b66cfde4133b8` ("update", 2026-08-24 13:53:38 +0700) — **khớp chính xác** với `00_PROJECT_MEMORY.md`, không có thay đổi.
> Kế thừa: phần lớn finding về Database index đã có evidence chi tiết ở Phase 04 §9/§14 — Phase 10 KHÔNG lặp lại toàn bộ chi tiết, chỉ tham chiếu lại trong bảng tổng hợp và bổ sung góc nhìn "performance impact". Phần MỚI của Phase 10 tập trung vào: Excel import/export (chưa đọc sâu ở phase nào trước), cron alerts (chưa đọc sâu), `.lean()` usage pattern, N+1 query pattern.
> Quy ước: **CONFIRMED FROM CODE** = có bằng chứng trực tiếp trong logic code (chắc chắn xảy ra theo luồng code). **POTENTIAL RISK** = suy luận hợp lý từ cấu trúc, phụ thuộc quy mô dữ liệu/traffic thực tế, chưa benchmark. **NEEDS BENCHMARK** = không thể kết luận chỉ từ đọc code, cần đo runtime.

---

## 0. Tóm tắt điều hành

| Phân loại | Số lượng finding |
|---|---|
| CONFIRMED FROM CODE | 9 |
| POTENTIAL RISK | 6 |
| NEEDS BENCHMARK | 3 |

Điểm đáng chú ý nhất mới phát hiện ở Phase 10: (1) **Excel import Document — mỗi dòng trong file mở 1 transaction MongoDB riêng** (tối đa 5000 dòng/file → tối đa 5000 transaction tuần tự), (2) **`buildMapFromReports` tải TOÀN BỘ Document theo `subType` (không lọc theo phạm vi export) vào RAM mỗi lần gọi export**, (3) **cron cảnh báo Asset/Medical Device lặp N+1 query Role/User cho mỗi asset** thay vì tính 1 lần. Đối trọng tích cực: cơ chế batch-flush performance log (giảm 50-100 lần round-trip DB) và Excel export Document/Asset đều dùng MongoDB cursor + streaming `WorkbookWriter` — thiết kế tốt, tránh tải toàn bộ dữ liệu export vào RAM.

---

## 1. DATABASE

> Chi tiết đầy đủ về index đã có ở `04_DATABASE_ANALYSIS.md` §9/§10/§14 — không lặp lại ở đây, chỉ liệt kê lại dưới góc nhìn performance impact + bổ sung phát hiện MỚI (`.lean()` usage).

### PERF-01 — `WorkflowInstance` không có index, bị query bằng `$expr` ở endpoint tần suất cao (kế thừa Phase 04 §9.3)
- **Area**: Database / Missing Index
- **Evidence**: `getPendingApprovalsForRole` dùng `$expr + $arrayElemAt` trên `WorkflowInstance` — model không có bất kỳ index nào ngoài `_id`.
- **File**: `models/documents/workflowInstance.model.ts`, `services/documents/workflow.service.ts`
- **Impact**: Mỗi lần gọi `GET /api/workflows/pending` (hộp thư chờ duyệt, gọi thường xuyên bởi mọi approver) là 1 COLLSCAN toàn bộ collection — chi phí tăng tuyến tính theo tổng số `WorkflowInstance` trong hệ thống (không giảm dần theo thời gian vì workflow cũ không bị xoá).
- **Risk**: **CONFIRMED FROM CODE** (chắc chắn không dùng được index cho `$expr`; mức độ chậm cụ thể phụ thuộc số lượng bản ghi — NEEDS BENCHMARK để biết ngưỡng thực tế gây chậm).
- **Recommendation**: Thêm index `{status:1}` tối thiểu (thu hẹp tập trước khi evaluate `$expr`); cân nhắc lưu thêm field `currentStepRole` (denormalize) để query trực tiếp bằng index thay vì `$expr`.

### PERF-02 — `RefreshToken` không có index trên `token`, không tự dọn (kế thừa Phase 04 §9.1)
- **Area**: Database / Missing Index
- **Evidence**: mọi lần `/refresh-token`/`/logout` là collection scan; không có TTL index nên số bản ghi tăng vô hạn theo thời gian (không có cron dọn — Unknown từ Phase 04/07).
- **File**: `models/auth/refreshToken.model.ts`
- **Risk**: **CONFIRMED FROM CODE** cho việc thiếu index; **POTENTIAL RISK** tăng dần theo thời gian vận hành (collection càng lớn, scan càng chậm) — **NEEDS BENCHMARK** để biết tốc độ suy giảm thực tế.
- **Recommendation**: Thêm `{token:1}` unique index + TTL index trên `expiresAt` (giống `PasswordResetToken`).

### PERF-03 — `Document` thiếu index trên `isActive`/`deletedAt` dù dashboard lọc theo 2 field này thường xuyên (kế thừa Phase 04 §9.2)
- **Area**: Database / Missing Index
- **Evidence**: 5/7 aggregate trong `adminDashboardSummaryService` đều `$match: {isActive:true, deletedAt:null}` (đôi khi kèm `category`/`createdAt`).
- **File**: `models/documents/document.model.ts`, `services/dashboard/dashboard.service.ts`
- **Risk**: **POTENTIAL RISK** — có thể tận dụng 1 phần index `{createdAt:-1}`/`{department:1,subType:1,createdAt:-1}` cho phần sort/range, nhưng vẫn phải lọc thêm `isActive`/`deletedAt` trong bộ nhớ khi selectivity thấp.
- **Recommendation**: Thêm index compound có `isActive`/`deletedAt` làm field đầu (vd `{isActive:1, deletedAt:1, createdAt:-1}`).

### PERF-04 — 7/21 model không có index ngoài `_id` (kế thừa Phase 04 §10)
- **Area**: Database / Missing Index (tổng hợp)
- **Evidence**: `RefreshToken`, `Role`, `Permission`, `Policy`, `WorkflowTemplate`, `WorkflowInstance`, `Upload`.
- **Risk**: **POTENTIAL RISK**, mức độ khác nhau theo model — `Role`/`Permission`/`Department` có bản chất bảng nhỏ (rủi ro thấp, INFERRED từ ngữ cảnh nghiệp vụ nội bộ), `Policy` phụ thuộc số lượng Policy thực tế (hiện ABAC dead runtime nên tần suất query = 0 theo Phase 07, risk thực tế hiện tại = KHÔNG ĐÁNG KỂ dù thiếu index), `WorkflowInstance`/`RefreshToken`/`Upload` có tần suất query cao hơn (xem PERF-01/02).
- **Recommendation**: Ưu tiên xử lý `WorkflowInstance` và `RefreshToken` trước (tần suất truy vấn cao nhất trong nhóm này); `Policy`/`WorkflowTemplate`/`Upload` có thể để mức ưu tiên thấp hơn cho tới khi có dữ liệu traffic thật.

### PERF-05 — `.lean()` không được dùng nhất quán ở các list endpoint đọc-nhiều (MỚI, Phase 10)
- **Area**: Database / Query Overhead (Mongoose hydration)
- **Evidence** (đếm trực tiếp, không suy diễn): `services/documents/documents.query.ts` (3/3 hàm list dùng `.lean()`), `services/notifications/notification.service.ts` (list dùng `.lean()`) — ĐÚNG. Ngược lại, **KHÔNG dùng `.lean()`**:
  - `services/users/users.service.ts:getList` (dòng ~119, `User.find(filter)...`) — trả về Mongoose Document đầy đủ (getters/setters/virtuals/change-tracking) cho 1 danh sách chỉ để đọc/hiển thị.
  - `services/rbac/rbac.service.ts` — `getPermissionService` (dòng 105, `Permission.find(filter)...`), `getRoleService` (dòng 283, `Role.find(filter)...`) — cùng vấn đề.
- **File**: `backend/src/services/users/users.service.ts`, `backend/src/services/rbac/rbac.service.ts`
- **Function**: `getList`, `getPermissionService`, `getRoleService`
- **Impact**: Với danh sách nhiều bản ghi/nhiều field, hydrate thành Mongoose Document tốn CPU/memory hơn object JS thuần (`.lean()`) — không cần thiết vì các endpoint này chỉ đọc để trả JSON, không gọi `.save()` hay dùng virtual/method của instance sau đó (chưa xác nhận 100% cho mọi field hiển thị — INFERRED từ mục đích endpoint là "list").
- **Risk**: **POTENTIAL RISK** — chi phí cụ thể tỷ lệ với số field/kích thước response và tần suất gọi endpoint; với dữ liệu nội bộ quy mô vừa/nhỏ (RBAC, Department) tác động thực tế nhiều khả năng nhỏ, nhưng `Users` list (endpoint dùng thường xuyên hơn) đáng cân nhắc sửa trước.
- **Recommendation**: Thêm `.lean()` cho các query list thuần đọc (`getList`, `getPermissionService`, `getRoleService`) theo đúng pattern đã áp dụng nhất quán ở domain `documents`/`notifications`.
- **Confidence**: CONFIRMED (thiếu `.lean()` — đọc trực tiếp code), POTENTIAL RISK (mức độ ảnh hưởng thực tế).

### PERF-06 — `Policy` không có index trên `resource+action` (kế thừa Phase 04 §4.7)
- **Area**: Database / Missing Index
- **Evidence**: `authorizePermission.middleware.ts` fallback ABAC query `Policy.find({resource, action})` mỗi lần fallback.
- **Risk**: **KHÔNG ĐÁNG KỂ HIỆN TẠI** — vì Phase 07 đã CONFIRMED nhánh ABAC không bao giờ được kích hoạt (`options.enablePolicies` không route nào truyền) → tần suất thực thi query này ở runtime hiện tại = **0 lần**. Ghi nhận lại để nếu ABAC được kích hoạt trong tương lai, cần bổ sung index trước khi bật.
- **Recommendation**: Không cần xử lý ngay trừ khi có kế hoạch kích hoạt lại ABAC (liên quan SEC-07 ở Phase 09).

---

## 2. BACKEND

### PERF-07 — Excel Import (Document) — N+1 transaction: mỗi dòng file mở 1 MongoDB transaction riêng (MỚI, Phase 10, mức độ đáng chú ý nhất)
- **Area**: Backend / CPU-blocking sequential operations, N+1
- **Evidence** (đọc trực tiếp `services/excel/excel.service.ts:importDocumentsExcel`):
  ```
  for (let i = 2; i <= sheet.rowCount; i++) {   // lặp TUẦN TỰ (await trong for, không Promise.all)
    ...
    let proposal = await Document.findOne({...});           // query #1 mỗi dòng
    if (!dryRun) {
      const txResult = await withTransaction(async (session) => {
        // mở session/transaction MỚI cho MỖI DÒNG
        ... generateDocumentCode() (Counter.findOneAndUpdate)  // query #2
        ... Document.create/save                                // query #3
        ... Document.findOne (check existingReport, nếu có inspection)  // query #4 (có điều kiện)
        ... Document.create (report, nếu có)                    // query #5 (có điều kiện)
      });
    }
  }
  ```
  Giới hạn `MAX_IMPORT_ROWS = 5000` (`shared/constants/excel.constants.ts`) — nghĩa là 1 file import hợp lệ tối đa có thể sinh ra **tới 5000 transaction MongoDB tuần tự**, mỗi transaction tối thiểu 3 round-trip (findOne dedup + generateDocumentCode + create), tối đa 5 round-trip nếu có report kèm theo.
- **File**: `backend/src/services/excel/excel.service.ts`
- **Function**: `importDocumentsExcel`
- **Impact**: Tổng thời gian xử lý 1 request import tỷ lệ **tuyến tính** với số dòng file, CỘNG THÊM overhead khởi tạo/commit transaction MongoDB (đắt hơn 1 write đơn lẻ) nhân với số dòng — không tận dụng được `insertMany`/batch write nào. Với file gần ngưỡng 5000 dòng, request có khả năng chạy rất lâu (có thể vượt timeout HTTP mặc định của client/proxy, dù không có evidence cụ thể về giá trị timeout trong repo — **NEEDS BENCHMARK** để biết thời gian thực tế). Đây cũng là 1 request HTTP đồng bộ (controller `await` toàn bộ hàm) — chiếm 1 connection lâu, không trả response cho tới khi xử lý xong toàn bộ file.
- **Risk**: **CONFIRMED FROM CODE** (pattern N+1-transaction chắc chắn tồn tại theo logic code); mức độ ảnh hưởng thực tế theo thời gian tuyệt đối cần **NEEDS BENCHMARK**.
- **Recommendation**: Cân nhắc xử lý theo batch (vd gom N dòng/transaction thay vì 1 dòng/transaction), hoặc chuyển sang xử lý bất đồng bộ (queue job + trả về job ID, poll kết quả) nếu file lớn là kịch bản thường gặp trong thực tế; tối thiểu nên đo thời gian xử lý thực tế với file ở ngưỡng vài nghìn dòng trước khi coi đây là vấn đề cấp thiết.

### PERF-08 — `buildMapFromReports` tải toàn bộ Document theo `subType` (không giới hạn phạm vi) vào RAM mỗi lần export (MỚI, Phase 10)
- **Area**: Backend / Memory-heavy operation, Backend / Repeated computation
- **Evidence**: `shared/helpers/buildMapReports.ts`:
  ```js
  const docs = await Document.find({ subType, isActive: true })
    .select("referenceTo meta.items")
    .lean();
  ```
  Gọi 2 lần song song (`Promise.all`) trong `exportDocumentsExcelPRO` cho `CONFIRM_STATUS` và `CHECK_DAMAGE` — **KHÔNG áp dụng bất kỳ filter nào khớp với phạm vi export chính** (export chính có thể lọc theo `department`/`status`/`subType`/khoảng thời gian qua query string, nhưng `buildMapFromReports` luôn quét **TOÀN BỘ** 2 subType này trên **TOÀN HỆ THỐNG**, không giới hạn department/thời gian).
- **File**: `backend/src/shared/helpers/buildMapReports.ts`, `backend/src/services/excel/excel.service.ts:exportDocumentsExcelPRO`
- **Function**: `buildMapFromReports`
- **Impact**: Ngay cả khi người dùng export Excel với filter hẹp (vd 1 department, 1 tháng), hệ thống vẫn tải toàn bộ Document `CONFIRM_STATUS`/`CHECK_DAMAGE` của MỌI department, MỌI thời điểm vào 1 `Map` trong RAM trước khi bắt đầu stream — chi phí không tỷ lệ với kích thước export thực tế mà tỷ lệ với **tổng số REPORT tích luỹ từ trước tới nay trong toàn hệ thống**. Đây là điểm không nhất quán với phần còn lại của hàm (đã dùng cursor + streaming đúng cách cho phần Document chính, xem PERF-11).
- **Risk**: **POTENTIAL RISK**, mức độ tăng dần theo thời gian vận hành hệ thống (dữ liệu lịch sử càng nhiều, chi phí mỗi lần export càng tăng, kể cả export phạm vi nhỏ) — **NEEDS BENCHMARK** để biết ngưỡng gây ảnh hưởng rõ rệt.
- **Recommendation**: Áp dụng cùng bộ filter (department/khoảng thời gian) đã có ở query Document chính vào `buildMapFromReports`, hoặc đổi sang tra cứu theo từng batch/theo `referenceTo` cụ thể của các Document đang được export thay vì tải toàn bộ 2 subType.

### PERF-09 — Cron cảnh báo Asset/Medical Device: N+1 query Role/User lặp lại cho mỗi asset, ghi tuần tự không batch (MỚI, Phase 10)
- **Area**: Backend / N+1, Backend / Repeated computation
- **Evidence**: `assetAlerts.service.ts:checkWarrantyExpiringService`/`checkMaintenanceOverdueService`:
  ```js
  const assets = await Asset.find({...}).populate("department", "code name");
  for (const asset of assets) {
    await notifyUsersByRoleName(ALERT_RECIPIENT_ROLE, {...});   // BÊN TRONG: Role.findOne + User.find (2 query MỚI mỗi lần gọi, dù roleName luôn giống nhau "IT")
    asset.warrantyAlertSentAt = now;
    await asset.save();                                          // 1 write riêng mỗi asset, không dùng bulkWrite
  }
  ```
  `notifyUsersByRoleName` (`notification.service.ts`) tự thực hiện `Role.findOne({name: roleName})` + `User.find({role: role._id, isActive:true})` — 2 query — **mỗi lần được gọi**, không có cơ chế cache/truyền sẵn danh sách user trong phạm vi 1 lần chạy cron.
- **File**: `backend/src/services/assets/assetDevice/assetAlerts.service.ts`, `backend/src/services/assets/medicalDevice/medicalDeviceAlerts.service.ts` (cùng pattern, chưa đọc chi tiết từng dòng nhưng cùng gọi `notifyUsersByRoleName` theo kiến trúc chung), `backend/src/services/notifications/notification.service.ts:notifyUsersByRoleName`
- **Function**: `checkWarrantyExpiringService`, `checkMaintenanceOverdueService`, `notifyUsersByRoleName`
- **Impact**: Nếu N asset cần cảnh báo trong 1 lần chạy cron, hệ thống thực hiện **2×N query Role/User dư thừa** (kết quả giống hệt nhau ở mọi lần lặp vì `roleName` cố định `"IT"`) thay vì 1 lần duy nhất, cộng thêm N lệnh `asset.save()` riêng lẻ thay vì 1 `bulkWrite`. Vì đây là cron chạy nền (không chặn request người dùng — Phase 08 §7 xác nhận `sendEmail` không `await` chặn), tác động tới trải nghiệm người dùng trực tiếp THẤP, nhưng tăng tải không cần thiết lên MongoDB mỗi lần cron chạy (2 lần/ngày theo Phase 08: 08:00 và 08:05).
- **Risk**: **CONFIRMED FROM CODE** (N+1 pattern chắc chắn xảy ra theo logic); mức độ ảnh hưởng tỷ lệ với số lượng asset/thiết bị cần cảnh báo mỗi ngày — **POTENTIAL RISK** thấp ở quy mô nội bộ điển hình (hàng chục-hàng trăm asset), có thể đáng kể hơn nếu số lượng asset lớn (hàng nghìn+).
- **Recommendation**: Tính `Role`/`User` recipient MỘT LẦN trước vòng lặp (đã có sẵn hàm `hasValidRecipients` kiểm tra tồn tại — có thể tái sử dụng kết quả `role._id`/danh sách user thay vì để `notifyUsersByRoleName` tự query lại); gộp `asset.save()` thành `Asset.bulkWrite([...])` hoặc `updateMany` theo danh sách ID sau khi gửi thông báo xong.

### PERF-10 — Excel Import Asset — per-row `Asset.create` tuần tự, không batch (MỚI, Phase 10, mức độ nhẹ hơn PERF-07)
- **Area**: Backend / Repeated computation
- **Evidence**: `assetExcel.service.ts:importAssetsExcel` đã tránh N+1 cho lookup category/department (pre-fetch 1 lần bằng `Promise.all` + `Map`, có comment tường minh tham chiếu cách làm của `importDocumentsExcel`) — đây là điểm THIẾT KẾ TỐT hơn hẳn import Document. Tuy nhiên phần ghi dữ liệu vẫn là `await Asset.create(...)` **từng dòng một** trong vòng lặp tuần tự, không dùng `insertMany`/`bulkWrite`, và KHÔNG bọc trong `withTransaction` (khác Document import).
- **File**: `backend/src/services/assets/assetDevice/assetExcel.service.ts`
- **Function**: `importAssetsExcel`
- **Impact**: Nhẹ hơn PERF-07 (không có transaction overhead nhân theo dòng, không có query dedup `findOne` phụ mỗi dòng), nhưng vẫn là N lệnh ghi tuần tự thay vì 1 lệnh batch — thời gian xử lý vẫn tỷ lệ tuyến tính với số dòng, dù hệ số nhỏ hơn nhiều so với PERF-07.
- **Risk**: **POTENTIAL RISK**, thấp hơn PERF-07 — **NEEDS BENCHMARK** để so sánh cụ thể.
- **Recommendation**: Cân nhắc `Asset.insertMany()` theo batch (vd 100-500 bản ghi/batch) sau khi đã validate + sinh `assetCode` cho toàn bộ dòng hợp lệ, thay vì `create()` từng dòng — lưu ý `generateAssetCode` là atomic counter nên vẫn cần gọi tuần tự cho phần sinh mã, nhưng phần ghi DB cuối cùng có thể batch.

### PERF-11 — Excel Export (Document, Asset) — thiết kế TỐT, dùng cursor + streaming (điểm tích cực, xác nhận Phase 10)
- **Area**: Backend / File Processing — đối trọng tích cực
- **Evidence**: `exportDocumentsExcelPRO` và `exportAssetsExcelPRO` đều dùng `ExcelJS.stream.xlsx.WorkbookWriter({stream: res})` kết hợp `Model.find(filter)....lean().cursor()` + `for await` — dữ liệu được đọc và ghi ra response theo dòng (streaming), KHÔNG tải toàn bộ tập kết quả export vào RAM cùng lúc trước khi gửi.
- **File**: `backend/src/services/excel/excel.service.ts`, `backend/src/services/assets/assetDevice/assetExcel.service.ts`
- **Impact**: Bộ nhớ sử dụng cho phần export chính KHÔNG tỷ lệ với tổng số bản ghi export (chỉ tỷ lệ với kích thước buffer streaming của ExcelJS) — thiết kế đúng chuẩn cho xuất dữ liệu lớn. (Ngoại lệ: `buildMapFromReports` dùng trong `exportDocumentsExcelPRO` KHÔNG theo pattern này — xem PERF-08.)
- **Confidence**: CONFIRMED FROM CODE.

### PERF-12 — Performance Log Buffer — thiết kế TỐT, batch insert giảm round-trip (điểm tích cực, kế thừa & xác nhận chi tiết Phase 03/08)
- **Area**: Backend / Logging overhead
- **Evidence**: `performanceLogBuffer.ts` — gom log trong RAM (`Map`/mảng), flush bằng `insertMany(..., {ordered:false})` khi đủ `FLUSH_SIZE=50` bản ghi HOẶC mỗi `FLUSH_INTERVAL_MS=10s`; middleware chỉ sample 10% request bình thường (`PERF_SAMPLE_RATE`, mặc định 0.1), luôn log 100% request chậm (>800ms) và lỗi (status ≥400).
- **File**: `backend/src/shared/performance/performanceLogBuffer.ts`, `backend/src/middlewares/performance.middleware.ts`
- **Impact**: Giảm số lệnh ghi MongoDB cho mục đích performance-logging xuống ước tính 50-100 lần so với ghi từng request riêng lẻ (theo đúng comment trong code) — tránh việc logging phụ trợ cạnh tranh I/O với query nghiệp vụ chính. Đánh đổi: nếu process crash giữa 2 lần flush, tối đa `FLUSH_SIZE-1` bản ghi log (không phải dữ liệu nghiệp vụ) có thể bị mất — chấp nhận được vì đây chỉ là log phụ trợ.
- **Confidence**: CONFIRMED FROM CODE.

### PERF-13 — `withTransaction` — chi phí cố hữu của multi-document ACID transaction (kế thừa Phase 02/04)
- **Area**: Backend / Database round-trip overhead
- **Evidence**: Mọi transaction yêu cầu MongoDB replica set (Phase 02 §3.4) — về bản chất transaction có overhead cao hơn write đơn lẻ (2-phase: nhiều round-trip nội bộ giữa driver/server hơn write thường).
- **Risk**: **NEEDS BENCHMARK** — không có cơ sở định lượng cụ thể từ source code, chỉ là đặc điểm cố hữu đã biết của MongoDB transaction nói chung; kết hợp PERF-07 làm tăng đáng kể tác động (transaction × N dòng).
- **Recommendation**: Không cần hành động riêng ngoài việc xử lý PERF-07 (giảm số lần transaction) — ghi nhận như bối cảnh chung.

---

## 3. API

### PERF-14 — Không có caching layer nào (Redis/CDN/HTTP cache header) (kế thừa Phase 02 §1)
- **Area**: API / Caching
- **Evidence**: Không có Redis/Memcached trong dependencies (Phase 01); không thấy `Cache-Control`/`ETag` header nào được set tường minh ở bất kỳ controller nào đã đọc qua các phase.
- **Impact**: Mọi request (kể cả dữ liệu ít thay đổi như Department, RBAC list, Dashboard) đều tính toán lại từ đầu mỗi lần gọi — không tận dụng được cache HTTP phía client/CDN.
- **Risk**: **POTENTIAL RISK**, mức độ phụ thuộc tần suất gọi thực tế của các endpoint ít thay đổi (Department/RBAC list là ứng viên tốt cho cache ngắn hạn) — **NEEDS BENCHMARK**/đo traffic thực tế để ưu tiên đúng endpoint.
- **Recommendation**: Cân nhắc thêm `Cache-Control` cho các endpoint danh mục ít thay đổi (Departments, AssetCategory), hoặc cache in-memory ngắn hạn tương tự permission cache đã có cho RBAC.

### PERF-15 — Pagination bug (`GET /documents`, `/users`, `/notifications`) — hệ quả performance ngoài ý muốn (kế thừa Phase 05 §4.4-4.6, góc nhìn mới)
- **Area**: API / Pagination
- **Evidence**: đã CONFIRMED chi tiết ở Phase 05 — `validateQuery` bị comment khiến `page`/`limit` không được coerce đúng.
- **Impact bổ sung góc nhìn performance (MỚI)**: hệ quả của bug này đối với `GET /api/documents` cụ thể là **luôn giới hạn 10 bản ghi/trang** (Phase 05) — về hiệu năng, đây thực chất lại VÔ TÌNH giới hạn tải, không gây quá tải; NGƯỢC LẠI, nếu `GET /api/users`/`GET /api/notifications` rơi vào nhánh `skip(NaN)`/`limit(NaN)` mà driver diễn giải thành "không giới hạn" (hành vi cụ thể vẫn UNKNOWN theo Phase 05 §12), đây có thể là rủi ro performance thật sự (trả về TOÀN BỘ collection thay vì phân trang) — **NEEDS BENCHMARK/test runtime** để xác nhận hành vi cụ thể của MongoDB driver với `skip(NaN)`.
- **Recommendation**: Xử lý theo khuyến nghị Phase 05/09 (khôi phục `validateQuery`) — vừa giải quyết bug chức năng vừa loại bỏ rủi ro performance tiềm ẩn này.

### PERF-16 — Response payload không giới hạn field trả về ở 1 số endpoint (POTENTIAL, chưa rà soát toàn diện)
- **Area**: API / Response Size
- **Evidence**: Domain `documents` dùng `.select()`/whitelist populate field khá kỹ (Phase 02/03), nhưng chưa rà soát toàn diện 116 endpoint để xác nhận endpoint nào trả về document đầy đủ không cắt field (ngoài phạm vi đọc sâu ở Phase 10 do giới hạn ngân sách context).
- **Risk**: **UNKNOWN/NEEDS BENCHMARK** — không đủ evidence để kết luận, ghi nhận là điểm mở cho phase sau nếu cần rà soát kỹ hơn.

---

## 4. FRONTEND

**N/A** — không có frontend trong repo (xác nhận từ Phase 06, giữ nguyên qua các phase). Không có gì để phân tích cho mục Rendering/Large lists/Bundle/Lazy loading.

---

## 5. FILE PROCESSING (tổng hợp)

| Luồng | Cách xử lý | Đánh giá |
|---|---|---|
| Export Document Excel (`export-documents-excel`) | Cursor + streaming `WorkbookWriter` | TỐT (PERF-11), NGOẠI TRỪ `buildMapFromReports` tải toàn bộ vào RAM không lọc phạm vi (PERF-08) |
| Export Asset Excel (`assets/export`) | Cursor + streaming `WorkbookWriter` | TỐT (PERF-11) |
| Export template (Document/Asset) | `new ExcelJS.Workbook()` in-memory | Chấp nhận được — file template tĩnh, không có data row phụ thuộc DB, kích thước nhỏ cố định |
| Import Document Excel | `ExcelJS.Workbook().load(buffer)` toàn bộ vào RAM, giới hạn `MAX_IMPORT_ROWS=5000`; xử lý PER-ROW transaction | Giới hạn dòng hợp lý cho phần đọc file, nhưng PHẦN GHI DB có vấn đề N+1-transaction nghiêm trọng nhất hệ thống (PERF-07) |
| Import Asset Excel | Tương tự (load buffer, giới hạn 5000 dòng), lookup category/department pre-fetch tốt | Nhẹ hơn Document import nhưng vẫn ghi tuần tự từng dòng (PERF-10) |
| Sync Department từ Excel | Load buffer, giới hạn `MAX_SYNC_ROWS=5000`, dùng `insertMany` batch cho phần ghi | TỐT — không N+1 (đối trọng tích cực, không cần tạo finding riêng vì không có vấn đề) |
| Upload file chung / Certificate kiểm định | Multer `diskStorage`, ghi trực tiếp xuống đĩa theo stream của multer (không qua RAM buffer thủ công) | Về mặt memory, hợp lý (multer tự stream khi dùng `diskStorage`, khác `memoryStorage` dùng cho Excel import) — không phát hiện vấn đề performance mới ở Phase 10, các rủi ro khác (path traversal, rác file mồ côi) đã ghi nhận ở Phase 08/09, không thuộc phạm vi performance |
| Cron cảnh báo Asset/Medical Device | `Asset.find()` 1 lần, sau đó lặp tuần tự gửi thông báo + save từng asset | N+1 query Role/User + ghi tuần tự (PERF-09) |

---

## 6. Bảng tổng hợp Findings

| ID | Area | Risk | Tóm tắt | Confidence |
|---|---|---|---|---|
| PERF-07 | Backend/File Processing | CONFIRMED FROM CODE | Import Document Excel: N+1 transaction, tối đa 5000 transaction/file | CONFIRMED (pattern), NEEDS BENCHMARK (thời gian thực tế) |
| PERF-08 | Backend/File Processing | POTENTIAL RISK | `buildMapFromReports` tải toàn bộ Document theo subType không lọc phạm vi, mỗi lần export | CONFIRMED (code), NEEDS BENCHMARK (mức ảnh hưởng) |
| PERF-09 | Backend | CONFIRMED FROM CODE | Cron alerts: N+1 Role/User query mỗi asset, ghi tuần tự không batch | CONFIRMED |
| PERF-01 | Database | CONFIRMED FROM CODE | `WorkflowInstance` COLLSCAN qua `$expr`, không index | CONFIRMED (kế thừa Phase 04) |
| PERF-10 | Backend/File Processing | POTENTIAL RISK | Import Asset Excel: ghi tuần tự từng dòng, không batch | CONFIRMED (code), NEEDS BENCHMARK |
| PERF-02 | Database | CONFIRMED FROM CODE (thiếu index) | `RefreshToken` không index `token`, không tự dọn | CONFIRMED (kế thừa Phase 04) |
| PERF-05 | Database | POTENTIAL RISK | Thiếu `.lean()` ở Users/RBAC list (hydration overhead) | CONFIRMED (thiếu lean), POTENTIAL (mức ảnh hưởng) |
| PERF-03 | Database | POTENTIAL RISK | `Document` thiếu index `isActive`/`deletedAt` cho dashboard | CONFIRMED (kế thừa Phase 04) |
| PERF-04 | Database | POTENTIAL RISK | 7/21 model không có index bổ sung | CONFIRMED (kế thừa Phase 04) |
| PERF-14 | API | POTENTIAL RISK | Không có caching layer nào (Redis/HTTP cache) | CONFIRMED (thiếu), NEEDS BENCHMARK (mức ảnh hưởng) |
| PERF-15 | API | NEEDS BENCHMARK | Pagination bug — hệ quả performance chưa rõ với Users/Notifications | UNKNOWN (kế thừa Phase 05) |
| PERF-13 | Backend | NEEDS BENCHMARK | Overhead cố hữu của MongoDB transaction, khuếch đại bởi PERF-07 | INFERRED |
| PERF-06 | Database | KHÔNG ĐÁNG KỂ HIỆN TẠI | `Policy` thiếu index nhưng ABAC dead runtime (Phase 07) → tần suất = 0 | CONFIRMED |
| PERF-16 | API | UNKNOWN | Response payload size chưa rà soát toàn diện | UNKNOWN |
| PERF-11 | Backend (tích cực) | — | Export Document/Asset dùng cursor + streaming đúng chuẩn | CONFIRMED |
| PERF-12 | Backend (tích cực) | — | Performance log buffer — batch insert, giảm round-trip | CONFIRMED |

---

## 7. Điểm thiết kế hiệu năng TỐT đã xác nhận (đối trọng, để khách quan)

- Export Excel (Document, Asset) dùng MongoDB cursor (`.lean().cursor()`) + `ExcelJS.stream.xlsx.WorkbookWriter` streaming thẳng ra `res` — không giới hạn bởi RAM cho phần dữ liệu chính, thiết kế đúng chuẩn cho xuất dữ liệu lớn.
- `syncDepartmentFromExcel` dùng `insertMany({ordered:false})` cho phần ghi hàng loạt — không N+1.
- Import Asset Excel pre-fetch category/department 1 lần bằng `Promise.all` (tự tham chiếu rõ ràng trong comment tới cách làm của Document import) — tránh N+1 cho phần lookup, dù phần ghi vẫn tuần tự (PERF-10).
- `performanceLogBuffer.ts` — batch + sampling, giảm đáng kể tải ghi log phụ trợ lên MongoDB, có giải thích rõ lý do thiết kế trong comment.
- Giới hạn số dòng import/sync (`MAX_IMPORT_ROWS`/`MAX_SYNC_ROWS = 5000`) — chặn được trường hợp cực đoan (file quá lớn), dù bản thân việc xử lý 5000 dòng vẫn có vấn đề PERF-07/PERF-10.
- Dashboard dùng `Promise.all` chạy song song nhiều aggregate thay vì tuần tự (Phase 04 §9.2) — giảm tổng thời gian chờ so với chạy lần lượt.
- Email gửi trong `createNotification` KHÔNG `await` (fire-and-forget, bắt lỗi riêng) — không chặn luồng chính chờ SMTP phản hồi (giảm nhẹ đáng kể tác động của PERF-09 lên tổng thời gian chạy cron, dù vẫn còn N+1 ở phần query).

---

## 8. Unknowns / cần benchmark ở phase sau

- Thời gian xử lý thực tế của `importDocumentsExcel` với file ở ngưỡng vài nghìn dòng (PERF-07) — cần môi trường benchmark thật, ngoài phạm vi source-code-only.
- Ngưỡng số lượng `WorkflowInstance`/`RefreshToken` khiến COLLSCAN gây chậm rõ rệt (PERF-01/02) — phụ thuộc phần cứng MongoDB thực tế, cần benchmark.
- Hành vi chính xác của MongoDB driver với `.skip(NaN)`/`.limit("<string>")` (carry-over Phase 05, liên quan PERF-15).
- Số lượng bản ghi thực tế trong các collection lớn nhất (`Document`, `WorkflowInstance`, `Notification`, `ApiPerformance`) ở môi trường vận hành thật — ảnh hưởng trực tiếp mức độ nghiêm trọng của mọi finding "POTENTIAL RISK"/"NEEDS BENCHMARK" ở trên; hoàn toàn UNKNOWN từ source code tĩnh.
- Traffic thực tế (request/giây, phân bố theo endpoint) — cần thiết để ưu tiên đúng finding nào đáng xử lý trước (vd PERF-14 caching chỉ đáng làm nếu endpoint liên quan được gọi thường xuyên).
- Chưa rà soát toàn diện response payload size cho 116 endpoint (PERF-16) — ngoài ngân sách context của 1 phase.

---

**PHASE 10 COMPLETED**

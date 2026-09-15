# 07 — DASHBOARD / KPI — CODE REVIEW

> REVIEW-07. Chỉ review, KHÔNG sửa source. Phạm vi: `routes/dashboard`, `controllers/dashboard`, `services/dashboard/*.ts` (3 file: `dashboard.service.ts`, `assetDashboard.service.ts`, `medicalDeviceDashboard.service.ts`) — 12 endpoint, toàn bộ dùng chung permission `DASHBOARD_READ`.
>
> Nguồn đọc trực tiếp: `backend/src/routes/dashboard/dashboard.route.ts`, `backend/src/controllers/dashboard/dashboard.controller.ts`, `backend/src/services/dashboard/{dashboard.service.ts,assetDashboard.service.ts,medicalDeviceDashboard.service.ts}`, `backend/src/shared/utils/Queryparsing.util.ts`, `backend/src/shared/cache/memoryCache.ts`, đối chiếu `backend/src/models/documents/document.model.ts` và `backend/src/models/assets/asset.model.ts` (index).
>
> Baseline đã đọc trước khi verify source: `docs/00_PROJECT_MEMORY.md`, `docs/05_API_ANALYSIS.md` §2.11, `docs/10_PERFORMANCE_ANALYSIS.md` (PERF-03).
>
> **Nhận xét tổng quan**: Domain này đã trải qua 1 đợt refactor hiệu năng/chất lượng RÕ RỆT và được document đầy đủ ngay trong code (khối "GHI CHÚ REFACTOR" ở đầu `dashboard.service.ts`/`dashboard.controller.ts`) — sửa đúng bug đã ghi nhận ở Phase 03/04 (filter `department` không cast ObjectId trong aggregate), gộp pipeline 2 lần quét thành `$facet` 1 lần, thêm whitelist `sortBy`, validate `month`/`year`/`fromDate`/`toDate` chặt, thêm cache TTL. Không phát hiện CRITICAL/HIGH nào trong review này — điểm đáng chú ý nhất là 1 finding liên domain (RV07-05) củng cố thêm bằng chứng cho RV05-01 (CRITICAL) đã ghi nhận ở REVIEW-05.

---

## A. TÓM TẮT

| # | ID | Severity | Category | Trạng thái |
|---|----|----------|----------|------------|
| 1 | RV07-01 | MEDIUM | Authorization / Data exposure | POTENTIAL RISK (cùng dạng RV05-04/RV06-04) |
| 2 | RV07-02 | LOW-MEDIUM | Performance | CONFIRMED (= PERF-03, mở rộng thêm sang Asset) |
| 3 | RV07-03 | LOW | Cache / Staleness | CONFIRMED (finding MỚI) |
| 4 | RV07-04 | LOW | Maintainability | CONFIRMED (tự ghi nhận trong code) |
| 5 | RV07-05 | INFO (liên domain, củng cố CRITICAL đã có) | Business Logic / KPI correctness | CONFIRMED |
| 6 | RV07-06 | LOW-MEDIUM | KPI correctness | POTENTIAL RISK (finding MỚI) |
| 7 | RV07-07 | INFO (positive) | — | CONFIRMED |

---

## B. FINDINGS CHI TIẾT

### RV07-01 — Không có department-scoping ở bất kỳ endpoint dashboard nào (trừ admin-summary) (MEDIUM, POTENTIAL RISK)

- **File**: `backend/src/controllers/dashboard/dashboard.controller.ts` (toàn bộ handler trừ `adminDashboardSummary`)
- **File phụ**: `backend/src/services/dashboard/dashboard.service.ts` (`departmentDashboardService`)

**Observed behavior**: Chỉ `adminDashboardSummary` có check nghiêm ngặt hơn route (`req.user!.role.name !== "ADMIN"` → forbidden). **11 endpoint còn lại** — bao gồm `GET /dashboard/department/:departmentId` — chỉ cần permission `DASHBOARD_READ` cấp hệ thống, không có bất kỳ ràng buộc nào yêu cầu người gọi thuộc đúng phòng ban đang xem, hay giới hạn phạm vi dữ liệu KPI tổng hợp (`proposal-conversion`, `device-damage-trend`, `top-damaged-devices/inks`, `assets/summary`, `medical-devices/summary`...) theo phòng ban của người gọi.

**Evidence**: đọc toàn văn `dashboard.route.ts` (tất cả 12 route cùng 1 permission `DASHBOARD_READ`) + `departmentDashboardService()` (chỉ validate `departmentId` là ObjectId hợp lệ và department tồn tại — KHÔNG so sánh với danh tính người gọi).

**Impact**: Nếu `DASHBOARD_READ` được gán cho role không phải Admin toàn quyền (VD "Trưởng khoa" — vốn hợp lý chỉ nên xem KPI phòng ban mình), người này vẫn xem được dashboard/KPI của TOÀN BỘ phòng ban khác qua đổi `:departmentId`, và xem được các KPI tổng hợp toàn hệ thống (top damaged devices/ink, proposal conversion mọi khoa) dù các KPI này lẽ ra có thể coi là thông tin quản lý cấp cao. Cùng dạng finding đã ghi nhận RV05-04 (Documents) và RV06-04 (Assets) — **UNKNOWN** đây có phải chủ đích ("Dashboard = công cụ quản lý tập trung, chỉ Admin/quản lý cấp cao mới có DASHBOARD_READ") hay là thiếu sót.

**Recommendation**: Xác nhận với chủ dự án model phân quyền thực tế của `DASHBOARD_READ` trong RBAC (role nào đang giữ permission này). Nếu có role không phải Admin/quản lý cấp cao đang giữ permission này, cân nhắc bổ sung scoping theo phòng ban giống mức độ nghiêm ngặt đã áp dụng cho `admin-summary`.

**Confidence**: HIGH (evidence code), UNKNOWN về ý định nghiệp vụ.

---

### RV07-02 — `Document`/`Asset` vẫn thiếu index chuyên dụng cho filter `isActive` mà mọi aggregate dashboard đều dùng (LOW-MEDIUM, CONFIRMED — mở rộng PERF-03)

- **File 1**: `backend/src/models/documents/document.model.ts` (đối chứng: mọi hàm trong `dashboard.service.ts`)
- **File 2**: `backend/src/models/assets/asset.model.ts` (đối chứng: `getAssetDashboardSummaryService`, `getWarrantyExpiringListService`, `getMaintenanceOverdueListService`)

**Observed behavior**: Xác nhận lại PERF-03 (Phase 10) cho `Document` — mọi aggregate trong `dashboard.service.ts` đều `$match: {isActive: true, deletedAt: null, ...}` làm điều kiện ĐẦU TIÊN, nhưng `Document` chỉ có index `{department:1, subType:1, createdAt:-1}`, `{createdAt:-1}`, không có index riêng/compound chứa `isActive`. Đọc thêm `asset.model.ts` xác nhận **CÙNG GAP tồn tại cho `Asset`**: `getAssetDashboardSummaryService`/`getWarrantyExpiringListService`/`getMaintenanceOverdueListService` đều `$match: {isActive: true, ...}` trước tiên, nhưng `Asset` chỉ có index `{department:1,status:1}`, `{category:1,status:1}`, `{assignedTo:1}`, `{name/assetCode/serialNumber:"text"}` — không có index nào bắt đầu bằng `isActive`.

**Evidence**: đọc toàn văn cả 2 model file (phần `/* ===== INDEX ===== */`).

**Impact**: Không đổi nhiều so với Phase 10 (mức độ phụ thuộc kích thước dữ liệu thật, UNKNOWN) — nhưng review này xác nhận đây KHÔNG PHẢI vấn đề riêng của `Document`, mà là mẫu hình lặp lại ở cả `Asset` khi làm dashboard — 5/6 aggregate dashboard Asset đều chịu ảnh hưởng tương tự.

**Recommendation**: Không đổi so với Phase 10 — cân nhắc thêm index compound có `isActive` làm field đầu (VD `{isActive:1, department:1, createdAt:-1}` cho Document, `{isActive:1, status:1}` cho Asset) nếu benchmark xác nhận cần thiết.

**Confidence**: HIGH.

---

### RV07-03 — Cache dashboard chỉ dựa vào TTL, cơ chế invalidate chủ động tồn tại nhưng KHÔNG được gọi ở bất kỳ đâu (LOW, CONFIRMED — finding MỚI)

- **File 1**: `backend/src/shared/cache/memoryCache.ts` (`clearCacheKey`, `clearCacheByPrefix`)
- **File 2**: toàn bộ codebase (kiểm tra consumer)

**Observed behavior**: `memoryCache.ts` export sẵn `clearCacheKey`/`clearCacheByPrefix`/`clearAllMemoryCache` — đúng mục đích theo comment: *"xoá theo prefix — vd xoá hết cache liên quan 'dashboard:' sau 1 thao tác ghi lớn (import Excel, bulk update...)"*. Nhưng `grep` toàn bộ `backend/src` xác nhận **không có bất kỳ lời gọi nào** tới 3 hàm này ngoài chính file định nghĩa — không có service ghi dữ liệu nào (`createDocumentService`, `approveStep`, `assignAssetService`, `createCalibrationRecordService`, `importAssetsExcel`...) chủ động invalidate cache dashboard sau khi ghi.

**Evidence**: `grep -rn "clearCacheByPrefix|clearCacheKey|clearAllMemoryCache" backend/src` chỉ khớp đúng định nghĩa trong `memoryCache.ts`, không có consumer nào khác.

**Impact**: THẤP trong thực tế — vì TTL mặc định chỉ 30 giây (`DASHBOARD_CACHE_TTL_MS`), cửa sổ dữ liệu "cũ" tối đa là 30s, chấp nhận được cho use-case "xem tổng quan" như comment trong `memoryCache.ts` đã tự nhận định. Ghi nhận vì đây là code ĐÃ VIẾT SẴN cho 1 mục đích cụ thể nhưng chưa từng được dùng — tiềm ẩn rủi ro nếu sau này ai đó tăng TTL lên (VD 5-10 phút để giảm tải DB hơn nữa) mà không nhớ bổ sung invalidate chủ động, "cửa sổ cũ" sẽ giãn ra tương ứng.

**Recommendation**: Không bắt buộc sửa ở TTL hiện tại (30s là chấp nhận được) — nếu tăng TTL trong tương lai, cần đi kèm bổ sung gọi `clearCacheByPrefix("dashboard:")` ở các action ghi dữ liệu quan trọng (tạo/duyệt Document, import Excel...).

**Confidence**: HIGH.

---

### RV07-04 — 2 pattern phân trang aggregate cùng tồn tại song song (LOW, CONFIRMED — tự ghi nhận trong code)

- **File 1**: `backend/src/services/dashboard/dashboard.service.ts` (hàm `runPaginatedAggregate` cục bộ, dùng `Document.aggregate` cứng)
- **File 2**: `backend/src/shared/utils/Queryparsing.util.ts` (`runPaginatedAggregate` dùng chung, nhận `Model` làm tham số)
- **File 3**: `backend/src/services/dashboard/medicalDeviceDashboard.service.ts` (dùng bản ở File 2)

**Observed behavior**: `dashboard.service.ts` tự định nghĩa 1 hàm `runPaginatedAggregate` RIÊNG (dòng 66-91), gắn cứng với model `Document`, thay vì dùng hàm cùng tên đã có sẵn ở `Queryparsing.util.ts` (nhận `Model` bất kỳ làm tham số — tổng quát hơn). `medicalDeviceDashboard.service.ts` dùng đúng bản dùng chung. Comment trong `medicalDeviceDashboard.service.ts` (dòng 9-16) TỰ THỪA NHẬN đây là 2 pattern song song, giải thích lý do lịch sử (file `dashboard.service.ts` viết trước khi có tiện ích dùng chung) và chủ đích không sửa lại file cũ ở phạm vi task đó.

**Evidence**: đối chiếu trực tiếp 2 định nghĩa hàm cùng tên `runPaginatedAggregate` ở 2 file khác nhau.

**Impact**: Không ảnh hưởng runtime (cả 2 đều hoạt động đúng) — thuần technical debt, dễ gây nhầm lẫn khi import sai hàm hoặc khi cần sửa logic `$facet` chung (phải sửa 2 nơi).

**Recommendation**: Khi có dịp refactor `dashboard.service.ts`, chuyển sang dùng hàm dùng chung ở `Queryparsing.util.ts` (`assetDashboard.service.ts` cũng đang tự viết `$facet` bằng tay riêng — có thể gộp cả 3 nơi).

**Confidence**: HIGH.

---

### RV07-05 — Bằng chứng liên domain củng cố thêm cho RV05-01 (CRITICAL, đã ghi nhận ở REVIEW-05) (INFO, CONFIRMED)

- **File**: `backend/src/services/dashboard/dashboard.service.ts:478-482` (`topDamagedInkService`)
- **Đối chiếu**: `backend/src/shared/constants/documentRules.ts` (`DOCUMENT_RULES.CONFIRM_STATUS`), `backend/src/services/documents/workflow.service.ts` (`syncAssetOnDocumentApproved`) — đã phân tích ở `docs/module-reviews/05_DOCUMENTS_CODE_REVIEW.md` (RV05-01).

**Observed behavior**: KPI "Top mực hỏng nhiều nhất" (`topDamagedInkService`) group theo `DocumentSubType.CONFIRM_STATUS`:
```ts
export const topDamagedInkService = (params: DamageReportKpiParams) =>
  getDamageReportKpiService(DocumentSubType.CONFIRM_STATUS, params);
```
Đây là bằng chứng RUNTIME/BUSINESS bổ sung cho RV05-01: `DOCUMENT_RULES.CONFIRM_STATUS.referenceSubType = PROPOSE_INK` (documentRules.ts) — khớp với việc dashboard đặt tên/dùng `CONFIRM_STATUS` cho KPI "mực" (ink), CHỨ KHÔNG PHẢI cho luồng xác nhận sửa chữa (repair). Điều này củng cố thêm giả thuyết đã nêu ở RV05-01: `documentRules.ts` (yêu cầu CONFIRM_STATUS tham chiếu PROPOSE_INK) nhiều khả năng đúng ý định gốc, còn `workflow.service.ts:syncAssetOnDocumentApproved` (hard-code tìm proposal `subType: PROPOSE_REPAIR` khi xử lý document `CONFIRM_STATUS`) mới là phần code sai — chứ không phải ngược lại.

**Evidence**: đọc trực tiếp `topDamagedInkService`/`getDamageReportKpiService` + đối chiếu `documentRules.ts`/`workflow.service.ts` (đã đọc ở REVIEW-05).

**Impact**: Không tạo thêm finding mới độc lập — CHỈ bổ sung bằng chứng cho RV05-01 đã có, giúp thu hẹp phạm vi điều tra khi xử lý finding đó (gợi ý nơi cần sửa nhiều khả năng là `workflow.service.ts`, không phải `documentRules.ts`). Đề nghị đọc kèm RV05-01 khi quyết định hướng fix.

**Recommendation**: Khi xử lý RV05-01, đọc thêm finding này làm bằng chứng bổ sung; xác nhận với chủ dự án ý nghĩa THẬT của `CONFIRM_STATUS` (báo cáo xác nhận tình trạng SAU SỬA CHỮA hay báo cáo liên quan MỰC/vật tư tiêu hao) trước khi sửa.

**Confidence**: HIGH (evidence code trực tiếp, không suy diễn).

---

### RV07-06 — `$unwind: "$meta.items"` không có `preserveNullAndEmptyArrays` — document thiếu/sai kiểu `meta.items` bị âm thầm loại khỏi KPI (LOW-MEDIUM, POTENTIAL RISK — finding MỚI)

- **File**: `backend/src/services/dashboard/dashboard.service.ts` — `getDamageReportKpiService` (dòng 459), `getDashboardDeviceStats` (dòng 530)

**Observed behavior**: Cả 2 pipeline dùng `{ $unwind: "$meta.items" }` KHÔNG kèm `preserveNullAndEmptyArrays: true`. `Document.meta` là field `Schema.Types.Mixed` không có ràng buộc shape ở tầng DB (đã ghi nhận Phase 04 §11 — "Thiếu validation ở tầng Schema cho Mixed field"), phụ thuộc hoàn toàn vào Zod DTO ở tầng tạo document. Theo hành vi mặc định MongoDB, `$unwind` trên 1 field KHÔNG TỒN TẠI, `null`, hoặc KHÔNG PHẢI mảng sẽ **loại bỏ hẳn document đó khỏi kết quả** (không lỗi, không cảnh báo).

**Evidence**: đọc trực tiếp 2 pipeline — không có `preserveNullAndEmptyArrays` ở object `$unwind` (so sánh với `assetDashboard.service.ts`/`medicalDeviceDashboard.service.ts`, nơi mọi `$unwind` liên quan `$lookup` optional ĐỀU có `preserveNullAndEmptyArrays: true`).

**Impact**: Nếu có document `CHECK_DAMAGE`/`CONFIRM_STATUS`/PROPOSAL nào được tạo với `meta.items` thiếu, `null`, hoặc không phải mảng (không có ràng buộc DB nào ngăn việc này — chỉ phụ thuộc DTO tầng tạo document ở thời điểm đó có validate đúng hay không, hoặc dữ liệu cũ từ trước khi có validate chặt), document đó biến mất KHỎI MỌI KPI liên quan (`topDamagedDevices`, `topDamagedInk`, `deviceStats`) mà không có cách nào phát hiện qua API — số liệu KPI báo cáo cho quản lý có thể THIẾU mà không ai biết.

**Recommendation**: Cân nhắc thêm `preserveNullAndEmptyArrays: true` kèm 1 nhánh xử lý rõ ràng (VD gán `deviceName: "(không xác định)"` hoặc loại có chủ đích kèm log/counter riêng), để phân biệt "có dữ liệu nhưng bị loại có chủ đích" với "im lặng biến mất do thiếu field".

**Confidence**: MEDIUM — hành vi `$unwind` mặc định CONFIRMED đúng theo tài liệu MongoDB, nhưng tần suất `meta.items` thực tế bị thiếu/sai kiểu trong dữ liệu production là **UNKNOWN** (phụ thuộc lịch sử validate DTO qua các phiên bản khác nhau của hệ thống).

---

### RV07-07 — Positive findings

1. **Refactor hiệu năng rõ rệt, có ghi chú đầy đủ**: gộp pipeline 2 lần quét (`$count` riêng + `data` riêng) thành `$facet` 1 lần cho MỌI KPI phân trang — giảm đúng 50% số lần quét/group cho các endpoint này so với baseline.
2. **Sửa đúng bug filter department không cast Objectid** trong aggregate (`toOptionalObjectId`) — bug này khiến filter theo khoa ở 2 KPI top-damaged trước đây hoàn toàn không hoạt động (silent no-op), nay đã sửa và có unit-test-like comment giải thích rõ nguyên nhân kỹ thuật (Mongoose không tự cast trong aggregate).
3. **Whitelist `sortBy` nhất quán** qua `parsePaginationQuery`/`allowedSortBy` — chặn client đưa field tuỳ ý vào `$sort` (rủi ro nếu không chặn: lộ cấu trúc field nội bộ, hoặc field lồng sâu làm sort chậm bất thường).
4. **Validate `month`/`year`/`fromDate`/`toDate` chặt chẽ**, throw 400 rõ ràng thay vì tạo `Invalid Date` âm thầm — đúng nguyên tắc đã áp dụng tốt ở domain khác (`documents`).
5. **`complianceRate = null` (không phải 0) khi không có dữ liệu** — tránh FE hiểu nhầm "0% tuân thủ" khi thực chất "chưa có gì để tính" — chi tiết nhỏ nhưng thể hiện tư duy đúng về ý nghĩa dữ liệu.
6. **`adminDashboardSummary` có check nghiêm ngặt HƠN route** (bắt buộc đúng ADMIN, không chỉ `DASHBOARD_READ`) — đúng comment giải thích rõ đây là "rule nghiêm ngặt hơn route-level, không phải logic thừa".
7. **Không phát hiện lỗi thứ tự route** nào trong `dashboard.route.ts` (không có route dạng `:param` nào đứng trước route literal cùng độ dài path gây xung đột).
8. **Toàn bộ 250 dòng code chết (comment cũ) đã được XOÁ HẲN** ở lần refactor `dashboard.service.ts` gần nhất (tự ghi nhận trong "GHI CHÚ REFACTOR" #7) — khác hẳn `workflow.service.ts` (RV05-09) và `assetAssignment.service.ts` (RV06-05), nơi code chết tương tự vẫn còn nguyên. Đây là mẫu hình ĐÚNG nên áp dụng lại cho 2 file kia.

---

## C. CÁC MỤC ĐÃ XÁC MINH LẠI, KHÔNG PHÁT HIỆN THÊM VẤN ĐỀ

- **12/12 route đều có `authenticate` + `authorizePermission("DASHBOARD_READ")`** — không route nào thiếu authorization, khớp hoàn toàn Phase 05 §2.11.
- **`getDashboardDeviceStats`**: validate `month` (1-12)/`year` (2000-2100) đầy đủ — đúng như "GHI CHÚ REFACTOR" #6 tự ghi nhận, không còn chỉ check "truthy" như bản cũ.
- **`meta.items.description` (REPORT) vs `meta.items.deviceName` (PROPOSAL)**: xác nhận đây là 2 field hợp lệ khác nhau theo loại document (comment tự ghi chú rõ, không phải bug/nhầm lẫn).
- **Không phát hiện N+1 query nào** trong 3 file service dashboard — mọi thống kê đều dùng `Promise.all`/`$facet` gộp, không có vòng lặp gọi query riêng lẻ (khác hẳn vấn đề N+1 đã ghi nhận ở `notifyUsersByRoleName`/cron alerts của domain khác).

---

## D. UNKNOWN CÒN TỒN ĐỌNG

- RV07-01: model phân quyền thực tế của `DASHBOARD_READ` trong RBAC hiện tại (role nào đang giữ) — quyết định mức độ nghiêm trọng thực tế của việc thiếu department-scoping.
- RV07-02: mức độ nghiêm trọng thực tế phụ thuộc kích thước dữ liệu production — carry-over Phase 04/10/12.
- RV07-06: tần suất `meta.items` bị thiếu/sai kiểu trong dữ liệu thực tế — cần audit dữ liệu production hoặc lịch sử validate DTO qua các phiên bản.
- Ý nghĩa nghiệp vụ THẬT của `CONFIRM_STATUS` (RV07-05/RV05-01) — cần xác nhận trực tiếp với chủ dự án, không tự suy đoán thêm.

---

**Review hoàn tất. Không có thay đổi nào được thực hiện trên source code trong quá trình review này.**

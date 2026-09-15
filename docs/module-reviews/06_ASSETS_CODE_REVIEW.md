# 06 — ASSET MANAGEMENT — CODE REVIEW

> REVIEW-06. Chỉ review, KHÔNG sửa source. Phạm vi: `controllers/assets`, `services/assets`, `models/assets`, `dto/assets`, `routes/assets` — chia 5 tiểu module: (1) Asset, (2) Asset Assignment, (3) Asset Category, (4) Calibration, (5) Medical Device. Trọng tâm đặc biệt: **Asset → Assignment → User/Department → History**.
>
> Nguồn đọc trực tiếp (source hiện tại):
> `backend/src/routes/assets/{asset.routes.ts,assetCategory.routes.ts,medicalDevice.routes.ts}`,
> `backend/src/controllers/assets/{asset.controller.ts,assetAssignment.controller.ts,assetCategory.controller.ts,calibrationRecord.controller.ts,medicalDevice.controller.ts}`,
> `backend/src/dto/assets/{assets.dto.ts,calibrationRecord.dto.ts,medicalDevice.dto.ts}`,
> `backend/src/services/assets/{assets.constants.ts,assetDevice/*.ts,medicalDevice/*.ts}`,
> `backend/src/models/assets/{asset.model.ts,assetAssignmentHistory.model.ts,assetCategory.model.ts,medicalDeviceProfile.model.ts,calibrationRecord.model.ts}`,
> `backend/src/shared/constants/permission.constant.ts` (đối chiếu permission).
>
> Baseline đã đọc trước khi verify source: `docs/00_PROJECT_MEMORY.md`, `docs/04_DATABASE_ANALYSIS.md` §4.13–4.17/§8.2/§12.2, `docs/07_AUTH_RBAC_ANALYSIS.md`, `docs/08_BUSINESS_LOGIC.md` §2.3/§3.4/§4.2–4.3.
>
> **Nhận xét tổng quan trước khi vào finding chi tiết**: domain `assets` (đặc biệt Assignment/Calibration) là 1 trong những phần được code CẨN THẬN NHẤT trong toàn bộ hệ thống tính tới thời điểm review — comment giải thích rất kỹ quyết định thiết kế, có transaction đầy đủ, có cơ chế `hasValidRecipients` chống silent-failure ở cron cảnh báo (một bài học tự rút ra và áp dụng lại nhất quán giữa `assetAlerts` và `medicalDeviceAlerts`), Excel import dùng pre-fetch map tránh N+1 đúng chuẩn. Vì vậy finding nghiêm trọng nhất ở review này không phải lỗi cẩu thả mà là 1 khe hở logic tinh vi (RV06-01) nằm ở chính cơ chế whitelist vốn được thiết kế để BẢO VỆ dữ liệu.

---

## A. TÓM TẮT

| # | ID | Severity | Category | Tiểu module | Trạng thái |
|---|----|----------|----------|-------------|------------|
| 1 | RV06-01 | **HIGH** | Business Logic / Authorization bypass | Asset | CONFIRMED (finding MỚI) |
| 2 | RV06-02 | HIGH | Security (ReDoS) | Asset, Asset Category | CONFIRMED (finding MỚI) |
| 3 | RV06-03 | MEDIUM | Data integrity | Asset | CONFIRMED (= Phase04 §12.2 / ISS-18, không đổi) |
| 4 | RV06-04 | MEDIUM | Authorization / Data exposure | Asset, Assignment | POTENTIAL RISK (finding MỚI, cùng loại RV05-04) |
| 5 | RV06-05 | LOW-MEDIUM | Maintainability | Assignment | CONFIRMED (finding MỚI, cùng loại RV05-09) |
| 6 | RV06-06 | LOW | Performance | Asset Category | CONFIRMED (= Phase04 §9, không đổi) |
| 7 | RV06-07 | LOW | Performance | Asset (Alerts cron) | CONFIRMED (cross-ref PERF-09, không đổi) |
| 8 | RV06-08 | LOW-MEDIUM | Race condition | Assignment | POTENTIAL RISK (finding MỚI) |
| 9 | RV06-09 | INFO (positive) | — | Tất cả | CONFIRMED |

---

## B. FINDINGS CHI TIẾT

### RV06-01 — `PUT /assets/:id` (Update thường) có thể set `isActive: false/true`, bỏ qua toàn bộ guard của soft-delete/restore (HIGH, CONFIRMED)

- **File 1**: `backend/src/dto/assets/assets.dto.ts` (`UpdateAssetDTO`)
- **File 2**: `backend/src/services/assets/assets.constants.ts` (`ASSET_UPDATE_WHITELIST`)
- **File 3**: `backend/src/services/assets/assetDevice/asset.service.ts` (`updateAssetService`, đối chứng `deleteAssetService`/`restoreAssetService`)

**Observed behavior**: Comment ở `UpdateAssetDTO` khẳng định rõ chủ đích thiết kế: *"CHỦ Ý KHÔNG cho sửa `status`/`assignedTo`/`department` qua route update thông thường... phải đi qua endpoint/luồng nghiệp vụ riêng"*. Đúng vậy — 3 field đó bị loại khỏi cả DTO lẫn `ASSET_UPDATE_WHITELIST`. Nhưng **`isActive` KHÔNG nằm trong nhóm bị loại trừ** — nó có mặt tường minh ở CẢ HAI lớp phòng thủ:
```ts
// assets.dto.ts — UpdateAssetDTO
isActive: z.boolean().optional(),
```
```ts
// assets.constants.ts — ASSET_UPDATE_WHITELIST
export const ASSET_UPDATE_WHITELIST = [ ..., "specs", "isActive" ] as const;
```
`updateAssetService` sau đó chạy thẳng `Asset.findOneAndUpdate({_id, isActive:true}, {...safePayload, updatedBy}, {new:true})` — nếu `safePayload.isActive === false`, field được ghi thẳng xuống DB.

So sánh với con đường "chính thức" `deleteAssetService` (route `DELETE /:id`, permission `ASSET_DELETE`):
```ts
if (asset.status === AssetStatus.IN_USE || asset.status === AssetStatus.UNDER_MAINTENANCE) {
  throw ApiError.badRequest("Không thể xoá tài sản đang sử dụng hoặc đang sửa chữa...");
}
asset.isActive = false;
asset.deletedAt = new Date();
asset.deletedBy = userId;
```

**Evidence**: đọc trực tiếp cả 3 file trên — `updateAssetService` (route `PUT /:id`, permission chỉ `ASSET_UPDATE`) không có bất kỳ dòng nào kiểm tra `asset.status` trước khi cho set `isActive: false`, và cũng không set `deletedAt`/`deletedBy` khi `isActive` bị đổi qua đường này.

**Impact**:
1. **Bỏ qua guard trạng thái**: 1 user chỉ có `ASSET_UPDATE` (không cần `ASSET_DELETE`) có thể vô hiệu hoá (`isActive:false`) 1 asset đang `IN_USE`/`UNDER_MAINTENANCE` — đúng điều kiện mà `deleteAssetService` cố tình chặn để "tránh mất dấu vết 1 tài sản đang có người dùng/đang chạy quy trình duyệt lại 'biến mất' khỏi hệ thống" (nguyên văn comment gốc).
2. **Dữ liệu không nhất quán**: asset bị "xoá" qua đường này có `isActive:false` nhưng `deletedAt`/`deletedBy` vẫn `undefined` — khác hẳn asset xoá đúng quy trình, gây sai lệch nếu có báo cáo/audit dựa vào `deletedAt`.
3. **Bỏ qua kiểm soát permission**: hành động tương đương "xoá" chỉ cần `ASSET_UPDATE` thay vì `ASSET_DELETE` — vi phạm nguyên tắc phân quyền chi tiết mà chính hệ thống đã thiết kế (2 permission tách riêng).
4. **Chiều ngược lại** (đặt `isActive: true` qua Update) cũng bỏ qua check `restoreAssetService` (dù check ở đó nhẹ hơn — chỉ "chưa bị xoá thì không cho restore"), nên rủi ro thấp hơn chiều xoá.

**Recommendation**: Loại `isActive` khỏi `ASSET_UPDATE_WHITELIST` và `UpdateAssetDTO` (cùng nguyên tắc đã áp dụng đúng cho `status`/`assignedTo`/`department`) — bắt buộc đi qua `DELETE /:id`/`PATCH /:id/restore` để đảm bảo guard trạng thái + set đúng `deletedAt`/`deletedBy` + đúng permission.

**Confidence**: HIGH.

---

### RV06-02 — Tìm kiếm theo `keyword` ở Asset/AssetCategory không escape regex (HIGH, CONFIRMED — finding MỚI)

- **File 1**: `backend/src/services/assets/assetDevice/asset.service.ts:66-72` (`getAllAssetsService`)
- **File 2**: `backend/src/services/assets/assetDevice/assetCategory.service.ts:51-56` (`getAllAssetCategoriesService`)

**Observed behavior**: Cả 2 hàm đưa thẳng `keyword` từ query string vào `$regex` không qua bất kỳ bước escape ký tự đặc biệt regex nào:
```ts
filter.$or = [
  { name: { $regex: keyword, $options: "i" } },
  { assetCode: { $regex: keyword, $options: "i" } },
  { serialNumber: { $regex: keyword, $options: "i" } },
];
```
So sánh trực tiếp với domain `documents` (đã review ở REVIEW-05) — `documents.mapper.ts:escapeRegex()` được gọi TRƯỚC khi đưa `keyword` vào `$regex`, chính là mẫu hình mà Phase 12 khuyến nghị nhân rộng sang domain khác. Domain `assets` (`asset.service.ts`, `assetCategory.service.ts`) **chưa áp dụng mẫu hình này**.

**Evidence**: đọc trực tiếp, không có `escapeRegex`/tương đương nào được import hay gọi trong `asset.service.ts`/`assetCategory.service.ts`.

**Impact**: Client gửi `keyword` chứa pattern regex đắt đỏ (catastrophic backtracking, VD `(a+)+$`) có thể gây ReDoS làm treo MongoDB worker thread xử lý query đó — mức độ nghiêm trọng phụ thuộc kích thước collection `Asset`/`AssetCategory` (UNKNOWN, cần dữ liệu production thật) nhưng bề mặt tấn công rộng vì `GET /assets?keyword=...`/`GET /asset-categories?keyword=...` chỉ cần permission `ASSET_VIEW`/`ASSET_CATEGORY_VIEW` (phổ biến, không phải quyền admin).

**Recommendation**: Tái sử dụng `escapeRegex` đã có sẵn ở `documents.mapper.ts` (hoặc chuyển thành shared util dùng chung toàn hệ thống) cho cả 2 hàm search này.

**Confidence**: HIGH.

---

### RV06-03 — Hard-delete Asset vẫn không kiểm tra `Document.relatedAsset` (MEDIUM, CONFIRMED — không đổi so với Phase 04 §12.2 / ISS-18)

- **File**: `backend/src/services/assets/assetDevice/asset.service.ts:221-240` (`hardDeleteAssetService`)

**Observed behavior**: Comment gốc trong code (vẫn còn nguyên, "Ghi chú cho Giai đoạn 3... hiện tại (Giai đoạn 1) chưa có field đó nên chưa check được") đã LỖI THỜI — `Document.relatedAsset` đã tồn tại thật trong schema (xác nhận lại ở REVIEW-05) nhưng hàm này vẫn chỉ check `asset.isActive` trước khi `Asset.deleteOne({_id:id})`, không có query nào tới collection `Document`.

**Evidence**: đọc toàn văn hàm — chỉ 2 điều kiện: `!asset` → 404, `asset.isActive` → 400 (bắt buộc soft-delete trước). Không có `Document.countDocuments({relatedAsset:id})` hay tương đương.

**Impact**: Không đổi so với Phase 04 — hard-delete 1 Asset đang được `Document` (PROPOSE_REPAIR/MANUAL) tham chiếu qua `relatedAsset` để lại ObjectId mồ côi trên `Document.relatedAsset`.

**Recommendation**: Không đổi so với Phase 04/12 — bổ sung check `Document.countDocuments({relatedAsset: id, isActive: true})` trước khi cho phép hard-delete (cùng mẫu hình `countReportsByProposal` đã áp dụng tốt ở domain `documents`).

**Confidence**: HIGH.

---

### RV06-04 — Không có department-scoping ở bất kỳ đâu trong domain Asset (MEDIUM, POTENTIAL RISK — finding MỚI, cùng dạng RV05-04)

- **File 1**: `backend/src/services/assets/assetDevice/asset.service.ts` (`getAllAssetsService`, `getAssetByIdService`)
- **File 2**: `backend/src/services/assets/assetDevice/assetAssignment.service.ts` (`assignAssetService`, `transferAssetService`, `returnAssetService`)

**Observed behavior**: Khác domain `documents` (nơi Ít nhất `updateDocumentService` CÓ check `callerDepartment`), domain `assets` **hoàn toàn không có bất kỳ ràng buộc department nào ở tầng service cho người GỌI** — chỉ có RBAC permission cấp hệ thống (`ASSET_VIEW`, `ASSET_ASSIGN`...), không phân biệt phòng ban của user. Cụ thể:
- `getAllAssetsService`/`getAssetByIdService`: bất kỳ user có `ASSET_VIEW`/`ASSET_VIEW_DETAIL` xem được asset của MỌI phòng ban.
- `assignAssetService`/`transferAssetService`: bất kỳ user có `ASSET_ASSIGN` có thể cấp phát/luân chuyển asset của phòng ban BẤT KỲ sang phòng ban BẤT KỲ khác — không kiểm tra người gọi có thuộc 1 trong 2 phòng ban liên quan hay không.

**Evidence**: đọc toàn văn `asset.service.ts`/`assetAssignment.service.ts` — không có tham số `callerDepartment`/`actorDepartment` nào được truyền vào từ controller (controller chỉ truyền `req.user?._id`, không truyền `req.user?.department`).

**Impact**: Có thể ĐÚNG là chủ đích thiết kế hợp lý (comment trong `assets.constants.ts`/README gợi ý "người quản lý tài sản (IT/Phòng vật tư)" — 1 bộ phận trung tâm quản lý TOÀN BỘ tài sản mọi khoa/phòng, khác với Document nơi mỗi khoa tự quản tài liệu riêng của mình). Ghi nhận là **UNKNOWN** về ý định nghiệp vụ, không tự kết luận là bug — nhưng đáng lưu ý đây là ĐIỂM KHÁC BIỆT nhất quán, không phải sơ suất cục bộ: không có 1 dòng code nào trong toàn domain gợi ý từng có ý định thêm department-scoping rồi bỏ sót (khác RV05-04, nơi Update CÓ check còn Read thì không — bất đối xứng rõ ràng gợi ý thiếu sót).

**Recommendation**: Xác nhận với chủ dự án đây có đúng là mô hình "quản lý tài sản tập trung" hay không. Nếu không, cần bổ sung scoping nhất quán cho cả Read và Assignment.

**Confidence**: HIGH (evidence code), nhưng **UNKNOWN** về việc đây có phải "thiếu sót" theo đúng nghĩa hay không.

---

### RV06-05 — Code chết bị comment nguyên khối cuối `assetAssignment.service.ts` (LOW-MEDIUM, CONFIRMED — finding MỚI, cùng dạng RV05-09)

- **File**: `backend/src/services/assets/assetDevice/assetAssignment.service.ts:325-604`

**Observed behavior**: File dài 604 dòng, logic thực sự chạy kết thúc ở dòng 323 (`getAssetAssignmentHistoryService`). Toàn bộ phần còn lại (dòng 325 → hết file, xác nhận bằng cách lọc mọi dòng không phải comment/blank — không còn dòng code thật nào) là bản sao CŨ của chính 4 hàm phía trên, từ giai đoạn TRƯỚC khi thêm `withTransaction`.

**Evidence**: `awk 'NR>=325' assetAssignment.service.ts | grep -v "^//" | grep -v "^$"` không trả về dòng nào (đã kiểm chứng khi đọc toàn văn file).

**Impact**: Cùng loại rủi ro với RV05-09 (`workflow.service.ts`) — không ảnh hưởng runtime, nhưng gây khó khăn khi review/bảo trì file quan trọng nhất của tiểu module Assignment (chỉ ~53% là code thật).

**Recommendation**: Xoá khối comment (đã có Git history lưu bản cũ) — ngoài phạm vi task review này (chỉ review), ghi nhận cho task refactor riêng.

**Confidence**: HIGH.

---

### RV06-06 — `AssetCategory` vẫn thiếu index trên `parentCategory` (LOW, CONFIRMED — không đổi so với Phase 04)

- **File**: `backend/src/models/assets/assetCategory.model.ts`
- **Function/Class**: `deleteAssetCategoryService` (check `childExists`)

**Observed behavior**: Model chỉ có `{code:1}` (unique) và `{name:"text"}` — không có index trên `parentCategory`, dù `deleteAssetCategoryService` chạy `AssetCategory.exists({parentCategory: id, isActive: true})` mỗi lần xoá 1 danh mục (để chặn xoá danh mục cha còn con).

**Evidence**: đọc toàn văn `assetCategory.model.ts` (2 dòng `.index()`, không có field `parentCategory`).

**Impact**: THẤP trong thực tế (bảng `AssetCategory` thường nhỏ, ít thay đổi cấu trúc cây) — COLLSCAN trên bảng nhỏ không đáng lo, nhưng là gap nhất quán nếu cây danh mục phình to.

**Recommendation**: Thêm `AssetCategorySchema.index({parentCategory: 1})` nếu cây danh mục dự kiến lớn.

**Confidence**: HIGH.

---

### RV06-07 — Cron cảnh báo Asset: ghi tuần tự + N+1 role/user lookup mỗi asset (LOW, CONFIRMED — cross-ref PERF-09, không đổi)

- **File**: `backend/src/services/assets/assetDevice/assetAlerts.service.ts:101-121` (`checkWarrantyExpiringService`)

**Observed behavior**: Vòng lặp `for (const asset of assets)` gọi `await notifyUsersByRoleName(...)` (tự query `Role.findOne` + `User.find` MỖI LẦN gọi — đã ghi nhận PERF-09 ở Phase 10) rồi `await asset.save()` — cả 2 đều tuần tự, không `Promise.all`/batch.

**Evidence**: đọc toàn văn vòng lặp `checkWarrantyExpiringService`.

**Impact**: Không đổi so với đánh giá Phase 10 (PERF-09) — ảnh hưởng thực tế phụ thuộc số lượng asset sắp hết hạn bảo hành trong cùng 1 lần chạy cron (thường nhỏ, chạy 1 lần/ngày) — mức độ ưu tiên THẤP.

**Recommendation**: Không đổi so với Phase 10 — nếu muốn tối ưu, cache kết quả `Role.findOne`+`User.find` 1 lần cho cả batch thay vì gọi lại trong `notifyUsersByRoleName` mỗi asset.

**Confidence**: HIGH.

---

### RV06-08 — Không có xử lý tường minh cho race condition khi Assign/Transfer/Return đồng thời (LOW-MEDIUM, POTENTIAL RISK — finding MỚI)

- **File**: `backend/src/services/assets/assetDevice/assetAssignment.service.ts` (`assignAssetService`, `transferAssetService`, `returnAssetService`)

**Observed behavior**: Cả 3 hàm dùng pattern đọc (`Asset.findOne`) → sửa field trong memory → `asset.save({session})` trong transaction. Mongoose mặc định có optimistic locking qua `versionKey` (`__v`) khi gọi `.save()` trên 1 document đã đọc trước đó — nếu 2 request cùng sửa 1 asset gần như đồng thời, request thứ 2 `.save()` sẽ nhận `VersionError`. Code **không bắt riêng lỗi này** — lỗi sẽ rơi ra ngoài, qua `catchAsync` tới global error handler (nhánh lỗi "unknown" đã ghi nhận RV00-02: lộ `err.message` thô cho lỗi 500 không xác định).

**Evidence**: đọc toàn văn 3 hàm — không có `try/catch` riêng cho `VersionError`, không có retry logic.

**Impact**: 2 request assign/transfer/return đồng thời cho CÙNG 1 asset (VD 2 nhân viên IT thao tác cùng lúc) — về mặt AN TOÀN DỮ LIỆU thì Mongoose versioning vẫn bảo vệ đúng (không có 2 write cùng thành công gây mất dữ liệu), nhưng về mặt TRẢI NGHIỆM thì request thua sẽ nhận lỗi 500 khó hiểu (message lỗi thư viện) thay vì 409 Conflict rõ ràng ("tài sản vừa được người khác cập nhật, vui lòng thử lại").

**Recommendation**: Bắt riêng `VersionError`/`mongoose.Error.VersionError`, trả về `ApiError.conflict(...)` rõ ràng thay vì để lộ xuống error handler mặc định.

**Confidence**: MEDIUM — cơ chế bảo vệ dữ liệu CONFIRMED tồn tại (hành vi mặc định Mongoose), nhưng UX lỗi khi xảy ra là suy luận hợp lý, chưa test runtime thực tế.

---

### RV06-09 — Positive findings

1. **Transaction pattern nhất quán và đúng đắn**: cả `assetAssignment.service.ts` (3 hàm) và `calibrationRecord.service.ts` đều bọc đúng `withTransaction` quanh MỌI cặp write cần atomic (Asset+History, CalibrationRecord+Profile+Upload).
2. **`hasValidRecipients` guard** ở cả `assetAlerts.service.ts` và `medicalDeviceAlerts.service.ts` — chủ động chặn "silent success" khi cron cảnh báo không có ai để gửi (nếu không có guard này, field đánh dấu "đã gửi" vẫn bị set dù chưa gửi được cho ai, khiến cron không bao giờ thử lại). Đây là bài học tự rút kinh nghiệm và áp dụng LẠI nhất quán giữa 2 module — mẫu hình đáng nhân rộng sang các cron khác trong hệ thống nếu có.
3. **Dọn file mồ côi có điều kiện** ở `createCalibrationRecordService` — dùng cờ `committed` để phân biệt "file thực sự mồ côi" (transaction chưa commit) với "file đã được tham chiếu hợp lệ, lỗi xảy ra ở bước sau" (không xoá nhầm) — xử lý tinh tế hơn hẳn baseline Phase 08 đã ghi nhận (finding #4 cũ về rác file mồ côi coi như đã được giảm nhẹ đáng kể, dù chưa 100% — vẫn còn khoảng hở nếu process crash giữa lúc `fs.writeFile` và transaction, nhưng đây là edge-case cực hiếm).
4. **Rule MD1** (chặn ghi `calibratedAt` cũ hơn/bằng lần kiểm định gần nhất) — CONFIRMED vẫn hoạt động đúng, dùng `ApiError.conflict` (409) hợp lý về mặt semantics HTTP.
5. **Excel import Asset tránh N+1**: pre-fetch toàn bộ `AssetCategory`/`Department` cần dùng bằng 2 query gộp (`$in`) trước vòng lặp, dùng `Map` tra cứu trong vòng lặp — đúng mẫu hình tốt, không lặp lại vấn đề PERF-07 (N+1 transaction) của domain `documents`.
6. **Whitelist 2 lớp nhất quán** (DTO + service constant) áp dụng cho Asset/AssetCategory/MedicalDeviceProfile — đúng mẫu hình đã dùng ở `documents`/`rbac`, ngoại trừ khe hở `isActive` đã nêu ở RV06-01.
7. **Route ordering đã được xử lý cẩn thận và có ghi chú rõ** (`/export` trước `/:id`, `/lookup/:assetCode` trước `/:id`) — không phát hiện lỗi thứ tự route nào trong toàn bộ 3 file route đã đọc.

---

## C. CÁC MỤC ĐÃ XÁC MINH LẠI, KHÔNG PHÁT HIỆN THÊM VẤN ĐỀ

- **Asset status machine** (RULE A1/A4 — Phase 08): xác nhận lại đúng như baseline — `assign` chỉ từ `IN_STOCK`/`RESERVED`, `transfer` chỉ từ `IN_USE`, `return` chỉ từ `IN_USE`/`RESERVED`, `startAssetMaintenanceService` chỉ từ `IN_USE`/`IN_STOCK`, `resolveAssetMaintenanceService` chỉ từ `UNDER_MAINTENANCE`. Mọi transition đều có guard rõ ràng, throw `ApiError.badRequest` khi sai trạng thái.
- **`RESERVED`/`LOST` vẫn là trạng thái "chết"** (không có luồng nào set qua service hiện có) — xác nhận lại đúng như Phase 08, không đổi.
- **Rule MD3** (kiểm định "tự nguyện" khi `requiresCalibration=false` vẫn được ghi nhận) — xác nhận đúng chủ đích, có comment rõ ràng trong code.
- **`hardDeleteAssetService`/`hardDeleteAssetCategoryService`**: đều bắt buộc soft-delete trước (2 bước), đúng permission riêng tách biệt (`*_DELETE_PERMANENT`) — không đổi so với Phase 04/08.
- **`deleteAssetCategoryService`**: CÓ check cả `Asset.exists({category:id})` LẪN `AssetCategory.exists({parentCategory:id})` trước khi xoá — tốt hơn hẳn `deleteDepartmentService` (RV04-01, thiếu check `Asset`/`AssetAssignmentHistory`) đã review ở REVIEW-04.
- **`TransferAssetDTO`**: refine bắt buộc ít nhất 1 trong 2 field (`toDepartment`/`toUser`) — đúng thiết kế, tránh gọi Transfer "rỗng" không làm gì.

---

## D. UNKNOWN CÒN TỒN ĐỌNG

- RV06-04: department-scoping (hay thiếu nó) trong domain Asset có đúng là chủ đích "quản lý tập trung" hay không — cần xác nhận với chủ dự án.
- Mức độ nghiêm trọng thực tế của RV06-02 (ReDoS) và RV06-06 (thiếu index `parentCategory`) phụ thuộc kích thước dữ liệu production thật — carry-over Phase 04/10/12.
- RV06-08: tần suất thao tác assign/transfer/return đồng thời trên cùng 1 asset trong vận hành thực tế (khả năng thấp qua UI thủ công, chưa đánh giá qua tích hợp/automation nếu có).

---

**Review hoàn tất. Không có thay đổi nào được thực hiện trên source code trong quá trình review này.**

# REVIEW-16 — DATABASE CROSS-DOMAIN REVIEW

> Ngày: 2026-08-31 | Loại: Module code review (không phải historical Phase 01-13, không phải review lại từng domain riêng lẻ) | KHÔNG sửa database, KHÔNG sửa source code trong task này.
>
> **Mục tiêu**: KHÔNG lặp lại nội dung Phase 04 (`docs/04_DATABASE_ANALYSIS.md`) hay các review đơn-domain đã có (`docs/module-reviews/03..06`). Chỉ tập trung vào lỗi/rủi ro phát sinh ở **điểm giao giữa các module** — theo 3 trace được chỉ định:
>
> 1. `User → Department → Document → Workflow`
> 2. `User → Asset → Assignment → Department`
> 3. `Medical Device (MedicalDeviceProfile) → Calibration (CalibrationRecord)`
>
> Nguồn đọc trực tiếp (source hiện tại, working tree):
> `backend/src/services/users/users.service.ts`,
> `backend/src/services/departments/departments.service.ts`,
> `backend/src/services/documents/{document.service.ts,workflow.service.ts,documents.query.ts}`,
> `backend/src/services/assets/assetDevice/{asset.service.ts,assetAssignment.service.ts}`,
> `backend/src/services/assets/medicalDevice/medicalDevice.service.ts`,
> `backend/src/models/**/*.model.ts` (toàn bộ 21 model tại thời điểm review này; nay 31 sau `DEV-057`→`070`, xem DEV-071),
> `backend/src/shared/utils/{withTransaction.ts,getNext.ts}`,
> `backend/src/shared/helpers/generateAssetCode.ts`, `backend/src/shared/utils/generateDocumentCode.ts`.
>
> Baseline đã đọc trước khi verify source: `CLAUDE.md`, `docs/04_DATABASE_ANALYSIS.md` (toàn bộ, đặc biệt §4, §6, §9, §12, §14), `docs/review-index/CODE_REVIEW_INDEX.md`, `docs/module-reviews/{03_USERS,04_DEPARTMENTS,05_DOCUMENTS,06_ASSETS}_CODE_REVIEW.md`.
>
> **Quy ước ID**: `RV16-xx`. Finding đã có ở review đơn-domain trước đó được liệt kê ở mục C (đối chiếu/xác nhận lại trong bối cảnh liên-domain), KHÔNG cấp ID mới, chỉ tham chiếu ID gốc.

---

## A. TÓM TẮT

| # | ID | Severity | Trace liên quan | Trạng thái |
|---|----|----------|------------------|------------|
| 1 | RV16-01 | **HIGH** | Medical Device → Calibration | CONFIRMED (finding MỚI) |
| 2 | RV16-02 | MEDIUM | User → Department → Document | CONFIRMED (finding MỚI) |
| 3 | RV16-03 | LOW-MEDIUM | User → Asset → Assignment | CONFIRMED (finding MỚI) |
| 4 | RV16-04 | MEDIUM | User → Department → Document → Workflow | CONFIRMED (tổng hợp, mở rộng RV05-01/RV04-01) |
| 5 | RV16-05 | INFO (positive) | User → Asset → Assignment → Department | CONFIRMED |

---

## B. FINDINGS MỚI (chưa từng ghi nhận ở Phase 04 hay REVIEW-03/04/05/06)

### RV16-01 — Hard-delete Asset để lại `MedicalDeviceProfile`/`CalibrationRecord` mồ côi vĩnh viễn — KHÔNG có bất kỳ đường xoá nào cho `MedicalDeviceProfile` (HIGH, CONFIRMED)

- **File 1**: `backend/src/services/assets/assetDevice/asset.service.ts:221-240` (`hardDeleteAssetService`)
- **File 2**: `backend/src/services/assets/medicalDevice/medicalDevice.service.ts` (toàn bộ file)
- **Model**: `models/assets/medicalDeviceProfile.model.ts`, `models/assets/calibrationRecord.model.ts`

**Observed behavior**:

`hardDeleteAssetService` chỉ có 2 điều kiện trước khi `Asset.deleteOne({_id:id})`: asset tồn tại, và `asset.isActive === false` (đã soft-delete trước). Không có query nào tới `MedicalDeviceProfile` hay `CalibrationRecord`.

Đối chiếu `medicalDevice.service.ts` (đọc toàn văn) — file này chỉ export:
```
createMedicalDeviceProfileService
getMedicalDeviceProfileService
updateMedicalDeviceProfileService
```
**Không có `deleteMedicalDeviceProfileService`/`removeMedicalDeviceProfileService` nào tồn tại trong toàn bộ codebase** (đã grep `export const` trong `services/assets/medicalDevice/` và `services/assets/assetDevice/` — không có hàm delete nào cho `MedicalDeviceProfile`). Cùng với đó, `CalibrationRecord` cũng không có delete service nào (chỉ có create/list qua `calibrationRecord.service.ts`, chưa đọc toàn văn ở review này nhưng đối chiếu route `medicalDevice.routes.ts` không có `DELETE /calibration-records/:id`).

**Evidence chuỗi tham chiếu**:
```
MedicalDeviceProfile.asset  → Asset   (required, unique index — 1-1)
CalibrationRecord.deviceProfile → MedicalDeviceProfile   (required)
```
Khi `hardDeleteAssetService` xoá 1 `Asset` đã từng gắn `MedicalDeviceProfile`:
1. `MedicalDeviceProfile.asset` trở thành ObjectId mồ côi — không có Asset nào để `populate`.
2. Vì **không có hàm nào có thể xoá `MedicalDeviceProfile` này** (kể cả thủ công qua service — phải thao tác trực tiếp DB), bản ghi mồ côi tồn tại **vĩnh viễn**, khác hẳn các orphan reference khác trong hệ thống (VD `Document.relatedAsset` — RV06-03 — ít nhất về mặt lý thuyết CÓ THỂ dọn bằng cách sửa `Document` qua `updateDocumentService`).
3. Toàn bộ `CalibrationRecord` gắn với `deviceProfile` đó cũng vĩnh viễn mồ côi 2 tầng (CalibrationRecord → MedicalDeviceProfile mồ côi → Asset đã xoá).
4. Cron `checkCalibrationDueService` (`medicalDeviceAlerts.service.ts`) filter theo `{requiresCalibration:true, nextCalibrationDueDate: {...}}` trên `MedicalDeviceProfile` — **không filter theo Asset còn tồn tại hay không** (chưa đọc toàn văn hàm này ở review hiện tại, nhưng field `asset` không có ràng buộc `isActive` join-time vì MongoDB không tự loại record có FK chết) — có khả năng tạo cảnh báo kiểm định cho 1 thiết bị y tế đã bị xoá vật lý khỏi hệ thống, dù mức độ ảnh hưởng thực tế cần đọc thêm `medicalDeviceAlerts.service.ts` để xác nhận có `.populate("asset")` + check `null` hay không (**UNKNOWN**, để dành nếu cần đào sâu Cron domain — đã review ở REVIEW-15/12_CRON nhưng không đọc lại khía cạnh này).

**So sánh với RV06-03 (đã có)**: RV06-03 chỉ ghi nhận `hardDeleteAssetService` không check `Document.relatedAsset`. Finding này **mở rộng đúng cùng root cause** (hàm không check bất kỳ back-reference nào) sang 1 chuỗi tham chiếu 2 tầng (`MedicalDeviceProfile` → `CalibrationRecord`) mà trước đó **chưa từng được nhắc tới** ở Phase 04 hay REVIEW-06 — vì REVIEW-06 tập trung vào Asset/Assignment, không trace sâu xuống Medical Device khi đánh giá riêng `hardDeleteAssetService`.

**Impact**: Đây là chuỗi tham chiếu "kép" (2 tầng) duy nhất trong toàn hệ thống hoàn toàn không có cơ chế dọn dẹp nào — không giống `Document.relatedAsset` (còn có thể sửa qua Update), dữ liệu `MedicalDeviceProfile`/`CalibrationRecord` mồ côi **không có đường nào xoá được qua API hiện có**, chỉ có thể can thiệp DB trực tiếp.

**Recommendation**: Bổ sung 1 trong 2 hướng:
(a) `hardDeleteAssetService` check `MedicalDeviceProfile.exists({asset:id})` → chặn hard-delete nếu còn tồn tại (đồng bộ cách làm RV06-03 đề xuất cho `Document.relatedAsset`), buộc phải có bước dọn `MedicalDeviceProfile` trước (cần thêm service xoá — hiện chưa tồn tại);
(b) Nếu nghiệp vụ chấp nhận giữ lại lịch sử kiểm định kể cả khi Asset đã thanh lý vĩnh viễn, cần ít nhất bổ sung service xoá tường minh cho `MedicalDeviceProfile`/`CalibrationRecord` (cascade hoặc thủ công) để tránh dữ liệu mồ côi tích luỹ vô thời hạn.

**Confidence**: HIGH (evidence trực tiếp — grep xác nhận không có hàm delete nào tồn tại, đọc toàn văn `hardDeleteAssetService`).

---

### RV16-02 — `updateUserService` bỏ qua validate tồn tại `Department` khi chỉ đổi `department` mà không đồng thời đổi `role` sang USER (MEDIUM, CONFIRMED)

- **File**: `backend/src/services/users/users.service.ts:177-253` (`update`)

**Observed behavior**:
```ts
let role: any;
if (roleId !== undefined) {
  role = await Role.findById(roleId);
  ...
}

// 5. Validate department nếu role (mới hoặc giữ nguyên) là USER
if (role?.name === "USER" && department) {
  const dept = await Department.findById(department);
  if (!dept) throw ApiError.notFound("Khoa không tồn tại");
}
...
if (department !== undefined) user.department = department;
```
`role` chỉ được gán khi client gửi kèm `roleId` trong payload. Nếu request chỉ đổi `department` (không gửi `role`), biến `role` giữ nguyên `undefined` → điều kiện `role?.name === "USER" && department` luôn `false`, **bất kể user hiện tại có role USER hay không** → nhánh validate `Department.findById(department)` bị bỏ qua hoàn toàn. Dòng `user.department = department` sau đó gán thẳng giá trị chưa được xác minh.

**Evidence**: đọc toàn văn hàm `update` — không có nhánh nào validate `department` khi `roleId` không được truyền trong cùng request.

**Impact**: Admin (hoặc bất kỳ ai có `USER_UPDATE`) gửi `PUT /api/users/:id` chỉ với `{ department: "<bất kỳ chuỗi 24-hex nào>" }` (không kèm `role`) sẽ ghi thành công 1 ObjectId **không tồn tại** vào `user.department` — không có lỗi nào được ném ra (khác hẳn field `role`, luôn được validate qua `Role.findById` bất kể context). Hệ quả:
1. `populate("department", "code name")` (dùng ở `login()`, `getMeService`, `getList`, ...) trả về `null` âm thầm cho user này.
2. Ràng buộc "ownership theo department" ở `updateDocumentService` (`document.department.toString() !== callerDepartment.toString()`) sẽ luôn `false`-match (vì `callerDepartment` là ObjectId rác) → user này **vĩnh viễn không sửa được document nào của chính khoa mình** dù có quyền hợp lệ — một tác dụng phụ âm thầm gây khó chịu vận hành, không phải lỗ hổng bảo mật.
3. Đối lập trực tiếp với `Role` — `roleId` LUÔN được validate tồn tại (`Role.findById(roleId)`, ném 404 nếu không có) bất kể context, cho thấy đây là bất đối xứng thiết kế (thiếu sót cục bộ), không phải chủ đích.

**Recommendation**: Validate `Department.findById(department)` bất cứ khi nào `department !== undefined` trong payload, không phụ thuộc vào việc `role` có được gửi kèm hay không — tách điều kiện validate ra khỏi nhánh `role?.name === "USER"`.

**Confidence**: HIGH (đọc trực tiếp logic điều kiện, không suy diễn).

---

### RV16-03 — Vô hiệu hoá (`disable`) User không đồng bộ `Asset.assignedTo` — tài sản vẫn "đang cấp phát" cho user đã bị khoá (LOW-MEDIUM, CONFIRMED)

- **File 1**: `backend/src/services/users/users.service.ts:268-301` (`disable`)
- **File 2 (đối chứng)**: `backend/src/services/assets/assetDevice/assetAssignment.service.ts:28-34` (`assertUserExists`)

**Observed behavior**: `assertUserExists` (dùng bởi `assignAssetService`/`transferAssetService`) chặn cấp phát/chuyển giao tài sản cho user có `isActive: false` — đúng, kiểm soát tốt tại **thời điểm ghi**. Nhưng `disable()` (vô hiệu hoá user) chỉ set `user.isActive = false`, thu hồi `RefreshToken`, ghi `UserAudit` — **không hề query hay cập nhật `Asset`**. Không có bước nào kiểm tra `Asset.exists({assignedTo: id})` hoặc tự động `returnAssetService` cho các tài sản đang gán cho user sắp bị khoá.

**Evidence**: đọc toàn văn `disable()` — 4 side-effect duy nhất: set `isActive`, `save()`, `RefreshToken.updateMany`, `UserAudit.create`. Không có import `Asset` trong `users.service.ts`.

**Impact**: 1 user đang được cấp phát tài sản (`Asset.assignedTo = userId`, `status: IN_USE`) khi bị `disable()` vẫn giữ nguyên trạng thái "đang dùng tài sản" trong DB — không có cơ chế nào buộc thu hồi. Về mặt vận hành, tài sản có thể bị "kẹt" ở trạng thái `IN_USE` gắn với 1 tài khoản không còn đăng nhập được, cho tới khi có người chủ động gọi `transferAssetService`/`returnAssetService` — đây là gap về đồng bộ trạng thái nghiệp vụ (không phải injection/orphan reference kỹ thuật, vì `User` vẫn tồn tại, chỉ `isActive:false`), nhưng đúng loại rủi ro "dữ liệu sai lệch âm thầm" mà `mongodb-transaction-setup-guide.md` cảnh báo.

**Recommendation**: Ghi nhận là **UNKNOWN về ý định nghiệp vụ** (có thể chủ đích: disable không đồng nghĩa "rời khoa/nghỉ việc ngay", tài sản vẫn có thể bàn giao lại thủ công sau) — nếu không phải chủ đích, cân nhắc 1 trong 2: (a) chặn `disable()` nếu `Asset.exists({assignedTo:id, isActive:true})` (giống mẫu `deleteDepartmentService` chặn xoá khi còn User), hoặc (b) liệt kê rõ trong response/UI danh sách tài sản đang gán cho user sắp bị khoá, để người vận hành tự quyết định thu hồi trước.

**Confidence**: HIGH (evidence code), UX/business impact **INFERRED** (chưa xác nhận với chủ dự án đây có phải thiếu sót theo đúng nghĩa).

---

## C. TỔNG HỢP RỦI RO ĐÃ BIẾT — XÁC NHẬN LẠI TRONG BỐI CẢNH LIÊN-DOMAIN (không cấp ID mới)

Các finding sau đã được ghi nhận ở Phase 04 hoặc REVIEW-04/05/06 (đơn-domain) — mục này chỉ **kết nối chúng lại theo đúng 3 trace được yêu cầu**, xác nhận vẫn còn hiệu lực trên source hiện tại, không lặp lại toàn văn.

### C.1 Trace `User → Department → Document → Workflow`

- **RV04-01/RV04-02** (`deleteDepartmentService`): xoá Department không check `Asset`/`AssetAssignmentHistory`, và check `User` chỉ xét `isActive:true` — user đã disable vẫn để lại `department` mồ côi nếu Department bị xoá rồi user được `restore()` sau (RV04-02) — **liên hệ trực tiếp RV16-03**: một khi tài sản/khoa/người dùng có thể lệch pha độc lập nhau (Asset không đồng bộ khi User disable, Department không check User đã disable khi xoá), 3 mắt xích này có thể trôi dạt không nhất quán theo nhiều hướng khác nhau cùng lúc.
- **RV05-04**: `getAllDocumentsService`/`getDocumentDetailService` không lọc theo `department` của người gọi (khác `updateDocumentService` — CÓ lọc) — xác nhận lại đúng hiện trạng, đọc lại `document.controller.ts` không thấy `req.user!.department` được truyền cho 2 handler Read.
- **RV05-05**: `deleteDocumentsByMonthService` hard-delete không check `WorkflowInstance.documentId`/`Document.referenceTo[]`/`Notification.resourceId` — xác nhận lại đúng, đọc trực tiếp `documents.query.ts:deleteDocumentsByFilter` (`Document.deleteMany`, không transaction, không guard).
- **RV05-06**: soft-delete Document không chặn/đồng bộ `WorkflowInstance` đang `pending` của chính nó — approver vẫn duyệt được, side-effect `syncAssetOnDocumentApproved` vẫn chạy cho Document đã bị ẩn.
- **RV05-01** (CRITICAL, đã có): `CONFIRM_STATUS.referenceSubType` sai khiến `syncAssetOnDocumentApproved` không bao giờ chạy nhánh sync Asset — đây chính là điểm NỐI cuối trace `Document → Workflow → Asset`, xác nhận lại vẫn còn nguyên trên source hiện tại (`documentRules.ts:22-26` vẫn `referenceSubType: PROPOSE_INK`).
- **RV05-08**: `WorkflowInstance` không có index nào — xác nhận lại, không đổi.
- **Phase 04 §13.2**: `syncAssetOnDocumentApproved` chạy **NGOÀI** transaction chính của `approveStep` — nếu bước này lỗi (kể cả khi không bị chặn bởi RV05-01), `WorkflowInstance`/`Document` đã commit "approved" nhưng `Asset` không được cập nhật — xác nhận lại đúng, đọc trực tiếp `workflow.service.ts` (gọi sau khối `withTransaction`, không có `session`).

**Kết luận trace 1**: Toàn bộ chuỗi `User(department) → Document(department) → WorkflowInstance → Asset` có ít nhất **4 điểm hở độc lập** (RV05-01, RV05-04, RV05-05/06, Phase04 §13.2) — không phải 1 lỗi đơn lẻ mà là đặc điểm cấu trúc: **không có cơ chế nào ở tầng nào validate tính nhất quán 2 chiều** giữa các model liên quan, mọi ràng buộc đều là "1 chiều tại thời điểm ghi" (write-time check), không có ràng buộc "tại thời điểm đọc/xoá" tương ứng.

### C.2 Trace `User → Asset → Assignment → Department`

- **assignAssetService/transferAssetService** (đối chứng dương): CÓ validate `Department`/`User` tồn tại + `isActive` tại thời điểm assign/transfer (`assertDepartmentExists`, `assertUserExists`) — đây là **điểm mạnh**, khác hẳn phía "xoá" (Department/User) không có validation ngược lại.
- **RV04-01**: xoá Department không check `Asset.department` (required field) lẫn `AssetAssignmentHistory.fromDepartment/toDepartment` — nghĩa là dù *tạo* assignment luôn an toàn, *xoá* Department vẫn có thể phá vỡ toàn bộ assignment đã tạo trước đó — đúng bất đối xứng đã nêu ở RV04-01, xác nhận lại trong bối cảnh trace này.
- **RV16-03** (mới, mục B): `disable()` User không đồng bộ ngược lại `Asset.assignedTo` — hoàn thiện bức tranh: **cả 2 đầu** của quan hệ Assignment (User lẫn Department) đều có thể bị xoá/vô hiệu hoá phía "nguồn" mà không kéo theo cập nhật phía "đích" (Asset/AssetAssignmentHistory).
- **RV06-08**: race condition read-modify-write khi assign/transfer/return đồng thời (Mongoose `VersionError` không được bắt riêng) — xác nhận lại đúng, không đổi.

**Kết luận trace 2**: Thiết kế Assignment có phòng thủ TỐT ở chiều "tạo mới" (write-time validate cả User lẫn Department), nhưng **hoàn toàn không có phòng thủ ở chiều "huỷ nguồn"** (xoá Department, disable User) — đây là root cause chung của cả RV04-01 lẫn RV16-03, gợi ý 1 pattern sửa chung: cả `deleteDepartmentService` và `disable()` (User) nên có 1 bước kiểm tra `Asset`/`AssetAssignmentHistory` liên quan trước khi cho phép, tương tự cách `deleteDepartmentService` đã làm với `User`/`Document`.

### C.3 Trace `Medical Device → Calibration`

- **RV16-01** (mới, mục B) là finding chính của trace này — mở rộng RV06-03 (vốn chỉ nói về `Document.relatedAsset`) sang toàn bộ chuỗi `MedicalDeviceProfile`/`CalibrationRecord`, với mức độ nghiêm trọng hơn (KHÔNG có bất kỳ đường dọn dẹp nào, kể cả thủ công qua service).
- **Đối chứng dương** (RV06-09, xác nhận lại): `createCalibrationRecordService` dùng transaction đúng (`CalibrationRecord` + cập nhật `MedicalDeviceProfile`), và có cờ `committed` để tránh xoá nhầm file chứng chỉ hợp lệ — thiết kế bên trong domain Medical Device/Calibration bản thân nó cẩn thận, vấn đề chỉ nằm ở **điểm nối với domain Asset** (RV16-01), không phải nội tại domain này.

---

## D. UNKNOWN CÒN TỒN ĐỌNG (đặc thù cross-domain)

- RV16-01: `medicalDeviceAlerts.service.ts:checkCalibrationDueService` có populate `asset` và tự loại bản ghi có Asset đã xoá hay không — **chưa đọc toàn văn hàm này ở review hiện tại** (REVIEW-15/12_CRON trước đó tập trung khía cạnh scheduling/idempotency, không phải khía cạnh orphan-Asset).
- RV16-02/RV16-03: có phải thiếu sót ngoài ý muốn hay chủ đích nghiệp vụ ("disable không kéo theo thu hồi tài sản ngay", "chỉ validate Department khi đổi role") — cần xác nhận với chủ dự án trước khi đưa vào implementation plan.
- Chưa xác minh: `calibrationRecord.service.ts` có hàm nào khác ngoài create/list (VD xoá 1 bản ghi kiểm định sai) mà review này bỏ sót do chỉ grep theo route — nếu route `medicalDevice.routes.ts` có endpoint DELETE cho `CalibrationRecord` chưa được đối chiếu kỹ, cần đọc lại toàn văn file service tương ứng.
- Chưa đọc toàn văn `documents.mapper.ts`/`workflow.service.ts` phần xử lý lỗi quanh `syncAssetOnDocumentApproved` để xác nhận có log/silent-catch nào khác ngoài điều đã ghi ở RV05-01 hay không.

---

## E. NGUYÊN TẮC ĐÃ TUÂN THỦ

- Không review lại chi tiết từng field/index/model đã có ở Phase 04 — chỉ trace quan hệ liên-domain theo đúng 3 chuỗi được chỉ định.
- Không sửa database, không sửa source code.
- Mọi finding đều có File + Function + Observed behavior + Evidence, đúng chuẩn `CLAUDE.md` §34.
- Finding trùng với review đơn-domain trước đó được ghi nhận là "xác nhận lại", không cấp ID mới, không tính là finding riêng trong bảng tóm tắt mục A.

---

**Review hoàn tất. Không có thay đổi nào được thực hiện trên database hoặc source code trong quá trình review này.**

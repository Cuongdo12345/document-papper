# 08 — IMPORT / EXPORT (EXCEL) — CODE REVIEW

> REVIEW-08. Chỉ review, KHÔNG sửa source. Phạm vi: `controllers/excel`, `services/excel`, `models/importAudit`, cùng các helper Excel liên quan (`importHeaderValidator`, `importStatus`, `buildMapReports`, `excel.constants`, `upload.middleware`). Module `assetExcel.service.ts` đã được review 1 phần ở REVIEW-06 (Assets) — ở đây chỉ tham chiếu lại, không lặp lại toàn bộ chi tiết, trừ khi có phát hiện MỚI liên quan riêng tới Import/Export.
>
> Nguồn đọc trực tiếp: `backend/src/routes/excel/excel.route.ts`, `backend/src/controllers/excel/excel.controller.ts`, `backend/src/services/excel/excel.service.ts` (996 dòng, đọc toàn văn), `backend/src/models/importAudit/importhistory.model.ts`, `backend/src/shared/constants/excel.constants.ts`, `backend/src/shared/helpers/{importHeaderValidator.helper.ts,importStatus.helper.ts,buildMapReports.ts}`, `backend/src/middlewares/upload.middleware.ts`, `backend/src/middlewares/error.middleware.ts` (đối chiếu xử lý lỗi Multer).
>
> Baseline đã đọc trước khi verify source: `docs/00_PROJECT_MEMORY.md`, `docs/05_API_ANALYSIS.md`, `docs/09_SECURITY_ANALYSIS.md` (SEC-15, SEC-16), `docs/10_PERFORMANCE_ANALYSIS.md` (PERF-07, PERF-08, PERF-10, PERF-11).
>
> **Nhận xét tổng quan**: `excel.service.ts` đã qua nhiều đợt sửa có ghi chú kỹ (dry-run, transaction per-row đúng phạm vi, validate header chống lệch cột âm thầm, xử lý lỗi stream template). Các finding hiệu năng đã biết từ Phase 10 (PERF-07/PERF-08) **đều CONFIRMED KHÔNG ĐỔI** ở review này. Điểm mới quan trọng nhất: lỗi từ `multer` (sai định dạng file, quá dung lượng) không được `error.middleware.ts` nhận diện riêng → rơi vào nhánh 500 thay vì 400.

---

## A. TÓM TẮT

| # | ID | Severity | Category | Trạng thái |
|---|----|----------|----------|------------|
| 1 | RV08-01 | MEDIUM | Error handling / API contract | CONFIRMED (finding MỚI) |
| 2 | RV08-02 | MEDIUM | Performance | CONFIRMED (= PERF-07, không đổi) |
| 3 | RV08-03 | MEDIUM | Performance | CONFIRMED (= PERF-08, không đổi) |
| 4 | RV08-04 | LOW-MEDIUM | Data integrity / Race condition | POTENTIAL RISK (finding MỚI) |
| 5 | RV08-05 | LOW | File security | CONFIRMED (= SEC-16, không đổi, phạm vi hẹp hơn ở module này) |
| 6 | RV08-06 | INFO (liên domain) | Business Logic | CONFIRMED — củng cố thêm RV05-01/RV07-05 |
| 7 | RV08-07 | LOW | Maintainability | CONFIRMED (finding MỚI, code chết) |
| 8 | RV08-08 | INFO (positive/clarification) | Security | CONFIRMED |
| 9 | RV08-09 | INFO (positive) | — | CONFIRMED |

---

## B. FINDINGS CHI TIẾT

### RV08-01 — Lỗi Multer (sai định dạng/quá dung lượng file) trả về 500 thay vì 400 (MEDIUM, CONFIRMED — finding MỚI)

- **File 1**: `backend/src/middlewares/upload.middleware.ts` (`uploadExcel`)
- **File 2**: `backend/src/middlewares/error.middleware.ts` (`errorHandler`)

**Observed behavior**: `uploadExcel` (multer, dùng cho CẢ 2 route `POST /import-proposal` và `POST /departments/sync-from-excel`, cũng dùng lại ở `assets/*` — REVIEW-06) cấu hình:
```ts
const fileFilter: multer.Options["fileFilter"] = (req, file, cb) => {
  if (![".xlsx", ".xls"].includes(ext)) {
    return cb(new Error("Chỉ cho phép file Excel (.xlsx, .xls)"));
  }
  cb(null, true);
};
export const uploadExcel = multer({ storage, limits: { fileSize: MAX_FILE_SIZE }, fileFilter });
```
`fileFilter` ném 1 `Error` THUẦN (không phải `ApiError`), và khi file vượt `MAX_FILE_SIZE` (5MB), multer tự ném `MulterError` (code `LIMIT_FILE_SIZE`) — cũng KHÔNG phải `ApiError`. Đọc toàn văn `error.middleware.ts:errorHandler` xác nhận chỉ có 4 nhánh: `ApiError`, `CastError`, `ValidationError`, và nhánh fallback "lỗi không xác định" → `getSafeStatus(err)` trả `500` vì cả `Error` thuần lẫn `MulterError` đều không có field `status` hợp lệ.

**Evidence**: đọc toàn văn cả 2 file — không có nhánh `err.name === "MulterError"`/`err instanceof multer.MulterError` nào trong `errorHandler`.

**Impact**: Client gửi sai định dạng file (VD `.pdf`, `.docx`) hoặc file lớn hơn 5MB tới BẤT KỲ route upload Excel nào (`/import-proposal`, `/departments/sync-from-excel`, và cả `assets/import` — REVIEW-06) đều nhận **HTTP 500** kèm message lỗi thư viện thô (`err.message` là message tự viết trong `fileFilter`, hoặc message mặc định của `MulterError`) thay vì 400 rõ ràng như các validate lỗi khác trong cùng hệ thống. Đây là lỗi INPUT của client (sai định dạng/quá size), về mặt semantics HTTP đáng lẽ phải là 400, không phải 500 — cùng loại vấn đề đã ghi nhận RV00-02 (lộ `err.message` thô cho lỗi 500 không xác định) nhưng đây là 1 kịch bản CỤ THỂ, DỄ TÁI HIỆN (chỉ cần gửi sai file), khác với các trường hợp lỗi hiếm khác.

**Recommendation**: Thêm 1 nhánh riêng trong `errorHandler` nhận diện `err instanceof multer.MulterError` (và/hoặc field `err.code` bắt đầu bằng `LIMIT_`) → map sang 400. Với lỗi từ `fileFilter`, cân nhắc đổi `cb(new Error(...))` thành throw `ApiError.badRequest(...)` nếu multer version đang dùng hỗ trợ (hoặc giữ nguyên nhưng thêm check `err.message` khớp message cố định này trong `errorHandler`).

**Confidence**: HIGH.

---

### RV08-02 — Import Document Excel: N+1 transaction, mỗi dòng file mở 1 MongoDB transaction riêng (MEDIUM, CONFIRMED — không đổi so với Phase 10 PERF-07)

- **File**: `backend/src/services/excel/excel.service.ts:403-670` (`importDocumentsExcel`)

**Observed behavior**: Xác nhận lại nguyên trạng Phase 10 — vòng lặp `for (let i = 2; i <= sheet.rowCount; i++)` gọi `await withTransaction(...)` RIÊNG cho MỖI dòng dữ liệu (không phải 1 transaction bao ngoài cả file). Giới hạn `MAX_IMPORT_ROWS = 5000` vẫn giữ nguyên → tối đa 5000 transaction MongoDB tuần tự cho 1 lần import.

**Evidence**: đọc toàn văn hàm — `withTransaction` nằm BÊN TRONG thân vòng lặp `for`, không bao ngoài. Comment trong code (dòng 384-396) tự giải thích ĐÂY LÀ CHỦ ĐÍCH (transaction per-row để giữ đúng hành vi "1 dòng lỗi thì chỉ dòng đó rollback, các dòng khác vẫn import") — không phải sơ suất, nhưng hệ quả hiệu năng không đổi so với Phase 10.

**Impact**: Không đổi so với PERF-07 — thời gian xử lý tỷ lệ tuyến tính với số dòng, cộng thêm overhead khởi tạo/commit transaction nhân với số dòng. Ghi nhận thêm ở review này: đây là ĐÁNH ĐỔI CÓ CHỦ ĐÍCH (partial-success per row) — không đơn thuần là "lỗi thiết kế" như có thể hiểu nhầm từ tên gọi "N+1 transaction", nhưng đánh đổi hiệu năng vẫn CONFIRMED tồn tại.

**Recommendation**: Không đổi so với Phase 10 — nếu cần cải thiện hiệu năng mà vẫn giữ đúng ngữ nghĩa "partial success per row", cân nhắc batch theo nhóm nhỏ (VD 50-100 dòng/transaction) thay vì per-row tuyệt đối, chấp nhận đánh đổi granularity rollback thô hơn 1 chút để đổi lấy hiệu năng.

**Confidence**: HIGH.

---

### RV08-03 — `buildMapFromReports` tải TOÀN BỘ Document theo subType, không lọc theo phạm vi export (MEDIUM, CONFIRMED — không đổi so với Phase 10 PERF-08)

- **File**: `backend/src/shared/helpers/buildMapReports.ts`
- **File phụ**: `backend/src/services/excel/excel.service.ts:156-159` (`exportDocumentsExcelPRO`)

**Observed behavior**: Xác nhận lại nguyên trạng — `buildMapFromReports(subType)` chạy `Document.find({subType, isActive:true}).select(...).lean()` KHÔNG có `.cursor()`, KHÔNG nhận bất kỳ filter nào (`department`/`month`/`year`) từ lời gọi ở `exportDocumentsExcelPRO`:
```ts
const [confirmMap, checkDamageMap] = await Promise.all([
  buildMapFromReports("CONFIRM_STATUS"),
  buildMapFromReports("CHECK_DAMAGE"),
]);
```
Trong khi phần Document CHÍNH của cùng hàm export ĐÃ áp dụng đầy đủ filter (`department`/`month`/`status`/`subType`) và dùng `.cursor()` streaming đúng chuẩn (xem RV08-09 positive).

**Evidence**: đọc toàn văn `buildMapReports.ts` (không `.cursor()`, không tham số filter) + đối chiếu lời gọi trong `exportDocumentsExcelPRO`.

**Impact**: Không đổi so với PERF-08 — ngay cả export với filter hẹp (1 department, 1 tháng) vẫn tải TOÀN BỘ `CONFIRM_STATUS`/`CHECK_DAMAGE` của MỌI department, MỌI thời điểm vào RAM trước khi bắt đầu stream — chi phí tỷ lệ với tổng REPORT tích luỹ TOÀN HỆ THỐNG, không tỷ lệ với kích thước export thực tế.

**Recommendation**: Không đổi so với Phase 10 — truyền cùng bộ filter (`department`/khoảng thời gian nếu áp dụng được cho REPORT liên quan) vào `buildMapFromReports`, hoặc join qua `$lookup` thay vì tải riêng vào RAM.

**Confidence**: HIGH.

---

### RV08-04 — Dò trùng lặp Proposal khi import không atomic với việc tạo — race condition khi 2 import chạy đồng thời (LOW-MEDIUM, POTENTIAL RISK — finding MỚI)

- **File**: `backend/src/services/excel/excel.service.ts:493-553` (`importDocumentsExcel`)

**Observed behavior**: Với mỗi dòng, hàm đọc `proposal = await Document.findOne({category, subType, department, title, createdAt, "meta.items.deviceName": deviceName})` để quyết định "create" hay "update" — TRUY VẤN NÀY CHẠY TRƯỚC `withTransaction`, không nằm trong session. Nếu 2 request import (từ 2 tab/2 user, hoặc 1 user bấm gửi 2 lần) chạy gần như đồng thời và cùng chứa 1 dòng dữ liệu giống hệt nhau (cùng title/department/createdAt/deviceName), CẢ HAI đều có thể đọc thấy `proposal = null` TRƯỚC khi bên kia kịp `Document.create` — dẫn tới tạo 2 Document PROPOSAL trùng lặp thay vì 1 create + 1 update như mong đợi.

**Evidence**: đọc trực tiếp thứ tự lệnh — không có unique index nào ở tầng DB ràng buộc tổ hợp `(category, subType, department, title, createdAt, "meta.items.deviceName")` để chặn tuyệt đối; cơ chế dedup hoàn toàn dựa vào đọc-trước-khi-ghi ở tầng application.

**Impact**: THẤP trong vận hành bình thường (import Excel thường là thao tác thủ công, hiếm khi 2 người cùng import đúng cùng 1 file/cùng lúc) — nhưng khác với `documentCode` (được bảo vệ tuyệt đối bằng Counter atomic + unique index), cơ chế dedup ở đây KHÔNG có bảo vệ tương đương. Nếu import cùng file 2 lần gần như đồng thời (VD do double-click nút submit, hoặc script tự động retry khi timeout), có thể tạo dữ liệu trùng lặp thật trong DB.

**Recommendation**: Cân nhắc thêm cơ chế khoá mềm (VD unique index tổ hợp nếu nghiệp vụ cho phép, hoặc lock theo `fileName`+`importedBy` ở tầng ứng dụng) nếu rủi ro double-submit được đánh giá là đáng lo trong thực tế vận hành.

**Confidence**: MEDIUM — race condition CONFIRMED về mặt lý thuyết qua đọc code, tần suất xảy ra thực tế **UNKNOWN**.

---

### RV08-05 — File upload chỉ kiểm tra extension, không kiểm tra magic-byte/nội dung thật (LOW, CONFIRMED — không đổi so với SEC-16, phạm vi module này)

- **File**: `backend/src/middlewares/upload.middleware.ts`

**Observed behavior**: `fileFilter` chỉ check `path.extname(file.originalname)` (client-controlled, dễ giả mạo — đổi đuôi file bất kỳ thành `.xlsx`) — không có kiểm tra `mimetype` (cũng client-controlled, dễ giả mạo tương đương) lẫn magic-byte thực tế của nội dung file.

**Evidence**: đọc toàn văn `upload.middleware.ts` — chỉ 1 điều kiện `![".xlsx", ".xls"].includes(ext)`.

**Impact**: Không đổi so với SEC-16 (Phase 09, ghi nhận cho `createUploader`/`uploadExcel` nói chung) — 1 file KHÔNG PHẢI Excel thật (đổi đuôi thủ công) có thể lọt qua filter này, sau đó thất bại ở bước `workbook.xlsx.load(fileBuffer)` (ExcelJS sẽ throw lỗi parse — rơi vào nhánh lỗi "không xác định" như RV08-01 mô tả, tương tự). Rủi ro thực tế THẤP vì file luôn xử lý bằng `memoryStorage` (không ghi ra đĩa với tên/đường dẫn do client kiểm soát — khác hẳn rủi ro path traversal của module Upload/Calibration dùng `diskStorage`), và ExcelJS sẽ từ chối file không đúng format nhị phân OOXML/BIFF.

**Recommendation**: Không đổi so với SEC-16 — nếu muốn hardening thêm, có thể bắt lỗi `workbook.xlsx.load()` cụ thể hơn (phân biệt "không phải file Excel" 400 rõ ràng thay vì lỗi parse chung chung).

**Confidence**: HIGH.

---

### RV08-06 — Bằng chứng bổ sung (2 nguồn ĐỘC LẬP) củng cố thêm cho RV05-01/RV07-05 (INFO, CONFIRMED)

- **File 1**: `backend/src/services/excel/excel.service.ts:169-173` (`exportDocumentsExcelPRO`)
- **File 2**: `backend/src/services/excel/excel.service.ts:555-557` (`importDocumentsExcel`)
- **Đối chiếu**: `docs/module-reviews/05_DOCUMENTS_CODE_REVIEW.md` (RV05-01), `docs/module-reviews/07_DASHBOARD_CODE_REVIEW.md` (RV07-05).

**Observed behavior**: Cả 2 vị trí trong `excel.service.ts` đều dùng đúng cặp ánh xạ `PROPOSE_INK ↔ CONFIRM_STATUS` / `(PROPOSE_REPAIR|PROPOSE_PROCUREMENT) ↔ CHECK_DAMAGE`:
```ts
// export — dòng 170-173
const reportData = doc.subType === "PROPOSE_INK"
  ? confirmMap.get(doc._id.toString())   // confirmMap xây từ subType CONFIRM_STATUS
  : checkDamageMap.get(doc._id.toString());

// import — dòng 556-557
const reportSubType = subType === "PROPOSE_INK" ? "CONFIRM_STATUS" : "CHECK_DAMAGE";
```
Đây là bằng chứng ĐỘC LẬP THỨ 2 (sau RV07-05, dashboard KPI "top damaged ink") xác nhận: trong toàn bộ phần code XỬ LÝ DỮ LIỆU THẬT (import/export Excel — nơi dữ liệu thật đi qua hàng ngày), `CONFIRM_STATUS` LUÔN được coi là báo cáo đi kèm `PROPOSE_INK` (mực), KHÔNG PHẢI đi kèm `PROPOSE_REPAIR` (sửa chữa) như `workflow.service.ts:syncAssetOnDocumentApproved` giả định (RV05-01).

**Impact**: Không tạo thêm finding độc lập mới — củng cố mạnh thêm cho RV05-01: nay có 3 vị trí độc lập trong code (documentRules.ts, dashboard KPI, và cả import/export Excel — nơi xử lý dữ liệu nghiệp vụ THẬT nhiều nhất) đều nhất quán với nhau (CONFIRM_STATUS ↔ PROPOSE_INK), chỉ riêng `workflow.service.ts:syncAssetOnDocumentApproved` (logic đồng bộ Asset khi duyệt xong workflow CONFIRM_STATUS) là lệch (giả định CONFIRM_STATUS ↔ PROPOSE_REPAIR). Điều này làm tăng độ tin cậy rằng nơi cần sửa là `workflow.service.ts`, không phải `documentRules.ts`.

**Recommendation**: Đọc kèm RV05-01 khi quyết định hướng fix — bằng chứng ở review này nghiêng rõ về hướng "workflow.service.ts sai", nhưng vẫn cần xác nhận cuối cùng với chủ dự án trước khi sửa (theo đúng nguyên tắc "không tự thay đổi business rule" của CLAUDE.md).

**Confidence**: HIGH (evidence code trực tiếp, độc lập ở 2 vị trí khác biệt trong cùng 1 file).

---

### RV08-07 — Khối code chết bị comment nguyên văn ~200 dòng trong `excel.service.ts` (LOW, CONFIRMED — finding MỚI)

- **File**: `backend/src/services/excel/excel.service.ts:672-878`

**Observed behavior**: Ngay sau hàm `importDocumentsExcel` (kết thúc dòng 670), có 1 khối comment dài (dòng 672-878, ~207 dòng) là bản sao gần như y hệt của chính hàm đó (phiên bản TRƯỚC khi tách transaction đúng phạm vi + dry-run) — cùng dạng pattern đã ghi nhận RV05-09 (`workflow.service.ts`) và RV06-05 (`assetAssignment.service.ts`).

**Evidence**: đọc toàn văn — toàn bộ khối dòng 672-878 bắt đầu bằng `//`.

**Impact**: Không ảnh hưởng runtime — cùng loại rủi ro maintainability đã ghi nhận ở 2 domain khác (khó đọc/review file quan trọng khi lẫn code chết).

**Recommendation**: Xoá khối comment (Git history đã lưu bản cũ) — ngoài phạm vi review này (chỉ review, không sửa).

**Confidence**: HIGH.

---

### RV08-08 — Formula Injection (Excel) — rủi ro THẤP hơn nhiều so với export CSV đã ghi nhận SEC-15, do khác định dạng file (INFO, positive/clarification)

- **File**: `backend/src/services/excel/excel.service.ts` (`exportDocumentsExcelPRO`, cột `note`/`inspectionResult` chứa free-text người dùng nhập)
- **Đối chiếu**: `docs/09_SECURITY_ANALYSIS.md` SEC-15 (CSV export ở domain `UserAudit`, NGOÀI phạm vi module này).

**Observed behavior**: `exportDocumentsExcelPRO` ghi trực tiếp `note`/`inspectionResult` (free-text, có thể bắt đầu bằng `=`/`+`/`-`/`@` nếu user nhập vào `Document.meta.items.note`) vào cell qua `worksheet.addRow({...})` — KHÔNG neutralize ký tự kích hoạt công thức, giống hệt vấn đề đã ghi nhận SEC-15.

**KHÁC BIỆT QUAN TRỌNG với SEC-15**: SEC-15 áp dụng cho export **CSV** (`escapeCsvField` ở domain khác) — nơi Excel/LibreOffice tự động DIỄN GIẢI chuỗi text thô bắt đầu bằng `=` thành công thức khi MỞ file `.csv` (do CSV không phân biệt được "cell chứa công thức" với "cell chứa text bắt đầu bằng dấu =" — mọi thứ đều là text thuần). Ở ĐÂY, `excel.service.ts` ghi thẳng ra file `.xlsx` NHỊ PHÂN THẬT qua `ExcelJS` — định dạng OOXML lưu cell dạng "công thức" (`<f>`) và cell dạng "chuỗi" (shared string) ở 2 cấu trúc XML TÁCH BIỆT HẲN nhau. Khi gán `cell.value = "=1+1"` (string thuần, không phải `{formula: "..."}`), ExcelJS lưu nó như 1 CHUỖI VĂN BẢN thông thường, KHÔNG đánh dấu là công thức — Excel khi mở file sẽ hiển thị ĐÚNG chuỗi `=1+1` dạng text, KHÔNG tự động diễn giải thành công thức (khác hẳn hành vi "đoán" của Excel khi mở `.csv`).

**Impact**: Rủi ro formula injection cho riêng luồng export Excel (`.xlsx` thật, không phải `.csv`) trong module này Ở MỨC THẤP HƠN ĐÁNG KỂ so với SEC-15 — không tự động kích hoạt khi mở file bằng Excel theo hiểu biết chuẩn về định dạng OOXML. Ghi nhận là **positive/clarification**, KHÔNG hạ cấp/xoá SEC-15 (vẫn đúng nguyên trạng cho luồng CSV thật ở domain khác).

**Recommendation**: Không cần hành động ở luồng Excel `.xlsx` này. Vẫn khuyến nghị xử lý SEC-15 ở đúng phạm vi của nó (export CSV, domain `UserAudit`).

**Confidence**: MEDIUM — hành vi ExcelJS/OOXML mô tả đúng theo hiểu biết chuẩn về định dạng, nhưng CHƯA test thực tế mở file bằng nhiều phiên bản Excel/LibreOffice khác nhau trong phạm vi review source-code-only này.

---

### RV08-09 — Positive findings

1. **Header validation chống lệch cột âm thầm**: `validateImportHeaderRow` so khớp tên cột dòng 1 TRƯỚC khi xử lý bất kỳ dòng dữ liệu nào — chặn đúng lớp lỗi nguy hiểm nhất của import theo vị trí cột cố định (dữ liệu bị đọc lệch hoàn toàn mà không có lỗi nào báo ra).
2. **Transaction per-row đúng phạm vi, có chủ đích rõ ràng** (RV08-02 không phải sơ suất) — comment giải thích kỹ TẠI SAO không bọc cả vòng lặp, và dùng closure sạch để tránh "nhiễm" state giữa các lần retry của `withTransaction`.
3. **Export Document/Asset dùng cursor + `WorkbookWriter` streaming đúng chuẩn** (ngoại trừ `buildMapFromReports`, RV08-03) — bộ nhớ không tỷ lệ với số bản ghi export.
4. **`syncDepartmentFromExcel` dùng `insertMany({ordered:false})`** cho phần ghi hàng loạt — không N+1, xử lý đúng cả trường hợp trùng tên/race condition (bắt lỗi riêng, đếm `insertedDocs`).
5. **Giới hạn dòng import/sync (`MAX_IMPORT_ROWS`/`MAX_SYNC_ROWS = 5000`)** — chặn được trường hợp cực đoan file quá lớn.
6. **Cap số lỗi lưu vào audit trail (`MAX_STORED_ERRORS = 100`)** nhưng KHÔNG cap số lỗi trả về response API — cân bằng đúng giữa "tránh document phình to" và "user cần thấy đủ lỗi để tự sửa file".
7. **Phân quyền export/import-history đúng đắn**: export Document ép `department` theo `req.user.department` cho non-Admin (không đọc từ query, chống tự ý export khoa khác); `import-history` cũng cùng nguyên tắc (non-Admin chỉ thấy lịch sử của chính mình) — cả 2 đều CÓ COMMENT giải thích rõ đây là "ràng buộc bắt buộc", không phải "filter mặc định tuỳ chọn" — thể hiện ý thức đúng về phân biệt 2 khái niệm dễ nhầm này.
8. **`suppressReservedKeysWarning`**: xử lý đúng, có cân nhắc (không đổi tên field `errors` dù biết là tên field "reserved" của Mongoose, vì đã xác nhận không có xung đột thật + tránh breaking change API) — quyết định kỹ thuật hợp lý, không phải bỏ qua cảnh báo bừa bãi.
9. **`getImportExcelTemplate`/`exportDocumentsExcelPRO` đều có try/catch xử lý đúng trường hợp lỗi xảy ra SAU KHI đã gửi header response** (`res.headersSent` check) — tránh lỗi `ERR_HTTP_HEADERS_SENT`, tự nhận diện và sửa đúng vấn đề đã từng có ở phiên bản trước (ghi trong comment).

---

## C. CÁC MỤC ĐÃ XÁC MINH LẠI, KHÔNG PHÁT HIỆN THÊM VẤN ĐỀ

- **`MAX_FILE_SIZE = 5MB`** ở `upload.middleware.ts` — hợp lý cho file Excel thông thường, không đổi.
- **Filename export hoàn toàn do server sinh** (`Danh-sach-vat-tu_${Date.now()}.xlsx`, `mau-import-de-xuat.xlsx`) — không có input client nào lọt vào tên file, không có rủi ro injection qua `Content-Disposition` header.
- **`ImportHistory.fileName`** lưu `req.file.originalname` (tên gốc file client gửi) NHƯNG chỉ dùng làm dữ liệu hiển thị/audit (string trong DB), KHÔNG dùng làm đường dẫn file thật (buffer xử lý hoàn toàn trong RAM qua `memoryStorage`, không ghi ra đĩa) — không có rủi ro path traversal cho riêng luồng Excel import/export (khác hẳn luồng upload chứng nhận kiểm định/upload chung dùng `diskStorage`, đã ghi nhận rủi ro riêng ở SEC-16/Phase 09, ngoài phạm vi module này).
- **`assetExcel.service.ts` import/export**: đã review chi tiết ở REVIEW-06 (Assets) — xác nhận lại KHÔNG có N+1 lookup (pre-fetch category/department bằng `$in`+Map), ghi tuần tự từng dòng nhưng không N+1 transaction (không dùng transaction, khác Document import) — không phát hiện thêm vấn đề mới ở khía cạnh Import/Export riêng tại review này.

---

## D. UNKNOWN CÒN TỒN ĐỌNG

- RV08-01/RV08-05: mức độ nghiêm trọng thực tế phụ thuộc tần suất client gửi sai định dạng/quá size file trong vận hành thật.
- RV08-04: tần suất double-submit/import đồng thời trong thực tế vận hành — UNKNOWN.
- RV08-06: ý nghĩa nghiệp vụ THẬT của `CONFIRM_STATUS` — cần xác nhận trực tiếp với chủ dự án (carry-over RV05-01/RV07-05).
- Thời gian xử lý thực tế của `importDocumentsExcel` với file ở ngưỡng vài nghìn dòng (PERF-07/RV08-02) — cần benchmark môi trường thật, ngoài phạm vi source-code-only.

---

**Review hoàn tất. Không có thay đổi nào được thực hiện trên source code trong quá trình review này.**

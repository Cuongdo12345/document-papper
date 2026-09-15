# 09 — FILE UPLOAD — CODE REVIEW

> REVIEW-09. Chỉ review, KHÔNG sửa source. Phạm vi: `controllers/upload`, `services/upload` (`upload.service.ts`, `upload.middleware.ts`, `upload.validator.ts`), `models/uploadFiles`, `routes/upload`, cùng logic download/serve file liên quan (kiểm tra toàn bộ `app.ts`/`server.ts` để xác nhận có/không có static serving).
>
> Nguồn đọc trực tiếp: `backend/src/routes/upload/upload.routes.ts`, `backend/src/controllers/upload/upload.controller.ts`, `backend/src/services/upload/{upload.middleware.ts,upload.service.ts,upload.validator.ts}`, `backend/src/models/uploadFiles/upload.model.ts`, `backend/src/shared/constants/permission.constant.ts` (đối chiếu permission), `grep` toàn bộ `backend/src` cho `express.static`, `res.download`, `res.sendFile`, `createReadStream`, `uploadedBy`, `validateFiles`.
>
> Baseline đã đọc trước khi verify source: `docs/00_PROJECT_MEMORY.md`, `docs/09_SECURITY_ANALYSIS.md` (SEC-16, SEC-17, SEC-18, SEC-25), cross-ref `docs/module-reviews/00_FOUNDATION_CODE_REVIEW.md` (RV00-01).
>
> **Câu hỏi đặc biệt của task — trả lời ngay ở đầu**: *"Một user có thể truy cập file của user/department khác hay không?"* → **CÓ, HOÀN TOÀN KHÔNG BỊ CHẶN.** Domain Upload chung (`/api/upload`) **không hề ghi nhận ai là người upload** (`uploadedBy` không bao giờ được set — xem RV09-02) và **không có bất kỳ check ownership/department nào** ở list/detail/delete (xem RV09-03/RV09-04) — chỉ cần có permission cấp hệ thống (`VIEW_FILES`/`VIEW_FILE_DETAIL`/`DELETE_FILE`, không phân biệt ai upload), 1 user xem/xoá được TOÀN BỘ file do BẤT KỲ ai trong hệ thống upload.

---

## A. TÓM TẮT

| # | ID | Severity | Category | Trạng thái |
|---|----|----------|----------|------------|
| 1 | RV09-01 | **HIGH** | File Upload / Security | CONFIRMED (finding MỚI — nghiêm trọng hơn SEC-17) |
| 2 | RV09-02 | **HIGH** | Authorization / Data integrity | CONFIRMED (finding MỚI, tiền đề của RV09-03/04) |
| 3 | RV09-03 | **HIGH** | Authorization (IDOR) | CONFIRMED (finding MỚI, trả lời trực tiếp câu hỏi đặc biệt) |
| 4 | RV09-04 | **HIGH** | Authorization (IDOR) | CONFIRMED (finding MỚI, trả lời trực tiếp câu hỏi đặc biệt) |
| 5 | RV09-05 | MEDIUM | File Upload / Path Traversal | CONFIRMED (= SEC-16, không đổi) |
| 6 | RV09-06 | MEDIUM | Performance / Availability | POTENTIAL RISK (finding MỚI) |
| 7 | RV09-07 | LOW-MEDIUM | Error handling | CONFIRMED (kế thừa Phase 09, không đổi) |
| 8 | RV09-08 | LOW | Maintainability | CONFIRMED (finding MỚI — dead code) |
| 9 | RV09-09 | INFO | File Upload | CONFIRMED (= RV00-01/SEC-16 mở rộng, không đổi) |
| 10 | RV09-10 | LOW | Orphan files | CONFIRMED (= SEC-18, không đổi) |
| 11 | RV09-11 | INFO (positive, đối chứng) | — | CONFIRMED |

---

## B. FINDINGS CHI TIẾT

### RV09-01 — `POST /api/upload` (endpoint chung) KHÔNG kiểm tra loại file — chấp nhận MỌI mimetype (HIGH, CONFIRMED — finding MỚI, nghiêm trọng hơn SEC-17 đã ghi nhận)

- **File 1**: `backend/src/routes/upload/upload.routes.ts:14` (`const uploader = createUploader();`)
- **File 2**: `backend/src/services/upload/upload.middleware.ts:29-47` (`createUploader`)

**Observed behavior**: `createUploader()` được gọi ở route KHÔNG truyền bất kỳ tham số nào:
```ts
const uploader = createUploader();
router.post("/", authenticate, authorizePermission("UPLOAD_FILES"), uploader.array("files"), uploadFiles);
```
`createUploader`'s `fileFilter` có logic:
```ts
fileFilter: (_, file, cb) => {
  if (!options?.allowedTypes) return cb(null, true);   // ← KHÔNG có allowedTypes → CHẤP NHẬN MỌI FILE
  ...
}
```
Vì `options` là `undefined`, `options?.allowedTypes` luôn `undefined` → **MỌI file, bất kể mimetype/extension, đều được chấp nhận** — không chỉ "chỉ kiểm tra qua mimetype client cung cấp" (như SEC-17 đã ghi nhận cho `createUploader` nói chung), mà ở CHÍNH route dùng nhiều nhất (`POST /api/upload`) **KHÔNG CÓ BẤT KỲ KIỂM TRA LOẠI FILE NÀO CẢ** — kể cả kiểm tra hời hợt qua mimetype cũng không có.

**Đối chứng quan trọng**: route calibration certificate (`certificateUploader`, đã review REVIEW-06) gọi ĐÚNG với `allowedTypes: ["application/pdf","image/jpeg","image/png"]` — cho thấy `createUploader` được THIẾT KẾ để nhận `allowedTypes`, nhưng route `/api/upload` (domain chung) đã quên truyền.

**Evidence**: đọc trực tiếp `upload.routes.ts:14` + `upload.middleware.ts:38-46`.

**Impact**: Bất kỳ user có permission `UPLOAD_FILES` (permission phổ biến, không phải quyền admin) có thể upload BẤT KỲ loại file nào lên server — bao gồm file thực thi (`.exe`, `.sh`, `.php`, `.js`...), giới hạn duy nhất còn lại là dung lượng (`maxSize` mặc định 10MB, cũng không truyền tường minh nên dùng default). Kết hợp với RV09-09 (file KHÔNG được serve qua HTTP bởi chính app này) thì rủi ro thực thi từ xa qua app này THẤP, nhưng: (a) nếu có hạ tầng khác (reverse proxy/static file server) serve trực tiếp thư mục `backend/uploads/` (rất phổ biến trong triển khai thực tế), rủi ro tăng vọt; (b) ngay cả khi không thực thi được, đây vẫn là kho lưu trữ file tuỳ ý không kiểm soát trên server nội bộ.

**Recommendation**: Truyền `allowedTypes` tường minh cho `createUploader()` ở route `/api/upload` (danh sách MIME hợp lý cho tài liệu nội bộ: PDF/Word/Excel/ảnh...), đồng bộ với cách route calibration certificate đã làm đúng.

**Confidence**: HIGH.

---

### RV09-02 — `uploadedBy` KHÔNG BAO GIỜ được ghi khi upload qua `/api/upload` — file không có chủ sở hữu (HIGH, CONFIRMED — finding MỚI, tiền đề trực tiếp của RV09-03/RV09-04)

- **File**: `backend/src/services/upload/upload.service.ts:3-14` (`saveFilesToDB`)
- **File phụ**: `backend/src/controllers/upload/upload.controller.ts:6-19` (`uploadFiles`), `backend/src/models/uploadFiles/upload.model.ts` (field `uploadedBy`)

**Observed behavior**: Model `Upload` CÓ field `uploadedBy: {type: ObjectId, ref: "User"}`, nhưng `saveFilesToDB` (hàm DUY NHẤT tạo bản ghi `Upload` cho route `/api/upload`) không hề set field này:
```ts
export const saveFilesToDB = async (files: Express.Multer.File[]) => {
  const data = files.map((file) => ({
    fileName: file.originalname,
    fileUrl: `/uploads/${file.filename}`,
    fileSize: file.size,
    mimeType: file.mimetype,
    // ⚠️ KHÔNG có uploadedBy
  }));
  return await Upload.insertMany(data);
};
```
`uploadFiles` (controller) gọi `saveFilesToDB(files)` — không truyền `req.user!._id` vào, dù `req.user` sẵn có (đã qua `authenticate`).

**Evidence**: đọc toàn văn `upload.service.ts` + `upload.controller.ts` — `grep uploadedBy` trong `services/upload`/`controllers/upload`/`routes/upload` không khớp dòng nào NGOÀI khai báo field trong model.

**Impact**: Mọi file upload qua `/api/upload` có `uploadedBy: undefined` trong DB — hệ thống KHÔNG CÓ CÁCH NÀO xác định ai đã upload file nào, kể cả khi muốn bổ sung ownership-check sau này thì dữ liệu cũ (và cả dữ liệu MỚI cho tới khi fix) đều thiếu thông tin này. Đây là NGUYÊN NHÂN GỐC khiến RV09-03/RV09-04 (list/xoá không phân biệt được ai sở hữu file) không thể tự sửa đơn giản chỉ bằng cách thêm 1 điều kiện filter — cần backfill dữ liệu hoặc chấp nhận file cũ không xác định được chủ.

**Recommendation**: Sửa `saveFilesToDB` nhận thêm `uploadedBy` (từ `req.user!._id`), set vào từng bản ghi khi tạo. Đây là điều kiện TIÊN QUYẾT trước khi có thể vá RV09-03/RV09-04.

**Confidence**: HIGH.

---

### RV09-03 — `GET /api/upload` (danh sách) trả về TOÀN BỘ file trong hệ thống, không lọc theo người gọi (HIGH, CONFIRMED — finding MỚI, trả lời câu hỏi đặc biệt)

- **File**: `backend/src/controllers/upload/upload.controller.ts:22-26` (`getFiles`)

**Observed behavior**:
```ts
export const getFiles = async (req: Request, res: Response) => {
  const files = await Upload.find({ isDeleted: false });
  res.json(files);
};
```
Không có filter `uploadedBy`, không kiểm tra `req.user`, không phân trang — trả về NGUYÊN VĂN mọi bản ghi `Upload` chưa xoá trong TOÀN BỘ collection.

**Evidence**: đọc toàn văn hàm — chỉ 1 điều kiện `isDeleted: false`.

**Impact**: Bất kỳ user có permission `VIEW_FILES` (permission cấp hệ thống, không resource-scoped) xem được metadata (`fileName`, `fileUrl`, `mimeType`, `fileSize`, `uploadedBy`, ...) của MỌI file do MỌI người dùng khác upload — không phân biệt phòng ban, không phân biệt người upload. Đây là câu trả lời trực tiếp cho câu hỏi đặc biệt của task: **CÓ**, 1 user có thể thấy toàn bộ danh sách file của người/phòng ban khác. Kết hợp RV09-09 (không serve qua HTTP bởi app này) thì chưa đọc được NỘI DUNG file qua chính app, nhưng `fileUrl` (VD `/uploads/1735000000000-hop-dong-luong.pdf`) lộ ra đủ để dò tìm nếu có kênh truy cập khác tới thư mục `uploads/`.

**Recommendation**: Thêm filter `uploadedBy: req.user!._id` cho user không phải Admin (đúng mô hình đã áp dụng ĐÚNG ở domain khác — VD `import-history`/`export Document` ở REVIEW-08: "ADMIN xem tất cả, user thường chỉ xem của mình"). Cần hoàn thành RV09-02 trước (bắt buộc có `uploadedBy` để lọc được).

**Confidence**: HIGH.

---

### RV09-04 — `GET /api/upload/:id` và `DELETE /api/upload/:id` không kiểm tra ownership — IDOR đầy đủ (HIGH, CONFIRMED — finding MỚI, trả lời câu hỏi đặc biệt)

- **File**: `backend/src/controllers/upload/upload.controller.ts:29-54` (`getFileDetail`, `deleteFile`)

**Observed behavior**:
```ts
export const getFileDetail = async (req: Request, res: Response) => {
  const file = await Upload.findById(req.params.id);
  ...
  res.json(file);
};

export const deleteFile = async (req: Request, res: Response) => {
  const file = await Upload.findById(req.params.id);
  ...
  file.isDeleted = true;
  await file.save();
  res.json({ message: "File deleted" });
};
```
Cả 2 hàm chỉ `findById` theo `:id` từ URL — không so sánh `file.uploadedBy` với `req.user!._id`, không check department, không check `isAdmin`.

**Evidence**: đọc toàn văn cả 2 hàm.

**Impact**: **NGHIÊM TRỌNG NHẤT của cả module** — đây là lỗ hổng IDOR (Insecure Direct Object Reference) kinh điển:
- Bất kỳ user có `VIEW_FILE_DETAIL` xem được chi tiết metadata của BẤT KỲ file nào (chỉ cần đoán/liệt kê ObjectId, hoặc lấy từ RV09-03).
- Bất kỳ user có `DELETE_FILE` **XOÁ ĐƯỢC (soft-delete) BẤT KỲ FILE NÀO của BẤT KỲ AI KHÁC** — kể cả file quan trọng do người khác/phòng ban khác upload. Không cần là chủ sở hữu, không cần là Admin, không cần cùng phòng ban.

Đây là câu trả lời trực tiếp thứ 2 cho câu hỏi đặc biệt: **CÓ, và còn nghiêm trọng hơn "xem"** — user khác có thể **XOÁ MỀM** file của người khác mà không cần bất kỳ quan hệ sở hữu nào.

**Recommendation**: Bổ sung check ownership: `if (!isAdmin && file.uploadedBy?.toString() !== req.user!._id.toString()) throw ApiError.forbidden(...)` cho cả 2 hàm — cần hoàn thành RV09-02 trước.

**Confidence**: HIGH.

---

### RV09-05 — Path traversal tiềm năng qua `file.originalname` không sanitize khi đặt tên file lưu trên disk (MEDIUM, CONFIRMED — không đổi so với SEC-16)

- **File**: `backend/src/services/upload/upload.middleware.ts:19-26` (`storage.filename`)

**Observed behavior**: Xác nhận lại nguyên trạng SEC-16 — `filename: (_, file, cb) => { const uniqueName = \`${Date.now()}-${file.originalname}\`; cb(null, uniqueName); }` dùng thẳng `file.originalname` (client-controlled qua multipart header) không loại bỏ `../`, `..\\`, hay path separator nào. Prefix `Date.now()-` không giải quyết được path traversal (traversal có thể nằm ở BẤT KỲ đâu trong chuỗi, không chỉ đầu).

**Evidence**: đọc toàn văn — không có `path.basename()`/regex loại bỏ ký tự path separator nào áp dụng lên `file.originalname` trước khi ghép vào `uniqueName`.

**Impact**: Không đổi so với SEC-16 — INFERRED (chưa test runtime theo nguyên tắc không exploit), nhưng CONFIRMED về mặt code là thiếu sanitize. Route bị ảnh hưởng: `POST /api/upload` (permission `UPLOAD_FILES`) và `POST /api/assets/medical-devices/:assetId/calibration-records` (permission `MEDICAL_DEVICE_CALIBRATE`) — cả 2 dùng chung `createUploader`/`storage`.

**Recommendation**: Không đổi so với SEC-16 — dùng `path.basename(file.originalname)` (loại bỏ mọi thành phần thư mục) kết hợp giữ nguyên prefix `Date.now()-` (hoặc tốt hơn: sinh tên file HOÀN TOÀN ngẫu nhiên, VD `crypto.randomUUID()`, chỉ giữ lại `path.extname()` để không phụ thuộc bất kỳ phần nào của tên file client cung cấp).

**Confidence**: HIGH.

---

### RV09-06 — `GET /api/upload` không phân trang — tải toàn bộ collection vào response (MEDIUM, POTENTIAL RISK — finding MỚI)

- **File**: `backend/src/controllers/upload/upload.controller.ts:22-26` (`getFiles`)

**Observed behavior**: `Upload.find({isDeleted:false})` không có `.limit()`/`.skip()`/tham số phân trang nào — trả về TOÀN BỘ document khớp điều kiện trong 1 response.

**Evidence**: đọc toàn văn hàm.

**Impact**: Nếu số lượng file upload tích luỹ lớn theo thời gian (mọi user, mọi lần upload — không giới hạn), response có thể phình to không kiểm soát, tốn RAM/băng thông cho cả server lẫn client, và tăng thời gian query. Mức độ nghiêm trọng phụ thuộc số lượng bản ghi thực tế (UNKNOWN).

**Recommendation**: Bổ sung phân trang (cùng mẫu hình `parsePaginationQuery`/`buildPaginationMeta` đã dùng tốt ở domain khác — Documents/Assets/Dashboard/Excel).

**Confidence**: HIGH.

---

### RV09-07 — `upload.controller.ts` không dùng `catchAsync`/`ApiError` — tự bắt lỗi và lộ `err.message` thô qua status 500 tự set (LOW-MEDIUM, CONFIRMED — kế thừa Phase 09, không đổi)

- **File**: `backend/src/controllers/upload/upload.controller.ts` (toàn bộ 4 handler)

**Observed behavior**: Xác nhận lại nguyên trạng đã ghi nhận ở Phase 09 (mục lỗi xử lý rời rạc) — `uploadFiles` là handler DUY NHẤT trong module này có try/catch, và catch trả thẳng `res.status(500).json({message: err.message})` — không qua `errorHandler` tập trung, không dùng `ApiError`. 3 handler còn lại (`getFiles`, `getFileDetail`, `deleteFile`) hoàn toàn KHÔNG bọc `catchAsync`/try-catch nào — nếu `Upload.find`/`Upload.findById`/`file.save()` throw (VD lỗi kết nối DB, `CastError` khi `:id` sai format ObjectId), lỗi rơi thẳng vào Express mà không có `next(error)` — với Express 5 (dự án đang dùng, theo Memory) các handler async throw sẽ được tự động forward, nhưng KHÔNG NHẤT QUÁN với toàn bộ pattern `catchAsync` đã áp dụng ở MỌI domain khác trong hệ thống.

**Evidence**: đọc toàn văn `upload.controller.ts` — không có `import { catchAsync }` trong file, khác 100% các controller khác đã review (Documents, Assets, Dashboard, Excel).

**Impact**: `:id` sai format ObjectId ở `GET /api/upload/:id`/`DELETE /api/upload/:id` sẽ tạo `CastError` — nếu Express 5 tự forward đúng, vẫn rơi vào `errorHandler` nhánh `CastError` (400, xử lý đúng) — nhưng đây là PHỤ THUỘC vào hành vi tự động của Express 5 cho async handler, KHÔNG phải chủ đích tường minh như các domain khác (dùng `catchAsync` rõ ràng). Không nhất quán code style, tăng rủi ro khi có thay đổi framework/refactor sau này.

**Recommendation**: Đồng bộ `upload.controller.ts` theo pattern `catchAsync` + `ApiError` chung — đúng khuyến nghị đã có ở Phase 09.

**Confidence**: HIGH.

---

### RV09-08 — `validateFiles` (`upload.validator.ts`) được viết đầy đủ nhưng KHÔNG BAO GIỜ được gọi (LOW, CONFIRMED — finding MỚI)

- **File**: `backend/src/services/upload/upload.validator.ts`

**Observed behavior**: Hàm `validateFiles` cung cấp validate khá đầy đủ (số lượng file tối đa, tổng dung lượng tối đa, loại file, size từng file) nhưng `grep` toàn bộ `backend/src` xác nhận **không có lời gọi nào** tới hàm này ngoài chính định nghĩa.

**Evidence**: `grep -rn "validateFiles\b" backend/src` chỉ khớp dòng định nghĩa trong `upload.validator.ts`.

**Impact**: Không ảnh hưởng runtime trực tiếp (chỉ là dead code) — nhưng đáng chú ý vì các validate hữu ích mà hàm này CUNG CẤP (VD `maxTotalSize`, `maxFiles`) hiện KHÔNG được enforce ở đâu cả cho `POST /api/upload` (chỉ còn lại `limits.fileSize` per-file của multer, không giới hạn SỐ LƯỢNG file hay TỔNG dung lượng của 1 lần upload nhiều file qua `uploader.array("files")`).

**Recommendation**: Gọi `validateFiles` trong `uploadFiles` (controller) với `options` phù hợp (VD `maxFiles`, `maxTotalSize`), hoặc xoá nếu quyết định không cần dùng.

**Confidence**: HIGH.

---

### RV09-09 — File upload KHÔNG được serve qua HTTP bởi chính ứng dụng — `fileUrl` trả về không có endpoint tương ứng để tải (INFO, CONFIRMED — mở rộng RV00-01/SEC-16, không đổi)

- **File**: toàn bộ `backend/src/app.ts`/`server.ts` (đối chiếu), toàn bộ `backend/src` (grep)

**Observed behavior**: Xác nhận lại RV00-01 (REVIEW-00) — `grep` toàn bộ codebase cho `express.static`, `res.download`, `res.sendFile`, `createReadStream` **không khớp bất kỳ đâu**. `fileUrl` (`/uploads/${file.filename}`) được trả về nguyên văn trong response API nhưng KHÔNG CÓ route nào trong ứng dụng Node phục vụ đường dẫn này.

**Evidence**: `grep -rn "express.static|res.download|res.sendFile|createReadStream" backend/src` — 0 kết quả.

**Impact**: 2 chiều:
- **Tích cực**: giảm nhẹ đáng kể tác động của RV09-01 (không giới hạn loại file) và RV09-03/RV09-04 (IDOR) — vì kể cả biết được `fileUrl`/xem được metadata, KHÔNG CÓ CÁCH NÀO qua chính ứng dụng Node này để TẢI VỀ nội dung file thật.
- **Tiêu cực/rủi ro kiến trúc**: nếu môi trường triển khai thực tế có 1 lớp khác (Nginx/Apache/CDN) cấu hình serve TĨNH thư mục `backend/uploads/` (rất phổ biến trong thực tế, và thư mục này NẰM NGOÀI `backend/src`, dễ bị cấu hình serve tĩnh mà không ai để ý đây là input người dùng), thì MỌI kiểm soát authorization ở tầng Node (permission, RBAC) hoàn toàn BỊ BỎ QUA — ai có URL trực tiếp (`http://host/uploads/<filename>`) tải được file mà KHÔNG cần đăng nhập, KHÔNG cần permission gì — biến RV09-01/RV09-03/RV09-04 từ "rủi ro tiềm ẩn cần điều kiện khác" thành "lỗ hổng có thể khai thác trực tiếp qua URL".

**Recommendation**: Không đổi so với RV00-01 (Phase 03/REVIEW-00) — xác nhận với đội hạ tầng/triển khai xem `backend/uploads/` có bị serve tĩnh bởi lớp nào khác ngoài Node hay không. Nếu CÓ, đây là **ưu tiên xử lý cao nhất** của toàn bộ module Upload (biến mọi finding IDOR ở review này thành khai thác được trực tiếp qua URL, không cần authenticate). Nếu KHÔNG, cân nhắc: hoặc xây dựng 1 route download có authorization đúng đắn (kiểm tra ownership/permission trước khi `res.sendFile`), hoặc làm rõ trong tài liệu rằng `fileUrl` hiện tại chỉ mang tính tham chiếu, chưa dùng để tải file thật.

**Confidence**: HIGH (evidence code), UNKNOWN về cấu hình hạ tầng triển khai thực tế.

---

### RV09-10 — Không có cơ chế dọn file mồ côi khi ghi DB thất bại sau khi Multer đã ghi file (LOW, CONFIRMED — không đổi so với SEC-18)

- **File**: `backend/src/services/upload/upload.service.ts` (`saveFilesToDB`), `backend/src/controllers/upload/upload.controller.ts` (`uploadFiles`)

**Observed behavior**: Xác nhận lại nguyên trạng SEC-18 cho riêng domain Upload chung — Multer (`diskStorage`) đã ghi file THẬT lên đĩa TRƯỚC KHI `uploadFiles`/`saveFilesToDB` chạy. Nếu `Upload.insertMany(data)` thất bại (VD lỗi kết nối DB giữa chừng khi upload nhiều file), các file ĐÃ ghi trên đĩa (multer xử lý xong trước khi vào controller) không có cơ chế dọn nào — khác `calibrationRecord.service.ts` (REVIEW-06) đã có cờ `committed` xử lý tinh tế trường hợp tương tự.

**Evidence**: đọc toàn văn `saveFilesToDB`/`uploadFiles` — không có `fs.unlink`/try-catch dọn file nào.

**Impact**: THẤP — rác đĩa tích luỹ dần theo tần suất lỗi DB xảy ra đúng lúc upload, không phải mất dữ liệu người dùng.

**Recommendation**: Không đổi so với SEC-18 — thêm job dọn định kỳ file trên disk không có bản ghi `Upload` tương ứng, hoặc áp dụng lại mẫu hình cờ `committed` đã dùng tốt ở `calibrationRecord.service.ts`.

**Confidence**: HIGH.

---

### RV09-11 — Positive/đối chứng: `certificateUploader` (calibration, REVIEW-06) làm ĐÚNG những gì `/api/upload` làm sai (INFO, CONFIRMED)

- **File**: `backend/src/routes/assets/medicalDevice.routes.ts` (`certificateUploader`, đã đọc ở REVIEW-06)

**Observed behavior**: Route calibration certificate gọi `createUploader({maxSize: 10*1024*1024, allowedTypes: ["application/pdf","image/jpeg","image/png"]})` — CÓ giới hạn size RÕ RÀNG (không dùng default), CÓ whitelist type. `createCalibrationRecordService` (service tương ứng) còn set `uploadedBy: userId`, `isUsed: true` NGAY khi tạo — đối lập hoàn toàn với `saveFilesToDB` (RV09-02).

**Impact**: Không phải finding — dùng làm bằng chứng rằng `createUploader` được THIẾT KẾ ĐÚNG và module Upload chung (`/api/upload`) đơn giản là CHƯA ĐƯỢC GỌI ĐÚNG CÁCH, không phải do `createUploader`/kiến trúc factory có vấn đề. Điều này làm cho fix RV09-01 dễ dàng hơn — chỉ cần áp dụng lại đúng cách đã chứng minh hoạt động tốt ở nơi khác trong CÙNG CODEBASE.

**Recommendation**: Dùng `certificateUploader`/`createCalibrationRecordService` làm THAM CHIẾU khi sửa RV09-01/RV09-02.

**Confidence**: HIGH.

---

## C. UNKNOWN CÒN TỒN ĐỌNG

- RV09-09: `backend/uploads/` có bị serve tĩnh bởi hạ tầng khác (Nginx/reverse proxy) ngoài phạm vi source code Node hay không — **UNKNOWN, đây là UNKNOWN quan trọng nhất của toàn bộ review này**, quyết định mức độ nghiêm trọng thực tế của RV09-01/RV09-03/RV09-04 (từ "rủi ro cần điều kiện" thành "khai thác được ngay qua URL").
- RV09-06: số lượng bản ghi `Upload` thực tế trong production — ảnh hưởng mức độ nghiêm trọng thực tế.
- RV09-05: khả năng khai thác path traversal thực tế qua `file.originalname` phụ thuộc hành vi cụ thể của phiên bản Multer/OS đang chạy — chưa test runtime (đúng nguyên tắc không exploit).

---

**Review hoàn tất. Không có thay đổi nào được thực hiện trên source code trong quá trình review này.**

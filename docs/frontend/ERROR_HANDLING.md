# ERROR HANDLING

> Nguồn: `backend/src/middlewares/error.middleware.ts`, `shared/errors/ApiError.ts`, `controllers/upload/upload.controller.ts`. Xác minh trực tiếp source 2026-09-03.

## 1. Kiến trúc error phía backend

```
Service throw ApiError.xxx(message, details?)
   → Controller (catchAsync wrapper) → next(err)
   → error.middleware.ts (GLOBAL, DUY NHẤT)
       1. err instanceof ApiError        → status đã gán sẵn lúc throw
       2. err instanceof multer.MulterError → 400
       3. err.name === "CastError"       → 400 (ObjectId sai format)
       4. err.name === "ValidationError" → 400 (Mongoose schema validate fail)
       5. fallback (không xác định)      → getSafeStatus(err) hoặc 500
   → res.json({success:false, message, errorCode, details?})
```

**Đây là kiến trúc DUY NHẤT của toàn hệ thống** — 1 middleware tập trung, KHÔNG có middleware error khác. Đáng tin cậy cho ~95% endpoint.

## 2. Response shape chuẩn (đáng tin cậy)

```json
{
  "success": false,
  "message": "Thông báo tiếng Việt, AN TOÀN hiển thị trực tiếp cho user",
  "errorCode": "VALIDATION_ERROR | UNKNOWN_ERROR | MULTER_LIMIT_FILE_SIZE | ...",
  "details": ["chỉ có ở lỗi ValidationError — mảng message chi tiết từng field"]
}
```

- `message` **KHÔNG BAO GIỜ** lộ chi tiết nội bộ (stack trace, tên driver MongoDB, đường dẫn file...) — đã audit kỹ ở DEV-021/SEC-23. Với lỗi 500 không xác định, message LUÔN là `"Đã có lỗi xảy ra, vui lòng thử lại sau"` (generic, không đổi theo lỗi thật) — FE hiển thị trực tiếp `message` là AN TOÀN cho MỌI status code.
- `errorCode` — dùng để FE phân biệt LOGIC xử lý khác nhau (vd retry riêng cho `MULTER_LIMIT_FILE_SIZE`), KHÔNG dùng `message` (chuỗi tiếng Việt) để so khớp logic (giòn, dễ vỡ khi backend đổi câu chữ).
- `details` xuất hiện ở **2 nguồn khác nhau, shape KHÁC NHAU** (xác nhận trực tiếp `validate.middleware.ts`/`ApiError.ts`):
  1. **Zod DTO validation** (`validateBody`/`validateQuery`/`validateParams` — chiếm đa số lỗi 400 thực tế) → `ApiError.badRequest(msg, result.error.issues)` → `errorCode: "BAD_REQUEST"`, `details` = mảng `ZodIssue` gốc: `[{code, path:(string|number)[], message, ...}]`. **`path` là mảng** (vd `["password"]` hoặc `["items", 0, "quantity"]`), KHÔNG phải string đơn — form mapping lỗi field cần `join(".")` hoặc xử lý mảng.
  2. **Mongoose `ValidationError`** (hiếm, schema-level, không qua Zod) → nhánh riêng ở `error.middleware.ts`, `errorCode: "VALIDATION_ERROR"`, `details` = mảng **string** message thuần (không có `path`).
  `FRONTEND_RECOMMENDATION`: form error-mapping helper cần phân biệt 2 shape này qua `errorCode` (`"BAD_REQUEST"` → đọc `details[].path`+`details[].message`; `"VALIDATION_ERROR"` → đọc `details[]` như mảng string thuần), KHÔNG giả định 1 shape chung cho mọi `details`.

## 3. Status code theo tình huống

| Tình huống | Status | Nguồn |
|---|---|---|
| Validate DTO sai (Zod) | 400 | `validateBody/Query/Params` middleware |
| Business rule vi phạm (`ApiError.badRequest`) | 400 | Service |
| Chưa đăng nhập / token invalid/hết hạn | 401 | `authenticate` middleware |
| Đủ đăng nhập nhưng thiếu permission | 403 | `authorizePermission` middleware |
| Resource không tồn tại (`ApiError.notFound`) | 404 | Service |
| Conflict (vd `VersionError` khi 2 request sửa cùng Asset gần như đồng thời) | 409 | Service (`ApiError.conflict`) |
| Rate limit vượt ngưỡng | 429 | `authRateLimiter`/DB-based limiter (forgot-password) |
| Lỗi Multer (vượt size/số lượng file) | 400 | `error.middleware.ts` nhánh 2 |
| Lỗi không xác định khác | 500 (hoặc `err.status` nếu hợp lệ) | fallback |

`FRONTEND_RECOMMENDATION`: Axios interceptor xử lý 401 riêng (refresh flow, xem `AUTH_RBAC_MAP.md`), 403 hiển thị trang/toast "Không đủ quyền" (KHÔNG tự động logout — 403 khác 401), còn lại hiển thị `message` trực tiếp qua toast/inline error.

## 4. Ngoại lệ — KHÔNG đi qua kiến trúc chuẩn (domain Upload)

`upload.controller.ts` — `getFileDetail`/`deleteFile` dùng `try/catch` thủ công, trả lỗi TRỰC TIẾP bằng `res.status(404/403).json({message})`:

```json
{ "message": "Không tìm thấy file" }
```
hoặc
```json
{ "message": "Bạn không có quyền xem file này" }
```

**KHÔNG có `success`, KHÔNG có `errorCode`** ở 2 response lỗi này. `uploadFiles` (catch riêng, DEV-021) cũng chỉ trả `{message}` khi lỗi 500 không xác định.

`FRONTEND_RECOMMENDATION`: API layer viết 1 hàm `parseApiError(err)` với logic:
```
lấy err.response.data
  có field `success===false` → dùng {message, errorCode, details} chuẩn
  không có field `success` (chỉ có `message`) → dùng {message}, errorCode = "UNKNOWN" mặc định
  không có gì cả (network error, timeout) → message tự đặt phía FE ("Không thể kết nối máy chủ")
```
Không giả định MỌI response lỗi đều có `errorCode` — sẽ crash/hiển thị sai nếu code cứng đọc `err.response.data.errorCode` cho domain Upload.

## 5. Errors theo domain (tổng hợp, không lặp lại toàn bộ — xem `API_REFERENCE.md` cho từng endpoint cụ thể)

| Domain | Error đặc thù cần FE xử lý riêng (không chỉ hiển thị message chung) |
|---|---|
| Auth | `forgot-password` KHÔNG BAO GIỜ trả lỗi "user not found" — FE không nên coi 200 là bằng chứng user tồn tại |
| Users | `change-password`/`reset-password` thành công → phải tự logout (revoke toàn bộ refresh token) |
| Documents | 400 "đang có 1 đề xuất sửa chữa khác chưa duyệt" kèm `documentCode` trong message — có thể parse hiển thị link nếu muốn (message là text, không có field `conflictId` riêng) |
| Assets | 409 khi `VersionError` (race condition assign/transfer/return đồng thời 2 request) — FE nên tự động refetch dữ liệu asset rồi cho user thử lại, không chỉ hiển thị lỗi tĩnh |
| Upload | Xem Mục 4 — shape lỗi khác biệt |
| Dashboard | Không có validate query rõ ràng — lỗi sai `month`/`year` có thể KHÔNG trả 400 mà trả dữ liệu rỗng/sai âm thầm (xem `API_REFERENCE.md` mục Dashboard) |

## 6. Known Gaps / Conflicts

- **`OPENAPI_CONTRACT` vs `SOURCE_CODE_BEHAVIOR`**: OpenAPI mô tả response error qua `$ref: "#/components/responses/BadRequest"` (v.v.) — cấu trúc chung khớp Mục 2, NHƯNG OpenAPI **không thể hiện** ngoại lệ domain Upload (Mục 4) vì đó là hành vi runtime cụ thể, không phải 1 phần contract được document riêng. FE PHẢI dựa vào Mục 4 (source-code-verified), không dựa "OpenAPI nói mọi lỗi đều có `success:false`".
- Shape lỗi Zod validation (`details`) — đã xác nhận CONFIRMED qua source (`validate.middleware.ts`), xem Mục 2.

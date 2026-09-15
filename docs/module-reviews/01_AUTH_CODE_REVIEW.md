# REVIEW-01 — AUTHENTICATION CODE REVIEW

> Phạm vi: `backend/src/{controllers,services,models}/auth/`, `dto/auth/`, `routes/auth/auth.routes.ts`, `shared/helpers/auth.helper.ts`, và các dependency trực tiếp: `User` model, `authenticate` middleware, `authRateLimiter` middleware. KHÔNG review RBAC/Users module ngoài phần dependency trực tiếp tới auth.
> KHÔNG sửa code. KHÔNG chạy lại Phase 01→13. KHÔNG refactor.
> Ngày review: 2026-08-30. Commit: `5b58fb1` (branch `main`).

---

## 1. Tài liệu/nguồn đã đọc trước khi review

- `CLAUDE.md`, `docs/00_PROJECT_MEMORY.md`, `docs/07_AUTH_RBAC_ANALYSIS.md`, `docs/09_SECURITY_ANALYSIS.md`, `docs/module-reviews/00_FOUNDATION_CODE_REVIEW.md`.
- Source (đọc trực tiếp, dependency-driven):
  - `backend/src/services/auth/auths.service.ts` (473 dòng, toàn bộ)
  - `backend/src/controllers/auth/auth.controller.ts` (toàn bộ)
  - `backend/src/routes/auth/auth.routes.ts` (toàn bộ)
  - `backend/src/dto/auth/auths.dto.ts` (toàn bộ)
  - `backend/src/models/auth/{refreshToken.model.ts, passwordResetToken.model.ts}` (toàn bộ)
  - `backend/src/shared/helpers/auth.helper.ts` (toàn bộ)
  - `backend/src/middlewares/{auth.middleware.ts, authRateLimiter.middleware.ts}` (đã đọc kỹ ở TASK-001/REVIEW-00, xác nhận lại không đổi)
  - `backend/src/models/users/user.model.ts` (đã đọc kỹ ở TASK-001, xác nhận lại field `email`/`isActive`/`password` liên quan auth)

---

## 2. Trace: Login → Credential verification → Access/Refresh token → Middleware → User

```
POST /api/auths/login {username, password}
  app.ts: authLimiter (20 req/15min, theo prefix /api/auths)
  auth.routes.ts: authRateLimiter (20 req/15min, riêng cho route này — TRÙNG cấu hình
                   với authLimiter ở app.ts, xem RV00-04)
    → validateBody(LoginDTO)  (Zod: username 3-50 ký tự regex, password min 5)
  auth.controller.ts:login → AuthService.login(username, password)
    → User.findOne({username}).select("+password").populate("role","name").populate("department","code name")
    → NHÁNH A (!user || !user.isActive):
        bcrypt.compare(password, DUMMY_PASSWORD_HASH)   ← dummy, chống timing/enumeration
        throw 401 "Tên đăng nhập hoặc mật khẩu không đúng"
    → NHÁNH B (user tồn tại): bcrypt.compare(password, user.password)
        sai → throw 401 CÙNG message với nhánh A
    → generateAccessToken({id, role, department})   (JWT_SECRET, HS256, 8h — hardcode, JWT_EXPIRES_IN env KHÔNG dùng, đã biết Phase 03 §7.1)
    → generateRefreshToken(id)                       (JWT_REFRESH_SECRET, HS256, 7d)
    → RefreshToken.create({user, token: refreshToken (PLAINTEXT), expiresAt: +7 ngày})
    → UserAudit.create({action:"LOGIN"})
  auth.controller.ts → res.json({message, data:{accessToken, refreshToken, user}})

[Request tiếp theo, có Bearer accessToken]
  auth.middleware.ts:authenticate
    → jwt.verify(token, JWT_SECRET, {algorithms:["HS256"]})   ← KHÔNG đọc role/department từ payload token
    → validate decoded.id là ObjectId
    → User.findById(decoded.id).select("_id role department isActive").populate("role","name")
       ← LOAD LẠI TỪ DB MỖI REQUEST, bỏ qua role/department đã nhúng sẵn trong JWT payload
    → !user || !isActive → 401
    → req.user = {_id, role (từ DB, tươi), department (từ DB, tươi), isActive, permissions:[]}
```

---

## 3. Findings

### RV01-01 — `refresh()` không bọc `jwt.verify()` — refresh token hết hạn/hỏng trả về 500 kèm message lỗi thư viện thô
- **Severity**: HIGH
- **Category**: Error Handling / Correctness (liên hệ trực tiếp RV00-02)
- **File**: `backend/src/services/auth/auths.service.ts`
- **Function/Class**: `refresh()`
- **Observed Behavior**: Thứ tự xử lý: (1) query DB `RefreshToken.findOne({token, revoked:false})` — **KHÔNG lọc `expiresAt > now`**; (2) nếu tìm thấy, gọi `jwt.verify(refreshToken, JWT_REFRESH_SECRET, {algorithms:["HS256"]})` **KHÔNG có try/catch bao quanh**. Nếu token đã hết hạn (theo `exp` claim tự ký trong JWT, thường trùng thời điểm với `expiresAt` ở DB) hoặc bị chỉnh sửa/hỏng, `jwt.verify` throw `TokenExpiredError`/`JsonWebTokenError` — lỗi này KHÔNG phải `ApiError`, không có `.status`.
- **Evidence**:
  ```ts
  // auths.service.ts:240-265 (rút gọn)
  const storedToken = await RefreshToken.findOne({ token: refreshToken, revoked: false })
    .populate({ path: "user", populate: [...] });
  if (!storedToken) throw ApiError.badRequest("Refresh token không hợp lệ hoặc đã bị thu hồi");
  const user: any = storedToken.user;
  if (!user.isActive) throw ApiError.badRequest("Tài khoản đã bị khóa");
  jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET as string, { algorithms: ["HS256"] });
  // ^ KHÔNG try/catch — nếu throw, lỗi bay thẳng ra catchAsync → errorHandler
  ```
  Đối chiếu `errorHandler` (REVIEW-00, RV00-02): lỗi không phải `ApiError`/`CastError`/`ValidationError` rơi vào nhánh cuối, `getSafeStatus()` trả về 500 (vì lỗi JWT không có field `status` hợp lệ), và `message: err.message` (vd chuỗi `"jwt expired"` từ thư viện `jsonwebtoken`) được trả THẲNG cho client.
- **Impact**: (1) Sai HTTP semantics — client nhận `500 Internal Server Error` cho 1 tình huống hoàn toàn bình thường/dự đoán được (refresh token hết hạn tự nhiên sau 7 ngày), thay vì `400`/`401` như các nhánh lỗi khác trong cùng hàm. Client khó phân biệt "lỗi server thật" với "cần đăng nhập lại". (2) Rò rỉ message lỗi thư viện ra ngoài (mức độ nhẹ vì `"jwt expired"` không nhạy cảm, nhưng vẫn là hành vi không kiểm soát — cùng lớp vấn đề với RV00-02).
- **Recommendation**: Bọc `jwt.verify(...)` trong try/catch, map lỗi sang `ApiError.badRequest("Refresh token không hợp lệ hoặc đã hết hạn")` (cùng message/status với nhánh `!storedToken` phía trên, tránh phân biệt được qua response). Đồng thời cân nhắc thêm filter `expiresAt: { $gt: new Date() }` vào query Mongo để nhất quán về mặt logic (dù `jwt.verify` cũng chặn được nhờ trùng thời hạn, filter DB tường minh giúp code dễ đọc/không phụ thuộc ngầm định 2 nguồn thời hạn phải luôn khớp nhau).
- **Confidence**: CONFIRMED (đọc trực tiếp code, đối chiếu logic `errorHandler` đã xác nhận ở REVIEW-00 — không cần chạy thử để kết luận luồng lỗi).

---

### RV01-02 — Refresh token lưu PLAINTEXT trong DB, không hash (khác `PasswordResetToken` đã hash SHA-256)
- **Severity**: MEDIUM-HIGH
- **Category**: Security (Data at Rest)
- **File**: `backend/src/services/auth/auths.service.ts` (`login()`), `backend/src/models/auth/refreshToken.model.ts`
- **Function/Class**: `login()` — `RefreshToken.create({..., token: refreshToken, ...})`
- **Observed Behavior**: `refreshToken` được lưu THẲNG (chuỗi JWT đã ký, dùng được ngay) vào field `token` của `RefreshToken` collection — không qua bất kỳ hàm hash nào. So sánh: `PasswordResetToken` (cùng module) hash token bằng SHA-256 (`hashResetToken()`) TRƯỚC khi lưu (`auths.service.ts:forgotPassword()`), chỉ lưu digest, không lưu token thô.
- **Evidence**: `login()` dòng ~190: `token: refreshToken` (biến này chính là kết quả `jwt.sign(...)` trả về trực tiếp từ `generateRefreshToken()`). `refreshToken.model.ts` field `token: { type: String, required: true }` — không có transform/hash nào ở tầng schema.
- **Impact**: Nếu `RefreshToken` collection bị lộ (backup MongoDB bị exfiltrate, injection đọc được dữ liệu, insider truy cập trực tiếp DB, hay bất kỳ kịch bản rò rỉ dữ liệu nào) — attacker có NGAY LẬP TỨC danh sách refresh token CÒN HIỆU LỰC, dùng được thẳng để gọi `/refresh-token` mà không cần crack/giải mã gì thêm (khác `PasswordResetToken`, nơi rò rỉ DB chỉ cho attacker các hash SHA-256, không dùng trực tiếp được — dù SHA-256 không phải thuật toán chống brute-force chuyên dụng, vẫn là 1 lớp cản trở, và token reset chỉ sống 15 phút so với refresh token sống 7 ngày, làm tăng đáng kể cửa sổ khai thác nếu rò rỉ).
- **Recommendation**: Hash `refreshToken` (SHA-256 là đủ, tái dùng `hashResetToken()` đã có sẵn cùng codebase) trước khi lưu vào DB; so sánh bằng hash khi `refresh()`/`logout()` query. Đây là thay đổi có ảnh hưởng tới toàn bộ session đang hoạt động (mọi refresh token cũ sẽ không khớp được với dữ liệu đã hash lại) — cần kế hoạch migration/rollout nếu triển khai (ngoài phạm vi review này, chỉ nêu finding).
- **Confidence**: CONFIRMED (code). Mức độ khai thác thực tế phụ thuộc kịch bản rò rỉ DB có xảy ra hay không — bản thân đây là 1 lớp phòng thủ "defense in depth", không phải lỗ hổng có thể khai thác trực tiếp từ bên ngoài nếu DB không bị lộ.

---

### RV01-03 — Không có refresh token rotation → không có cơ chế phát hiện refresh token bị đánh cắp và tái sử dụng (reuse detection)
- **Severity**: MEDIUM
- **Category**: Security (Session Management)
- **File**: `backend/src/services/auth/auths.service.ts`
- **Function/Class**: `refresh()`
- **Observed Behavior**: Mỗi lần gọi `/refresh-token` thành công, hàm chỉ sinh **access token mới**, KHÔNG sinh refresh token mới, KHÔNG revoke refresh token cũ, KHÔNG cập nhật bất kỳ trường nào trên `RefreshToken` document (vd `lastUsedAt`). Cùng 1 refresh token có thể dùng lặp lại KHÔNG GIỚI HẠN số lần cho tới khi hết hạn (7 ngày) hoặc bị revoke thủ công (logout/đổi mật khẩu/reset password/admin disable).
- **Evidence**: đọc toàn bộ `refresh()` — chỉ có 1 lệnh ghi liên quan là KHÔNG CÓ (hàm chỉ đọc `RefreshToken.findOne`, không có `save()`/`updateOne()`/`create()` nào cho `RefreshToken` bên trong hàm này).
- **Impact**: Nếu 1 refresh token bị đánh cắp (XSS, log rò rỉ, network intercept trước khi tới HTTPS, v.v.), kẻ tấn công VÀ user hợp pháp có thể dùng SONG SONG cùng 1 token trong suốt 7 ngày mà không có tín hiệu bất thường nào để hệ thống hoặc user phát hiện (pattern "refresh token rotation + reuse detection" theo khuyến nghị OWASP: mỗi lần refresh phải cấp token MỚI và revoke token cũ; nếu token cũ bị dùng lại sau đó — dấu hiệu rõ ràng của việc bị đánh cắp — toàn bộ chuỗi token của user phải bị revoke ngay). Hệ thống hiện tại hoàn toàn không có cơ chế này.
- **Recommendation**: Cân nhắc (a) rotation: mỗi lần `refresh()` thành công, tạo refresh token mới, revoke token cũ, trả token mới cho client; (b) reuse detection: nếu 1 token ĐÃ revoked bị dùng lại để gọi `/refresh-token`, coi đây là dấu hiệu bị đánh cắp, revoke TOÀN BỘ refresh token khác của user đó ngay lập tức. Đây là thay đổi kiến trúc/hành vi đáng kể (đổi luồng client phải lưu lại refresh token mới sau mỗi lần refresh) — cần task riêng nếu quyết định triển khai.
- **Confidence**: CONFIRMED (code). Liên hệ: `docs/07_AUTH_RBAC_ANALYSIS.md` §9.5 đã ghi nhận 1 khía cạnh liên quan ("refresh token bị đánh cắp sống sót qua self-change-password") — finding này (RV01-03) là phát biểu tổng quát hơn: vấn đề tồn tại với MỌI hành động, không riêng đổi mật khẩu, vì gốc rễ là thiếu rotation, không phải thiếu 1 điểm revoke cụ thể.

---

### RV01-04 — `RefreshToken` model thiếu index cho `token`, và không có TTL cleanup như `PasswordResetToken`
- **Severity**: LOW-MEDIUM
- **Category**: Performance / Data Hygiene
- **File**: `backend/src/models/auth/refreshToken.model.ts`
- **Function/Class**: N/A (schema-level)
- **Observed Behavior**: Schema chỉ có 4 field (`user`, `token`, `expiresAt`, `revoked`), KHÔNG khai báo bất kỳ `index()` nào ngoài `_id` mặc định — trong khi `token` là field được query bằng `findOne({token, ...})` ở CẢ `refresh()` VÀ `logout()` (2 endpoint gọi thường xuyên). So sánh: `passwordResetToken.model.ts` (cùng thư mục) có TTL index (`expireAfterSeconds:0` trên `expiresAt`, tự dọn document hết hạn) VÀ unique index trên `token` — `refreshToken.model.ts` không có cả hai.
- **Evidence**: đọc toàn bộ 27 dòng `refreshToken.model.ts` — không có dòng `.index(...)` nào.
- **Impact**: (1) Mỗi lần `refresh()`/`logout()` chạy, MongoDB phải collection-scan toàn bộ `RefreshToken` để tìm đúng `token` — chậm dần khi số lượng bản ghi tăng theo thời gian (mỗi lần login tạo 1 document mới, KHÔNG BAO GIỜ bị xoá tự động dù đã `revoked:true` hay đã hết hạn từ lâu). (2) Không có TTL cleanup → bảng phình to vô hạn theo thời gian vận hành thực tế (khác hẳn `PasswordResetToken` đã tự dọn sau khi hết hạn).
- **Recommendation**: Thêm `{ token: 1 }` (nên `unique: true` nếu đảm bảo không trùng — JWT ký khác nhau mỗi lần gần như chắc chắn không trùng), thêm `{ user: 1 }` (dùng bởi `resetPassword()`/`disable()`/`resetPassword by admin` ở module Users khi `updateMany({user}, {revoked:true})`), và cân nhắc TTL index trên `expiresAt` giống `PasswordResetToken` để tự dọn token hết hạn định kỳ (lưu ý: TTL index xoá HẲN document — nếu cần giữ lại lịch sử token đã revoke để audit, không nên dùng TTL, cần cron dọn riêng có logic giữ lại theo nhu cầu nghiệp vụ).
- **Confidence**: CONFIRMED (code — không tìm thấy index nào). Đây có thể trùng với 1 phát hiện đã có trong `docs/04_DATABASE_ANALYSIS.md` (Phase 04 ghi nhận "7/21 model không có index ngoài `_id`") — **CHƯA đối chiếu lại danh sách 7 model cụ thể đó ở review này** (ngoài phạm vi đọc lại toàn bộ Phase 04), nên có thể đây là 1 model đã nằm trong danh sách đó, không hẳn là phát hiện hoàn toàn mới — nêu rõ để tránh trùng lặp khi tổng hợp.

---

### RV01-05 — `POST /api/auths/register` cho phép user enumeration qua response 409 Conflict
- **Severity**: LOW
- **Category**: Security (User Enumeration) — không nhất quán với thiết kế chống enumeration ở `login()`/`forgotPassword()`
- **File**: `backend/src/services/auth/auths.service.ts`
- **Function/Class**: `register()`
- **Observed Behavior**: Check trùng `username`/`email` trả `ApiError.conflict("Username hoặc email đã được sử dụng")` NGAY LẬP TỨC nếu trùng — khác hẳn thời gian phản hồi/response của nhánh "không trùng" (tiếp tục xử lý tạo user, tốn thêm thời gian hash password + ghi DB + audit). Route `/register` là PUBLIC (chỉ có rate-limit, không cần auth).
- **Evidence**: `register()` dòng ~101-107; route `auth.routes.ts` dòng 36 — không có `authenticate`/`authorizePermission` nào, chỉ `authRateLimiter`.
- **Impact**: Attacker có thể dò xem 1 username/email cụ thể đã tồn tại trong hệ thống hay chưa bằng cách thử đăng ký và quan sát status code (409 vs 201) — không cần đăng nhập, không cần biết mật khẩu. Mức độ nghiêm trọng THẤP vì đây là hành vi rất phổ biến ở nhiều hệ thống đăng ký công khai (đánh đổi UX chấp nhận được — user cần biết ngay username đã bị lấy để chọn username khác), nhưng KHÔNG NHẤT QUÁN với triết lý chống-enumeration được áp dụng cẩn thận ở `login()`/`forgotPassword()` trong CÙNG file này.
- **Recommendation**: Đây là quyết định NGHIỆP VỤ (UX đăng ký vs bảo mật enumeration), không phải lỗi kỹ thuật thuần — chính comment trong `register()` (dòng 59-80) đã tự flag rằng toàn bộ thiết kế `register()` là "diễn giải hợp lý, cần xác nhận lại". Không tự ý đổi hành vi (CLAUDE.md §19 — business rule chưa rõ phải hỏi, không tự quyết). Ghi nhận để người vận hành cân nhắc nếu muốn nhất quán tuyệt đối.
- **Confidence**: CONFIRMED (code). Việc có coi đây là "vấn đề cần sửa" hay "chấp nhận được" là **UNKNOWN** — business decision.

---

### RV01-06 — Comment trong `auth.helper.ts` không khớp hành vi thực tế: JWT payload KHÔNG chỉ có `{id}`
- **Severity**: INFO
- **Category**: Documentation/Comment Accuracy (không phải bug runtime)
- **File**: `backend/src/shared/helpers/auth.helper.ts` (comment dòng 17-20), `backend/src/services/auth/auths.service.ts` (`login()`, `refresh()`)
- **Function/Class**: `generateAccessToken()`
- **Observed Behavior**: Comment khẳng định: *"Payload vẫn chỉ gồm `{ id }` — giữ đúng logic gốc của `login()`, role/department đã được cố tình bỏ khỏi token"*. Thực tế, CẢ `login()` LẪN `refresh()` đều gọi `generateAccessToken({ id, role: user.role, department: user.department })` — `role`/`department` (object đã populate, có `name`/`code`) được nhúng ĐẦY ĐỦ vào JWT payload, không hề bị bỏ.
- **Evidence**: `auth.helper.ts` dòng 17-20 (comment) vs `auths.service.ts` dòng 181-185 (`login()`) và dòng 267-271 (`refresh()`) — cả 2 đều truyền `role`/`department`.
- **Impact**: Không ảnh hưởng runtime (comment sai không làm sai hành vi chương trình) — nhưng gây hiểu nhầm cho người đọc/audit sau này, có thể dẫn tới quyết định sai (vd tưởng payload gọn nhẹ, không cân nhắc lại việc JWT bị phình to không cần thiết). Đây CHÍNH LÀ chi tiết kỹ thuật đứng sau finding "JWT payload dư thừa" đã ghi nhận ở Phase 07 tóm tắt (`00_PROJECT_MEMORY.md` dòng 73: "JWT payload dư thừa") — review này xác nhận cụ thể vị trí code + mức độ sai lệch giữa comment và hành vi thật.
- **Recommendation**: Cập nhật lại comment cho khớp thực tế, hoặc (nếu ý định thật sự là gọn payload) bỏ `role`/`department` khỏi lệnh gọi ở `login()`/`refresh()` — vì `authenticate` middleware ĐÃ xác nhận KHÔNG đọc `role`/`department` từ token (luôn load lại tươi từ DB), nên 2 field này trong JWT hiện là dữ liệu thừa hoàn toàn, chỉ tăng kích thước token mà không phục vụ mục đích gì ở phía server (client có thể đọc được qua decode JWT — không mã hoá — nhưng client cũng nhận đủ thông tin này qua field `user` trong response, không phải thông tin mới bị lộ thêm).
- **Confidence**: CONFIRMED (đọc trực tiếp cả 2 phía, không suy diễn).

---

## 4. Đặc biệt: kết luận riêng cho 3 yêu cầu trọng tâm của review này

### Refresh token reuse
**Không có bảo vệ.** Xem RV01-03 — không rotation, không reuse detection. Một token bị lộ có thể dùng song song vô thời hạn (tới khi hết 7 ngày hoặc bị revoke thủ công).

### Refresh token invalidation
**Có, nhưng KHÔNG đầy đủ theo mọi tình huống**:
- CONFIRMED hoạt động: `logout()` (chỉ token của chính mình), `resetPassword()` (thu hồi TOÀN BỘ refresh token của user), `resetPassword` do Admin và `disable()` (module Users, đã xác nhận ở TASK-001 review trước) đều `updateMany({user}, {revoked:true})`.
- **GAP đã biết (Phase 07 §9.5, không phải phát hiện mới)**: `changePassword()` (tự đổi mật khẩu, module Users) **KHÔNG** revoke refresh token nào — khác 3 luồng đổi mật khẩu còn lại. Nhắc lại ở đây vì nằm đúng trong phạm vi "refresh token invalidation" được yêu cầu kiểm tra đặc biệt, dù đã có ID từ Phase 07.
- **Thiếu index/TTL** cho việc dọn token đã revoke/hết hạn — xem RV01-04 (không phải lỗi logic invalidation, nhưng ảnh hưởng tới việc "token đã invalidate" có tồn đọng mãi trong DB hay không).

### Password reset token lifecycle
**Thiết kế TỐT, không phát hiện vấn đề mới**:
- Token thô (32 bytes random, `crypto.randomBytes`) — không đoán được.
- Chỉ lưu HASH (SHA-256) trong DB, không lưu token thô — khác hẳn refresh token (xem RV01-02, đối lập rõ rệt).
- Single-use (`used:false` filter, set `true` sau khi dùng).
- TTL 15 phút, có TTL index tự dọn ở tầng DB (`expireAfterSeconds:0`).
- `deleteMany({user})` trước khi tạo token mới → đảm bảo tại 1 thời điểm chỉ có tối đa 1 token hợp lệ cho 1 user, giảm bề mặt tấn công.
- Rate limit riêng theo user (3 lần/15 phút, DB-based) + rate limit theo IP (qua prefix `/api/auths`).
- Reset thành công → revoke TOÀN BỘ refresh token hiện có → buộc đăng nhập lại mọi thiết bị (đúng khuyến nghị bảo mật chuẩn).

---

## 5. Không phát hiện vấn đề (đã kiểm tra, không có gì bất thường)

- **Password hashing**: `bcrypt` cost 10 nhất quán ở `register()`/`login() (compare)`/`resetPassword()` — không phát hiện cost thấp bất thường hay thuật toán yếu.
- **JWT algorithm**: cả access token và refresh token đều whitelist `HS256` tường minh ở MỌI nơi `sign`/`verify` (4 vị trí: `generateAccessToken`, `generateRefreshToken`, `authenticate`, `refresh()`'s `jwt.verify`) — không có algorithm confusion.
- **Secret tách biệt**: `JWT_SECRET` (access) và `JWT_REFRESH_SECRET` (refresh) là 2 biến môi trường KHÁC NHAU — đúng thực hành tốt (không dùng chung 1 secret cho 2 loại token).
- **Cookie security**: N/A — module Auth KHÔNG dùng cookie để lưu token (access/refresh token trả trong JSON body, `cookieParser()` toàn cục ở `app.ts` không được `auths.service.ts`/`auth.controller.ts` dùng tới). Không có vấn đề `httpOnly`/`secure`/`sameSite` cần xem xét trong phạm vi module này.
- **Logout**: đã sửa đúng (theo comment trong chính source) — chỉ revoke token của chính user gọi, không cho phép revoke hộ token của user khác.
- **User enumeration ở `login()`/`forgotPassword()`**: xử lý cẩn thận, đúng kỹ thuật (dummy compare/dummy query cân bằng thời gian, message/response giống hệt giữa 2 nhánh) — không phát hiện lỗ hổng.

---

## 6. Cross-reference với REVIEW-00 (không lặp lại chi tiết)

- RV00-02 (`errorHandler` lộ `err.message` cho lỗi 500 không xác định) — **áp dụng trực tiếp** cho RV01-01 ở trên (đây chính là 1 trường hợp cụ thể kích hoạt RV00-02).
- RV00-04 (2 rate-limiter trùng cấu hình cho `/api/auths`) — xác nhận lại đúng nguyên trạng ở `auth.routes.ts` (route `/login`, `/refresh-token`, `/register` đều bị áp CẢ 2 limiter).
- RV00-05 (`JWT_SECRET` không fail-fast) — áp dụng luôn cho `JWT_REFRESH_SECRET` (cũng không được validate ở `server.ts`, dùng trực tiếp `process.env.JWT_REFRESH_SECRET as string` ở `refresh()` — ép kiểu `as string` che giấu khả năng `undefined`).

---

## 7. Tổng hợp theo severity

| Severity | Số lượng | ID |
|---|---|---|
| HIGH | 1 | RV01-01 |
| MEDIUM-HIGH | 1 | RV01-02 |
| MEDIUM | 1 | RV01-03 |
| LOW-MEDIUM | 1 | RV01-04 |
| LOW | 1 | RV01-05 |
| INFO | 1 | RV01-06 |

**0 CRITICAL mới.** (Các CRITICAL đã biết trong hệ thống — ISS-01/02/03/09 — không thuộc phạm vi Auth module.)

---

## 8. Unknowns cần xác minh thêm

- RV01-04: cần đối chiếu lại danh sách "7/21 model không có index" ở `docs/04_DATABASE_ANALYSIS.md` xem `RefreshToken` đã được liệt kê chưa, tránh trùng ID khi tổng hợp vào `CODE_REVIEW_SUMMARY.md`.
- RV01-05: chủ đích nghiệp vụ thật của `register()` (public hay nên giới hạn) vẫn UNKNOWN — chính source code tự flag câu hỏi này, không phải review này đặt ra mới.
- Mức độ nghiêm trọng thực tế của RV01-02/RV01-03 phụ thuộc threat model thực tế (có bị khai thác chưa) — UNKNOWN, ngoài phạm vi static analysis.

---

**REVIEW-01 COMPLETED. Không thực hiện review module khác.**

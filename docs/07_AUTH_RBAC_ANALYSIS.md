# 07 — AUTHENTICATION & RBAC ANALYSIS

> Phase: 07 — Authentication & RBAC Analysis
> Phạm vi: Authentication (login/logout/register/password/token) + Authorization (RBAC + ABAC) end-to-end. Không phân tích Business Logic ngoài phạm vi auth (Phase 08), không đánh giá security toàn hệ thống theo mức độ (Phase 09 — ở đây chỉ nêu finding trong phạm vi auth/RBAC).
> Nguồn: re-clone tại thời điểm Phase 07 — commit `f4ce8e9083e16c01177f53a3871b66cfde4133b8` ("update", 2026-08-24 13:53:38 +0700) — **khớp chính xác** với commit đã ghi nhận Phase 01–06, không có thay đổi.
> Quy ước: **CONFIRMED** = evidence trực tiếp trong source. **INFERRED** = suy luận hợp lý, chưa đọc trực tiếp dòng code. **UNKNOWN** = chưa đủ evidence.

---

## 1. Authentication Architecture (tổng quan)

- Cơ chế: JWT stateless, KHÔNG dùng session server-side, KHÔNG dùng cookie cho token (CONFIRMED — xem mục 3.5).
- 2 loại token: **access token** (JWT, `JWT_SECRET`, 8 giờ) và **refresh token** (JWT, `JWT_REFRESH_SECRET`, 7 ngày, lưu bản ghi trong DB để có thể revoke).
- Password: `bcrypt`, cost factor **10**, dùng nhất quán ở mọi nơi hash password (register, change password, reset password — CONFIRMED, đếm đủ 5 lệnh `bcrypt.hash(..., 10)`).
- Không có OAuth/SSO/MFA/2FA — chỉ username + password.
- Không có frontend trong repo (Phase 06) — mọi phân tích "storage phía client" trong tài liệu này là N/A, chỉ phân tích những gì API trả về.

---

## 2. Login Flow (chi tiết, đọc trực tiếp `auths.service.ts:login`)

```
[Client] POST /api/auths/login {username, password}
  → app.ts: authLimiter (20 req/15p, theo prefix /api/auths)
  → auth.routes.ts: authRateLimiter (20 req/15p, riêng route — 2 limiter độc lập, đã ghi Phase 03)
  → validateBody(LoginDTO)  [password: z.string().min(5)]
  → auth.controller.ts:login → auths.service.ts:login(username, password)
    1. User.findOne({username}).select("+password").populate("role","name").populate("department","code name")
    2. Nếu !user || !user.isActive:
       → bcrypt.compare(password, DUMMY_PASSWORD_HASH)  [hash cố định, KHÔNG phải hash thật nào]
       → throw 401 "Tên đăng nhập hoặc mật khẩu không đúng"
    3. Nếu user tồn tại: bcrypt.compare(password, user.password thật)
       → sai → throw 401 CÙNG message như bước 2 (chống account enumeration)
    4. generateAccessToken({id, role, department})  → JWT ký HS256, exp 8h
    5. generateRefreshToken(id)                       → JWT ký HS256, exp 7d
    6. RefreshToken.create({user, token, expiresAt: +7 ngày tính bằng code})
    7. UserAudit.create({action:"LOGIN"})
  → res.json({message, data:{accessToken, refreshToken, user}})   [KHÔNG có field "success" — Phase 03/05]
[Client] nhận JSON, tự lưu token (N/A — không có frontend để xác nhận lưu ở đâu)
```

**CONFIRMED — cơ chế chống enumeration/timing attack**: nhánh "user không tồn tại/inactive" luôn chạy `bcrypt.compare` với `DUMMY_PASSWORD_HASH` cố định trước khi throw, để thời gian phản hồi gần bằng nhánh "sai mật khẩu thật" — cả 2 nhánh trả **cùng message, cùng status 401**.

---

## 3. Token Flow

### 3.1 Access Token — CONFIRMED, phát hiện MỚI về payload

`shared/helpers/auth.helper.ts:generateAccessToken(payload)` ký (`jwt.sign`) **toàn bộ object `payload` được truyền vào**, không giới hạn field. Comment ngay trong file khẳng định: *"Payload vẫn chỉ gồm `{ id }` — giữ đúng logic gốc của `login()`, role/department đã được cố tình bỏ khỏi token"*.

**Đối chiếu thực tế (CONFIRMED SAI LỆCH giữa comment và code)**: cả `login()` (dòng gọi `generateAccessToken`) và `refresh()` đều gọi hàm này với:
```js
generateAccessToken({ id: user._id.toString(), role: user.role, department: user.department })
```
— `role` (object đã populate `{_id, name}`) và `department` (object đã populate `{_id, code, name}`) **THỰC SỰ được đưa vào JWT payload**, trái với khẳng định trong comment. Vì JWT chỉ ký (sign) chứ không mã hoá (encrypt) phần payload, bất kỳ ai có access token đều có thể `base64-decode` để đọc được role name + department mà không cần gọi API — không phải lỗ hổng nghiêm trọng (dữ liệu này vốn user đã biết về chính mình), nhưng là **thông tin dư thừa lộ ra trong token, đi ngược chủ đích thiết kế đã ghi trong chính comment của code**.

**Hệ quả thực tế đã xác minh**: `authenticate` middleware **KHÔNG đọc `decoded.role`/`decoded.department`** — chỉ dùng `decoded.id` để load lại `User` từ DB mỗi request (mục 4.1). Vì vậy role/department nhúng trong token **không được tin dùng cho authorization** — chỉ là dữ liệu "chết" nằm trong token, không ảnh hưởng tới tính đúng đắn của RBAC runtime, nhưng nếu 1 Role bị đổi tên/đổi quyền, access token cũ (còn hạn tối đa 8h) vẫn chứa role name/department CŨ — không gây rủi ro bảo mật (vì không được dùng để authorize) nhưng có thể gây nhầm lẫn nếu 1 client nào đó (ngoài phạm vi repo) tự ý decode token để hiển thị UI.

### 3.2 Refresh Token

- Lưu bản ghi trong `RefreshToken` collection (`user`, `token`, `expiresAt`, `revoked`).
- `refresh()`: query `{token, revoked:false}`, verify chữ ký JWT (`JWT_REFRESH_SECRET`, whitelist HS256), check `user.isActive`, sinh access token mới. **KHÔNG rotate** — refresh token cũ tiếp tục dùng được tới khi hết hạn/bị revoke (CONFIRMED, không có `RefreshToken.create` nào trong `refresh()`).
- **Model `RefreshToken` KHÔNG có index trên `token`** (Phase 04 §4.3/9.1) — mọi lần gọi `/refresh-token`/`/logout` là collection scan; token hết hạn/revoked cũng không tự dọn (không có TTL index, khác `PasswordResetToken`).

### 3.3 Token Expiration & Revocation — tổng hợp theo hành động

| Hành động | Access token cũ | Refresh token cũ |
|---|---|---|
| `logout()` | Vẫn hợp lệ tới khi hết hạn (8h) — JWT stateless, không có blacklist access token | Revoke ĐÚNG 1 token được truyền lên, chỉ nếu thuộc về chính user gọi (`{token, user:userId}`) |
| `resetPassword()` (quên mật khẩu, qua email) | Vẫn hợp lệ tới khi hết hạn (8h) | Revoke **TOÀN BỘ** refresh token của user (`updateMany({user}, {revoked:true})`) |
| `resetPasswordByAdmin()` (admin đặt lại cho user khác) | Vẫn hợp lệ tới khi hết hạn (8h) | Revoke **TOÀN BỘ** refresh token của user (CONFIRMED, đọc trực tiếp — cùng cơ chế `resetPassword` quên mật khẩu) |
| `changePassword()` (tự đổi, biết mật khẩu cũ) | Vẫn hợp lệ | **KHÔNG revoke bất kỳ refresh token nào** — CONFIRMED, đọc trực tiếp `users.service.ts:changePassword`, không có lệnh `RefreshToken.updateMany`/`deleteMany` nào |
| `disableUser()` (admin vô hiệu hoá user) | Vẫn hợp lệ về mặt chữ ký JWT, NHƯNG mọi request tiếp theo bị chặn ở `authenticate` (check `user.isActive`) → hiệu lực ngay | Revoke toàn bộ (theo mô tả Phase 03, đối chiếu tên hàm `disable` — đã đọc mục đích ở Phase 03 §6.1, không lặp code) |

**CONFIRMED — bất đối xứng bảo mật cụ thể**: `changePassword()` (tự đổi mật khẩu, kịch bản phổ biến nhất khi user nghi ngờ bị lộ mật khẩu) là hành động **DUY NHẤT trong 4 luồng đổi mật khẩu không thu hồi refresh token nào khác**. Nếu 1 kẻ tấn công đã có sẵn 1 refresh token hợp lệ của nạn nhân (vd đánh cắp trước đó), nạn nhân tự đổi mật khẩu qua `changePassword` sẽ **KHÔNG** đẩy kẻ tấn công ra khỏi phiên — refresh token đánh cắp vẫn dùng được tới khi hết hạn tự nhiên (7 ngày) hoặc bị `logout`/`resetPassword`/admin can thiệp.

### 3.4 Session — không có session server-side
Không có `express-session`, không lưu session state trên server ngoài `RefreshToken` collection (chỉ dùng để revoke, không phải session data). Mỗi request tự chứng thực qua JWT — đúng mô hình stateless JWT chuẩn.

### 3.5 Cookie/localStorage/sessionStorage

**CONFIRMED (grep toàn bộ `backend/src`)**: `cookieParser()` được đăng ký toàn cục trong `app.ts` (middleware #6, theo Phase 03) nhưng **KHÔNG có bất kỳ `req.cookies` hay `res.cookie(...)` nào được gọi ở bất kỳ đâu trong toàn bộ source backend**. Nghĩa là:
- Token KHÔNG BAO GIỜ được set qua cookie (không có `httpOnly` cookie nào) — token chỉ trả về trong JSON body (`data.accessToken`, `data.refreshToken`).
- `cookieParser()` là middleware "wired nhưng không dùng" — tương tự các dead code khác đã ghi nhận (Phase 03).
- Việc lưu trữ token phía client (`localStorage`/`sessionStorage`/memory) là **N/A** — không có source code frontend trong repo để xác nhận (Phase 06).

---

## 4. Request Authentication (middleware `authenticate`)

**File**: `backend/src/middlewares/auth.middleware.ts` — đọc toàn bộ file (79 dòng).

```
Request có header Authorization: Bearer <token>
  → tách token (split " "[1]) — nếu thiếu → 401 "Chưa đăng nhập"
  → jwt.verify(token, JWT_SECRET, {algorithms:["HS256"]})  — whitelist thuật toán tường minh
  → validate decoded.id là Types.ObjectId hợp lệ (Types.ObjectId.isValid) — nếu không → 401 "Token không hợp lệ"
  → User.findById(decoded.id).select("_id role department isActive").populate("role","name")
    — CHỈ load field cần thiết, KHÔNG load permission ở bước này
  → nếu !user || !user.isActive → 401 "User không hợp lệ"
  → req.user = {_id, role, department, isActive, permissions:[]}   [permissions để rỗng, xử lý ở authorizePermission]
  → next()
  [catch]: console.error log lỗi GỐC ở server, nhưng CHỈ trả 1 message chung "Token không hợp lệ" ra client
           (không phân biệt lỗi hết hạn / sai chữ ký / lỗi hạ tầng DB ra ngoài — chống thông tin rò rỉ)
```

**Điểm kiến trúc quan trọng (CONFIRMED)**: `authenticate` load lại `User` từ DB **MỖI REQUEST** (không cache) — nghĩa là `isActive` và `role` LUÔN LÀ DỮ LIỆU MỚI NHẤT tại thời điểm request, không bị ảnh hưởng bởi độ trễ cache 5 phút của permission cache (mục 5.4). Vô hiệu hoá user (`isActive:false`) có hiệu lực **NGAY LẬP TỨC** ở request kế tiếp, không cần đợi token hết hạn hay cache hết hạn.

---

## 5. Authorization Architecture (RBAC + ABAC)

### 5.1 Mô hình dữ liệu

```
User --role--> Role --permissions[]--> Permission
User --extraPermissions[]--> Permission   (cộng thêm, override dương)
User --denyPermissions[]-->  Permission   (chặn, override âm, ưu tiên cao nhất)

Policy (ABAC) — độc lập, không gắn trực tiếp với User/Role — match runtime theo {resource, action}
```

Công thức hiệu lực (CONFIRMED, `permission.service.ts:getUserEffectivePermissions`):
```
finalPermissions = ( role.permissions ∪ user.extraPermissions ) − user.denyPermissions
```
`denyPermissions` luôn thắng `extraPermissions` nếu trùng permission (loại bỏ sau khi hợp nhất).

### 5.2 `authenticate` → `authorizePermission` — 2 middleware nối tiếp

```
authorizePermission(permissions, options?) chạy sau authenticate:
  1. !req.user → 401
  2. req.user.role?.name === "ADMIN" → BYPASS TOÀN BỘ, ghi audit best-effort ("ADMIN bypass...", action tái dùng "AUDIT_DASHBOARD_VIEW" — KHÔNG có action riêng "ADMIN_BYPASS" dù userAudit.model.ts liệt kê action này trong enum, xem mục 7.5) → next()
  3. getCachedPermissions(userId) → so khớp requiredPermissions (mode some/every theo options.requireAll)
  4. Pass RBAC → next()
  5. Fail RBAC, NẾU options.enablePolicies && options.resource && options.action:
     → Policy.find({resource, action}) → evaluatePolicyConditionSafely(condition, {user, resource:req.resource})
     → policy nào pass → next()
  6. Không gì pass → 403 "Không có quyền truy cập"
```

### 5.3 ABAC (Policy) — CONFIRMED: HOÀN TOÀN KHÔNG THỂ KÍCH HOẠT Ở RUNTIME (phát hiện MỚI, quan trọng nhất Phase 07)

Đọc trực tiếp toàn bộ 15 route file (103 lệnh gọi `authorizePermission(...)` — khớp Phase 05):

**KHÔNG CÓ BẤT KỲ route nào truyền tham số `options` thứ 2** (`enablePolicies`/`resource`/`action`) cho `authorizePermission()` — toàn bộ 103 lệnh gọi chỉ truyền 1 tham số (chuỗi hoặc mảng permission). Do điều kiện ở bước 5 (`options?.enablePolicies && options.resource && options.action`) yêu cầu CẢ 3 điều kiện, và không route nào cung cấp dù chỉ 1 trong 3 — **nhánh ABAC (bước 5 ở mục 5.2) không bao giờ được thực thi trong toàn bộ hệ thống hiện tại**.

Bổ sung củng cố phát hiện này:
- `middlewares/loadDocument.middleware.ts` — middleware DUY NHẤT trong codebase gán `req.resource` (dòng 47: `req.resource = document`) — đã xác nhận ở Phase 03 là **KHÔNG được gắn vào bất kỳ route nào**. Vì vậy dù giả sử có 1 route nào đó lỡ bật `enablePolicies`, `req.resource` cũng sẽ luôn là `undefined` (điều kiện `options.resource` ở đây là tên resource string cấu hình sẵn ở route, khác với `req.resource` — biến resource DATA để evaluator dùng trong `condition`, ví dụ `resource.department`) — nghĩa là ABAC dù được bật cũng không có dữ liệu resource thật để đánh giá `condition` có tham chiếu `resource.*`.
- Toàn bộ CRUD API cho `Policy` (`/api/rbac/policies*`, 5 endpoint, permission `POLICY_*`) vẫn **hoạt động bình thường** (tạo/sửa/xoá Policy vào DB thành công) — nghĩa là admin vẫn có thể tạo Policy tưởng rằng nó có tác dụng, nhưng **không Policy nào từng được evaluate trong thực tế** vì không route nghiệp vụ nào kích hoạt nhánh ABAC.

**Kết luận (CONFIRMED)**: hệ thống RBAC + ABAC theo README/thiết kế thực chất **chỉ có RBAC hoạt động**; toàn bộ tầng ABAC (Policy model, `Policycondition.evaluator.ts` — 319 dòng parser/tokenizer/evaluator tự viết chống RCE, RBAC CRUD cho Policy) là **infrastructure hoàn chỉnh nhưng chết hoàn toàn (fully dead) ở runtime** — mức độ dead code lớn nhất phát hiện được trong toàn bộ quá trình phân tích từ Phase 01 tới nay (khác các dead code nhỏ lẻ như 1 hàm hay 1 middleware — đây là cả 1 tầng kiến trúc được quảng cáo trong README nhưng không có đường vào thực thi nào).

### 5.4 Permission Cache — độ trễ & invalidation (xác nhận lại + mở rộng Phase 02/03)

- `Map<userId, {permissions, cachedAt}>`, TTL 5 phút, per-process (không chia sẻ giữa các instance nếu multi-instance — đã ghi Phase 02).
- **CONFIRMED — 2 điểm invalidate**:
  - `clearPermissionCache(userId)` — gọi tại `services/rbac/rbac.service.ts` khi Role bị sửa/xoá permissions (qua `clearPermissionCacheForRole`, dò `User.find({role:id})` rồi clear từng user) — VÀ tại `services/users/users.service.ts:assignRole()` (dòng 493) khi đổi role trực tiếp cho 1 user.
  - `clearAllPermissionCache()` — khi 1 Permission bất kỳ bị sửa/xoá (xoá sạch toàn bộ cache, chấp nhận đánh đổi hiệu năng ngắn hạn để tránh dò ngược mọi Role/User bị ảnh hưởng).
- **PHÁT HIỆN MỚI — gap invalidation cụ thể**: hàm `assignRole()` (dòng 454, `users.service.ts`) — hàm DUY NHẤT có gọi `clearPermissionCache` khi đổi role — **KHÔNG được gắn vào bất kỳ route/controller nào** (`grep` xác nhận: chỉ có `updateUser`/`update()` được import vào `user.controller.ts`, `assignRole` không xuất hiện ở `controllers/`). Xem mục 6 để phân tích tiếp hệ quả.

---

## 6. RBAC Structure

### 6.1 Nguồn permission — 2 lớp KHÔNG tự động đồng bộ (CONFIRMED, phát hiện MỚI)

1. **`shared/constants/permission.constant.ts`** (135 dòng) — hằng số TypeScript liệt kê TÊN permission dùng để viết route (`authorizePermission("DOCUMENT_VIEW")`). Đây chỉ là **string constant ở tầng code**, không tự động tạo bản ghi trong DB.
2. **`Permission` collection (MongoDB)** — bản ghi THẬT được dùng để authorize (qua `Role.permissions` populate). Phải được tạo thủ công qua API `POST /api/rbac/permissions` (hoặc qua 1 script seed).

**CONFIRMED — không có cầu nối tự động giữa 2 lớp này**: `shared/constants/rolePermission.map.ts` (`ROLE_PERMISSIONS`, 223 dòng) được viết với chủ đích rõ ràng (comment trong chính file) là dữ liệu cấu hình để **"`scripts/seed-rbac.ts` đọc trực tiếp để ghi dữ liệu THẬT vào DB"** — nhưng:
- `grep` toàn bộ repo xác nhận **`ROLE_PERMISSIONS` KHÔNG được import ở bất kỳ file nào khác** (kể cả trong `scripts/`).
- File `backend/scripts/seed-rbac.ts` **KHÔNG TỒN TẠI** trong repo (đã ghi nhận từ Phase 01: `scripts/` chỉ có `ma-chay-script.ts`, `seed-assets.ts`, `seed-assignment-history.ts`).

→ **Kết luận (CONFIRMED, mở rộng phát hiện Phase 01 về `npm run seed:rbac` bị thiếu)**: `ROLE_PERMISSIONS` là cấu hình RBAC "trên giấy" mô tả rất chi tiết ý đồ phân quyền cho 6 role (`ADMIN`, `IT`, `USER`, `TRUONG_KHOA`, `DIEU_DUONG_TRUONG`, `BAN_GIAM_DOC`, `PHONG_VAT_TU_TTB`) nhưng **KHÔNG BAO GIỜ được thực thi** — dữ liệu Role/Permission thật trong DB (nếu có) phải được tạo hoàn toàn thủ công qua RBAC API, độc lập với file này. Có nguy cơ RBAC thực tế trong DB **lệch khỏi** thiết kế mô tả trong `rolePermission.map.ts` mà không ai biết, vì không có cơ chế đối chiếu tự động.

### 6.2 RBAC Matrix — theo thiết kế "trên giấy" (`ROLE_PERMISSIONS`, CHƯA XÁC NHẬN khớp DB thật)

> ⚠️ Bảng dưới đây phản ánh **Ý ĐỒ THIẾT KẾ** ghi trong `rolePermission.map.ts` — KHÔNG suy diễn rằng đây là dữ liệu Role/Permission thật đang có trong MongoDB (mục 6.1 đã xác nhận không có cơ chế nào đảm bảo điều đó). Trạng thái Role/Permission thật trong DB là **UNKNOWN** (ngoài phạm vi source-code-only, cần truy vấn DB thật để xác nhận).

| Role | Nhóm quyền chính (coarse-grained, theo thiết kế) |
|---|---|
| `ADMIN` | Toàn bộ `PERMISSIONS` + `SYSTEM_ADMIN` — nhưng thực tế ADMIN **bypass hoàn toàn** `authorizePermission` qua so khớp `role.name === "ADMIN"` (mục 5.2), nên danh sách permission gán cho ADMIN trong map này **không có tác dụng thực tế dù DB có khớp hay không** |
| `IT` | Document (CRUD, không Delete-permanent), Department (đầy đủ), Asset/Medical Device (CRUD, không permanent-delete), Workflow (submit/approve/reject/view/cancel/complete, không tạo Template), Excel (đầy đủ), Dashboard |
| `USER` | Document (CRUD giới hạn, không Delete... thực ra CÓ `DOCUMENT_DELETE` theo map — xem lưu ý), Asset (chỉ view + inventory check), Medical Device (chỉ view), Workflow (submit/view/cancel/complete — KHÔNG approve/reject) |
| `TRUONG_KHOA` | View Document/Asset/Medical Device, Workflow (view/approve/reject), Dashboard |
| `DIEU_DUONG_TRUONG` | Giống hệt `TRUONG_KHOA` (role riêng chỉ để phân biệt trong audit/dashboard, không khác quyền) |
| `BAN_GIAM_DOC` | Giống `TRUONG_KHOA` + thêm `AUDIT_VIEW`, `AUDIT_VIEW_DASHBOARD` (bước duyệt cuối, thẩm quyền cao nhất trừ ADMIN) |
| `PHONG_VAT_TU_TTB` | Tương đương `IT` cho phần Asset/Medical Device (thêm `ASSET_DISPOSE`), cộng thêm tham gia Workflow approve/reject — KHÔNG có quyền Document/Department |

**Lưu ý riêng (CONFIRMED từ chính source, không suy diễn)**: comment trong `rolePermission.map.ts` tại nhóm `USER` tự ghi rằng đã **XOÁ** `ROLE_CREATE` khỏi danh sách quyền USER vì đó là "lỗi cấu hình nghiêm trọng" từng tồn tại trước đó — cho thấy nhóm phát triển đã từng phát hiện và tự sửa 1 lỗ hổng leo thang quyền tương tự trong chính file cấu hình "trên giấy" này (dù file chưa từng chạy thật).

### 6.3 Permission ↔ Route mapping

Đã có đầy đủ ở `05_API_ANALYSIS.md` §2 (116 endpoint, cột Auth) — không lặp lại toàn bộ ở đây. Điểm bổ sung liên quan RBAC (CONFIRMED, đọc trực tiếp `permission.constant.ts`):
- Comment trong `permission.constant.ts` tự xác nhận: 4 permission `POLICY_VIEW/CREATE/UPDATE/DELETE` từng **CHƯA tồn tại** trong constant dù route `rbac.routes.ts` đã dùng — đã được thêm bổ sung để khớp tên đã dùng trong route (nếu không, mọi request không phải ADMIN gọi 5 endpoint `/api/rbac/policies*` sẽ luôn 403 vì permission string không khớp bất kỳ Permission nào tồn tại được).
- Tương tự, `DOCUMENT_EXCEL_EXPORT/TEMPLATE/IMPORT` và 4 permission Upload (`UPLOAD_FILES`, `VIEW_FILES`, `VIEW_FILE_DETAIL`, `DELETE_FILE`) cũng được xác nhận tồn tại đầy đủ trong file này (khớp lại phát hiện Phase 05 §9.1 rằng comment trong `openAPI.yaml` báo các permission Upload "chưa tồn tại" là lỗi thời).

---

## 7. Frontend Authorization

**N/A — không có frontend trong repo** (Phase 06). Không có `PermissionGuard`, route guard, hay bất kỳ logic ẩn/hiện UI theo quyền nào để phân tích. Toàn bộ authorization thực thi **CHỈ ở backend**.

---

## 8. Backend Authorization — tổng hợp mức triển khai

| Cơ chế | Trạng thái | Evidence |
|---|---|---|
| Authentication (JWT) | HOẠT ĐỘNG ĐẦY ĐỦ | Mục 4 |
| RBAC (Role → Permission, + extra/deny override) | HOẠT ĐỘNG ĐẦY ĐỦ | Mục 5.1, 5.2 |
| ADMIN bypass | HOẠT ĐỘNG (dựa string-match `role.name==="ADMIN"`, có audit) | Mục 5.2 |
| Permission cache (hiệu năng) | HOẠT ĐỘNG, có độ trễ tối đa 5 phút khi Role/Permission đổi qua RBAC API | Mục 5.4 |
| Permission cache invalidation khi đổi role qua `PUT /api/users/:id` | **KHÔNG HOẠT ĐỘNG** (mục 9.2) | Mục 6.1, 9.2 |
| ABAC (Policy) | **KHÔNG THỂ KÍCH HOẠT** — dead ở runtime | Mục 5.3 |
| Resource-level authorization (IDOR protection qua ABAC) | **KHÔNG TỒN TẠI THỰC TẾ** (thiết kế có, nhưng không route nào dùng) | Mục 5.3 |

---

## 9. End-to-End Authorization — Security Findings

> Phân loại: **CONFIRMED ISSUE** (có evidence trực tiếp, chắc chắn xảy ra theo code hiện tại) vs **POTENTIAL RISK** (rủi ro cấu trúc, phụ thuộc dữ liệu/thời điểm cụ thể, chưa chắc luôn xảy ra).

### 9.1 CONFIRMED ISSUE — `POST /api/documents/proposal` thiếu authorization
Đã ghi nhận Phase 03/05, xác nhận lại trong phạm vi Phase 07: route này chỉ có `authenticate`, `authorizePermission("DOCUMENT_CREATE")` bị comment — bất kỳ user đã login nào (kể cả role không có quyền tạo Document trong thiết kế RBAC) đều tạo được Document.

### 9.2 ✅ RESOLVED (2026-08-30, xem `docs/tasks/TASK-001.md`) — Privilege escalation qua `PUT /api/users/:id`

Endpoint `PUT /api/users/:id` (permission `USER_UPDATE`) gọi `users.service.ts:update()`, hàm này:
```js
let role: any;
if (roleId !== undefined) {
  role = await Role.findById(roleId);
  if (!role) throw ApiError.notFound("Role không tồn tại");
}
// ... không có check nào chặn role.name === "ADMIN" ...
if (role !== undefined) user.role = role._id;
await user.save();
// KHÔNG gọi clearPermissionCache() ở đây
```

So sánh với hàm `assignRole()` (cùng file, dòng 454) — hàm **CÓ** chặn rõ ràng:
```js
if (role.name === "ADMIN") {
  throw ApiError.badRequest("Không thể gán role ADMIN");
}
// ...
clearPermissionCache(user._id.toString());
```

**Nhưng `assignRole()` KHÔNG được gắn vào bất kỳ route nào** (`grep controllers/` xác nhận không có import) — đây là **dead code, không phải endpoint đang chạy**. Endpoint THẬT sự đang public (`PUT /api/users/:id` → `update()`) **KHÔNG có safeguard tương đương**.

**Hệ quả (TRƯỚC FIX)**: bất kỳ user nào có permission `USER_UPDATE` (theo thiết kế "trên giấy" mục 6.2, đây là quyền coarse-grained không rõ role nào được cấp — cần xác minh dữ liệu Role/Permission thật trong DB, UNKNOWN) có thể gọi `PUT /api/users/:id` với `role: <ADMIN_role_id>` để **thăng cấp bất kỳ user nào (kể cả chính mình) lên ADMIN** — bypass hoàn toàn permission check ở mọi endpoint khác sau đó (do ADMIN bypass string-match, mục 5.2). Đây là con đường **leo thang đặc quyền (privilege escalation) tiềm năng nghiêm trọng nhất** tìm được trong toàn bộ RBAC. Mức độ khai thác thực tế phụ thuộc việc `USER_UPDATE` được gán cho role nào trong DB thật (UNKNOWN — không xác minh được từ source code, chỉ xác nhận được lỗ hổng ở tầng code).

**Fix (2026-08-30)**: `update()` giờ chặn tuyệt đối `role.name === "ADMIN"` (`ApiError.badRequest`), không có ngoại lệ. Chi tiết: `docs/tasks/TASK-001.md`. `assignRole()` vẫn là dead code (ngoài phạm vi fix này).

### 9.3 ✅ RESOLVED (2026-08-30, fix chung với 9.2) — Cache permission không invalidate khi đổi role qua endpoint đang chạy
Vì `update()` (endpoint thật) không gọi `clearPermissionCache`, nếu route ở mục 9.2 được dùng để đổi role một user (kể cả downgrade, không chỉ escalate), permission cache (TTL 5 phút) của user đó vẫn giữ **quyền CŨ** tối đa 5 phút sau khi role đã đổi trong DB — độ trễ đồng bộ giữa dữ liệu thật và quyền đang được áp dụng.

**Fix (2026-08-30)**: `update()` giờ gọi `clearPermissionCache(user._id.toString())` mỗi khi role thực sự thay đổi.

### 9.4 CONFIRMED ISSUE — ABAC/Policy hoàn toàn không có tác dụng bảo vệ (mở rộng mục 5.3)
Vì không route nào bật `enablePolicies`, MỌI kỳ vọng bảo vệ theo ngữ cảnh (vd "chỉ user cùng department mới xem được Document của department đó") — nếu có ý định dùng ABAC cho việc này — **không được thực thi**. Việc kiểm soát theo phạm vi dữ liệu (department, quyền sở hữu...) hiện chỉ tồn tại RẢI RÁC trong code Service theo từng domain (vd `validateRestorePermission` chỉ chủ sở hữu/admin — Phase 03; export Excel ghi đè `department` filter theo `req.user.department` nếu không phải ADMIN — Phase 05 §5.3), KHÔNG có 1 tầng ABAC tập trung nào đang hoạt động dù đã được xây dựng đầy đủ.

### 9.5 POTENTIAL RISK — Refresh token bị đánh cắp sống sót qua self-change-password
Đã nêu chi tiết ở mục 3.3 — `changePassword()` không revoke refresh token nào, khác 3 luồng đổi mật khẩu còn lại. Mức độ rủi ro phụ thuộc kịch bản tấn công thực tế (kẻ tấn công đã có refresh token hợp lệ từ trước) — không phải lỗ hổng tự nó tạo ra token bị lộ, mà là thiếu 1 lớp phòng thủ khi user chủ động phản ứng với nghi ngờ bị lộ mật khẩu.

### 9.6 POTENTIAL RISK — Password policy yếu
`z.string().min(5)` — mật khẩu tối thiểu 5 ký tự, không có yêu cầu độ phức tạp (chữ hoa/thường/số/ký tự đặc biệt) ở CẢ register, change password, admin reset. Kết hợp với `bcrypt` cost 10 (hợp lý) nhưng độ dài tối thiểu thấp làm giảm hiệu quả chống brute-force offline nếu hash bị lộ.

### 9.7 POTENTIAL RISK — IDOR tiềm năng do thiếu tầng ABAC tập trung
Vì kiểm soát phạm vi dữ liệu (department-scoping, ownership) chỉ được cài rải rác thủ công ở 1 số service cụ thể (không phải tất cả — UNKNOWN đã rà soát hết mọi endpoint đọc/sửa dữ liệu theo `:id` hay chưa, ngoài phạm vi Phase 07), có khả năng tồn tại endpoint theo `:id` mà 1 user có đúng permission COARSE-GRAINED (vd `DOCUMENT_VIEW`) nhưng KHÔNG cùng department vẫn xem được document của department khác — CHƯA XÁC MINH toàn diện (cần rà từng service ở Phase 08/09 nếu cần kết luận chắc chắn cho từng domain).

### 9.8 POTENTIAL RISK — JWT access token payload dư thừa (mục 3.1)
Role/department object đầy đủ nằm trong JWT access token (base64-decodable) dù không được dùng để authorize — rò rỉ thông tin nhẹ (department code/name, role name) nếu token bị chặn giữa đường (dù đã có JWT ký, không giả mạo được, nhưng payload không mã hoá).

### 9.9 Điểm THIẾT KẾ TỐT đã xác nhận (đối trọng, để khách quan)
- Chống account enumeration + timing attack nhất quán ở `login`/`forgotPassword` (mục 2, đã ghi Phase 03).
- `authenticate` luôn load `isActive` mới nhất mỗi request — disable user có hiệu lực ngay lập tức, không phụ thuộc cache/token expiry (mục 4).
- Whitelist thuật toán JWT (`HS256` tường minh) ở cả access và refresh token verify — chống algorithm confusion.
- `Policycondition.evaluator.ts` — dù dead ở runtime (mục 5.3), bản thân thiết kế evaluator (tokenizer/parser tự viết, không dùng `eval`/`Function`) là phòng thủ đúng chống RCE nếu sau này được kích hoạt.
- `logout()` chỉ tự thu hồi token của chính mình (filter theo cả `user: userId`, không chỉ `token`) — đã vá 1 lỗ hổng cho phép revoke token người khác (ghi nhận trong chính comment code).

---

## 10. Unknowns (chuyển sang phase sau)

- Dữ liệu Role/Permission THẬT trong MongoDB (không phải `ROLE_PERMISSIONS` "trên giấy") — role nào thực sự có `USER_UPDATE` (liên quan trực tiếp mức độ nghiêm trọng của finding 9.2) — KHÔNG xác minh được từ source code tĩnh, cần truy vấn DB thật hoặc gọi API `GET /api/rbac/roles`.
- Hành vi thực tế khi 1 role được gán permission không tồn tại trong `Permission` collection (permission string không khớp bất kỳ đâu) — suy luận là request luôn 403 với role đó, chưa test runtime.
- Rà soát toàn diện mọi endpoint theo `:id` xem có bao nhiêu endpoint thực sự áp dụng department-scoping/ownership check thủ công ở tầng Service (mới xác nhận 2-3 ví dụ cụ thể, chưa rà hết 116 endpoint) — để dành nếu cần cho Phase 08/09.
- Có cron/job nào dọn `RefreshToken` hết hạn/revoked hay không (Phase 04 đã nêu UNKNOWN, chưa đọc hết `shared/cron/`).
- Nội dung đầy đủ 319 dòng `Policycondition.evaluator.ts` (chỉ đọc phần tokenizer đầu file để xác nhận không dùng `eval`) — chưa đọc phần parser/evaluator chi tiết (ít giá trị phân tích thêm vì đã CONFIRMED toàn bộ nhánh này dead ở runtime).
- `permission.descriptors.ts` (176 dòng) — chưa đọc nội dung (nhiều khả năng chỉ là mô tả text cho UI hiển thị tên permission, không ảnh hưởng logic authorization — ưu tiên thấp).

---

**PHASE 07 COMPLETED**

# DEV-001A — Harden Super Admin Identity (PLAN)

> Ngày: 2026-08-31. Status: **PLAN IMPLEMENTED (Phase A) + PHASE B HOÀN TẤT (2026-09-12, xem `docs/development/tasks/DEV-047.md`)** — Phase A: `docs/development/tasks/DEV-001A.md`. Phase B (Mục 20 bên dưới): user xác nhận dự án CHỈ có DB dev này, CHƯA có production riêng — đã set `isSystemRole:true` cho role ADMIN thật trong DB + gỡ bỏ HOÀN TOÀN nhánh so khớp literal `role.name === "ADMIN"` khỏi ~20 vị trí trong code. `role.isSystemRole === true` giờ là ĐIỀU KIỆN DUY NHẤT cấp Super-Admin bypass — đóng dứt điểm RV02-01 (role rename hijack). Kế thừa DEV-001 (đã DONE — chặn rename qua `updateRoleService`, KHÔNG bị revert, KHÔNG đổi bởi DEV-047 — guard đó bảo vệ TÊN, không phải bypass).

## 1. Current Architecture

Super Admin hiện được xác định **hoàn toàn bằng so khớp chuỗi** `role.name === "ADMIN"`, tại nhiều lớp độc lập:

```
authenticate (auth.middleware.ts)
  → populate("role", "name")  // chỉ lấy _id + name, KHÔNG có cờ hệ thống nào khác
  → req.user.role = { _id, name }

authorizePermission (authorizePermission.middleware.ts:74)
  → if (user.role?.name === "ADMIN") → BYPASS TOÀN BỘ RBAC/ABAC

users.service.ts (4 vị trí độc lập, không dùng chung 1 helper):
  → assignRole()         : role.name === "ADMIN" → 400 (chặn gán ADMIN)
  → updateUserService()  : role.name === "ADMIN" → 400 (chặn gán ADMIN)
  → deactivateUser()     : role?.name === "ADMIN" → 400 (chặn khoá ADMIN)
  → (dòng 509, hàm nội bộ) : role.name === "ADMIN" → 400 (chặn gán ADMIN)

document.controller.ts (2 vị trí) / excel.controller.ts (2 vị trí):
  → isAdmin = req.user?.role?.name === "ADMIN"  (dùng cho business logic hiển thị/khác quyền)

rbac.service.ts:updateRoleService() (DEV-001, đã DONE):
  → guard 2 chiều bảo lưu literal "ADMIN" — CHẶN được rename, nhưng
    không đổi kiến trúc: bypass vẫn phụ thuộc CHUỖI "name".
```

`Role` model (`role.model.ts`) chỉ có `{ name: string (unique), permissions: [] }` — **không có bất kỳ cờ hệ thống bất biến nào** (`isSystemRole`, `code`, seed-fixed `_id`...).

`Express.Request.user.role` type (`shared/types/express.d.ts:15-18`) chỉ khai báo `{ _id, name }` — đã có sẵn dòng comment chết `// isSuperAdmin?: boolean;` (dấu vết ý định cũ chưa triển khai).

`seed-rbac.ts` — **toàn bộ file đang bị comment-out** (100% dead code), không có script seed/migration nào đang hoạt động trong repo, không có script runner trong `package.json` (`scripts` chỉ có `dev/build/start/test`).

## 2. Root Cause

Không có khái niệm "system identity" tách biệt khỏi display name `Role.name`. `"ADMIN"` vừa là **tên hiển thị** (đổi được qua `PUT /api/rbac/roles/:id`, dù giờ đã bị khoá bởi DEV-001) vừa là **định danh hệ thống** (dùng để cấp toàn quyền ở 9 vị trí source khác nhau). DEV-001 chỉ khoá cửa rename — không tách 2 khái niệm này ra, nên kiến trúc vẫn còn "single point of coupling" giữa business display-name và security identity. Đây đúng là root cause đã ghi trong `docs/16_REFACTORING_PLAN.md` REF-001 và `docs/17_SECURITY_HARDENING_PLAN.md` Mục 12 — DEV-001A là phần "còn lại" của REF-001 mà DEV-001 cố tình KHÔNG làm (xem lý do trong `docs/development/tasks/DEV-001.md` Mục "Approach đã chọn").

## 3. Dependency Map — mọi nơi phụ thuộc `role.name === "ADMIN"`

| # | File | Function | Mục đích | Confidence |
|---|---|---|---|---|
| 1 | `middlewares/authorizePermission.middleware.ts:74` | `authorizePermission()` | **Cấp bypass toàn quyền** — điểm rủi ro cao nhất | HIGH |
| 2 | `services/rbac/rbac.service.ts:343,349` | `updateRoleService()` | Chặn rename (DEV-001) — giữ bất biến literal, KHÔNG phải nguồn cấp quyền | HIGH |
| 3 | `services/users/users.service.ts:48` | `assignRole()`(tạo user) | Chặn gán ADMIN qua endpoint tạo user | HIGH |
| 4 | `services/users/users.service.ts:202` | `updateUserService()` | Chặn gán ADMIN qua endpoint update user | HIGH |
| 5 | `services/users/users.service.ts:279` | `deactivateUser()`(tên hàm suy luận từ ngữ cảnh) | Chặn khoá tài khoản ADMIN | HIGH |
| 6 | `services/users/users.service.ts:509` | hàm assign role khác (nội bộ, dòng 506+) | Chặn gán ADMIN | HIGH |
| 7 | `controllers/documents/document.controller.ts:75,166` | 2 handler | Đọc cờ `isAdmin` cho business logic hiển thị (không phải authorization gate) | MEDIUM |
| 8 | `controllers/excel/excel.controller.ts:30,86` | 2 handler | Tương tự — đọc cờ `isAdmin` cho business logic | MEDIUM |
| 9 | `scripts/seed-rbac.ts` (dead code, comment) | — | Ý định cũ: seed role ADMIN — hiện KHÔNG chạy | N/A (không hoạt động) |

**Tổng: 9 vị trí source thật đang biết (7 đang hoạt động + 1 DEV-001 guard + 1 dead code).** Không có vị trí nào ở tầng route/DTO trực tiếp so khớp `"ADMIN"` ngoài các file trên (đã Grep toàn `backend/src`).

## 4. Role Schema hiện tại

```ts
// role.model.ts
{
  name: { type: String, required: true, unique: true },
  permissions: [{ type: ObjectId, ref: "Permission" }],
}
```

Không có `isSystemRole`, không có `code`, không có index nào ngoài `name` unique. `Role._id` là ObjectId ngẫu nhiên do Mongo sinh khi tạo — **không có `_id` cố định/seed sẵn** cho role ADMIN hiện tại (không thể dùng `_id` cố định làm identity nếu ADMIN production đã được tạo qua API trước đây với `_id` ngẫu nhiên, trừ khi tra cứu và ghi lại `_id` đó làm hằng số — vẫn là "cờ hệ thống" về bản chất, chỉ khác chỗ lưu).

## 5. Authentication Flow (liên quan)

`authenticate` (`auth.middleware.ts:44-46`) → `User.findById().select("_id role department isActive").populate("role", "name")`. Populate **chỉ lấy field `name`** của Role — nếu thêm cờ mới vào `Role`, populate này **BẮT BUỘC phải sửa** (`populate("role", "name isSystemRole")` hoặc tương đương) để cờ tới được `req.user.role`, nếu không middleware phía sau sẽ luôn thấy `undefined`.

## 6. `authorizePermission` Flow (liên quan)

Điều kiện bypass ở dòng 74 là **if-đơn**, dễ đổi điều kiện (rủi ro code thấp), nhưng là **đường găng bảo mật cao nhất trong toàn hệ thống** — sai 1 ký tự ở đây tương đương mất toàn bộ RBAC hoặc khoá toàn bộ ADMIN thật ra khỏi hệ thống ("lockout" — xem Mục 12).

## 7. `Express.Request.user` Typing

Cần mở rộng `role: { _id, name }` → `role: { _id, name, isSystemRole?: boolean }` (hoặc field tương đương) trong `shared/types/express.d.ts`. Đây là thay đổi TypeScript type thuần — không có runtime impact riêng, nhưng PHẢI đi kèm đồng bộ với `auth.middleware.ts` (populate) và mọi nơi gán `req.user` thủ công (hiện chỉ có 1 chỗ, dòng 53-59 của `auth.middleware.ts`).

## 8. RBAC Service (liên quan)

`updateRoleService()` (đã có guard DEV-001) sẽ cần sửa thêm nếu đổi kiến trúc: guard hiện tại so khớp `role.name === "ADMIN"` để quyết định "đây có phải role hệ thống không" — nếu có cờ `isSystemRole`, guard nên đổi sang đọc cờ đó thay vì literal string (nhất quán kiến trúc, tránh 2 nguồn sự thật song song: cờ mới + literal cũ).

`createRoleService()` — cần kiểm tra thêm (chưa đọc trong task này — ngoài phạm vi 3 hàm đã biết từ DEV-001) liệu có endpoint nào cho phép tạo Role mới với `isSystemRole: true` hay không; nếu `isSystemRole` được thêm vào schema mà **không bị loại khỏi `CreateRoleDTO`/whitelist**, đây sẽ là 1 vector tạo role giả mạo hệ thống mới — cờ này **KHÔNG được phép** xuất hiện trong bất kỳ DTO nào (`CreateRoleDTO`, `UpdateRoleDTO`) theo đúng khuyến nghị gốc ở `docs/16_REFACTORING_PLAN.md` REF-001 ("không expose qua UpdateRoleDTO").

## 9. Role DTO / Validation hiện tại

```ts
// rbac.dto.ts
CreateRoleDTO = z.object({ name: z.string()... });
UpdateRoleDTO = z.object({ name: z.string()... });
```

Cả 2 DTO hiện chỉ có field `name` — **an toàn theo mặc định** (không có field thừa để lộ). Nếu thêm `isSystemRole` vào schema, PHẢI đảm bảo 2 DTO này **tiếp tục KHÔNG có field đó** (không sửa DTO — giữ nguyên là điều kiện bắt buộc của thiết kế, không phải tuỳ chọn).

## 10. API bị ảnh hưởng (nếu implement)

| Endpoint | Ảnh hưởng |
|---|---|
| `PUT /api/rbac/roles/:id` | Không đổi request/response shape (giữ nguyên DTO) — chỉ đổi hành vi nội bộ của guard |
| `POST /api/rbac/roles` | Cần xác nhận không tạo được `isSystemRole:true` qua API (giữ nguyên, không phải thay đổi mới) |
| Mọi endpoint dùng `authorizePermission(...)` (toàn bộ route protected) | Hành vi bypass ADMIN không đổi VỀ MẶT CHỨC NĂNG nếu migration đúng — nhưng đây là route CHUNG CHO TOÀN BỘ HỆ THỐNG, nên là nơi rủi ro regression cao nhất nếu cờ set sai/thiếu |
| `POST/PUT users` (assign/update role) | Không đổi request/response — chỉ đổi điều kiện guard nội bộ nếu 4 vị trí trong `users.service.ts` được đồng bộ theo cờ mới |

Không có breaking change ở API contract nếu implement đúng — rủi ro nằm ở **runtime behavior** (ai được coi là ADMIN), không nằm ở API shape.

## 11. Database Migration Requirement

**Bắt buộc có 1 trong 2:**
- (a) Thêm field `isSystemRole: { type: Boolean, default: false }` vào `Role` schema + chạy **script gán `isSystemRole: true`** cho đúng 1 role đang tên `"ADMIN"` trong MỖI environment (dev/staging/prod) — TRƯỚC KHI code mới (đọc cờ thay vì literal) được deploy.
- (b) Dùng `_id` cố định — vẫn cần 1 bước "ghi lại `_id` thật của role ADMIN hiện tại" làm hằng số cấu hình (`.env` hoặc constant file) cho MỖI environment — về bản chất vẫn là 1 bước migration/config thủ công tương đương (a), chỉ khác chỗ lưu trạng thái (DB field vs. config), và **rủi ro hơn** vì hằng số hard-code sai môi trường (vd đem `_id` của dev gán nhầm sang prod) gây lockout ngay lập tức không có cách nào tự phát hiện bằng schema validation.

→ **Khuyến nghị chọn (a) — cờ `isSystemRole` trong DB**, không chọn `_id` cố định, vì (a) tự chứa dữ liệu trong DB của từng environment (không rủi ro nhầm lẫn giữa environment), và cho phép validate bằng query (`Role.countDocuments({isSystemRole:true})` phải luôn = 1) — dễ viết health-check/CI-guard hơn so với hằng số `_id` nằm rải rác trong config.

**Không có migration framework nào có sẵn trong repo** (không Flyway/Liquibase/mongo-migrate, không script runner). `seed-rbac.ts` là ứng viên gần nhất nhưng **đang hoàn toàn dead code (bị comment 100%)** — cần được viết lại/kích hoạt lại như một phần của công việc này (không phải chỉ chạy sẵn có), hoặc dùng 1 script one-off riêng (`scripts/migrate-admin-flag.ts`) độc lập, đơn giản hơn để giảm rủi ro (không kéo theo toàn bộ logic seed permission).

## 12. Production Lockout Risk — PHÂN TÍCH CHI TIẾT

**Đây là rủi ro NGHIÊM TRỌNG NHẤT của toàn bộ thay đổi này.** Nếu code mới deploy (đọc `role.isSystemRole`) TRƯỚC KHI dữ liệu production có role nào mang cờ đó = `true`, thì:

```
authorizePermission: if (user.role?.isSystemRole) → bypass
                     // isSystemRole luôn undefined/false cho MỌI role hiện có
                     // → KHÔNG CÒN AI bypass được, kể cả ADMIN thật
                     → toàn bộ ADMIN rơi xuống nhánh RBAC thường
                     → nếu permission thật của ADMIN trong DB (Role.permissions)
                       không đầy đủ/chưa từng cần đầy đủ (vì trước giờ luôn bypass)
                       → ADMIN mất quyền truy cập gần như MỌI route ngay lập tức.
```

Đây chính xác là kịch bản **toàn hệ thống mất quyền quản trị cùng lúc**, không có "phương án dự phòng" nào trong kiến trúc hiện tại (không có superuser thứ 2, không có DB console tách biệt được ghi nhận, không có "break-glass" account).

## 13. Backward Compatibility

- **Có backward-compat nếu và chỉ nếu** migration data chạy TRƯỚC deploy code (xem Mục 15 — Deployment Order).
- 4 guard trong `users.service.ts` (chặn gán/khoá ADMIN qua endpoint) — nếu đổi từ `role.name==="ADMIN"` sang `role.isSystemRole`, hành vi giữ nguyên 100% MIỄN LÀ cờ đã được set đúng trước đó — không có breaking change nghiệp vụ.
- 4 vị trí `isAdmin` trong `document.controller.ts`/`excel.controller.ts` dùng cho hiển thị/business logic (không phải authorization gate) — rủi ro thấp hơn nếu lệch pha tạm thời (hiển thị sai, không phải mất bảo mật), nhưng vẫn nên đồng bộ cùng đợt để tránh 2 nguồn sự thật song song vĩnh viễn.

## 14. Existing ADMIN Data Assumptions

- **UNKNOWN (CONFIRMED không thể xác định qua source)**: Có bao nhiêu role tên `"ADMIN"` đang tồn tại trong DB thật (dev/staging/prod)? Unique index trên `name` đảm bảo **tối đa 1 role** tên `"ADMIN"` tồn tại tại một thời điểm trong MỖI database — nhưng dev/staging/prod là 3 database riêng biệt, không có gì đảm bảo state giống nhau.
- **UNKNOWN**: Ai/bao nhiêu user đang gán role ADMIN đó trong mỗi environment.
- **UNKNOWN**: `Role.permissions` của role ADMIN hiện có đầy đủ hay rỗng (vì middleware chưa bao giờ cần đọc field này cho ADMIN — do luôn bypass) — **quan trọng**: nếu migration/cờ set sai và ADMIN rơi xuống nhánh RBAC thường, permission thật trong DB mới là thứ quyết định ADMIN còn làm được gì, và điều này **UNKNOWN**, cần xác minh TRƯỚC khi cân nhắc chọn phương án B (Mục 16) — không dùng phương án B nếu permission thật của ADMIN trong DB CHƯA được xác nhận đầy đủ.

## 15. Recommended Design

**Phương án 1 — `isSystemRole: boolean` trên `Role` schema (khuyến nghị).**

- `Role.isSystemRole: { type: Boolean, default: false }`.
- `authorizePermission`: `if (user.role?.isSystemRole)`.
- `auth.middleware.ts`: `populate("role", "name isSystemRole")`.
- `express.d.ts`: `role: { _id, name, isSystemRole?: boolean }`.
- `updateRoleService()`: đổi 2 guard DEV-001 sang đọc `role.isSystemRole` thay vì literal `"ADMIN"` (chặn rename BẤT KỲ role hệ thống nào, không chỉ role tên đúng "ADMIN" — tổng quát hơn, đúng tinh thần REF-001 gốc).
- `CreateRoleDTO`/`UpdateRoleDTO`: xác nhận KHÔNG thêm field `isSystemRole` (giữ nguyên).
- 4 vị trí `users.service.ts` + 4 vị trí `isAdmin` ở 2 controller: đổi sang đọc `role.isSystemRole`.
- Migration: script one-off set `isSystemRole:true` cho role hiện đang tên `"ADMIN"`, chạy 1 lần mỗi environment.

**Ưu điểm**: tách hoàn toàn identity khỏi display name — role hệ thống có thể đổi tên tự do trong tương lai nếu cần (dù hiện tại DEV-001 đã chặn — có thể tái đánh giá guard rename sau khi có cờ, không bắt buộc trong DEV-001A). Dễ audit (`Role.find({isSystemRole:true})`), dễ viết health-check.

## 16. Alternative Designs

**Phương án 2 — `_id` cố định (không khuyến nghị).** Rủi ro nhầm environment (Mục 11), không tự chứa trong DB, khó audit bằng query đơn giản. Chỉ nên cân nhắc nếu vì lý do nào đó không muốn sửa `Role` schema — nhưng dự án hiện không có ràng buộc đó.

**Phương án 3 — Kết hợp system identity + permission "wildcard" thay vì bypass hoàn toàn.** Thay vì bypass toàn bộ RBAC/ABAC, gán role hệ thống MỘT permission đặc biệt (`"*"`) và để `authorizePermission` coi `"*"` luôn match. **Không khuyến nghị làm trong DEV-001A**: đây là thay đổi kiến trúc lớn hơn nhiều (đổi cách RBAC evaluate permission, ảnh hưởng cache, ảnh hưởng toàn bộ 14 domain), rủi ro cao hơn hẳn, và không giải quyết thêm gì so với Phương án 1 cho đúng mục tiêu của task này (tách identity khỏi display name). Có thể là hướng đi xa hơn cho 1 REF/DEV riêng trong tương lai nếu muốn loại bỏ khái niệm "Super Admin bypass" hoàn toàn — ngoài phạm vi DEV-001A.

## 17. Rollback Plan

- **Rollback code**: revert commit — an toàn tuyệt đối, `isSystemRole` field dư thừa trong DB không gây hại (middleware quay lại đọc `role.name === "ADMIN"` như cũ, cờ bị bỏ qua).
- **Rollback migration**: KHÔNG cần xoá field `isSystemRole` sau khi rollback code — field vô hại khi không được đọc. Nếu muốn dọn dẹp: `Role.updateMany({}, {$unset:{isSystemRole:1}})` — không destructive, có thể chạy lại migration bất kỳ lúc nào.
- **Rollback thứ tự an toàn nhất**: nếu phát hiện sự cố NGAY SAU deploy code mới, rollback code TRƯỚC (nhanh nhất để khôi phục bypass qua literal `"ADMIN"` cũ), giữ nguyên migration data (không cần rollback DB).

## 18. Security Impact

- **Tích cực**: loại bỏ hoàn toàn dependency vào display-name có thể đổi qua API (dù DEV-001 đã khoá 1 phần, đây vẫn là lớp phòng thủ sâu hơn — defense in depth: kể cả nếu DEV-001 guard có lỗ hổng chưa phát hiện, identity thật sự không còn phụ thuộc vào chuỗi `name`).
- **Trung tính**: không mở thêm vector tấn công mới NẾU tuân thủ Mục 9 (không expose `isSystemRole` qua DTO) và Mục 15 (audit `createRoleService` không cho set cờ này qua API).
- **Rủi ro nếu làm sai**: lockout toàn bộ ADMIN (Mục 12) — đây là rủi ro vận hành, không phải rủi ro bảo mật theo hướng "mất kiểm soát cho kẻ tấn công", nhưng có thể dẫn tới quy trình khắc phục khẩn cấp (truy cập DB trực tiếp) làm tăng bề mặt rủi ro tạm thời.

## 19. Testing Requirements

Phụ thuộc DEV-004 (đã DONE — toolchain sẵn sàng). Khi implement, **bắt buộc có test TRƯỚC khi deploy** (khác với DEV-001 phải làm STATIC-only vì lúc đó DEV-004 chưa xong):

1. `authorizePermission.middleware.test.ts` (đã có 9 test, cần bổ sung): role có `isSystemRole:true` (bất kể tên) → bypass; role tên `"ADMIN"` nhưng `isSystemRole:false/undefined` (dữ liệu cũ/migration chưa chạy) → KHÔNG bypass, rơi xuống RBAC thường — đây là test mô phỏng CHÍNH XÁC kịch bản lockout ở Mục 12, phải test được TRƯỚC khi cho phép deploy.
2. `rbac.service.test.ts` (mới): `updateRoleService` — rename role có `isSystemRole:true` → 403; rename role thường → OK.
3. `users.service.test.ts` (mới, hiện chưa có): 4 vị trí guard — đổi sang đọc `isSystemRole`, test cả 2 nhánh.
4. **Integration/manual test bắt buộc trên staging** (không chỉ unit test mock): tạo/xác nhận 1 user ADMIN thật trên DB staging đã migrate, login thật, gọi 1 route bất kỳ cần permission cao — xác nhận KHÔNG bị 403. Đây là bước không thể thay thế bằng unit test mock vì rủi ro nằm ở DỮ LIỆU THẬT (cờ có được set đúng hay không), không nằm ở logic code.

## 20. Deployment Order — CÂU TRẢ LỜI TRỰC TIẾP

> **"Deploy code trước hay migration trước?"**

**MIGRATION TRƯỚC — BẮT BUỘC — KHÔNG CÓ NGOẠI LỆ.**

Lý do: `authorizePermission` middleware chỉ có 1 nhánh — không có "grace period" đọc cả 2 điều kiện cùng lúc trong thiết kế đơn giản nhất. Nếu deploy code trước (đọc `isSystemRole`) mà DB chưa có role nào mang cờ này = `true`, mọi ADMIN mất bypass ngay lập tức tại request kế tiếp sau deploy (Mục 12).

**Thứ tự chuẩn (bắt buộc, có thể thêm bước quá độ để giảm rủi ro hơn nữa — xem Phương án an toàn hơn bên dưới):**

```
1. Chạy migration script (set isSystemRole:true cho role "ADMIN" hiện có)
   TRÊN environment đích (staging trước, prod sau).
2. XÁC NHẬN bằng query: Role.countDocuments({isSystemRole:true}) === 1
   (không phải 0, không phải >1) TRƯỚC KHI qua bước 3.
3. Deploy code mới (đọc isSystemRole) LÊN CHÍNH environment đã migrate ở bước 1.
4. Xác nhận ADMIN thật login + gọi được 1 route quyền cao (Mục 19.4).
5. Lặp lại 1→4 cho environment tiếp theo (không migrate đồng loạt nhiều
   environment rồi mới deploy đồng loạt — làm TUẦN TỰ từng environment).
```

**Phương án an toàn hơn (khuyến nghị cân nhắc nếu muốn giảm rủi ro hơn nữa — KHÔNG bắt buộc cho DEV-001A, có thể để DEV-001B nếu cần)**: thời gian đầu, đổi điều kiện bypass thành **OR** thay vì thay thế hoàn toàn:
```ts
if (user.role?.isSystemRole || user.role?.name === "ADMIN") { ... }
```
Cho phép deploy code TRƯỚC migration một cách an toàn (literal `"ADMIN"` vẫn còn hoạt động như lưới đỡ), sau đó chạy migration, xác nhận, rồi mới xoá nhánh `|| user.role?.name === "ADMIN"` ở 1 lần deploy riêng sau đó khi đã chắc chắn migration đúng trên MỌI environment. Đánh đổi: cần 2 lần deploy thay vì 1, nhưng loại bỏ hoàn toàn rủi ro thứ tự sai — nếu người vận hành lỡ deploy code trước migration, hệ thống vẫn hoạt động bình thường qua nhánh literal cũ. **Đây là lựa chọn AN TOÀN HƠN được khuyến nghị nếu team không tự tin thực hiện đúng thứ tự ở quy trình 5 bước trên trong 1 lần.**

## 21. "Làm thế nào để đảm bảo ADMIN hiện tại không bị lockout?"

1. **Trước migration**: chạy 1 lần `Role.find({name:"ADMIN"})` trên MỖI environment, ghi lại kết quả (số lượng, `_id`) — xác nhận đúng 1 role, không có role trùng tên/rác.
2. **Migration phải idempotent**: `Role.updateOne({name:"ADMIN"}, {$set:{isSystemRole:true}})` — an toàn chạy lại nhiều lần, không lỗi nếu chạy 2 lần.
3. **Xác nhận bằng query trước khi deploy code** (Mục 20 bước 2) — không tin tưởng "chắc là chạy rồi", phải query xác nhận thật.
4. **Dùng phương án OR quá độ (Mục 20, "Phương án an toàn hơn")** nếu có bất kỳ nghi ngờ nào về việc đảm bảo đúng thứ tự — đây là cách chắc chắn nhất loại bỏ rủi ro lockout do sai thứ tự người vận hành.
5. **Test staging đầy đủ TRƯỚC prod** (Mục 19.4) — không migrate/deploy thẳng lên prod khi chưa xác nhận trên staging trước, kể cả khi thay đổi "nhỏ".
6. **Có kế hoạch khôi phục khẩn cấp**: nếu phát hiện lockout xảy ra dù đã theo quy trình, cách khôi phục nhanh nhất là revert code (Mục 17) — KHÔNG cố sửa dữ liệu DB trong lúc khẩn cấp trên prod; vì hiện tại **không có break-glass account nào khác ADMIN** (UNKNOWN có DB console admin riêng biệt được ai giữ hay không — cần xác nhận với chủ dự án như 1 điều kiện tiên quyết trước khi thực thi DEV-001A thật, ghi ở Mục 22).

## 22. Production Safety Checklist

- [ ] Xác nhận với chủ dự án: có DB console/break-glass access riêng biệt (ngoài ứng dụng) để khôi phục thủ công nếu lockout xảy ra? (UNKNOWN hiện tại)
- [ ] Xác nhận số lượng role tên `"ADMIN"` trên MỖI environment = đúng 1 (Mục 21.1).
- [ ] Xác nhận `Role.permissions` của role ADMIN hiện có (Mục 14) — dù chọn phương án OR quá độ thì bước này không bắt buộc ngay, nhưng bắt buộc nếu sau này muốn bỏ hẳn nhánh bypass literal.
- [ ] Viết + review migration script (mới, không dùng lại `seed-rbac.ts` dead code nguyên trạng — có thể tách riêng 1 script nhỏ `scripts/migrate-system-role-flag.ts`).
- [ ] Viết test theo Mục 19 (1-3) TRƯỚC khi deploy code.
- [ ] Chạy migration + deploy trên staging trước, xác nhận Mục 19.4 thành công.
- [ ] Chọn quy trình: 5-bước tuần tự (Mục 20) HAY phương án OR quá độ 2-lần-deploy (khuyến nghị nếu không chắc chắn).
- [ ] Migrate + deploy tuần tự từng environment, không đồng loạt.
- [ ] Sau khi xác nhận ổn định trên prod (nếu dùng phương án OR), lên lịch deploy lần 2 xoá nhánh literal.

## 23. Risk Assessment

| Khía cạnh | Đánh giá |
|---|---|
| Risk nếu implement đúng quy trình | LOW — thay đổi cô lập, có rollback rõ ràng, có test |
| Risk nếu sai thứ tự deploy/migration | **CRITICAL** — lockout toàn bộ quyền quản trị, không có break-glass đã biết |
| Effort | MEDIUM — 9 vị trí source cần sửa đồng bộ (không phải 1 file như DEV-001), + viết migration script mới, + test mới |
| Độ ưu tiên | Theo `docs/16_REFACTORING_PLAN.md`: REF-001 xếp CRITICAL nhưng DEV-001 đã giải quyết phần cấp bách nhất (đóng backdoor rename) — phần còn lại (DEV-001A) là HARDENING kiến trúc dài hạn, không còn tính "khẩn cấp" như trước DEV-001, có thể lên lịch có kiểm soát thay vì gấp |
| Điều kiện tiên quyết trước khi implement thật | Xác nhận Mục 22 checklist đầy đủ, đặc biệt điểm break-glass access (UNKNOWN) |

## 24. Kết luận / Khuyến nghị

DEV-001A nên implement theo **Phương án 1 (`isSystemRole`)** với **quy trình OR quá độ (Mục 20)** để loại bỏ hoàn toàn rủi ro lockout do sai thứ tự thao tác, đánh đổi bằng 2 lần deploy thay vì 1. Trước khi implement thật, cần xác nhận với chủ dự án về break-glass access (Mục 22, mục đầu tiên) — đây là UNKNOWN duy nhất không thể tự suy luận từ source code.

**KHÔNG implement trong task này** — chờ chỉ định rõ ràng để bắt đầu DEV-001A thật (đề xuất đặt tên task tiếp theo `DEV-001A-IMPL` nếu được duyệt).

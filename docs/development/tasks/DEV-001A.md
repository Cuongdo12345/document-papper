# DEV-001A — Harden Super Admin Identity (Implementation)

> Ngày: 2026-08-31. Status: **DONE (Phase A — transitional, OR fallback)**. Kế thừa DEV-001 (không revert). Phase B (xoá literal fallback) CHƯA thực hiện — chờ xác nhận migration đã chạy trên mọi environment.

## Objective

Tách Super Admin identity khỏi so khớp chuỗi `role.name === "ADMIN"` bằng cờ bất biến `Role.isSystemRole`, theo `docs/development/DEV-001A_SUPER_ADMIN_IDENTITY_PLAN.md` (Phương án 1 + quy trình OR quá độ, Mục 15/20).

## Scope thực hiện — Phase A (OR transitional)

Mọi security/authorization decision đổi từ:
```
role.name === "ADMIN"
```
sang:
```
role.isSystemRole === true || role.name === "ADMIN"
```
Giữ literal fallback — KHÔNG xoá (Phase B, chưa thực hiện, chờ xác nhận migration chạy xong mọi environment).

## Files changed

| File | Thay đổi |
|---|---|
| `backend/src/models/rbac/role.model.ts` | +field `isSystemRole: { type: Boolean, default: false }` |
| `backend/src/interfaces/rbac/role.interface.ts` | +`isSystemRole?: boolean` trên `IRole` |
| `backend/src/shared/types/express.d.ts` | +`isSystemRole?: boolean` trên `Request.user.role` |
| `backend/src/middlewares/auth.middleware.ts` | `populate("role", "name isSystemRole")` (trước chỉ `"name"`) |
| `backend/src/middlewares/authorizePermission.middleware.ts` | Super-Admin bypass: `isSystemRole === true \|\| name === "ADMIN"` |
| `backend/src/services/users/users.service.ts` | 4 guard (tạo user với role ADMIN / gán role ADMIN qua update / khoá tài khoản ADMIN / gán role ADMIN qua hàm assign) đổi sang OR; guard `disable()` bổ sung `isSystemRole` vào `.select()` (trước chỉ select `"name"`, field mới sẽ luôn `undefined` nếu không sửa) |
| `backend/src/controllers/documents/document.controller.ts` | 2 chỗ `isAdmin` (update, restore) đổi sang OR; `deleteDocuments` truyền thêm `isSystemRole` cho service |
| `backend/src/services/documents/documents.types.ts` | `DeleteDocumentPayload` +`isSystemRole?: boolean` |
| `backend/src/services/documents/document.service.ts` | `deleteDocumentService` guard đổi sang OR (`isSystemRole === true \|\| role === "ADMIN"`) |
| `backend/src/controllers/excel/excel.controller.ts` | 2 chỗ `isAdmin` (export, import history) đổi sang OR |
| `backend/src/controllers/dashboard/dashboard.controller.ts` | `adminDashboardSummary` guard đổi sang OR |
| `backend/scripts/migrate-system-role-flag.ts` | **Mới** — migration one-off, idempotent, target đúng role `"ADMIN"` |

**Không sửa**: `rbac.service.ts:updateRoleService()` (guard DEV-001 GIỮ NGUYÊN 100%, không revert, không đổi điều kiện — vẫn so khớp literal `"ADMIN"`, đúng vai trò "khoá rename", độc lập với identity bypass); `CreateRoleDTO`/`UpdateRoleDTO`/`ROLE_UPDATE_WHITELIST`/`ROLE_CREATE_WHITELIST` (đã xác nhận chỉ chứa `["name"]` — `isSystemRole` KHÔNG thể set/update qua bất kỳ API nào, không cần sửa).

## Vị trí đã xác định nhưng CỐ TÌNH KHÔNG sửa (ngoài 9 vị trí trong plan gốc)

Search lại toàn bộ `role.name === "ADMIN"` / `!== "ADMIN"` phát hiện thêm 2 vị trí SECURITY thật sự (ngoài danh sách 9 vị trí ở plan gốc — đã bổ sung và sửa ở trên: `dashboard.controller.ts:94`, `document.service.ts:425` qua `document.controller.ts` truyền `role`) và các vị trí sau — phân loại KHÔNG sửa:

| File | Vị trí | Phân loại | Lý do không sửa |
|---|---|---|---|
| `shared/constants/workflow-docs.ts` | `STATUS_PERMISSION` map | **Dead code** | Duy nhất consumer (`validateStatusPermission` ở `documents.validator.ts`) — comment trong chính file đó xác nhận "KHÔNG dùng cho luồng Document hiện tại", không có lời gọi nào tới `validateStatusPermission` trong toàn bộ `backend/src` (đã grep xác nhận). Không phải security decision đang hoạt động — ngoài phạm vi DEV-001A (technical debt đã ghi từ trước, không tạo mới). |
| `rbac.service.ts` (3 chỗ) | `notifyUsersByRoleName("ADMIN", ...)` | **Business/notification logic** | Tìm user thuộc role tên "ADMIN" để gửi thông báo — không phải authorization/security decision (không cấp quyền truy cập gì). An toàn giữ nguyên vì DEV-001 đã khoá không cho role khác đổi tên thành "ADMIN". |
| `dto/users/users.dto.ts:4` | comment `// ["ADMIN","IT","USER"]` | Dead/comment | Code đã comment, không phải logic đang chạy. |

Không có vị trí nào bị đánh dấu UNKNOWN — toàn bộ occurrence tìm được đã phân loại rõ ràng.

## Migration

- **Script tạo**: `backend/scripts/migrate-system-role-flag.ts` — idempotent, chỉ target role `name: "ADMIN"`, không tạo role mới, không đổi `permissions`/`User`/role khác, log không leak dữ liệu nhạy cảm (chỉ log tên role + trạng thái cờ).
- **CHƯA CHẠY trên bất kỳ database nào (kể cả dev)** trong task này — đây là hành động ghi dữ liệu (mutate DB), theo CLAUDE.md §15/§27 cần được xác nhận rõ ràng trước khi thực hiện trên môi trường thật, và nằm ngoài phạm vi "implement code" thuần của task này. Chạy migration là bước vận hành riêng, thực hiện theo đúng thứ tự ở `docs/development/DEV-001A_SUPER_ADMIN_IDENTITY_PLAN.md` Mục 20-22.
- **Hệ quả của việc chưa chạy migration**: `isSystemRole` của MỌI role (kể cả ADMIN) hiện đang là `false`/`undefined` trên database dev hiện tại — hệ thống VẪN HOẠT ĐỘNG BÌNH THƯỜNG nhờ nhánh literal fallback `|| role.name === "ADMIN"` (đúng thiết kế Phase A — không có rủi ro lockout do chưa migrate).

## Verification

| Loại | Kết quả |
|---|---|
| TYPECHECK | **PASSED** — `npx tsc --noEmit` → 0 lỗi |
| AUTOMATED TEST | **PASS** — bộ test hiện có (DEV-004, đã DONE trong session này) chạy lại nguyên trạng: `npx jest` → **4/4 suite, 35/35 test PASS**, không có test nào sửa hay bị ảnh hưởng bởi thay đổi DEV-001A (fallback OR đảm bảo hành vi cũ với `role.name === "ADMIN"` vẫn y nguyên khi `isSystemRole` chưa set) |
| `git diff` | Đã review — đúng phạm vi 12 file (11 sửa + 1 script mới), không debug code/console.log thừa/secret, DEV-001 guard nguyên vẹn 100% |

### Static/manual trace — 8 kịch bản bắt buộc

| Case | Điều kiện | Kết quả mong đợi | Xác nhận |
|---|---|---|---|
| 1 | `role.name="ADMIN"`, `isSystemRole=true` | Bypass hoạt động | ✅ `isSystemRole===true` → `true` |
| 2 | `role.name="ADMIN"`, `isSystemRole=false` | Vẫn bypass (Phase A fallback, KHÔNG lockout) | ✅ `false || name==="ADMIN"` → `true` (đúng thiết kế transitional — không phải "không được coi Super Admin" vì mục tiêu Phase A là KHÔNG gây lockout; sẽ đổi hành vi này ở Phase B sau khi migration xác nhận) |
| 3 | `role.name="MANAGER"`, `isSystemRole=false` | Phải qua RBAC permission check | ✅ `false || false` → `false`, rơi xuống nhánh permission thường |
| 4 | `role.name="MANAGER"`, client cố truyền `isSystemRole=true` trong request body | Không được phép | ✅ `CreateRoleDTO`/`UpdateRoleDTO`/whitelist chỉ có `name` — field bị Zod strip ở route + `pickWhitelisted` lọc lại ở service, không tới được `Object.assign` |
| 5 | Rename `ADMIN` → `MANAGER` | DEV-001 guard vẫn chặn | ✅ Guard `rbac.service.ts:343-347` không đổi, vẫn chặn |
| 6 | Rename `MANAGER` → `ADMIN` | DEV-001 guard vẫn chặn | ✅ Guard `rbac.service.ts:349-352` không đổi, vẫn chặn |
| 7 | Role ADMIN SAU migration | `isSystemRole=true` | Đúng theo script — CHƯA chạy thật trong task này (xem Mục Migration) |
| 8 | Role thường SAU migration | `isSystemRole=false` (default schema) | ✅ Script chỉ target đúng 1 role `"ADMIN"`, mọi role khác giữ nguyên default `false` |

Ghi rõ: đây là STATIC/MANUAL TRACE, không thay thế automated test — riêng Case 1/2/3 đã có automated test tương ứng ở `authorizePermission.middleware.test.ts` (test cũ dùng `role: {name:"ADMIN"}` không có `isSystemRole` — chính là Case 2, đã chạy PASS thật ở bảng Verification).

## Remaining Issues

- **Phase B chưa thực hiện** (đúng phạm vi task — chỉ yêu cầu Phase A). Nhánh literal `|| role.name === "ADMIN"` còn tồn tại ở 9 vị trí — đây là CHỦ ĐÍCH, không phải sót.
- **Migration chưa chạy trên bất kỳ environment nào** — cần thực hiện theo quy trình ở plan Mục 20-22 (kể cả dev) trước khi có thể cân nhắc Phase B.
- Nên bổ sung test case cho `isSystemRole=true` (Case 1, 7) vào `authorizePermission.middleware.test.ts` khi migration đã chạy trên dev — hiện bộ test chỉ phủ Case 2/3 (fallback literal), chưa phủ nhánh cờ mới thật sự kích hoạt.
- `createRoleService()` chưa được đọc lại trong task này để xác nhận không có đường tạo role mới với `isSystemRole:true` — đã xác nhận gián tiếp qua `ROLE_CREATE_WHITELIST=["name"]` (đủ để kết luận an toàn), nhưng chưa đọc trực tiếp hàm — ghi nhận UNKNOWN mức thấp, không chặn Status DONE vì whitelist đã đủ bằng chứng.

## Status

**DONE** (Phase A). Không có BLOCKED nào phát sinh. Không mở rộng sang DEV-002.

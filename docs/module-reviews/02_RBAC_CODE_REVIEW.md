# REVIEW-02 — RBAC / AUTHORIZATION CODE REVIEW

> Phạm vi: `backend/src/{controllers,services,models,dto}/rbac/`, `routes/rbac/rbac.routes.ts`, `authorizePermission.middleware.ts`, `permission.cache.ts`, `permission.service.ts` (getUserEffectivePermissions/denyPermissions). Dependency trực tiếp đã đọc: `User`/`Role`/`Permission`/`Policy` model.
> KHÔNG sửa code. KHÔNG chạy lại Phase 01→13. KHÔNG refactor.
> Ngày review: 2026-08-30. Commit: `5b58fb1` (branch `main`).

---

## 1. Tài liệu/nguồn đã đọc trước khi review

- `CLAUDE.md`, `docs/00_PROJECT_MEMORY.md`, `docs/07_AUTH_RBAC_ANALYSIS.md`, `docs/09_SECURITY_ANALYSIS.md`, `docs/module-reviews/01_AUTH_CODE_REVIEW.md`.
- Source đọc trực tiếp (toàn bộ file, không suy diễn):
  - `backend/src/services/rbac/{permission.service.ts, permission.cache.ts, rbac.service.ts, rbac.constants.ts}`
  - `backend/src/controllers/rbac/rbac.controller.ts`
  - `backend/src/routes/rbac/rbac.routes.ts`
  - `backend/src/dto/rbac/rbac.dto.ts`
  - `backend/src/models/rbac/{role.model.ts, permission.model.ts, policy.model.ts}`
  - `backend/src/middlewares/authorizePermission.middleware.ts` (đọc kỹ ở TASK-001, xác nhận lại không đổi)
  - DB dev read-only (1 câu lệnh, không ghi): xác nhận role nào hiện giữ permission `ROLE_UPDATE`, và index thật trên `roles.name`.

---

## 2. Trace: Request → Authentication → User → Role → Permission → Policy → Resource → Authorization → Controller → Service

```
Request (Bearer token) → authenticate (auth.middleware.ts)
  → User.findById(decoded.id).populate("role","name")   [LOAD TƯƠI TỪ DB MỖI REQUEST]
  → req.user = {_id, role, department, isActive, permissions:[]}

→ authorizePermission(requiredPerms, options?) (authorizePermission.middleware.ts)
  1. !req.user → 401
  2. req.user.role?.name === "ADMIN" → BYPASS TOÀN BỘ (audit best-effort) → next()
  3. getCachedPermissions(userId)  (permission.cache.ts, Map in-memory, TTL 5 phút)
       cache miss → getUserEffectivePermissions(userId)  (permission.service.ts)
         → User.findById(userId).populate("role.permissions").populate("extraPermissions").populate("denyPermissions")
         → finalPermissions = (role.permissions ∪ user.extraPermissions) − user.denyPermissions
  4. so khớp requiredPerms (some/every) với finalPermissions → pass/fail
  5. NẾU fail VÀ options.enablePolicies && options.resource && options.action:
       → Policy.find({resource, action}) → evaluatePolicyConditionSafely(condition, {user, resource: req.resource})
       → CONFIRMED (kế thừa Phase 07): KHÔNG route nào trong toàn hệ thống truyền đủ 3 điều kiện này
         → nhánh này KHÔNG BAO GIỜ chạy trong thực tế, không đọc lại chi tiết ở review này.
  6. Không gì pass → 403

→ Controller (rbac.controller.ts) — mỏng, chỉ gọi service, không có logic authorization riêng
→ Service (rbac.service.ts) — CRUD Permission/Role/Policy, TỰ áp thêm 1 lớp whitelist
  field (`pickWhitelisted`, xem mục 3 RV02-04) độc lập với lớp DTO ở route.
```

---

## 3. Findings

### RV02-01 — Không có bảo vệ chống đổi tên Role để chiếm/mất quyền bypass "ADMIN" (Role rename hijack)
> ✅ **RESOLVED (2026-09-12, DEV-047)**: Super-Admin bypass (`authorizePermission.middleware.ts` + ~19 vị trí khác dùng chung pattern) giờ CHỈ đọc `role.isSystemRole === true` — đã gỡ HOÀN TOÀN nhánh so khớp `role.name === "ADMIN"` mô tả trong finding này. Đổi tên 1 role bất kỳ thành chuỗi "ADMIN" (nếu có ai vượt qua được guard riêng ở `updateRoleService`) KHÔNG còn cấp bypass. Chi tiết `docs/development/tasks/DEV-047.md`.
- **Severity**: CRITICAL (impact) — Probability hiện tại LOW trên DB đã kiểm tra (xem Evidence bổ sung)
- **Category**: Authorization / Privilege Escalation (Missing Authorization Check)
- **File**: `backend/src/services/rbac/rbac.service.ts`, `backend/src/shared/constants/rbac.constants.ts` (whitelist), `backend/src/middlewares/authorizePermission.middleware.ts` (nơi hệ quả phát huy tác dụng)
- **Function/Class**: `updateRoleService()`
- **Observed Behavior**: Cơ chế "Super Admin bypass" hoàn toàn dựa trên so khớp CHUỖI `role.name === "ADMIN"` (đã ghi nhận từ Phase 07 như 1 rủi ro kiến trúc). `updateRoleService()` cho phép đổi `name` của **BẤT KỲ Role nào** (kể cả chính Role đang giữ `name: "ADMIN"`) miễn người gọi có permission `ROLE_UPDATE` — hàm này **KHÔNG có bất kỳ check đặc biệt nào** ngăn:
  1. Đổi tên Role ADMIN hiện tại sang tên khác (giải phóng ràng buộc `unique` trên `name`), **sau đó**
  2. Đổi tên 1 Role KHÁC (bất kỳ, kể cả role thấp quyền) thành đúng `"ADMIN"`.

  Sau bước 2, MỌI user đang thuộc role vừa đổi tên (dù nội dung `permissions` thật của role đó rỗng hoặc rất hạn chế) sẽ **bypass hoàn toàn `authorizePermission`** ở bước 2 của middleware — vì bypass chỉ so sánh `role.name`, không so sánh `role._id` hay bất kỳ cờ hệ thống nào khác.
- **Evidence**:
  ```ts
  // rbac.service.ts — updateRoleService(), TOÀN BỘ guard hiện có:
  export const updateRoleService = async (id: any, payload: any) => {
    const role = await Role.findById(id);
    if (!role) throw ApiError.notFound("Role not found");
    const safePayload = pickWhitelisted(payload, ROLE_UPDATE_WHITELIST); // chỉ ["name"]
    Object.assign(role, safePayload);
    const saved = await role.save();
    await clearPermissionCacheForRole(id, { notify: false });
    return saved;
  };
  ```
  Không có dòng nào kiểm tra `safePayload.name === "ADMIN"` hay `role.name === "ADMIN"` trước khi cho phép đổi. `role.model.ts` chỉ có ràng buộc `unique: true` trên `name` ở tầng DB — ràng buộc này CHỈ ngăn 2 role CÙNG TỒN TẠI với tên "ADMIN" tại 1 thời điểm, KHÔNG ngăn việc đổi tên tuần tự (rename-away rồi rename-into) như kịch bản trên.
  **Xác minh bổ sung (read-only, DB dev)**: hiện tại chỉ Role `ADMIN` đang giữ permission `ROLE_UPDATE` (giống pattern đã phát hiện ở TASK-001 cho `USER_UPDATE`) — nghĩa là kịch bản trên, ở DB dev đã kiểm tra, CHỈ có thể được thực hiện bởi 1 tài khoản ĐÃ LÀ ADMIN. Index thật trên `roles.name`: `{name:1}, unique:true`, không có collation đặc biệt (case-sensitive mặc định).
- **Impact**: Ở DB đã kiểm tra, một ADMIN hợp pháp có thể (vô tình do thao tác nhầm, hoặc CHỦ ĐÍCH để tạo "backdoor" duy trì quyền truy cập) gán trạng thái bypass ADMIN cho 1 role khác — nếu tài khoản ADMIN gốc sau này bị thu hồi quyền (vd bị 1 ADMIN khác disable, hoặc bị điều tra), role "ADMIN" mới (bí mật) vẫn tồn tại và tiếp tục cấp bypass đầy đủ cho bất kỳ ai được gán role đó — đây là vector **persistence/backdoor sau khi mất quyền admin ban đầu**, không cần bất kỳ lỗ hổng nào khác ngoài chính thiết kế "bypass theo tên chuỗi" đã biết. Trên môi trường có phân quyền `ROLE_UPDATE` rộng hơn (production nếu khác DB dev), đây có thể là đường leo thang đặc quyền cho bất kỳ ai có `ROLE_UPDATE` mà KHÔNG cần `ROLE_CREATE`/`ROLE_ASSIGN_PERMISSIONS`.
- **Recommendation**: Thêm guard tường minh trong `updateRoleService()`: chặn đổi `name` sang `"ADMIN"` nếu role hiện tại chưa phải ADMIN, VÀ/HOẶC chặn đổi `name` CỦA role đang là ADMIN (dùng ID cố định/cờ `isSystemRole` thay vì cho phép đổi tên tuỳ ý). Về lâu dài, khuyến nghị đã có sẵn trong chính comment `authorizePermission.middleware.ts` (dòng 40-43, đọc ở TASK-001): thay bypass string-match bằng 1 cờ hệ thống riêng (`isSystemAdmin` trên Role hoặc User) — giải quyết tận gốc cả lớp vấn đề này lẫn rủi ro tương tự đã ghi ở Phase 07/09 (SEC-05 cũ, đã fix ở TASK-001, nhưng đó là escalate qua User.role; đây là escalate qua Role.name — 2 vector khác nhau, cùng root cause thiết kế).
- **Confidence**: CONFIRMED (code — đọc trực tiếp, không suy diễn). Probability khai thác thực tế: **LOW trên DB dev đã kiểm tra** (chỉ ADMIN mới có `ROLE_UPDATE`) nhưng **UNKNOWN cho production** (dữ liệu Role/Permission thật production ngoài phạm vi truy cập) — cùng pattern rủi ro với ISS-01 trước khi fix.

---

### RV02-02 — `denyPermissions` hoàn toàn không có tác dụng với user mang role "ADMIN" (Inconsistent Authorization)
- **Severity**: MEDIUM
- **Category**: Authorization Design Inconsistency
- **File**: `backend/src/middlewares/authorizePermission.middleware.ts` (thứ tự check), `backend/src/services/rbac/permission.service.ts` (`getUserEffectivePermissions`)
- **Function/Class**: `authorizePermission()` (bước 2, ADMIN bypass) chạy TRƯỚC bước 3 (nơi `denyPermissions` được áp dụng)
- **Observed Behavior**: `getUserEffectivePermissions()` cài đặt ĐÚNG logic `deny luôn thắng role+extra` — nhưng logic này chỉ được GỌI TỚI ở bước 3 của `authorizePermission`, tức là CHỈ áp dụng cho user KHÔNG có `role.name === "ADMIN"`. Nếu 1 user có role ADMIN nhưng bị gán `denyPermissions` (vd admin cấp cao cố tình hạn chế 1 vài quyền cho 1 tài khoản ADMIN phụ), field này **không có bất kỳ tác dụng nào** — request luôn dừng ở bước 2 (bypass) trước khi tới bước đọc `denyPermissions`.
- **Evidence**: đối chiếu thứ tự code trong `authorizePermission.middleware.ts` (bước 2 `return next()` ngay khi `role.name==="ADMIN"`, bước 3 mới gọi `getCachedPermissions`) với field `denyPermissions` tồn tại đầy đủ trong `User` schema và được RBAC API cho phép quản lý (`extraPermissions`/`denyPermissions` xuất hiện trong `getUserEffectivePermissions`).
- **Impact**: Tạo cảm giác sai (false sense of control) cho người vận hành — hệ thống CÓ field/API để "hạn chế quyền cụ thể của 1 user" (`denyPermissions`), nhưng field này ÂM THẦM vô dụng với bất kỳ ai đang giữ role ADMIN. Nếu quy trình vận hành thực tế có ý định dùng `denyPermissions` để tạo "ADMIN giới hạn" (semi-restricted admin), tính năng này sẽ KHÔNG hoạt động như kỳ vọng mà không có bất kỳ cảnh báo/lỗi nào — âm thầm sai.
- **Recommendation**: Ghi rõ ràng trong tài liệu/comment tại `user.model.ts` hoặc RBAC docs rằng `denyPermissions` KHÔNG áp dụng cho ADMIN (do bypass), tránh người vận hành hiểu nhầm. Nếu nghiệp vụ thực sự cần "ADMIN bị giới hạn 1 số quyền", cần thiết kế lại (không dùng bypass string-match tuyệt đối, hoặc thêm bước check `denyPermissions` NGAY CẢ khi bypass).
- **Confidence**: CONFIRMED (code — logic thứ tự rõ ràng, không suy diễn).

---

### RV02-03 — NoSQL operator injection qua `resource`/`action` filter vẫn CÒN NGUYÊN (cross-reference ISS-04/SEC-13, chưa được vá dù các phần khác của RBAC đã hardening đáng kể)
- **Severity**: HIGH (kế thừa nguyên severity từ ISS-04/SEC-13)
- **Category**: Injection (Security) — không phải authorization thuần, nhưng ảnh hưởng trực tiếp tới RBAC data (Permission/Policy)
- **File**: `backend/src/services/rbac/rbac.service.ts`, `backend/src/routes/rbac/rbac.routes.ts`
- **Function/Class**: `getPermissionService()`, `getPolicieService()`
- **Observed Behavior**: `if (resource) filter.resource = resource;` và `if (action) filter.action = action;` — gán THẲNG giá trị từ `query` vào Mongo filter, không ép kiểu `string`. Route tương ứng (`GET /permissions`, `GET /policies`) đều có dòng `validateQuery(...)` bị **comment out** (`// validateQuery(GetPermissionsQueryDTO)`, `// validateQuery(GetPoliciesQueryDTO)`).
- **Evidence**: đọc trực tiếp `rbac.routes.ts` dòng 61 và 144; `rbac.service.ts` dòng 91-92 và 472-473.
- **Impact**: Giữ nguyên đánh giá đã có ở `docs/12_ISSUES_AND_RISKS.md` (ISS-04) — attacker gửi `?resource[$ne]=null` (Express/`qs` tự dựng object) có thể thay đổi ngữ nghĩa truy vấn. **Điểm mới ở review này**: mặc dù cùng thời điểm, RBAC module đã được hardening đáng kể ở nhiều khía cạnh khác (mass assignment B13 — xem RV02-04, validate policy condition, guard xoá khi đang dùng...), lỗ hổng injection cụ thể này KHÔNG nằm trong phạm vi các bản vá đó — cho thấy các đợt sửa RBAC tập trung vào mass-assignment/data-integrity, chưa xử lý tới injection.
- **Recommendation**: Giữ nguyên khuyến nghị ISS-04 — khôi phục `validateQuery` với Zod ép `.string()` nghiêm ngặt cho `resource`/`action`.
- **Confidence**: CONFIRMED (code, xác nhận lại đúng nguyên trạng so với Phase 09/12, không đổi).

---

### RV02-04 — (POSITIVE FINDING) Mass-assignment "B13" ở Role update ĐÃ ĐƯỢC VÁ bằng 2 lớp phòng thủ độc lập
- **Severity**: N/A (không phải lỗ hổng — ghi nhận để không đánh giá nhầm khi tổng hợp)
- **Category**: Authorization (Defense in Depth) — xác nhận AN TOÀN
- **File**: `backend/src/dto/rbac/rbac.dto.ts` (`CreateRoleDTO`/`UpdateRoleDTO` chỉ có field `name`), `backend/src/shared/constants/rbac.constants.ts` (`ROLE_UPDATE_WHITELIST = ["name"]`, cố tình loại `permissions`), `backend/src/services/rbac/rbac.service.ts` (`pickWhitelisted` áp dụng trước `Object.assign`)
- **Function/Class**: `updateRoleService()`, `createRoleService()`
- **Observed Behavior**: Comment trong source tự mô tả đây từng là lỗ hổng "B13" (`PUT /roles/:id` cho phép gửi kèm `{permissions:[...]}` trong body, bypass permission riêng `ROLE_ASSIGN_PERMISSIONS`) — đối chiếu code HIỆN TẠI: **KHÔNG còn tái tạo được lỗ hổng này**. Lớp 1 (Zod DTO ở route) tự động strip field lạ; lớp 2 (`pickWhitelisted` ở service) lọc lại lần nữa độc lập với lớp 1. Muốn đổi `permissions` của 1 Role, bắt buộc phải qua endpoint riêng `POST /roles/:id/assign-permissions` với permission riêng `ROLE_ASSIGN_PERMISSIONS`.
- **Evidence**: đọc trực tiếp cả 3 file nêu trên — khớp hoàn toàn giữa DTO, whitelist, và route permission.
- **Impact**: Không có — đây là xác nhận AN TOÀN, không phải finding cần fix. Ghi lại vì: (1) tài liệu lịch sử Phase 07/09/12 KHÔNG đề cập lỗ hổng "B13" này (có thể đã được vá TRƯỚC thời điểm phân tích 13-phase, hoặc phân tích trước đó không đi sâu vào chi tiết `rbac.service.ts`/`rbac.constants.ts` này) — review này bổ sung xác nhận rõ ràng để tránh trùng lặp công sức nếu có ai review lại module này sau.
- **Confidence**: CONFIRMED AN TOÀN (code review trực tiếp, không phải suy diễn từ comment).

---

### RV02-05 — `Policy` model không có bất kỳ index nào (kể cả `{resource, action}` dùng bởi ABAC lookup)
- **Severity**: INFO (không có tác động runtime hiện tại vì ABAC dead)
- **Category**: Performance (latent — chỉ phát sinh nếu ABAC được kích hoạt lại)
- **File**: `backend/src/models/rbac/policy.model.ts`
- **Function/Class**: N/A (schema-level)
- **Observed Behavior**: Schema chỉ có 4 field (`name`, `resource`, `action`, `condition`), không có `.index(...)` nào. `authorizePermission.middleware.ts` (nhánh ABAC, hiện dead) query `Policy.find({resource, action})` — nếu nhánh này từng được kích hoạt (theo khuyến nghị (a) ở ISS-03), mỗi lần fallback ABAC sẽ collection-scan toàn bộ `Policy`.
- **Evidence**: đọc toàn bộ 14 dòng `policy.model.ts` — không có index nào ngoài `_id` mặc định.
- **Impact**: KHÔNG có tác động hiện tại (ABAC dead runtime, đã CONFIRMED ở Phase 07 §5.3, xác nhận lại không đổi). Chỉ trở thành vấn đề thật nếu có quyết định kích hoạt lại ABAC (ISS-03 khuyến nghị (a)).
- **Recommendation**: Nếu quyết định kích hoạt ABAC, thêm index `{resource:1, action:1}` cho `Policy` TRƯỚC khi bật, tránh lặp lại kiểu vấn đề đã thấy ở `WorkflowInstance` (ISS-05/PERF).
- **Confidence**: CONFIRMED (code).

---

## 4. Đặc biệt: "Authenticated ≠ Authorized" — kết quả kiểm tra riêng cho module RBAC

**KHÔNG phát hiện route nào trong `rbac.routes.ts` chỉ có `authenticate` mà thiếu `authorizePermission`.** Đối chiếu toàn bộ 15 route (5 Permission + 5 Role + 1 assign-permissions + 4 Policy — thực ra 15 endpoint theo đúng liệt kê ở routes file): MỌI route đều có cặp `authenticate` + `authorizePermission("<PERMISSION_CỤ_THỂ>")` — không có route nào rơi vào tình trạng "đăng nhập là đủ, không cần đúng quyền" trong chính module RBAC. Đây là điểm khác biệt so với `POST /api/documents/proposal` (ISS-09, module Documents — ngoài phạm vi review này).

Tuy nhiên, ở mức Ý NGHĨA rộng hơn của "Authenticated ≠ Authorized", RV02-01 và RV02-02 đều là các biến thể của cùng nguyên tắc này:
- RV02-01: 1 user "authenticated" và mang role vừa bị đổi tên thành "ADMIN" sẽ NGAY LẬP TỨC được coi là "authorized cho MỌI THỨ" — dù `permissions` thật của role đó có thể rỗng.
- RV02-02: 1 user "authenticated" với role ADMIN được coi là "authorized cho MỌI THỨ" bất kể `denyPermissions` được cấu hình muốn giới hạn — tức là 1 lớp kiểm soát "authorized nhưng bị giới hạn" (deny) bị vô hiệu hoá hoàn toàn bởi authentication-based bypass.

---

## 5. Không phát hiện vấn đề (đã kiểm tra, không có gì bất thường)

- **User–Role relationship**: 1 user → 1 role (ObjectId ref, `required: true`) — không có multi-role, đơn giản, không phát hiện bug.
- **Role–Permission relationship**: mảng ObjectId ref chuẩn Mongoose, guard chống dangling reference đầy đủ ở CẢ 2 tầng (đọc: `.filter(Boolean)` ở `getUserEffectivePermissions`; ghi: guard chặn xoá Role/Permission đang được dùng ở `deleteRoleService`/`deletePermissionService`) — đây là ĐIỂM MẠNH đáng ghi nhận, không phải chỉ 1 lớp phòng thủ.
- **Permission cache invalidation khi RBAC data đổi**: `updateRoleService` (đổi tên) → clear cache theo user thuộc role (dù không thực sự cần vì tên không ảnh hưởng permission, nhưng an toàn); `assignPermissionsToRoleService` → clear cache đúng scope; `updatePermissionService`/`deletePermissionService` → clear TOÀN BỘ cache (chấp nhận đánh đổi hiệu năng ngắn hạn, hợp lý vì không biết trước phạm vi ảnh hưởng) — tất cả đều ĐÚNG, không phát hiện thiếu sót.
- **Mass assignment Permission/Policy**: `PERMISSION_UPDATE_WHITELIST`/`POLICY_UPDATE_WHITELIST` đều whitelist đúng field cần thiết, không có field nhạy cảm nào lọt qua.
- **Policy condition injection (RCE)**: `assertPolicyConditionSyntaxValid()` được gọi ở CẢ tạo lẫn sửa Policy — dùng evaluator tự viết (không `eval`/`Function`), đã CONFIRMED ở Phase 07 §5.3/§9.4, xác nhận lại không đổi, không đọc lại chi tiết 319 dòng evaluator (ngoài phạm vi thay đổi ở review này).
- **`GET .../:id` routes**: đều có `validateParams(IdParamDTO)` chặn ID sai format trước khi tới service — tránh `CastError` không kiểm soát.

---

## 6. Cross-reference với REVIEW-00/01 và 13-phase analysis (không lặp lại chi tiết)

- RV00-02 (`errorHandler` lộ message lỗi 500) — áp dụng nếu `updateRoleService` gặp lỗi `E11000 duplicate key` (Mongo) khi cố rename Role trùng tên "ADMIN" đang tồn tại — lỗi này KHÔNG phải `ApiError`/`CastError`/`ValidationError`, sẽ rơi vào nhánh lộ message thô (mã lỗi Mongo, tên field/index) — liên quan trực tiếp tới kịch bản RV02-01 bước rename thất bại.
- ISS-01/SEC-05 (đã RESOLVED ở TASK-001) — cùng root cause thiết kế "bypass theo tên chuỗi" với RV02-01, nhưng khác vector (User.role vs Role.name).
- ISS-03 (ABAC dead runtime) — không đọc lại chi tiết, chỉ dùng làm bối cảnh cho RV02-05.
- ISS-04/SEC-13 — RV02-03 xác nhận lại đúng nguyên trạng.
- PERF-05 (thiếu `.lean()` ở list endpoint) — `getPermissionService`/`getRoleService`/`getPolicieService` đều không dùng `.lean()`, khớp finding đã có, không tạo ID mới.

---

## 7. Tổng hợp theo severity

| Severity | Số lượng | ID |
|---|---|---|
| CRITICAL (impact, probability LOW/UNKNOWN) | 1 | RV02-01 |
| HIGH (kế thừa ISS-04) | 1 | RV02-03 |
| MEDIUM | 1 | RV02-02 |
| INFO | 1 | RV02-05 |
| N/A (positive finding) | 1 | RV02-04 |

---

## 8. Unknowns cần xác minh thêm

- RV02-01: dữ liệu Role/Permission thật ở production (nếu khác DB dev đã kiểm tra) — role nào thực sự giữ `ROLE_UPDATE` — quyết định mức độ Probability thật.
- RV02-04: thời điểm chính xác lỗ hổng "B13" được vá (trước hay trong giai đoạn giữa `f4ce8e9` và `5b58fb1`) — không ảnh hưởng kết luận (hiện tại AN TOÀN), chỉ là thông tin lịch sử chưa xác minh được.

---

**REVIEW-02 COMPLETED. Không review module khác ngoài dependency trực tiếp đã liệt kê ở mục 1.**

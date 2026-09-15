# REVIEW-03 — USERS CODE REVIEW

> Phạm vi: `backend/src/{controllers,services,models,dto,routes}/users/` (gồm cả submodule UserAudit). Dependency trực tiếp: `Role` model (đọc lại ở REVIEW-02), `RefreshToken` (đọc lại ở REVIEW-01), `permission.cache.ts`.
> KHÔNG sửa code. KHÔNG chạy lại Phase 01→13. KHÔNG refactor.
> Ngày review: 2026-08-30. Commit: `5b58fb1` (branch `main`) — bao gồm cả các thay đổi đã tự thực hiện ở TASK-001/TASK-002 trong chính phiên làm việc này.

---

## 1. Tài liệu/nguồn đã đọc trước khi review

- `CLAUDE.md`, `docs/00_PROJECT_MEMORY.md`, `docs/03_BACKEND_ANALYSIS.md`, `docs/04_DATABASE_ANALYSIS.md` (mục 4.1/4.2/9 liên quan `User`/`UserAudit`/`RefreshToken`), `docs/07_AUTH_RBAC_ANALYSIS.md`, `docs/module-reviews/{01_AUTH_CODE_REVIEW.md, 02_RBAC_CODE_REVIEW.md}`.
- Source đọc trực tiếp (toàn bộ file):
  - `backend/src/services/users/{users.service.ts, userAudits.service.ts}`
  - `backend/src/controllers/users/{user.controller.ts, userAudit.controller.ts}`
  - `backend/src/routes/users/{user.routes.ts, userAudit.routes.ts}`
  - `backend/src/dto/users/{users.dto.ts, userAudit.dto.ts}`
  - `backend/src/models/users/{user.model.ts, userAudit.model.ts}` (qua Phase 04, xác nhận field/index)
  - Xác minh read-only trên DB dev (1 lệnh, không ghi): role nào đang giữ `USER_RESET_PASSWORD`/`USER_DELETE`/`USER_RESTORE`/`USER_CREATE`.

**Lưu ý quan trọng**: `users.service.ts`/`user.routes.ts`/`user.controller.ts` đã được CHÍNH PHIÊN LÀM VIỆC NÀY sửa ở TASK-001 (chặn `update()` gán ADMIN) và TASK-002 (chặn `create()` gán ADMIN, thêm endpoint `PATCH /:id/role`). Review này đánh giá lại TOÀN BỘ module ở trạng thái HIỆN TẠI (sau các fix đó), không lặp lại chi tiết đã ghi ở TASK-001/002.

---

## 2. Findings

### RV03-01 — `resetPassword()` (Users, admin-triggered) THIẾU hẳn safeguard chặn ADMIN mà chính docstring của nó mô tả
- **Severity**: HIGH (impact CRITICAL nếu bị khai thác — account takeover ADMIN; probability LOW trên DB dev đã kiểm tra)
- **Category**: Authorization / Privilege Escalation (Missing Authorization Check) — Password
- **File**: `backend/src/services/users/users.service.ts`
- **Function/Class**: `resetPassword()` (dòng ~386-415)
- **Observed Behavior**: Docstring ngay phía trên hàm ghi RÕ: *"Nếu role là ADMIN => không cho reset password"* và *"Nếu cố gắng reset password của ADMIN => 400"*. Đọc toàn bộ thân hàm: **KHÔNG có bất kỳ dòng nào kiểm tra `role.name === "ADMIN"`** — chỉ check `user` tồn tại và `isActive`, sau đó set password mới ngay lập tức. So sánh: `disable()` (cùng file) CÓ đúng check này (`Role.findById(user.role).select("name"); if (role?.name === "ADMIN") throw ApiError.badRequest(...)`).
- **Evidence**:
  ```ts
  // users.service.ts — resetPassword(), TOÀN BỘ guard hiện có:
  export const resetPassword = async (targetUserId, newPassword, performedBy) => {
    const user = await User.findById(targetUserId);
    if (!user) throw ApiError.notFound("User không tồn tại");
    if (!user.isActive) throw ApiError.badRequest("User đã bị vô hiệu hóa");
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    // ... KHÔNG có check role ADMIN nào ở đây, khác hẳn disable() cùng file
  };
  ```
  **Xác minh bổ sung (read-only, DB dev)**: hiện chỉ Role `ADMIN` giữ permission `USER_RESET_PASSWORD` (cùng pattern đã thấy với `USER_UPDATE`/`ROLE_UPDATE`).
- **Impact**: Nếu `USER_RESET_PASSWORD` từng được cấp cho 1 role KHÁC ADMIN (kịch bản rất phổ biến trong thực tế — vd role "IT"/helpdesk thường được giao quyền reset mật khẩu cho user khác), người giữ role đó có thể **đặt lại mật khẩu của chính tài khoản ADMIN**, sau đó đăng nhập bằng mật khẩu mới — đây là con đường **account takeover ADMIN hoàn chỉnh**, khác hẳn vector RV02-01 (đổi tên Role) — vector này đơn giản hơn nhiều (chỉ cần 1 request `PATCH /api/users/reset-password/:adminUserId`).
- **Recommendation**: Thêm lại đúng guard mà docstring đã mô tả — copy pattern từ `disable()`:
  ```ts
  const role = await Role.findById(user.role).select("name");
  if (role?.name === "ADMIN") {
    throw ApiError.badRequest("Không thể reset mật khẩu tài khoản ADMIN qua endpoint này");
  }
  ```
- **Confidence**: CONFIRMED (code — đọc trực tiếp, đối chiếu docstring vs implementation, không suy diễn). Probability khai thác thực tế: LOW trên DB dev đã kiểm tra, **UNKNOWN cho production**.

---

### RV03-02 — `getList()` (Users) — NoSQL operator injection qua `role`/`department`, `validateQuery` bị comment out (mở rộng phạm vi ISS-04 sang domain Users, chưa từng được liệt kê)
- **Severity**: HIGH (cùng lớp với ISS-04/SEC-13, chưa từng được liệt kê cho domain Users)
- **Category**: Injection (Security)
- **File**: `backend/src/services/users/users.service.ts`, `backend/src/routes/users/user.routes.ts`
- **Function/Class**: `getList()`
- **Observed Behavior**: `if (role) filter.role = role;` và `if (department) filter.department = department;` — gán THẲNG giá trị query vào Mongo filter, không ép kiểu string. Route `GET /api/users` có dòng `// validateQuery(GetUsersQueryDTO),` bị **comment out**.
- **Evidence**: `user.routes.ts` dòng 47; `users.service.ts` dòng 110-111.
- **Impact**: Giống hệt cơ chế ISS-04 đã ghi nhận cho RBAC/Departments/UserAudit — `?role[$ne]=null` (qs tự dựng object) có thể thay đổi ngữ nghĩa truy vấn danh sách user. **Điểm mới**: `docs/12_ISSUES_AND_RISKS.md` (ISS-04) liệt kê CỤ THỂ `rbac.service.ts`, `department.service.ts`, `userAudits.service.ts` — **KHÔNG liệt kê `users.service.ts:getList`** — đây là 1 instance THÊM của cùng lớp lỗ hổng, chưa từng được ghi nhận ở Phase 09/12.
  Bổ sung: `filter.username = { $regex: keyword, $options: "i" }` — `keyword` cũng không được ép kiểu string (khác domain Documents đã có `escapeRegex()` phòng ReDoS) — cùng 1 route bị ảnh hưởng.
- **Recommendation**: Khôi phục `validateQuery(GetUsersQueryDTO)` ở route (DTO đã viết sẵn, chỉ cần bỏ comment) + ép kiểu `.string()` cho `role`/`department`/`keyword` trong chính DTO đó (cần xác nhận `GetUsersQueryDTO` hiện tại đã ép `.string()` đúng chưa — DTO có khai `role: ObjectIdSchema.optional()` dùng `z.string().regex(...)`, ĐÃ ép string sẵn — nghĩa là chỉ cần bật lại `validateQuery` là đủ vá, không cần sửa DTO).
- **Confidence**: CONFIRMED (code). Đây là finding MỞ RỘNG phạm vi đã biết (ISS-04), không phải hoàn toàn mới về BẢN CHẤT lỗ hổng, nhưng MỚI về VỊ TRÍ (domain Users chưa từng được liệt kê).

---

### RV03-03 — `GET/export /api/user-audits` — cả 3 `validateQuery` đều bị comment out dù DTO đã viết sẵn đầy đủ (cross-reference ISS-04, xác nhận đúng vị trí đã biết + chi tiết mới)
- **Severity**: HIGH (kế thừa ISS-04, đã được named đúng "`userAudits.service.ts:buildAuditFilter`")
- **Category**: Injection (Security) + Resource Exhaustion
- **File**: `backend/src/routes/users/userAudit.routes.ts`, `backend/src/services/users/userAudits.service.ts`
- **Function/Class**: `buildAuditFilter()`, route `GET /`, `GET /export`, `GET /dashboard`
- **Observed Behavior**: `userAudit.dto.ts` đã viết ĐẦY ĐỦ 3 DTO (`GetAuditLogsQueryDTO`, `GetAuditDashboardQueryDTO`, `ExportAuditLogsQueryDTO`) kèm comment giải thích rất chi tiết lý do cần chúng ("nguyên nhân gốc khiến `page`/`limit` không được ép kiểu Number, không có giới hạn `limit` tối đa") — nhưng CẢ 3 route trong `userAudit.routes.ts` đều có dòng `validateQuery(...)` bị **comment out** (`//   validateQuery(GetAuditLogsQueryDTO),` và tương tự cho 2 route còn lại).
- **Evidence**: đọc trực tiếp `userAudit.routes.ts` dòng 34, 41, 48 — cả 3 đều comment.
- **Impact**: (1) Injection: `buildAuditFilter()` gán thẳng `filter.performedBy = performedBy; filter.user = user;` không ép kiểu — đúng cơ chế ISS-04 đã named. (2) **Resource exhaustion MỚI**: vì `validateQuery` tắt, `limit` KHÔNG bị chặn tối đa 100 như DTO dự định — client có thể gọi `GET /api/user-audits?limit=999999` để tải TOÀN BỘ audit log (không giới hạn) vào 1 response JSON — khác với 2 endpoint export (Excel/CSV) đã có `MAX_EXPORT_ROWS=20000` chặn ở tầng service riêng, endpoint JSON list (`GET /`) KHÔNG có bất kỳ cap nào ở tầng service, hoàn toàn phụ thuộc vào DTO đang bị vô hiệu hoá.
- **Recommendation**: Bỏ comment cả 3 dòng `validateQuery` — đây là fix 3 dòng, DTO đã sẵn sàng 100%, không cần viết thêm code.
- **Confidence**: CONFIRMED (code). Phần injection trùng ISS-04 (đã có ID); phần resource-exhaustion do thiếu cap `limit` ở `GET /` JSON là chi tiết bổ sung MỚI so với Phase 09/12.

---

### RV03-04 — `update()` bỏ sót kiểm tra tồn tại `Department` khi chỉ đổi `department` mà không kèm `role`
- **Severity**: MEDIUM
- **Category**: Validation / Data Integrity
- **File**: `backend/src/services/users/users.service.ts`
- **Function/Class**: `update()`
- **Observed Behavior**: Điều kiện check department hiện tại: `if (role?.name === "USER" && department) { ... Department.findById(department) ... }`. Biến `role` CHỈ được gán giá trị khi `roleId !== undefined` (tức client có gửi kèm field `role` trong body). Nếu client CHỈ gửi `{ department: "<id mới>" }` (không gửi `role`), `role` vẫn là `undefined` → điều kiện `role?.name === "USER"` luôn `false` (dù user hiện tại thực sự có role USER) → **check `Department.findById(department)` bị bỏ qua hoàn toàn** → `user.department = department` được gán thẳng ở bước 7 mà không xác minh department đó có tồn tại thật hay không.
- **Evidence**: `users.service.ts` dòng 207-211 (điều kiện) đối chiếu dòng 227 (`if (department !== undefined) user.department = department;` — không có validate riêng).
- **Impact**: Admin có thể (vô tình gõ nhầm ID, hoặc cố ý) gán 1 `department` không tồn tại cho 1 user role USER mà không nhận được lỗi nào — tạo dangling reference (`user.department` trỏ tới document không tồn tại) — populate sau này (`getById`/`getList`/`getMeService`) sẽ trả `department: null` âm thầm, không rõ nguyên nhân khi debug.
- **Recommendation**: Đổi điều kiện thành kiểm tra dựa trên role HIỆN TẠI của user (nếu `role` không đổi) HOẶC role MỚI (nếu có đổi): `const effectiveRoleName = role?.name ?? (await Role.findById(user.role).select("name"))?.name; if (effectiveRoleName === "USER" && department) { ... }` — hoặc đơn giản hơn: luôn `Department.findById(department)` bất cứ khi nào `department !== undefined`, không phụ thuộc điều kiện role.
- **Confidence**: CONFIRMED (code — đọc trực tiếp logic điều kiện, không suy diễn).

---

### RV03-05 — `UpdateUserDTO.isActive` được validate nhưng bị `update()` ÂM THẦM BỎ QUA (dead field)
- **Severity**: LOW
- **Category**: Validation / API Consistency — "Update whitelist"
- **File**: `backend/src/dto/users/users.dto.ts`, `backend/src/services/users/users.service.ts`
- **Function/Class**: `UpdateUserDTO` (schema), `update()` (service)
- **Observed Behavior**: `UpdateUserDTO` khai `isActive: z.boolean().optional()` — client gửi `{isActive: false}` sẽ PASS validate (không lỗi 400). Nhưng `update()` chỉ destructure `{ fullName, role, department, username } = data` — **`isActive` không hề được đọc/gán ở bất kỳ đâu trong hàm**. Kết quả: request thành công (200 OK), nhưng field `isActive` không có tác dụng gì — client dễ lầm tưởng đã vô hiệu hoá/kích hoạt user qua endpoint này (đúng ra phải dùng `DELETE /:id` để disable hoặc `PATCH /restore/:id` để kích hoạt lại).
- **Evidence**: `users.dto.ts` dòng 34 (`isActive: z.boolean().optional()`) đối chiếu `users.service.ts` dòng 178 (destructure không có `isActive`).
- **Impact**: UX/API gây hiểu nhầm — không phải lỗ hổng bảo mật (không có cách nào lợi dụng field bị bỏ qua để làm hại), nhưng vi phạm nguyên tắc "API im lặng chấp nhận field không có tác dụng" (silent no-op), gây khó debug cho FE/consumer API.
- **Recommendation**: Hoặc (a) xoá `isActive` khỏi `UpdateUserDTO` (bắt buộc dùng đúng endpoint `disable`/`restore` cho việc này — nhất quán với thiết kế hiện tại), hoặc (b) nếu cố ý cho phép đổi qua đây, thêm xử lý tương ứng trong `update()` (kèm đúng guard chặn ADMIN/audit log riêng như `disable()`/`restore()` đã có).
- **Confidence**: CONFIRMED (code, đối chiếu trực tiếp DTO vs service, không suy diễn).

---

## 3. Đặc biệt theo yêu cầu — kết luận riêng từng mục checklist

| Mục | Kết luận |
|---|---|
| **CRUD** | Đầy đủ Create/Read(list+detail)/Update/Disable(soft-delete)/Restore. Không có hard-delete cho User (xem mục 4, positive finding). |
| **User lifecycle** | `isActive:true` (default) → có thể `disable()` (soft) → `restore()` (khôi phục) → vòng lặp lại được. Không có trạng thái "archived"/"pending approval" nào khác. |
| **Department** | Bắt buộc khi role = USER lúc `create()` (validate đúng). Lúc `update()`: có gap khi chỉ đổi `department` riêng lẻ — xem RV03-04. |
| **Role** | Không còn cách nào gán ADMIN qua `create()`/`update()` (đã fix TASK-001/002). `assignRole()` (endpoint riêng, mới wire ở TASK-002) cũng chặn ADMIN + chặn tự đổi role chính mình. |
| **Password** | `changePassword()` (tự đổi, cần mật khẩu cũ) và `resetPassword()` (admin, không cần mật khẩu cũ) — RV03-01 là gap nghiêm trọng nhất tìm được ở mục này. |
| **Status** (`isActive`) | Toggle qua đúng 2 endpoint chuyên biệt (`disable`/`restore`), có audit log riêng cho mỗi hành động — thiết kế rõ ràng, chỉ trừ RV03-05 (field thừa ở DTO khác). |
| **Validation** | Format (Zod) tốt ở `create`/`changePassword`; RV03-02/03-03 là 2 gap injection do `validateQuery` bị tắt; RV03-04 là gap logic nghiệp vụ. |
| **Update whitelist** | `update()` chỉ gán đúng 4 field dự kiến (`fullName`,`role`,`department`,`username`) — KHÔNG có mass-assignment kiểu `Object.assign(user, data)` (khác RBAC "B13" trước khi vá) — AN TOÀN, chỉ có gap "field thừa không tác dụng" (RV03-05), không phải "field thừa CÓ tác dụng ngoài ý muốn". |
| **Duplicate username/email** | `create()`/`update()` chỉ check trùng `username` (không có field `email` trong DTO Users — email chỉ tồn tại ở domain Auth/`register()`, đã biết từ Phase 07). Không phát hiện gap mới. |
| **Self-update** | `updateMeService()` whitelist đúng `["fullName","username"]`, chặn hoàn toàn `role`/`department`/`password`/`isActive` — CONFIRMED an toàn. |
| **Admin-update** | Đã hardening đầy đủ qua TASK-001/002 (chặn ADMIN, invalidate cache đúng lúc). |
| **Authorization** | Mọi route đều có `authorizePermission` riêng biệt theo hành động (không dùng chung 1 permission cho nhiều thao tác nhạy cảm) — điểm mạnh. |
| **Privilege escalation** | RV03-01 là vector MỚI tìm được (khác ISS-01 cũ đã fix) — qua `resetPassword()` thay vì qua đổi role. |
| **Audit** | Mọi hành động ghi state (create/update/disable/restore/changePassword/resetPassword/assignRole) đều có `UserAudit.create()` tương ứng — bao phủ tốt, không phát hiện hành động nào bị bỏ sót audit. |
| **Delete behavior** | Không có hard-delete User trong toàn bộ codebase (chỉ soft-delete qua `disable()`) — xem mục 4, đây là điểm mạnh so với Document/Asset (ISS-02 hard-delete không check reference). |

---

## 4. Không phát hiện vấn đề (đã kiểm tra, không có gì bất thường)

- **Không có hard-delete User** ở bất kỳ đâu trong codebase — loại bỏ hoàn toàn rủi ro kiểu ISS-02 (mất dữ liệu vĩnh viễn không check reference) cho riêng domain User. Đây là thiết kế AN TOÀN, đáng ghi nhận.
- **`disable()` không gọi `clearPermissionCache()`** — đã kiểm tra kỹ, KHÔNG phải gap: `authenticate` middleware load `isActive` TƯƠI từ DB ở MỌI request (đã xác nhận từ TASK-001/REVIEW-01) và chặn 401 NGAY LẬP TỨC nếu `!isActive`, xảy ra TRƯỚC khi `authorizePermission`/permission cache được chạm tới — nên user bị disable mất quyền truy cập ngay từ request kế tiếp, bất kể trạng thái cache.
- **Mass assignment ở `update()`**: KHÔNG có — hàm gán field thủ công từng dòng (`if (x !== undefined) user.x = x`), không dùng `Object.assign(user, data)` trần — khác hẳn pattern đã từng là lỗ hổng "B13" ở RBAC (REVIEW-02) trước khi vá.
- **`changePassword()`**: yêu cầu đúng mật khẩu cũ trước khi đổi — không có gap.
- **Audit log cho `resetPassword()`/`disable()`**: đều ghi đúng `performedBy` (người thực hiện hành động, KHÔNG phải người bị tác động) — chính xác về mặt truy vết trách nhiệm.

---

## 5. Cross-reference với REVIEW-00/01/02 và 13-phase analysis (không lặp lại chi tiết)

- ISS-04/SEC-13 (NoSQL operator injection) — RV03-02/RV03-03 mở rộng phạm vi đã biết sang domain Users (cả main list lẫn UserAudit).
- PERF-05 (thiếu `.lean()` ở list endpoint) — `getList()` (Users) và `getAuditLogsService()` (UserAudit) đều không dùng `.lean()`, khớp finding đã có, không tạo ID mới.
- RV00-02 (`errorHandler` lộ message lỗi 500) — không phát hiện thêm trigger mới trong module này ngoài các trường hợp đã nêu ở REVIEW-01/02.
- ISS-01/SEC-05/SEC-08 (đã RESOLVED ở TASK-001), Việc 1/2/3 TASK-002 — không lặp lại, xem trực tiếp `docs/tasks/TASK-001.md`/`TASK-002.md`.
- RV02-01 (RBAC — đổi tên Role để hijack bypass ADMIN) — RV03-01 là 1 VECTOR KHÁC dẫn tới cùng loại hậu quả (chiếm quyền ADMIN), nhưng qua `resetPassword()` thay vì đổi `Role.name` — 2 finding độc lập, không trùng lặp, nên giữ riêng.

---

## 6. Tổng hợp theo severity

| Severity | Số lượng | ID |
|---|---|---|
| HIGH | 3 | RV03-01, RV03-02, RV03-03 |
| MEDIUM | 1 | RV03-04 |
| LOW | 1 | RV03-05 |

**0 CRITICAL mới** (RV03-01 xếp HIGH thay vì CRITICAL vì Probability hiện tại LOW trên DB đã kiểm tra, nhất quán với cách xếp hạng RV02-01).

---

## 7. Unknowns cần xác minh thêm

- RV03-01/RV03-02/RV03-03: dữ liệu Role/Permission thật ở production (nếu khác DB dev đã kiểm tra) — quyết định Probability thật của từng finding.
- RV03-04: chưa xác nhận có bao nhiêu user hiện tại (nếu có) đang mang `department` dangling reference do gap này gây ra trong quá khứ — cần query riêng nếu muốn biết (ngoài phạm vi review, chỉ ghi nhận gap logic).

---

**REVIEW-03 COMPLETED. Không review module khác ngoài dependency trực tiếp đã liệt kê ở mục 1.**

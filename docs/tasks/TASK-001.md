# TASK-001 — ISS-01: Privilege Escalation lên ADMIN qua `PUT /api/users/:id`

## Trạng thái

**IMPLEMENTED** (2026-08-30) — code đã sửa, type-check PASS. **CHƯA có test runtime/manual** (người dùng chủ động chọn không làm hướng testing khi APPROVE). Xem "Kết quả IMPLEMENT" ở cuối file.

## Liên kết

- Nguồn gốc: `docs/12_ISSUES_AND_RISKS.md` §ISS-01 (Critical Risk #1), `docs/09_SECURITY_ANALYSIS.md` §SEC-05, `docs/07_AUTH_RBAC_ANALYSIS.md` §9.2/§9.3
- Loại task: SECURITY (theo CLAUDE.md §8) — thuộc nhóm HIGH-RISK/ARCHITECTURAL (SKILL.md §8: thay đổi authorization) → workflow bắt buộc: `UNDERSTAND → VERIFY → DEEP ANALYSIS → IMPACT ANALYSIS → PLAN → WAIT FOR APPROVAL → IMPLEMENT → TEST → REVIEW → DOCUMENT`. Task này dừng ở bước **PLAN**, đang ở **WAIT FOR APPROVAL**.

## Objective

Phân tích đầy đủ (không sửa code) lỗ hổng leo thang đặc quyền ADMIN qua `PUT /api/users/:id`, xác nhận lại bằng source code hiện tại (commit `5b58fb1`), lập kế hoạch khắc phục để người dùng phê duyệt trước khi implement.

---

## Xác minh nguồn (source verification — 2026-08-30, commit `5b58fb1`)

Toàn bộ evidence dưới đây được đọc trực tiếp từ source hiện tại, không chỉ dựa vào tài liệu Phase 07/09/12 — kết quả **khớp hoàn toàn** với các phase đó, không phát hiện thay đổi nào giữa commit `f4ce8e9` (mốc phân tích cũ) và `5b58fb1` (hiện tại) ở vùng code liên quan.

---

## 1. ROOT CAUSE

Hàm `update()` trong `users.service.ts` — service thực sự đứng sau endpoint `PUT /api/users/:id` — cho phép gán bất kỳ `roleId` nào (bao gồm role có `name === "ADMIN"`) vào `user.role` mà **không có bất kỳ safeguard nào chặn**. Trong khi đó, cùng file này có sẵn hàm `assignRole()` với đầy đủ 2 safeguard cần thiết (chặn gán ADMIN + `clearPermissionCache()`), nhưng hàm này **là dead code** — không được import ở `user.controller.ts`, không có route nào gọi tới.

→ Root cause là **thiếu kết nối giữa 2 luồng code đã tồn tại** (an toàn nhưng chết, và không an toàn nhưng đang chạy), không phải thiếu ý tưởng thiết kế.

- **CONFIDENCE: HIGH** — xác nhận trực tiếp bằng đọc source + `grep` (không có kết quả `assignRole` trong `backend/src/controllers/` hay `backend/src/routes/`).

---

## 2. AFFECTED FILES

| File | Vai trò trong lỗ hổng |
|---|---|
| `backend/src/services/users/users.service.ts` | Chứa cả `update()` (lỗi) và `assignRole()` (an toàn nhưng dead code) |
| `backend/src/controllers/users/user.controller.ts` | Import `update` (qua tên `updateUser`), KHÔNG import `assignRole` |
| `backend/src/routes/users/user.routes.ts` | Gắn `PUT /:id` → `updateUser`, chỉ yêu cầu permission `USER_UPDATE` (dòng 60-66) |
| `backend/src/middlewares/authorizePermission.middleware.ts` | Nơi ADMIN bypass toàn bộ permission check bằng so khớp chuỗi `role.name === "ADMIN"` (dòng 74-77) |
| `backend/src/middlewares/auth.middleware.ts` | Load `req.user.role` **mới hoàn toàn từ DB mỗi request** (dòng 44-46), không cache — liên quan trực tiếp tốc độ lỗ hổng có hiệu lực (xem mục 6) |
| `backend/src/services/rbac/permission.cache.ts` | `clearPermissionCache()` tồn tại sẵn, nhưng không được `update()` gọi |
| `backend/src/dto/users/users.dto.ts` | `UpdateUserDTO.role` chỉ validate format ObjectId (regex 24 hex), không validate giá trị/role đích |

---

## 3. AFFECTED FUNCTIONS/CLASSES

- `update()` — `backend/src/services/users/users.service.ts:166-219` (hàm lỗi, đang chạy thật)
- `assignRole()` — `backend/src/services/users/users.service.ts:454-509` (hàm an toàn, dead code — tham khảo để tái sử dụng pattern)
- `authorizePermission()` — `backend/src/middlewares/authorizePermission.middleware.ts:58-140` (nơi hệ quả của lỗ hổng phát huy tác dụng — ADMIN bypass)
- `create()` — `backend/src/services/users/users.service.ts:25-66` — **quan sát liên quan, NGOÀI PHẠM VI task này** (xem mục "Ghi chú ngoài phạm vi" cuối tài liệu)

---

## 4. CURRENT BEHAVIOR (trace đầy đủ flow)

```
PUT /api/users/:id  { role: "<ADMIN_role_id>" }
  │
  ├─ authenticate
  │     → verify JWT (HS256 whitelist, OK)
  │     → User.findById(decoded.id).populate("role","name")  [LOAD LẠI TỪ DB, KHÔNG CACHE]
  │     → req.user = { _id, role: <role hiện tại của NGƯỜI GỌI>, department, isActive, permissions: [] }
  │
  ├─ authorizePermission("USER_UPDATE")
  │     → nếu req.user.role.name === "ADMIN" → bypass (không áp dụng ở đây trừ khi người gọi vốn đã là ADMIN)
  │     → ngược lại: getCachedPermissions(req.user._id) → cần "USER_UPDATE" trong danh sách quyền
  │        (TTL cache 5 phút — nhưng đây là quyền của NGƯỜI GỌI, không phải người BỊ đổi role)
  │     → PASS nếu người gọi có "USER_UPDATE" (role nào có quyền này trong DB thật — UNKNOWN, xem mục "Unknowns")
  │
  ├─ validateBody(UpdateUserDTO)
  │     → role: chỉ check format regex /^[0-9a-fA-F]{24}$/ — KHÔNG kiểm tra role đó là gì
  │
  └─ updateUser controller → update(id, body, performedBy)
        1. User.findById(id) → tồn tại, isActive === true
        2. role = await Role.findById(roleId)   // resolve ROLE ĐÍCH — có thể là ADMIN
        3. KHÔNG có bước nào check role.name === "ADMIN"
        4. user.role = role._id
        5. user.save()   ← GHI THẲNG VÀO DB, user :id giờ có role ADMIN
        6. UserAudit.create({ action: "UPDATE", note: "Cập nhật thông tin user" })
           ← note CHUNG CHUNG, không ghi rõ "đổi role từ X sang ADMIN" (khác `assignRole()`
             có note chi tiết "Gán role từ {oldRole} -> {roleId}")
        7. KHÔNG gọi clearPermissionCache(user._id)
```

**Điểm xác nhận MỚI trong lần verify này (không có trong Phase 07, làm rõ thêm mức độ nghiêm trọng)**:
`authenticate` middleware (`auth.middleware.ts:44-46`) load `req.user.role` **mới hoàn toàn từ MongoDB ở MỌI request**, không qua bất kỳ cache nào cho riêng field `role`. Điều này có nghĩa: lỗ hổng thiếu `clearPermissionCache()` ở `update()` **KHÔNG làm chậm** việc leo thang có hiệu lực đối với chính nạn nhân/kẻ tấn công — ngay **request kế tiếp** sau khi `update()` lưu `role = ADMIN` vào DB, `authenticate` sẽ đọc thấy `role.name === "ADMIN"` và `authorizePermission` sẽ bypass hoàn toàn (bước 2 ở mục 5.2 Phase 07), không cần chờ hết TTL cache 5 phút nào cả. Cache 5 phút (permission cache) chỉ ảnh hưởng tới các permission RBAC coarse-grained thông thường (bước 3-4), không ảnh hưởng tới nhánh ADMIN bypass (bước 2, so khớp string trực tiếp trên `req.user.role.name` vừa load tươi).
→ Việc thiếu `clearPermissionCache()` (SEC-08 / Phase 07 §9.3) là vấn đề **thật nhưng tách biệt và ít nghiêm trọng hơn** so với chính lỗ hổng escalate-lên-ADMIN — nó chỉ gây ra cửa sổ tối đa 5 phút permission cũ còn hiệu lực khi đổi role giữa các role KHÔNG PHẢI ADMIN (vd downgrade quyền). Đối với escalate lên ADMIN, tác động là **tức thời ở request kế tiếp**, không phải "tối đa 5 phút" như suy diễn ban đầu nếu chỉ đọc riêng phần cache.

- **CONFIDENCE: HIGH** (đọc trực tiếp `auth.middleware.ts` + `authorizePermission.middleware.ts`, không suy diễn).

---

## 5. EXPECTED SECURE BEHAVIOR

Theo khuyến nghị đã có sẵn ở `docs/12_ISSUES_AND_RISKS.md` §6 (#1) và được xác nhận hợp lý qua source review:

1. **Immediate**: `update()` phải chặn gán `role.name === "ADMIN"` — tối thiểu là chặn tuyệt đối qua endpoint cập nhật thông thường này (đồng nhất với hành vi `assignRole()` đã viết sẵn: `if (role.name === "ADMIN") throw ApiError.badRequest(...)`, không có ngoại lệ ngay cả khi người gọi vốn đã là ADMIN — xem mục "Quyết định cần chốt" bên dưới).
2. `update()` phải gọi `clearPermissionCache(user._id.toString())` mỗi khi `role` thực sự thay đổi (kể cả không phải escalate — áp dụng luôn cho downgrade, khắc phục luôn SEC-08/§9.3 cùng lúc vì cùng 1 vị trí sửa).
3. Audit log khi đổi role nên ghi rõ ràng như `assignRole()` (`"Gán role từ {oldRole} -> {roleId}"`) thay vì note chung chung `"Cập nhật thông tin user"` — giúp truy vết sau này.
4. (Long-term, KHÔNG thuộc phạm vi immediate fix, chỉ ghi nhận theo đúng khuyến nghị đã có) — tách hẳn việc "đổi role" thành 1 endpoint/permission riêng (`ROLE_ASSIGN`) khác với "cập nhật thông tin user" (`USER_UPDATE`), có audit log riêng.

---

## 6. ATTACK / RISK SCENARIO (mức source-code review, không exploit thật)

**Kịch bản**:
1. Attacker có tài khoản hợp lệ với role bất kỳ SỞ HỮU permission `USER_UPDATE` (role nào có quyền này trong DB thật là **UNKNOWN** — xem mục Unknowns).
2. Attacker gọi `PUT /api/users/<chính_ID_của_mình_hoặc_ID_bất_kỳ>` với body `{ "role": "<ObjectId của Role có name=ADMIN>" }`.
3. Không có bước nào trong middleware chain hay trong `update()` chặn request này — `roleId` chỉ cần đúng format ObjectId hợp lệ và trỏ tới 1 Role có thật trong DB.
4. `user.role` được ghi thành ADMIN, lưu vào DB ngay lập tức.
5. Ngay request kế tiếp của chính attacker (nếu tự đổi role cho mình) hoặc của nạn nhân bị đổi role (nếu attacker đổi cho user khác rồi đợi họ gọi API), `authenticate` load lại `role.name === "ADMIN"` từ DB → `authorizePermission` bypass hoàn toàn ở MỌI endpoint khác trong hệ thống, bất kể route đó yêu cầu permission gì.
6. Từ đây, attacker (hoặc tài khoản vừa bị thao túng) có toàn quyền: đọc/sửa/xoá mọi Document, mọi User, mọi RBAC config, export dữ liệu toàn hệ thống — không còn giới hạn permission nào có tác dụng.

**Điều kiện tiên quyết để khai thác được**: attacker (hoặc tài khoản họ chiếm được) phải có sẵn permission `USER_UPDATE`. Không cần biết trước ID chính xác của Role ADMIN — có thể dò được nếu attacker cũng có quyền `GET /api/rbac/roles` (permission RBAC thường đi cùng nhóm quản trị), hoặc nếu `USER_UPDATE` vô tình được cấp cho 1 role không nên có (vd role "IT" nếu thực tế DB gán rộng hơn thiết kế "trên giấy" — theo `rolePermission.map.ts` không có bằng chứng liệt kê `USER_UPDATE` cho role nào ngoài ẩn ý ADMIN, nhưng file này **không được thực thi** — dữ liệu Role/Permission thật là UNKNOWN, đã ghi nhận từ Phase 07/09/12).

**Mức độ nghiêm trọng nếu khai thác được**: CRITICAL — vô hiệu hoá toàn bộ mô hình RBAC của hệ thống chỉ bằng 1 request.

- **CONFIDENCE: CONFIRMED (code)**, mức độ khai thác thực tế phụ thuộc dữ liệu Role/Permission thật trong MongoDB — **UNKNOWN** (không thể xác nhận bằng static analysis, kế thừa nguyên trạng thái từ Phase 07/09/12, không giải quyết thêm ở task này).

---

## 7. API IMPACT

- Endpoint bị ảnh hưởng: `PUT /api/users/:id` (duy nhất — không có endpoint nào khác gọi `update()` hay `assignRole()`).
- **Breaking change tiềm năng**: nếu hiện tại có bất kỳ luồng vận hành thật nào đang dùng `PUT /api/users/:id` để gán role ADMIN cho user mới (vd quy trình thăng cấp admin thủ công hợp pháp) — luồng đó sẽ **bị chặn** sau khi fix. Cần xác nhận với người dùng có tồn tại luồng vận hành như vậy không (xem mục "Quyết định cần chốt").
- Response format: không đổi (`ApiError.badRequest` khi bị chặn — cùng format lỗi hiện có, không phải thay đổi tuỳ tiện response schema).
- `OpenAPI` (`backend/src/docs/openAPI.yaml`): cần rà soát xem mô tả `PUT /api/users/:id` có ghi chú hành vi với field `role` không — nếu path đổi hành vi (chặn ADMIN) cần cập nhật description tương ứng khi implement (chưa đọc phần OpenAPI của endpoint này trong task này — sẽ đọc ở bước IMPLEMENT nếu được duyệt).
- Không có consumer frontend (repo không có frontend — Phase 06).

---

## 8. DATABASE IMPACT

- **Không cần migration schema** — `Role.name` đã tồn tại sẵn, không thêm field mới cho fix Immediate/Short-term.
- Không có thay đổi index.
- Dữ liệu hiện có: **cần lưu ý** — nếu đã có user nào bị escalate lên ADMIN từ trước (qua chính lỗ hổng này, trước khi fix), fix code **không tự động phát hiện hay rollback** các user đã bị ảnh hưởng trong quá khứ. Đây là hành động vận hành riêng (rà soát `User` collection tìm bất thường), **ngoài phạm vi code fix**, cần khuyến nghị người dùng làm thủ công nếu nghi ngờ (UNKNOWN — không thể xác nhận từ source liệu đã có khai thác thật hay chưa).
- (Long-term, không thuộc scope Immediate) nếu tách riêng permission `ROLE_ASSIGN`, cần thêm 1 bản ghi `Permission` mới + gán vào Role phù hợp — là thay đổi dữ liệu, không phải schema.

---

## 9. RBAC IMPACT

- Sau fix Immediate: **không role nào** (kể cả ADMIN gọi qua endpoint này) có thể gán role ADMIN cho ai qua `PUT /api/users/:id` nữa — đây là thay đổi hành vi authorization có chủ đích, khớp với `assignRole()` (vốn cũng chặn tuyệt đối, không có ngoại lệ cho người gọi là ADMIN).
- Không ảnh hưởng tới các role khác (đổi từ USER → IT, USER → TRUONG_KHOA... vẫn hoạt động bình thường, chỉ chặn riêng đích đến là ADMIN).
- Việc gọi thêm `clearPermissionCache()` khi role đổi (mọi role, không riêng ADMIN) sẽ làm quyền mới có hiệu lực **ngay lập tức** thay vì tối đa 5 phút — cải thiện tính nhất quán RBAC nói chung, không phải chỉ riêng vá lỗ hổng.
- Không đụng tới tầng ABAC/Policy (đã xác nhận dead runtime, không liên quan tới fix này).

---

## 10. REGRESSION RISKS

| Rủi ro | Mức độ | Ghi chú |
|---|---|---|
| Chặn nhầm 1 luồng vận hành hợp pháp đang dùng `PUT /:id` để gán ADMIN | **CẦN XÁC NHẬN TRƯỚC KHI IMPLEMENT** | Xem "Quyết định cần chốt" — nếu tồn tại luồng này, cần giải pháp thay thế trước khi chặn |
| Đổi role khác ADMIN (USER→IT, IT→TRUONG_KHOA...) bị ảnh hưởng ngoài ý muốn | THẤP | Logic thêm chỉ là 1 `if (role.name === "ADMIN") throw` chèn thêm, không đổi nhánh xử lý các role khác |
| Gọi `clearPermissionCache()` thêm ở `update()` gây lỗi nếu import sai đường dẫn | THẤP | Hàm đã tồn tại, `assignRole()` cùng file đã import & dùng đúng cách — chỉ cần thêm import tương tự |
| Audit log format đổi (`note` chi tiết hơn) làm vỡ code khác đang parse `note` theo string cố định | THẤP-TRUNG BÌNH | Cần `grep` toàn repo xem có nơi nào parse `UserAudit.note` theo nội dung cụ thể không — **chưa kiểm tra trong task này**, cần làm ở bước IMPLEMENT |
| User hiện tại đã lỡ bị escalate (dữ liệu cũ) không được fix code xử lý | TRUNG BÌNH (vận hành, không phải regression code) | Cần hành động thủ công riêng, xem mục 8 |

---

## 11. TESTING REQUIREMENTS

Hiện trạng: **dự án không có bất kỳ file test nào**, và xác nhận lại ở phiên trước (`docs/00_PROJECT_MEMORY.md`, mục cập nhật 2026-08-30) rằng **Jest/ts-jest không có trong `package.json`/`package-lock.json` hiện tại** dù `tsconfig.test.json` còn tham chiếu jest types. Nghĩa là:

- **Không có baseline test nào để chạy trước khi sửa** (baseline test theo SKILL.md §14 không khả thi ở dạng automated hiện tại).
- Nếu muốn test tự động cho fix này, phải **cài đặt `jest`/`ts-jest`/`@types/jest` trước** — đây là quyết định ngoài phạm vi 1 bug fix nhỏ (thêm dependency mới, theo CLAUDE.md §25 cần giải thích lý do và có thể cần task riêng "Testing Strategy setup").
- **Đề xuất test tối thiểu nếu được duyệt cài Jest** (unit test cho `update()`):
  1. Gọi `update()` với `roleId` trỏ tới Role có `name: "ADMIN"` → phải throw `ApiError` (badRequest), `user.role` trong DB **không đổi**.
  2. Gọi `update()` với `roleId` trỏ tới Role khác (vd `"IT"`) → thành công, `user.role` cập nhật đúng, `clearPermissionCache` được gọi đúng 1 lần với đúng `userId`.
  3. Gọi `update()` không truyền `roleId` → không gọi `clearPermissionCache`, hành vi các field khác (fullName/username/department) không đổi so với hiện tại.
  4. Gọi `update()` đổi role về CHÍNH role hiện tại (không thực sự đổi) → không cần gọi `clearPermissionCache` (tối ưu, tránh clear cache không cần thiết) — **quyết định thiết kế cần chốt ở bước Plan, không bắt buộc**.
- **Nếu KHÔNG được duyệt cài Jest**: phải test thủ công qua HTTP client thật (Postman/curl) trên môi trường dev có DB kết nối thật, kèm ghi lại kết quả rõ ràng (theo CLAUDE.md §28 — không được nói "đã test" nếu chưa chạy thật). Cần ít nhất 1 tài khoản có `USER_UPDATE`, 1 Role có `name: "ADMIN"` sẵn trong DB dev để thử.
- Regression test thủ công tối thiểu: `PUT /:id` đổi username/fullName/department (không đụng role) phải vẫn hoạt động y hệt trước fix.

---

## 12. IMPLEMENTATION PLAN (đề xuất — CHƯA THỰC HIỆN, chờ duyệt)

### Bước 1 — Immediate fix (phạm vi tối thiểu, khớp khuyến nghị Immediate+Short-term trong `12_ISSUES_AND_RISKS.md`)

Sửa `update()` trong `backend/src/services/users/users.service.ts`:

1. Sau khi `role = await Role.findById(roleId)` thành công (bước 4 hiện tại), thêm chặn:
   ```ts
   if (role.name === "ADMIN") {
     throw ApiError.badRequest("Không thể gán role ADMIN qua endpoint này");
   }
   ```
2. Sau `await user.save()`, nếu `role !== undefined` **và** role thực sự đổi so với role cũ (so sánh `oldRoleId !== role._id.toString()`), gọi:
   ```ts
   clearPermissionCache(user._id.toString());
   ```
   (import `clearPermissionCache` từ `../rbac/permission.cache` — đã có sẵn import này trong file, dùng chung).
3. Cải thiện `note` trong `UserAudit.create()` để ghi rõ khi có đổi role, tương tự `assignRole()` — **cần kiểm tra trước** không có nơi nào parse `note` theo nội dung cố định (regression risk đã nêu ở mục 10).

### Bước 2 — Quyết định cần chốt TRƯỚC khi code (câu hỏi cho người duyệt)

1. **Có tồn tại luồng vận hành hợp pháp nào hiện dùng `PUT /api/users/:id` để tạo/thăng cấp ADMIN không?** Nếu có, cần điểm thay thế (vd dùng `create()` với `role=ADMIN` — hàm này hiện KHÔNG bị chặn, xem "Ghi chú ngoài phạm vi") trước khi merge fix.
2. **Việc kích hoạt (wire) `assignRole()` vào 1 route mới** (long-term recommendation) có nằm trong phạm vi task này không, hay để task riêng sau? Đề xuất: **để task riêng** — task này chỉ khắc phục lỗ hổng ở `update()`, không mở rộng thêm endpoint mới (đúng nguyên tắc "không mở rộng scope" CLAUDE.md §9/§26).
3. Có cần rà soát dữ liệu `User` hiện tại trong DB thật để phát hiện user nào đã bị escalate ngoài ý muốn trước khi fix không? (hành động vận hành, không phải code).

### Bước 3 — Sau khi có quyết định ở Bước 2

- Implement đúng phạm vi Bước 1.
- Chạy test theo mục 11 (tuỳ theo quyết định có cài Jest hay test thủ công).
- `git diff` review — đảm bảo chỉ thay đổi trong `update()`, không đụng `assignRole()`, không đụng file khác ngoài phạm vi.
- Cập nhật `docs/12_ISSUES_AND_RISKS.md` (đánh dấu ISS-01 đã fix, hạ Risk Classification) + `docs/09_SECURITY_ANALYSIS.md` (SEC-05) + `docs/07_AUTH_RBAC_ANALYSIS.md` (§9.2) — đổi trạng thái từ "CONFIRMED ISSUE" sang "RESOLVED" kèm ngày/commit fix.
- Cập nhật `docs/00_PROJECT_MEMORY.md` (major security finding được xử lý — theo CLAUDE.md §29).
- Cập nhật task này sang trạng thái `DONE`.

---

## GHI CHÚ NGOÀI PHẠM VI (không xử lý ở task này, chỉ ghi nhận theo CLAUDE.md §26 — không blind refactor)

- `create()` (`users.service.ts:25-66`) cũng **không chặn** `role.name === "ADMIN"` khi tạo user mới — về mặt kỹ thuật, bất kỳ ai có permission `USER_CREATE` cũng có thể tạo thẳng 1 user với role ADMIN ngay từ đầu, không cần qua `update()`. Đây có thể là hành vi **có chủ đích** (đường hợp pháp duy nhất để tạo ADMIN mới) hoặc **cùng 1 lớp lỗ hổng** chưa được ISS-01/SEC-05 liệt kê riêng — **UNKNOWN, cần người dùng xác nhận ý đồ thiết kế**. Không đưa vào phạm vi sửa của TASK-001 vì người dùng chỉ yêu cầu phân tích ISS-01 (endpoint `update`), nhưng nêu ra vì liên quan trực tiếp tới "Quyết định cần chốt" ở Bước 2.

---

## UNKNOWNS (kế thừa từ Phase 07/09/12, không giải quyết thêm ở task này)

- Role nào thực sự có `USER_UPDATE` trong DB thật — quyết định mức độ khai thác thực tế.
- Đã từng có user nào bị escalate qua lỗ hổng này trong quá khứ hay chưa.
- Ý đồ thiết kế thật của việc `create()` không chặn ADMIN (xem "Ghi chú ngoài phạm vi").

---

## IMPLEMENTATION PLAN (chốt sau VERIFY — 2026-08-30, vẫn CHƯA CODE, chờ APPROVE)

> Plan này thay thế/chuẩn hoá lại mục 12 ở trên theo đúng 9 đề mục được yêu cầu. Chỉ đề xuất thay đổi **tối thiểu cần thiết** để đóng ISS-01 — không refactor `assignRole()`, không tạo route mới, không đụng `create()`.

### 1. Root cause

`update()` (`backend/src/services/users/users.service.ts:166-219`) — service đứng sau endpoint đang chạy thật `PUT /api/users/:id` — gán thẳng bất kỳ `roleId` hợp lệ nào (kể cả role `name === "ADMIN"`) vào `user.role` mà không có safeguard chặn, và không invalidate permission cache sau khi role đổi. Safeguard đã tồn tại sẵn ở `assignRole()` (cùng file, dòng 454-509) nhưng không được gắn vào route/controller nào (dead code) — root cause là thiếu kết nối giữa 2 luồng, không phải thiếu thiết kế.

### 2. Files cần sửa

**Chỉ 1 file, 1 hàm**:
- `backend/src/services/users/users.service.ts` → hàm `update()` (dòng 166-219)

Không sửa: `assignRole()`, `create()`, `user.controller.ts`, `user.routes.ts`, `authorizePermission.middleware.ts`, DTO, model. Không thêm file mới, không thêm route mới.

### 3. Logic thay đổi (tối thiểu)

Trong `update()`, chèn thêm đúng 2 đoạn logic vào các vị trí hiện có, không đổi thứ tự các bước hiện tại:

a) **Chặn gán ADMIN** — ngay sau khối resolve role hiện tại (sau dòng 184, trước bước 5 validate department):
```ts
if (role?.name === "ADMIN") {
  throw ApiError.badRequest("Không thể gán role ADMIN qua endpoint này");
}
```

b) **Invalidate permission cache khi role thực sự đổi** — cần lưu `oldRoleId` TRƯỚC khi gán (`user.role` hiện tại, trước dòng 200), rồi so sánh sau `user.save()`:
```ts
const oldRoleId = user.role?.toString();
// ... (giữ nguyên bước 7 gán dữ liệu hiện có)
// sau await user.save():
if (role !== undefined && oldRoleId !== role._id.toString()) {
  clearPermissionCache(user._id.toString());
}
```
(`clearPermissionCache` đã có sẵn import ở đầu file — dòng 8 — không cần thêm import mới.)

**KHÔNG đưa vào scope tối thiểu** (do CLAUDE.md §12 "No over-engineering" + rủi ro ở mục 9 dưới): cải thiện nội dung `UserAudit.note` chi tiết hơn (như `assignRole()`) — đây là cải tiến audit-trail, không phải điều kiện bắt buộc để đóng lỗ hổng. Đề xuất **hoãn** trừ khi được yêu cầu riêng, vì cần grep thêm nơi nào đang parse `note` theo string cố định trước khi đổi format (ngoài phạm vi verify đã làm).

### 4. API impact

- Endpoint duy nhất bị ảnh hưởng: `PUT /api/users/:id`.
- Không đổi HTTP method, path, request schema, response schema, status code convention (`ApiError.badRequest` → 400, đã là pattern sẵn có trong chính hàm này).
- Thay đổi hành vi: request có `role` trỏ tới Role `ADMIN` → trước đây 200 OK, sau fix → 400 Bad Request. Đây là **breaking change có chủ đích** cho đúng 1 kịch bản input cụ thể (gán ADMIN) — cần xác nhận không có luồng vận hành hợp pháp nào phụ thuộc hành vi cũ (câu hỏi Q1 ở Bước 2, vẫn open).
- OpenAPI (`backend/src/docs/openAPI.yaml`): nếu mô tả `PUT /api/users/:id` liệt kê response case cho `role`, cần bổ sung case 400 mới — xác nhận cụ thể khi implement (chưa đọc phần này).

### 5. Database impact

- Không có migration, không đổi schema, không đổi index.
- Không có thay đổi với dữ liệu hiện có. User đã lỡ bị escalate từ trước (nếu có) **không được** phát hiện/rollback bởi fix này — cần xử lý vận hành riêng (rà soát `User` collection), ngoài phạm vi code.

### 6. Security impact

- Đóng CRITICAL Risk ISS-01/SEC-05 (privilege escalation ADMIN) — sau fix, `update()` không còn cách nào gán ADMIN qua endpoint này, kể cả người gọi vốn đã là ADMIN (đồng nhất tuyệt đối với `assignRole()`).
- Đóng kèm SEC-08/§9.3 (cache không invalidate khi đổi role) như hệ quả tự nhiên của cùng 1 thay đổi — không phải mở rộng scope, vì cùng nằm trong `update()`, cùng nguyên nhân (role thay đổi mà không xử lý hệ quả).
- Không ảnh hưởng ABAC/Policy (đã xác nhận dead runtime, không liên quan).
- Rủi ro bảo mật còn lại sau fix (không thuộc scope task này, ghi nhận để không hiểu nhầm là "đã giải quyết hết"): `create()` vẫn cho phép tạo mới user với role ADMIN trực tiếp (xem "Ghi chú ngoài phạm vi" ở trên).

### 7. Test cases

Phụ thuộc quyết định testing (Bước 2, câu hỏi Q còn open) — 2 kịch bản:

**Nếu cài `jest`/`ts-jest`** (unit test cho `update()`, mock `User`/`Role`/`clearPermissionCache`):
1. `roleId` trỏ tới Role `name: "ADMIN"` → throw `ApiError` (badRequest); `user.save()` KHÔNG được gọi; `clearPermissionCache` KHÔNG được gọi.
2. `roleId` trỏ tới Role khác (vd `"IT"`), khác role cũ → thành công; `user.role` cập nhật đúng; `clearPermissionCache` được gọi đúng 1 lần với đúng `userId`.
3. `roleId` trỏ tới ĐÚNG role hiện tại (không đổi thực sự) → thành công; `clearPermissionCache` KHÔNG được gọi (tối ưu, tránh clear thừa).
4. Không truyền `roleId` (chỉ đổi `fullName`/`username`) → hành vi giữ nguyên như trước fix, `clearPermissionCache` KHÔNG được gọi — **regression test bắt buộc**.

**Nếu không cài Jest** (test thủ công qua HTTP client trên DB dev, ghi lại kết quả thật theo CLAUDE.md §28):
- Case 1 và 4 ở trên tối thiểu phải chạy tay và ghi lại response thật (status code + body).

### 8. Documentation cần cập nhật (sau khi implement, KHÔNG làm trước khi có code)

- `docs/12_ISSUES_AND_RISKS.md` — ISS-01: chuyển trạng thái sang RESOLVED, kèm ngày/commit fix, hạ khỏi "Critical Risk" table.
- `docs/09_SECURITY_ANALYSIS.md` — SEC-05 (và ghi chú SEC-08 được fix kèm theo).
- `docs/07_AUTH_RBAC_ANALYSIS.md` — §9.2 và §9.3: đổi "CONFIRMED ISSUE" → "RESOLVED".
- `docs/00_PROJECT_MEMORY.md` — ghi nhận major security finding đã xử lý (CLAUDE.md §29/§34).
- `docs/tasks/TASK-001.md` — chuyển trạng thái sang `DONE`, ghi lại kết quả test thật.
- `docs/SESSION_HANDOFF.md` — cập nhật mục 5.
- KHÔNG cập nhật `docs/16_REFACTORING_PLAN.md` hay tạo Phase mới — ngoài phạm vi.

### 9. Rollback consideration

- Thay đổi khoanh vùng trong đúng 1 hàm, 1 file → rollback đơn giản bằng `git revert` đúng 1 commit, không kèm migration nào cần đảo ngược (mục 5: không đổi schema/dữ liệu).
- Nếu sau khi deploy phát hiện có luồng vận hành hợp pháp bị chặn nhầm (Q1 chưa trả lời) → rollback tạm thời bằng revert, đồng thời KHÔNG được coi lỗ hổng đã đóng cho tới khi có giải pháp thay thế được duyệt (không rollback rồi để ngỏ mãi).
- Không cần feature flag — quy mô thay đổi đủ nhỏ để review/revert trực tiếp qua git.

---

## KẾT QUẢ IMPLEMENT (2026-08-30)

**APPROVED bởi người dùng**: "Implement đúng implementation plan vừa lập. Không chọn làm hướng testing" — tức chấp nhận toàn bộ Implementation Plan (9 mục ở trên), Q1-Q3 không được trả lời tường minh (không có phản hồi về luồng vận hành hợp pháp gán ADMIN), và chủ động bỏ qua phần thiết lập testing.

### Thay đổi đã thực hiện

- File: `backend/src/services/users/users.service.ts`, hàm `update()` — đúng phạm vi đã lập kế hoạch, không đụng file/hàm nào khác.
- Đoạn 1: chặn `role.name === "ADMIN"` ngay sau khi resolve role → `ApiError.badRequest("Không thể gán role ADMIN qua endpoint này")`.
- Đoạn 2: lưu `oldRoleId` trước khi gán, sau `user.save()` nếu role thực sự đổi → `clearPermissionCache(user._id.toString())`.
- Cải thiện `UserAudit.note` chi tiết hơn: **KHÔNG làm** — giữ đúng phạm vi tối thiểu như plan đã ghi.

### Verification đã chạy

- `npx tsc --noEmit -p tsconfig.json` → **PASS**, không lỗi type.
- `git diff` đã review — chỉ 2 đoạn thêm mới trong `update()`, không có thay đổi ngoài phạm vi, không debug code, không hardcode secret.
- **KHÔNG chạy**: unit test (dự án không có Jest), test thủ công qua HTTP client (người dùng không yêu cầu, chưa có DB dev để chạy). → **Hành vi runtime thực tế của fix CHƯA được xác minh bằng request thật**, chỉ được xác nhận bằng code review + type-check tĩnh.

### Documentation đã đồng bộ

`docs/12_ISSUES_AND_RISKS.md` (ISS-01), `docs/09_SECURITY_ANALYSIS.md` (SEC-05, SEC-08), `docs/07_AUTH_RBAC_ANALYSIS.md` (§9.2, §9.3), `docs/00_PROJECT_MEMORY.md`, `docs/SESSION_HANDOFF.md` — tất cả đã cập nhật trạng thái RESOLVED kèm tham chiếu ngược về task này.

### Vấn đề còn tồn đọng (không thuộc phạm vi TASK-001, đã ghi nhận, chưa xử lý)

1. `create()` vẫn cho phép tạo user mới với `role: ADMIN` trực tiếp, không bị chặn — UNKNOWN có phải chủ đích hay không.
2. `assignRole()` vẫn là dead code, chưa được wire vào route nào.
3. Chưa xác minh có luồng vận hành hợp pháp nào từng dựa vào hành vi cũ của `PUT /api/users/:id` để gán ADMIN hay không (Q1 chưa trả lời) — nếu có, sẽ cần phát hiện qua báo lỗi 400 thực tế khi vận hành, không phải qua phân tích tĩnh.
4. Chưa rà soát dữ liệu `User` thật trong DB để tìm user đã bị escalate từ trước khi có fix này (Q3 chưa trả lời).

## NEXT ACTION

```
Task IMPLEMENTED — chưa TESTING/REVIEW đầy đủ theo nghĩa chạy thật.
Đề xuất: nếu có môi trường dev với DB thật, chạy tối thiểu 2 kịch bản thủ công
qua HTTP client (PUT /api/users/:id với role=ADMIN → mong đợi 400; PUT với role
khác → mong đợi 200 + quyền có hiệu lực ngay) trước khi coi task là DONE hoàn toàn.
Nếu người dùng chấp nhận rủi ro không test runtime, có thể đánh dấu DONE ngay.
```
```

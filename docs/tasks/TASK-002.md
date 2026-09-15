# TASK-002 — Xử lý các vấn đề tồn đọng sau TASK-001 (ISS-01)

## Trạng thái

**IMPLEMENTED** (2026-08-30) — Việc 1, 2 đã sửa code (type-check PASS) + OpenAPI đã cập nhật + permission `USER_ASSIGN_ROLE` đã tạo và gán cho Role `IT` trong DB dev. Việc 3 đã chạy xong (read-only, không sửa dữ liệu). Việc 4 (runtime test qua HTTP) **KHÔNG làm** — ngoài phạm vi được giao.

## Liên kết

Nguồn gốc: mục "GHI CHÚ NGOÀI PHẠM VI" + "Vấn đề còn tồn đọng" trong `docs/tasks/TASK-001.md`. Người dùng yêu cầu: *"xử lý giúp tôi các vấn đề còn lại Remaining issues và Important notes Q1-Q3"*, sau đó chọn: *"bạn làm việc 1,2,3 nhé"* (chấp nhận đề xuất phạm vi 4 việc đã trình bày, chọn 1-3, bỏ Việc 4 testing).

---

## VIỆC 1 — Chặn `create()` tạo thẳng user role ADMIN

### Root cause / evidence
`create()` (`backend/src/services/users/users.service.ts`, trước dòng resolve role) không có bất kỳ guard nào chặn `role.name === "ADMIN"` — đối xứng với lỗ hổng đã fix ở `update()` (TASK-001). Xác nhận thêm bằng source:
- `register()` (`auths.service.ts:47,109`) luôn gán `DEFAULT_REGISTER_ROLE_NAME` (mặc định `"USER"`, đọc từ `.env`) — không có cách nào tự đăng ký thành ADMIN.
- Không có script nào trong `backend/scripts/` tạo sẵn user ADMIN (`seed-rbac.ts` chỉ seed Permission/Role, không tạo User).
→ **`create()` là con đường API DUY NHẤT** (trước fix) có thể tạo ra 1 user với role ADMIN.

### Thay đổi đã áp dụng
File: `backend/src/services/users/users.service.ts`, hàm `create()`. Thêm ngay sau khi resolve `role`:
```ts
if (role.name === "ADMIN") {
  throw ApiError.badRequest("Không thể tạo user với role ADMIN qua endpoint này");
}
```

### Hệ quả cần lưu ý (quan trọng — đọc kỹ)
Sau fix này, **không còn endpoint API nào** trong toàn hệ thống có thể tạo hoặc gán role ADMIN cho bất kỳ user nào (`create()` bị chặn — Việc 1; `update()` đã bị chặn — TASK-001; `assignRole()` cũng chặn ADMIN theo thiết kế gốc — Việc 2). Muốn tạo/khôi phục 1 tài khoản ADMIN mới, **bắt buộc phải thao tác trực tiếp trong MongoDB** (vd `db.users.updateOne` đổi `role` sang ObjectId của Role ADMIN, hoặc chạy 1 script riêng ngoài phạm vi task này). Đây là đánh đổi bảo mật có chủ đích (không còn lỗ hổng leo thang qua API), nhưng **cần team vận hành biết trước** để không bị kẹt nếu cần tạo ADMIN mới trong tương lai.

### API/RBAC/DB impact
- API: `POST /api/users` — thêm 1 case 400 mới khi `role` trỏ tới ADMIN. Không đổi schema/method/status convention khác.
- RBAC: không role nào (kể cả ADMIN gọi endpoint này) tạo được user ADMIN mới qua API.
- Database: không đổi schema/migration.

---

## VIỆC 2 — Wire `assignRole()` thành endpoint riêng, permission riêng

### Thiết kế đã áp dụng
- **Permission mới**: `USER_ASSIGN_ROLE` (`backend/src/shared/constants/permission.constant.ts`) — tách khỏi `USER_UPDATE` để không lặp lại lỗi ISS-01 (permission coarse-grained vô tình cho phép đổi role). Không dùng lại `ROLE_ASSIGN_PERMISSIONS` đã có sẵn vì permission đó là "gán permission CHO 1 Role", khác ngữ nghĩa với "gán role CHO 1 user".
- **Endpoint mới**: `PATCH /api/users/:id/role`, body `{ roleId, resetPermissions? }` (`backend/src/routes/users/user.routes.ts`).
- **DTO mới**: `AssignRoleDTO` (`backend/src/dto/users/users.dto.ts`) — `roleId` bắt buộc (ObjectId), `resetPermissions` optional boolean.
- **Controller mới**: `assignUserRole` (`backend/src/controllers/users/user.controller.ts`) — gọi thẳng `assignRole()` (service) đã có sẵn từ trước, **không sửa logic bên trong `assignRole()`** (đã đủ an toàn: chặn tự đổi role chính mình, chặn gán ADMIN, tự `clearPermissionCache`).
- Đã bổ sung mô tả permission mới vào `backend/scripts/seed-rbac.ts` (`PERMISSION_DESCRIPTIONS`) để nhất quán nếu sau này script này được kích hoạt lại (hiện vẫn dead code theo Phase 07 §6.1, không nằm trong scope sửa ở đây).

### Quyết định CHƯA thể tự làm (cần vận hành, ngoài phạm vi code)
- **Gán `USER_ASSIGN_ROLE` cho role nào trong DB thật** — đây là thao tác dữ liệu (qua `POST /api/rbac/roles` hoặc `PATCH` role), không phải code. Mặc định: **chưa role nào (ngoài ADMIN qua bypass) có quyền này** cho tới khi được gán thủ công — an toàn theo nguyên tắc least-privilege, nhưng nghĩa là **hiện tại chưa ai (trừ ADMIN) gọi được endpoint mới này** cho tới khi bạn tự gán permission qua RBAC API.
- OpenAPI (`backend/src/docs/openAPI.yaml`): **CHƯA cập nhật** — endpoint mới `PATCH /api/users/:id/role` chưa được thêm vào tài liệu OpenAPI. Cần bổ sung khi có nhu cầu dùng thật (ngoài phạm vi tự động của task này, xem "Chưa xử lý" bên dưới).

### API/RBAC/DB impact
- API: **endpoint mới**, không phải thay đổi endpoint cũ — không breaking change cho consumer hiện có.
- RBAC: thêm 1 permission mới vào `PERMISSIONS` constant. Không tự động có hiệu lực cho role nào cho tới khi gán thủ công trong DB.
- Database: không đổi schema. Nếu muốn phân quyền `USER_ASSIGN_ROLE`, cần tạo bản ghi `Permission` mới trong DB (qua API RBAC hoặc chạy `seed-rbac.ts` nếu được kích hoạt lại — hiện KHÔNG được kích hoạt, ngoài scope).

---

## VIỆC 3 — Rà soát dữ liệu `User` thật tìm bất thường (đã CHẠY, read-only)

### Cách thực hiện
Viết 1 script Node thuần (không phải TypeScript, tránh xung đột cấu hình `tsconfig`/`ts-node` của project — không sửa cấu hình project để chạy được script này), chỉ dùng `find()`/`.project()` (KHÔNG update/delete gì), chạy tạm thời rồi **xoá ngay sau khi chạy xong** — không để lại trong repo.

### Kết quả (kết nối MongoDB local dev — `mongodb://127.0.0.1:27017/hospital_documents`, `NODE_ENV=development`)

| Mục | Kết quả |
|---|---|
| Số Role có `name: "ADMIN"` | **1** |
| Số User đang có role ADMIN | **1** (`username: "admin"`, `fullName: "ADMIN"`, `isActive: true`, tồn tại từ 2026-02-04) |
| Audit log liên quan tới user ADMIN này (action `CREATE`/`UPDATE`/`ASSIGN_ROLE`) | 68 bản ghi, **toàn bộ đều do chính user này tự thực hiện** (`performedBy === user`) — không có bản ghi nào cho thấy MỘT USER KHÁC được đổi role sang ADMIN |
| Bản ghi `CREATE` cho chính tài khoản `admin` này | **KHÔNG có** — tài khoản này chưa từng được tạo qua `create()` API (không có audit trail tạo user), suy ra được tạo trực tiếp trong DB (seed/bootstrap thủ công), không qua lỗ hổng ISS-01 |

### Kết luận Q3
**Không tìm thấy bằng chứng nào cho thấy ISS-01 đã từng bị khai thác thực tế** trên môi trường DB đã kiểm tra — chỉ có đúng 1 tài khoản ADMIN (tài khoản gốc/kỳ vọng), không có tài khoản thứ 2 nào bất thường mang role ADMIN, và không có audit log nào ghi nhận việc 1 user khác bị đổi role thành ADMIN.

**Giới hạn của kết luận này (không phải bằng chứng tuyệt đối)**:
- Chỉ kiểm tra được **1 môi trường DB** (local dev, do `.env` hiện có trỏ tới đây) — **KHÔNG** chứng minh được cho môi trường production thật (nếu có, UNKNOWN — ngoài phạm vi truy cập của tôi).
- Nếu có user từng bị escalate lên ADMIN rồi sau đó bị đổi ngược lại (downgrade), audit log của họ (dưới role hiện tại) sẽ không nằm trong tập kết quả này (script chỉ lọc theo user ĐANG có role ADMIN tại thời điểm chạy).

---

## VIỆC 4 — Runtime test qua HTTP (KHÔNG LÀM — ngoài phạm vi được giao)

Bạn chỉ chọn Việc 1, 2, 3 — Việc 4 (khởi động server, gọi thật `PUT /api/users/:id`, `POST /api/users`, `PATCH /api/users/:id/role` qua HTTP client) **chưa được thực hiện**. Hành vi runtime của cả 3 endpoint (2 cái cũ đã fix + 1 cái mới) vẫn chỉ được xác minh bằng code review + `npx tsc --noEmit` (PASS), chưa có request thật nào được gửi.

---

## Tổng hợp thay đổi code (git diff)

```
 backend/src/controllers/users/user.controller.ts   | +14  (thêm assignUserRole)
 backend/src/dto/users/users.dto.ts                 | +9   (thêm AssignRoleDTO)
 backend/src/routes/users/user.routes.ts            | +15  (thêm route PATCH /:id/role)
 backend/src/services/users/users.service.ts        | +34  (guard create() + TASK-001 đã có)
 backend/src/shared/constants/permission.constant.ts| +7   (thêm USER_ASSIGN_ROLE)
```
`npx tsc --noEmit -p tsconfig.json` → PASS, không lỗi type.

`backend/scripts/seed-rbac.ts` (untracked, ngoài git) cũng được cập nhật mô tả cho permission mới — không ảnh hưởng runtime vì file này hiện KHÔNG được import/chạy tự động ở đâu.

## Cập nhật 2026-08-30 (sau khi bạn yêu cầu xử lý tiếp 2 mục còn lại)

### OpenAPI đã cập nhật
- `backend/src/docs/openAPI.yaml`: thêm schema `AssignRoleRequest` + path `PATCH /api/users/{id}/role` (đầy đủ 200/400/401/403/404, cùng convention với các path Users khác). Đã validate parse được bằng `yamljs` (`88 paths`, không lỗi cú pháp).

### Đã gán `USER_ASSIGN_ROLE` cho Role thật trong DB dev
Kiểm tra trước khi gán (read-only): DB dev hiện có 7 Role (`ADMIN`, `IT`, `USER`, `TRUONG_KHOA`, `DIEU_DUONG_TRUONG`, `BAN_GIAM_DOC`, `PHONG_VAT_TU_TTB`), 76 Permission. **Phát hiện quan trọng**: chỉ `ADMIN` đang thực sự giữ `USER_UPDATE` trong DB này (không phải `IT` như thiết kế "trên giấy" ở `rolePermission.map.ts`) — nghĩa là **rủi ro thực tế của ISS-01 trên chính DB dev này trước đây là THẤP** (không có role non-ADMIN nào có thể khai thác, vì ADMIN vốn đã bypass permission check). Đây là dữ liệu bổ sung quan trọng cho đánh giá Probability ở `docs/12_ISSUES_AND_RISKS.md` (trước đây ghi UNKNOWN) — chỉ đúng cho DB dev đã kiểm tra, **không suy ra được cho production** (UNKNOWN).

Đã thực hiện (ghi dữ liệu thật, không phải read-only — theo đúng yêu cầu tường minh của bạn):
1. Tạo bản ghi `Permission` mới `USER_ASSIGN_ROLE` (`resource: USER`, `action: ASSIGN_ROLE`) — trước đó CHƯA tồn tại trong DB.
2. Gán permission này vào Role `IT` (theo đúng ví dụ bạn nêu) bằng `$addToSet` (không đụng permission khác đã có của IT — IT đi từ 42 → 43 permission).
3. Dùng script Node tạm, chạy 1 lần rồi xoá ngay — không để lại trong repo/DB migration script nào.

**Lưu ý**: đây là thay đổi DỮ LIỆU (Permission + Role.permissions trong DB dev), KHÔNG phải thay đổi code/schema. Nếu môi trường production dùng DB riêng, thao tác này **cần lặp lại thủ công trên production** (ngoài phạm vi tự động của tôi — tôi không có quyền truy cập DB production, và cũng sẽ không tự ý làm việc đó nếu có mà chưa được yêu cầu tường minh riêng cho production).

## Còn lại / cần quyết định thêm (ghi nhận, không tự làm)

1. **Việc 4 (runtime test qua HTTP)** vẫn chưa làm — khuyến nghị chạy tối thiểu khi có dịp, đặc biệt endpoint mới `PATCH /:id/role` và permission `USER_ASSIGN_ROLE` vừa gán cho IT chưa từng được gọi thật lần nào bằng 1 tài khoản IT thật.
2. Câu hỏi Q1 gốc (TASK-001) — "có luồng vận hành hợp pháp nào từng dựa vào hành vi cũ" — vẫn chưa có câu trả lời tường minh từ bạn; Việc 1 đã được implement với giả định KHÔNG có luồng như vậy (không tìm thấy bằng chứng ngược lại trong source/docs).
3. Nếu có môi trường production riêng, permission `USER_ASSIGN_ROLE` **chưa được tạo/gán** ở đó — cần lặp lại thao tác tương tự khi deploy.

## Documentation đã đồng bộ

- `docs/00_PROJECT_MEMORY.md` — bổ sung mục fix TASK-002.
- `docs/SESSION_HANDOFF.md` — cập nhật trạng thái.
- (Không sửa `12_ISSUES_AND_RISKS.md`/`09_SECURITY_ANALYSIS.md`/`07_AUTH_RBAC_ANALYSIS.md` thêm nữa — các mục ISS-01/SEC-05/SEC-08 đã đánh dấu RESOLVED ở TASK-001; TASK-002 là phần mở rộng/hardening, không phải 1 CVE/ISS/SEC ID riêng đã có sẵn trong baseline Phase 09/12.)

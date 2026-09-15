# DEV-009A — Kích hoạt ABAC cho domain Document (GET /:id — department-scoping)

> Ngày lập kế hoạch: 2026-09-01. Ngày hoàn thành: **2026-09-06**. Status: **✅ DONE**. Con của DEV-009 (đã DECIDED Phương án A). Xem Mục 10 cho log thực thi đầy đủ (code + DB + HTTP verification thật).

## 1. Objective

Triển khai domain đầu tiên của Phương án A (DEV-009): kích hoạt ABAC thật cho `GET /api/documents/:id` — chỉ cho phép xem chi tiết Document thuộc `department` của chính user (trừ ADMIN, bypass sẵn có), thay vì quyền view rộng không phân biệt phòng ban như hiện tại (dù trên thực tế hiện đang bị chặn hoàn toàn bởi 1 bug khác — xem Mục 2).

## 2. Root Cause / Evidence (đã verify trên source hiện tại)

1. **Bug có sẵn, chặn trực tiếp DEV-009A**: `backend/src/routes/documents/document.route.ts:54` — `GET /:id` dùng `authorizePermission("DOCUMENT_DETAIL")`, chuỗi này **KHÔNG tồn tại** trong `permission.constant.ts` (chỉ có `DOCUMENT_VIEW`/`DOCUMENT_VIEW_DETAIL`). Hệ quả: **mọi non-ADMIN hiện luôn nhận 403** ở endpoint này (không role nào có permission string sai này). Đây cùng loại lỗi với finding `USER_READ` đã ghi ở DEV-008 (thuộc `DEV-013`), nhưng là **prerequisite bắt buộc** để DEV-009A hoạt động — **anh đã xác nhận sửa luôn trong task này**, không tách sang DEV-013.
2. **Cơ chế ABAC hiện tại là "cộng thêm" (fallback), không "hạn chế" (restrictive)** — `authorizePermission.middleware.ts:95-137`: nếu user đã có permission qua RBAC (bước 4-5), `next()` được gọi NGAY, nhánh Policy (bước 6) không bao giờ chạy. Do đó **không thể** vừa giữ `DOCUMENT_VIEW_DETAIL` cho role vừa dùng Policy để "thu hẹp" phạm vi — **anh đã xác nhận hướng xử lý**: bỏ hẳn `DOCUMENT_VIEW_DETAIL` khỏi role thường, chỉ cấp quyền xem chi tiết qua Policy.
3. **`DOCUMENT_VIEW_DETAIL` hiện gán cho 5 role** (`rolePermission.map.ts`): `IT`, `USER`, `TRUONG_KHOA`, `DIEU_DUONG_TRUONG`, `BAN_GIAM_DOC`. **Anh đã xác nhận CONFIRMED**: áp dụng rule "chỉ xem cùng phòng ban" cho **cả 5 role**, kể cả 3 role duyệt (`TRUONG_KHOA`/`DIEU_DUONG_TRUONG`/`BAN_GIAM_DOC`) — dù tôi đã cảnh báo rủi ro có thể ảnh hưởng luồng duyệt liên phòng ban nếu thực tế các role này cần duyệt đề xuất từ phòng ban khác. **Ghi nhận rõ: đây là quyết định của người dùng, KHÔNG phải suy đoán của tôi** — nếu sau này phát hiện breaking luồng duyệt liên phòng ban, cần quay lại xem xét (không thuộc phạm vi tự phát hiện của DEV-009A, vì chưa có evidence xác nhận WorkflowTemplate step có scope liên phòng ban hay không).
4. `loadDocument.middleware.ts` — middleware gán `req.resource` cho nhánh ABAC, viết sẵn, có `isActive:true` filter, nhưng chưa gắn route nào — dùng lại nguyên trạng, không sửa.
5. `Policycondition.evaluator.ts` — hỗ trợ đúng cú pháp cần dùng: `resource.department === user.department` (so sánh 2 ObjectId qua `String()` coercion, đã có sẵn trong evaluator, không cần sửa).
6. `policy.model.ts` — chưa có index `{resource:1, action:1}` (RV02-05) — cần thêm TRƯỚC khi bật, tránh COLLSCAN mỗi request rơi vào nhánh ABAC.
7. `seed-rbac.ts` — import `ROLE_PERMISSIONS` trực tiếp từ `rolePermission.map.ts` (nguồn duy nhất) — sửa `rolePermission.map.ts` là đủ, script tự đồng bộ khi chạy lại. **Chưa có Policy nào được seed** — cần thêm mới.

## 3. Proposed Changes (scope chính xác)

| # | File | Thay đổi |
|---|---|---|
| 1 | `backend/src/routes/documents/document.route.ts` | Sửa `authorizePermission("DOCUMENT_DETAIL")` → `authorizePermission("DOCUMENT_VIEW_DETAIL", { enablePolicies: true, resource: "document", action: "view_detail" })`. Thêm `loadDocument` vào chain, đặt TRƯỚC `authorizePermission` (đúng thứ tự bắt buộc theo comment sẵn có trong `loadDocument.middleware.ts`). |
| 2 | `backend/src/shared/constants/rolePermission.map.ts` | Xoá dòng `PERMISSIONS.DOCUMENT_VIEW_DETAIL` khỏi cả 5 role: `IT`, `USER`, `TRUONG_KHOA`, `DIEU_DUONG_TRUONG`, `BAN_GIAM_DOC`. |
| 3 | `backend/src/models/rbac/policy.model.ts` | Thêm `PolicySchema.index({ resource: 1, action: 1 })` (RV02-05). |
| 4 | `backend/scripts/seed-rbac.ts` | Thêm đoạn seed 1 Policy: `{ name: "document-view-detail-same-department", resource: "document", action: "view_detail", condition: "resource.department === user.department" }` (upsert theo `name`, cùng pattern idempotent với seed Permission/Role hiện có). **Lưu ý**: file này KHÔNG git-track — thay đổi có thật trên đĩa nhưng không lên `git diff` (đã ghi nhận từ DEV-011). |

**KHÔNG sửa**: `authorizePermission.middleware.ts`, `Policycondition.evaluator.ts`, `loadDocument.middleware.ts`, controller, DTO — dùng nguyên trạng hạ tầng đã có.

## 4. API Impact

- `GET /api/documents/:id`: đổi từ luôn-403-với-non-ADMIN (bug hiện tại) sang **200 nếu Document cùng phòng ban với user, 403 nếu khác phòng ban** (trừ ADMIN — xem toàn bộ). Đây là thay đổi hành vi thật (trước giờ endpoint này không hoạt động đúng với bất kỳ ai ngoài ADMIN, nên về bản chất là "sửa bug" chứ không phải "thu hẹp quyền đang hoạt động tốt").
- Không đổi request/response shape, không đổi route path/method.

## 5. Database Impact

- Thêm 1 Policy document (qua seed, không phải migration).
- Thêm 1 index cho `Policy` collection — không destructive, không ảnh hưởng dữ liệu hiện có.
- **Vận hành quan trọng**: `rolePermission.map.ts` chỉ có hiệu lực với DB thật sau khi **chạy lại `seed-rbac.ts`** trên từng environment (dev/production) — nếu không chạy, Role trong DB vẫn giữ `DOCUMENT_VIEW_DETAIL` cũ, DEV-009A sẽ KHÔNG có hiệu lực thật dù code đã đổi. Cần xác nhận với anh có chạy seed trên dev ngay sau khi code xong hay không (Mục 8).

## 6. RBAC/Security Impact

- **Breaking change có chủ đích, đã xác nhận với người dùng**: 5 role mất quyền xem Document liên phòng ban qua RBAC thường, chỉ còn xem được Document cùng phòng ban qua Policy.
- Đóng 1 phần khoảng trống IDOR đã ghi nhận ở ISS-03 cho đúng 1 endpoint (`GET /:id`) của domain Document — các endpoint khác (List, Update đã có check riêng, Delete, Restore) **KHÔNG** nằm trong scope DEV-009A, vẫn giữ nguyên hành vi hiện tại.
  - **[CẬP NHẬT 2026-09-06]** Khoảng trống "List" (`GET /documents`) nêu trên đã được đóng riêng ở **DEV-030** (department-scoping cho danh sách, theo yêu cầu trực tiếp của user) — xem `docs/development/tasks/DEV-030.md`. `Update`/`Delete`/`Restore`/`GET /:proposalId/reports` vẫn CHƯA đổi, giữ nguyên trạng thái ghi nhận ở đây.
- Đồng thời sửa 1 bug an ninh có sẵn (permission string sai khiến endpoint luôn 403 — không phải lỗ hổng mở quyền, mà là lỗi chặn quá mức, nhưng vẫn là bug cần sửa để feature hoạt động đúng theo thiết kế).

## 7. Test Plan

- `npx tsc --noEmit`, `npx jest` (full suite) sau khi sửa.
- **Không có test nào cho nhánh ABAC hiện tại** (0% coverage, đã xác nhận ISS-07) — sẽ KHÔNG tự nhận "đã test hành vi ABAC" chỉ vì suite hiện có pass.
- Khuyến nghị mạnh: test thủ công qua HTTP thật (Postman/curl) với ít nhất 2 case: (a) user role `USER` xem Document CÙNG phòng ban → 200; (b) user role `USER` xem Document KHÁC phòng ban → 403. Cần chạy `seed-rbac.ts` trên dev trước khi test được (Mục 8).
- Không viết automated test mới trong phạm vi DEV-009A trừ khi anh yêu cầu thêm (không tự mở rộng scope).

## 8. UNKNOWN / cần xác nhận thêm trước khi code (nếu có)

- Có chạy `seed-rbac.ts` trên DB dev ngay sau khi code xong không? (cần thiết để test thủ công có ý nghĩa, nhưng là thao tác ghi dữ liệu — cần xác nhận trước khi tôi tự chạy).
- Ngoài ra không còn UNKNOWN nào chặn — toàn bộ business rule cần thiết đã được anh xác nhận qua AskUserQuestion (permission string fix, hướng ABAC restrictive, phạm vi 5 role).

## 9. Status

**DONE** (2026-09-06). Toàn bộ scope Mục 3 đã implement + verify qua HTTP thật.

## 10. Execution Log (2026-09-06)

### 10.1 Re-verify source trước khi code (5 ngày đã trôi qua từ lúc PAUSED)

- Item #1 (fix permission string `DOCUMENT_DETAIL`→`DOCUMENT_VIEW_DETAIL`) đã được **DEV-013 sửa từ trước** (task khác, không phải DEV-009A) — route hiện tại đã đúng `authorizePermission("DOCUMENT_VIEW_DETAIL")` nhưng CHƯA có `enablePolicies`/`loadDocument`. Không cần sửa lại phần này.
- Toàn bộ evidence còn lại (Mục 2 điểm 2-7) xác nhận KHÔNG đổi so với lúc PAUSED: `authorizePermission` đã hỗ trợ sẵn `{enablePolicies,resource,action}`; `loadDocument.middleware.ts` viết sẵn, chưa gắn route nào; `Policy` model chưa có index; evaluator hỗ trợ đúng `resource.department === user.department` qua `String()` coercion (đọc trực tiếp `evaluateEquality()`, xác nhận CONFIRMED không chỉ dựa vào comment).

### 10.2 Code changes

| File | Thay đổi |
|---|---|
| `backend/src/routes/documents/document.route.ts` | `GET /:id`: thêm `loadDocument` + `authorizePermission("DOCUMENT_VIEW_DETAIL", {enablePolicies:true, resource:"document", action:"view_detail"})`. **Đổi thứ tự so với plan gốc**: `validateParams(IdParamDTO)` đặt TRƯỚC `loadDocument` (không phải sau) — tránh regression: nếu `loadDocument` chạy trước validate, 1 `:id` sai format sẽ rơi xuống Mongoose `CastError` chưa chuẩn hoá thay vì 400 sạch. Đã verify: ID sai format → 400 (không phải 500/CastError). |
| `backend/src/shared/constants/rolePermission.map.ts` | Xoá `PERMISSIONS.DOCUMENT_VIEW_DETAIL` khỏi 5 role: `IT`/`USER`/`TRUONG_KHOA`/`DIEU_DUONG_TRUONG`/`BAN_GIAM_DOC`. Thêm comment giải thích ở đầu file. |
| `backend/src/models/rbac/policy.model.ts` | Thêm `PolicySchema.index({resource:1, action:1})` (RV02-05). |
| `backend/scripts/seed-rbac.ts` | Thêm `seedPolicies()` (upsert theo `name`, KHÔNG ghi đè `condition` nếu đã tồn tại) — seed sẵn Policy `document-view-detail-same-department` cho môi trường mới/fresh seed sau này. File này KHÔNG git-track (đã ghi nhận từ DEV-011) — thay đổi có thật trên đĩa, không lên `git diff`. |

**Không sửa** (đúng plan gốc): `authorizePermission.middleware.ts`, `Policycondition.evaluator.ts`, `loadDocument.middleware.ts`, controller, DTO.

### 10.3 Áp dụng vào DB dev (KHÔNG chạy `seed-rbac.ts`)

Hỏi lại user cách áp dụng (Mục 8 UNKNOWN cũ) — **user chọn dùng API targeted thay vì seed-rbac.ts** (cùng lý do DEV-027: seed-rbac.ts reset TOÀN BỘ permissions của MỌI role theo map, rủi ro không cần thiết nếu có role nào lệch map ngoài dự kiến; API chỉ đụng đúng phạm vi):

1. `GET /rbac/roles` lấy permission ID list hiện tại của 5 role.
2. `POST /rbac/roles/:id/assign-permissions` cho từng role — permission list = list cũ trừ đúng `DOCUMENT_VIEW_DETAIL`, giữ nguyên mọi permission khác.
3. `POST /rbac/policies` tạo Policy `document-view-detail-same-department`.

**Verify trước/sau** (so khớp permission set từng role): CHỈ mất đúng `DOCUMENT_VIEW_DETAIL`, 0 permission nào khác bị đổi:
```
IT: 45→44, USER: 15→14, TRUONG_KHOA: 9→8, DIEU_DUONG_TRUONG: 9→8, BAN_GIAM_DOC: 11→10
```

### 10.4 HTTP Verification (live, KHÔNG chỉ code review)

Dùng tài khoản thật `admin` + `thuykhth` (role USER, phòng "PKHTH - VTTBYT", user cung cấp password để test):

| Case | Request | Kết quả |
|---|---|---|
| USER xem document CÙNG phòng ban | `GET /documents/:id` (doc thuộc "PKHTH - VTTBYT") | **200** ✅ |
| USER xem document KHÁC phòng ban | `GET /documents/:id` (doc thuộc "KKBĐK - HSCC") | **403** `"Không có quyền truy cập"` ✅ |
| ADMIN xem CẢ 2 document trên | (bypass) | **200 / 200** ✅ |
| `:id` sai format | `GET /documents/not-a-valid-id` | **400** `BAD_REQUEST` (không phải CastError/500) ✅ |
| `:id` đúng format, không tồn tại | `GET /documents/000000000000000000000000` | **404** `NOT_FOUND` (từ `loadDocument`) ✅ |

**Đây là lần đầu tiên DEV-009A/nhánh ABAC được verify bằng request thật với tài khoản non-ADMIN thật** — khác hầu hết task RBAC/permission trước đó trong roadmap (thường ghi "chưa test qua HTTP thật, chỉ code review").

### 10.5 Tests

| Test | Kết quả |
|---|---|
| `npx tsc --noEmit` | PASS — 0 lỗi |
| `npx jest` (full suite) | PASS — 16 suite / 97 test (không đổi số lượng — đúng plan gốc, không viết test mới cho ABAC ở task này) |

### 10.6 Known limitation (đã biết trước, không phải phát sinh mới)

- Vẫn 0% automated test coverage cho nhánh ABAC (`authorizePermission` bước 6) — đã ghi nhận từ lúc PLANNED (Mục 7), KHÔNG mở rộng scope thêm test tự động trong task này (đúng quyết định gốc).
- User role không có `department` (nếu có) sẽ luôn 403 với mọi document (fail-closed, `String(undefined) !== String(ObjectId)`) — hành vi an toàn, không phải bug.
- Rủi ro đã cảnh báo từ lúc PLANNED (Mục 2 điểm 3) vẫn còn nguyên: nếu `TRUONG_KHOA`/`DIEU_DUONG_TRUONG`/`BAN_GIAM_DOC` trong thực tế cần duyệt đề xuất từ phòng ban KHÁC (chưa có evidence xác nhận), rule "chỉ cùng phòng ban" có thể chặn nhầm luồng duyệt liên phòng ban — cần theo dõi sau khi áp dụng thật.

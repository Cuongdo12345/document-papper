# BÀN GIAO PHIÊN LÀM VIỆC

## 1. TRẠNG THÁI DỰ ÁN

Phase 01 → Phase 13: **ĐÃ HOÀN THÀNH**

Dự án đã hoàn thành toàn bộ quy trình phân tích toàn diện gồm 13 phase ban đầu.

Dự án hiện đang ở:

**GIAI ĐOẠN PHÁT TRIỂN SAU PHÂN TÍCH**

Các tài liệu phân tích lịch sử là cơ sở kiến thức nền của dự án.

Không được mặc định coi chúng là trạng thái triển khai hiện tại.

**Source code hiện tại là nguồn sự thật hiện tại.**

---

## 2. KIẾN THỨC PHÂN TÍCH LỊCH SỬ

Các tài liệu phân tích đã hoàn thành được lưu tại:

```text
docs/
├── 00_PROJECT_MEMORY.md
├── 01_PROJECT_OVERVIEW.md
├── 02_ARCHITECTURE.md
├── 03_BACKEND_ANALYSIS.md
├── 04_DATABASE_ANALYSIS.md
├── 05_API_ANALYSIS.md
├── 06_FRONTEND_ANALYSIS.md
├── 07_AUTH_RBAC_ANALYSIS.md
├── 08_BUSINESS_LOGIC.md
├── 09_SECURITY_ANALYSIS.md
├── 10_PERFORMANCE_ANALYSIS.md
├── 11_TECHNICAL_DEBT.md
├── 12_ISSUES_AND_RISKS.md
└── 13_FINAL_PROJECT_REPORT.md
```

Các tài liệu này đại diện cho cơ sở kiến thức lịch sử của dự án được tạo trong quá trình phân tích 13 phase ban đầu.

Không chạy lại Phase 01 → Phase 13 trừ khi người dùng yêu cầu rõ ràng phân tích lại toàn bộ hoặc một phần.

---

## 3. PROJECT MEMORY

Project memory chính:

```text
docs/00_PROJECT_MEMORY.md
```

Mục đích:

- Lưu trữ kiến thức cô đọng về dự án.
- Ghi nhận thông tin kiến trúc quan trọng.
- Ghi nhận các module và file quan trọng.
- Ghi nhận các business rule đã được xác nhận.
- Ghi nhận kiến thức về API/database/authentication/RBAC.
- Ghi nhận các issue và technical debt đã biết.
- Ghi nhận các phát hiện quan trọng về security và performance.
- Ghi nhận trạng thái phát triển hiện tại.

PROJECT_MEMORY là chỉ mục kiến thức, không thay thế các tài liệu phân tích chi tiết.

---

## 4. GIAI ĐOẠN PHÁT TRIỂN HIỆN TẠI

Dự án đã sẵn sàng cho việc phát triển theo task bằng Claude Code.

Quy trình mặc định:

```text
HIỂU YÊU CẦU
    ↓
XÁC MINH
    ↓
LẬP KẾ HOẠCH
    ↓
TRIỂN KHAI
    ↓
KIỂM THỬ
    ↓
REVIEW
    ↓
CẬP NHẬT TÀI LIỆU
```

Đối với task đơn giản:

```text
HIỂU YÊU CẦU
    ↓
TRIỂN KHAI
    ↓
KIỂM THỬ
    ↓
REVIEW
```

Đối với task phức tạp hoặc có rủi ro cao:

```text
HIỂU YÊU CẦU
    ↓
XÁC MINH
    ↓
PHÂN TÍCH
    ↓
LẬP KẾ HOẠCH
    ↓
CHỜ PHÊ DUYỆT
    ↓
TRIỂN KHAI
    ↓
KIỂM THỬ
    ↓
REVIEW
    ↓
CẬP NHẬT TÀI LIỆU
```

---

## 5. TASK HIỆN TẠI — CẬP NHẬT 2026-09-06 (file này trước đó ĐỨNG YÊN từ thời DEV-026, KHÔNG phản ánh FE-01→04/DEV-027/028/009A — xem `docs/00_PROJECT_MEMORY.md` và `docs/frontend/FRONTEND_MEMORY.md` làm nguồn chính, mục này chỉ tóm tắt lại đúng trạng thái mới nhất)

> **⚠️ CẬP NHẬT THẬT — 2026-09-16**: toàn bộ nội dung Mục 5 bên dưới (từ "**Current Task:** DEV-009A..." cho tới hết các "Ghi chú DEV-XXX") **CHỈ ĐÚNG ĐẾN DEV-028 / FE-04 (2026-09-06)** — giữ nguyên bên dưới làm lịch sử, KHÔNG phản ánh các task đã DONE sau đó. Không chép lại narrative chi tiết ở đây (đã có sẵn, tránh trùng lặp) — chỉ tóm tắt đúng trạng thái mới nhất:
>
> - **Backend**: thêm **35 task** đã DONE sau DEV-028: `DEV-029`→`DEV-048` (bugfix/hardening/test, theo dõi trong `docs/00_PROJECT_MEMORY.md`), `DEV-049`→`DEV-056` (triển khai Feature Roadmap NHÓM A đầy đủ A1→A4, và NHÓM B1→B3, gồm cả "Nhóm vật tư"/ConsumableCategory phát sinh trong lúc làm B3), `DEV-057` (NHÓM B4 — Vendor & Contract, module mới hoàn toàn), `DEV-058` (bổ sung Cập nhật/Huỷ/Khôi phục ở `ContractsListPage`, thêm permission `CONTRACT_RESTORE` riêng), `DEV-059` (đồng bộ hiển thị permission sang tiếng Việt trong UI RBAC — KHÔNG đổi `Permission.name` kỹ thuật, chỉ bổ sung 16 mô tả tiếng Việt còn thiếu + sửa `RolePermissionMatrix` ưu tiên hiển thị `description`), `DEV-060` (chọn nhiều dòng + Batch Action Bar xoá mềm hàng loạt cho 6 trang: Asset/AssetCategory/ConsumableItem/ConsumableCategory/Vendor/User — dùng lại permission xoá/sửa single-item hiện có, KHÔNG tạo permission mới; Department CỐ TÌNH loại khỏi phạm vi vì dùng hard-delete thật), `DEV-061` (mở rộng chọn nhiều dòng sang `DocumentsListPage` — CẢ xoá mềm LẪN khôi phục hàng loạt, khác 6 trang trước chỉ có xoá; tái dùng nguyên vẹn `deleteDocumentService`/`restoreDocumentService` qua `runBulkDelete`, dùng lại permission `DOCUMENT_DELETE`/`DOCUMENT_UPDATE` hiện có), `DEV-062` (bổ sung khôi phục hàng loạt cho ĐÚNG 6 trang của DEV-060 — trước đó chỉ có xoá hàng loạt; phát hiện ConsumableItem/Vendor chưa từng có route restore đơn lẻ nào, tái dùng cách "giả lập qua update isActive:true" mà frontend đã dùng cho nút khôi phục từng dòng, KHÔNG tự xây route restore đơn lẻ mới; User dùng permission RIÊNG `USER_RESTORE` khác `USER_DELETE`) `DEV-063` (Roadmap B6 — Tìm kiếm toàn văn cho Document, qua MongoDB `$text` trên `title`/`documentCode`/`meta` (nội dung/ghi chú tự do); ô search MỚI RIÊNG "Tìm nội dung/ghi chú", KHÔNG đụng ô "Tìm kiếm (mã/tiêu đề)" cũ; index text cũ chưa từng được dùng được thay bằng `document_fulltext_search` — migration `scripts/migrate-document-fulltext-index.ts` đã chạy trên DB dev, PHẢI chạy lại thủ công nếu deploy DB khác) và `DEV-064` (Roadmap B5 — Xuất PDF chính thức cho Document, dependency mới `pdfmake`; "ký" là NỘI BỘ hệ thống — RSA khoá riêng, KHÔNG PHẢI chữ ký số CA hợp lệ pháp lý, user đã xác nhận rõ sau khi được cảnh báo rủi ro; bảng phê duyệt lấy từ `WorkflowInstance.steps`; route `GET /documents/:id/export-pdf` dùng ĐÚNG guard `GET /documents/:id/versions`, không tạo permission mới; khoá ký đọc từ `.env` — `PDF_SIGN_PRIVATE_KEY`/`PDF_SIGN_PUBLIC_KEY`, sinh bằng `scripts/generate-pdf-signing-keys.ts`, MỖI môi trường cần khoá riêng) và `DEV-065` (Roadmap B7 — Báo cáo tuần tự động gửi email cho BAN_GIAM_DOC/TRUONG_KHOA; KHÁC mọi cảnh báo tự động khác trong hệ thống — đây là opt-in THẬT (`User.subscribedToWeeklyReport`, tự bật qua `PATCH /users/me`, KHÔNG gửi mặc định cho cả role); cron đầu tiên chạy HÀNG TUẦN (thứ Hai 08:30, các cron khác đều hàng ngày); phát hiện gap NGOÀI phạm vi khi làm: hệ thống hiện KHÔNG có đường nào (kể cả ADMIN) để sửa `email` của user đã tồn tại — ghi nhận trong DEV-065.md Mục 4, chưa tự sửa). Không còn task backend TODO nào theo roadmap gốc lẫn Nhóm A/B1-7.
> - **Frontend**: thêm **12 task** đã DONE sau FE-04: `FE-05`→`FE-16` (Workflow UI → Assets → Medical Devices → RBAC Admin → Dashboard → Asset Categories → Audit Logs → Notifications ×2 → Profile → Upload/Excel → Global UI Polish pass 1). Chi tiết đầy đủ: `docs/frontend/FRONTEND_MEMORY.md` Mục 11.
> - **Không có task nào đang PAUSED/BLOCKED** tại 2026-09-18 (khác với bản ghi lịch sử bên dưới còn nhắc `DEV-009A` PAUSED — task đó đã RESUME và DONE, xem chi tiết ngay trong lịch sử Mục 5 phần dưới).
> - **Còn lại CHƯA làm** (mới là đề xuất trong `docs/development/FEATURE_DEVELOPMENT_ROADMAP.md`, chưa task nào được duyệt): **C2** (Session Management UI), **C3** (Audit export mẫu thanh tra), NHÓM D (dài hạn). NHÓM A/B (B1→B8) ĐÃ LÀM XONG hết. **C1 (DEV-068, 2026-09-19)** cũng ĐÃ LÀM XONG — xem mục ngay dưới. Ngoài ra `FE-16.md` Mục 4 tự liệt kê phần UI polish chưa làm trong chính pass đầu tiên của nó.
> - **`DEV-068`** (2026-09-19, Roadmap C1 — Xác thực 2 lớp qua email OTP): model mới `TwoFactorOtp`
>   (mirror `PasswordResetToken` nhưng hash bằng bcrypt thay vì SHA-256 — mã OTP chỉ 6 số, entropy thấp
>   hơn hẳn token 32-byte). `login()` refactor: nếu `user.twoFactorEnabled`, trả
>   `{requiresTwoFactor, username}` thay vì token, FE gọi tiếp `POST /auths/login/verify-otp`. Self-service
>   opt-in qua `POST /auths/2fa/enable`+`/confirm` (CHỈ role ADMIN/TRUONG_KHOA/DIEU_DUONG_TRUONG/
>   BAN_GIAM_DOC bật được, PHẢI có email), tự tắt qua `/2fa/disable` (yêu cầu password, KHÔNG OTP). Không
>   có backup codes — khôi phục DUY NHẤT qua ADMIN (`PATCH /users/reset-2fa/:id`, permission MỚI
>   `USER_RESET_2FA`, KHÔNG gán role nào ngoài ADMIN — mirror `USER_RESET_PASSWORD`). FE: `LoginPage.tsx`
>   thêm bước 2 (nhập OTP), `ProfilePage.tsx` thêm section "Xác thực 2 lớp"
>   (`TwoFactorSection.tsx`), `UsersListPage.tsx` thêm nút "Tắt xác thực 2 lớp" cho ADMIN. **Phát hiện VÀ
>   SỬA 1 bug thật qua smoke test dữ liệu dev** — `UserAudit.action` enum thiếu 3 giá trị mới
>   (`ENABLE_2FA`/`DISABLE_2FA`/`RESET_2FA`), khiến `UserAudit.create()` throw `ValidationError` (chỉ lộ
>   ra khi chạy thật trên DB, KHÔNG lộ qua unit test mock) — đã sửa `userAudit.model.ts`+`.interface.ts`.
>   376/376 test backend PASS, đã verify bằng dữ liệu dev thật (script tạm, đã xoá, có khôi phục trạng
>   thái gốc user fixture TRUONG_KHOA). Chưa tự verify UI qua trình duyệt thật (không có Playwright).
> - **`DEV-067`** (2026-09-18, Roadmap B8 — Dự trù/đề xuất mua vật tư tiêu hao hàng tháng): domain MỚI
>   `ConsumableRequest` (`/api/inventory/requests`), TÁCH BIỆT hoàn toàn ConsumableItem/ConsumableTransaction
>   — KHÔNG có luồng duyệt (user xác nhận qua AskUserQuestion), trạng thái RIÊNG
>   PENDING/FULFILLED/CANCELLED (không qua Workflow engine), CÓ theo dõi ngân sách (đơn giá/tổng tiền),
>   đánh dấu "đã mua" là thao tác TAY, KHÔNG tự sinh `ConsumableTransaction`. Permission mới
>   `CONSUMABLE_REQUEST_VIEW/CREATE/UPDATE/FULFILL` — `USER` có VIEW/CREATE/UPDATE (không FULFILL),
>   `IT`/`PHONG_VAT_TU_TTB` có đủ cả 4; `TRUONG_KHOA`/`DIEU_DUONG_TRUONG`/`BAN_GIAM_DOC` KHÔNG đụng (giữ
>   nguyên 3 role thuần phê duyệt, không có permission CONSUMABLE_* nào). **CẦN gán permission qua UI
>   "Phân quyền" mới dùng được trên DB hiện tại** (cùng pattern DEV-058, `Role.permissions` không tự đồng
>   bộ theo code — DEV-041). FE: tab mới "Đề xuất/Dự trù" trong Inventory
>   (`/app/inventory/requests`), form Tạo/Sửa dùng `useFieldArray` (mirror `DocumentMetaFields.tsx`) — có
>   1 lỗi build THẬT phát hiện khi `tsc -b` (không phải `tsc --noEmit` đơn thuần) do `z.coerce.number()`
>   lệch type với `zodResolver`, đã sửa dùng `z.number()` + `valueAsNumber` (đúng pattern đã có ở
>   `documentMeta.ts`). 358/358 test backend PASS, đã verify bằng dữ liệu dev thật (script tạm, đã xoá).
>   Chưa tự verify UI qua trình duyệt thật (không có Playwright).
> - **`DEV-066`** (2026-09-18, khắc phục gap phát hiện ở DEV-065 Mục 4): mở `email` cho `CreateUserDTO`
>   VÀ `UpdateUserDTO` (trước đây CẢ HAI đều thiếu field này — gap rộng hơn mô tả ban đầu "chỉ thiếu ở
>   update"), áp dụng cho `create()`/`update()` (ADMIN, `PUT /users/:id`) — CỐ TÌNH KHÔNG mở cho
>   `updateMeService()` (self-service) vì chính docstring gốc của hàm đó đã liệt kê email là field nhạy
>   cảm cố ý loại trừ (gắn với luồng `forgotPassword`). Frontend: `UserFormDrawer.tsx` thêm input Email,
>   `UsersListPage.tsx` thêm cột Email. 345/345 test backend PASS, đã verify bằng dữ liệu dev thật (script
>   tạm, đã xoá). Gap DEV-065 Mục 4 coi như ĐÃ GIẢI QUYẾT.
> - **Việc CẦN LÀM THÊM sau DEV-058**: vào UI "Phân quyền", gán permission `CONTRACT_RESTORE` cho role IT và Phòng Vật tư-TTB (permission đã có trong DB qua `seed-rbac.ts`, nhưng Role.permissions KHÔNG tự động cập nhật theo thiết kế DEV-041 — cần thao tác tay qua UI, ADMIN không bị ảnh hưởng).
> - **Việc CẦN LÀM THÊM sau DEV-061/DEV-062**: không có — cả 2 task đều dùng lại permission hiện có, không cần thao tác gì thêm qua UI "Phân quyền". Chưa tự verify được bằng trình duyệt thật (không có Playwright trong môi trường này) — cần user tự refresh và xác nhận hành vi UI trên cả 7 trang (Document + 6 trang DEV-060/062).
> - **Việc CẦN LÀM THÊM sau DEV-063**: nếu deploy sang môi trường KHÁC (staging/prod, DB khác dev hiện tại), PHẢI chạy lại `npx ts-node scripts/migrate-document-fulltext-index.ts` trên DB đó trước khi tính năng search hoạt động đúng (index không tự đồng bộ qua deploy code). Chưa tự verify UI thật qua trình duyệt — cần user tự refresh và thử ô "Tìm nội dung/ghi chú" trên `DocumentsListPage`.
> - **Việc CẦN LÀM THÊM sau DEV-064**: nếu deploy sang môi trường KHÁC (staging/prod), BẮT BUỘC chạy `npx ts-node scripts/generate-pdf-signing-keys.ts` TRÊN môi trường đó và dán khoá in ra vào `.env` của môi trường đó (KHÔNG copy khoá dev sang) — thiếu khoá thì nút "Xuất PDF" sẽ lỗi rõ ràng khi gọi (không crash app lúc khởi động). Chưa có logo/letterhead thật (đang dùng header text tạm, `ORG_DISPLAY_NAME` env) — thay sau nếu có file thật. Chưa tự verify UI thật qua trình duyệt — cần user tự refresh và thử nút "Xuất PDF" trên `DocumentDetailPage`.
> - **Việc CẦN LÀM THÊM sau DEV-065**: ~~gap ngoài phạm vi phát hiện khi làm~~ — **ĐÃ GIẢI QUYẾT bằng
>   `DEV-066` (2026-09-18)**, xem mục ngay trên. Vẫn còn: chưa tự verify UI thật qua trình duyệt — cần
>   user tự refresh, đăng nhập tài khoản BAN_GIAM_DOC/TRUONG_KHOA (giờ có thể tự bổ sung email qua trang
>   Người dùng → Sửa) để thấy section "Báo cáo tuần" ở trang Hồ sơ cá nhân.
> - **Việc CẦN LÀM THÊM sau DEV-066**: không có thao tác migrate/vận hành nào thêm (chỉ mở field,
>   không đổi schema/index). Chưa tự verify UI thật qua trình duyệt (không có Playwright) — cần user tự
>   refresh, vào trang Người dùng → Sửa 1 user → nhập email → Lưu, kiểm tra cột Email cập nhật đúng.
> - **⚠️ SỬA (2026-09-19)**: phát hiện qua báo cáo THẬT của user (icon "Tắt xác thực 2 lớp" không hiện
>   dù đăng nhập ADMIN) rằng claim "USER_RESET_2FA chỉ ADMIN có, không cần gán qua UI" ở trên là SAI —
>   `Permission` catalog trong DB dev THIẾU cả `USER_RESET_2FA` LẪN 4 `CONSUMABLE_REQUEST_*` (DEV-067)
>   LẪN `DASHBOARD_WEEKLY_REPORT_TRIGGER` (DEV-065) — `scripts/seed-rbac.ts` (local, gitignored, đọc
>   `Object.values(PERMISSIONS)` trực tiếp từ code nên tự nhận permission mới) chưa được chạy lại từ khi
>   3 task đó thêm permission mới. Đã chạy script (mặc định, KHÔNG `--sync-roles` — chỉ tạo `Permission`
>   catalog, KHÔNG đụng `Role.permissions` của role nào) để tạo đủ cả 6 permission thiếu. Việc seed này
>   lại LỘ RA 1 bug thật THỨ 2: tổng Permission trong DB tăng lên 108, vượt `limit:100` hardcode ở
>   `useAllRbacPermissions()` (FE) — sort theo `resource` ASC nên toàn bộ nhóm WORKFLOW_ (gồm cả
>   `WORKFLOW_APPROVE`/`REJECT`) bị CẮT MẤT khỏi UI "Phân quyền". Đã sửa cả 2 phía
>   (`GetPermissionsQueryDTO` max 100→300, FE limit 100→300) — verify lại DB thật xác nhận đủ 108/108.
>   Xem `DEV-068.md` Mục 5 để có chi tiết đầy đủ + evidence cho cả 2 bug.
> - **[XÁC NHẬN 2026-09-19]** User đã tự gán `USER_RESET_2FA` cho role ADMIN qua UI "Phân quyền" + verify
>   THẬT qua trình duyệt: bật 2FA cho tài khoản `admin`, icon "Tắt xác thực 2 lớp" hiện đúng ở trang Người
>   dùng. **C1 (DEV-068) giờ DONE hoàn toàn, kể cả verify UI trình duyệt thật.**
> - **`DEV-069`** (2026-09-19, Roadmap C2 — Quản lý phiên đăng nhập): `RefreshToken` model thêm
>   `userAgent`/`ip` (trước đây model này KHÔNG lưu bất kỳ metadata thiết bị nào) + index
>   `{user,revoked,createdAt}` (trước đây KHÔNG có index nào). Self-service cho MỌI role
>   (`GET/DELETE /auths/sessions*`, `SessionsSection.tsx` ở Hồ sơ cá nhân — KHÁC 2FA chỉ giới hạn role
>   cấp cao) + ADMIN hỗ trợ xem/thu hồi phiên user khác (`GET/DELETE /users/:id/sessions*`, permission MỚI
>   `SESSION_VIEW_ALL`/`SESSION_REVOKE_ALL`, mirror `USER_RESET_2FA` — KHÔNG gán role nào, chỉ ADMIN có).
>   **Áp dụng NGAY bài học DEV-068**: (1) chủ động thêm `REVOKE_SESSION` vào `UserAudit.action` enum
>   TRƯỚC khi chạy, không đợi bug lộ ra; (2) chủ động chạy `seed-rbac.ts` ngay sau khi code để tạo
>   `Permission` catalog cho 2 permission mới trên DB dev — VẪN CẦN gán role qua UI "Phân quyền" (script
>   không tự làm, xem DEV-069.md Mục 5). **MỚI — tuân thủ CLAUDE.md Mục 18 (cập nhật 2026-09-19)**: viết
>   `session-management.e2e-test.ts` (supertest + MongoDB in-memory THẬT, 7 test) verify bằng HTTP thật
>   route mới bị chặn đúng 403 cho user thiếu permission — không chỉ giả định middleware đã đủ. 391/391
>   unit test + 17/17 E2E test PASS, build cả 2 phía thành công. Chưa tự verify UI qua trình duyệt thật.
> - **`DEV-070`** (2026-09-19, Roadmap C3 — Giám sát phiên đăng nhập toàn hệ thống, GỘP với ý tưởng user
>   đề xuất "trang admin xem phiên của toàn bộ user"): trang RIÊNG `/app/sessions`
>   (`SessionsMonitorPage.tsx`, sidebar "Phiên đăng nhập") cho ADMIN xem + thu hồi phiên đăng nhập của
>   TẤT CẢ user cùng lúc, có filter `search` theo username/fullName. Route mới `GET /users/sessions`
>   (`user.routes.ts:95-101`) DÙNG LẠI permission `SESSION_VIEW_ALL`/`SESSION_REVOKE_ALL` (không tạo
>   permission mới — ADMIN đã có sẵn từ DEV-069, KHÔNG cần thao tác "Phân quyền" gì thêm cho task này).
>   Thu hồi từ trang mới dùng LẠI route `DELETE /users/:id/sessions/:sessionId` sẵn có (không tạo route
>   revoke riêng). Thêm index MỚI `{revoked,expiresAt,createdAt}` cho `RefreshToken` (index cũ DEV-069 dẫn
>   đầu bằng `user`, không hỗ trợ truy vấn cross-user). Phần còn lại của C3 gốc (audit export mẫu thanh
>   tra) — user xác nhận CHƯA có mẫu cụ thể, nên chỉ cải thiện Audit Log hiện tại: filter "Hành động" ở
>   `AuditLogsPage.tsx` đổi từ chọn 1 sang chọn NHIỀU (gap đã ghi nhận từ FE-11, backend hỗ trợ multi-value
>   từ trước). **Tuân thủ CLAUDE.md Mục 18**: `session-management.e2e-test.ts` mở rộng thêm 3 test verify
>   403 thật cho route mới. 393/393 unit test + 20/20 E2E test PASS, build cả 2 phía thành công. Chưa tự
>   verify UI qua trình duyệt thật (không có Playwright/chromium-cli trong môi trường) — dev server backend
>   (:3000)/frontend (:5173) đang chạy sẵn, cần user tự refresh kiểm tra.
> - **`FE-17`** (2026-09-19, `docs/frontend/UI_DESIGN_SYSTEM.md` Mục 6 — KHÔNG phải task roadmap
>   nghiệp vụ): hạ tầng test WCAG AA contrast (`@axe-core/playwright`) + visual regression snapshot
>   (`@playwright/test`) cho 4 màn đại diện (Dashboard/`UsersListPage`/`ResetPasswordModal`/
>   `UserFormDrawer`) — CHỈ hạ tầng, KHÔNG đổi UI/CSS trang nào, KHÔNG tự sửa lỗi tìm thấy (đúng chỉ định
>   user). Backend có bootstrap server riêng cho Playwright (`startPlaywrightServer.ts`, tái dùng hạ tầng
>   E2E DEV-048, port 4100) + frontend dev port riêng (4173) — tránh đụng dev server thật đang chạy song
>   song. **Finding thật CONFIRMED, CHƯA sửa**: `StatusBadge variant="success"` ("Hoạt động") contrast
>   3.24:1, dưới ngưỡng AA 4.5:1 — việc sửa thuộc `UI_DESIGN_SYSTEM.md` Mục 2, còn PROPOSAL chưa duyệt.
>   Đã chạy THẬT (không phải đọc code tĩnh) 2 lần cho kết quả ổn định: 5 PASS/3 FAIL (3 FAIL = finding trên
>   lặp lại ở DataTable/Modal/Drawer). `npm run build` (cả 2 phía) + `vitest run` (25/25) + `npx jest`
>   (393/393 backend) đều PASS. Chi tiết đầy đủ (bao gồm 2 bug hạ tầng tự phát hiện+sửa —
>   `ts-node --files`, `vitest` nhặt nhầm `*.spec.ts`): `docs/frontend/tasks/FE-17.md`.
> - **`FE-18`** (2026-09-19, `UI_DESIGN_SYSTEM.md` Mục 3/4, Pass 2 THÍ ĐIỂM — KHÔNG phải task roadmap
>   nghiệp vụ): phân cấp thị giác CHỈ trên `DashboardPage` tab "Tổng quan" — KPI chính "Tổng tài liệu"
>   (`size="display"`, `text-4xl/700`, `KpiCard.tsx`) đứng riêng, 4 KPI phụ gộp 1 khối `bg-muted`
>   (`DashboardSummaryLayout.tsx`), divider CHỈ ở ranh giới nhóm dữ liệu thật ("documents" Đề xuất/Báo cáo
>   vs "org" Khoa/Phòng/Người dùng). CỐ TÌNH KHÔNG đụng 2 tab "Tài sản"/"Thiết bị y tế" (cùng
>   `DashboardPage` nhưng khác widget, chưa được `UI_DESIGN_SYSTEM.md` audit) hay bất kỳ trang nào khác —
>   Pass 3 (rollout) CHƯA bắt đầu, CHƯA có task. `size` mặc định giữ NGUYÊN hành vi cũ nên
>   `AuditStatsTab.tsx` (nơi khác duy nhất gọi `KpiCard`) không đổi gì. Tự chụp màn hình qua Playwright để
>   mắt kiểm tra trước khi cập nhật baseline (desktop + mobile 390px) — đúng ý đồ thiết kế. Chạy lại hạ
>   tầng FE-17 theo đúng yêu cầu: Dashboard a11y PASS (không violation mới), 3 màn còn lại vẫn CÙNG 1
>   finding cũ (không liên quan tới thay đổi này), visual baseline Dashboard cập nhật CHỦ Ý, 3 baseline
>   còn lại KHÔNG đổi (xác nhận đúng phạm vi). `npm run build`/`vitest run` (25/25)/`oxlint` đều PASS. Chi
>   tiết: `docs/frontend/tasks/FE-18.md`.
> - **`FE-19`** (2026-09-19, `UI_DESIGN_SYSTEM.md` Mục 2, audit-only — KHÔNG phải task roadmap nghiệp vụ):
>   audit 36 trang, đếm nút "primary-styled" (`Button` không truyền `variant` = mặc định `primary`) xuất
>   hiện cùng lúc/trang — **26/36 VI PHẠM (>1 primary/trang)**, liệt kê đầy đủ CHỜ user duyệt ở
>   `docs/frontend/tasks/FE-19.md` Mục 2, **CHƯA tự sửa trang nào**. Root cause chính: `ConfirmDialog`
>   (`components/shared/ConfirmDialog.tsx:52`)/`WorkflowActionModal`
>   (`features/documents/components/WorkflowActionModal.tsx:57`) mặc định `variant="primary"` khi không
>   truyền `danger` — xác nhận không-phá-huỷ (Khôi phục/Hoàn tất/Duyệt...) bị trùng trọng lượng thị giác
>   với CTA chính của trang; sửa 1 default ở 2 component này có thể giải quyết phần lớn 26 trang thay vì
>   sửa tay từng trang. Phần active-state Sidebar/AppLayout (được phép sửa luôn theo yêu cầu user) hoá ra
>   **KHÔNG cần sửa**: `Sidebar.tsx:59-61` đã dùng `bg-sidebar-accent` (giá trị OKLCH giống hệt `--accent`,
>   `index.css:75-76`/`:121-122`), không phải `--primary` — giả định gốc trong `UI_DESIGN_SYSTEM.md` Mục 2
>   sai so với source, đã đính chính tại chỗ (CLAUDE.md §3/§29), không tạo diff giả cho có.
>   **[CẬP NHẬT 2026-09-20, Phase 2 FE-19]** Số liệu audit đã SỬA LẠI: **23/36 trang vi phạm** (không phải
>   26 như bản ghi đầu — lỗi chép nguyên dòng tổng kết sai của agent audit, rút kinh nghiệm CLAUDE.md §34).
>   Theo chỉ định user, đã phân loại lại 23 trang xem nhóm nào CHỈ có
>   `ConfirmDialog`/`WorkflowActionModal` (chờ quyết định thủ công) — nhóm đó **RỖNG** (mọi trang đều có
>   ≥1 tính năng độc lập khác), nên đã đổi default `variant` của `ConfirmDialog.tsx`
>   (`components/shared/`) và `WorkflowActionModal.tsx` (`features/documents/components/`) từ
>   `primary` → `secondary` khi không `danger` — root cause của đa số vi phạm. KHÔNG sửa call site nào ở 23
>   trang. Verify: tạo dữ liệu qua UI thật (không seed DB tay) cho 3 màn (`AssetCategoriesListPage`/
>   `VendorsListPage` dùng `ConfirmDialog`, `MaintenanceCalendarPage` dùng `WorkflowActionModal`), chụp
>   Playwright trước/sau, tự xem bằng mắt xác nhận đổi màu đúng ý — **đánh đổi cần lưu ý**: nút "Huỷ"/"Xác
>   nhận" giờ cùng màu `secondary`, chỉ phân biệt qua vị trí+nhãn (không tự thêm variant mới ngoài scope).
>   FE-17 regression đầy đủ (`a11y.spec.ts`+`visual.spec.ts`) PASS, không violation/baseline mới ngoài
>   finding cũ đã biết. `npm run build`/`vitest run` (25/25)/`oxlint` đều PASS. Chi tiết đầy đủ:
>   `docs/frontend/tasks/FE-19.md`.
>   **[CẬP NHẬT 2026-09-20, GROUP C #1/14]** User chỉ định làm lần lượt 14 trang GROUP C theo thứ tự,
>   xác nhận từng trang trước khi sang trang tiếp — KHÔNG có 1 default chung như Mục 2c, mỗi trang đọc
>   source riêng. **#1 `AssetDetailPage.tsx` — DONE**: audit gốc ghi "6 nguồn primary" nhưng 4/6 là giả tạo
>   do đếm tĩnh (nút submit của 4 modal loại trừ lẫn nhau — KHÔNG sửa, pattern chuẩn cả app); 2 nguồn
>   `WorkflowActionModal` đã tự hết nhờ Mục 2c. Vấn đề thật: "Cấp phát" (primary, giữ nguyên — CTA chính
>   của trang) hiện ĐỒNG THỜI với 2 nút trong `MedicalDeviceSection.tsx` (`Tạo hồ sơ thiết bị y tế`/`Ghi
>   nhận kiểm định`, vô tình mặc định primary) ngay khi tải trang. Đã thêm `variant="secondary"` cho 2 nút
>   đó, theo ĐÚNG tiền lệ sẵn có trên chính trang này (`MaintenancePlanHistorySection.tsx` "Lên lịch bảo
>   trì" đã secondary từ trước). `MedicalDeviceSection.tsx` xác nhận chỉ dùng ở `AssetDetailPage.tsx`.
>   Build/vitest (25/25)/lint PASS, git diff đúng 1 file. **#2 `AssetScanPage.tsx` — DONE**: KHÁC #1, đây
>   là vi phạm THẬT (không phải đếm tĩnh giả) — "Tra cứu" (luôn hiện) và "Xác nhận đã thấy tài sản" (hiện
>   sau khi tìm thấy) cùng primary, không có `ConfirmDialog`/`WorkflowActionModal` liên quan, không có tiền
>   lệ nội bộ để tự chọn như #1 — đã hỏi user qua `AskUserQuestion`, chọn hạ "Tra cứu" xuống `secondary`
>   (giữ "Xác nhận đã thấy tài sản" primary — đó mới là hành động cốt lõi của trang kiểm kê). Build/vitest
>   (25/25)/lint PASS, git diff đúng 1 file. **#3 `DepartmentsListPage.tsx` — KHÔNG CÓ GÌ ĐỂ SỬA**: giống
>   hệt tình huống #1 — "2 tính năng độc lập" (Create/Sync) audit gốc ghi thực ra là 2 modal loại trừ lẫn
>   nhau (`formState.open`/`syncOpen`, không bao giờ cùng mở), header vốn ĐÃ chỉ có 1 primary ("Tạo mới";
>   "Đồng bộ từ Excel" đã secondary sẵn) — KHÔNG tạo diff giả. **#4 `DocumentDetailPage.tsx` — KHÔNG CÓ GÌ
>   ĐỂ SỬA**: header (Xuất PDF/Submit/Sửa/Khôi phục) ĐÃ secondary hết (audit gốc ghi nhầm là primary);
>   section Workflow chỉ có đúng 1 primary khả dĩ ("Duyệt"); 2 `WorkflowActionModal` không-danger đã tự
>   secondary nhờ Mục 2c; các modal khác (`SubmitWorkflowModal`/`DocumentEditModal`) loại trừ lẫn nhau —
>   cùng pattern false-positive như #1/#3. KHÔNG tạo diff giả. **#5 `FilesListPage.tsx` — KHÔNG CÓ GÌ ĐỂ
>   SỬA**: rút ra nguyên tắc phân biệt "trigger+submit CÙNG 1 hành động" (VD "Tải file lên" mở modal → modal
>   có nút "Tải lên" riêng, 2 giai đoạn của CÙNG 1 verb, ĐÚNG như ví dụ `UI_DESIGN_SYSTEM.md` Mục 2 —
>   KHÔNG vi phạm) khác với "2 TÍNH NĂNG khác nhau cùng đòi primary" (VD #1 Cấp phát vs Ghi nhận kiểm định
>   — MỚI là vi phạm thật). KHÔNG tạo diff giả. **[HOÀN TẤT 2026-09-20] #6→14 (9 trang còn lại) — TẤT CẢ
>   KHÔNG CÓ GÌ ĐỂ SỬA**: áp tiêu chí đã đúc kết — 1 vi phạm thật cần 2+ primary CÙNG hiện TĨNH (không qua
>   modal, hoặc không bị modal khác che), khác với "trigger+submit cùng hành động trong 1 modal" hay "nhiều
>   modal loại trừ lẫn nhau" (không phải vi phạm). Đọc source thật cả 9 trang
>   (`ConsumableDetailPage`/`ProfilePage`/`PermissionsListPage`/`PoliciesListPage`/`RoleDetailPage`/
>   `RolesListPage`/`UsersListPage`/`ContractDetailPage`/`VendorDetailPage`) xác nhận mỗi trang đều ĐÃ chỉ
>   có đúng 1 primary tĩnh (nhiều nút audit gốc ghi "primary" thực ra đã `secondary` sẵn) — KHÔNG tạo diff
>   nào. `git status` xác nhận không có source file mới ngoài 4 file đã đổi trước đó
>   (`ConfirmDialog.tsx`/`WorkflowActionModal.tsx` Phase 2, `MedicalDeviceSection.tsx` #1,
>   `AssetScanPage.tsx` #2).
>
>   **GROUP C 14/14 trang HOÀN TẤT — FE-19 DONE HOÀN TOÀN.** Chỉ 2/14 trang có vi phạm thật cần sửa call
>   site (#1, #2 — cả 2 đã sửa), 12/14 còn lại là false positive của audit gốc. Chi tiết đầy đủ:
>   `docs/frontend/tasks/FE-19.md` Mục 2e.
> - **`FE-20`** (2026-09-20, Phân nhóm Sidebar theo domain — yêu cầu trực tiếp từ user kèm ảnh chụp UI,
>   KHÔNG thuộc roadmap/`UI_DESIGN_SYSTEM.md`): `NavItem` (`navigation.ts`) thêm `group?: string`, gán 4
>   nhóm (Tài liệu / Tài sản & Vật tư / Nhà cung cấp / Quản trị hệ thống) theo comment domain đã có sẵn
>   trong chính file, KHÔNG đổi path/permission/thứ tự; Tổng quan/Thông báo/Tệp tin đứng riêng. `Sidebar.tsx`
>   bọc mỗi mục trong `Fragment`, chèn nhãn nhóm (`text-xs uppercase tracking-wide text-muted-foreground`)
>   đúng ranh giới nhóm trong `visibleItems` (đã lọc permission, không sắp lại thứ tự), ẩn khi collapsed. Số
>   task: user gọi "FE-22" ban đầu, không tìm thấy FE-20/21 tồn tại (trái CLAUDE.md §9) — hỏi lại, xác nhận
>   dùng FE-20. Verify: tự chụp Playwright tạm xem đúng ý đồ; build/vitest (25/25)/lint PASS; FE-17
>   regression đầy đủ — a11y Dashboard PASS (3 màn còn lại vẫn finding cũ), **visual CẢ 4 PASS không cần
>   update baseline** (đổi Sidebar nằm trong ngưỡng `maxDiffPixelRatio 0.02`). Ghi nhận không sửa: "Thông
>   báo"/"Tệp tin" đứng ngay sau 1 nhóm có nhãn, không có divider tách biệt trực quan — ngoài phạm vi yêu
>   cầu gốc. Chi tiết: `docs/frontend/tasks/FE-20.md`.
> - **`FE-21`** (2026-09-20, tiếp nối FE-20 — user xem ảnh chụp kết quả, yêu cầu tinh chỉnh thêm):
>   (1) nhãn nhóm to/đậm hơn (`text-xs text-muted-foreground` → `text-sm font-semibold
>   text-sidebar-foreground/70`); (2) accordion THU GỌN/MỞ RIÊNG TỪNG NHÓM (tính năng mới, KHÔNG phải làm
>   đẹp nút thu gọn sidebar có sẵn) — `buildNavBlocks()` gom `visibleItems` (đã lọc permission, không sắp
>   lại) thành khối đơn/nhóm, nhãn nhóm giờ là `<button>` + `ChevronDown` xoay; (3) icon thêm
>   `transition-colors` riêng để đổi màu MƯỢT theo active/hover (dùng đúng token `--sidebar-accent` có sẵn).
>   Cả 3 điểm đều hỏi qua `AskUserQuestion` trước khi code (yêu cầu gốc mơ hồ) — chọn Recommended. Lưu ý đi
>   ngược 1 phần nguyên tắc restraint ở `UI_DESIGN_SYSTEM.md` Mục 5 — đã nêu rõ với user trước khi làm.
>   **Bug tự phát hiện qua FE-17 a11y scan**: `id`/`aria-controls` ban đầu dùng thẳng tên nhóm tiếng Việt có
>   khoảng trắng — KHÔNG hợp lệ IDREF, axe-core bắt lỗi `aria-valid-attr-value` (critical) ở Dashboard — đã
>   sửa bằng `slugifyGroupId()`, chạy lại PASS. Verify: tự chụp Playwright tạm + ràng buộc quan trọng (thu
>   gọn toàn bộ sidebar lúc 1 nhóm đang đóng vẫn hiện đủ icon); build/vitest (25/25)/lint PASS; FE-17
>   regression đầy đủ PASS sau khi sửa bug. Chi tiết: `docs/frontend/tasks/FE-21.md`.
> - **`FE-22`** (2026-09-20, gộp "Thông báo"/"Tệp tin" vào nhóm "Quản trị hệ thống" — user xem ảnh sau
>   FE-21, yêu cầu trực tiếp): Sidebar nhóm theo DÃY LIỀN KỀ trong `NAV_ITEMS` (không tự sắp lại lúc
>   render) — chỉ đổi `group` mà giữ nguyên vị trí sẽ tạo 1 khối "Quản trị hệ thống" TRÙNG TÊN thứ 2 tách
>   rời, nên đã DỜI VỊ TRÍ cả 2 mục xuống ngay sau "Nhật ký audit" (cuối cụm đó) rồi mới gán `group:
>   "Quản trị hệ thống"` — Sidebar tự gộp đúng 1 khối. KHÔNG đổi path/permission. CHỦ ĐỘNG ghi đè ràng buộc
>   "không đổi thứ tự" mà chính FE-20 từng đặt — đã cập nhật comment giải thích lý do (CLAUDE.md §3/§29,
>   không để tài liệu mâu thuẫn source). CHỈ sửa `navigation.ts`, không đụng `Sidebar.tsx`. Verify: tự chụp
>   Playwright tạm xác nhận đúng khối duy nhất; build/vitest (25/25)/lint PASS; FE-17 regression đầy đủ
>   PASS, không cần update baseline. Chi tiết: `docs/frontend/tasks/FE-22.md`.
> - **`DEV-071`** (2026-09-21, cập nhật `04_DATABASE_ANALYSIS.md`/`02_ARCHITECTURE.md` — task tài liệu
>   thuần, KHÔNG đụng code): user báo thiếu 7 model, đếm lại trực tiếp `backend/src/models/` phát hiện
>   **thiếu 10, không phải 7** (thêm `AssetMaintenancePlan`/`DocumentPdfExport`/`DocumentVersion` ngoài 7
>   model user liệt kê) — đã báo lại rồi bổ sung đủ 10 để tài liệu thực khớp source. Model count 21→31.
>   Bổ sung mục 4.22→4.31 ở `04_DATABASE_ANALYSIS.md` (GIỮ NGUYÊN số thứ tự 21 model gốc, không renumber —
>   tránh vỡ tham chiếu "mục 4.X" rải rác trong file), cập nhật quan hệ/index/Mixed-field count, SỬA 1 lỗi
>   cũ không liên quan (Mục 11 gốc ghi sai "không có custom validator" — `ConsumableRequest.items` có).
>   `02_ARCHITECTURE.md`: bổ sung 4 route mount thiếu (`maintenance-plans`/`inventory`/`vendors`/`contracts`),
>   domain Vendors/Inventory mới, 2 cron mới phát hiện (`contractAlerts`/`consumableAlerts`). Sửa
>   `00_PROJECT_MEMORY.md` (2 chỗ "21 model"); `FRONTEND_MEMORY.md` grep xác nhận không có entry liên quan.
>   **[CẬP NHẬT 2026-09-21, cùng ngày]** User yêu cầu làm tiếp 8 file trên (9 file thật, tính cả 2 file
>   trong `module-reviews/`): `15_ARCHITECTURE_REVIEW.md` (2 chỗ), `14_ANALYSIS_AUDIT.md`,
>   `module-reviews/16_DATABASE_CROSS_DOMAIN_REVIEW.md`, `module-reviews/01_AUTH_CODE_REVIEW.md` (2 chỗ),
>   `12_ISSUES_AND_RISKS.md`, `13_FINAL_PROJECT_REPORT.md` (7 chỗ), `11_TECHNICAL_DEBT.md` (2 chỗ),
>   `10_PERFORMANCE_ANALYSIS.md` (2 chỗ), `01_PROJECT_OVERVIEW.md`. Vì đây là báo cáo/snapshot lịch sử
>   Phase 01/04/10/11/12/13/14/15 (COMPLETED, CLAUDE.md §6) — KHÔNG rewrite số gốc, chỉ thêm chú thích
>   `[CẬP NHẬT DEV-071, 2026-09-21]` trỏ về `04_DATABASE_ANALYSIS.md`; riêng `01_PROJECT_OVERVIEW.md` §8 là
>   danh sách file thật nên bổ sung trực tiếp 10 đường dẫn model mới. Tỷ lệ "7/21 model thiếu index" →
>   annotate thành 7/31 (danh sách 7 model không đổi, 10 model mới đều có index). Chi tiết đầy đủ:
>   `docs/development/tasks/DEV-071.md` Mục 8.
> - **`DEV-072`/`FE-23`** (2026-09-21, trang nội bộ "System Design" — bản đồ 31 module + quan hệ dữ liệu,
>   chỉ dev/admin): permission mới `SYSTEM_DESIGN_VIEW` gán cho role `IT` (role kỹ thuật duy nhất trong 6
>   role, không có "DEV" riêng — ADMIN có qua wildcard), KHÔNG dừng hỏi user vì đã tìm được role phù hợp.
>   Dữ liệu module (`frontend/src/features/systemDesign/data/systemModules.ts`) SINH RA từ
>   `04_DATABASE_ANALYSIS.md`/`02_ARCHITECTURE.md`, không tự đọc lại source. Trang
>   (`SystemDesignPage.tsx`) nhóm theo 12 domain, "đường nối quan hệ" thuần CSS (border-left kiểu cây +
>   click-to-scroll/ring-highlight tức thời — KHÔNG animation mới, KHÔNG thư viện diagram). Route + nav item
>   (nhóm "Quản trị hệ thống", cuối dãy liền kề). Build/lint/test backend (39/393) + frontend (25/25) đều
>   PASS. **[CẬP NHẬT cùng ngày]** User đổi ý, cung cấp trực tiếp tài khoản ADMIN (`admin`/`12345678` + mã
>   OTP 2FA) để Claude ghi thẳng DB dev qua API thật (KHÔNG qua UI): `POST /rbac/permissions` tạo
>   `SYSTEM_DESIGN_VIEW` (`_id 6ab0a41e...`), `POST /rbac/roles/:id/assign-permissions` cho CẢ `IT`
>   (37→38 permission) VÀ `ADMIN` (110→111 permission) — gửi kèm ĐỦ permission ID cũ + mới (service
>   `assign-permissions` THAY THẾ toàn bộ danh sách, không cộng dồn — gửi thiếu sẽ xoá sạch quyền cũ của
>   role, đã tránh đúng bẫy này). Verify lại qua `GET /users/me` thật — `admin` có `SYSTEM_DESIGN_VIEW`
>   trong 111 permission. Đã xoá file tạm chứa accessToken ngay sau khi dùng. **User đã tự mở trình duyệt
>   xác nhận chạy được** (2026-09-21, "ok đã chạy được nhé") — `DEV-072`/`FE-23` DONE HOÀN TOÀN, không còn
>   bước nào treo. Dev server vẫn chạy nền: backend port 3000, frontend port **5174** (5173 đang bị 1
>   instance khác chiếm). Chi tiết: `docs/development/tasks/DEV-072.md`, `docs/frontend/tasks/FE-23.md`.
> - **`DEV-073`** (2026-09-21, `GET /api/system-design` — introspect schema THẬT thay vì đọc docs): tái
>   dùng permission `SYSTEM_DESIGN_VIEW` (đã có từ DEV-072, KHÔNG tạo permission trùng — CLAUDE.md §11) thay
>   vì tạo mới như user yêu cầu ban đầu, đã báo rõ lý do. Endpoint đúng layer Route→Controller→Service
>   (`systemDesign.service.ts`): suy `modules` từ tên thư mục `backend/src/models/<domain>/` (quét
>   `fs.readdirSync` + `require()` từng file, tự nhận diện Model export dù file dùng LẪN LỘN
>   `export const`/`export default`), trích `relationships` từ 4 kiểu khai báo `ref` khác nhau trong schema
>   (ObjectId đơn, mảng shorthand, mảng object-literal — 2 cơ chế lưu ref KHÁC HẲN nhau dù cùng "mảng
>   ObjectId ref" về nghiệp vụ, xác nhận qua inspect runtime thật — và subdocument đệ quy). Test mới
>   (5 test, KHÔNG mock, dùng schema thật) — **40 suite/398 test PASS**. Verify HTTP thật: không token→401,
>   token admin→200 đúng `totalModels:31, modules:12, relationships:75`. **CHƯA verify 403** (thiếu tài
>   khoản role khác để test, nêu rõ trong task doc — rủi ro thấp vì dùng chung middleware đã có test riêng).
>   **Phát hiện + sửa luôn 3 lỗi thật trong `04_DATABASE_ANALYSIS.md`** (endpoint bắt được ngay đúng mục
>   đích task): `CalibrationRecord.certificateFileUrl:String` SAI cả tên lẫn kiểu (thật là
>   `certificateFileId: ObjectId ref Upload`), thiếu `AssetCategory --deletedBy--> User`, `Vendor` ghi sai
>   "không có ref ra ngoài" (thật có `createdBy`/`updatedBy`). Viết script Node tạm so sánh toàn bộ 31 model
>   giữa API thật và `frontend/.../systemModules.ts` (FE-23) — phát hiện thêm 4 model lệch (3 lỗi kế thừa từ
>   doc cũ + 1 lỗi transcribe riêng của FE-23 ở `ConsumableCategory`), đã sửa cả 4, verify lại 0 mismatch.
>   Chi tiết đầy đủ: `docs/development/tasks/DEV-073.md`.
> - **`FE-24`** (2026-09-21, cùng ngày — user giao tiếp task graph): **THAY THẾ HOÀN TOÀN FE-23**. Cài
>   `@xyflow/react@12.11.6` (xác nhận `dist-tags.latest` trước khi cài, không dùng bản `-next`), code-split
>   qua `React.lazy` (file riêng `routes/SystemDesignPage.lazy.tsx` — tránh warning oxlint
>   `only-export-components` nếu khai báo thẳng trong `routes/index.tsx`) — verify build thật: chunk
>   `@xyflow/react` 188KB TÁCH RIÊNG khỏi bundle chính. Trang gọi thật `GET /api/system-design` (DEV-073,
>   KHÔNG đổi backend/permission — dùng lại `SYSTEM_DESIGN_VIEW`). Trước khi code, hỏi user
>   (AskUserQuestion) cách xử lý trang FE-23 cũ — user chọn **xoá hẳn** (`data/systemModules.ts` +
>   `SystemDesignPage.tsx` bản card), tránh dead code lệch schema (đúng vấn đề DEV-073 vừa giải quyết).
>   Kiến trúc: Module = group node (khung nét đứt) chứa Model node con (thẻ) — layout grid packing THỦ CÔNG
>   (KHÔNG thêm lib auto-layout thứ 2, chỉ đúng 1 dependency được yêu cầu). Click Module → `fitView`; click
>   Model → `AppDrawer` (field + quan hệ, tái dùng component sẵn có); click edge → `AppDrawer` info quan hệ;
>   MiniMap/Controls dùng thẳng của lib; filter module chỉ gắn `hidden:true` (KHÔNG xoá khỏi state gốc);
>   chọn 1 node → highlight model/edge liên quan + làm mờ phần còn lại (tính lại tức thời, KHÔNG animation
>   — đúng nguyên tắc restraint đã áp dụng từ FE-21). Token màu dùng lại toàn bộ, KHÔNG thêm màu domain
>   riêng (không đủ token dataviz cho 12 module, tránh phá `UI_DESIGN_SYSTEM.md`) — phân biệt Module/Model
>   qua hình dạng. Build/tsc/lint/vitest đều PASS. User đã tự browser-verify xong (2026-09-21, "đã xem qua
>   chạy được") — trạng thái **DONE**. Sau xác nhận, user yêu cầu thêm 5 vòng tinh chỉnh UI nhỏ (đều đã làm,
>   xem `docs/frontend/tasks/FE-24.md` Mục 10→16): (1) transition mượt khi chọn/highlight node (150ms, không
>   custom duration — đúng convention `transition-colors`/`transition-all` trần của project); (2) edge
>   `animated:true` (nét đứt tự chạy, prop built-in của lib); (3) edge type đổi `smoothstep`→`step` (bẻ góc
>   vuông, theo ảnh tham khảo user gửi); (4) **BUG THẬT phát hiện+fix**: `ModelNode.tsx` thiếu `<Handle>` nên
>   edge không hề render dù data đúng (lỗi âm thầm) — đã thêm 2 Handle ẩn (`opacity-0`, `isConnectable=false`)
>   target-trái/source-phải; (5) nhãn cardinality "1"/"N" + tô màu xanh (`--success`)/đỏ (`--destructive`)
>   cho CẢ path/marker/label theo yêu cầu trực tiếp của user — lưu ý đi ngược khuyến nghị cũ FE-09 (không tái
>   dùng màu status cho dataviz identity) nhưng là chỉ định trực tiếp, đã ghi rõ trong task doc. Dev server
>   vẫn chạy sẵn (`:3000`/`:5174`). Chi tiết đầy đủ: `docs/frontend/tasks/FE-24.md`.
> - **Next Task**: chưa được user chỉ định cho phiên kế tiếp. FE-19→24/DEV-071/DEV-072/DEV-073 đều đã DONE
>   (trừ DEV-073 còn 1 việc tuỳ chọn không bắt buộc — verify 403 bằng role khác, xem task doc Mục 7 — mục
>   "đổi `SystemDesignPage.tsx` sang gọi API thật" đã hoàn thành ở FE-24, không còn treo). Việc
>   CẦN LÀM THÊM khác (KHÔNG bắt buộc, chỉ cần khi dùng tính năng tương ứng, thao tác tay qua UI "Phân
>   quyền"): tick 4 `CONSUMABLE_REQUEST_*` cho role USER/IT/PHONG_VAT_TU_TTB (DEV-067) — `Permission`
>   catalog đã có sẵn để chọn. Riêng cho finding contrast ở FE-17 Mục 5: cần user QUYẾT ĐỊNH có duyệt
>   `UI_DESIGN_SYSTEM.md` Mục 2 (đổi token màu `success`) hay chỉ sửa hẹp variant đó — chưa tự ý chọn hướng
>   nào. **FE-18 đang CHỜ user xem `/app` (tab "Tổng quan") trên trình duyệt thật + duyệt** trước khi làm
>   Pass 3 (rollout Mục 4 sang trang khác) — KHÔNG tự bắt đầu Pass 3 khi chưa có xác nhận. Ứng viên khác
>   theo Roadmap: NHÓM D (dài hạn) — KHÔNG tự bắt đầu khi chưa có chỉ định rõ (CLAUDE.md §41). C3 giờ đã
>   DONE (DEV-070) — không còn là ứng viên.
>
> Từ đây trở xuống là nội dung TRƯỚC 2026-09-16, giữ nguyên nội dung gốc để tra cứu lịch sử — không tự ý coi là trạng thái hiện tại.

**Current Task:** DEV-009A (Kích hoạt ABAC domain Document — `GET /:id` department-scoping), resumed từ PAUSED (2026-09-01) theo yêu cầu user.

**Status:** ✅ DONE (2026-09-06) — `npx jest` 16 suite/**97** test PASS, `npx tsc --noEmit` 0 lỗi. Code: wiring ABAC vào `GET /documents/:id` (`loadDocument`+`authorizePermission(enablePolicies)`), bỏ `DOCUMENT_VIEW_DETAIL` khỏi 5 role (IT/USER/TRUONG_KHOA/DIEU_DUONG_TRUONG/BAN_GIAM_DOC), thêm index `Policy`, thêm `seedPolicies()` vào `seed-rbac.ts`. DB dev: áp dụng qua API targeted (KHÔNG chạy seed-rbac.ts) — assign-permissions cho 5 role + tạo Policy mới. **HTTP verify THẬT lần đầu cho nhánh ABAC** (tài khoản `admin` + user thật `thuykhth`): cùng phòng ban→200, khác phòng ban→403, ADMIN bypass→200/200, ID sai format→400, ID không tồn tại→404 — đúng thiết kế. Chi tiết đầy đủ: `docs/development/tasks/DEV-009A.md` Mục 10.

**Toàn bộ 25 development task gốc (DEV-001→025) DONE + DEV-026/027/028/009A cũng DONE** — không còn task backend nào TODO theo roadmap gốc.

**Song song, phía Frontend (`frontend/`)**: FE-00→FE-04 đều **DONE** (Bootstrap → Auth+App Shell+Design System → RBAC UI Foundation → Users/Departments UI thật → Documents Core UI). Chi tiết: `docs/frontend/FRONTEND_MEMORY.md` Mục 1/4/5, từng `docs/frontend/tasks/FE-0X.md`. DEV-027 (fix `validateQuery` Express 5 bug + RBAC IT) và DEV-028 (`GET /workflows/templates`) là 2 backend task nhỏ phát sinh TRONG LÚC code FE-03/FE-04, đã DONE.

**Next Task:** Chưa xác nhận với user cho phiên tiếp theo. Ứng viên rõ ràng nhất: **FE-05 (Workflow UI — hộp thư chờ duyệt + Duyệt/Từ chối/Huỷ/Hoàn tất)**, xem `docs/frontend/tasks/FE-04.md` mục "Readiness". Backend: không còn task TODO theo roadmap gốc, chỉ còn các "Remaining Issues" lẻ tẻ ghi rải rác qua từng `DEV-0XX.md` nếu user muốn dọn tiếp.

**Lưu ý theo dõi sau DEV-009A** (đã cảnh báo từ lúc PLANNED, chưa có evidence xác nhận đúng/sai): nếu `TRUONG_KHOA`/`DIEU_DUONG_TRUONG`/`BAN_GIAM_DOC` trong thực tế cần duyệt đề xuất từ phòng ban KHÁC phòng ban của chính họ, rule "chỉ xem cùng phòng ban" mới áp dụng có thể chặn nhầm luồng duyệt liên phòng ban — cần theo dõi khi FE-05 (Workflow UI) triển khai thật.

**⚠️ QUAN TRỌNG trước khi deploy DEV-014** (task cũ hơn, chưa deploy): (1) mọi RefreshToken cũ sẽ ngừng hoạt động sau deploy (user phải đăng nhập lại — tác dụng phụ đã biết, không phải lỗi); (2) PHẢI xác nhận production ENV đã có `CLIENT_URL` trước khi deploy, nếu không server production sẽ crash ngay lúc khởi động (fail-fast mới thêm).

**⚠️ Lưu ý deploy DEV-018**: 4 index mới nên build qua migration/`mongosh` có kiểm soát thời điểm ở production (không dựa `autoIndex` lúc khởi động app trên collection lớn); dữ liệu `ApiPerformance` cũ giữ format `endpoint` thiếu `baseUrl` cho tới khi TTL 30 ngày tự dọn (không migrate ngược).

**⚠️ QUAN TRỌNG trước khi deploy DEV-021**: (1) `server.ts` nay fail-fast thêm nếu thiếu `JWT_SECRET`/`JWT_REFRESH_SECRET` (production PHẢI có sẵn 2 biến này, giống `CLIENT_URL`); (2) mật khẩu mới (đăng ký/tạo user/đổi/reset) nay yêu cầu ≥8 ký tự (trước 5) — client hiện tại (nếu có) cần cập nhật thông báo validate phía FE để khớp; (3) `changePassword()` nay thu hồi TOÀN BỘ refresh token của user (kể cả phiên đang dùng) — user tự đổi mật khẩu sẽ bị đăng xuất trên mọi thiết bị, cần re-login.

**⚠️ QUAN TRỌNG — DEV-023 XOÁ FILE**: đã xoá hẳn 5 file 100% dead (`shared/errors/errorHandler.ts`, `config/database/mongo.logger.ts`, `services/upload/upload.validator.ts`, `shared/constants/permission.descriptors.ts`, `shared/constants/workflow-docs.ts`) + xoá ~1000 dòng code chết bị comment trong 3 service lớn. **CỐ Ý KHÔNG XOÁ** `middlewares/loadDocument.middleware.ts` (cần cho DEV-009A/ABAC, đang PAUSED) và `rolePermission.map.ts` (đã xác nhận `seed-rbac.ts` thật sự dùng, DEV-021) — dù danh sách gốc REF-018 có liệt kê 2 mục này.

**Next Task:** Chưa xác nhận với user. Ứng viên rõ ràng nhất: 1 FE task nhỏ cập nhật `frontend/src/hooks/usePermission.ts` để đọc `user.permissions` thật (giờ đã có từ DEV-026) thay vì stub `hasPermission()=false`. Sau đó mới nên bắt đầu FE-01 (Authentication UI hoàn thiện + App Shell). Roadmap backend gốc (25 development task) không còn task nào TODO — chỉ còn `DEV-009A` (ABAC domain Document, PAUSED) có thể quay lại nếu user chọn.

**Current Stage:** DEVELOPMENT STAGE (`docs/development/00_DEVELOPMENT_ROADMAP.md`) — song song đã bắt đầu FRONTEND (task-based, `docs/frontend/tasks/`).

**Ghi chú DEV-026** (DONE): `getMeService()` (`users.service.ts`) nay populate thêm `role.isSystemRole` + trả `permissions: string[]` (effective, REUSE `getCachedPermissions()`/`getUserEffectivePermissions()` có sẵn — không logic mới, không cache thứ 2). `extraPermissions`/`denyPermissions` giữ nguyên ObjectId thô. OpenAPI: thêm `Role.isSystemRole` + schema `MeResponseUser` riêng cho `/users/me`. HTTP verify: unauthenticated 401 xác nhận không đổi (request thật); nhánh 200 authenticated CHƯA verify (thiếu tài khoản test, chủ động không tự tạo trong DB thật). Chi tiết: `docs/development/tasks/DEV-026.md`.

**Ghi chú DEV-001** (DONE): đã fix `SEC-28`/`RV02-01` (backdoor rename Role→"ADMIN") bằng 2 guard trong `updateRoleService()`. Guard này KHÔNG bị đụng tới bởi DEV-001A (defense-in-depth độc lập).

**Ghi chú DEV-004** (DONE): khôi phục toolchain Jest hoàn toàn — 4/4 suite, 35/35 test PASS thật. Chi tiết: `docs/development/tasks/DEV-004.md`.

**Ghi chú DEV-001A** (DONE — Phase A): thêm `Role.isSystemRole` (bất biến, không thể set qua API), chuyển 11 vị trí security decision (`authorizePermission` bypass chính + 4 guard `users.service.ts` + 3 domain Document + 2 domain Excel + 1 Dashboard) sang `isSystemRole === true || name === "ADMIN"` (OR — giữ literal fallback chống lockout). Migration script `backend/scripts/migrate-system-role-flag.ts` đã **TẠO nhưng CHƯA CHẠY** trên bất kỳ environment nào (kể cả dev — xác nhận lại khi audit DEV-003: `Role.findOne({name:"ADMIN"}).isSystemRole === false` trên DB dev) — hệ thống vẫn hoạt động đúng nhờ fallback literal. Phase B (xoá literal fallback) CHƯA làm — chờ migration chạy + xác nhận trên mọi environment. Chi tiết: `docs/development/tasks/DEV-001A.md`, plan: `docs/development/DEV-001A_SUPER_ADMIN_IDENTITY_PLAN.md`.

**Exact Next Action** (nếu tiếp tục DEV-001A Phase B): chạy `npx ts-node backend/scripts/migrate-system-role-flag.ts` trên DB dev trước (cần xác nhận với user trước khi ghi dữ liệu), xác nhận `Role.countDocuments({isSystemRole:true})===1`, sau đó mới cân nhắc Phase B (xoá nhánh literal) ở 1 task riêng.

**Ghi chú DEV-002** (DONE): safeguard ADMIN cho `resetPassword()` (`SEC-29`/`RV03-01`). Chi tiết: `docs/00_PROJECT_MEMORY.md` mục DEV-002, `docs/development/tasks/DEV-002.md`.

**Ghi chú DEV-003** (DONE): bật lại `authorizePermission("DOCUMENT_CREATE")` ở `POST /api/documents/proposal` (`SEC-06`/`RV05-02`/ISS-09). Chi tiết: `docs/00_PROJECT_MEMORY.md` mục DEV-003, `docs/development/tasks/DEV-003.md`.

**Ghi chú DEV-006** (DONE): `deleteDocumentsByMonthService()` đổi từ hard-delete sang soft-delete hàng loạt. **Finding ngoài scope chưa xử lý**: bulk-delete-by-month thiếu guard ADMIN-only (role `USER` cũng có `DOCUMENT_DELETE` theo seed data) — cần task riêng, chưa có DEV-XXX nào trong roadmap gốc cho finding này. Chi tiết: `docs/00_PROJECT_MEMORY.md` mục DEV-006, `docs/development/tasks/DEV-006.md`.

**Ghi chú DEV-005** (✅ DONE — 2 lần sửa, lịch sử quan trọng, ĐỌC KỸ nếu liên quan Document/Asset/Workflow):
- **Lần 1 (SAI, đã REVERT)**: tôi hiểu sai chiều business rule — dựa vào `workflow.service.ts` hard-code, đổi `documentRules.ts:CONFIRM_STATUS.referenceSubType` sang `PROPOSE_REPAIR`. User xác nhận rule ĐÚNG là `PROPOSE_INK ↔ CONFIRM_STATUS`, `PROPOSE_REPAIR ↔ CHECK_DAMAGE` (khớp giá trị GỐC). Đã REVERT về đúng giá trị gốc.
- **Lần 2 (ĐÚNG, đã DONE)**: hỏi lại user 2 câu hỏi, xác nhận (1) `CHECK_DAMAGE` mới là subType thực sự đóng luồng `PROPOSE_REPAIR` để sync Asset; (2) `CONFIRM_STATUS`/`PROPOSE_INK` KHÔNG liên quan `Asset.status`. **Fix đúng nằm ở `workflow.service.ts:syncAssetOnDocumentApproved()`** — đổi điều kiện nhánh từ `document.subType === CONFIRM_STATUS` sang `=== CHECK_DAMAGE` (KHÔNG đổi logic bên trong, cùng field `meta.repairResult`, cùng `resolveAssetMaintenanceService`). `documentRules.ts` giữ nguyên giá trị gốc (không phải nguồn bug).
- **Audit DB dev** (chạy 2 lần, theo cả 2 giả thuyết): 2 Asset UNDER_MAINTENANCE, 0 bị kẹt do bug này (cả 2 lần) → KHÔNG cần data remediation trên dev.
- **Verification**: `npx tsc --noEmit` PASS 0 lỗi; `npx jest` 5 suite/40 test PASS — nhưng KHÔNG có test case nào cho `syncAssetOnDocumentApproved` trong `workflow.service.test.ts` (đã kiểm tra), nên PASS chỉ xác nhận không regression chỗ khác, chưa xác nhận đúng fix bằng automated test.
- **Bài học quan trọng cho session sau**: KHÔNG suy luận business rule từ code hiện có (dù có vẻ hợp lý) khi có tài liệu/xác nhận từ chủ dự án mâu thuẫn — luôn ưu tiên xác nhận trực tiếp với user hơn suy luận từ implementation, kể cả khi implementation "trông như" cố ý.
- Chi tiết đầy đủ, không giấu sai sót: `docs/development/tasks/DEV-005.md`.

**TOÀN BỘ STAGE 1 (P0 Critical) của `00_DEVELOPMENT_ROADMAP.md` §8 đã DONE**: DEV-004 → DEV-001 → DEV-001A → DEV-002 → DEV-003 → DEV-006 → DEV-005.

**Ghi chú DEV-010** (DONE — task vừa xong, ĐẦU TIÊN của Stage 2): 2 sub-item độc lập.
- **IMP-014**: bỏ `isActive` khỏi `ASSET_UPDATE_WHITELIST` (`assets.constants.ts`) + `UpdateAssetDTO` (`assets.dto.ts`) — trước đây user chỉ cần `ASSET_UPDATE` (không cần `ASSET_DELETE`) tự set `isActive:false` qua update thường, bỏ qua guard "không xoá asset IN_USE/UNDER_MAINTENANCE" + audit trail `deletedAt`/`deletedBy` của `deleteAssetService()`.
- **IMP-015**: `escapeRegex()` chuyển từ `documents.mapper.ts` (cục bộ) sang `shared/utils/regex.util.ts` (dùng chung), áp dụng cho toàn bộ `$regex` chưa escape ở Departments/RBAC/Assets (9 vị trí, 6 file) — chống ReDoS/lỗi regex khi keyword chứa ký tự đặc biệt.
- `npx tsc --noEmit` PASS 0 lỗi; `npx jest` 5 suite/40 test PASS (không suite nào test riêng 2 fix này).
- **Finding ngoài scope đã ghi nhận KHÔNG sửa**: `users.service.ts:122` cùng lỗi thiếu escape nhưng domain Users không nằm trong "3 domain" roadmap chỉ định; `ASSET_CATEGORY_UPDATE_WHITELIST` vẫn còn `isActive` (roadmap chỉ nói "Asset", không phải "AssetCategory").
- Task file đầy đủ: `docs/development/tasks/DEV-010.md`.

**Ghi chú DEV-007** (DONE — task vừa xong, user chỉ định trực tiếp, KHÔNG theo Suggested Execution Order §8): domain Upload, 4 sub-item IMP-007→010.
- **Quyết định nghiệp vụ đã xác nhận với user**: (1) MIME whitelist `POST /api/upload` = PDF/JPEG/PNG/.docx/.xlsx; (2) `GET /api/upload` list scope = chỉ file của mình, ADMIN xem tất cả.
- IMP-008 (gán `uploadedBy` khi lưu) → IMP-009 (list scope+pagination, **breaking response shape**: `[...]` → `{data,pagination}`) → IMP-010 (403 nếu không phải chủ file/ADMIN ở GET/DELETE `:id`) — làm đúng thứ tự phụ thuộc (IMP-008 là tiền đề bắt buộc).
- `npx tsc --noEmit` PASS 0 lỗi; `npx jest` 5 suite/40 test PASS (không suite nào cho Upload, không xác nhận đúng fix bằng automated test). `openAPI.yaml` đã tự phát hiện+sửa 1 lỗi duplicate key `"403"` do sửa lần đầu gây ra, đã validate lại qua `js-yaml`.
- **Finding ngoài scope đã ghi nhận KHÔNG sửa**: file upload TRƯỚC fix không có `uploadedBy` (chưa audit DB); lỗi Multer vẫn `500` chung (đã có `DEV-017` riêng); module Upload chưa dùng `ApiError`/`catchAsync` chuẩn hoá.
- Task file đầy đủ: `docs/development/tasks/DEV-007.md`.

**Ghi chú DEV-011** (DONE — task vừa xong): định nghĩa permission mới `PERFORMANCE_VIEW` (`permission.constant.ts`), chỉ gán ADMIN (khớp đúng ý định gốc đã ghi trong comment route cũ, không mở rộng ngoài evidence), bật lại `authorizePermission("PERFORMANCE_VIEW")` ở `performance.routes.ts` — trước đây `GET /api/performances/dashboard` chỉ có `authenticate`, 0 authorization thật dù comment/docstring cũ tuyên bố "chỉ ADMIN" (chưa bao giờ implement). Không cần migration/seed DB (ADMIN bypass permission check ở middleware). `npx tsc --noEmit` PASS 0 lỗi; `npx jest` 5 suite/40 test PASS. Tự chạy self-check `permission.descriptors.ts` — entry mới đúng, phát hiện 1 mismatch có sẵn từ trước (`USER_ASSIGN_ROLE`, TASK-002, không do task này). Lưu ý: `backend/scripts/` không git-track — sửa `seed-rbac.ts` có thật trên đĩa nhưng không lên `git diff`. Task file: `docs/development/tasks/DEV-011.md`.

**Ghi chú DEV-008** (DONE — task vừa xong, breaking change, ĐỌC KỸ nếu liên quan API contract): bỏ comment `validateQuery(...)` ở đúng 13 route (7 file: `document.route.ts`, `user.routes.ts`, `userAudit.routes.ts`×3, `asset.routes.ts`×2, `assetCategory.routes.ts`, `notification.routes.ts`, `rbac.routes.ts`×3, `workflow.routes.ts`) — toàn bộ 13 DTO tương ứng đã tồn tại sẵn, khớp chính xác field service dùng (đã trace từng service để xác nhận trước khi sửa), chỉ chưa bao giờ được wire vào route. Đóng đồng thời `IMP-011` (pagination bug: page/limit NaN, isActive string-truthy, sortBy không whitelist) và `IMP-012` (NoSQL injection qua query dạng object, VD `?role[$ne]=null`). **KHÔNG sửa DTO/service nào** — chỉ 13 dòng bỏ comment. **API breaking**: `sortBy` lạ/`limit` vượt cap/`page` không phải số/field sai type → nay `400` thay vì âm thầm sai. `npx tsc --noEmit` PASS 0 lỗi (xác nhận type khớp sẵn); `npx jest` 5 suite/40 test PASS — **nhưng KHÔNG có integration test qua HTTP/route thật cho cả 13 route**, chỉ unit test tầng service, nên PASS không xác nhận hành vi middleware khi request thật đi qua — khuyến nghị mạnh nên test thủ công Postman/curl trước deploy, đặc biệt `GET /documents`/`GET /users`. **Finding ngoài scope đã ghi nhận KHÔNG sửa**: `user.routes.ts:46` dùng `authorizePermission("USER_READ")` không khớp `USER_VIEW` trong `permission.constant.ts` (thuộc `IMP-019`/`DEV-013`). Task file: `docs/development/tasks/DEV-008.md`.

**Ghi chú DEV-009** (DECIDED — spike KHÔNG code, P1 cuối cùng của roadmap): đã xác nhận LẠI trên source hiện tại rằng ABAC vẫn 100% dead runtime (grep `enablePolicies` trong toàn bộ `routes/**`: 0 kết quả, khớp Phase 07/ISS-03). Trình bày 3 phương án (A-Hoàn thiện/B-Gỡ bỏ/C-Hoãn) kèm evidence, effort, risk cho từng phương án — **user chọn Phương án A** (Hoàn thiện/kích hoạt ABAC) qua AskUserQuestion. Task file: `docs/development/tasks/DEV-009.md`.

**Ghi chú DEV-009A** (PLANNED, CHƯA CODE — task vừa xong bước làm rõ scope): trong lúc scoping domain Document đầu tiên, phát hiện thêm 2 vấn đề nghiêm trọng cần hỏi user, KHÔNG tự quyết định:
1. Bug có sẵn: `document.route.ts:54` dùng permission string `"DOCUMENT_DETAIL"` — KHÔNG tồn tại trong catalog (đúng phải `DOCUMENT_VIEW_DETAIL`) → `GET /:id` hiện LUÔN 403 với non-ADMIN. User xác nhận sửa luôn trong DEV-009A (không tách sang DEV-013).
2. Cơ chế ABAC hiện tại chỉ CỘNG THÊM quyền (fallback khi RBAC fail), KHÔNG THỂ dùng để thu hẹp quyền RBAC đã cấp rộng — muốn rule "cùng phòng ban" có hiệu lực bắt buộc phải bỏ `DOCUMENT_VIEW_DETAIL` khỏi role thường. User xác nhận hướng này, và xác nhận áp dụng cho CẢ 5 role đang có quyền này (`IT`/`USER`/`TRUONG_KHOA`/`DIEU_DUONG_TRUONG`/`BAN_GIAM_DOC`) — dù đã CẢNH BÁO rủi ro ảnh hưởng luồng duyệt liên phòng ban của `BAN_GIAM_DOC` (chưa có evidence xác nhận phạm vi duyệt thật của role này).
3. Đã xác nhận: chạy `seed-rbac.ts` trên dev ngay sau khi code (không phải trong lượt này).
Scope cuối: 4 file (`document.route.ts`, `rolePermission.map.ts`, `policy.model.ts` thêm index, `seed-rbac.ts` thêm seed Policy). User chọn dừng ở bước scope để review, sau đó (cùng ngày) **chủ động yêu cầu TẠM DỪNG hẳn**, chuyển sang P2 trước — không phải reject, chỉ hoãn. CHƯA có code nào được sửa. Task file: `docs/development/tasks/DEV-009A.md`.

**Ghi chú DEV-025** (DONE — task vừa xong, TASK CUỐI CÙNG roadmap ban đầu): ARCH-17/21/23/31.
- ARCH-17: thêm comment giải thích vòng đời 2 giai đoạn của `req.user.permissions` ở `express.d.ts`, KHÔNG đổi type.
- ARCH-21 (RESOLVED, TOCTOU thật): `excel.service.ts:importDocumentsExcel` — dò trùng lặp Proposal nay chạy TRONG `withTransaction` (`.session(session)`) thay vì trước — đúng pattern đã có sẵn cho `existingReport` cùng hàm.
- ARCH-23 (RESOLVED): `upload.controller.ts` — 4 handler nay đều theo convention `{success, message?, data?}`; `getFileDetail` trước trả thẳng document không wrapper, nay bọc `{success, data}`.
- ARCH-31 (RESOLVED): `rbac.service.ts`/`users.service.ts` đổi `totalPage`→`totalPages` — khớp OpenAPI đã document sẵn.
- Test mới: `services/excel/__tests__/excel.service.test.ts` (3 test, regression guard cho ARCH-21).
- `npx tsc --noEmit` PASS 0 lỗi; `npx jest` 15 suite/87 test PASS (từ 14/84).
- Task file: `docs/development/tasks/DEV-025.md`.

**Ghi chú DEV-024** (DONE, investigation-only): ARCH-30 (không có structured logger, toàn `console.*`).
- Finding tự nêu điều kiện: chỉ cấp thiết khi có kế hoạch scale ngang — hỏi user qua AskUserQuestion vì đây là quyết định hạ tầng, không suy ra được từ code.
- User xác nhận: **chưa có kế hoạch scale** → quyết định giữ nguyên `console.*`, KHÔNG thêm dependency (winston/pino), KHÔNG đổi code nào.
- Cùng tinh thần DEV-020 (investigation-only, kết luận giữ nguyên hành vi).
- Task file: `docs/development/tasks/DEV-024.md`.

**Ghi chú DEV-023** (DONE): dọn dead code (`ARCH-02/03/08/11/13/15/34`) + hợp nhất duplicate config (`ARCH-14/26/35`).
- Xoá hẳn 5 file (0 tham chiếu, xác nhận lại qua grep): `errorHandler.ts` (deprecated), `mongo.logger.ts`, `upload.validator.ts`, `permission.descriptors.ts`, `workflow-docs.ts` (mồ côi theo).
- Xoá ~1000 dòng code chết bị comment trong `workflow.service.ts` (506d), `assetAssignment.service.ts` (281d), `excel.service.ts` (207d, đúng vùng giữa file).
- Xoá `documents.validator.ts:validateStatusTransition/validateStatusPermission` (0 caller, ARCH-34).
- Hợp nhất rate-limiter (ARCH-26): gỡ `authLimiter` (app.ts, mount rộng), dùng `authRateLimiter` tường minh mọi route kể cả `/reset-password` (trước chỉ bảo vệ ngầm).
- **QUAN TRỌNG — lệch khỏi danh sách gốc REF-018, CÓ CHỦ ĐÍCH**: KHÔNG xoá `loadDocument.middleware.ts` (cần cho DEV-009A/ABAC PAUSED) và `rolePermission.map.ts` (DEV-021 đã xác nhận `seed-rbac.ts` dùng thật — finding gốc liệt kê dead đã outdated).
- KHÔNG sửa: ARCH-02/03 (quan sát kiến trúc, không actionable), ARCH-35 (Multer, finding tự nhận chấp nhận được), `database.ts` "~55 dòng" (đã lỗi thời, hiện chỉ ~20 dòng docstring).
- `npx tsc --noEmit` PASS 0 lỗi (xác nhận hết tham chiếu file đã xoá); `npx jest` 14 suite/84 test PASS.
- Task file: `docs/development/tasks/DEV-023.md`.

**Ghi chú DEV-022** (DONE): `RV02-02` (denyPermissions vô tác dụng ADMIN) + `RV06-08` (VersionError concurrency).
- RV02-02: chỉ ghi rõ comment ở `user.model.ts`/`authorizePermission.middleware.ts` — KHÔNG đổi logic (đúng recommendation gốc, không phải lỗ hổng mở rộng quyền).
- RV06-08: `assetAssignment.service.ts` bắt riêng `VersionError` (race condition assign/transfer/return đồng thời) qua helper `runAssignmentTransaction()`, trả 409 thay vì lộ 500.
- Test mới: `permission.service.test.ts` + mở rộng `authorizePermission.middleware.test.ts` (RV02-02); `assetAssignment.service.test.ts` (RV06-08, 3 test).
- `npx tsc --noEmit` PASS 0 lỗi; `npx jest` 14 suite/84 test PASS.
- Task file: `docs/development/tasks/DEV-022.md`.

**Ghi chú DEV-021** (DONE): bundle 10 finding `SEC-01/02/03/04/09/11/12/17/22/23`.
- Đã VERIFY LẠI từng finding trên source hiện tại trước khi sửa — SEC-09 phát hiện đã OUTDATED (script `seed-rbac.ts` không git-track đã tự resolve, không sửa gì); SEC-11 chỉ còn thiếu phần validateBody (validateParams đã DONE ở DEV-013), phát hiện thêm 2 DTO Departments có sẵn đã LỆCH schema thật (`description`/`isActive` không tồn tại), sửa lại đúng trước khi wire.
- **AskUserQuestion 2 câu**: SEC-17 (MIME magic-byte, cần dependency mới) → hoãn ngoài scope; SEC-22 (`trust proxy`, cần biết hạ tầng) → user xác nhận không có reverse proxy → không bật.
- SEC-01: `changePassword()` thu hồi toàn bộ RefreshToken. SEC-02: min(5)→min(8) CHỈ cho field đặt mật khẩu MỚI (không đụng Login/oldPassword — tránh khoá user cũ), thêm DTO mới cho `resetPasswordByAdmin` (trước đây 0 validate). SEC-03: fail-fast JWT_SECRET/JWT_REFRESH_SECRET. SEC-04: `generateAccessToken` chỉ còn `{id}` (phát hiện doc-comment cũ nói đúng nhưng code thực tế không khớp), dọn populate lồng thừa trong `refresh()`. SEC-12: DTO mới cho `delete-by-month`. SEC-23: `error.middleware.ts` + `upload.controller.ts` không còn lộ `err.message` gốc khi lỗi 500 không xác định.
- `npx tsc --noEmit` PASS 0 lỗi; `npx jest` ban đầu 5 suite/40 test PASS.
- **[Cùng ngày, theo yêu cầu user] Bổ sung test tự động cho 7/8 finding đã sửa** (SEC-01/02/03/04/11/12/23 — SEC-09 không sửa code nên không có gì test): 6 file test mới + mở rộng `users.service.test.ts`. Đáng chú ý: `src/__tests__/server.env.test.ts` test fail-fast của `server.ts` bằng cách `require()` trực tiếp với `dotenv` mocked + luôn xoá đúng 1 biến ENV để đảm bảo `throw` xảy ra TRƯỚC `startServer()` (không có I/O thật nào chạy khi test). `npx jest` sau bổ sung: **12 suite, 78/78 test PASS**.
- Task file: `docs/development/tasks/DEV-021.md` (có bảng chi tiết test↔finding).

**Ghi chú DEV-020** (DONE — spike, KHÔNG đổi code): IMP-027 = ARCH-20.
- Đọc lại evidence: comment gốc trong `excel.service.ts:384-397` xác nhận đánh đổi per-row transaction là CHỦ ĐÍCH (partial-success: 1 dòng lỗi không kéo sập cả file).
- **Benchmark THẬT** (dev DB, replica set 1 node, collection tạm `dev020_bench_tmp` — KHÔNG đụng model thật, tự `drop()` sau khi chạy, xác nhận qua `listCollections` không còn residual): per-row transaction chậm hơn ~4x so với 1 transaction/cả file, ~100-150x so với không transaction. Ước tính ngoại suy ở 5000 dòng (MAX_IMPORT_ROWS): per-row ~26s.
- **AskUserQuestion (3 lựa chọn)**: user chọn **giữ nguyên, KHÔNG đổi code** — lý do: đánh đổi có chủ đích, đã document, import Excel không phải hot-path tần suất cao.
- Không có file source nào thay đổi. Task file: `docs/development/tasks/DEV-020.md`.

**Ghi chú DEV-019** (DONE): IMP-026 = ARCH-28.
- `.env.example`: gộp `CLIENT_URL` từ trùng lặp 2 lần còn 1 dòng (sửa comment sai "Frontend cấu hình port" — thật ra backend dùng cho CORS + email reset password, bắt buộc theo DEV-014); thêm `MONGO_MAX_POOL_SIZE`/`MONGO_MIN_POOL_SIZE` (dùng thật, trước đây thiếu); thêm cảnh báo `MONGO_DEBUG`/`MONGO_SLOW_MS` — `registerMongoLogger()` xác nhận dead code qua grep, set 2 biến này hiện không có tác dụng.
- **Xác nhận, không sửa**: `JWT_EXPIRES_IN` đã comment đúng thực tế (biến chết thật).
- **KHÔNG sửa**: wire lại/dọn `registerMongoLogger()` — thuộc `DEV-023`, ngoài phạm vi DEV-019 (chỉ đồng bộ tài liệu, không đổi code TS nào).
- Chỉ 1 file thay đổi (`backend/.env.example`), không đụng `.env` thật. `npx tsc --noEmit` PASS 0 lỗi; `npx jest` 5 suite/40 test PASS.
- Task file: `docs/development/tasks/DEV-019.md`.

**Ghi chú DEV-018** (DONE): IMP-024 = ISS-05(RV05-08) + PERF-03(RV07-02), IMP-025 = RV11-02.
- Thêm index: `WorkflowInstance {status:1, createdAt:1}` (trước đây KHÔNG có index nào ngoài `_id`, "hộp thư chờ duyệt" COLLSCAN); `Document` + `Asset` cùng shape `{isActive:1, deletedAt:1, createdAt:-1}` (dashboard lọc `isActive`/`deletedAt` ở 8+ vị trí, `Asset` là mở rộng phạm vi mới RV07-02 — Phase 10 gốc chỉ ghi nhận Document).
- Sửa `performance.middleware.ts`: `endpoint` ghép thêm `req.baseUrl` (trước đây chỉ `req.route.path`, gộp lẫn hàng chục domain khác nhau vào cùng 1 nhóm thống kê — hỏng tính đúng của chính dashboard hiệu năng).
- **KHÔNG làm**: chưa chạy `explain("executionStats")` xác nhận IXSCAN thật (cần DB thật + dữ liệu đủ lớn) — chỉ xác nhận đúng shape truy vấn bằng code review.
- `npx tsc --noEmit` PASS 0 lỗi; `npx jest` 5 suite/40 test PASS (không suite nào test index DB/performance middleware).
- Task file: `docs/development/tasks/DEV-018.md`.

**Ghi chú DEV-017** (DONE — task vừa xong): IMP-023 = MEDIUM-13 (RV08-01).
- `error.middleware.ts` thêm nhánh `err instanceof multer.MulterError` → 400 + message tiếng Việt (map 8 `ErrorCode`).
- **Phát hiện quan trọng**: lỗi sai ĐỊNH DẠNG file (ném từ `fileFilter`) KHÔNG phải instance `MulterError` (hành vi đã biết của multer — lỗi fileFilter không được wrap lại) — nhánh MulterError đơn thuần KHÔNG đủ để đóng finding hoàn toàn. Đã sửa riêng 2 nơi ném lỗi (`middlewares/upload.middleware.ts` cho `uploadExcel`, `services/upload/upload.middleware.ts` cho `createUploader()`) dùng `ApiError.badRequest` thay vì `Error` thô — được nhánh `ApiError` (đã có sẵn) xử lý đúng 400.
- **KHÔNG sửa** `upload.validator.ts:validateFiles()` — xác nhận dead code (không gọi ở đâu qua grep), ngoài phạm vi thực tế finding.
- `npx tsc --noEmit` PASS 0 lỗi; `npx jest` 5 suite/40 test PASS (không suite nào test error.middleware.ts/upload middleware).
- Task file: `docs/development/tasks/DEV-017.md`.

**Ghi chú DEV-016** (DONE): IMP-022 = MEDIUM-11(RV05-06) + MEDIUM-12(RV16-02) + RV16-03, gộp 1 task (nhóm "phòng thủ tốt chiều tạo, thiếu chiều huỷ/thay đổi trạng thái", theo `16_DATABASE_CROSS_DOMAIN_REVIEW.md` §C.2).
- **2 câu hỏi business rule đã hỏi và người dùng xác nhận** (cả 2 finding gốc tự đánh dấu UNKNOWN): MEDIUM-11 (soft-delete Document khi WorkflowInstance pending) → chọn **CHẶN** (không tự động cancel workflow); RV16-03 (disable User còn Asset gán) → chọn **CHẶN** (không chỉ ghi nhận).
- MEDIUM-12 xử lý thẳng không cần hỏi: `update()` validate Department dựa trên `effectiveRole` (role mới nếu đổi, hoặc role hiện tại nếu không đổi) thay vì chỉ check khi payload có `role` — đóng bất đối xứng với `Role` (luôn validate).
- **KHÔNG sửa** `deleteDocumentsByMonthService` (batch) — chỉ đúng phạm vi RV05-06 (đơn lẻ).
- `npx tsc --noEmit` PASS 0 lỗi; `npx jest` 5 suite/40 test PASS (không suite nào test `update()`/`disable()`/`deleteDocumentService`).
- Task file: `docs/development/tasks/DEV-016.md`.

**Ghi chú DEV-015** (DONE): IMP-021 = MEDIUM-07 + MEDIUM-08 + MEDIUM-10, gộp 1 task (nhóm "output không neutralize input").
- MEDIUM-07: `escapeCsvField()` (`userAudits.service.ts`) thêm prefix `'` cho field bắt đầu `=`/`+`/`-`/`@`/tab — chống Excel Formula Injection ở CSV export audit log.
- MEDIUM-08: `upload.middleware.ts:storage.filename` dùng `path.basename(file.originalname)` — chống path traversal, đóng đồng thời `POST /api/upload` VÀ `certificateUploader` (Calibration, dùng chung storage).
- MEDIUM-10: file MỚI `shared/utils/html.util.ts:escapeHtml()` (không thêm dependency ngoài) — áp dụng cho email notification (`message`) và email reset password (`fullName`, giữ bản text thuần không escape qua biến `greetingText` riêng).
- `npx tsc --noEmit` PASS 0 lỗi; `npx jest` 5 suite/40 test PASS (không suite nào test riêng 3 khu vực này).
- Task file: `docs/development/tasks/DEV-015.md`.

**Ghi chú DEV-014** (DONE): IMP-020 = MEDIUM-05 + MEDIUM-06 + MEDIUM-09, gộp 1 task (cùng domain Auth).
- MEDIUM-05: `RefreshToken.token` giờ lưu HASH SHA-256 (dùng lại `hashResetToken()` có sẵn cho `PasswordResetToken`, chỉ đổi doc-comment) ở cả 3 chỗ (`login`/`refresh`/`logout`). **Deployment impact**: mọi RefreshToken cũ (plaintext) ngừng khớp sau deploy — user đang login bị buộc đăng nhập lại ở lần refresh tiếp theo, tác dụng phụ 1 lần chấp nhận được.
- MEDIUM-06: `refresh()` bọc `jwt.verify()` try/catch, map lỗi về `ApiError.unauthorized` (401) thay vì rơi 500 lộ message thư viện.
- MEDIUM-09: `server.ts` thêm fail-fast `CLIENT_URL` (cùng pattern PORT/MONGO_URI có sẵn) — **PHẢI xác nhận production ENV đã có CLIENT_URL trước khi deploy**, nếu không server sẽ crash lúc khởi động. Dev `.env` đã có sẵn, an toàn.
- `npx tsc --noEmit` PASS 0 lỗi; `npx jest` 5 suite/40 test PASS (test cũ không assert giá trị `token` cụ thể nên không cần sửa, nhưng cũng chưa xác nhận hành vi mới bằng test riêng).
- Task file: `docs/development/tasks/DEV-014.md`.

**Ghi chú DEV-013** (DONE): IMP-019 = MEDIUM-04 + ARCH-25 + ARCH-29, gộp 1 task.
- Sửa 3 permission string sai catalog (`USER_READ→USER_VIEW`, `USER_DETAIL→USER_VIEW_DETAIL` ở `user.routes.ts`; `DOCUMENT_DETAIL→DOCUMENT_VIEW_DETAIL` ở `document.route.ts` — dứt điểm finding đã phát hiện lúc scoping DEV-009A) + đồng bộ `openAPI.yaml`.
- Nâng type-safety `authorizePermission()`: `string|string[]` → `Permission|Permission[]` (dùng lại type có sẵn, không tạo mới). Chạy `tsc --noEmit` ngay sau đổi chữ ký — **0 lỗi khác ngoài 3 chỗ đã biết**, xác nhận không còn permission string nào lệch catalog trong TOÀN BỘ codebase.
- Thêm `validateParams(IdParamDTO)` nhất quán: `rbac.routes.ts` (6 vị trí PUT/DELETE/assign-permissions trước đó thiếu) + `department.routes.ts` (3 route, trước đó KHÔNG có gì).
- Phải sửa kèm `authorizePermission.middleware.test.ts` (dùng permission giả để test, bị chặn bởi type mới — sửa permission string, giữ nguyên logic/assertion).
- **Phát hiện mới, GHI NHẬN KHÔNG SỬA**: sau fix, `GET /api/users`/`GET /api/users/:id` vẫn 403 mọi non-ADMIN — không role nào giữ `USER_VIEW`/`USER_VIEW_DETAIL` trong `rolePermission.map.ts` (business decision chưa xác nhận, ngoài scope roadmap chỉ định).
- `npx tsc --noEmit` PASS 0 lỗi; `npx jest` 5 suite/40 test PASS. Chưa test HTTP thật.
- Task file: `docs/development/tasks/DEV-013.md`.

**Ghi chú DEV-012** (DONE): 2 sub-item độc lập.
- **IMP-017**: `deleteDepartmentService` thêm check `Asset.exists({ department: id })` (cùng pattern với check `User`/`Document` đã có) — trước đây xoá Department không kiểm tra Asset, để lại reference mồ côi vĩnh viễn.
- **IMP-018**: `hardDeleteAssetService` thêm check `MedicalDeviceProfile.exists({ asset: id })` — trước đây hard-delete Asset không kiểm tra hồ sơ thiết bị y tế, có thể xoá vĩnh viễn dữ liệu kiểm định/hiệu chuẩn không thể khôi phục (không có cascade).
- **Business rule đã hỏi user (AskUserQuestion) và xác nhận**: `AssetAssignmentHistory` (log bất biến) KHÔNG dùng làm điều kiện chặn xoá Department — chỉ check reference Asset HIỆN TẠI, tránh khoá cứng Department không bao giờ xoá được sau khi có luân chuyển tài sản.
- `openAPI.yaml`: thêm response `400` (trước đó thiếu ở cả 2 endpoint) cho `DELETE /api/departments/{id}` và `DELETE /api/assets/{id}/permanent`, đã validate lại qua `js-yaml`.
- `npx tsc --noEmit` PASS 0 lỗi; `npx jest` 5 suite/40 test PASS — **không có unit test riêng cho `departments.service.ts`/`asset.service.ts`**, PASS không xác nhận hành vi 2 check mới, chỉ xác nhận không regression nơi khác. Chưa test qua HTTP thật.
- Task file đầy đủ: `docs/development/tasks/DEV-012.md`.

**Khuyến nghị task tiếp theo thực tế** (chưa xác nhận với user): P2 tiếp theo theo roadmap §8 Stage 5 là `DEV-018` (Performance: index WorkflowInstance/Document/Asset + sửa metric endpoint sai). `DEV-009A` vẫn đang PAUSED, có thể quay lại bất kỳ lúc nào nếu user yêu cầu. Các finding ngoài-scope tồn đọng từ nhiều task trước (test `syncAssetOnDocumentApproved`, naming `topDamagedInkService`, thiếu ADMIN-only guard bulk-delete-by-month, `users.service.ts` regex escape, `ASSET_CATEGORY_UPDATE_WHITELIST.isActive`, file Upload cũ thiếu `uploadedBy`, `permission.descriptors.ts` mồ côi + thiếu `USER_ASSIGN_ROLE` descriptor, thiếu unit test cho `departments.service.ts`/`asset.service.ts`, `GET /api/users` vẫn 403 mọi non-ADMIN do chưa role nào giữ `USER_VIEW`, OpenAPI thiếu `400` ở vài DELETE endpoint RBAC, `RefreshToken.expiresAt` không được `refresh()` kiểm tra trực tiếp, chưa có test tự động cho 3 fix DEV-015, `deleteDocumentsByMonthService` chưa áp dụng check `workflowStatus==="pending"` giống DEV-016, chưa có unit test cho `update()`/`disable()`/`deleteDocumentService`, `upload.validator.ts:validateFiles()` dead code chưa dọn, chưa có test tự động cho nhánh MulterError mới) — chưa có DEV-XXX riêng, có thể cân nhắc gộp 1 task dọn dẹp nếu user muốn. **Nhắc quan trọng cho lần deploy tới**: DEV-014 cần xác nhận `CLIENT_URL` đã set ở production trước khi deploy.

---

**Trạng thái task trước đó:** IMPLEMENTED (2026-08-30) — TASK-001 + TASK-002, xem `docs/tasks/TASK-001.md` và `docs/tasks/TASK-002.md`

- **TASK-002 (mới, mở rộng TASK-001)**: Việc 1 (chặn `create()` tạo ADMIN), Việc 2 (endpoint mới `PATCH /api/users/:id/role` + permission `USER_ASSIGN_ROLE`, wire lại `assignRole()`), Việc 3 (audit read-only DB dev — không tìm thấy bằng chứng khai thác ISS-01) đã hoàn thành. Việc 4 (runtime test qua HTTP) không được yêu cầu, chưa làm.
- **Đã hoàn tất thêm (cùng ngày)**: OpenAPI đã cập nhật cho `PATCH /api/users/{id}/role`; permission `USER_ASSIGN_ROLE` đã tạo và gán cho Role `IT` trong DB dev. **Nếu có DB production riêng, cần lặp lại thao tác gán permission này thủ công ở đó** (chưa làm, ngoài khả năng truy cập của tôi).
- **Lưu ý vận hành quan trọng**: sau TASK-001+002, không còn cách nào qua API để tạo/gán role ADMIN — cần thao tác trực tiếp DB nếu cần tạo ADMIN mới trong tương lai.



- **Task**: TASK-001 — Fix ISS-01/SEC-05/SEC-08 (Privilege escalation lên ADMIN qua `PUT /api/users/:id`)
- **Đã hoàn thành**: Phân tích → verify → plan → APPROVED bởi người dùng → implement. Sửa `update()` trong `backend/src/services/users/users.service.ts`: chặn gán `role.name === "ADMIN"`, gọi `clearPermissionCache()` khi role thực sự đổi. `npx tsc --noEmit` PASS. `git diff` đã review, đúng phạm vi.
- **Documentation đã đồng bộ**: `docs/12_ISSUES_AND_RISKS.md`, `docs/09_SECURITY_ANALYSIS.md`, `docs/07_AUTH_RBAC_ANALYSIS.md`, `docs/00_PROJECT_MEMORY.md` — ISS-01/SEC-05/SEC-08 đánh dấu RESOLVED.
- **CHƯA làm** (theo lựa chọn của người dùng khi APPROVE — "không chọn làm hướng testing"): không có unit test (chưa cài Jest), không có test thủ công qua HTTP client thật. Hành vi runtime sau fix **chưa được xác minh bằng request thật**.
- **Vấn đề tồn đọng, ngoài phạm vi task này** (xem TASK-001 "Vấn đề còn tồn đọng"): `create()` vẫn không chặn tạo user mới với role ADMIN; `assignRole()` vẫn dead code; chưa rà soát DB thật tìm user có thể đã bị escalate trước đây; chưa xác nhận có luồng vận hành hợp pháp nào phụ thuộc hành vi cũ hay không.
- **Exact Next Action**: Nếu có môi trường dev với DB thật, chạy thử tối thiểu 2 case qua HTTP client (`PUT /api/users/:id` với `role=ADMIN` → mong đợi 400; với role khác → mong đợi 200 + quyền có hiệu lực ngay) trước khi coi task DONE hoàn toàn. Nếu không, chờ người dùng xác nhận chấp nhận đánh dấu DONE mà không có runtime verification.

Chưa git commit (theo CLAUDE.md §27 — không tự commit khi chưa được yêu cầu).

---

## 6. XỬ LÝ TASK

Khi nhận task mới:

1. Hiểu yêu cầu.
2. Phân loại task.
3. Chỉ đọc các tài liệu dự án liên quan.
4. Xác minh source code hiện tại.
5. Xác định các module bị ảnh hưởng.
6. Truy vết các dependency.
7. Kiểm tra ảnh hưởng đến API.
8. Kiểm tra ảnh hưởng đến database.
9. Kiểm tra ảnh hưởng đến authentication/RBAC.
10. Kiểm tra ảnh hưởng giữa frontend/backend.
11. Xác định yêu cầu kiểm thử.
12. Xác định rủi ro.
13. Lập kế hoạch khi task không đơn giản.
14. Chỉ triển khai trong phạm vi yêu cầu.
15. Chạy các test liên quan.
16. Review thay đổi.
17. Cập nhật tài liệu khi cần.
18. Cập nhật PROJECT_MEMORY khi cần.
19. Cập nhật Mục 5 (trạng thái/Next Task) của SESSION_HANDOFF sau MỌI task — kể cả khi task đã DONE trọn vẹn trong cùng phiên, không chỉ khi task còn dở dang. Chỉ cần cập nhật ngắn gọn "trạng thái thật hiện tại + Next Task", không chép lại narrative chi tiết (đã có ở PROJECT_MEMORY/FRONTEND_MEMORY/task file riêng) — tránh để Mục 5 lệch khỏi thực tế như đã từng xảy ra (xem cảnh báo ⚠️ CẬP NHẬT THẬT ở đầu Mục 5).

---

## 7. TRẠNG THÁI TASK

Sử dụng một trong các trạng thái:

```text
TODO
ANALYZING
PLANNED
IN_PROGRESS
IMPLEMENTED
TESTING
REVIEW
DONE
BLOCKED
```

Đối với task đang hoạt động, tài liệu này phải thể hiện rõ:

- Task hiện tại
- Mục tiêu
- Trạng thái hiện tại
- Công việc đã hoàn thành
- Các file đã phân tích
- Các file đã chỉnh sửa
- Các function/class quan trọng
- Ảnh hưởng đến API
- Ảnh hưởng đến database
- Ảnh hưởng đến security/RBAC
- Các test đã thực hiện
- Kết quả test
- Các vấn đề đã biết
- Các câu hỏi chưa được giải quyết
- Hành động tiếp theo chính xác

---

## 8. NGUỒN SỰ THẬT

Khi thông tin xung đột, sử dụng thứ tự ưu tiên:

```text
SOURCE CODE HIỆN TẠI
>
CONFIGURATION
>
TESTS
>
ĐỊNH NGHĨA DATABASE/API
>
TÀI LIỆU DỰ ÁN HIỆN TẠI
>
PHÂN TÍCH LỊCH SỬ
>
COMMENTS
>
ASSUMPTIONS
```

Nếu tài liệu phân tích lịch sử xung đột với implementation hiện tại:

1. Xác minh source code hiện tại.
2. Xác định xung đột.
3. Xem implementation hiện tại là nguồn sự thật hiện tại.
4. Cập nhật tài liệu bị ảnh hưởng khi phù hợp.
5. Ghi nhận các thay đổi quan trọng trong PROJECT_MEMORY.

Không được âm thầm giả định rằng phân tích lịch sử vẫn còn chính xác.

---

## 9. QUY TẮC PHÁT TRIỂN QUAN TRỌNG

Không được:

- Tự động chạy lại 13 phase ban đầu.
- Chỉnh sửa các file không liên quan.
- Refactor mù.
- Thêm dependency không cần thiết.
- Thay đổi public API contract mà không có phê duyệt phù hợp.
- Thực hiện thay đổi database mang tính phá hủy mà không có phê duyệt rõ ràng.
- Làm yếu authentication hoặc authorization.
- Xóa validation mà không có lý do chính đáng.
- Âm thầm thay đổi business rule.
- Khẳng định test đã pass khi chưa thực sự chạy.
- Tự động commit thay đổi nếu chưa được yêu cầu.

Ưu tiên:

```text
NHỎ
>
DỄ REVIEW
>
DỄ KIỂM THỬ
>
DỄ HOÀN TÁC
```

---

## 10. AN TOÀN GIT

Trước khi thực hiện các thay đổi quan trọng:

```text
git status
git branch
```

Sau khi chỉnh sửa:

```text
git diff
```

Không được thực hiện những hành động sau nếu chưa có quyền rõ ràng:

- Reset thay đổi của người dùng.
- Xóa công việc của người dùng.
- Xóa file untracked.
- Force push.
- Viết lại lịch sử Git.
- Chuyển branch.

---

## 11. API / DATABASE / AUTHENTICATION

Đối với thay đổi API, xác minh:

```text
Route
→ Middleware
→ Controller
→ Service
→ Validation/DTO
→ Model/Data Access
→ Response
```

So sánh implementation với OpenAPI khi phù hợp.

Đối với thay đổi database, kiểm tra:

- Model
- Schema
- Fields
- Relationships
- Indexes
- Queries
- Aggregations
- Transactions
- Validation
- Các giả định về dữ liệu hiện có

Đối với chức năng được bảo vệ, xác minh:

```text
Request
→ Authentication
→ User
→ Role
→ Permission
→ Resource
→ Authorization
→ Controller
→ Service
```

Không bao giờ mặc định:

```text
Authenticated = Authorized
```

---

## 12. KIỂM THỬ

Sau khi triển khai, thực hiện các kiểm tra liên quan có sẵn trong project:

- Unit tests
- Integration tests
- API tests
- Authentication tests
- Authorization tests
- Type checking
- Linting
- Build

Sử dụng các command được định nghĩa bởi project.

Không tự tạo command không tồn tại.

Nếu không thể chạy một test, phải ghi rõ:

- Vì sao không thể chạy.
- Đã thử những gì.
- Điều gì vẫn chưa được xác minh.

---

## 13. ĐỒNG BỘ TÀI LIỆU

Cập nhật tài liệu khi implementation làm thay đổi ý nghĩa hiện tại của tài liệu.

Ví dụ:

```text
Thay đổi kiến trúc
→ Tài liệu kiến trúc

Thay đổi API contract
→ Tài liệu API / OpenAPI

Thay đổi database
→ Tài liệu database

Thay đổi business rule
→ Tài liệu business logic

Thay đổi security
→ Tài liệu security

Thay đổi lớn về trạng thái project
→ PROJECT_MEMORY
```

Giữ cho tài liệu đồng bộ với implementation hiện tại.

---

## 14. CÁC HOẠT ĐỘNG SAU PHÂN TÍCH — TÙY CHỌN

Các hoạt động sau có thể thực hiện khi cần:

```text
Phase 14 — Kiểm toán phân tích
Phase 15 — Review kiến trúc
Phase 16 — Lập kế hoạch refactoring
Phase 17 — Tăng cường bảo mật
Phase 18 — Chiến lược kiểm thử
Phase 19 — Lộ trình cải tiến
```

Đây là các hoạt động **tùy chọn**, không bắt buộc.

Không tự động thực hiện chúng.

Phase 20+ là phát triển theo task dựa trên yêu cầu và mức độ ưu tiên thực tế.

---

## 15. TIẾP TỤC PHIÊN LÀM VIỆC

Khi tiếp tục công việc trong một Claude Code session mới:

1. Đọc `CLAUDE.md`.
2. Đọc `docs/00_PROJECT_MEMORY.md`.
3. Đọc file này.
4. Xác định task hiện tại.
5. Chỉ đọc các tài liệu dự án liên quan.
6. Kiểm tra source code hiện tại.
7. Tiếp tục từ trạng thái đã được ghi nhận.

Không tái dựng kiến thức project từ conversation history nếu tài liệu đã có sẵn.

---

## 16. TRẠNG THÁI BÀN GIAO HIỆN TẠI

> **⚠️ CẬP NHẬT THẬT — 2026-09-16**: khối bên dưới (bao gồm câu "Chờ người dùng chỉ định TASK cụ thể... TASK-006") là trạng thái từ **TRƯỚC `DEV-001`** — cũ hơn cả nội dung Mục 5, giữ nguyên làm lịch sử. Trạng thái thật hiện tại: xem khối "⚠️ CẬP NHẬT THẬT — 2026-09-16" ở đầu Mục 5.

**SẴN SÀNG BÀN GIAO — POST-ANALYSIS ROADMAP HOÀN TẤT**

Dự án đã hoàn thành phân tích 13 phase ban đầu + Phase 14→19 (Audit/Architecture/Refactoring/Security/Testing/Roadmap). Toàn bộ finding đã CONFIRMED và tổng hợp thành `docs/19_IMPROVEMENT_ROADMAP.md` (24 refactor candidate, 19 test case, 6 task candidate P0). Chưa có task nào trong số này được implement.

Hiện tại không có task nào đang thực hiện.

Hành động tiếp theo:

> Chờ người dùng chỉ định TASK cụ thể (khuyến nghị `TASK-006` — khôi phục toolchain test — làm trước) để bắt đầu TASK-BASED DEVELOPMENT.

Khi task mới bắt đầu, thay thế các section liên quan trong tài liệu này bằng trạng thái thực tế của task.

---

## 17. HÀNH ĐỘNG TIẾP THEO CHÍNH XÁC

> **⚠️ CẬP NHẬT THẬT — 2026-09-16**: 2 khối bên dưới (patch 2026-09-06 và khối gốc DEV-025/DEV-009A PAUSED) đều đã lỗi thời, giữ nguyên làm lịch sử. Trạng thái thật + Next Task: xem khối "⚠️ CẬP NHẬT THẬT — 2026-09-16" ở đầu Mục 5.

> ⚠️ Khối text dưới đây (giữ nguyên làm lịch sử) dừng ở thời điểm DEV-025/DEV-009A PAUSED.
> **Cập nhật thật 2026-09-06**: DEV-009A đã RESUMED và DONE (xem Mục 5 ở trên +
> `docs/development/tasks/DEV-009A.md` Mục 10). DEV-026/027/028 cũng đã DONE. Song song,
> FE-00→FE-04 đã DONE (`docs/frontend/FRONTEND_MEMORY.md`). Next task đề xuất: **FE-05
> (Workflow UI)** — xem `docs/frontend/tasks/FE-04.md` mục Readiness — hoặc 1 trong các
> "Remaining Issues" backend liệt kê bên dưới nếu user muốn dọn tiếp phía backend.

```text
STAGE 1 (P0) DONE HOÀN TOÀN. TOÀN BỘ P1 (DEV-010, DEV-007, DEV-011, DEV-008, DEV-012,
DEV-009) ĐÃ DONE/DECIDED. DEV-009A (domain Document GET /:id) PLANNED đầy đủ nhưng
⏸️ PAUSED theo yêu cầu user — quay lại bất kỳ lúc nào, đọc DEV-009A.md trước, không
hỏi lại các câu đã chốt. TOÀN BỘ P2 (DEV-013→020, roadmap §8 Stage 5) ĐÃ DONE. P3 Stage 6
ĐÃ XONG TOÀN BỘ: DEV-021, DEV-022, DEV-023 (dọn dead code — ĐÃ XOÁ 5 file + ~1000 dòng,
xem cảnh báo "DEV-023 XOÁ FILE" ở trên nếu cần biết chính xác file nào), DEV-024 (cân
nhắc structured logger ARCH-30 — user xác nhận CHƯA có kế hoạch scale → KHÔNG đổi code),
DEV-025 (API response consistency ARCH-17/21/23/31 — ĐÃ ĐỔI `totalPage`→`totalPages`
ở rbac/users.service.ts, bọc response Upload theo convention, sửa TOCTOU thật ở Excel
import bằng cách đọc trùng lặp TRONG transaction, thêm 3 test regression) ĐÃ DONE.
**TOÀN BỘ 25 DEVELOPMENT TASK (DEV-001→025) THEO ROADMAP BAN ĐẦU ĐÃ DONE.** CHỜ CHỈ ĐỊNH
CỦA USER: không còn task TODO nào theo roadmap gốc — lựa chọn còn lại là (1) quay lại
DEV-009A (ABAC domain Document GET /:id, đang PAUSED, đã PLANNED đầy đủ, đọc DEV-009A.md
trước, không hỏi lại câu đã chốt), (2) xử lý 1 trong các "Remaining Issues" đã ghi nhận
rải rác qua từng task DEV-0XX.md (ARCH-02/03/09/35, RV05-07 TOCTOU domain Asset, v.v. —
đều đã ghi CONFIRMED nhưng cố ý chưa sửa vì ngoài scope lúc đó), hoặc (3) task/tính năng
MỚI do user chỉ định.
KHUYẾN NGHỊ RIÊNG cho DEV-008/DEV-012: nên test thủ công HTTP thật trước khi deploy
(breaking change ở cả 2, chưa có integration test qua route).
KHUYẾN NGHỊ RIÊNG cho DEV-014: PHẢI xác nhận production ENV có `CLIENT_URL` trước
khi deploy (server sẽ crash lúc khởi động nếu thiếu — fail-fast mới thêm); mọi
RefreshToken cũ sẽ ngừng hoạt động sau deploy (user phải đăng nhập lại).
```

Khi nhận task:

```text
PHÂN LOẠI TASK
→
ĐỌC KIẾN THỨC LIÊN QUAN
→
XÁC MINH SOURCE
→
LẬP KẾ HOẠCH NẾU CẦN
→
TRIỂN KHAI
→
KIỂM THỬ
→
REVIEW
→
CẬP NHẬT TÀI LIỆU
→
CẬP NHẬT HANDOFF
```
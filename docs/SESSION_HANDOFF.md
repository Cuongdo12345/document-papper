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
> - **`DEV-074`/`FE-25`** (2026-09-21, cùng ngày) — mở rộng `GET /api/system-design` (KHÔNG route/permission
>   mới, dùng lại `SYSTEM_DESIGN_VIEW`): mỗi module trong `modules[]` thêm `description`/`features` (file
>   cấu hình tĩnh mới `backend/src/services/systemDesign/moduleDescriptions.ts`, viết dựa trên đọc thật
>   `FRONTEND_MEMORY.md`/`PROJECT_MEMORY.md`/`13_FINAL_PROJECT_REPORT.md` Module Map — không bịa) và
>   `relatedDocs` (file mới `relatedDocs.ts` — quét ĐỘNG `docs/development/tasks/*.md`+
>   `docs/frontend/tasks/*.md` tìm file nhắc `models/<module>/`/`features/<module>/`, trả URL GitHub thật,
>   KHÔNG cache, KHÔNG hard-code danh sách). Tìm repo root bằng cách đi lên từ `__dirname` tới khi thấy
>   `docs/development/tasks` — KHÔNG hard-code số cấp `..` cố định (khác dev/prod dist, xem lý do đầy đủ ở
>   `DEV-074.md` Mục 4). FE (`FE-25`): mở rộng Drawer đã có ở FE-24 (KHÔNG trang mới) — click Module vừa
>   `fitView` như cũ vừa mở Drawer hiện mô tả+tính năng+link GitHub (mở tab mới), KHÔNG markdown renderer.
>   Cập nhật CLAUDE.md §36 thêm bước 9 mới (renumber bước cũ thành 10): nhắc cập nhật
>   `moduleDescriptions.ts` khi thêm module mới. Test mới `relatedDocs.test.ts` (4 test, không mock) +
>   `tsc`/lint/build/vitest frontend đều PASS, `jest` backend 41 suite/402 test PASS. **CHƯA tự verify trực
>   quan trên trình duyệt** — user tự kiểm tra. Chi tiết: `docs/development/tasks/DEV-074.md` +
>   `docs/frontend/tasks/FE-25.md`.
> - **`DEV-075`/`FE-26`** (2026-09-21, cùng ngày — user muốn 1 trang UI cho "tài liệu phân tích tổng quan
>   chung về cấu trúc dự án"): trang MỚI **"Tài liệu dự án"** (`/app/project-docs`, KHÁC pattern gần đây —
>   đây LÀ route/nav item mới, không mở rộng trang có sẵn), dùng lại `SYSTEM_DESIGN_VIEW`. Đã hỏi rõ 3 quyết
>   định trước khi code: (1) phạm vi CHỈ 12 file `01_PROJECT_OVERVIEW.md`→`13_FINAL_PROJECT_REPORT.md` (loại
>   `00_PROJECT_MEMORY.md` — memory/index không phải phase — và `06` không tồn tại), KHÔNG gồm 14-22/module-
>   reviews/task doc riêng; (2) render bằng `react-markdown@10.1.0` (xác nhận `dist-tags.latest` trước khi
>   cài); (3) phát hiện cả 12 file đều dùng bảng GFM → cần thêm `remark-gfm@4.0.1` (dependency thứ 2, user
>   đồng ý) nếu không bảng sẽ hiển thị hỏng. **Đây là markdown renderer ĐẦU TIÊN của dự án** — style map thủ
>   công sang token màu sẵn có, KHÔNG cài `@tailwindcss/typography` (dependency thứ 3 ngoài phạm vi đã duyệt).
>   Backend: `GET /api/project-docs` (danh sách, `title` suy từ dòng H1 đầu file) + `GET
>   /api/project-docs/:id` (nội dung, chặn path traversal 2 lớp: regex + whitelist file thật) — quét ĐỘNG
>   `docs/`, KHÔNG hard-code tên file. Tách `findRepoRoot()` (viết lần đầu ở DEV-074) thành helper dùng chung
>   `shared/helpers/findRepoRoot.ts`, refactor `relatedDocs.ts` (DEV-074) dùng lại — verify test DEV-074 vẫn
>   PASS nguyên vẹn sau refactor. Code-split qua `React.lazy` (`ProjectDocsPage.lazy.tsx`) — verify build:
>   chunk 158KB tách riêng khỏi bundle chính. Test mới `projectDocs.service.test.ts` (5 test, không mock, có
>   test path traversal) — `jest` backend 42 suite/407 test PASS, `tsc`/lint/build/vitest frontend PASS.
>   curl runtime thật `GET /api/project-docs` không token → 401 đúng thiết kế. User đã tự browser-verify xong
>   ("ok đã xong nhe", 2026-09-21) — trạng thái **DONE**. Chi tiết: `docs/development/tasks/DEV-075.md` +
>   `docs/frontend/tasks/FE-26.md`.
> - **[CẬP NHẬT 2026-09-23]** `CONSUMABLE_REQUEST_*` (DEV-067) — **ĐÃ GÁN XONG** cho USER/IT/
>   PHONG_VAT_TU_TTB qua đúng flow `assignPermissionsToRoleService` (verify DB dev thật trước/sau), xem
>   CLAUDE.md §41. `FE-18` (Dashboard KPI display/gộp muted) — **User đã duyệt qua screenshot thật**
>   (2026-09-23), mở khoá Pass 3. `FE-27` (Pass 3a — THÍ ĐIỂM gộp `FilterBar`+`DataTable` 1 khung viền,
>   CHỈ trên `UsersListPage`, `FilterBar` thêm `variant="embedded"` backward-compatible) — **DONE, user đã
>   duyệt qua screenshot thật trên dev server**. Build/lint/vitest/visual-regression/a11y đều verify (a11y
>   fail đúng lỗi CŨ đã biết `StatusBadge` contrast, không phải regression mới). Đã cập nhật baseline
>   `users-datatable-chromium-win32.png` (thực tế byte không đổi — diff quá nhỏ để lệch ảnh).
> - **[CẬP NHẬT 2026-09-23, `FE-28.md`]** User yêu cầu trực tiếp cả 2 việc còn treo — ĐÃ XONG:
>   (1) Pass 3b — rollout gộp khung `FilterBar`+`DataTable` ra 17 trang/component còn lại (số thật, không
>   phải 31 — xem `FE-28.md`), `DocumentsListPage.tsx` KHÔNG áp dụng được (không dùng `FilterBar`);
>   (2) đóng nợ kỹ thuật contrast `StatusBadge` success (FE-17 Mục 5) — thêm token RIÊNG
>   `--success-strong` (KHÔNG đổi `--success` gốc), 4/4 test a11y đại diện nay PASS. Verify đầy đủ
>   typecheck/lint/vitest/build/a11y/visual-regression + spot-check screenshot 3 trang đa dạng cấu trúc.
> - **[CẬP NHẬT 2026-09-23, `FE-29.md`]** User yêu cầu xử lý tiếp 2 việc treo từ `FE-28.md` — ĐÃ XONG:
>   (1) audit 8 file (không phải 7) dùng `text-success`/`bg-success/10` ngoài `StatusBadge` bằng tính
>   toán contrast thật (công thức OKLCH→sRGB + WCAG relative-luminance, cùng công thức axe-core) — 3/8
>   có lỗi thật (chữ thật trên nền tint/nhạt, dưới AA 4.5:1) đã sửa (`SystemDesignLegend.tsx`,
>   `MaintenanceCalendarPage.tsx`, `TwoFactorSection.tsx`, cùng pattern `text-success`→
>   `text-success-strong`), 5/8 chỉ dùng cho icon nên chỉ cần ngưỡng 3:1 (WCAG 1.4.11), đã PASS, không
>   sửa; (2) tính lại contrast `--success-strong` dark mode — PASS thoải mái (8.5–8.8:1), nhưng phát
>   hiện quan trọng: **dark mode hiện KHÔNG thể bật được trong app thật** (grep toàn bộ `src/` không có
>   code nào áp class `.dark`/theme toggle) — token CSS dark tồn tại từ FE-01 nhưng là dead code, chưa
>   có tính năng bật dark mode thật, nên chưa thể verify bằng test browser thật, chỉ có bằng chứng tính
>   toán. Verify đầy đủ typecheck/lint/vitest/build/a11y/visual-regression (8/8 PASS, không có regression,
>   nhưng 4 màn đại diện không cover trực tiếp 3 file vừa sửa).
> - **[CẬP NHẬT 2026-09-23, `FE-30.md`]** Dark mode — user yêu cầu làm thật (2 lựa chọn Light/Dark,
>   KHÔNG có "System"; nút toggle icon đơn ở `Header.tsx`, KHÔNG đặt trong dropdown user menu) — **DONE**.
>   `stores/uiStore.ts` thêm `theme`+`toggleTheme()` (tái dùng persist key `dp_ui_prefs` có sẵn), hook
>   MỚI `hooks/useThemeSync.ts` áp class `.dark`, script inline trong `index.html` chống FOUC. Verify đầy
>   đủ typecheck/lint/vitest/build + **12/12 e2e PASS** (4 test light cũ + 4 test dark MỚI thêm vào
>   `a11y.spec.ts`, click toggle thật rồi chạy axe-core — bằng chứng THẬT đầu tiên `--success-strong`
>   dark mode PASS, đóng nốt phần "chưa thể verify tự động" treo từ `FE-29.md`) + spot-check screenshot
>   (kể cả reload để xác nhận persist + không FOUC).
> - **[CẬP NHẬT 2026-09-23, cùng ngày]** User tự xác nhận đã kiểm tra bằng mắt thật 30+ trang còn lại ở
>   dark mode (OK, không cần audit lại) + yêu cầu thêm visual-regression baseline riêng cho dark mode —
>   **ĐÃ XONG**: `e2e/visual.spec.ts` thêm 4 snapshot dark mode (`*-dark.png`, describe
>   `"FE-30 — Dark mode visual regression snapshot"`, bật dark mode qua click toggle thật), baseline tạo
>   + re-run xác nhận ổn định, **16/16 e2e PASS** (8 a11y + 8 visual, cả light lẫn dark). Xem `FE-30.md`
>   Mục 4.
> - **[CẬP NHẬT 2026-09-23, `FE-31.md`]** `DocumentsListPage.tsx` — user yêu cầu làm nốt ("ok làm giúp
>   tôi") — **DONE**: áp kết quả hình ảnh của pattern gộp khung (`divide-y`+viền ngoài+nền tint filter)
>   lên layout custom sẵn có của trang này (KHÔNG sửa component `FilterBar` chung — trang vẫn không dùng
>   nó, đúng quyết định gốc 2026-09-18). Verify đầy đủ + spot-check 3 trạng thái (thu gọn/mở nâng cao/dark
>   mode) đều đúng. **18/18 trang dùng dạng "khung filter + DataTable" giờ đồng nhất 1 pattern** — không
>   còn trang nào lệch trong phạm vi rollout Pass 3b/FE-27→31.
> - **[CẬP NHẬT 2026-09-24, `DEV-076.md`]** User hỏi "phần Thiết bị y tế cần phát triển thêm tính năng
>   nào không" — rà soát code phát hiện 3 gap thật (không đoán): (1) thiếu cảnh báo hết hạn giấy phép
>   lưu hành (`licenseExpiredAt` có lưu nhưng không cron nào theo dõi — chính comment gốc code đã ghi
>   nhận gap này); (2) `operatorCertificateRequired` chỉ là cờ boolean, không theo dõi ai được chứng
>   nhận/khi nào hết hạn; (3) báo cáo tuân thủ mẫu Bộ Y tế cho thiết bị y tế — từng bị hoãn ở C3 gốc vì
>   chưa có mẫu cụ thể. User chọn làm mục (1) — **DONE**: `checkLicenseExpiringService()` MỚI (mirror
>   đúng `checkWarrantyExpiringService`/`checkCalibrationDueService`), field `licenseAlertSentAt` +
>   index mới, `NotificationType.MEDICAL_DEVICE_LICENSE_EXPIRING` mới, reset alert khi sửa hạn qua PUT,
>   `runMedicalDeviceAlertsService()` nay chạy song song cả 2 loại cảnh báo. **2 file test MỚI** (11 test)
>   cho 2 service trước đây 0% coverage. `jest` backend: 44 suite/**418** test PASS (tăng từ 42/407).
>   `tsc`/build backend + frontend đều PASS (FE chỉ thêm 1 field type cho khớp, không có UI mới — cảnh
>   báo hiển thị qua `NotificationBell` chung có sẵn). Mục (2)/(3) CHƯA làm — ghi nhận, chưa có yêu cầu.
> - **[CẬP NHẬT 2026-09-24, `DEV-077.md`]** User yêu cầu làm tiếp mục (2) ("theo dõi chứng chỉ vận hành
>   nhé") — **DONE**: domain MỚI hoàn chỉnh `OperatorCertificate` (gắn 1 User + 1 AssetCategory, KHÔNG
>   theo từng Asset — 4 quyết định nghiệp vụ đã xác nhận qua AskUserQuestion 2 vòng trước khi code: gắn
>   User cụ thể, phạm vi theo danh mục, cảnh báo gửi CẢ role IT LẪN người có chứng chỉ, CHẶN gán/chuyển
>   giao thiết bị cho user chưa đủ điều kiện). Backend: model/dto/service/route/permission mới đầy đủ,
>   guard tích hợp vào `assignAssetService`/`transferAssetService`, cảnh báo hết hạn gộp vào cron Medical
>   Device đã có (`runMedicalDeviceAlertsService()` nay trả 3 khoá). Frontend: section MỚI trong
>   `MedicalDeviceSection.tsx` ("Người vận hành đủ điều kiện") + modal cấp chứng chỉ. **`jest` backend:
>   45 suite/439 test PASS** (tăng từ 44/418 — 3 file test, +21 test, cover cả guard chặn gán thiết bị).
>   `tsc`/build cả 2 phía PASS, `playwright` a11y+visual 16/16 PASS. **Spot-check end-to-end THẬT qua UI**
>   (tạo Khoa/Phòng→Danh mục→Asset→Hồ sơ→cấp chứng chỉ, assertion tự động xác nhận list cập nhật đúng).
>   Mục (3) (báo cáo tuân thủ mẫu Bộ Y tế) VẪN CHƯA làm — cần mẫu cụ thể trước, chưa có yêu cầu mới.
> - **[CẬP NHẬT 2026-09-24, `DEV-077.md` Mục 5b]** User báo "chưa thấy UI phân quyền và UI phần vừa làm" —
>   kiểm tra DB dev thật phát hiện bug thật (cùng pattern DEV-068): `OPERATOR_CERTIFICATE_VIEW`/`_CREATE`
>   có trong code (`permission.constant.ts`/`rolePermission.map.ts`) nhưng **0 bản ghi trong `Permission`
>   collection DB dev** — `seed-rbac.ts` không tự chạy khi code đổi. Đây là lý do UI "Phân quyền" trống VÀ
>   nút "Cấp chứng chỉ" không hiện cho AI kể cả ADMIN trên DB dev thật (môi trường Playwright e2e dùng để
>   spot-check DEV-077 không bị ảnh hưởng vì seed permission mới từ code mỗi lần chạy, không đọc DB dev).
>   **ĐÃ SỬA**: script tạm (additive-only, KHÔNG dùng `--sync-roles`) tạo 2 Permission doc + merge vào
>   `role.permissions` của ADMIN/IT/TRUONG_KHOA/DIEU_DUONG_TRUONG/BAN_GIAM_DOC/PHONG_VAT_TU_TTB (VIEW) và
>   ADMIN/IT/PHONG_VAT_TU_TTB (CREATE), đúng thiết kế gốc DEV-077.md Mục 3. Verify DB: 113 permission,
>   permCount từng role tăng đúng kỳ vọng. **CHƯA giải quyết**: cache permission in-memory (TTL 5 phút)
>   của backend dev server đang chạy KHÔNG được clear (script chạy process riêng, không qua
>   `clearPermissionCacheForRole`) — user cần đợi tối đa 5 phút hoặc khởi động lại backend dev server /
>   đăng nhập lại để thấy quyền mới ngay trên UI.
> - **[CẬP NHẬT 2026-09-24, `DEV-078.md`]** User yêu cầu làm tiếp phần Sửa/Thu hồi/Xoá chứng chỉ vận hành
>   (mục treo ở `DEV-077.md` Mục 6) — **DONE**: chốt 4 quyết định nghiệp vụ qua AskUserQuestion trước khi
>   code (xoá MỀM; Thu hồi tách riêng Xoá, Thu hồi bắt buộc lý do còn Xoá thì không; Sửa CHỈ
>   `certificateNumber`, không sửa được ngày cấp/hạn; 2 permission MỚI riêng
>   `OPERATOR_CERTIFICATE_UPDATE`/`_REVOKE`, REVOKE dùng chung cho cả thu hồi lẫn xoá). Backend: field
>   `isActive`/`revokedAt`/`revokedReason`/`deletedAt` mới, 3 route mới (`PATCH /:id`, `PATCH
>   /:id/revoke`, `DELETE /:id`), mọi truy vấn "đang hợp lệ" (guard gán/chuyển giao, picker, cron cảnh
>   báo) đều thêm điều kiện `isActive:true`. Frontend: 3 nút hành động mới trên list "Người vận hành đủ
>   điều kiện" (`MedicalDeviceSection.tsx`), tái sử dụng `WorkflowActionModal`/`ConfirmDialog` có sẵn
>   (không tạo modal riêng cho thu hồi/xoá, chỉ 1 modal mới cho sửa vì chỉ 1 field). **`jest` backend: 45
>   suite/448 test PASS** (+9). `tsc`/build cả 2 phía PASS, `vitest` 25/25, `playwright` a11y+visual
>   16/16 PASS. **Spot-check end-to-end THẬT qua UI** cho cả 3 hành động mới (sửa/thu hồi có validate bắt
>   buộc lý do/xoá) — assertion tự động PASS. DB dev: đã seed 2 permission mới + gán ADMIN/IT/PHONG_VAT_TU_TTB
>   (cùng lưu ý cache 5 phút như lần seed trước, xem `DEV-077.md` Mục 5b).
> - **[CẬP NHẬT 2026-09-24, `DEV-078.md` bổ sung]** User kiểm tra UI xong, báo còn thiếu màn hình xem
>   chứng chỉ đã xoá/thu hồi — đúng gap đã tự ghi nhận ở bản DEV-078 gốc. **DONE**: thêm nút "Xem lịch sử"
>   cạnh "Cấp chứng chỉ" → modal MỚI `OperatorCertificateHistoryModal.tsx` liệt kê TOÀN BỘ bản ghi của
>   danh mục (còn hạn/hết hạn/đã thu hồi kèm lý do+ngày/đã xoá) qua hook MỚI
>   `useOperatorCertificateHistory` (`GET /operator-certificates` không kèm `validOnly`, khác
>   `useCertifiedOperators` chỉ trả người còn hạn đã dedupe). Sửa luôn 4 mutation
>   (create/update/revoke/delete) để invalidate CẢ 2 query key `certified-users` VÀ `history` (trước đó
>   chỉ invalidate 1, có thể để lộ dữ liệu cũ nếu mở đồng thời). Verify: `tsc`/`oxlint`/`vitest`
>   (25/25)/`build`/`playwright` a11y+visual (16/16) re-run PASS + **spot-check UI thật lần 2**: seed 1
>   chứng chỉ còn hạn + 1 đã thu hồi cho cùng user/danh mục → xác nhận list ngoài chỉ hiện chứng chỉ còn
>   hạn (đúng dedupe) trong khi modal lịch sử hiện ĐỦ CẢ 2 kèm đúng badge + lý do thu hồi.
> - **[CẬP NHẬT 2026-09-24, `DEV-079.md`]** User yêu cầu tính năng MỚI: upload/sửa/xoá ảnh đại diện cho
>   module User — **DONE**: chốt 2 quyết định qua AskUserQuestion trước khi code (self-service + ADMIN
>   đặt/xoá hộ user khác, dùng lại permission `USER_UPDATE`; lưu THẲNG base64 trong document User thay vì
>   file riêng — dự án không có route serving file public/static, base64 trả thẳng qua response đã xác
>   thực sẵn là cách đơn giản nhất không phá vỡ nguyên tắc bảo mật hiện có). Backend: field `avatar`
>   MỚI trên `User` (`select:false` như `password`, KHÔNG lộ ở `GET /users` list), DTO validate
>   MIME+kích thước (≤300KB gốc), 2 cặp route mới (`/users/me/avatar` self, `/users/:id/avatar` admin,
>   dùng chung 2 service function phân biệt qua `performedBy` optional để quyết định có ghi audit hay
>   không). Frontend: component dùng chung MỚI `Avatar.tsx` (thay initials-only cũ ở `Header.tsx`), modal
>   self-service (`ProfilePage`) + modal admin (`UsersListPage`, tự fetch chi tiết qua `GET /users/:id` —
>   lần đầu FE dùng endpoint này), tái sử dụng `FileUpload` sẵn có. **`jest` backend: 45 suite/459 test
>   PASS** (+11) + **`test:e2e` HTTP thật: 4 suite/28 test PASS** (+8 test MỚI verify 403/401 thật theo
>   CLAUDE.md §18). Frontend: `tsc`/`build` PASS, `vitest` 25/25, `oxlint` baseline giữ nguyên 4 (chủ động
>   tách `getInitials` ra file riêng để không tăng), `playwright` a11y+visual 16/16 PASS. **Spot-check
>   UI thật qua trình duyệt** cho cả 2 luồng (self + admin), dùng file ảnh thật qua `setInputFiles` — toàn
>   bộ assertion PASS.
> - **[CẬP NHẬT 2026-09-24, `DEV-080.md`]** User yêu cầu dựng lại Danh mục tài sản có cấp cha — **DONE**:
>   chốt qua AskUserQuestion: cây **3 cấp** (gốc `CNTT`/`TBYT` → 7 nhóm → loại thiết bị, GIỮ NGUYÊN mã
>   danh mục lá cũ nên 0 tài sản phải chuyển), **xoá mềm 7 danh mục trùng** (`MAY_*` tiếng Việt, 0 tài
>   sản/0 chứng chỉ), **tài sản chỉ gắn danh mục lá**. Backend: helper cây trong `assetCategory.service.ts`
>   (lọc `$in` con cháu ở list/export, chặn gán vào nhóm ở create/update/import Excel, chống vòng lặp
>   A→B→A, chặn chọn cha đang chứa tài sản, `parentCategory:null` để gỡ cha — trước đây không gỡ được).
>   Dữ liệu dev đã migrate qua `backend/scripts/migrate-asset-category-tree.ts` (dry-run mặc định,
>   `--apply` ghi thật, idempotent — **PHẢI chạy lại trên môi trường khác khi deploy**). Frontend: bảng
>   danh mục hiển thị cây (bỏ phân trang), component dùng chung `AssetCategoryOptions` cho 4 dropdown.
>   Verify: `jest` 46 suite/469 test, `test:e2e` 5 suite/34 test (+6 test cây trên Mongo thật), FE
>   `tsc`/`build`/`vitest` 29/29/`oxlint` baseline 4/playwright 16/16 PASS + spot-check UI thật PASS.
> - **[CẬP NHẬT 2026-09-24, `DEV-081.md`]** User đổi cách hiển thị trang Danh mục tài sản — **DONE**: bỏ
>   bảng cây của DEV-080, thay bằng danh sách phẳng CHỈ danh mục con (mặc định), bộ lọc "Nhóm" (chọn gốc/nhóm
>   → cả nhánh) + "Cấp" (con/nhóm/tất cả — giữ đường sửa/xoá danh mục nhóm) + phân trang server 10 dòng.
>   Backend: `QueryAssetCategoryDTO` thêm `group`/`level` tuỳ chọn (không truyền = như cũ). `test:e2e`
>   5 suite/35 test (+1), jest 469, FE tsc/build/vitest/oxlint/playwright PASS + spot-check UI thật PASS.
> - **[CẬP NHẬT 2026-09-24, `DEV-082.md`]** User báo tài sản "vẫn lưu danh mục cũ". Kiểm tra DB (chỉ đọc):
>   dữ liệu ĐÃ đồng bộ (119/119 tài sản ở danh mục lá active), KHÔNG migrate. Đã hỏi user, chốt: chỉ hiện dòng
>   "Nhóm: …" dưới ô Danh mục ở form Tạo/Sửa tài sản — **DONE**. Sửa kèm 1 lỗi hiển thị có từ trước ở
>   `AssetEditModal`: ô chọn hiện option đầu tiên khi danh mục tải chậm, trong khi giá trị lưu vẫn đúng. FE
>   vitest 32/32, tsc/oxlint/build/playwright PASS, spot-check UI thật PASS. Backend không đổi.
> - **[CẬP NHẬT 2026-09-24, `DEV-083.md`]** User yêu cầu: bấm vào ô trạng thái (Đang sử dụng/Trong kho/Đang
>   bảo trì/Thất lạc/Đã thanh lý/Đã giữ chỗ) ở widget "Tài sản" trên Dashboard → xem danh sách tài sản tương
>   ứng — **DONE**, không cần hỏi thêm (không có gì mơ hồ). Mỗi ô đổi thành `Link` tới
>   `/app/assets?status=<mã>`; `AssetsListPage` đọc `status` từ URL lúc mount để lọc sẵn (1 chiều, không
>   đồng bộ ngược URL khi đổi filter sau đó — đúng phạm vi yêu cầu). Đã kiểm tra mọi role có `DASHBOARD_READ`
>   đều sẵn có `ASSET_VIEW` — không tài khoản nào thấy widget nhưng bấm vào bị chặn quyền, không cần
>   route/permission mới. Gộp theo `ASSET_STATUS_MAP` dùng chung mới
>   (`features/assets/constants/assetStatus.constants.ts`) — trước đó `AssetStatusBadge.tsx` và
>   `AssetsListPage.tsx` mỗi nơi tự định nghĩa 1 bảng nhãn trùng nhau, việc này sẽ tạo bản trùng thứ 3 nên
>   gộp lại thay vì lặp thêm; tách file riêng để giữ `AssetStatusBadge.tsx` chỉ export component (tránh lặp
>   lỗi oxlint `only-export-components` đã gặp ở DEV-079). FE tsc/oxlint (baseline 4 giữ nguyên)/vitest
>   32/32/build/playwright a11y+visual 16/16 PASS + spot-check UI thật (seed 2 tài sản qua API, bấm ô "Trong
>   kho" → đúng URL + bộ lọc + đúng 2 dòng) PASS. Backend không đổi.
> - **[CẬP NHẬT 2026-09-24, `DEV-084.md`]** User yêu cầu: bấm ô Loại A/B/C/D ở widget "Thiết bị y tế" trên
>   Dashboard → xem danh sách thiết bị + có màu sắc + hiệu ứng hover — **DONE**. KHÁC DEV-083: KHÔNG có
>   trang "Danh sách thiết bị y tế" sẵn có (chỉ có CRUD theo `:assetId` đơn lẻ) — đã hỏi qua
>   AskUserQuestion, user chọn **Modal tại Dashboard** (không xây route/trang mới). Backend: route MỚI
>   HOÀN TOÀN `GET /dashboard/medical-devices/by-class` (dùng lại permission `DASHBOARD_READ`, không tạo
>   permission mới) — **đã viết E2E MỚI theo CLAUDE.md §18** (`medical-device-by-class.e2e-test.ts`, 6 test:
>   401 không token, 403 role USER thật, 400 thiếu/sai `deviceClass`, 200 đúng dữ liệu/phân trang). Frontend:
>   modal MỚI `MedicalDevicesByClassModal.tsx` (AppModal+DataTable+Pagination, mirror `CalibrationDueWidget`);
>   màu theo mức rủi ro A→D (success→info→warning→destructive, trước đó cả 4 loại cùng 1 màu xám) +
>   hover (cùng hiệu ứng DEV-083). `jest` 469 (không đổi)/**`test:e2e` 6 suite/41 test PASS** (+6)/FE
>   tsc/oxlint (baseline 4)/vitest 32/32/build/playwright 16/16 PASS + spot-check UI thật (màu đổi đúng,
>   hover đổi border, modal đúng dữ liệu, bấm tên thiết bị → đúng trang chi tiết) PASS.
> - **[CẬP NHẬT 2026-09-25, `DEV-085.md`]** User báo "Tỷ lệ chuyển đổi Đề xuất → Báo cáo theo khoa/phòng"
>   trên Dashboard luôn hiện 0% mọi khoa — **DONE, đây là BUG THẬT** (không phải dữ liệu thật = 0%).
>   Nguyên nhân: `proposalConversionByDepartmentService` đọc `referenceTo` TRÊN CHÍNH document PROPOSAL —
>   field này (theo đúng comment gốc `document.model.ts` "⛓ CHỈ DÙNG CHO REPORT") CHỈ được set ở REPORT
>   (trỏ ngược về PROPOSAL), PROPOSAL không bao giờ tự có field này → luôn đọc ra rỗng → 0% với MỌI khoa
>   bất kể dữ liệu. Xác nhận trên DB dev: 190 PROPOSAL/0 có `referenceTo`, 81 REPORT đều có `referenceTo`
>   trỏ tới 81 PROPOSAL khác nhau — **thực tế đã có 81/190 (42.6%) đề xuất chuyển đổi thành báo cáo**. Sửa
>   bằng `$lookup` join ĐÚNG HƯỚNG (mirror cách `countReportsByProposal` đã làm đúng ở module Document).
>   Trước đây KHÔNG có test nào che hàm này (đúng loại bug mock `Document.aggregate()` không phát hiện
>   được) — đã viết E2E MỚI `dashboard-proposal-conversion.e2e-test.ts` (HTTP + MongoDB thật, KHÔNG mock):
>   3 test (50% đúng dữ liệu, 0% đúng nghĩa phân biệt bug cũ, report xoá mềm không tính). Đối chiếu thủ công
>   trực tiếp trên DB dev xác nhận tổng converted = 81 khớp. `jest` 469 (không đổi)/**`test:e2e` 7 suite/44
>   test PASS** (+3)/build PASS. **Frontend KHÔNG cần đổi code** — widget chỉ hiển thị thẳng
>   `conversionRate` từ API, không tự tính lại.
> - **[CẬP NHẬT 2026-09-25, `FE-32.md`]** User gửi ảnh Sidebar (icon toàn xám đơn sắc), yêu cầu thêm màu
>   cho icon từng module — hỏi trước 2 câu (AskUserQuestion): tô theo NHÓM (~5 nhóm, user chọn) hay theo
>   TỪNG mục riêng (~15, không chọn); dùng lại token trạng thái có sẵn hay tạo bảng màu MỚI riêng (user
>   chọn tạo MỚI). Dùng skill `dataviz` để chọn màu có kiểm chứng (không chọn bằng mắt): thử dải hue
>   xanh dương→hồng hẹp trước — FAIL (CVD ΔE chỉ 2.0, quá gần nhau); chuyển sang dùng 5 slot ĐẦU của bảng
>   categorical mặc định đã validate sẵn của skill (blue/orange/aqua/yellow/magenta, giữ nguyên thứ tự
>   liền kề đã chứng minh an toàn), chạy `validate_palette.js` với ĐÚNG surface `--sidebar` của project
>   (quy đổi OKLCH→hex: light `#fbfcfd`/dark `#090e14`) — 3/5 màu light-mode dưới 3:1 contrast, đã hạ `L`
>   riêng 3 màu đó (giữ nguyên hue/chroma) tới khi PASS toàn bộ 5 check cả 2 mode. Thêm 5 token
>   `--module-overview/documents/assets/vendors/admin` (`index.css`), field `moduleColor` mới trên
>   `NavItem` (`navigation.ts`, gán theo nhóm liền kề), `Sidebar.tsx` dùng bảng tra cứu class literal
>   (KHÔNG ghép chuỗi — Tailwind v4 quét class tĩnh, ghép chuỗi sẽ không sinh CSS). Chỉ icon đổi màu, text
>   label giữ nguyên (dataviz skill: "text wears text tokens, never series color"), không đổi hover/active
>   pill cũ. `tsc`/`oxlint` (baseline 4, không tăng)/`vitest` 32/32/`build` PASS, **Playwright a11y+visual
>   16/16 PASS** (không có unit test Sidebar riêng — thuần CSS/JSX). Spot-check UI thật bằng Playwright tạm
>   (đã xoá): 5 màu nhóm khác nhau hoàn toàn, 2 mục cùng nhóm "Tài liệu" cùng màu, dark mode đổi đúng giá
>   trị riêng, ảnh chụp xác nhận rõ ràng — không đổi RBAC/API/DB.
> - **[CẬP NHẬT 2026-09-25, `FE-33.md`]** Follow-up ngay sau FE-32 — user gửi ảnh nhóm "Quản trị hệ
>   thống" (đang magenta), yêu cầu trực tiếp đổi sang xanh lá cho đẹp hơn. Dùng ĐÚNG hex slot "green"
>   (`#008300`) của bảng categorical mặc định `dataviz` skill (không tự pha), re-run
>   `validate_palette.js` với 4 màu module FE-32 còn lại trên đúng surface `--sidebar` — PASS cả 2 mode
>   (1 cặp green/vendors-gold rơi mép dưới dải WARN chấp nhận được nhờ luôn có label chữ đi kèm). Cách
>   `--success` (H155) ~13° để không đọc nhầm 2 ngữ cảnh. Chỉ đổi giá trị `--module-admin` ở `index.css`
>   (2 mode), không đổi cấu trúc FE-32. `tsc`/`oxlint` (baseline 4)/`vitest` 32/32/`build` PASS, spot-check
>   Playwright tạm xác nhận cả 9 mục nhóm đổi đúng màu, nhóm cạnh bên không bị ảnh hưởng.
> - **[CẬP NHẬT 2026-09-25, `FE-34.md`]** User gửi ảnh trang System Design, yêu cầu panel "Lọc theo
>   module"/"Chú giải" thu gọn được + kéo-thả được. KHÔNG thêm dependency mới — tự viết bằng Pointer
>   Events thuần (`package.json` chưa có thư viện drag nào). Component dùng chung mới
>   `DraggableCollapsiblePanel.tsx` (`features/systemDesign/components/`): nút thu gọn mirror pattern
>   accordion đã có ở `Sidebar.tsx` (FE-21); kéo-thả qua tay cầm riêng (icon `GripVertical` + tiêu đề,
>   TÁCH khỏi vùng nút để không nuốt click), cộng `transform: translate()` lên vị trí gốc do
>   `<Panel position="top-left|top-right">` của xyflow đặt, có CLAMP theo biên khung `.react-flow` để
>   không kéo mất hẳn panel ra ngoài. `ModuleFilterPanel.tsx`/`SystemDesignLegend.tsx` bọc nội dung cũ
>   trong wrapper này, giữ nguyên toàn bộ logic filter. CỐ Ý không lưu vị trí qua localStorage (chưa được
>   yêu cầu). `tsc`/`oxlint` (baseline 4)/`vitest` 32/32/`build`/Playwright a11y+visual 16/16 PASS
>   (trang System Design không thuộc bộ này, không có rủi ro hồi quy chéo). Spot-check Playwright tạm xác
>   nhận: thu gọn ẩn đúng nội dung, kéo panel dịch chuyển thật ~420px, không vỡ layout.
> - **[CẬP NHẬT 2026-09-26, `DEV-086.md`]** User gửi ảnh trang "Khoa/Phòng" (chỉ Sửa/Xoá từng dòng), yêu
>   cầu thêm xoá mềm + khôi phục + xoá nhiều, kèm chỉ định rõ "có thắc mắc thì hỏi, không tự ý làm". Khảo
>   sát source: Department trước đây hard-delete, KHÔNG có `isActive`. Project có 2 convention xoá mềm
>   khác nhau (AssetCategory: đầy đủ `isActive`+`deletedAt`+`deletedBy`, khôi phục dùng lại `*_UPDATE`;
>   User/Contract: `isActive`-only, quyền `*_RESTORE` riêng) — hỏi 4 câu trước khi code: user chọn kiểu
>   ĐẦY ĐỦ như AssetCategory + quyền RIÊNG `DEPARTMENT_RESTORE` (khác AssetCategory) + GIỮ NGUYÊN 3 điều
>   kiện chặn xoá cũ (còn user/document/asset) + KHÔNG làm xoá vĩnh viễn (ngoài phạm vi yêu cầu). Backend:
>   `deleteDepartmentService` đổi `deleteOne` → soft-delete (3 guard giữ nguyên), thêm
>   `restoreDepartmentService`/`bulkDeleteDepartmentService`/`bulkRestoreDepartmentService` (tái dùng
>   `runBulkDelete`), `getAllDepartmentsService`/`getDepartmentByIdService`/`updateDepartmentService` lọc
>   `isActive`; route mới `POST bulk-delete`/`POST bulk-restore`/`PATCH :id/restore` + permission mới
>   `DEPARTMENT_RESTORE` (gán role IT). **CLAUDE.md §18**: E2E MỚI `department-soft-delete.e2e-test.ts`
>   9 test (401/403 thật trên 3 route mới, xoá mềm/khôi phục/vẫn-chặn-khi-còn-refs/bulk). Đã SEED THẬT
>   permission mới vào DB dev (script tạm `backend/scripts/_tmp-*.ts`, đã xoá — qua đúng flow
>   `assignPermissionsToRoleService`, cộng thêm không ghi đè, IT 46→47 permission — cùng bài học DEV-068/
>   077 "permission mới không tự có trong DB"). Frontend: `DepartmentsListPage.tsx` mirror ĐÚNG cấu trúc
>   `AssetCategoriesListPage.tsx` (bộ lọc Hiển thị, `useRowSelection`+`BatchActionBar`, row action đổi
>   Sửa+Xoá ↔ Khôi phục theo `isActive`). Phát hiện phụ NGOÀI PHẠM VI (đã ghi nhận, KHÔNG sửa — CLAUDE.md
>   §26): 2 nơi import Excel (Document/Asset) gán Department cho bản ghi mới KHÔNG lọc `isActive`, xem
>   DEV-086.md Mục 2/6. `jest` 46 suite/473 test PASS (+4, gồm sửa 1 test `systemDesign.service.test.ts`
>   dùng Department làm ví dụ "0 ObjectId ref" — nay Department có `deletedBy` thật nên đổi mẫu sang
>   `Counter`). `test:e2e` 8 suite/53 test PASS (+9). FE `tsc`/`oxlint` (baseline 4)/`vitest` 32/32/`build`/
>   Playwright a11y+visual 16/16 PASS. Spot-check UI thật bằng Playwright tạm (đã xoá) xác nhận đầy đủ.
> - **[SỬA NGAY SAU ĐÓ, cùng ngày, DEV-086.md Mục 7]** User báo trang "Khoa/Phòng" trống trơn ngay sau khi
>   nhận báo cáo DONE — **BUG THẬT do task trên gây ra**: Mongoose `default: true` của `isActive` mới thêm
>   chỉ áp dụng khi TẠO document MỚI, 29 khoa/phòng đã có TỪ TRƯỚC hoàn toàn thiếu field này trong DB (xác
>   nhận trực tiếp) — filter mặc định `{isActive: true}` của `getAllDepartmentsService` không khớp field
>   không tồn tại nên toàn bộ 29 khoa biến mất khỏi danh sách. Nguyên nhân gốc: task trên KHÔNG viết
>   migration backfill cho dữ liệu cũ (khác DEV-080/AssetCategory ĐÃ có `migrate-asset-category-tree.ts`
>   cho đúng loại thay đổi này), và bước Verify chỉ test bằng dữ liệu MỚI tạo qua Playwright (luôn "vô tình
>   đúng" vì default áp dụng đúng lúc tạo) — không test lại trên dữ liệu THẬT đã tồn tại. Fix: script MỚI
>   `backend/scripts/migrate-department-isActive-backfill.ts` (dry-run mặc định/`--apply`, cùng convention
>   migration cũ), đã chạy `--apply` trên DB dev — 29/29 khoa cập nhật `isActive: true` thành công, verify
>   lại dry-run → 0 khoa còn thiếu field, gọi trực tiếp `getAllDepartmentsService` → đúng `total: 29`. Bài
>   học đã ghi vào DEV-086.md Mục 7: field mới có default trên schema đã có dữ liệu PHẢI kèm migration
>   backfill CHẠY THẬT trong cùng task, không chỉ dựa Mongoose default; verify PHẢI thử trên dữ liệu thật
>   đã có sẵn, không chỉ dữ liệu tự tạo lúc test.
> - **[CẬP NHẬT 2026-09-27, `FE-35.md`]** `BatchActionBar` ở 8 trang chỉ hiện hành động áp dụng được theo
>   DÒNG ĐANG CHỌN (user chốt qua AskUserQuestion): dòng đang hoạt động → Xoá, dòng đã ẩn → Khôi phục; mỗi
>   mutation chỉ gửi đúng nhóm id. Helper mới `utils/splitSelectionByActive.ts` (+4 test). tsc/oxlint (4)/
>   vitest 36/36/build/Playwright 16/16 PASS + spot-check UI thật. **Phát hiện chưa sửa, chờ user**: bộ lọc
>   "Tất cả" ở cả 8 trang thực chất = "Đang hoạt động" (backend coi thiếu `isActive` = `true`) — xem FE-35.md Mục 4.
> - **[CẬP NHẬT 2026-09-27, `DEV-087.md`]** Hợp đồng bảo trì: thêm huỷ hàng loạt ("xoá nhiều" — Contract
>   không có xoá, chỉ có huỷ) + khôi phục hàng loạt. Route mới `POST /contracts/bulk-cancel` (CONTRACT_UPDATE)
>   / `bulk-restore` (CONTRACT_RESTORE, đã có trong DB) — không field/permission mới nên không migration/seed.
>   E2E mới 5 test (401/403 thật). `BatchActionBar` thêm prop `deleteLabel`. Backend jest 473/e2e 58 PASS, FE
>   tsc/oxlint(4)/vitest 36/build/Playwright 16/16 PASS + spot-check UI thật. Câu hỏi FE-35 về bộ lọc "Tất cả"
>   (8 trang khác) vẫn đang chờ user trả lời.
> - **[CẬP NHẬT 2026-09-27, `FE-36.md`]** Trang Phân quyền: kéo thả (chuột/cảm ứng/phím mũi tên) sắp xếp các
>   nhóm quyền trong `RolePermissionMatrix`, thứ tự lưu trình duyệt (`uiStore.permissionGroupOrder`, dùng chung
>   mọi role), nút "Đặt lại thứ tự" về A→Z. Chỉ frontend. Sửa lỗi mất pointer capture khi React di chuyển node
>   (nghe trên `window`). tsc/oxlint(4)/vitest 43/build/Playwright 16/16 PASS + spot-check 6 kịch bản UI thật.
> - **[CHỐT 2026-09-27]** Câu hỏi FE-35 về bộ lọc "Tất cả" (8 trang thực chất = "Đang hoạt động"): user trả
>   lời **KHÔNG cần sửa** — giữ nguyên hiện trạng, không hỏi lại.
> - **[CẬP NHẬT 2026-09-28, `FE-37.md` + `DEV-088.md`]** Dashboard: tab nhớ qua URL `?tab=`, biểu đồ cột
>   focus được (bàn phím/chạm) + trạng thái rỗng + tooltip hết bị cắt, skeleton khi tải, số KPI định dạng
>   vi-VN, hỗ trợ "giảm chuyển động" TOÀN app (`index.css`); hiệu ứng cột mọc + số đếm tăng, nút "Làm mới"
>   + giờ cập nhật (lưu ý backend cache 30s), số cảnh báo trên tab, thẻ KPI bấm được → danh sách lọc sẵn.
>   `DocumentsListPage` đọc `?category=`/`?department=` + ô lọc Khoa/Phòng mở cho người có
>   `DOCUMENT_VIEW_ALL_DEPARTMENTS` (user chốt). DEV-088: KPI "Khoa/Phòng" không đếm khoa đã xoá mềm (bỏ sót
>   từ DEV-086). BE jest 473/e2e 59/build PASS; FE tsc/oxlint(4)/vitest 46/build/Playwright 16/16 PASS +
>   spot-check UI thật. Chưa verify UI thật với tài khoản IT (môi trường test chỉ có ADMIN).
> - **[CẬP NHẬT 2026-09-28] User chốt KHÔNG làm auto-refresh/real-time** (đã giải thích hiện trạng staleTime 0 +
>   refetch khi mở trang/quay lại tab + chuông 30s) — không đề xuất lại trừ khi user báo trang cụ thể.
> - **[CẬP NHẬT 2026-09-28, `FE-38.md`]** Cấp phát/Luân chuyển tài sản: ô "Gán cho người dùng" trống vì chỉ
>   liệt kê user CÙNG khoa (khoa Châm cứu có 0 user — 11 tài khoản/29 khoa). Nay 2 nhóm "Thuộc khoa đã
>   chọn"/"Khoa khác" + gợi ý khi khoa trống (component mới `AssigneeOptions`). FE tsc/oxlint(4)/vitest 49/
>   build PASS + spot-check UI thật. **Chờ user quyết**: 11 khoa mang tên thiết bị (tạo nhầm qua "Đồng bộ
>   khoa/phòng từ Excel" ngày 21/9, 0 dữ liệu trỏ tới) — xem FE-38.md Mục 4.
> - **[CẬP NHẬT 2026-09-28, `DEV-089.md`]** "Đồng bộ khoa/phòng từ Excel" viết lại: bắt buộc cột tiêu đề
>   "Khoa"/"Khoa/Phòng" ở dòng 1 (vị trí bất kỳ), `?dryRun=true` xem trước, tạo thật kèm `names` (chỉ khoa đã
>   tick); phân loại mới/đã có/đang ẩn/trùng mã. Modal 3 bước. BE jest 473/e2e 65 (+6)/build PASS; FE
>   tsc/oxlint(4)/vitest 49/build/Playwright 16/16 + spot-check UI thật. 11 khoa lạ trên DB dev VẪN CÒN (chờ user).
> - **[CẬP NHẬT 2026-09-29, `docs/31_BACKEND_CODE_REVIEW.md`]** Review toàn bộ backend (chỉ báo cáo, CHƯA sửa):
>   3 HIGH (BR-01 `/auths/register` public, BR-02 `submitWorkflow` không kiểm tra gì, BR-03 tạo tài liệu tin
>   `department` từ client), 8 MEDIUM (audit ADMIN bypass = 90,6% bảng audit, cache không dọn, khoa xoá mềm
>   nhận dữ liệu ở 10 chỗ, thiếu index `WorkflowInstance.documentId`, thiếu `trust proxy`, múi giờ UTC, 14 lỗ
>   hổng npm, xoá theo tháng), 11 LOW + 3 câu hỏi nghiệp vụ. Đã xác minh ~30 phát hiện cũ (REVIEW-00→16) ĐÃ
>   SỬA nhưng `CODE_REVIEW_SUMMARY.md` chưa cập nhật. **Next:** chờ user chọn hạng mục cần sửa.
> - **[CẬP NHẬT 2026-09-29, `DEV-090.md`]** BR-01 ĐÃ SỬA: `/auths/register` mặc định tắt (404), bật bằng ENV
>   `ALLOW_SELF_REGISTER=true` (user chọn cách này, không xoá route). BE jest 473/e2e 69 (+4)/build PASS.
>   **Next:** chờ user chọn hạng mục tiếp theo; đề xuất BR-02 (`submitWorkflow`) rồi BR-03.
> - **[CẬP NHẬT 2026-09-29, `DEV-091.md`]** BR-02 ĐÃ SỬA: `submitWorkflow` kiểm tra tài liệu tồn tại/còn hoạt
>   động (404), cùng khoa hoặc Admin (403, user không có khoa cũng bị chặn), workflow gần nhất phải là
>   rejected/cancelled hoặc chưa có (400, kiểm tra trong transaction). Không giới hạn loại tài liệu (user chọn).
>   BE jest 473/e2e 79 (+10)/build PASS.
> - **[CẬP NHẬT 2026-09-29, `FE-39.md`]** Nút "Submit vào workflow" chỉ hiện cho người cùng khoa hoặc Admin (ẩn với IT
>   xem tài liệu khoa khác). FE tsc/oxlint(4)/vitest 49/build PASS, Playwright 16/16 + spec tạm 3/3.
>   **Next:** chờ user chọn; đề xuất BR-03 (tạo tài liệu tin `department` do client gửi).
> - **[CẬP NHẬT 2026-09-29, `DEV-092.md` + `FE-40.md`]** BR-03 ĐÃ SỬA: tạo tài liệu chỉ vào khoa của mình; khoa khác
>   cần ADMIN hoặc permission MỚI `DOCUMENT_CREATE_ALL_DEPARTMENTS` (user chọn). Đã seed vào catalog DB dev + gán
>   ADMIN (116→117); CHƯA gán role nào khác (user tự gán qua UI nếu cần). Sửa kèm lỗi body ghi đè `userId`. FE: ô Khoa
>   chỉ mở cho ADMIN/quyền mới. BE jest 477/e2e 86/build PASS; FE tsc/oxlint(4)/vitest 49/build/Playwright 16/16.
>   Cả 3 HIGH (BR-01→03) đã xong. **Next:** chờ user chọn; đề xuất BR-04 (audit ADMIN bypass) → BR-05 → BR-07 → BR-08.
> - **[CẬP NHẬT 2026-09-29, `DEV-093.md`]** BR-04 ĐÃ SỬA: audit ADMIN bypass chỉ ghi (`ADMIN_BYPASS`) khi quyền hiệu
>   lực của Admin không đủ (fire-and-forget, không chặn request). Migration MỚI
>   `backend/scripts/migrate-admin-bypass-audit-action.ts` đã chạy `--apply` trên DB dev: 9.829 bản ghi đổi nhãn
>   `AUDIT_DASHBOARD_VIEW`→`ADMIN_BYPASS` (môi trường khác cần chạy lại). BE jest 482/e2e 88/build PASS. FE không đổi.
>   **Next:** chờ user chọn; đề xuất BR-05 (cache không dọn + `limit` tuỳ ý) → BR-07 → BR-08.
> - **[CẬP NHẬT 2026-09-29, `DEV-094.md`]** BR-05 ĐÃ SỬA: `memoryCache` trần 500 mục (dọn hết hạn trước, rồi bỏ mục cũ
>   nhất, không timer); 3 endpoint dashboard (warranty-expiring/maintenance-overdue/overdue-approvals) dùng
>   `parsePaginationQuery` (max 100), khoá cache chỉ từ tham số đã parse. BE jest 486/e2e 97/build PASS. FE không đổi.
>   **Next:** chờ user chọn; đề xuất BR-07 (index `WorkflowInstance.documentId`) → BR-08 (`trust proxy`) → BR-06.
> - **[CẬP NHẬT 2026-09-29, `DEV-095.md`]** BR-07 ĐÃ SỬA: index `{documentId:1, createdAt:-1}` cho `WorkflowInstance`
>   (autoIndex đã tạo trên DB dev, `explain` xác nhận IXSCAN). Nếu production tắt `autoIndex` thì phải tạo tay.
>   BE jest 488/e2e 97/build PASS. **Next:** chờ user chọn; đề xuất BR-08 (`trust proxy`) → BR-06 (khoa xoá mềm).
> - **[CẬP NHẬT 2026-09-29, `DEV-096.md`]** BR-08 ĐÃ SỬA: `app.set("trust proxy", parseTrustProxy(TRUST_PROXY))` —
>   ENV số lớp proxy, mặc định tắt, `true` bị từ chối lúc khởi động. Deploy plan đã ghi `TRUST_PROXY=2` + Nginx
>   `X-Forwarded-For`. BE jest 503/e2e 101/build PASS. Chưa verify trên proxy thật (dev không có).
>   **Next:** chờ user chọn; còn MEDIUM: BR-06 (khoa xoá mềm nhận dữ liệu), BR-09 (múi giờ), BR-10 (npm audit), BR-11.
> - **[CẬP NHẬT 2026-09-29, `DEV-097.md`]** BR-09 ĐÃ SỬA: (A) 6 aggregation `$month/$year/$dateToString` thêm
>   `timezone: Asia/Ho_Chi_Minh`; (B) `src/config/timezone.ts` ép `process.env.TZ` giờ VN, import ĐẦU TIÊN ở
>   `server.ts` (+ jest configs + startPlaywrightServer); (C, phát hiện thêm, user đồng ý) helper
>   `parseDateRangeBound` — lọc "Từ/Đến ngày" `YYYY-MM-DD` trọn ngày giờ VN ở 8 chỗ. BE jest 511/e2e 107/build PASS,
>   Playwright 16/16. **Next:** chờ user chọn; còn MEDIUM: BR-06 (khoa xoá mềm nhận dữ liệu), BR-10 (npm audit), BR-11.
> - **[CẬP NHẬT 2026-09-29, `DEV-098.md`]** BR-11 ĐÃ SỬA: xoá theo tháng bỏ qua tài liệu có workflow chờ duyệt THẬT
>   (`PENDING_WORKFLOW_FILTER` = pending + có `workflowInstanceId`), ghi 1 dòng audit tổng hợp (cùng transaction), dò
>   biên bản bằng 1 `distinct` (hết N+1). Sửa kèm: xoá từng cái trước đây chặn nhầm MỌI tài liệu chưa gửi duyệt
>   (`workflowStatus` default "pending"). FE: toast/mô tả modal. BE jest 514/e2e 111/build; FE tsc/oxlint(4)/vitest
>   49/build PASS. **Next:** chờ user chọn; còn MEDIUM: BR-06 (khoa xoá mềm nhận dữ liệu), BR-10 (npm audit).
> - **[CẬP NHẬT 2026-09-30, `DEV-099.md`]** BR-10 ĐÃ SỬA: `npm audit fix` và nâng mức tối thiểu (mongoose 9.10.3/driver
>   7.6, multer 2.4, nodemailer 9.1.1, express-rate-limit 8.7, morgan 1.12.1), gỡ `@tailwindcss/vite`. Audit từ 14 (8 high)
>   xuống 3 moderate, user chấp nhận (uuid qua exceljs; nodemailer ×2 cần 10.x). Hậu quả của việc nâng driver:
>   - 23+1 lỗi kiểu (filter chặt hơn), đã sửa chỉ ở tầng kiểu;
>   - **lỗi thật**: xoá theo tháng (DEV-098) chạy `Promise.all` trong transaction, trả 500; đã đổi sang tuần tự;
>   - e2e jest cần `runtimeAdapters: { os }` ở `setup.ts`.
>   BE tsc 0 / jest 514 / e2e 111 / build PASS, Playwright 16/16. **Next:** chờ user chọn; MEDIUM còn lại duy nhất: BR-06
>   (khoa xoá mềm nhận dữ liệu), sau đó là nhóm LOW BR-12→BR-22.
> - **[CẬP NHẬT 2026-09-30] Audit CLAUDE.md/SKILL.md** (user yêu cầu, theo cảnh báo đầu CLAUDE.md): mốc rà soát dời lên
>   DEV-099 / FE-40. Đã bổ sung:
>   - §4 / SKILL §3: DEV-001A plan, `changes/` và `decisions/` (rỗng), `frontend/phases/`, và `PRODUCTION_DEPLOYMENT_PLAN` trong SKILL;
>   - §9: hậu tố `DEV-001A` / `DEV-009A`;
>   - §36: 12 domain / 32 model thật.
>   Phát hiện nhưng user CHƯA chọn sửa:
>   - `00_DEVELOPMENT_ROADMAP.md` dừng ở DEV-025, dù §4 vẫn gọi là "nguồn sự thật";
>   - `00_PROJECT_MEMORY.md` dừng ở DEV-071 và ghi 31 model (thực tế 32);
>   - `FRONTEND_MEMORY.md` dừng ở FE-26;
>   - `FEATURE_DEVELOPMENT_ROADMAP.md` nhắc tới `ROADMAP_TOI_GO_LIVE.md`, file này không tồn tại.
>   **Next:** chờ user chọn (BR-06 hoặc các mục trên).
> - **[CẬP NHẬT 2026-09-30] Đã sửa 4 chỗ lệch trên** (user yêu cầu):
>   - `00_DEVELOPMENT_ROADMAP.md`: thêm banner LỊCH SỬ; sửa mô tả tương ứng ở CLAUDE.md §4/§37 và SKILL §3.
>   - `00_PROJECT_MEMORY.md`: 32 model; ghi chú frontend đã tồn tại; sửa dòng "B5-B7/C chưa làm"; thêm "Chỉ mục task DEV-037 → DEV-099".
>   - `FRONTEND_MEMORY.md`: §1 đánh dấu ảnh chụp cũ; thêm FE-27 → 40 vào §11.
>   - `FEATURE_DEVELOPMENT_ROADMAP.md`: ghi chú `ROADMAP_TOI_GO_LIVE.md` chưa từng tồn tại, kèm tình trạng các nhóm.
>   **Next:** BR-06 (MEDIUM cuối cùng), chờ user xác nhận.
> - **[CẬP NHẬT 2026-09-30, `DEV-100.md`]** BR-06 ĐÃ SỬA: khoa đã xoá mềm không nhận dữ liệu mới.
>   - 10 chỗ trả 400 "đã bị xoá"; import Excel báo lỗi theo dòng; sửa user chỉ chặn khi đổi khoa.
>   - Sửa thêm (user duyệt): không xoá được khoa còn vật tư đang hoạt động hoặc dự trù PENDING; chặn khôi phục user và vật tư vào khoa đã xoá.
>   - Helper chung ở `departmentLookup.helper.ts`.
>   - BE tsc 0 / jest 518 / e2e 123 / build PASS, Playwright 16/16.
>   **Hết mục MEDIUM trong review backend.** **Next:** chờ user chọn; còn nhóm LOW BR-12 → BR-22 và 3 câu hỏi nghiệp vụ Q1 → Q3.
> - **[CẬP NHẬT 2026-09-30, `DEV-101.md`]** BR-12 ĐÃ SỬA: escape regex ở `getList` (keyword) và `listAllSessions` (search)
>   trong `users.service.ts`. E2E mới 5 test (đã kiểm chứng: gỡ phần sửa thì 3 test fail). BE tsc 0 / jest 518 / e2e 128 / build PASS.
>   **Next:** thứ tự LOW user đã xem: BR-14 (OTP atomic) → BR-15 → BR-18 → BR-16 → BR-17 → BR-20 → BR-21 → BR-22 → BR-13 → BR-19;
>   chờ user chỉ định mục tiếp theo.
> - **[CẬP NHẬT 2026-09-30, `DEV-102.md`]** BR-14 ĐÃ SỬA: `checkOtpAtomically` trong `auths.service.ts` (giành lượt thử `$inc` + giành quyền dùng mã `used:false→true`),
>   dùng ở `verifyLoginOtp` và `confirmEnableTwoFactor`. Sửa kèm lỗi 1 mã dùng nhiều lần (user duyệt). E2E mới 4 test gửi 20 request song song thật
>   (đã kiểm chứng: khôi phục logic cũ thì 3/4 fail). BE tsc 0 / jest 520 / e2e 132 / build PASS.
>   **⚠️ Chưa giải quyết:** 1 lần chạy `npx jest` đầu tiên có 1 test fail trong `auths.service.test.ts`, không tái hiện được sau 10 lần chạy lại
>   (chi tiết + giả thuyết chưa xác minh ở DEV-102 Mục 5). Nếu gặp lại, bắt đủ log của test fail.
>   **Next:** BR-15 (giới hạn số file upload), chờ user xác nhận.
> - **[CẬP NHẬT 2026-09-30, `DEV-103.md` + `FE-41.md`]** BR-15 ĐÃ SỬA phần số file: `createUploader` đặt `limits.files = 10` (`MAX_FILES_PER_REQUEST`), vượt → 400
>   `MULTER_LIMIT_FILE_COUNT`, multer tự xoá file dở. FE: `FileUpload` thêm prop `maxFiles`, `FilesListPage` báo lỗi ngay khi chọn quá 10. Kiểm tra nội dung file
>   (magic bytes) user chọn CHƯA làm. E2E mới 5 test (đã kiểm chứng: gỡ giới hạn thì test 11 file fail). BE tsc 0 / jest 520 / e2e 137 / build PASS;
>   FE tsc 0 / oxlint 4 / vitest 49 / build PASS; Playwright 16/16. **Chưa tự kiểm tra trực quan** modal "Tải file lên" trên trình duyệt.
>   **Next:** BR-18 (tắt/giới hạn `/api-docs` Swagger ở production), chờ user xác nhận.
> - **[CẬP NHẬT 2026-09-30, `DEV-104.md`]** BR-18 ĐÃ SỬA: `/api-docs` mặc định TẮT (404); bật khi `NODE_ENV=development` hoặc `ENABLE_API_DOCS=true`
>   (`isApiDocsEnabled` trong `config/swagger/swagger.ts`, fail-closed khi thiếu cấu hình). Máy dev đang `NODE_ENV=development` nên không đổi.
>   `.env.example`, README, deploy plan (Giai đoạn 3) đã cập nhật. Unit 17 test + E2E 3 test trên app thật (đã kiểm chứng cả 2 hướng lỗi).
>   BE tsc 0 / jest 537 / e2e 140 / build PASS, Playwright 16/16.
>   **Next:** BR-16 (xoá vĩnh viễn tài sản không kiểm tra tham chiếu), cần user chốt chặn hay cho xoá — chờ user xác nhận.
> - **[CẬP NHẬT 2026-09-30, `DEV-105.md`]** BR-17 ĐÃ SỬA: `buildMapFromReports(subType, proposalIds)` (tham số bắt buộc) chỉ nạp biên bản tham chiếu tới
>   đúng các đề xuất được xuất (`referenceTo: {$in}`) thay vì mọi biên bản của hệ thống; `exportDocumentsExcelPRO` lấy `_id` đề xuất theo cùng `filter` trước.
>   Kết quả file xuất không đổi. Unit 4 test + E2E 6 test đọc lại file .xlsx thật (đã kiểm chứng: logic cũ thì 2 test fail). Chưa đo benchmark thời gian/bộ nhớ.
>   BE tsc 0 / jest 541 / e2e 146 / build PASS.
>   **Next:** BR-20 (giảm truy vấn ở `authenticate` + nhiễu log), chờ user xác nhận; hoặc BR-16 nếu user muốn chốt nghiệp vụ xoá tài sản.
> - **[CẬP NHẬT 2026-09-30, `DEV-106.md`]** BR-20 ĐÃ SỬA: `authenticate` dùng 1 `User.aggregate` + `$lookup` (giữ đúng hình dạng `req.user`, `isSystemRole` mặc định false) thay cho
>   findById + populate; không `console.error` với lỗi xác thực bình thường (ApiError, JsonWebTokenError), vẫn log lỗi DB và thiếu `JWT_SECRET`. Unit 11 + E2E 9 test
>   (đã kiểm chứng; lần đầu e2e của tôi không bắt được thiếu `isSystemRole`, đã thêm ca phân biệt). BE tsc 0 / jest 552 / e2e 155 / build PASS, Playwright 16/16. Chưa benchmark.
>   Ghi nhận: lỗi DB vẫn trả 401 (hành vi cũ, DEV-106 Mục 4).
>   **Next:** BR-21 (System Design đọc đồng bộ ~130 file mỗi request), hoặc BR-22, BR-16, BR-13, BR-19 — chờ user chọn.
> - **[CẬP NHẬT 2026-09-30, `DEV-107.md`]** BR-21 ĐÃ SỬA: `buildRelatedDocsMap` cache KẾT QUẢ CUỐI 60 giây (user chọn), qua `getOrSetCacheSync` mới ở `memoryCache.ts`.
>   Đo: ~40ms mỗi request (chặn server) → ~0,2ms; lần đầu mỗi phút ~75ms. Bài học: cache riêng nội dung file chỉ giảm ~40→18ms vì phần dò chuỗi cũng tốn ~17ms.
>   Đánh đổi: file task mới có thể chậm tối đa 60 giây mới hiện trên trang System Design. Unit +10, E2E 3 (đã kiểm chứng). BE tsc 0 / jest 562 / e2e 158 / build PASS, Playwright 16/16.
>   **Next:** BR-22 (upload controller dùng catchAsync/ApiError), hoặc BR-16, BR-13, BR-19 — chờ user chọn.
> - **[CẬP NHẬT 2026-09-30, `DEV-108.md`]** BR-22 ĐÃ SỬA: 5 handler của `upload.controller.ts` bọc `catchAsync` + `ApiError`; lỗi giờ `{success:false, message, errorCode}` (trước `{message}`).
>   User chọn: upload không kèm file → 400 "Vui lòng chọn ít nhất 1 file để tải lên" (trước 500); sửa typo "Không timg thấy file" + thống nhất tiếng Việt ("File not found" → "Không tìm thấy file", "File deleted" → "Đã xoá file").
>   Route/permission/response thành công không đổi; OpenAPI nhóm `/api/upload*` dùng `ErrorResponse`. E2E +20 (chạy trên code cũ: 11 fail; sau sửa: pass). BE tsc 0 / jest 562 / e2e 178 / build PASS, Playwright 16/16.
>   Ghi nhận: file mồ côi trên đĩa nếu lưu DB lỗi sau khi multer ghi; `deleteFile` không kiểm `isDeleted` (DEV-108 Mục 6).
>   **Next:** còn BR-16 (cần user chốt nghiệp vụ xoá tài sản), BR-13, BR-19 (đụng DB, cần duyệt) và câu hỏi Q1–Q3 — chờ user chọn.
> - **[CẬP NHẬT 2026-09-30, `DEV-109.md`]** BR-19 ĐÃ SỬA: bỏ 3 index thừa khỏi schema (`notifications.recipient`, `apiperformances.createdAt:-1`, `documents.referenceTo`) và
>   XOÁ 7 index cũ trên **DB dev** (gồm 4 index `useraudits` đã bỏ khỏi schema từ lâu nhưng còn nằm lại trong DB) bằng `scripts/migrate-drop-redundant-indexes.ts` (đích danh theo tên, chỉ xoá khi có index thay thế).
>   Dữ liệu không đổi; index nhỏ đi ~664KB. E2E +11 (có `explain` chứng minh truy vấn thật vẫn dùng index). BE tsc 0 / jest 562 / e2e 189 / build PASS.
>   **PRODUCTION CHƯA chạy** — khi deploy phải chạy script (xem trước rồi `--apply`), Mongoose không tự xoá index. `PRODUCTION_DEPLOYMENT_PLAN.md` hiện không liệt kê bước migration nào.
>   Ghi nhận, chưa xoá theo lựa chọn của user: 5 index 0 lượt dùng (DEV-109 Mục 6).
>   **Next:** còn BR-13 (TTL/retention, xoá dữ liệu thật — cần chốt thời hạn), BR-16 (cần chốt nghiệp vụ) và Q1–Q3 — chờ user chọn.
> - **[CẬP NHẬT 2026-09-30, `DEV-110.md`]** BR-13 ĐÃ SỬA MỘT PHẦN: TTL `RefreshToken.expiresAt` (xoá đúng lúc hết hạn) và `Notification.createdAt` (90 ngày) theo lựa chọn của user;
>   `UserAudit` CỐ Ý CHƯA đặt TTL (log tuân thủ, chờ user chốt yêu cầu lưu trữ). Trên DB dev, server `ts-node-dev` tự restart + `autoIndex` đã tạo 2 index lúc 11:28 UTC nên
>   `refreshtokens` 527 → 7 (520 token hết hạn bị xoá đúng như đã duyệt); `notifications` vẫn 383. Script `scripts/migrate-ttl-retention-indexes.ts` (đếm/`--apply`) cho production.
>   E2E +4 (chờ MongoDB xoá thật, đã kiểm chứng gỡ TTL thì fail). BE tsc 0 / jest 562 / e2e 193 / build PASS.
>   **Production:** `autoIndex: true` bật vô điều kiện ⇒ khởi động bản này sẽ tự tạo TTL và xoá ngay dữ liệu quá hạn (DEV-110 Mục 7); sao lưu nếu cần giữ thông báo cũ.
>   Ghi nhận: `RefreshToken` vẫn không có index `token`; `UserAudit` chưa có retention.
>   **[CHỐT 2026-09-30]** `UserAudit`: user chọn KHÔNG đặt TTL, giữ vô hạn (91% collection là `ADMIN_BYPASS`, log thật chỉ ~100–300/tháng; DEV-110 Mục 6). BR-13 đóng hoàn toàn.
>   **[CHỐT 2026-10-01]** Q1–Q3 (duyệt theo role toàn viện, tài sản/vật tư/Dashboard không lọc theo khoa, `GET /workflow/:id` không lọc khoa): user quyết định GIỮ NGUYÊN, "quy trình sẽ chỉnh sửa sau". Không đổi code; xem `31_BACKEND_CODE_REVIEW.md` Mục 2.
>   **Next:** chỉ còn BR-16 (cần chốt nghiệp vụ xoá tài sản). Q1–Q3 chờ quy trình mới. Thay đổi DEV-099 → DEV-110 vẫn CHƯA commit — chờ user yêu cầu.
> - **Next Task**: chưa được user chỉ định cho phiên kế tiếp. Ứng viên còn treo (không bắt buộc): báo cáo
>   tuân thủ mẫu Bộ Y tế cho thiết bị y tế (cần mẫu cụ thể trước); UI test nhánh CHẶN gán thiết bị cho
>   user chưa đủ điều kiện (đã test ở tầng service, chưa qua UI thật — cần ≥2 user trong môi trường test);
>   2 bảng "Theo danh mục"/"Theo khoa/phòng" ở `AssetSummaryWidget` chưa bấm được (xem DEV-083.md Mục 5);
>   nếu sau này cần duyệt/lọc thiết bị y tế thường xuyên hơn — cân nhắc nâng cấp modal DEV-084 thành trang
>   riêng (đã có sẵn service/route để tái dùng, xem DEV-084.md Mục 5); vị trí/trạng thái thu gọn 2 panel
>   System Design (FE-34) chưa lưu qua localStorage — có thể thêm sau nếu user muốn nhớ giữa các lần tải
>   trang; 2 nơi Excel import (Document/Asset) chưa lọc `isActive` khi gán Department (DEV-086.md Mục 6) —
>   task nhỏ riêng nếu user muốn đồng bộ. Không còn việc UI nào treo từ chuỗi FE-27→34/DEV-077→DEV-086.
>   Ứng viên khác theo Roadmap: NHÓM D
>   (dài hạn) — KHÔNG tự bắt đầu khi chưa có chỉ định rõ (CLAUDE.md §41).
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
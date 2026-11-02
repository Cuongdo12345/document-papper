# ĐỀ XUẤT LỘ TRÌNH PHÁT TRIỂN TÍNH NĂNG MỚI

## Quy tắc dùng tài liệu này và trạng thái triển khai (chuyển nguyên văn từ CLAUDE.md §41, 2026-11-02)

Tài liệu tổng hợp đề xuất tính năng phát triển tương lai (nghiệp vụ mới):

```text
docs/development/FEATURE_DEVELOPMENT_ROADMAP.md
```

> **[CẬP NHẬT 2026-09-18] — SỬA CLAIM SAI**: dòng gốc phía trên từng ghi "chưa cái nào được duyệt/implement" — KHÔNG còn đúng. NHÓM A (A1→A4) và NHÓM B1→B3 trong tài liệu này **ĐÃ được duyệt và implement xong** (`docs/development/tasks/DEV-050.md`→`DEV-056.md`), **B4** cũng ĐÃ xong (`DEV-057.md`, Vendor & Contract), **B6** cũng ĐÃ xong (`DEV-063.md`, Tìm kiếm toàn văn Document), **B5** cũng ĐÃ xong (`DEV-064.md`, Xuất PDF chính thức — "ký" là NỘI BỘ hệ thống, KHÔNG PHẢI chữ ký số CA hợp lệ pháp lý, user đã xác nhận sau khi được cảnh báo rủi ro), **B7** cũng ĐÃ xong (`DEV-065.md`, Báo cáo tuần tự động gửi email — opt-in THẬT qua `User.subscribedToWeeklyReport`, phát hiện gap ngoài phạm vi: hiện không có đường nào sửa `email` user đã tồn tại — **gap này ĐÃ ĐƯỢC KHẮC PHỤC ở `DEV-066.md`** (2026-09-18, mở `email` cho `CreateUserDTO`/`UpdateUserDTO`, chỉ ADMIN qua `PUT /users/:id`/tạo mới, CỐ TÌNH không mở self-service)). **B8** cũng ĐÃ xong (`DEV-067.md`, 2026-09-18, Dự trù/đề xuất mua vật tư tiêu hao hàng tháng — domain MỚI `ConsumableRequest`, KHÔNG có luồng duyệt, trạng thái riêng PENDING/FULFILLED/CANCELLED, KHÔNG tự sinh `ConsumableTransaction` khi đánh dấu đã mua; **CẦN gán permission `CONSUMABLE_REQUEST_*` qua UI "Phân quyền" mới dùng được trên DB hiện tại**, cùng pattern DEV-058). **C1** (NHÓM C) cũng ĐÃ xong (`DEV-068.md`, 2026-09-19, Xác thực 2 lớp qua email OTP cho ADMIN + 3 role duyệt cấp cao — opt-in tự chọn, KHÔNG có backup codes (chỉ ADMIN reset thủ công qua `USER_RESET_2FA`); phát hiện và sửa 2 bug thật: (1) `UserAudit.action` enum thiếu action mới qua smoke test, (2) `Permission` catalog trong DB dev thiếu 6 permission mới của DEV-065/067/068 khiến UI "Phân quyền" cắt mất cả nhóm WORKFLOW_* — đã seed lại + nâng `limit:100→300`. User đã tự gán `USER_RESET_2FA` cho ADMIN qua UI + verify UI trình duyệt thật thành công — C1 DONE hoàn toàn). **C2** cũng ĐÃ xong (`DEV-069.md`, 2026-09-19, Quản lý phiên đăng nhập — self-service cho MỌI role (`SessionsSection.tsx`) + ADMIN hỗ trợ xem/thu hồi phiên user khác (permission MỚI `SESSION_VIEW_ALL`/`SESSION_REVOKE_ALL`, mirror `USER_RESET_2FA`); `RefreshToken` thêm `userAgent`/`ip`; **tuân thủ CLAUDE.md Mục 18 MỚI** — viết E2E test thật (supertest+MongoDB in-memory) verify 403 cho route RBAC mới thay vì chỉ giả định; đã chủ động seed Permission catalog + thêm audit enum trước (rút kinh nghiệm DEV-068). **C3** cũng ĐÃ xong (`DEV-070.md`, 2026-09-19, Giám sát phiên đăng nhập toàn hệ thống — GỘP với ý tưởng user đề xuất "trang admin xem phiên của toàn bộ user", KHÁC hướng gốc "export mẫu thanh tra" vì user xác nhận chưa có mẫu cụ thể để bám vào): trang riêng `/app/sessions` (`SessionsMonitorPage.tsx`) cho ADMIN xem + thu hồi phiên của TẤT CẢ user, route mới `GET /users/sessions` DÙNG LẠI permission `SESSION_VIEW_ALL`/`SESSION_REVOKE_ALL` (không tạo permission mới); phần export audit chỉ cải thiện filter "Hành động" từ chọn 1 sang chọn nhiều (gap từ FE-11). **CẦN gán `SESSION_VIEW_ALL`/`SESSION_REVOKE_ALL` cho ADMIN qua UI "Phân quyền"** (đã làm xong — user tự gán từ DEV-069) và `CONSUMABLE_REQUEST_*` cho USER/IT/PHONG_VAT_TU_TTB (DEV-067) — **[CẬP NHẬT 2026-09-22] ĐÃ XONG**: verify trực tiếp DB dev phát hiện role `IT`/`USER`/`PHONG_VAT_TU_TTB` đều CHƯA có (chỉ `ADMIN` có, do được cấp mọi permission mặc định) — đã gán thật qua `assignPermissionsToRoleService` (đúng flow API `POST /roles/:id/assign-permissions`, có clear cache + notify user, không chỉnh DB thô): `IT`/`PHONG_VAT_TU_TTB` nhận đủ VIEW/CREATE/UPDATE/FULFILL, `USER` chỉ nhận VIEW/CREATE/UPDATE (đúng thiết kế DEV-067 — FULFILL là việc của Phòng Vật tư-TTB/IT sau khi mua thực tế). Còn lại CHƯA làm: NHÓM D. Trước khi dùng tài liệu này để lập kế hoạch hoặc đối chiếu trùng lặp đề xuất, PHẢI kiểm tra mục nào đã có task `DEV-0XX` tương ứng (xem `docs/00_PROJECT_MEMORY.md`) — không mặc định cả tài liệu là "chưa làm gì".

Đây là NGUỒN THAM KHẢO khi cần lên kế hoạch nâng cấp/mở rộng tính năng cho phần CÒN LẠI, KHÔNG phải toàn bộ đang chờ thực hiện.

Chỉ đọc tài liệu này khi:

- Người dùng hỏi về roadmap tính năng tương lai.
- Người dùng yêu cầu lên kế hoạch nâng cấp/mở rộng tính năng mới.
- Cần đối chiếu 1 đề xuất tính năng mới có trùng với đề xuất đã ghi nhận hay không.

Không đọc file này cho task bug-fix/refactor/security thông thường nếu không liên quan.

Không tự động implement bất kỳ mục nào trong tài liệu này — chỉ bắt đầu khi người dùng chỉ định cụ thể mục nào.


> **[CẬP NHẬT 2026-09-30]** File `ROADMAP_TOI_GO_LIVE.md` được nhắc ở tài liệu này (đoạn mở đầu và mục "Cách tôi đề xuất tiếp cận") **KHÔNG tồn tại trong repo và chưa từng được commit** (đã kiểm tra `git log --all`). Tài liệu có vai trò tương đương:
> - vá lỗi / hoàn thiện: `docs/development/00_DEVELOPMENT_ROADMAP.md` (lịch sử, DEV-001→025) và `docs/31_BACKEND_CODE_REVIEW.md` (lỗi còn mở);
> - go-live: `docs/development/PRODUCTION_DEPLOYMENT_PLAN.md` (PLANNED, chưa triển khai).
>
> Tình trạng các nhóm: Nhóm A, B và C đều đã có task (xem mục "Quy tắc dùng tài liệu này và trạng thái triển khai" ngay bên dưới — trước đây ở CLAUDE.md §41). Nhóm D chưa làm. Có 2 mục làm KHÁC bản gốc theo lựa chọn của user:
> - **B8** không có luồng duyệt (DEV-067);
> - **C3** làm thành giám sát phiên toàn hệ thống (DEV-070). Phần "xuất audit theo mẫu thanh tra" chưa làm, vì chưa có mẫu cụ thể.

> Đây là đề xuất **tính năng nghiệp vụ**, khác với `ROADMAP_TOI_GO_LIVE.md` (vốn tập trung vá lỗi/
> hoàn thiện những gì đã xây). Một số mục dưới đây suy ra trực tiếp từ gap đã ghi nhận trong memory
> (đánh dấu 📋 — có bằng chứng cụ thể), số còn lại là đề xuất dựa trên đặc thù nghiệp vụ quản lý
> tài liệu + tài sản/thiết bị y tế bệnh viện (đánh dấu 💡 — cần bạn xác nhận có đúng nhu cầu thật
> không, tôi không có quyền tự cho là cần thiết chỉ vì phổ biến ở hệ thống khác).

---

## NHÓM A — Hoàn thiện tính năng đã xây một phần (ROI cao nhất, nên làm trước)

### 📋 A1. QR Code cho Asset

Đã ghi nhận trong quá trình lập kế hoạch review: "QR code theo Asset — chưa có UI". Với tài sản/
thiết bị y tế vật lý, đây gần như là tính năng bắt buộc trong thực tế vận hành (không chỉ "nice to
have"): dán tem QR lên thiết bị → nhân viên quét bằng điện thoại để xem ngay lịch sử bàn giao/kiểm
định, hoặc tạo nhanh đề xuất sửa chữa/báo hỏng ngay tại chỗ thay vì phải nhớ mã tài sản rồi vào hệ
thống tìm.
- Backend: sinh mã QR (embed `assetId` hoặc `assetCode`), có thể là 1 endpoint trả về ảnh QR hoặc
  chỉ trả link, để FE tự render bằng thư viện QR.
- Frontend: hiển thị QR trong AssetDetailPage (để in tem dán), trang quét QR (mobile-friendly) dẫn
  thẳng tới AssetDetailPage hoặc màn hình "báo hỏng nhanh" rút gọn.

### 📋 A2. Upload chứng nhận kiểm định thiết bị y tế qua UI (Calibration Record)

Memory ghi rõ: `certificateFileUrl` hiện có bug đường dẫn chết, và chưa có UI upload file chứng
nhận thật cho Calibration Record — đây là hồ sơ pháp lý quan trọng (bằng chứng thiết bị đã được
kiểm định đúng hạn), nên đóng sớm, không chỉ là UX gap thông thường.

### 📋 A3. Excel Import cho Asset (nếu FE thật sự chưa có, cần xác nhận lại)

Backend đã review kỹ Excel import Asset (pre-fetch category/department, tránh N+1 — REVIEW-06),
nhưng theo memory kế hoạch review ban đầu, UI cho luồng này (khác Document Excel import ở FE-15)
có thể chưa được xây riêng. Cần xác nhận lại 1 lần nữa (có thể đã có nhưng tôi chưa review tới) —
nếu chưa, đây là việc tận dụng lại backend có sẵn, chi phí thấp.

### 💡 A4. Lịch sử phiên bản tài liệu (Document versioning)

Hiện có audit trail (ai làm gì, khi nào), nhưng chưa rõ có xem lại được **nội dung** tài liệu ở
từng lần chỉnh sửa trước không (ví dụ nếu 1 đề xuất bị chỉnh sửa nhiều lần trước khi submit, hoặc
sau khi bị reject rồi resubmit — liên quan trực tiếp W3 tôi từng nêu ở review Workflow). Với tài
liệu hành chính, khả năng xem lại "trước khi sửa nó viết gì" đôi khi là yêu cầu kiểm toán thật.

---

## NHÓM B — Tính năng nghiệp vụ mới (giá trị cao cho bối cảnh bệnh viện)

### 💡 B1. SLA & nhắc việc cho Workflow (cảnh báo duyệt quá hạn)

Hiện tại 1 đề xuất có thể "nằm" ở 1 bước duyệt vô thời hạn nếu người có trách nhiệm quên/bận,
không có cơ chế nào cảnh báo. Đề xuất:
- Đặt SLA (số ngày) cho mỗi bước duyệt theo từng `WorkflowTemplate`.
- Cron job kiểm tra `WorkflowInstance` đang pending quá hạn → gửi Notification nhắc người duyệt +
  (tuỳ chọn) escalate lên cấp trên hoặc ADMIN nếu quá hạn 2 lần.
- Dashboard riêng "Đề xuất trễ hạn" cho quản lý theo dõi.

Đây là tính năng tận dụng đúng hạ tầng Notification + Workflow đã có sẵn, không cần xây module mới
từ đầu — chỉ thêm 1 cron job + vài field mới.

### 💡 B2. Lịch bảo trì/kiểm định định kỳ chủ động (Preventive Maintenance Schedule)

Hiện có cron cảnh báo khi **gần hết hạn** kiểm định (`assetAlerts.service.ts`), mang tính "phản
ứng". Với thiết bị y tế, thường cần thêm góc nhìn "chủ động": lịch bảo trì định kỳ đã lên kế hoạch
trước (theo tháng/quý), hiển thị dạng calendar, để phòng Vật tư-TTB chủ động sắp lịch thay vì chỉ
chờ cảnh báo.

### 💡 B3. Quản lý vật tư tiêu hao (Inventory/Consumables) — tách biệt với Asset cố định

`Asset` hiện mô hình hoá tài sản cố định (máy móc, thiết bị — có vòng đời assign/transfer/return).
Vật tư tiêu hao (mực in, giấy, vật tư y tế dùng 1 lần...) có bản chất khác: theo dõi **số lượng
tồn kho**, nhập/xuất kho, ngưỡng cảnh báo hết hàng — không phải "1 tài sản có ID theo dõi trọn đời".
Nếu bệnh viện đang cần quản lý cả 2 loại này, đây nên là module riêng, không gò vào model `Asset`
hiện tại (tránh lặp lại kiểu lỗi model quá tải đã thấy ở `WorkflowInstance.steps[].role` free
string).

### 💡 B4. Quản lý nhà cung cấp & hợp đồng bảo trì (Vendor & Contract Management)

Thiết bị y tế thường có hợp đồng bảo trì/bảo hành với nhà cung cấp cụ thể, có thời hạn, có điều
khoản. Hiện hệ thống chưa có khái niệm "Vendor"/"Contract" — nếu nghiệp vụ thật cần theo dõi (ví
dụ: thiết bị nào còn bảo hành, hợp đồng bảo trì nào sắp hết hạn), đây là module đáng cân nhắc, có
thể liên kết trực tiếp với `Asset`/`MedicalDeviceProfile` đã có.

### 💡 B5. Xuất báo cáo PDF chính thức (có mẫu, chữ ký, dấu) cho tài liệu đã duyệt

Hiện có Excel export (dữ liệu dạng bảng) nhưng tài liệu hành chính đã qua đủ các bước duyệt thường
cần xuất ra dạng **văn bản chính thức** (PDF theo mẫu, có thể kèm chữ ký số hoặc tối thiểu là bảng
"Người duyệt — ngày duyệt — ghi chú" trích từ lịch sử Workflow) để lưu hồ sơ giấy hoặc gửi đi.

### 💡 B6. Tìm kiếm toàn văn (Full-text search) xuyên suốt tài liệu

Hiện tại filter theo field cụ thể (department/status/subType...). Nếu khối lượng tài liệu lớn dần,
nhu cầu "tìm tài liệu có chứa từ khoá X trong nội dung/ghi chú" sẽ phát sinh — MongoDB có text
index sẵn có (Atlas Search hoặc `$text`), tận dụng được mà không cần thêm hạ tầng ngoài (Elastic...)
nếu quy mô chưa quá lớn.

### 💡 B7. Báo cáo định kỳ tự động gửi email (Scheduled Reports)

Tận dụng Dashboard/KPI đã có: cho phép lãnh đạo (BAN_GIAM_DOC, TRUONG_KHOA) đăng ký nhận báo cáo
tóm tắt định kỳ (tuần/tháng) qua email tự động, thay vì phải chủ động vào Dashboard xem.

### 💡 B8. Dự trù/đề xuất mua vật tư tiêu hao hàng tháng, có duyệt (Monthly Consumable Procurement Request)

**[THÊM 2026-09-16]** Phát sinh từ phản hồi user khi làm rõ phạm vi B3 (`DEV-056.md`, follow-up
2026-09-16): B3 hiện tại (`ConsumableItem`/`ConsumableTransaction`) chỉ ghi nhận giao dịch nhập/xuất
kho THỦ CÔNG, SAU KHI đã xảy ra (reactive) — không có khái niệm "mỗi khoa/phòng dự trù nhu cầu vật tư
cho tháng tới, gửi đề xuất, chờ duyệt trước khi mua" (proactive, có chu kỳ tháng). Đây là nghiệp vụ
khác hẳn B3, gần giống mô hình "Đề xuất → Duyệt" mà `Document`/`Workflow` engine đã có sẵn nhưng áp
dụng cho vật tư tiêu hao thay vì tài liệu. User xác nhận MUỐN xây nhưng chưa ấn định thời điểm — cần
hỏi lại phạm vi cụ thể trước khi code (theo đúng thông lệ B-series): có cần duyệt hay chỉ ghi nhận đề
xuất; có theo dõi ngân sách/giá tiền hay chỉ số lượng; tái dùng `Workflow` engine sẵn có hay xây luồng
trạng thái riêng cho `ConsumableRequest`; liên kết ra sao với `ConsumableTransaction` khi đề xuất được
duyệt và mua thực tế (tự động tạo giao dịch NHẬP, hay vẫn phải nhập tay).

---

## NHÓM C — Bảo mật & vận hành nên bổ sung (không phải "tính năng nghiệp vụ" nhưng đáng đầu tư)

### 💡 C1. Xác thực 2 lớp (2FA) cho ADMIN và các role duyệt cấp cao

Xét bối cảnh đã tìm ra **3 đường leo thang đặc quyền lên ADMIN độc lập** (dù đã fix hết) và tài
khoản ADMIN có quyền bypass gần như mọi kiểm soát trong hệ thống, thêm 2FA cho riêng nhóm tài khoản
này là lớp phòng thủ hợp lý (defense-in-depth), không phụ thuộc việc RBAC có bug hay không trong
tương lai.

### 💡 C2. Quản lý phiên đăng nhập (Session Management UI)

Cho phép user (đặc biệt ADMIN) xem danh sách thiết bị/phiên đang đăng nhập và chủ động thu hồi
("đăng xuất từ xa") — hữu ích khi nghi ngờ tài khoản bị lộ, và tận dụng đúng cơ chế `RefreshToken`
đã có sẵn (chỉ cần thêm UI liệt kê + action revoke theo từng token thay vì chỉ revoke toàn bộ khi
đổi mật khẩu như hiện tại).

### 💡 C3. Xuất báo cáo Audit Log theo mẫu cho thanh tra/Sở Y tế

Audit Log hiện có UI xem + export (FE-11), nhưng nếu cơ quan quản lý y tế có mẫu báo cáo tuân thủ
cụ thể (ví dụ báo cáo sử dụng thiết bị y tế định kỳ theo quy định Bộ Y tế), nên xác nhận format
export hiện tại có đáp ứng được không, hay cần thêm 1 export mẫu riêng.

---

## NHÓM D — Dài hạn, cân nhắc thêm nếu có nhu cầu rõ ràng

- **Mobile app/PWA** cho quét QR (A1) và duyệt nhanh ngay trên điện thoại khi lãnh đạo không ở bàn
  làm việc.
- **Tích hợp đồng bộ nhân sự/khoa phòng** với hệ thống nhân sự (HRM) hoặc HIS của bệnh viện nếu đã
  có sẵn — tránh phải nhập tay User/Department 2 lần ở 2 hệ thống.
- **Chatbot/tìm kiếm thông minh nội bộ** — chỉ đáng đầu tư khi khối lượng tài liệu/thắc mắc lặp lại
  đủ lớn để có ROI, không nên làm sớm chỉ vì "công nghệ mới".

---

## Cách tôi đề xuất tiếp cận

Nhóm A (4 mục) là tận dụng lại phần đã xây, chi phí thấp — nên làm trước hoặc xen kẽ với
`ROADMAP_TOI_GO_LIVE.md` Giai đoạn 0-1. Nhóm B/C là tính năng mới thật sự, nên làm **sau** khi hệ
thống hiện tại ổn định và đã go-live lần đầu — tránh vừa vá lỗi nền tảng vừa mở rộng tính năng cùng
lúc, dễ rối ưu tiên.

Bạn xem qua và cho tôi biết: trong Nhóm B/C, mục nào là nhu cầu THẬT của bệnh viện bạn (không phải
tôi đoán mà đúng phát sinh từ thực tế vận hành), để tôi giúp lên kế hoạch triển khai chi tiết cho
đúng mục đó trước.

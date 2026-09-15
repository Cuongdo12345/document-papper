# 22 — GLOBAL TESTING REVIEW

> Loại: Tổng hợp xuyên-domain (KHÔNG phải 1 phase/review mới, KHÔNG viết test, KHÔNG sửa code) | Ngày: 2026-08-31.
>
> **Nguồn đã đọc**: `CLAUDE.md`, `docs/18_TESTING_STRATEGY.md` (toàn văn, tự viết trước đó — nguồn chính về toolchain/gap tổng quát), `backend/package.json`, 16 module review (`docs/module-reviews/00→16_*.md` — dùng tóm tắt đã có sẵn kèm ID finding cụ thể trong `docs/00_PROJECT_MEMORY.md`, không đọc lại toàn văn những review đã tóm tắt đủ chi tiết theo đúng SKILL.md Rule 04/07), `docs/16_REFACTORING_PLAN.md`/`docs/17_SECURITY_HARDENING_PLAN.md`/`docs/19_IMPROVEMENT_ROADMAP.md` (đối chiếu ID, không lặp nội dung).
>
> **Khác biệt với `docs/18_TESTING_STRATEGY.md`**: Phase 18 tổ chức theo TRỤC KỸ THUẬT (Authentication/RBAC/API/Error handling/Regression...) và đưa ra roadmap thực thi 19 test case. Tài liệu này tổ chức lại theo **14 DOMAIN NGHIỆP VỤ** cụ thể (yêu cầu của review này), là 1 lát cắt khác của CÙNG bộ evidence — không tạo finding mới, dùng lại toàn bộ `TEST-001→019` đã có và bổ sung mapping domain-by-domain chưa từng được trình bày dưới dạng ma trận đầy đủ ở Phase 18.

---

## 1. Objective

Xác định Existing tests / Missing tests / Critical workflows / Regression risks cho từng 1 trong 14 domain nghiệp vụ được yêu cầu, phân loại ưu tiên P0-P3, làm input tham chiếu nhanh khi cần quyết định "domain nào viết test trước" — không viết test, không tạo test case mới ngoài những gì `docs/18_TESTING_STRATEGY.md` đã có evidence.

## 2. Testing Landscape (nhắc lại tóm tắt, không lặp chi tiết — xem `docs/18_TESTING_STRATEGY.md` Mục 2-3)

- **Toolchain KHÔNG cài đặt được**: `backend/package.json` hiện không có `jest`/`ts-jest`/`@types/jest` trong `devDependencies`, không có script `test`. `jest.config.js` từng tồn tại, đã bị xoá khỏi git ở commit `5b58fb1`.
- **4 bộ test đã từng viết, chạy được, nhưng KHÔNG CÒN trong git** — chỉ còn dạng compiled `dist/src/**/__tests__/*.test.js` (gitignored, mtime 2026-08-22): `auths.service.test.js` (Auth), `authorizePermission.middleware.test.js` (RBAC), `workflow.service.test.js` (Workflow — chỉ `approveStep`/`rejectStep`), `permission.cache.test.js` (RBAC cache).
- **0 API/integration test** trên toàn bộ 116 endpoint, 0 test cho 10/14 domain còn lại (Departments, Documents CRUD, Assets, Assignment, Medical Device, Upload, Import, Export, Dashboard, Notification).
- CI/CD: không có pipeline nào chạy test tự động (TD-12, REVIEW-14).

## 3. Domain Coverage Matrix

> **Existing**: test thật đang tồn tại (kể cả dạng mồ côi trong `dist/`). **Priority**: theo risk thực tế (security/data-integrity/business-critical), không phải theo độ phức tạp code.

| # | Domain | Existing Tests | Critical Workflows chưa được bảo vệ | Regression Risk chính | Priority |
|---|---|---|---|---|---|
| 1 | **Auth** | 1 suite mồ côi (`auths.service.test.js` — register/login/refresh, cover tốt chống enumeration) | `resetPassword()` (self-service qua email), `logout`/revoke, refresh-token rotation | `SEC-01` (refresh không rotate) tái phát không ai biết; `RV01-01` (refresh không try/catch → 500 rò rỉ) | **P0** |
| 2 | **RBAC** | 2 suite mồ côi (`authorizePermission.middleware.test.js` — RBAC+ABAC+bypass; `permission.cache.test.js` — TTL/clear) | Guard chặn rename Role→`"ADMIN"` (chưa tồn tại, vì `REF-001` chưa implement); desync `permission.constant.ts` vs DB `Permission` | `SEC-28` (backdoor CRITICAL) tái phát/không phát hiện được nếu implement REF-001 mà không có test giữ | **P0** |
| 3 | **Users** | 0 | `resetPassword()` admin-reset-hộ (thiếu guard ADMIN), `update()` department validation khi không kèm role, pagination `getList` | `SEC-29` (account-takeover ADMIN thứ 2) không lưới an toàn; `RV16-02` (department validation skip) | **P0** |
| 4 | **Departments** | 0 | `deleteDepartmentService` (thiếu check Asset/AssetAssignmentHistory), CRUD hoàn toàn không có `validateBody`/`validateParams` | `RV04-01` (xoá Department còn Asset tham chiếu → dangling reference); `SEC-11` (0 input validation domain này) | **P1** |
| 5 | **Documents (CRUD core)** | 0 | `getAllDocumentsService`/`getDocumentDetailService` (thiếu department-scoping), `deleteDocumentsByMonthService` (hard-delete không check ref), pagination | `SEC-34` (rò rỉ dữ liệu liên phòng ban); ISS-02 (mất dữ liệu vĩnh viễn qua xoá hàng loạt); `ARCH-27` (pagination coercion) | **P0** |
| 6 | **Workflow** | 1 suite mồ côi (`workflow.service.test.js` — CHỈ `approveStep`/`rejectStep` role-matching, KHÔNG cover `syncAssetOnDocumentApproved`) | `syncAssetOnDocumentApproved` (bug CONFIRM_STATUS↔PROPOSE_INK/REPAIR — CRITICAL, đang chạy sai lặng lẽ) | `RV05-01` — bug ĐANG XẢY RA, không throw lỗi, không ai biết cho tới khi review nguồn thủ công phát hiện; đây là domain rủi ro cao nhất nếu tiếp tục không có test | **P0** |
| 7 | **Assets (core)** | 0 | `updateAssetService` (isActive lọt whitelist, bypass guard soft-delete), `hardDeleteAssetService` (không check MedicalDeviceProfile/Document.relatedAsset), regex filter không escape | `SEC-35` (business-logic bypass); `RV16-01` (mất dữ liệu vĩnh viễn — xem #9); `SEC-36` (ReDoS) | **P1** |
| 8 | **Assignment (Asset↔User↔Department)** | 0 | `assignAssetService`/`transferAssetService`/`returnAssetService` (concurrency — không bắt riêng `VersionError`), `disable()` User không đồng bộ `Asset.assignedTo` | `RV06-08` (2 request đồng thời cùng Asset — race condition); `RV16-03` (Asset "đang cấp phát" cho user đã khoá vĩnh viễn) | **P2** |
| 9 | **Medical Device** | 0 | Không có service delete nào tồn tại cho `MedicalDeviceProfile` — hard-delete Asset để lại mồ côi VĨNH VIỄN, không đường dọn kể cả thủ công | `RV16-01`/`SEC-42` — data-integrity nghiêm trọng NHẤT về tính KHÔNG THỂ KHÔI PHỤC (không có API nào sửa được sau khi xảy ra); `CalibrationRecord.committed` flag (positive, `RV06-09` — nên có test bảo vệ vì đây là cơ chế cleanup tinh vi, dễ vỡ khi refactor) | **P1** |
| 10 | **Upload** | 0 | Toàn bộ chuỗi: `saveFilesToDB` (không set `uploadedBy`), `getFiles`/`getFileDetail`/`deleteFile` (0 ownership check), `createUploader` (0 `allowedTypes`) | `SEC-30→33` — 4 finding HIGH liên kết nhân-quả, domain rủi ro bảo mật cao nhất về file access, 0 test nào kể cả trong 4 suite mồ côi | **P0** |
| 11 | **Import (Excel)** | 0 | Dò trùng lặp TRƯỚC transaction (TOCTOU), `MulterError` không được nhận diện riêng, N+1 transaction/dòng (đánh đổi có chủ đích, KHÔNG cần test cho tới khi REF-016 điều tra xong) | `RV08-04` (race condition tạo trùng lặp khi import đồng thời); `SEC-41` (lỗi 500 thay vì 400 khi sai định dạng file) | **P2** |
| 12 | **Export** | 0 | `escapeCsvField` (CSV formula injection — `=`/`+`/`-`/`@` không neutralize), `exportDocumentsExcelPRO` (streaming — chưa test file lớn) | `SEC-15` — CSV mở bằng Excel có thể thực thi formula độc hại nếu người nhận mở file xuất | **P2** |
| 13 | **Dashboard** | 0 | 11/12 endpoint không scoping (chỉ `admin-summary` có check), `topDamagedInkService`/KPI dựa trên đúng cặp `CONFIRM_STATUS↔PROPOSE_INK` (phụ thuộc gián tiếp vào bug Workflow #6 — SAI THEO nếu #6 chưa fix) | `RV07-01` (rò rỉ dữ liệu liên phòng ban qua KPI); KPI Asset "hư hỏng nhiều nhất" SAI LỆCH do bug `RV05-01` chưa fix (dashboard hiển thị số liệu không phản ánh đúng thực tế) | **P2** |
| 14 | **Notification** | 0 | `getList` (type assertion không coerce `page`/`limit` — runtime không xác định), `sendEmailForNotification` (HTML injection qua `title`/`message`) | `RV10-01` (pagination Notification — hậu quả nặng nhất trong 3 domain lỗi pagination vì `skip=NaN` có thể lỗi hẳn request); `SEC-39` (HTML injection) | **P2** |

## 4. Critical Workflows — Tổng hợp xuyên-domain (không phân theo domain đơn lẻ)

Các luồng nghiệp vụ ĐI QUA NHIỀU DOMAIN, rủi ro cao hơn tổng rủi ro từng domain cộng lại vì lỗi ở 1 domain lan sang domain khác:

1. **Document → Workflow → Asset sync** (Documents+Workflow+Assets, #5+#6+#7): `RV05-01` (bug) + `ARCH-18` (side-effect ngoài transaction, chủ đích nhưng cộng dồn rủi ro) — đây là luồng CÓ BUG THẬT ĐANG CHẠY, ưu tiên test cao nhất toàn hệ thống.
2. **Department xoá → Asset/User/Document còn tham chiếu** (Departments+Assets+Users+Documents, #4+#7+#3+#5): pattern "chặt ở tạo, lỏng ở huỷ" lặp lại ≥3 domain độc lập (`ARCH-05`) — không phải 1 bug mà là 1 khoảng trống thiết kế, cần test theo pattern chung thay vì vá từng domain riêng.
3. **RBAC bypass → mọi domain** (RBAC là nền tảng cho toàn bộ 13 domain còn lại): `SEC-28` chưa fix nghĩa là MỌI test authorization ở domain khác đều có thể bị vô hiệu hoá hoàn toàn bởi 1 đường vòng duy nhất — test RBAC phải làm TRƯỚC/SONG SONG bất kỳ domain nào khác.
4. **Upload → mọi domain có file đính kèm** (Upload là domain dùng chung, không chỉ 1 luồng riêng): Document, Asset, MedicalDeviceProfile đều có thể tham chiếu file qua domain Upload chung — lỗ hổng IDOR ở Upload ảnh hưởng gián tiếp tới quyền riêng tư dữ liệu của các domain khác.

## 5. Regression Risk Register (đã CONFIRMED, không suy đoán)

| Risk | Domain | Vì sao là regression risk (không chỉ là bug) |
|---|---|---|
| `SEC-05`/ISS-01 (privilege escalation `PUT /users/:id`) đã fix ở TASK-001 nhưng **0 test bảo vệ** | Users/RBAC | Refactor tương lai ở `users.service.ts:update` có thể vô tình mở lại chính lỗ hổng đã đóng mà không ai biết cho tới khi bị khai thác lại |
| 4 bộ test mồ côi (`dist/*.test.js`) chưa commit vào git | Auth, RBAC, Workflow | Nếu thư mục `dist/` bị xoá/build lại (thao tác thường quy khi deploy) → mất VĨNH VIỄN, không có git history nào khôi phục được |
| `syncAssetOnDocumentApproved` (RV05-01) | Workflow/Assets | Bất kỳ thay đổi nào ở `documentRules.ts` HOẶC `workflow.service.ts` trong tương lai (kể cả không liên quan tới bug này) đều có nguy cơ VÔ TÌNH "sửa đúng" hoặc "sửa sai thêm" mà không ai biết vì không throw lỗi nào |
| `ASSET_UPDATE_WHITELIST` (SEC-35) | Assets | Thêm field mới vào DTO/whitelist trong tương lai có nguy cơ lặp lại đúng lỗi này (quên loại trừ field nhạy cảm) nếu không có test chốt hành vi "field nào PHẢI bị chặn" |
| Pagination 3 domain (Documents/Users/Notifications, `ARCH-27`) | Documents, Users, Notification | Bất kỳ ai bật lại `validateQuery` (REF-006) mà không có test trước/sau có nguy cơ không phát hiện được domain nào ĐÃ hết bug, domain nào CHƯA |

## 6. Priority Matrix (tổng hợp P0-P3, ánh xạ domain)

| Priority | Domain | Lý do |
|---|---|---|
| **P0** | Auth, RBAC, Users, Documents (CRUD core), Workflow, Upload | Account-takeover ADMIN (2 đường còn mở), bug business-rule CONFIRM_STATUS đang chạy sai, rò rỉ dữ liệu liên phòng ban, chuỗi IDOR File — đều là finding CRITICAL/HIGH có bằng chứng CONFIRMED, không phải rủi ro lý thuyết |
| **P1** | Departments, Assets (core), Medical Device | Referential integrity 1 chiều, data-integrity KHÔNG THỂ KHÔI PHỤC (Medical Device), business-logic bypass (Asset isActive) |
| **P2** | Assignment, Import, Export, Dashboard, Notification | Risk thật nhưng cần điều kiện tiên quyết cụ thể hơn (concurrency, injection qua email, KPI hiển thị sai — hệ quả gián tiếp của P0 Workflow) |
| **P3** | (không có domain nào trong 14 domain được yêu cầu xếp P3 — mọi domain đều có ít nhất 1 finding CONFIRMED từ MEDIUM trở lên) | — |

## 7. Kết luận

Không có domain nào trong 14 domain được yêu cầu là "an toàn, không cần test" — mức độ khác nhau chỉ ở THỨ TỰ ưu tiên. 6 domain P0 (Auth/RBAC/Users/Documents/Workflow/Upload) đều gắn trực tiếp với ít nhất 1 finding CRITICAL/HIGH đã CONFIRMED và đang OPEN (`SEC-28`, `SEC-29`, `RV05-01`, `SEC-34`, `SEC-30→33`). Trình tự viết test đề xuất KHÔNG đổi so với `docs/18_TESTING_STRATEGY.md` Mục 18-19 và `docs/19_IMPROVEMENT_ROADMAP.md` Mục 17 — tài liệu này bổ sung góc nhìn theo domain để dễ đối chiếu khi giao việc theo team/module thay vì theo trục kỹ thuật.

Không có test nào được viết trong review này — đây thuần là bản đồ tổng hợp.

---

**GLOBAL TESTING REVIEW COMPLETED.**

# Phase 18 — Testing Strategy

> Quy ước: **CONFIRMED** = evidence trực tiếp trong source/git history. **INFERRED** = suy luận hợp lý, chưa chạy runtime. **UNKNOWN** = chưa đủ evidence.
> Phạm vi: đánh giá testing hiện tại + xây chiến lược test theo risk thực tế. KHÔNG viết test hàng loạt, KHÔNG sửa source, KHÔNG cài dependency trong phase này.

## 1. Objective

Đánh giá thực trạng testing của "Document Papper" backend và xây dựng chiến lược test ưu tiên theo rủi ro thực tế (không test dàn trải), dựa trên các finding đã verify ở Phase 09/12/14/15/16/17 và 16 module review. Không triển khai test trong phase này — đây là kế hoạch.

## 2. Current Testing Landscape

**Finding quan trọng nhất của phase này — cập nhật/đính chính baseline lịch sử:**

`docs/12_ISSUES_AND_RISKS.md` (ISS-07) và `docs/11_TECHNICAL_DEBT.md` (TD-09/TD-26) ghi nhận: *"cấu hình Jest (`jest.config.js`, `ts-jest`) đầy đủ nhưng KHÔNG có file test nào"*. Kiểm tra source hiện tại (2026-08-31) cho thấy tình trạng đã **THAY ĐỔI và XẤU HƠN**:

| Evidence | Quan sát |
|---|---|
| `backend/package.json` hiện tại | **Không có** `jest`, `ts-jest`, `@types/jest` trong `devDependencies`. Không có script `test`. |
| `git log --follow -- jest.config.js` | File từng tồn tại, bị **xoá trong commit `5b58fb1` ("update")** — không rõ có chủ đích hay vô tình (UNKNOWN). |
| `backend/node_modules/.bin/jest` | Không tồn tại — Jest CLI **chưa được cài** trong `node_modules` hiện tại (chỉ còn `@jest/globals` type package sót lại). |
| `backend/dist/src/**/__tests__/*.test.js` (4 file, gitignored `dist/`) | **4 bộ test đã từng được viết và biên dịch thành công** (mtime 2026-08-22): `auths.service.test.js`, `authorizePermission.middleware.test.js`, `workflow.service.test.js`, `permission.cache.test.js`. |
| `git log --diff-filter=A --all -- "*.test.ts" "**/__tests__/**"` | **Rỗng** — source `.test.ts` của 4 bộ test trên **CHƯA BAO GIỜ được commit vào git** (untracked, rồi bị xoá khỏi working tree cục bộ). |
| `backend/tsconfig.test.json` | Vẫn còn tồn tại (`types: ["node","jest"]`) — dấu vết còn sót của hạ tầng test cũ. |
| `backend/src/export/test/` | Thư mục rỗng, không rõ mục đích (UNKNOWN). |
| CI configuration | Không tìm thấy `.github/workflows` hay pipeline CI nào trong repo (khớp TD-12). |

**Kết luận (CONFIRMED)**: Test suite KHÔNG "chưa từng được viết" như Phase 01/12 ghi — nó **đã được viết, chạy được, biên dịch được, rồi bị mất khỏi git** (source `.test.ts` không commit + `jest.config.js` bị xoá ở `5b58fb1`). Hiện trạng thực tế còn tệ hơn ISS-07 mô tả: không chỉ "0 test file" mà **toolchain test cũng không còn cài đặt được** (thiếu `jest` trong `devDependencies`). 4 file `dist/*.test.js` là **bằng chứng khảo cổ** duy nhất còn lại — dùng làm blueprint khôi phục thay vì viết lại từ đầu.

→ **Cập nhật PROJECT_MEMORY**: đánh dấu ISS-07/TD-09/TD-26 là **OUTDATED (một phần)** — không sai về kết luận cuối (zero test hiện hành) nhưng sai về nguyên nhân/lịch sử.

## 3. Test Architecture

Từ 4 file `dist/*.test.js` khôi phục được pattern kỹ thuật đã dùng (dùng làm chuẩn khi viết lại):

- Framework: **Jest** + `@jest/globals` (import tường minh `describe/it/expect/jest`), TypeScript qua `ts-jest`/`tsconfig.test.json`.
- Vị trí: colocated `__tests__/` cạnh file nguồn (`src/services/auth/__tests__/`, không phải thư mục `tests/` tách riêng).
- Chiến lược mock: **mock toàn bộ Model Mongoose** (`jest.mock("../../models/...")`) + mock các service phụ thuộc I/O khác (`notification.service`, `mailer`) — test thuần business logic ở tầng Service/Middleware, không cần DB thật.
- Riêng transaction: mock `withTransaction` chạy callback ngay với session giả — tránh phụ thuộc replica set thật khi unit-test (ghi chú rõ trong comment gốc).
- Chưa có bằng chứng về: `mongodb-memory-server`, `supertest`, coverage threshold, CI config — **UNKNOWN**, không tồn tại trong 4 file mẫu.

**Khuyến nghị kiến trúc test 3 tầng** (dựa trên pattern đã có + gap hiện tại):

1. **Unit** (mock Model) — tiếp tục pattern đã có, mở rộng ra toàn bộ Service/Middleware quan trọng.
2. **Integration** (DB thật qua `mongodb-memory-server`, KHÔNG mock Model) — cần cho các luồng có transaction/cascade thật (workflow → Asset sync, hard-delete referential integrity) mà mock Model không phát hiện được lỗi tích hợp.
3. **API** (`supertest` chạy qua Express app thật, mock tầng ngoài cùng: mailer/notification) — cần cho hợp đồng Route↔Middleware↔Controller (ví dụ regression cho `ARCH-27` pagination coercion, vốn là lỗi Ở TẦNG ROUTE mà unit-test Service không bắt được vì Service test luôn tự truyền `page` đã là number).

## 4. Authentication Testing

Có blueprint từ `auths.service.test.js` (register/login/refresh), coverage tốt về: chống account-enumeration (401 cùng message cho "sai user" / "user bị khoá" / "sai mật khẩu"), verify bcrypt hash, verify JWT trả về, verify audit log LOGIN.

**Gap (chưa có test, kể cả trong bản đã mất)**:
- `resetPassword` — liên quan trực tiếp `SEC-29` (thiếu safeguard ADMIN) — **không có test nào**, kể cả blueprint cũ.
- `logout` / thu hồi refresh token — không có test.
- Refresh-token rotation/reuse-detection — Phase 07 ghi nhận "asymmetric revocation", không có test xác nhận hành vi khi refresh token cũ bị dùng lại.
- Rate-limit đăng nhập sai nhiều lần — không có test.

## 5. RBAC Testing

Blueprint `authorizePermission.middleware.test.js` là bộ test **tốt nhất trong 4 file** — cover: 401 chưa login, ADMIN bypass, RBAC allow/deny, `requireAll` true/false, ABAC policy match/no-match, ABAC evaluator lỗi không làm sập middleware (403 thay vì 500).

**Gap nghiêm trọng nhất**: chính bộ test này **chứng minh bằng code** rằng bypass dựa trên `role.name === "ADMIN"` (dòng test "BYPASS toàn bộ check nếu role.name === 'ADMIN'") — đây **chính là cơ chế mà `SEC-28`/`RV02-01` khai thác** (rename bất kỳ role nào thành chuỗi `"ADMIN"`). Bộ test hiện có xác nhận hành vi bypass là **đúng như thiết kế**, nhưng **không có test nào phủ định được kịch bản "role KHÔNG PHẢI ADMIN thật nhưng có tên trùng `'ADMIN'`"** — đây chính là lỗ hổng. → cần `TEST-001` (P0) bổ sung sau khi `REF-001` được áp dụng.
- Không có test cho desync 2 nguồn permission (`permission.constant.ts` vs DB `Permission` collection — `SEC-38`).
- Không có test cho `permission.cache` TTL tương tác với thay đổi role runtime (đổi role user giữa chừng, cache cũ có bị dùng nhầm không).

## 6. User/Department Testing

**Không có test nào**, kể cả trong 4 file blueprint. Rủi ro cao nhất chưa test:
- `RV16-02` — `updateUserService` bỏ qua validate `Department` tồn tại khi payload không kèm `role`.
- `RV16-03` — `disable()` User không đồng bộ `Asset.assignedTo`.
- `resetPassword` thiếu guard ADMIN (`SEC-29`, trùng mục 4).

## 7. Document Testing

**Không có test nào** cho toàn bộ domain Document — đây là domain lớn nhất, nhiều business rule nhất, và đang mang **bug CONFIRMED nghiêm trọng nhất hệ thống chưa có bất kỳ lưới an toàn nào**:

- `RV05-01` (CRITICAL) — mâu thuẫn `documentRules.ts` (khai `CONFIRM_STATUS → PROPOSE_INK`) vs `workflow.service.ts:syncAssetOnDocumentApproved` (hard-code `PROPOSE_REPAIR`) — Asset không bao giờ đồng bộ đúng sau khi duyệt xong `CONFIRM_STATUS`. Đây là finding có **4 bằng chứng độc lập** (business rule, Dashboard KPI, Excel import/export) nhưng **0 test tự động**.
- Không có test cho status machine Document (transition hợp lệ/không hợp lệ).
- Không có test cho `SEC-34`/`RV05-04` (thiếu department-scoping khi đọc Document).

`workflow.service.test.js` (blueprint có sẵn) chỉ cover `approveStep`/`rejectStep` ở mức role-matching — **không cover** nhánh `syncAssetOnDocumentApproved` nơi bug `RV05-01` thực sự nằm.

## 8. File Import/Export Testing

**Không có test nào.** Đây là domain rủi ro cao thứ 2 sau Document:
- Chuỗi IDOR Upload (`SEC-30→33`/`RV09-01→04`) — không có test ownership/permission.
- Excel batch import/export — không có test cho transaction boundary (`REF-016` ghi nhận cần điều tra lý do gốc trước khi sửa — càng cần test trước khi refactor).
- Path traversal / MIME/extension validate file upload — không có test.

## 9. Audit Testing

**Không có test nào** cho `userAudit.model`/audit log ngoài việc bị mock trong `auths.service.test.js` (chỉ verify `UserAudit.create` được gọi, không verify nội dung audit log đầy đủ cho các action khác ngoài LOGIN/register).

## 10. API Testing

**Không có bất kỳ integration/API test nào** (không `supertest`, không test nào chạy qua Express app thật) trên toàn bộ 116 endpoint (theo `05_API_ANALYSIS.md`). 4 bộ test hiện có đều là **unit test tầng Service/Middleware**, không phải API test — nghĩa là hợp đồng Route (`validateQuery` bị comment, `ARCH-27`) hoàn toàn không có lưới an toàn nào phát hiện được bằng test hiện tại, kể cả khi khôi phục nguyên trạng 4 file cũ.

## 11. Error & Edge Case Testing

4 file blueprint có pattern edge-case tốt (404/400/403, dữ liệu hỏng như `currentStep` vượt quá số bước) nhưng chỉ giới hạn trong 4 hàm. Không có test edge-case cho: giới hạn upload file size, pagination invalid input, ObjectId không hợp lệ ở params (liên quan `ARCH-29` thiếu `validateParams` nhất quán).

## 12. Regression Testing

**Không có regression test nào**, kể cả cho các fix đã triển khai. Cụ thể: `TASK-001`/`TASK-002` (đóng lỗ hổng ISS-01, thêm `PATCH /api/users/:id/role` + permission `USER_ASSIGN_ROLE`) **không có test nào bảo vệ** — một thay đổi tương lai có thể vô tình mở lại chính lỗ hổng đã đóng mà không ai biết cho đến khi bị khai thác lại.

## 13. Current Test Gaps

Tổng hợp (không lặp lại chi tiết ở trên):

| Gap | Mức độ |
|---|---|
| Toolchain test không cài được (thiếu `jest` trong `devDependencies`, `jest.config.js` đã bị xoá) | BLOCKER — phải khôi phục trước khi viết bất kỳ test nào |
| 0 test cho domain Document (business rule phức tạp nhất, đang có bug CONFIRMED) | CRITICAL |
| 0 test cho domain Upload (chuỗi IDOR đã xác nhận) | CRITICAL |
| 0 API/integration test trên 116 endpoint | HIGH |
| 0 regression test cho fix bảo mật đã triển khai (TASK-001/002) | HIGH |
| 4 bộ unit test tồn tại dưới dạng compiled JS orphan, nguy cơ mất vĩnh viễn nếu `dist/` bị xoá/build lại | HIGH (khôi phục ngay, xem Mục 18) |
| 0 test cho Department/Asset assignment lifecycle (RV16-02/03) | MEDIUM |
| 0 test cho email template injection (SEC-39/40) | MEDIUM |
| Test coupled tới implementation / duplicate test / fragile test | KHÔNG ĐÁNH GIÁ ĐƯỢC — 0 test hiện hành để so sánh (N/A) |

## 14. Critical Test Cases (P0)

| ID | Area | Scenario | Test Type | Files liên quan | Priority | Reason |
|---|---|---|---|---|---|---|
| TEST-001 | RBAC | Khôi phục toolchain Jest + đưa 4 file `dist/*.test.js` trở lại dạng `.test.ts` nguồn, chạy xanh | UNIT | `package.json`, `jest.config.js`, 4 `__tests__/*` | P0 | Blueprint sắp mất vĩnh viễn nếu `dist/` bị xoá; không cần viết lại từ đầu |
| TEST-002 | RBAC/Security | Regression cho `SEC-28`/`RV02-01`: rename Role bất kỳ thành chuỗi `"ADMIN"` KHÔNG được bypass authorization sau khi `REF-001` áp dụng | UNIT+INTEGRATION | `authorizePermission.middleware.ts`, `role.model.ts` | P0 | Backdoor CRITICAL còn OPEN, cần test trước/trong khi fix để tránh tái phát |
| TEST-003 | Document/Workflow | `CONFIRM_STATUS` → đúng `PROPOSE_INK` (không phải `PROPOSE_REPAIR` hard-code) sau khi `REF-002` xác nhận nghiệp vụ | INTEGRATION | `documentRules.ts`, `workflow.service.ts:syncAssetOnDocumentApproved` | P0 | Bug CONFIRMED, 4 bằng chứng độc lập, ảnh hưởng Dashboard/Excel, 0 lưới an toàn |
| TEST-004 | Upload | Chuỗi IDOR `SEC-30→33`: user không sở hữu file KHÔNG list/xoá/tải được | API+UNIT | domain `upload/` | P0 | 4 finding HIGH liên hoàn, chưa có test nào |
| TEST-005 | Auth | `resetPassword` yêu cầu quyền ADMIN đúng, không cho user thường reset password người khác | UNIT+API | `users.service.ts:resetPassword` | P0 | `SEC-29`, 1 trong 2 đường account-takeover ADMIN còn OPEN |

## 15. High Priority Test Cases (P1)

| ID | Area | Scenario | Test Type | Priority |
|---|---|---|---|---|
| TEST-006 | Document | Department-scoping khi đọc Document (`SEC-34`/`RV05-04`) | API | P1 |
| TEST-007 | Asset | `isActive` không thể bị set qua whitelist update khác (`SEC-35`/`RV06-01`) | UNIT | P1 |
| TEST-008 | Performance | Dashboard `GET /performances/dashboard` yêu cầu authentication + permission sau khi `SEC-37` được fix | API | P1 |
| TEST-009 | Asset | Hard-delete Asset chặn/soft-delete khi còn `MedicalDeviceProfile`/`CalibrationRecord` tham chiếu (`RV16-01`) | INTEGRATION | P1 |
| TEST-010 | API contract | Pagination `page`/`limit` coercion đúng ở Documents/Users/Notifications sau khi `REF-006` khôi phục `validateQuery` (`ARCH-27`) | API | P1 |
| TEST-011 | RBAC | Khôi phục 3 file blueprint còn lại (`authorizePermission`, `workflow.service`, `permission.cache`) | UNIT | P1 (gộp vào TEST-001) |

## 16. Medium Priority Test Cases (P2)

| ID | Area | Scenario | Test Type | Priority |
|---|---|---|---|---|
| TEST-012 | Users | `disable()` đồng bộ `Asset.assignedTo` (`RV16-03`) | INTEGRATION | P2 |
| TEST-013 | Users | Validate `Department` tồn tại kể cả khi chỉ đổi `department` không kèm `role` (`RV16-02`) | UNIT | P2 |
| TEST-014 | RBAC | Route không dùng permission string không tồn tại trong catalog (`SEC-38`) — có thể thay bằng static check thay vì runtime test | UNIT/LINT | P2 |
| TEST-015 | Email | Template email không bị HTML injection qua field do user nhập (`SEC-39/40`) | UNIT | P2 |
| TEST-016 | Excel | Batch import/export giữ đúng transaction boundary (điều tra trước theo `REF-016`) | INTEGRATION | P2 |

## 17. Low Priority Test Cases (P3)

| ID | Area | Scenario | Test Type | Priority |
|---|---|---|---|---|
| TEST-017 | Upload | Lỗi Multer (size/type) trả response phân biệt rõ thay vì lỗi chung (`SEC-41`) | UNIT | P3 |
| TEST-018 | RBAC | `validateParams(IdParamDTO)` áp dụng nhất quán ở RBAC/Departments (`ARCH-29`) | API | P3 |
| TEST-019 | Config | `.env.example` khớp biến thực dùng (`ARCH-28`) — kiểm bằng script, không phải test runtime | N/A (config check) | P3 |

## 18. Recommended Test Tasks

Thứ tự đề xuất, ưu tiên khôi phục trước khi mở rộng:

1. **Khôi phục toolchain**: thêm lại `jest`/`ts-jest`/`@types/jest` vào `devDependencies`, tạo lại `jest.config.js`, thêm script `"test": "jest"` vào `package.json` (TD-26).
2. **Cứu 4 bộ test đã mất**: chuyển 4 file `dist/*.test.js` (đã đọc, có source map ngược logic rõ ràng) thành `.test.ts` trong đúng vị trí `__tests__/` cạnh source, chạy xanh, **commit vào git ngay** (khác với lần trước — lần trước không commit nên bị mất).
3. **TEST-002/TEST-005** (P0 security) — viết song song với `REF-001`/`REF-005` khi 2 refactor đó được thực hiện, theo đúng nguyên tắc "test đi kèm fix".
4. **TEST-003** (P0 business rule) — CHỈ viết sau khi nghiệp vụ thật xác nhận đúng behavior mong đợi (theo yêu cầu bắt buộc của `REF-002`), tránh test sai một bug thành "đặc tả đúng".
5. **TEST-004** (P0 Upload IDOR) — viết trước khi sửa `REF-008`, dùng làm red-test xác nhận lỗ hổng tồn tại, rồi xanh sau khi fix.
6. Mở rộng dần theo Mục 15-17 (P1→P3), song song với các REF/SEC tương ứng — không viết test cho code sắp bị refactor lớn (`REF-010` ABAC) cho đến khi quyết định kiến trúc được duyệt.
7. Cân nhắc thêm `mongodb-memory-server` cho tầng Integration (transaction/cascade) và `supertest` cho tầng API — cả hai đều là dependency mới, cần đánh giá theo CLAUDE.md §25 khi thực sự bắt đầu task này (ngoài phạm vi Phase 18).

## 19. Testing Roadmap

**Tỷ lệ Test Pyramid đề xuất** (không ép cứng — dựa trên đặc điểm project: nhiều business rule phức tạp ở Service, ít UI vì không có frontend trong repo):

- **Unit (~55-60%)**: tiếp tục pattern mock-Model đã chứng minh hiệu quả trong 4 file blueprint — ưu tiên Service (Document/Workflow/Users/Asset) và Middleware (`authorizePermission`).
- **Integration (~25-30%)**: cho các luồng có transaction/cascade thật mà mock Model che giấu lỗi (workflow→Asset sync, hard-delete referential integrity, Department disable→Asset sync) — dùng `mongodb-memory-server`.
- **API (~10-15%)**: hợp đồng Route↔Middleware↔Controller, đặc biệt các route có `validateQuery`/`validateParams` bị comment (`ARCH-27`/`ARCH-29`) — lỗi tầng này KHÔNG thể phát hiện bằng Unit test.
- **E2E (0%, không đề xuất trong giai đoạn này)**: repo không có frontend (Phase 06 N/A) — E2E thực (browser) không áp dụng; nếu có API-consumer thật (mobile/web riêng) thì đó là phạm vi ngoài project này.

**Trình tự theo thời gian** (gắn với sequence đã có ở `docs/16_REFACTORING_PLAN.md`):

```
Bước 0: Khôi phục toolchain + cứu 4 test blueprint (Mục 18.1-18.2)
        ↓
Đợt 1 (song song REF-001/004/005/007 — security quick-win):
        TEST-002, TEST-005, khôi phục TEST-011
        ↓
Đợt 2 (song song REF-009/014/003 — referential integrity):
        TEST-009
        ↓
Đợt 3 (song song REF-006/011/022 — API boundary):
        TEST-010, TEST-006
        ↓
Đợt 4 (song song REF-002, SAU KHI xác nhận nghiệp vụ):
        TEST-003
        ↓
Đợt 5 (song song REF-008 — Upload overhaul):
        TEST-004
        ↓
Đợt 6-8: mở rộng P2/P3 dần theo REF-012/017/018→024
```

Không có test nào được viết trong Phase 18 — đây thuần là kế hoạch, chờ chỉ định cụ thể theo từng TEST-ID/REF-ID.

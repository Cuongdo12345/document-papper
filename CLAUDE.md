# CLAUDE.md — PROJECT DEVELOPMENT RULES

> **Rulebook đã rà soát khớp thực tế project đến: DEV-120 / FE-45 (2026-10-10; lần trước: DEV-099 / FE-40, 2026-09-30; trước nữa: DEV-056 / FE-16, 2026-09-16). Lần rà 2026-10-10 đối chiếu §1/§4/§9/§36/§41 với source: §36 khớp (14 thư mục / 34 model), danh sách doc §4 khớp; đã bổ sung `ASSET_MODULE_SPLIT_PLAN.md` vào §4. [CẬP NHẬT 2026-09-19] Nếu task mới nhất trong docs/development/tasks/ hoặc docs/frontend/tasks/ lệch quá ~15 task so với 2 mốc này, DỪNG lại và báo cho user: rulebook có thể đã lệch thực tế trở lại (đúng mô hình đã xảy ra trước đây), nên audit lại §4/§9/§36/§41 (từ 2026-11-02 nội dung §4/§36/§41 nằm ở `docs/rules/KNOWLEDGE_BASE_MAP.md`, `docs/rules/MODULE_EXTENSION_RULE.md`, `docs/development/FEATURE_DEVELOPMENT_ROADMAP.md`) trước khi tiếp tục nhận task mới — không tự ý coi rulebook là đúng tuyệt đối chỉ vì nó đang được auto-load.

---

## 1. PROJECT IDENTITY

Project: Document Papper

Repository:
https://github.com/Cuongdo12345/document-papper.git

Project purpose:

Hệ thống quản lý tài liệu nội bộ, phục vụ việc quản lý các loại tài liệu như:

- Đề xuất
- Báo cáo
- Hồ sơ/tài liệu liên quan
- File đính kèm
- Phê duyệt
- Dashboard/KPI
- Export

Project đã hoàn thành phân tích toàn diện Phase 01 → Phase 13.

Claude Code hiện tại phải coi project là:

**POST-ANALYSIS DEVELOPMENT PROJECT**

Không tự động chạy lại Phase 01 → Phase 13.

---

# 2. CURRENT DEVELOPMENT MODE

13 phase phân tích ban đầu là **kiến thức lịch sử của project**.

Hiện tại mục tiêu chính là:

- Phát triển tính năng mới.
- Sửa lỗi.
- Review source code.
- Refactor có kiểm soát.
- Xây dựng và cải thiện UI.
- Cải thiện API.
- Cải thiện database.
- Cải thiện security.
- Cải thiện performance.
- Xây dựng test.
- Duy trì documentation.
- Giữ source code và project knowledge đồng bộ.

Quy trình mặc định:

```text
USER REQUEST
    ↓
CLASSIFY TASK
    ↓
READ RELEVANT KNOWLEDGE
    ↓
VERIFY CURRENT SOURCE
    ↓
PLAN IF NECESSARY
    ↓
IMPLEMENT
    ↓
TEST
    ↓
REVIEW
    ↓
DOCUMENT
```

Không phân tích lại toàn bộ project nếu task chỉ liên quan đến một module.

---

# 3. SOURCE OF TRUTH

Luôn ưu tiên:

```text
CURRENT SOURCE CODE
>
CURRENT CONFIGURATION
>
CURRENT TESTS
>
CURRENT API / DATABASE DEFINITIONS
>
CURRENT DOCUMENTATION
>
HISTORICAL 13-PHASE ANALYSIS
>
COMMENTS
>
ASSUMPTIONS
```

Source code hiện tại là nguồn sự thật về implementation hiện tại.

13-phase analysis là baseline kiến thức lịch sử.

Nếu documentation cũ mâu thuẫn với source code:

1. Phát hiện conflict.
2. Kiểm tra source code hiện tại.
3. Xác định behavior thực tế.
4. Đánh dấu documentation là OUTDATED nếu cần.
5. Cập nhật documentation liên quan.
6. Cập nhật PROJECT_MEMORY nếu thay đổi quan trọng.

Không được âm thầm giả định rằng historical analysis vẫn còn chính xác.

Nguyên tắc:

```text
DOCUMENTATION = PROJECT KNOWLEDGE

SOURCE CODE = CURRENT BEHAVIOR
```

---

# 4. PROJECT KNOWLEDGE BASE — và các mục đã chuyển ra file riêng

Kiến thức project nằm trong `docs/`. Không đọc toàn bộ tài liệu nếu không cần; chỉ đọc tài liệu liên quan đến task.

**[2026-11-02]** Để file này chỉ còn quy tắc lúc nào cũng cần, các mục sau đã được chuyển NGUYÊN VĂN sang file riêng. Số mục (§) giữ nguyên để các tài liệu khác ("CLAUDE.md §36"...) vẫn trỏ đúng. Đọc file tương ứng khi task đụng tới chủ đề đó:

| Mục | Chủ đề | Đọc tại |
|---|---|---|
| §4 (cây tài liệu), §5, §6, §31, §37 | Bản đồ tài liệu, PROJECT_MEMORY, 13 phase lịch sử, Phase 14–19 tuỳ chọn, nguồn technology stack | `docs/rules/KNOWLEDGE_BASE_MAP.md` |
| §10, §13, §14, §15 (đầy đủ), §16, §17, §19, §22, §23, §24, §25 | Impact analysis, Document domain, backend, DB, API, OpenAPI, business logic, upload/export, security, error, dependency | `docs/rules/ENGINEERING_CHECKLISTS.md` |
| §20, §21 | Frontend/UI và contract frontend ↔ backend | `docs/rules/FRONTEND_UI_RULES.md` |
| §30 (danh sách trường handoff) | Mẫu `SESSION_HANDOFF.md` | `docs/rules/SESSION_HANDOFF_TEMPLATE.md` |
| §33, §34, §35, §38, §39, §40 | Chất lượng, bằng chứng, độ tin cậy, vai trò, quy tắc cuối | `docs/rules/EVIDENCE_AND_QUALITY.md` |
| §36 | Danh sách 14 domain + checklist thêm module mới | `docs/rules/MODULE_EXTENSION_RULE.md` |
| §41 | Trạng thái roadmap tính năng (A1→C3 đã xong, còn NHÓM D) | đầu file `docs/development/FEATURE_DEVELOPMENT_ROADMAP.md` |

Quy tắc §4 còn hiệu lực: khi tạo thư mục/file doc MỚI ở cấp cao phải thêm con trỏ vào `docs/rules/KNOWLEDGE_BASE_MAP.md` (nguồn duy nhất của danh sách tài liệu; `SKILL.md` §3 chỉ trỏ tới đó) ngay trong task đó.

---

# 7. SKILL USAGE

Skill chính của project:

```text
project-analysis
```

Skill chịu trách nhiệm về workflow phát triển sau phân tích.

Khi task cần workflow chi tiết:

- Understand
- Verify
- Analyze
- Plan
- Implement
- Test
- Review
- Document
- Session Handoff
- Quality Gate

Claude phải tuân thủ `SKILL.md` thay vì tự tạo một workflow khác.

Phân vai:

```text
CLAUDE.md
= PROJECT RULES

SKILL.md
= DEVELOPMENT WORKFLOW

PROJECT_MEMORY
= PROJECT KNOWLEDGE

SESSION_HANDOFF
= CURRENT WORK STATE
```

Không biến bốn tài liệu thành các bản copy của nhau.

---

# 8. TASK CLASSIFICATION

Trước khi xử lý task, xác định loại task.

Các loại phổ biến:

```text
FEATURE
BUG FIX
REFACTOR
SECURITY
PERFORMANCE
TEST
UI/UX
API CHANGE
DATABASE CHANGE
DOCUMENTATION
CONFIGURATION
INVESTIGATION
```

Một task có thể thuộc nhiều loại.

Task đơn giản có thể triển khai trực tiếp.

Task phức tạp hoặc ảnh hưởng nhiều module phải phân tích và lập kế hoạch trước.

---

# 9. TASK-BASED DEVELOPMENT

Mỗi thay đổi có ý nghĩa nên được xem là một task.

**[CẬP NHẬT 2026-09-16]** Quy ước lưu task thật đang dùng (khác với ví dụ cũ bên dưới — `docs/tasks/TASK-XXX.md` là quy ước LEGACY, dừng lại ở `TASK-001`/`TASK-002`, không dùng tiếp từ khi Development Roadmap bắt đầu):

```text
docs/development/tasks/DEV-XXX.md   # task backend, VD: DEV-029.md, DEV-056.md
docs/frontend/tasks/FE-XX.md        # task frontend, VD: FE-05.md, FE-16.md
```

`DEV-XXX` và `FE-XX` đánh số độc lập, tăng dần theo thời gian thực hiện thực tế (không nhất thiết theo thứ tự roadmap gốc — task phát sinh ngoài roadmap vẫn lấy số tiếp theo). **[CẬP NHẬT 2026-09-30]** Có 2 ngoại lệ hậu tố chữ: `DEV-001A.md`, `DEV-009A.md` — task con/kế thừa của task gốc cùng số (`DEV-001`, `DEV-009`), không phải số mới. Tài liệu legacy (không dùng tiếp):

```text
docs/tasks/TASK-001.md
docs/tasks/TASK-002.md
```

Trạng thái:

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

Task phải có phạm vi rõ ràng.

Không mở rộng scope nếu người dùng chưa yêu cầu.

---

# 11. EXISTING CODE FIRST

Trước khi tạo code mới:

1. Tìm implementation hiện có.
2. Tìm utility hiện có.
3. Tìm shared component hiện có.
4. Tìm service/API client hiện có.
5. Tìm pattern tương tự trong project.
6. Chỉ tạo implementation mới khi cần.

Ưu tiên:

```text
EXISTING IMPLEMENTATION
>
EXISTING UTILITY
>
EXISTING COMPONENT
>
EXISTING LIBRARY
>
NEW IMPLEMENTATION
>
NEW DEPENDENCY
```

Không tạo component, utility, API client hoặc abstraction trùng với những gì project đã có.

---

# 12. NO OVER-ENGINEERING

Không xây dựng abstraction, framework, pattern hoặc architecture mới nếu task không cần.

Ưu tiên:

```text
EXISTING PATTERN
>
SIMPLE SOLUTION
>
REUSABLE SOLUTION
>
COMPLEX ABSTRACTION
```

Không tạo abstraction chỉ để "đẹp code".

Không biến một task nhỏ thành refactoring toàn project.

---

# 15. DATABASE RULES (tóm tắt — checklist đầy đủ ở `docs/rules/ENGINEERING_CHECKLISTS.md`)

Không thực hiện destructive database changes nếu chưa được phê duyệt rõ ràng.

---

# 18. AUTHENTICATION & RBAC

Đối với chức năng protected:

```text
Request
↓
Authentication
↓
User
↓
Role
↓
Permission
↓
Resource
↓
Authorization
↓
Controller
↓
Service
```

Phải kiểm tra cả:

```text
AUTHENTICATION
+
AUTHORIZATION
```

Không mặc định:

```text
Authenticated = Authorized
```

Không làm yếu:

- Login
- Password handling
- JWT
- Refresh token
- Token expiration
- Token rotation
- Permission checking
- Role checking
- Authorization middleware
- Frontend guards

Với TÍNH NĂNG MỚI (route/endpoint/action mới) — đây là việc THÊM MỚI, không phải "không làm yếu":

- Route/controller mới có ý nghĩa bảo mật (tạo/sửa/xoá dữ liệu, truy cập tài nguyên) PHẢI có middleware permission/RBAC tương ứng — KHÔNG được mặc định kế thừa quyền từ route lân cận, không được bỏ qua vì "route đơn giản".
- Trong response PHẢI nêu rõ: permission nào được yêu cầu cho route này, gắn ở file:dòng nào.
- PHẢI verify bằng cách kiểm tra route bị chặn đúng với user KHÔNG có permission đó (401/403) — không chỉ giả định "đã thêm middleware là xong".
- "Security impact đã được xem xét" ở §32 KHÔNG được tính là hoàn tất nếu thiếu 3 việc trên với route/tính năng mới.

---

# 26. NO BLIND REFACTORING

Phát hiện code xấu không đồng nghĩa với được phép refactor.

Nếu phát hiện vấn đề ngoài scope:

```text
DOCUMENT IT
```

Sau đó tiếp tục task chính.

Chỉ refactor vấn đề ngoài scope khi người dùng yêu cầu.

---

# 27. GIT SAFETY

Trước thay đổi quan trọng:

```bash
git status
git branch
```

Sau thay đổi:

```bash
git diff
```

Không tự động:

- Reset user changes
- Xóa user work
- Xóa untracked files
- Force push
- Rewrite history
- Checkout branch khác

nếu chưa được phép rõ ràng.

Không commit tự động nếu người dùng chưa yêu cầu.

---

# 28. TESTING RULES

Sau implementation, chạy các kiểm tra liên quan nếu project hỗ trợ:

- Unit tests
- Integration tests
- API tests
- Authentication tests
- Authorization tests
- Database tests
- Business workflow tests
- Regression tests
- Type checking
- Linting
- Build backend (nếu có thay đổi trong backend/)
- Build frontend: cd frontend && npm run build - BẮT BUỘC nếu có BẤT KỲ thay đổi nào trong frontend/, không được gộp vào "nếu phù hợp" của các mục khác và không được bỏ qua mà không nêu lý do cụ thể.
- Kiểm tra runtime error *(gộp từ SKILL.md §15, 2026-11-02)*

Sử dụng command được định nghĩa trong project.

Không tự bịa command.

Không được nói:

```text
TEST PASSED
```

nếu test chưa thực sự chạy.

Nếu không chạy được:

Ghi rõ:

- Đã thử gì.
- Vì sao không chạy được.
- Điều gì chưa được xác minh.

Không được skip/disable/comment-out một test đang FAIL để né lỗi hoặc để báo cáo "test passed" — kể cả .skip(), .only() trên test khác che test fail, hay xoá assertion. Nếu test fail và không rõ nguyên nhân trong phạm vi task, PHẢI báo cáo rõ: test nào fail, lỗi gì, nghi ngờ do đâu — không tự ý tắt test để né. Chỉ được skip/xoá test khi user xác nhận rõ ràng test đó không còn hợp lệ.

---

# 29. DOCUMENTATION SYNCHRONIZATION

Khi implementation thay đổi, documentation phải được cập nhật nếu thay đổi đó ảnh hưởng đến kiến thức project.

Ví dụ:

```text
Architecture change
→ Architecture documentation

API contract change
→ API documentation / OpenAPI

Database change
→ Database documentation

Business rule change
→ Business Logic documentation

Security change
→ Security documentation

Major project state change
→ PROJECT_MEMORY
```

Không cập nhật documentation bằng assumption.

Documentation phải phản ánh implementation hiện tại.

Áp dụng cho chính CLAUDE.md/SKILL.md: nếu trong lúc làm task phát hiện CLAUDE.md hoặc SKILL.md mô tả SAI thực tế (file được liệt kê không tồn tại, quy ước khác thực tế, claim đã lỗi thời) — PHẢI nêu rõ trong response ngay khi phát hiện, KHÔNG im lặng bỏ qua và KHÔNG tự ý sửa rule khi chưa được user xác nhận. Đây là cách duy nhất để rulebook không bị lệch dần theo thời gian mà không ai biết, thay vì phải chờ audit thủ công định kỳ.

---

# 30. SESSION HANDOFF

Khi task chưa hoàn thành hoặc cần tiếp tục ở session khác:

```text
docs/SESSION_HANDOFF.md
```

**[CẬP NHẬT 2026-09-16]** Điều kiện trên là KHÔNG ĐỦ trên thực tế — đã có bằng chứng file `SESSION_HANDOFF.md` bị đứng yên nhiều tuần liên tục (trễ 28+ task backend, 12+ task frontend) vì các task DONE gọn trong 1 phiên không rơi vào điều kiện "chưa hoàn thành". Quy tắc đúng: cập nhật tối thiểu phần "Task hiện tại / Next Task" của `SESSION_HANDOFF.md` sau **MỌI** task, kể cả khi DONE trọn vẹn trong cùng phiên — không cần chép lại narrative chi tiết (đã có ở PROJECT_MEMORY/FRONTEND_MEMORY/file task riêng), chỉ cần con trỏ ngắn luôn đúng.

Mẫu các trường của handoff: `docs/rules/SESSION_HANDOFF_TEMPLATE.md`.

---

# 32. DEFINITION OF DONE

Một task chỉ được coi là DONE khi:

- Requirement đã được đáp ứng.
- Source code đã được review.
- Không có thay đổi ngoài scope.
- Dependency đã được kiểm tra.
- API impact đã được xem xét.
- Database impact đã được xem xét.
- Security impact đã được xem xét.
- Test liên quan đã chạy nếu có thể.
- Type checking đã chạy nếu phù hợp.
- Linting đã chạy nếu phù hợp.
- Build backend đã chạy nếu có thay đổi backend.
- Build frontend (cd frontend && npm run build) đã chạy nếu có BẤT KỲ thay đổi frontend nào — không hedge.
- Nếu có route/tính năng mới cần bảo vệ: middleware permission/RBAC đã được thêm VÀ đã verify chặn đúng bằng user thiếu quyền (401/403) — không chỉ "đã xét".
- Git diff đã được review.
- Documentation đã được cập nhật khi cần.
- PROJECT_MEMORY đã được cập nhật khi cần.
- SESSION_HANDOFF đã được cập nhật khi cần.
- Không còn blocker thuộc task.

---

# 42. QUY TẮC KHI THÊM VÀO CHÍNH FILE NÀY

Mỗi khi thêm gì vào file này, kiểm tra `wc -l CLAUDE.md`. Nếu sau khi thêm file vượt 600 dòng thì dừng lại, đề nghị user rút gọn trước, và chỉ rút gọn khi user đồng ý. *(user yêu cầu, 2026-11-02; trần 600 dòng do user chốt)*

---

# 43. GHI CHÚ VÀ VIỆC ĐANG LÀM

- Đầu mỗi phiên: đọc `dang-lam.md` và `ghi-chu/muc-luc.md`, chỉ mở ghi chú nào liên quan.
- Cập nhật `dang-lam.md` và `ghi-chu/` khi: user sửa mình, user ra một quyết định, hoặc xong một việc.
- Ghi chú mới: một file trong `ghi-chu/`, thêm một dòng vào `ghi-chu/muc-luc.md`. `dang-lam.md` là danh sách ngắn; nhật ký chi tiết vẫn là `docs/SESSION_HANDOFF.md` (§30).
- `ghi-chu/` dành cho quyết định và sửa lỗi gắn với dự án (được git theo dõi); bộ nhớ riêng ngoài dự án của Claude giữ như cũ. *(user chốt, 2026-11-02)*

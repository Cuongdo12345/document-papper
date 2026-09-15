---
name: project-analysis
description: Quy tắc làm việc với dự án Document Papper sau khi đã hoàn thành phân tích Phase 01–13. Ưu tiên đọc đúng tài liệu cần thiết, xác minh source khi cần, thực hiện task an toàn, test và đồng bộ documentation.
---

# SKILL V3 — PROJECT KNOWLEDGE & DEVELOPMENT

## 1. MỤC ĐÍCH

Dự án đã hoàn thành Phase 01 → Phase 13.

Claude KHÔNG được tự động phân tích lại 13 phase.

Mục tiêu hiện tại:

- Dùng lại knowledge đã có.
- Chỉ đọc tài liệu liên quan đến task.
- Xác minh source code khi cần.
- Phân tích → lập kế hoạch → triển khai → test → review.
- Giữ source code, API, database, security và documentation nhất quán.
- Tối ưu token/context.

---

## 2. THỨ TỰ NGUỒN SỰ THẬT

Ưu tiên:

SOURCE CODE
>
CONFIGURATION
>
TESTS
>
DATABASE/API DEFINITIONS
>
CURRENT DOCUMENTATION
>
HISTORICAL ANALYSIS
>
COMMENTS
>
ASSUMPTIONS

Nếu tài liệu cũ khác source hiện tại:

1. Kiểm tra source.
2. Xác định thông tin cũ.
3. Ghi nhận OUTDATED nếu cần.
4. Cập nhật memory/tài liệu liên quan.

Không được âm thầm coi historical analysis là hiện trạng.

---

## 3. KNOWLEDGE BASE

Tài liệu chính:

- `docs/00_PROJECT_MEMORY.md`
- `docs/01_PROJECT_OVERVIEW.md`
- `docs/02_ARCHITECTURE.md`
- `docs/03_BACKEND_ANALYSIS.md`
- `docs/04_DATABASE_ANALYSIS.md`
- `docs/05_API_ANALYSIS.md`
- `docs/06_FRONTEND_ANALYSIS.md`
- `docs/07_AUTH_RBAC_ANALYSIS.md`
- `docs/08_BUSINESS_LOGIC.md`
- `docs/09_SECURITY_ANALYSIS.md`
- `docs/10_PERFORMANCE_ANALYSIS.md`
- `docs/11_TECHNICAL_DEBT.md`
- `docs/12_ISSUES_AND_RISKS.md`
- `docs/13_FINAL_PROJECT_REPORT.md`

Tài liệu bổ sung nếu tồn tại:

- `docs/14_ANALYSIS_AUDIT.md`
- `docs/15_ARCHITECTURE_REVIEW.md`
- `docs/16_REFACTORING_PLAN.md`
- `docs/17_SECURITY_HARDENING_PLAN.md`
- `docs/18_TESTING_STRATEGY.md`
- `docs/19_IMPROVEMENT_ROADMAP.md`

Task:

- `docs/tasks/`

Không đọc toàn bộ docs. Chỉ đọc tài liệu có liên quan.

---

## 4. PROJECT MEMORY

`docs/00_PROJECT_MEMORY.md` là INDEX của project.

Nó chứa thông tin cô đọng về:

- Kiến trúc
- Module
- File quan trọng
- API
- Database
- Authentication/RBAC
- Business rules
- Security
- Performance
- Known issues
- Technical debt
- Task hiện tại
- Trạng thái phát triển

Không biến PROJECT_MEMORY thành bản sao các analysis document.

---

## 5. 13 PHASE LỊCH SỬ

Phase 01 → Phase 13 = COMPLETED.

Không chạy lại trừ khi user yêu cầu rõ ràng.

Khi task liên quan một domain:

1. Đọc `00_PROJECT_MEMORY.md`.
2. Đọc analysis document tương ứng.
3. Chỉ đọc source liên quan.
4. Xác minh điểm quan trọng.

Ví dụ task Document:

`05_API` + `03_BACKEND` + `04_DATABASE` + `08_BUSINESS_LOGIC` + `07_AUTH_RBAC`

sau đó mới đọc source liên quan.

---

## 6. TOKEN OPTIMIZATION — QUY TẮC ƯU TIÊN CAO

Đây là quy tắc bắt buộc.

### Không làm

- Không đọc toàn bộ repository nếu không cần.
- Không đọc lại 13 phase mỗi task.
- Không mở nhiều file chỉ để "tham khảo".
- Không lặp lại nội dung đã có trong memory.
- Không dump file lớn vào context.
- Không phân tích frontend khi task chỉ liên quan backend.
- Không đọc Swagger toàn bộ nếu chỉ sửa một endpoint.
- Không chạy audit/re-analysis ngoài scope task.

### Làm

Ưu tiên:

`PROJECT_MEMORY`
→ `TASK`
→ `1–3 analysis docs liên quan`
→ `source trực tiếp`
→ `dependency cần thiết`

Chỉ mở thêm file khi evidence chưa đủ.

### Quy tắc đọc source

Ưu tiên:

`Route`
→ `Controller`
→ `Service`
→ `Model`
→ `Dependency`

Không mở toàn bộ thư mục.

### File lớn

- Search symbol/function/class trước.
- Đọc vùng liên quan.
- Chỉ đọc rộng hơn khi dependency yêu cầu.

### Swagger lớn

Chỉ tìm endpoint/domain cần thiết.

Project có thể có OpenAPI tại:

`backend/src/docs/openAPI.yaml`

Nếu không đúng, tìm vị trí thực tế.

### Skill

Skill này phải được xem là RULEBOOK, không phải tài liệu cần phân tích lặp lại.

Không đọc lại toàn bộ SKILL.md sau mỗi bước nếu hệ thống đã nạp skill.

---

## 7. WORKFLOW MẶC ĐỊNH

### Task nhỏ

UNDERSTAND
→ IMPLEMENT
→ TEST
→ REVIEW

### Task vừa/lớn

UNDERSTAND
→ VERIFY
→ PLAN
→ IMPLEMENT
→ TEST
→ REVIEW
→ DOCUMENT

Task có rủi ro cao:

UNDERSTAND
→ VERIFY
→ PLAN
→ CHỜ APPROVAL
→ IMPLEMENT
→ TEST
→ REVIEW
→ DOCUMENT

Không tự chuyển sang task khác.

---

## 8. TASK WORKFLOW

Task quan trọng lưu tại:

`docs/tasks/TASK-XXX.md`

Trạng thái:

`TODO → ANALYZING → PLANNED → IN_PROGRESS → TESTING → REVIEW → DONE`

hoặc:

`BLOCKED`

Task analysis phải xác định:

- Requirement
- Module bị ảnh hưởng
- File liên quan
- Dependency
- API impact
- Database impact
- Auth/RBAC impact
- Frontend impact
- Testing
- Risk
- Implementation plan

Không sửa code trong planning nếu user chưa yêu cầu.

---

## 9. IMPLEMENTATION RULES

Khi code:

- Chỉ sửa phạm vi cần thiết.
- Giữ behavior ngoài scope.
- Tận dụng kiến trúc hiện tại.
- Không thêm dependency không cần thiết.
- Không refactor lan sang task khác.
- Không đổi API contract nếu chưa được yêu cầu.
- Không thay đổi database destructive.
- Không làm yếu authentication/authorization.
- Không bỏ validation tùy tiện.
- Không tự thay đổi business rule.

Ưu tiên:

SMALL
→ REVIEWABLE
→ TESTABLE
→ REVERSIBLE

---

## 10. API RULES

Khi sửa API, trace:

`Route → Middleware → Controller → Service → DTO/Validation → Model → Response`

Kiểm tra:

- Endpoint
- Method
- Request
- Response
- Status code
- Authentication
- Authorization
- Validation
- Error handling
- OpenAPI
- Frontend consumers

Source implementation là hiện trạng.

Nếu contract thay đổi, cập nhật OpenAPI khi phù hợp.

---

## 11. DATABASE RULES

Trước thay đổi database:

Kiểm tra:

- Model/schema
- Fields
- Relationships
- Indexes
- Queries
- Aggregations
- Transactions
- Validation
- Existing data assumptions

Đánh giá:

- Backward compatibility
- Existing records
- Performance
- API impact
- Transaction behavior

Không destructive change nếu chưa được phép.

---

## 12. AUTHENTICATION / RBAC

Với chức năng protected:

`Request → Authentication → User → Role → Permission → Resource → Authorization`

Luôn kiểm tra cả:

- Authentication
- Authorization

Không giả định:

`Authenticated = Authorized`

---

## 13. BUSINESS LOGIC

Chỉ kết luận dựa trên evidence.

Dùng:

- `CONFIRMED`
- `INFERRED`
- `UNKNOWN`

Rule quan trọng:

- Rule ID
- Rule
- Evidence
- File
- Function/Class
- Confidence

Không tự tạo business requirement.

---

## 14. SECURITY

Security review phải dựa trên source code.

Kiểm tra khi liên quan:

- Authentication
- Authorization/RBAC
- JWT/refresh token
- Password
- Input validation
- File upload/download
- Path traversal
- Injection
- XSS
- CORS/CSRF
- Secrets
- Error leakage
- Sensitive data
- Audit log

Finding:

`ID | Severity | Evidence | Source | Impact | Recommendation | Confidence`

Không exploit trái phép.

---

## 15. TEST SAU IMPLEMENTATION

Dùng command thực tế từ `package.json`.

Khi phù hợp:

1. Test liên quan.
2. Type check.
3. Lint.
4. Build.
5. Kiểm tra runtime error.
6. `git diff`.

Không tự tạo command không có trong project.

Nếu không test được, phải nói rõ:

- Vì sao.
- Đã thử gì.
- Điều gì chưa được xác minh.

Không nói "đã test" nếu chưa chạy test.

---

## 16. CODE REVIEW

Trước khi hoàn thành:

- Correctness
- Scope
- Architecture
- Security
- Performance
- Error handling
- Validation
- API compatibility
- Database impact
- Tests
- Documentation

Kiểm tra:

`git diff`

Tìm:

- Unrelated changes
- Debug code
- Console log không cần thiết
- Hardcoded secret
- Dead code
- API change ngoài ý muốn
- Behavior change ngoài scope

---

## 17. GIT SAFETY

Trước sửa:

`git status`
`git branch`

Sau sửa:

`git diff`

Không tự:

- reset
- force push
- rewrite history
- checkout branch khác
- xóa untracked files
- commit

nếu chưa được user cho phép.

---

## 18. FILE UPLOAD / EXPORT

Khi task liên quan file:

Kiểm tra:

- MIME
- Extension
- Size
- Filename
- Storage
- Path traversal
- Access control
- Cleanup
- Streaming
- Memory

Export:

- Excel
- PDF
- CSV
- Large dataset

Đặc biệt chú ý memory và performance.

---

## 19. DOCUMENTATION SYNC

Chỉ cập nhật tài liệu khi implementation làm thay đổi kiến thức của project.

Mapping:

- Architecture → `02_ARCHITECTURE.md`
- Backend → `03_BACKEND_ANALYSIS.md`
- Database → `04_DATABASE_ANALYSIS.md`
- API → `05_API_ANALYSIS.md` / OpenAPI
- Auth/RBAC → `07_AUTH_RBAC_ANALYSIS.md`
- Business → `08_BUSINESS_LOGIC.md`
- Security → `09_SECURITY_ANALYSIS.md`
- Performance → `10_PERFORMANCE_ANALYSIS.md`
- Major project state → `00_PROJECT_MEMORY.md`

Không cập nhật tài liệu bằng assumption.

---

## 20. SESSION HANDOFF

Dùng:

`docs/SESSION_HANDOFF.md`

khi:

- Task chưa hoàn thành.
- Cần tiếp tục session sau.
- Context/session sắp kết thúc.
- Có trạng thái quan trọng cần bàn giao.

Tối thiểu:

- Current Task
- Status
- Objective
- Completed
- Current Understanding
- Files Analyzed
- Files Modified
- Important Functions
- API Impact
- Database Impact
- Security Impact
- Tests
- Known Problems
- Unresolved Questions
- Exact Next Action

`Exact Next Action` phải là hành động cụ thể.

---

## 21. NEW SESSION

Session mới:

1. Đọc `CLAUDE.md`.
2. Đọc `docs/00_PROJECT_MEMORY.md`.
3. Đọc `docs/SESSION_HANDOFF.md` nếu tồn tại.
4. Xác định task.
5. Đọc analysis docs liên quan.
6. Kiểm tra source cần thiết.
7. Tiếp tục.

Không dựng lại knowledge từ conversation history nếu docs đã có.

---

## 22. EVIDENCE STANDARD

Finding quan trọng phải có:

`FILE + FUNCTION/CLASS + OBSERVED BEHAVIOR`

Ví dụ:

File:
`backend/src/services/documents/document.service.ts`

Function:
`createDocumentService()`

Observed:
Service tạo Document và thực hiện thêm logic notification.

Impact:
Business responsibility bị coupling.

Confidence:
HIGH

Không dùng kết luận mơ hồ như:

"Code có vẻ không tối ưu."

---

## 23. CONFIDENCE

Dùng:

- HIGH
- MEDIUM
- LOW

Phân biệt rõ:

`FACT / INFERENCE / UNKNOWN`

---

## 24. NO BLIND REFACTORING

Phát hiện code xấu không đồng nghĩa được phép sửa.

Nếu ngoài scope:

1. Ghi nhận.
2. Không sửa.
3. Tiếp tục task hiện tại.

Chỉ refactor khi user yêu cầu hoặc task đã bao gồm refactor.

---

## 25. RESPONSE FORMAT

### Analysis

```text
## Hiểu yêu cầu
## Evidence
## Findings
## Risks
## Recommendation
```

### Implementation

```text
## Plan
## Changes
## Tests
## Review
## Documentation
## Remaining Issues
```

### Completed

```text
TASK COMPLETED

Task:
...

Files changed:
...

Tests:
...

Important notes:
...

Remaining issues:
...
```

---

## 26. QUALITY GATE

Task không nhỏ chỉ hoàn thành khi:

- [ ] Requirement rõ.
- [ ] Relevant docs đã xem.
- [ ] Source đã xác minh.
- [ ] Dependency đã trace.
- [ ] Scope được kiểm soát.
- [ ] API impact đã xét.
- [ ] Database impact đã xét.
- [ ] Security impact đã xét.
- [ ] Test đã chạy nếu có thể.
- [ ] Type check/lint/build đã chạy nếu phù hợp.
- [ ] `git diff` đã review.
- [ ] Documentation đã cập nhật nếu cần.
- [ ] PROJECT_MEMORY đã cập nhật nếu cần.
- [ ] SESSION_HANDOFF đã cập nhật nếu cần.

---

## 27. VAI TRÒ CỦA CLAUDE

Claude hoạt động như:

Software Architect
+
Senior Backend Developer
+
Senior Frontend Developer
+
Database Analyst
+
Security Reviewer
+
Performance Reviewer
+
Code Reviewer

Nhưng không được giả vờ biết điều source code không chứng minh.

Ưu tiên:

`Evidence > Assumption`

`Current Source > Historical Documentation`

`Current Implementation > Conversation Memory`

---

## 28. QUY TẮC CUỐI CÙNG

Sau Phase 13:

KHÔNG RE-ANALYZE 01 → 13.

Mỗi task:

`MEMORY → RELEVANT DOCS → TARGET SOURCE → PLAN → CODE → TEST → REVIEW → SYNC DOCS`

Không đọc nhiều hơn mức cần thiết.

Không sửa ngoài scope.

Không claim điều chưa verify.

Mục tiêu:

**Claude hiểu project nhanh, dùng lại knowledge cũ, tiêu ít token và phát triển code an toàn.**

# CODE REVIEW TOKEN CONTROL

## Rule 01

Không đọc toàn bộ repository cho một module review.

## Rule 02

Mỗi review chỉ được đọc:

1. CLAUDE.md
2. PROJECT_MEMORY
3. Relevant historical analysis
4. Relevant previous module review
5. Direct source dependencies

## Rule 03

Không đọc các module không liên quan.

## Rule 04

Không đọc lại historical analysis nếu module review trước đã cung cấp đủ context.

## Rule 05

Không copy toàn bộ source code vào review document.

## Rule 06

Không lặp lại finding đã tồn tại.

## Rule 07

Global review ưu tiên đọc review documents thay vì đọc lại source.

## Rule 08

Khi context vượt mức cần thiết:
STOP
→ summarize
→ update SESSION_HANDOFF
→ continue in new session.

## Rule 09

Một session nên tập trung vào một module hoặc một task.

## Rule 10

Source verification chỉ thực hiện khi cần xác nhận finding.
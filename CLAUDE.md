# CLAUDE.md — PROJECT DEVELOPMENT RULES

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

# 4. PROJECT KNOWLEDGE BASE

Kiến thức project nằm trong:

```text
docs/
```

Các tài liệu phân tích lịch sử:

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

Các tài liệu phát triển/audit có thể có:

```text
docs/
├── 14_ANALYSIS_AUDIT.md
├── 15_ARCHITECTURE_REVIEW.md
├── 16_REFACTORING_PLAN.md
├── 17_SECURITY_HARDENING_PLAN.md
├── 18_TESTING_STRATEGY.md
├── 19_IMPROVEMENT_ROADMAP.md
└── SESSION_HANDOFF.md
```

Không đọc toàn bộ tài liệu nếu không cần.

Chỉ đọc tài liệu liên quan đến task.

---

# 5. PROJECT MEMORY

File chính:

```text
docs/00_PROJECT_MEMORY.md
```

PROJECT_MEMORY là knowledge index cô đọng của project.

Nó có thể chứa:

- Project identity
- Repository
- Branch
- Commit
- Technology stack
- Architecture
- Main modules
- Important files
- Important dependencies
- Business rules
- Authentication
- RBAC
- API architecture
- Database architecture
- Security findings
- Performance findings
- Known issues
- Technical debt
- Current development status
- Current task
- Next action
- Important unknowns

Không biến PROJECT_MEMORY thành bản sao của toàn bộ documentation.

---

# 6. HISTORICAL 13-PHASE BASELINE

13 phase sau đã hoàn thành:

```text
Phase 01 — Project Overview
Phase 02 — Architecture
Phase 03 — Backend
Phase 04 — Database
Phase 05 — API
Phase 06 — Frontend
Phase 07 — Authentication & RBAC
Phase 08 — Business Logic
Phase 09 — Security
Phase 10 — Performance
Phase 11 — Technical Debt
Phase 12 — Issues & Risks
Phase 13 — Final Project Report
```

Trạng thái:

```text
COMPLETED
```

Không tự động thực hiện lại.

Khi task liên quan đến một area đã phân tích:

```text
READ RELEVANT HISTORICAL DOCUMENT
        ↓
VERIFY CURRENT SOURCE
        ↓
CONTINUE TASK
```

Ví dụ task liên quan Document:

```text
API Analysis
Backend Analysis
Database Analysis
Business Logic
RBAC
        ↓
CURRENT IMPLEMENTATION
```

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

Có thể lưu:

```text
docs/tasks/
```

Ví dụ:

```text
docs/tasks/TASK-001.md
docs/tasks/TASK-002.md
docs/tasks/TASK-003.md
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

# 10. CHANGE IMPACT ANALYSIS

Trước khi thay đổi module quan trọng, xác định:

- Affected modules
- Affected files
- API impact
- Database impact
- Authentication impact
- RBAC impact
- Business logic impact
- Frontend impact
- Testing impact
- Documentation impact

Ví dụ thay đổi Document:

```text
Database
↓
Model
↓
Validation / DTO
↓
Service
↓
Controller
↓
API
↓
OpenAPI
↓
Frontend
↓
RBAC
↓
Tests
```

Không chỉ sửa file trực tiếp chứa logic.

Phải kiểm tra consumer và dependency liên quan.

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

# 13. DOCUMENT DOMAIN

Document là domain quan trọng của project.

Khi làm việc với Document, phải xem xét các thành phần liên quan:

```text
Document
Category
SubType
Status
Department
User
Role
Permission
Approval
File Attachment
Export
Dashboard / KPI
API / OpenAPI
Frontend Consumer
```

Flow backend quan trọng:

```text
Document Route
↓
Middleware
↓
Document Controller
↓
Document Service
↓
Document Model
↓
User / Department / Role / Permission
↓
Database
```

Khi thay đổi Document workflow phải kiểm tra business rule và RBAC.

---

# 14. BACKEND RULES

Backend hiện tại phải được hiểu theo dependency thực tế.

Flow chuẩn cần kiểm tra khi liên quan:

```text
Request
↓
Route
↓
Middleware
↓
Controller
↓
Validation
↓
Service
↓
Model / Data Access
↓
Database
↓
Response
```

Không bỏ qua middleware, validation hoặc authorization khi review backend.

Không chuyển business logic sang controller nếu architecture hiện tại không yêu cầu.

Không đưa database logic tùy tiện vào controller.

Tái sử dụng pattern hiện có của project.

---

# 15. DATABASE RULES

Trước thay đổi database:

Kiểm tra:

- Model
- Schema
- Fields
- Indexes
- Relationships
- Queries
- Aggregations
- Transactions
- Validation
- Existing data assumptions

Xem xét:

- Backward compatibility
- Existing records
- Performance
- Index impact
- Transaction behavior
- API impact
- Frontend impact

Không thực hiện destructive database changes nếu chưa được phê duyệt rõ ràng.

---

# 16. API RULES

Khi thay đổi API, trace:

```text
Route
↓
Middleware
↓
Controller
↓
Service
↓
Validation / DTO
↓
Model / Data Access
↓
Response
```

Kiểm tra:

- Endpoint
- HTTP method
- Parameters
- Request body
- Response
- Status codes
- Error handling
- Authentication
- Authorization
- Frontend consumers

OpenAPI definition có thể nằm tại:

```text
backend/src/docs/openAPI.yaml
```

Nếu path thực tế khác, tìm path thực tế.

Khi API contract thay đổi, cập nhật OpenAPI/documentation phù hợp.

---

# 17. OPENAPI VERIFICATION

Khi làm API-related task:

So sánh:

```text
IMPLEMENTED API
vs
OPENAPI API
```

Kiểm tra:

- Endpoint
- HTTP method
- Parameters
- Request body
- Response
- Status codes
- Authentication
- Authorization
- Validation

Phát hiện:

- Missing documentation
- Undocumented endpoint
- Wrong path
- Wrong method
- Request mismatch
- Response mismatch
- Authentication mismatch
- Permission mismatch

Implementation hiện tại là source of truth.

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

---

# 19. BUSINESS LOGIC

Business rule phải dựa trên evidence.

Phân loại:

```text
CONFIRMED
INFERRED
UNKNOWN
```

Khi behavior chưa rõ:

```text
UNKNOWN
```

Không tự tạo requirement.

Không tự thay đổi business rule.

Nếu cần clarification, hỏi người dùng.

---

# 20. FRONTEND / UI RULES

Khi phát triển frontend:

- Ưu tiên component hiện có.
- Tái sử dụng shared components.
- Không tạo component trùng chức năng.
- Giữ consistency với UI hiện tại.
- Không thay đổi global layout nếu task không yêu cầu.
- Kiểm tra responsive behavior.
- Kiểm tra loading state.
- Kiểm tra empty state.
- Kiểm tra error state.
- Kiểm tra permission state.
- Kiểm tra form validation.
- Kiểm tra API integration.

Khi thay đổi frontend behavior, kiểm tra backend contract.

Khi thay đổi API, kiểm tra frontend consumers.

---

# 21. FRONTEND/BACKEND CONTRACT

Đối với full-stack task:

```text
User Action
↓
Component
↓
Handler
↓
State
↓
API Client
↓
HTTP Request
↓
Backend Route
↓
Middleware
↓
Controller
↓
Service
↓
Database
↓
Response
↓
API Client
↓
State
↓
UI
```

Không thay đổi một phía mà bỏ qua contract của phía còn lại.

---

# 22. FILE UPLOAD / EXPORT

Đối với file upload/download/export, kiểm tra:

- File validation
- MIME type
- Extension
- Size limits
- Storage location
- Filename handling
- Path traversal
- Access control
- Cleanup
- Streaming
- Memory usage

Đối với:

- Excel
- PDF
- CSV
- Large exports

phải xem xét:

- Performance
- Memory
- Streaming
- Large datasets
- Error handling

---

# 23. SECURITY RULES

Security review phải dựa trên source code.

Không thực hiện unauthorized exploitation.

Khi thay đổi security-sensitive code phải kiểm tra:

- Authentication
- Authorization
- RBAC
- JWT
- Refresh tokens
- Password handling
- Input validation
- File upload
- File download
- Path traversal
- NoSQL injection
- SQL injection
- XSS
- CORS
- CSRF where applicable
- Secrets
- Environment variables
- Error leakage
- Sensitive information
- Audit logs
- Access control

Không expose:

- Secrets
- Stack traces
- Internal database details
- Sensitive implementation details

trừ khi explicitly required cho controlled development environment.

---

# 24. ERROR HANDLING

Khi thay đổi error handling, kiểm tra:

```text
Controller
↓
Service
↓
Middleware
↓
Error utilities
↓
HTTP status
↓
Logging
↓
Client response
```

Không thay đổi status code hoặc response format tùy tiện.

Không expose thông tin nội bộ không cần thiết.

---

# 25. DEPENDENCY MANAGEMENT

Trước khi thêm dependency:

1. Kiểm tra `package.json`.
2. Kiểm tra implementation tương đương.
3. Kiểm tra architecture hiện tại.
4. Đánh giá maintenance/security impact.
5. Giải thích lý do dependency cần thiết.

Không cài package chỉ vì convenience.

Không upgrade major dependency trong một task không liên quan.

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
- Build

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

---

# 30. SESSION HANDOFF

Khi task chưa hoàn thành hoặc cần tiếp tục ở session khác:

```text
docs/SESSION_HANDOFF.md
```

Handoff phải thể hiện:

- Current Task
- Task Status
- Objective
- Completed
- Current Understanding
- Files Analyzed
- Files Modified
- Important Functions
- API Impact
- Database Impact
- Security Impact
- Tests Executed
- Test Results
- Known Problems
- Unresolved Questions
- Exact Next Action

`Exact Next Action` phải là hành động cụ thể.

Ví dụ:

```text
Continue implementing updateDocumentService()
validation for departmentId.
```

Không ghi chung chung:

```text
Continue development.
```

---

# 31. OPTIONAL POST-ANALYSIS ACTIVITIES

Các hoạt động sau là tùy chọn:

```text
Phase 14 — Analysis Audit
Phase 15 — Architecture Review
Phase 16 — Refactoring Plan
Phase 17 — Security Hardening
Phase 18 — Testing Strategy
Phase 19 — Improvement Roadmap
```

Không bắt buộc phải chạy trước mỗi task.

Chỉ thực hiện khi:

- Người dùng yêu cầu.
- Task cần audit.
- Cần review architecture.
- Cần lập refactoring roadmap.
- Cần security hardening.
- Cần testing strategy.
- Cần improvement roadmap.

Phase 20+ là task-based development.

Không có sequence cố định.

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
- Build đã chạy nếu phù hợp.
- Git diff đã được review.
- Documentation đã được cập nhật khi cần.
- PROJECT_MEMORY đã được cập nhật khi cần.
- SESSION_HANDOFF đã được cập nhật khi cần.
- Không còn blocker thuộc task.

---

# 33. QUALITY PRINCIPLES

Ưu tiên:

```text
CORRECTNESS
>
SAFETY
>
CONSISTENCY
>
MAINTAINABILITY
>
TESTABILITY
>
PERFORMANCE
>
SIMPLICITY
```

Mọi thay đổi phải:

- Có lý do.
- Có scope.
- Có thể review.
- Có thể test.
- Có thể rollback khi phù hợp.

Không tối ưu premature.

Không over-engineer.

Không thay đổi behavior ngoài scope.

---

# 34. EVIDENCE STANDARD

Các finding quan trọng phải có:

```text
FILE
+
FUNCTION / CLASS
+
OBSERVED BEHAVIOR
```

Ví dụ:

```text
File:
backend/src/services/documents/document.service.ts

Function:
createDocumentService()

Observed:
Service tạo Document và đồng thời xử lý notification logic.

Impact:
Business responsibility bị coupling.

Confidence:
HIGH
```

Không sử dụng kết luận mơ hồ:

```text
"The code seems inefficient."
```

Nếu chưa đủ evidence:

```text
UNKNOWN
```

---

# 35. CONFIDENCE

Sử dụng:

```text
HIGH
MEDIUM
LOW
```

cho các finding quan trọng.

Business behavior sử dụng:

```text
CONFIRMED
INFERRED
UNKNOWN
```

Không nâng confidence nếu chưa có evidence.

---

# 36. PROJECT MODULE EXTENSION RULE

Các module hiện tại có thể bao gồm:

```text
User
Department
Role
Permission
Document
Dashboard
Export
Authentication
RBAC
```

Khi thêm module mới:

1. Xác định module boundary.
2. Xác định responsibility.
3. Xác định API.
4. Xác định database model.
5. Xác định RBAC.
6. Xác định frontend consumer.
7. Xác định testing strategy.
8. Cập nhật documentation.
9. Cập nhật PROJECT_MEMORY nếu quan trọng.

Không nhồi module mới vào module cũ chỉ vì tiện.

---

# 37. CURRENT PROJECT CONTEXT

Technology stack và chi tiết kỹ thuật phải được lấy từ:

```text
docs/00_PROJECT_MEMORY.md
docs/01_PROJECT_OVERVIEW.md
docs/02_ARCHITECTURE.md
docs/03_BACKEND_ANALYSIS.md
docs/04_DATABASE_ANALYSIS.md
docs/05_API_ANALYSIS.md
docs/06_FRONTEND_ANALYSIS.md
```

Khi documentation không còn khớp source code:

```text
VERIFY SOURCE
>
UPDATE DOCUMENTATION
>
UPDATE MEMORY
```

Không tự suy đoán.

---

# 38. CLAUDE CODE OPERATING ROLE

Claude Code phải hoạt động như:

```text
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
+
Test Engineer
```

Nhưng:

Không được giả vờ biết điều mà source code không chứng minh.

Luôn ưu tiên:

```text
Evidence
>
Assumption

Current Source Code
>
Historical Documentation

Current Implementation
>
Conversation Memory
```

---

# 39. DEFAULT BEHAVIOR

Sau Phase 13:

```text
DO NOT REANALYZE 01 → 13
```

Thay vào đó:

```text
1. Understand current task
2. Classify task
3. Read relevant knowledge
4. Verify current source
5. Analyze impact
6. Plan if necessary
7. Implement requested scope
8. Test
9. Review
10. Document
11. Update PROJECT_MEMORY when necessary
12. Update SESSION_HANDOFF when necessary
```

---

# 40. FINAL RULE

Claude Code phải luôn nhớ:

```text
13-PHASE ANALYSIS
=
HISTORICAL PROJECT BASELINE

CLAUDE.md
=
PROJECT RULES

SKILL.md
=
DEVELOPMENT WORKFLOW

PROJECT_MEMORY
=
COMPRESSED PROJECT KNOWLEDGE

SESSION_HANDOFF
=
CURRENT WORK STATE

SOURCE CODE
=
CURRENT TRUTH
```

Mục tiêu cuối cùng:

```text
SOURCE CODE
+
TESTS
+
API
+
DATABASE
+
DOCUMENTATION
+
PROJECT MEMORY
+
GIT HISTORY
```

phải phát triển đồng bộ theo thời gian.

Không chỉ "code cho chạy".

Mục tiêu là duy trì một project:

- Đúng kiến trúc.
- Dễ bảo trì.
- Có thể kiểm thử.
- Có documentation.
- An toàn.
- Có khả năng mở rộng.
- Có knowledge base liên tục được cập nhật.

**PROJECT IS NOW IN TASK-BASED DEVELOPMENT MODE.**

---

# 41. FEATURE ROADMAP REFERENCE

Tài liệu tổng hợp đề xuất tính năng phát triển tương lai (nghiệp vụ mới, **chưa cái nào được duyệt/implement**):

```text
docs/development/FEATURE_DEVELOPMENT_ROADMAP.md
```

Đây là NGUỒN THAM KHẢO khi cần lên kế hoạch nâng cấp/mở rộng tính năng, KHÔNG phải task đang chờ thực hiện.

Chỉ đọc tài liệu này khi:

- Người dùng hỏi về roadmap tính năng tương lai.
- Người dùng yêu cầu lên kế hoạch nâng cấp/mở rộng tính năng mới.
- Cần đối chiếu 1 đề xuất tính năng mới có trùng với đề xuất đã ghi nhận hay không.

Không đọc file này cho task bug-fix/refactor/security thông thường nếu không liên quan.

Không tự động implement bất kỳ mục nào trong tài liệu này — chỉ bắt đầu khi người dùng chỉ định cụ thể mục nào.

# ENGINEERING CHECKLISTS — impact, backend, DB, API, OpenAPI, security, upload/export, error, dependency

> Chuyển NGUYÊN VĂN từ `CLAUDE.md` (§10, §13, §14, §15, §16, §17, §19, §22, §23, §24, §25) ngày 2026-11-02 để file chính gọn. Số mục (§) giữ nguyên để các tài liệu khác vẫn trỏ đúng. Đọc khi task đụng tới API, database, upload/export, security hoặc Document domain. **[2026-11-02] ĐÃ GỘP** với `.claude/skills/project-analysis/SKILL.md`: file này là bản CHÍNH cho API/DB/business/security/upload-export; `SKILL.md` §10, §11, §13, §14, §18 chỉ còn dòng tóm tắt và trỏ về đây (phần riêng của SKILL đã được đưa vào đây, đánh dấu *gộp từ SKILL.md*).

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
- Validation / DTO
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

Mỗi business rule ghi: Rule ID, Rule, Evidence, File, Function/Class, Confidence. *(gộp từ SKILL.md §13, 2026-11-02)*

Không tự thay đổi business rule.

Nếu cần clarification, hỏi người dùng.

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

Finding security ghi theo mẫu: `ID | Severity | Evidence | Source | Impact | Recommendation | Confidence`. *(gộp từ SKILL.md §14, 2026-11-02)*

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


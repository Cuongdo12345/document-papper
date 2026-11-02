# KNOWLEDGE BASE MAP — bản đồ tài liệu dự án

> Chuyển NGUYÊN VĂN từ `CLAUDE.md` (§4, §5, §6, §31, §37) ngày 2026-11-02 để file chính gọn. Số mục (§) giữ nguyên để các tài liệu khác vẫn trỏ đúng. Đọc khi cần tìm tài liệu nào chứa kiến thức gì, hoặc khi cần biết 13 phase lịch sử / Phase 14–19 tuỳ chọn. **[2026-11-02] File này là NGUỒN DUY NHẤT của danh sách tài liệu** — `SKILL.md` §3 trước đây giữ bản sao thứ hai (nguyên nhân lệch nhiều lần), nay chỉ trỏ về đây.

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
├── 07_AUTH_RBAC_ANALYSIS.md
├── 08_BUSINESS_LOGIC.md
├── 09_SECURITY_ANALYSIS.md
├── 10_PERFORMANCE_ANALYSIS.md
├── 11_TECHNICAL_DEBT.md
├── 12_ISSUES_AND_RISKS.md
└── 13_FINAL_PROJECT_REPORT.md
```

> **[CẬP NHẬT 2026-09-16]** `06_FRONTEND_ANALYSIS.md` KHÔNG tồn tại — không phải thiếu sót, đã bị thay thế hoàn toàn bởi hệ thống doc riêng `docs/frontend/` (xem cuối mục này).

Các tài liệu phát triển/audit có thể có:

```text
docs/
├── 14_ANALYSIS_AUDIT.md
├── 15_ARCHITECTURE_REVIEW.md
├── 16_REFACTORING_PLAN.md
├── 17_SECURITY_HARDENING_PLAN.md
├── 18_TESTING_STRATEGY.md
├── 19_IMPROVEMENT_ROADMAP.md
├── 20_GLOBAL_SECURITY_REVIEW.md
├── 21_GLOBAL_ARCHITECTURE_REVIEW.md
├── 22_GLOBAL_TESTING_REVIEW.md
├── 23_CODE_REVIEW_ROADMAP.md
├── 30_DEVELOPMENT_COMPLETION_AUDIT.md
├── 31_BACKEND_CODE_REVIEW.md   # [2026-09-29] review toàn bộ backend (lỗi + hiệu năng), BR-01→BR-22 + 3 câu hỏi nghiệp vụ; mới nhất, thay trạng thái OPEN cũ của review-index/ — đọc trước khi sửa lỗi backend
├── module-reviews/      # review chi tiết theo domain (Auth, RBAC, Documents, Assets...), xem index tại review-index/
├── review-index/        # CODE_REVIEW_INDEX.md, CODE_REVIEW_SUMMARY.md
└── SESSION_HANDOFF.md
```

**[CẬP NHẬT 2026-09-16] Tài liệu phát triển sau-phân-tích** (điều phối toàn bộ giai đoạn task-based development, KHÔNG thuộc 13-phase, chưa từng được liệt kê ở đây trước đây):

```text
docs/development/
├── 00_DEVELOPMENT_ROADMAP.md         # [CẬP NHẬT 2026-09-30] LỊCH SỬ — roadmap P0→P3 gốc, chỉ gồm DEV-001→025 (đã DONE hết). KHÔNG còn là nguồn sự thật cho thứ tự task: việc hiện tại/tiếp theo xem SESSION_HANDOFF.md + 31_BACKEND_CODE_REVIEW.md
├── 00_PRE_DEV_PREFLIGHT.md
├── FEATURE_DEVELOPMENT_ROADMAP.md     # xem §41 — một phần ĐÃ implement, không còn "toàn bộ chưa duyệt"
├── PRODUCTION_DEPLOYMENT_PLAN.md      # [MỚI 2026-09-22] kế hoạch deploy production (hạ tầng free, single-instance) — trạng thái PLANNED, CHƯA triển khai, không tự ý bắt đầu Giai đoạn nào khi chưa được user chỉ định
├── DEV-001A_SUPER_ADMIN_IDENTITY_PLAN.md  # [2026-09-30] kế hoạch Super-Admin (`role.isSystemRole`) — ĐÃ HOÀN TẤT (DEV-001A + DEV-047), giữ làm lịch sử quyết định
├── ASSET_MODULE_SPLIT_PLAN.md         # [2026-10-10] kế hoạch tách module Tài sản thành Thiết bị CNTT / Thiết bị y tế (Giai đoạn 0→8) — ĐÃ HOÀN TẤT (DEV-111→120, FE-42→45), giữ làm lịch sử quyết định; xem §36 (assetType, 14 domain)
├── changes/, decisions/               # [2026-09-30] hiện RỖNG — chưa dùng
└── tasks/DEV-XXX.md                   # task backend thật — xem §9
```

**[CẬP NHẬT 2026-09-16] Tài liệu frontend** (hệ thống riêng, thay thế `06_FRONTEND_ANALYSIS.md`):

```text
docs/frontend/
├── FRONTEND_MEMORY.md   # index kiến thức frontend — tương đương vai trò PROJECT_MEMORY nhưng cho frontend
├── FE_ARCHITECTURE.md, FE_CONTEXT.md, FE_FOUNDATION_SPEC.md, API_REFERENCE.md, ...
├── phases/               # [2026-09-30] ghi chú theo phase nhỏ, hiện có 1 file (FE-01_MICRO_FIX_SESSION_RESTORE.md)
└── tasks/FE-XX.md        # task frontend thật — xem §9
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

# 37. CURRENT PROJECT CONTEXT

Technology stack và chi tiết kỹ thuật phải được lấy từ:

```text
docs/00_PROJECT_MEMORY.md
docs/01_PROJECT_OVERVIEW.md
docs/02_ARCHITECTURE.md
docs/03_BACKEND_ANALYSIS.md
docs/04_DATABASE_ANALYSIS.md
docs/05_API_ANALYSIS.md
docs/frontend/FRONTEND_MEMORY.md          # [CẬP NHẬT 2026-09-16] thay cho 06_FRONTEND_ANALYSIS.md (không tồn tại) — xem §4
docs/development/00_DEVELOPMENT_ROADMAP.md # [CẬP NHẬT 2026-09-30] LỊCH SỬ (DEV-001→025, đã DONE) — trạng thái hiện tại xem docs/SESSION_HANDOFF.md, xem §4
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

## Bổ sung (gộp từ SKILL.md §3, 2026-11-02)

Các mục dưới đây có ở bản sao trong `SKILL.md` §3 nhưng chưa có trong cây ở §4 phía trên:

- `docs/frontend/API_REFERENCE.md`, `docs/frontend/ROUTE_PERMISSION_MAP.md`, `docs/frontend/AUTH_RBAC_MAP.md` — bản đồ API / route↔permission / RBAC phía frontend; cập nhật mỗi khi đổi route hoặc quyền.
- `docs/rules/` — quy tắc chi tiết đã chuyển ra khỏi `CLAUDE.md` (nguyên văn, giữ số §): `KNOWLEDGE_BASE_MAP.md` (§4/5/6/31/37), `ENGINEERING_CHECKLISTS.md` (§10/13–17/19/22–25), `FRONTEND_UI_RULES.md` (§20/21), `MODULE_EXTENSION_RULE.md` (§36), `EVIDENCE_AND_QUALITY.md` (§33–35/38–40), `SESSION_HANDOFF_TEMPLATE.md` (§30).
- `docs/development/tasks/DEV-XXX.md` (backend) và `docs/frontend/tasks/FE-XX.md` (frontend) là quy ước task THẬT; `docs/tasks/` LEGACY (dừng ở TASK-001/002). Ngoại lệ hậu tố: `DEV-001A`, `DEV-009A`.
- `docs/development/changes/`, `docs/development/decisions/` hiện rỗng; `docs/frontend/phases/` hiện có 1 file.

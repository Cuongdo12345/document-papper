---
name: project-analysis
description: Quy tắc làm việc với dự án Document Papper sau khi đã hoàn thành phân tích Phase 01–13. Ưu tiên đọc đúng tài liệu cần thiết, xác minh source khi cần, thực hiện task an toàn, test và đồng bộ documentation.
---

# SKILL V3 — PROJECT KNOWLEDGE & DEVELOPMENT

> **Rulebook đã rà soát khớp thực tế project đến: `DEV-120` / `FE-45` (2026-10-10; lần trước: `DEV-099` / `FE-40`, 2026-09-30; trước nữa: `DEV-056` / `FE-16`, 2026-09-16).** Nếu task mới nhất chênh lệch lớn so với 2 mốc này, đối chiếu lại §8, `docs/rules/KNOWLEDGE_BASE_MAP.md` (trước đây §3) và `CLAUDE.md` §30 (trước đây §20) trước khi tin tuyệt đối.

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

Bản chính: `CLAUDE.md` §3 *(gộp 2026-11-02)*.

Cốt lõi: source code hiện tại > cấu hình > test > định nghĩa API/DB > tài liệu hiện hành > phân tích lịch sử > comment > giả định. Tài liệu cũ mâu thuẫn source → kiểm tra source, đánh dấu OUTDATED, cập nhật memory/tài liệu; không âm thầm coi historical analysis là hiện trạng.

---

## 3. KNOWLEDGE BASE

Danh sách tài liệu KHÔNG còn nhân đôi ở đây *(gộp 2026-11-02)*: nguồn duy nhất là `docs/rules/KNOWLEDGE_BASE_MAP.md` (cây tài liệu, tài liệu phát triển `docs/development/`, tài liệu frontend `docs/frontend/`, task `DEV-XXX` / `FE-XX`, `docs/rules/`).

Cần nhớ ngay:

- Điểm vào: `docs/00_PROJECT_MEMORY.md`; frontend: `docs/frontend/FRONTEND_MEMORY.md`; trạng thái hiện tại: `docs/SESSION_HANDOFF.md`.
- `docs/06_FRONTEND_ANALYSIS.md` KHÔNG tồn tại (đã thay bằng `docs/frontend/`).
- Task thật: `docs/development/tasks/DEV-XXX.md`, `docs/frontend/tasks/FE-XX.md`; `docs/tasks/` là LEGACY.
- Khi tạo thư mục/file doc cấp cao mới: thêm con trỏ vào `docs/rules/KNOWLEDGE_BASE_MAP.md` (không thêm vào đây).

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

Task quan trọng lưu tại (quy ước thật, **[CẬP NHẬT 2026-09-16]** thay cho `docs/tasks/TASK-XXX.md` cũ — LEGACY, dừng ở TASK-001/002, không dùng tiếp):

`docs/development/tasks/DEV-XXX.md` (backend) hoặc `docs/frontend/tasks/FE-XX.md` (frontend)

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

Checklist đầy đủ (trace Route → Middleware → Controller → Service → DTO/Validation → Model → Response; endpoint, method, request, response, status code, authn/authz, validation, error handling, OpenAPI, frontend consumers) ở `docs/rules/ENGINEERING_CHECKLISTS.md` §16–§17 *(gộp 2026-11-02)*.

Cốt lõi: source implementation là hiện trạng; đổi contract thì cập nhật OpenAPI khi phù hợp và kiểm tra frontend consumers.

---

## 11. DATABASE RULES

Checklist đầy đủ (model, field, quan hệ, index, query, transaction, backward compatibility, hiệu năng) ở `docs/rules/ENGINEERING_CHECKLISTS.md` §15 *(gộp 2026-11-02)*.

Cốt lõi: KHÔNG thay đổi database kiểu destructive nếu chưa được phép.

---

## 12. AUTHENTICATION / RBAC

Bản chính: `CLAUDE.md` §18 *(gộp 2026-11-02)*.

Cốt lõi: luôn kiểm tra cả Authentication lẫn Authorization (`Authenticated ≠ Authorized`). Route/tính năng MỚI có ý nghĩa bảo mật bắt buộc: (1) có middleware permission/RBAC riêng, không kế thừa ngầm; (2) nêu rõ permission nào, gắn ở file:dòng nào; (3) verify bằng user KHÔNG có quyền → bị chặn 401/403. Thiếu 3 việc này thì "Security impact đã xét" ở §26 Quality Gate KHÔNG tính là đủ.

---

## 13. BUSINESS LOGIC

Quy tắc và mẫu ghi business rule (Rule ID, Rule, Evidence, File, Function/Class, Confidence) ở `docs/rules/ENGINEERING_CHECKLISTS.md` §19 *(gộp 2026-11-02)*.

Cốt lõi: chỉ kết luận dựa trên evidence; dùng `CONFIRMED` / `INFERRED` / `UNKNOWN`; không tự tạo business requirement.

---

## 14. SECURITY

Checklist security và mẫu finding (`ID | Severity | Evidence | Source | Impact | Recommendation | Confidence`) ở `docs/rules/ENGINEERING_CHECKLISTS.md` §23 *(gộp 2026-11-02)*.

Cốt lõi: security review dựa trên source code; không exploit trái phép.

---

## 15. TEST SAU IMPLEMENTATION

Bản chính: `CLAUDE.md` §28 *(gộp 2026-11-02)*.

Cốt lõi: dùng command thực tế từ `package.json`, không tự bịa; sửa `frontend/` thì bắt buộc `cd frontend && npm run build`; không nói "đã test" nếu chưa chạy; không skip/disable/comment-out test đang FAIL.

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

Bản chính: `CLAUDE.md` §27 *(gộp 2026-11-02)*.

Cốt lõi: `git status` + `git branch` trước khi sửa, `git diff` sau khi sửa; không tự reset / force push / rewrite history / checkout branch khác / xoá untracked / commit nếu chưa được user cho phép.

---

## 18. FILE UPLOAD / EXPORT

Checklist upload/download/export (MIME, extension, size, filename, storage, path traversal, access control, cleanup, streaming, memory) ở `docs/rules/ENGINEERING_CHECKLISTS.md` §22 *(gộp 2026-11-02)*.

Cốt lõi: export lớn (Excel/PDF/CSV) phải chú ý memory và performance.

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

Áp dụng cho chính CLAUDE.md/SKILL.md: phát hiện rule mô tả sai thực tế (file không tồn tại, quy ước khác thực tế) → PHẢI nêu ngay trong response, không im lặng bỏ qua, không tự sửa khi chưa được xác nhận.

---

## 20. SESSION HANDOFF

Bản chính: `CLAUDE.md` §30; mẫu các trường: `docs/rules/SESSION_HANDOFF_TEMPLATE.md` *(gộp 2026-11-02)*.

Cốt lõi: cập nhật `docs/SESSION_HANDOFF.md` sau MỌI task, kể cả task DONE trọn vẹn trong cùng phiên (trước đây file này đứng yên 28+ task backend / 12+ task frontend vì chỉ cập nhật khi task còn dở); `Exact Next Action` phải là hành động cụ thể.

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

Chuẩn đầy đủ (ví dụ mẫu) ở `docs/rules/EVIDENCE_AND_QUALITY.md` §34 *(gộp 2026-11-02)*.

Cốt lõi: finding quan trọng = `FILE + FUNCTION/CLASS + OBSERVED BEHAVIOR` (kèm Confidence); không dùng kết luận mơ hồ kiểu "code có vẻ không tối ưu".

---

## 23. CONFIDENCE

Chi tiết ở `docs/rules/EVIDENCE_AND_QUALITY.md` §35 *(gộp 2026-11-02)*.

Cốt lõi: dùng `HIGH` / `MEDIUM` / `LOW`; phân biệt rõ `FACT / INFERENCE / UNKNOWN`.

---

## 24. NO BLIND REFACTORING

Bản chính: `CLAUDE.md` §26 *(gộp 2026-11-02)*.

Cốt lõi: phát hiện code xấu ngoài scope thì ghi nhận, không sửa, tiếp tục task chính; chỉ refactor khi user yêu cầu hoặc task đã bao gồm refactor.

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
- [ ] Build frontend (npm run build trong frontend/) đã chạy nếu đổi bất kỳ gì frontend — không hedge.
- [ ] Route/tính năng mới cần bảo vệ: đã thêm permission/RBAC VÀ verify chặn đúng bằng user thiếu quyền.
- [ ] `git diff` đã review.
- [ ] Documentation đã cập nhật nếu cần.
- [ ] PROJECT_MEMORY đã cập nhật nếu cần.
- [ ] SESSION_HANDOFF đã cập nhật nếu cần.

---

## 27. VAI TRÒ CỦA CLAUDE

Vai trò đầy đủ (gồm cả Test Engineer) ở `docs/rules/EVIDENCE_AND_QUALITY.md` §38 *(gộp 2026-11-02)*.

Cốt lõi: không giả vờ biết điều source code không chứng minh; `Evidence > Assumption`, `Current Source > Historical Documentation`, `Current Implementation > Conversation Memory`.

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
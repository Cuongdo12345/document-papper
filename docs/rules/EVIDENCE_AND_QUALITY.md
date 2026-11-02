# EVIDENCE & QUALITY — chuẩn bằng chứng, độ tin cậy, vai trò, quy tắc cuối

> Chuyển NGUYÊN VĂN từ `CLAUDE.md` (§33, §34, §35, §38, §39, §40) ngày 2026-11-02 để file chính gọn. Số mục (§) giữ nguyên để các tài liệu khác vẫn trỏ đúng. Đọc khi làm review, báo cáo finding hoặc cần chuẩn chất lượng chung. **[2026-11-02] ĐÃ GỘP** với `SKILL.md`: file này là bản CHÍNH cho §34/§35/§38; `SKILL.md` §22, §23, §27 chỉ còn dòng tóm tắt và trỏ về đây.

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

Phân biệt rõ FACT / INFERENCE / UNKNOWN trong mọi kết luận. *(gộp từ SKILL.md §23, 2026-11-02)*

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


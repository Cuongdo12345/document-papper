1. Thói quen kết phiên (trước khi tắt VS Code) — gõ 1 câu:

"Cập nhật SESSION_HANDOFF.md xong việc hôm nay trước khi kết thúc."

Việc này giờ đã là rule bắt buộc (đã sửa tuần trước), nhưng gõ tay 1 câu vẫn là bảo hiểm rẻ nhất.

2. Thói quen mở phiên (tin nhắn đầu tiên hôm sau) — gõ 1 câu:

"Đọc CLAUDE.md + docs/00_PROJECT_MEMORY.md (hoặc FRONTEND_MEMORY.md nếu làm FE) + SESSION_HANDOFF.md, tóm tắt trạng thái hiện tại trước khi làm gì tiếp."

project/
│
├── CLAUDE.md                  ← LUẬT
│
├── .claude/
│   └── skills/
│       └── project-analysis/
│           └── SKILL.md       ← QUY TRÌNH
│
├── docs/
│   │
│   ├── 00_PROJECT_MEMORY.md  ← KIẾN THỨC TÓM TẮT
│   │
│   ├── 01_PROJECT_OVERVIEW.md
│   ├── 02_ARCHITECTURE.md
│   ├── 03_BACKEND_ANALYSIS.md
│   ├── 04_DATABASE_ANALYSIS.md
│   ├── 05_API_ANALYSIS.md
│   ├── 06_FRONTEND_ANALYSIS.md
│   ├── 07_AUTH_RBAC_ANALYSIS.md
│   ├── 08_BUSINESS_LOGIC.md
│   ├── 09_SECURITY_ANALYSIS.md
│   ├── 10_PERFORMANCE_ANALYSIS.md
│   ├── 11_TECHNICAL_DEBT.md
│   ├── 12_ISSUES_AND_RISKS.md
│   ├── 13_FINAL_PROJECT_REPORT.md
│   │
│   ├── SESSION_HANDOFF.md     ← TRẠNG THÁI HIỆN TẠI
│   │
│   ├── tasks/                 ← CÁC TASK
│   ├── decisions/             ← QUYẾT ĐỊNH KIẾN TRÚC
│   └── changes/               ← LỊCH SỬ THAY ĐỔI
│
├── backend/
├── frontend/
└── ...

Có bị trùng không?

Có một ít overlap, nhưng không gây mâu thuẫn. Sau khi bổ sung SESSION_HANDOFF, tôi khuyên bạn quy định rõ 4 file như sau:

File	Câu hỏi nó trả lời
CLAUDE.md	Claude phải tuân thủ luật gì?
SKILL.md	Claude phải làm việc theo quy trình nào?
PROJECT_MEMORY.md	Claude cần biết gì về project?
SESSION_HANDOFF.md	Claude đang làm gì / đang dừng ở đâu?


Đây là cách phân chia rất hợp lý cho Claude Code.

                    CLAUDE.md
                PROJECT RULES
                     │
                     ▼
                  SKILL.md
              WORKFLOW / METHOD
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
 PROJECT_MEMORY.md      SESSION_HANDOFF.md
 PROJECT KNOWLEDGE      CURRENT WORK STATE
          │                     │
          └──────────┬──────────┘
                     ▼
               SOURCE CODE
                     │
                     ▼
              TEST / REVIEW
                     │
                     ▼
              DOCUMENTATION
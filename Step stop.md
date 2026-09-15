Tiếp tục development project từ trạng thái đã lưu.

Thực hiện theo đúng thứ tự:

1. Đọc CLAUDE.md.
2. Đọc docs/00_PROJECT_MEMORY.md.
3. Đọc docs/SESSION_HANDOFF.md nếu tồn tại.
4. Xác định:
   - Task hiện tại
   - Status hiện tại
   - Việc đã hoàn thành
   - Việc còn lại
   - Exact Next Action
5. Chỉ đọc các tài liệu/source code liên quan trực tiếp đến task hiện tại.
6. Không đọc lại toàn bộ docs/module-reviews/.
7. Không chạy lại Phase 01 → Phase 13.
8. Không tự mở rộng scope sang task khác.
9. Kiểm tra git status trước khi sửa code.
10. Tiếp tục đúng từ "Exact Next Action" trong SESSION_HANDOFF.

Trước khi thực hiện thay đổi, nếu task đã có implementation plan được phê duyệt thì tiếp tục implementation theo plan đó.

Nếu SESSION_HANDOFF không tồn tại hoặc trạng thái không rõ:
- Không tự đoán.
- Đọc PROJECT_MEMORY và tài liệu task liên quan.
- Báo cáo trạng thái hiện tại và đề xuất bước tiếp theo ngắn gọn.

Sau khi hoàn thành phần việc:
- Test đúng phạm vi.
- Review git diff.
- Cập nhật task documentation.
- Cập nhật docs/00_PROJECT_MEMORY.md nếu có thay đổi quan trọng.
- Cập nhật docs/SESSION_HANDOFF.md với Exact Next Action mới.

Không cần giải thích lại toàn bộ project cho tôi.
Chỉ báo cáo trạng thái và tiếp tục công việc.

========================================================================

Nếu hôm trước đang làm dở một task
Ví dụ hôm trước đang làm DEV-002, sáng hôm sau chỉ cần:

Tiếp tục DEV-002 từ trạng thái đã lưu.

Đọc:
- CLAUDE.md
- docs/00_PROJECT_MEMORY.md
- docs/SESSION_HANDOFF.md
- tài liệu DEV-002 nếu có

Không đọc lại toàn bộ project.
Không chạy lại các phase/phân tích đã hoàn thành.

Xác định Exact Next Action và tiếp tục thực hiện.
==================================================================

Nếu hôm trước đã DONE hoàn toàn
Ví dụ DEV-001 đã xong, sáng hôm sau muốn làm task tiếp:

Tiếp tục development.

Đọc CLAUDE.md, PROJECT_MEMORY và SESSION_HANDOFF để xác định task tiếp theo.

DEV-001 đã DONE.
DEV-004 đã DONE.

Không phân tích lại Phase 01–13.
Không đọc lại module-reviews nếu không cần.

Xác định task tiếp theo trong DEVELOPMENT_ROADMAP và bắt đầu từ đúng bước tiếp theo.
Trước khi sửa code, kiểm tra git status và đọc tài liệu/task liên quan.
==================================================================

Tạm dừng phiên làm việc tại đây.

DEV-005 đã hoàn thành. Không thực hiện thêm task nào.

Trước khi kết thúc session, hãy:

1. Xác nhận DEV-005 = DONE.
2. Kiểm tra và cập nhật docs/development/tasks/DEV-005.md nếu cần.
3. Cập nhật docs/00_PROJECT_MEMORY.md với trạng thái hiện tại.
4. Cập nhật docs/SESSION_HANDOFF.md để phiên sau có thể tiếp tục chính xác.
5. Ghi rõ:
   - Các DEV đã DONE: DEV-001 → DEV-006, trong đó DEV-005 vừa hoàn thành.
   - Task tiếp theo theo roadmap.
   - Những issue/finding còn tồn tại.
   - Những việc chưa verify.
   - Exact Next Action cho session tiếp theo.
6. Kiểm tra git status và git diff chỉ để ghi nhận trạng thái.
7. KHÔNG sửa source code.
8. KHÔNG implement task tiếp theo.
9. KHÔNG commit.
10. Không đọc thêm tài liệu hoặc phân tích không cần thiết.

Sau đó chỉ báo cáo ngắn gọn trạng thái handoff và dừng.
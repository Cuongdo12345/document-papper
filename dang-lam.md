# Đang làm / việc còn dở

Danh sách NGẮN, đọc đầu mỗi phiên. Cập nhật khi xong việc, khi user ra quyết định hoặc sửa Claude. Nhật ký chi tiết vẫn là `docs/SESSION_HANDOFF.md` (CLAUDE.md §30); quyết định/sửa lỗi gắn với dự án ghi ở `ghi-chu/`.

## Chưa commit
- DEV-123 (đồng bộ tài liệu phân tích với code): 29 file trong `docs/` (trừ 2 file của user), DEV-123.md, PROJECT_MEMORY, SESSION_HANDOFF, ghi-chu. Chờ user bảo commit.
- Hai thay đổi của user, Claude không động vào: docs/04_DATABASE_ANALYSIS.md (đã sửa), docs/32_PROJECT_FEATURE_GUIDE.md (file mới). User tự commit.

## Chờ user
- Lập kế hoạch tài liệu sơ đồ luồng dữ liệu (user đã yêu cầu 2026-11-25, làm sau khi đồng bộ tài liệu xong). Đầu vào: `luong-du-lieu-DMS.html`, `docs/frontend/DATA_FLOW.md`, trang System Design.
- Các ưu tiên còn lại từ bản đánh giá 2026-11-02: đưa script deploy vào git. (Xong: dọn phụ thuộc thừa backend — DEV-122; Playwright theo role — FE-46.)
- Triển khai production (docs/development/PRODUCTION_DEPLOYMENT_PLAN.md và DEV-120 mục 2).
- Xem ảnh frontend/e2e/visual.spec.ts-snapshots/dashboard-chromium-win32.png (đã tạo lại ở GĐ 7).
- Thử tay luồng tài sản bằng role IT và Vật tư-TTB trên giao diện thật.
- BR-16 còn mở.

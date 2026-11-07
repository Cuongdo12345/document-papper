# Mục lục ghi chú

Mỗi ghi chú một file trong thư mục này, mỗi file một dòng ở đây: `[trạng thái] tên-file.md` — mô tả ngắn.
Quy ước: `[còn hiệu lực]` hoặc `[CŨ]`. Khi một ghi chú hết đúng, đổi dòng `**Trạng thái:**` đầu file thành `CŨ (lý do, ngày)` và đánh `[CŨ]` ở đây; không xoá nếu user chưa đồng ý.

- [còn hiệu lực] `quyet-dinh-tran-claude-md.md` — CLAUDE.md không vượt 600 dòng; chi tiết để ở docs/rules/, CLAUDE.md chỉ giữ một dòng chỉ đường.
- [còn hiệu lực] `bo-cuc-docs-rules.md` — bố cục CLAUDE.md / docs/rules/ / SKILL.md; mục SKILL.md cố ý giữ nguyên.
- [còn hiệu lực] `tach-module-tai-san-da-xong.md` — GĐ 0→8 đã xong và đã push; chưa triển khai production (đến khi xong thì ghi chú này thành CŨ).
- [còn hiệu lực] `ci-toi-thieu.md` — CI chạy khi push main + PR (typecheck/unit/build, lint/vitest/build), KHÔNG có job e2e (user chốt); 2 lỗi đã sửa khi bật CI.
- [còn hiệu lực] `playwright-theo-role.md` — Playwright theo role (IT, Vật tư-TTB, USER), `npm run test:roles`; backend Playwright tắt bộ giới hạn đăng nhập theo lựa chọn của user.

# Playwright theo role (FE-46)

**Trạng thái:** còn hiệu lực.

- **Ngày:** 2026-11-02. **Người quyết:** user (chọn cách xử lý giới hạn 429).
- **Làm gì:** `frontend/e2e/roles/` kiểm giao diện theo quyền cho 3 role IT, PHONG_VAT_TU_TTB, USER; chạy riêng bằng `npm run test:roles`, chạy trọn bộ bằng `npx playwright test` (86 test).
- **Quyết định:** backend Playwright (`startPlaywrightServer.ts`) tắt `authRateLimiter` vì bộ test đã dùng ~99/100 lượt (mỗi lần mở trang = 1 lượt làm mới token). Không đổi code production.
- **Cách áp dụng:** khi đổi quyền của một role phải sửa bảng kỳ vọng trong `role-permissions.spec.ts` (viết tay có chủ đích). Nhóm role chạy SAU nhóm ADMIN và tự dọn dữ liệu để không làm lệch ảnh baseline; thêm dữ liệu cho nhóm role phải dọn trong `roles.teardown.ts`. Chưa có test tự động cho việc trả 429 của bộ giới hạn.

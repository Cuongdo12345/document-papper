# CI tối thiểu (DEV-121)

**Trạng thái:** còn hiệu lực.

- **Ngày:** 2026-11-02. **Người quyết:** user.
- **Quyết định:** CI chạy khi push lên `main` và với mọi PR. Chỉ gồm: backend typecheck + unit + build; frontend lint + vitest + build. **KHÔNG thêm job e2e vào CI** (user chốt 2026-11-02, sau khi e2e đã sạch exit 0) — e2e vẫn chạy tay trên máy: `cd backend && npx jest --config jest.e2e.config.js`. Playwright không đưa vào CI vì ảnh baseline là `*-win32.png`.
- **Lỗi đã sửa khi làm:** (1) `backend/scripts/copy-static-assets.js` bị `.gitignore` ở cả gốc lẫn `backend/` → clone repo không build được backend; nay chỉ file này được theo dõi (`**/scripts/*` ở gốc, `!scripts/copy-static-assets.js` ở `backend/`). (2) e2e exit 1 dù mọi test PASS do bộ hẹn giờ `performanceLogBuffer` chạy sau khi file test xong; sửa trong test, exit 0.
- **Cách áp dụng:** đừng tự thêm job e2e vào CI; nếu thấy cần thì đề xuất và hỏi user. Khi thêm file vào `backend/scripts/` mà `npm run build`/`npm start` cần tới, phải thêm dòng `!scripts/<file>` vào `backend/.gitignore`.

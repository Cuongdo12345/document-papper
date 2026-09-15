# 00 — PRE-DEVELOPMENT PREFLIGHT

> Ngày: 2026-08-31. Mục tiêu: xác minh 4 nhóm giả định (assumption) đã được đánh dấu UNKNOWN xuyên suốt toàn bộ quá trình review, TRƯỚC KHI bắt đầu bất kỳ DEV-XXX nào. KHÔNG sửa source code, KHÔNG implement DEV-001/DEV-004, KHÔNG chạy task khác — chỉ đọc source/config cần thiết để verify, cộng 1 lệnh read-only (`tsc --noEmit`) làm sanity check toolchain.
>
> **Nguồn đã đọc**: `CLAUDE.md`, `.claude/skills/project-analysis/SKILL.md`, `docs/00_PROJECT_MEMORY.md`, `docs/development/00_DEVELOPMENT_ROADMAP.md` (Mục 7 — Ghi chú UNKNOWN). Không đọc lại `docs/module-reviews/`. Nguồn xác minh trực tiếp: `git status`/`git log`, `backend/.env` (chỉ đọc field-name, KHÔNG in giá trị nhạy cảm), `backend/.env.example`, `backend/src/shared/utils/withTransaction.ts`, `backend/server.ts`/`app.ts` (grep `uploads`), `backend/package.json`, `backend/tsconfig.json`, `node -v`/`npm -v`/`npm config get registry`, `npx tsc --noEmit`.

---

## 1. RBAC Production Assumptions

**Câu hỏi cần trả lời**: dữ liệu Role/Permission THẬT trong MongoDB production có khớp giả định "chỉ ADMIN giữ `ROLE_UPDATE`/`USER_RESET_PASSWORD`" (đã audit ở DB **dev**, ghi trong `docs/20_GLOBAL_SECURITY_REVIEW.md` Mục 7) hay không?

- **Kết quả**: **KHÔNG THỂ XÁC MINH TRONG REPO** — không có kết nối tới MongoDB production, không có snapshot/export dữ liệu production nào trong repo. `backend/.env` cục bộ trỏ tới MongoDB **dev** (xem Mục 3).
- **Đánh giá lại risk dựa trên evidence hiện có**: giả định "an toàn tạm thời" chỉ đúng cho DB dev đã audit trước đây — **vẫn UNKNOWN cho production**, không đổi so với lần ghi nhận trước.
- **Blocking?**: **KHÔNG blocking cho DEV-004** (khôi phục test toolchain — hoàn toàn không phụ thuộc dữ liệu RBAC thật). **CÓ ảnh hưởng** tới việc đánh giá lại mức độ khẩn cấp thực tế của DEV-001/002/003 khi triển khai lên production — nhưng KHÔNG chặn việc viết code/test cho các fix đó (fix áp dụng đúng bất kể dữ liệu hiện tại thế nào).

## 2. Upload/Deployment Assumptions

**Câu hỏi cần trả lời**: có `express.static`/reverse-proxy nào serve tĩnh `backend/uploads/` không (ảnh hưởng mức độ nghiêm trọng thực tế của chuỗi IDOR Upload, `SEC-30→33`)?

- **Xác minh trong app hiện tại**: grep `uploads` trong `backend/server.ts` và `backend/src/app.ts` — **KHÔNG có kết quả nào**. Xác nhận lại (lần thứ 3 độc lập, cùng kết luận `RV00-01`/`RV09-09`): app Node hiện tại **không** tự serve file tĩnh qua HTTP.
- **Hạ tầng triển khai thật (reverse proxy/nginx/Docker)**: **KHÔNG có** `Dockerfile`, `docker-compose*`, `nginx*` nào trong repo (chỉ có 2 file `Dockerfile`/`.dockerignore` thuộc `node_modules/bcrypt` — không liên quan tới triển khai app). Khớp lại `TD-12` (không có Dockerfile/CI-CD) — repo hiện tại **không định nghĩa hạ tầng triển khai nào cả**, không phải "có nhưng chưa đọc".
- **Kết luận**: **UNKNOWN không thể giải quyết trong phạm vi repo** — quyết định nằm ở hạ tầng triển khai thật (ngoài repo), không phải source code. Giữ nguyên đánh giá "yếu tố giảm nhẹ nhưng chưa xác nhận" như `docs/20_GLOBAL_SECURITY_REVIEW.md` đã ghi.
- **Blocking?**: **KHÔNG blocking cho DEV-004**. Không chặn DEV-007 (Upload fix) — fix áp dụng đúng bất kể có reverse proxy hay không (defense-in-depth ở tầng Node vẫn cần thiết dù có/không có static serving khác).

## 3. MongoDB Transaction Assumptions

**Câu hỏi cần trả lời**: `MONGO_URI` dev/production có trỏ tới replica set hay không (điều kiện bắt buộc cho `withTransaction()` — xem comment tự giải thích trong `backend/src/shared/utils/withTransaction.ts`)?

- **Môi trường DEV (từ `backend/.env` cục bộ)**: **XÁC NHẬN CÓ** — `MONGO_URI` dùng scheme `mongodb://` kèm tham số `replicaSet=rs0`. Đây là bằng chứng TRỰC TIẾP: môi trường dev hiện tại ĐÃ được cấu hình đúng yêu cầu tiên quyết của `withTransaction()` (không đọc/in giá trị đầy đủ của biến — chỉ xác nhận sự hiện diện của `replicaSet=rs0`, đủ để kết luận).
- **Môi trường PRODUCTION**: **VẪN UNKNOWN** — repo không chứa cấu hình/kết nối production nào để xác minh.
- **Cập nhật so với ghi nhận trước đây**: `docs/14_ANALYSIS_AUDIT.md` Mục 20 và các tài liệu trước ghi "chưa xác minh môi trường thật, UNKNOWN" — nay **thu hẹp UNKNOWN xuống còn RIÊNG production** (dev đã CONFIRMED). Đây là 1 phát hiện mới đáng ghi nhận vào PROJECT_MEMORY.
- **Blocking?**: **KHÔNG blocking** — DEV-005/DEV-006/DEV-012 (các task cần transaction) có thể test được an toàn ở môi trường dev hiện tại.

## 4. Git / Environment / Toolchain Baseline

| Hạng mục | Kết quả | Ghi chú |
|---|---|---|
| `git branch --show-current` | `main` | Khớp `docs/00_PROJECT_MEMORY.md` |
| `git status --short` | 6 file modified (đúng TASK-002 đã biết: `user.controller.ts`, `openAPI.yaml`, `users.dto.ts`, `user.routes.ts`, `users.service.ts`, `permission.constant.ts`) + untracked `.claude/`, `CLAUDE.md`, `docs/` | **KHÔNG có thay đổi bất ngờ nào** — working tree khớp 100% trạng thái đã ghi nhận từ Phase 14, không ai chỉnh sửa source ngoài phiên này |
| `git log -5` | `5b58fb1` (HEAD) → `f4ce8e9` → `150acdf` → `ac507c5` → `5fd1455` | Khớp commit nền đã ghi trong Memory |
| Node.js | `v22.19.0` | `backend/package.json` không khai `engines` — không có ràng buộc version cụ thể, không phát hiện xung đột |
| npm | `11.6.2` | — |
| npm registry | `https://registry.npmjs.org/`, ping thành công (~35ms) | **Mạng internet khả dụng** — cài `jest`/`ts-jest`/`@types/jest` cho DEV-004 khả thi |
| `jest`/`ts-jest`/`@types/jest` trong `devDependencies` | **KHÔNG có** | Xác nhận lại đúng như `docs/18_TESTING_STRATEGY.md` |
| Script `test` trong `package.json` | **KHÔNG có** | — |
| `jest.config.js` | **KHÔNG tồn tại** trong working tree | Xác nhận lại đã bị xoá khỏi git ở `5b58fb1` |
| 4 file test mồ côi (`dist/src/**/__tests__/*.test.js`) | **VẪN CÒN NGUYÊN** (auth, RBAC middleware, workflow, permission cache) | Chưa bị mất — vẫn cần cứu khẩn cấp (rủi ro nếu `dist/` bị build lại/xoá) |
| `npx tsc --noEmit` | **PASS — 0 lỗi** | Baseline type-check sạch, an toàn để bắt đầu bất kỳ thay đổi nào |
| `backend/tsconfig.json` | `strict:true`, `target:ES2020`, `module:commonjs` | Baseline cấu hình TypeScript ổn định, không có gì bất thường cần lưu ý cho việc thêm `ts-jest` |

**Kết luận Mục 4**: Không có blocker nào ở tầng Git/environment. Toolchain hiện tại (Node/npm/TypeScript) hoàn toàn tương thích để khôi phục Jest.

---

## 5. Tổng hợp

| Nhóm | Trạng thái | Blocking cho DEV-004? |
|---|---|---|
| RBAC production | UNKNOWN (không thể xác minh trong repo) | KHÔNG |
| Upload/deployment | UNKNOWN (hạ tầng triển khai không tồn tại trong repo) | KHÔNG |
| MongoDB transaction | **DEV: CONFIRMED** (`replicaSet=rs0`) / **Production: UNKNOWN** | KHÔNG |
| Git/environment/toolchain | **CONFIRMED sạch, sẵn sàng** | — (đây chính là điều kiện DEV-004 cần) |

**Không phát hiện vấn đề BLOCKING nào cho DEV-004.**

---

**KHÔNG có source code nào được sửa. KHÔNG có DEV-001/DEV-004 nào được implement trong preflight này.**

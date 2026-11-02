# Tách module Tài sản: trạng thái

**Trạng thái:** còn hiệu lực đến khi triển khai production xong.

- Giai đoạn 0→8 đã xong (DEV-111→120, FE-42→45), đã commit và push lên origin/main (commit cuối của việc này: a7bed0d).
- Route cũ `/api/assets*` đã gỡ (404), chỉ còn `/api/assets/lookup-options[/:id]`; 20 quyền cũ `ASSET_*` đã gỡ khỏi code và DB dev (catalog 163 → 143).
- **Chưa triển khai production.** Thứ tự bước và cách chạy script: `docs/development/tasks/DEV-120.md` mục 2 và `docs/development/PRODUCTION_DEPLOYMENT_PLAN.md`.
- Script trong `backend/scripts/` bị gitignore, phải mang theo riêng khi deploy.
- Việc còn treo: xem `dang-lam.md`.

# Document & Medical Device Manager

Hệ thống quản lý tài liệu và tài sản/thiết bị y tế nội bộ — hỗ trợ workflow duyệt tài liệu đa cấp, quản lý vòng đời tài sản (bảo hành, kiểm định), phân quyền RBAC + ABAC, và các báo cáo/dashboard tổng hợp.

## Công nghệ sử dụng

- **Runtime**: Node.js + TypeScript, Express 5
- **Database**: MongoDB (Mongoose)
- **Auth**: JWT (access + refresh token), RBAC + ABAC (Policy-based)
- **Validate**: Zod
- **API Docs**: Swagger (OpenAPI)
- **Khác**: Multer (upload file), ExcelJS/docx (import/export), node-cron (job định kỳ), Nodemailer

## Bắt đầu nhanh

```bash
cd backend
npm install
cp .env.example .env   # điền MONGO_URI, JWT_SECRET, v.v.
npm run dev             # chạy development (ts-node-dev, hot reload)
```

Build & chạy bản production:

```bash
npm run build            # tsc + copy tài nguyên tĩnh (yaml, ejs) sang dist/
npm start                # chạy dist/server.js
```

> ⚠️ Bắt buộc phải có bước copy tài nguyên tĩnh trong `build` — `tsc` chỉ compile file `.ts`, không tự copy `src/docs/openAPI.yaml` hay `src/views/email/forgotPassword.ejs` sang `dist/`. Thiếu bước này, `npm start` sẽ crash lúc khởi động vì thiếu file Swagger.

## Các lệnh script hữu ích

```bash
npm run seed:medical-devices   # seed dữ liệu mẫu module thiết bị y tế
npm run seed:rbac              # đồng bộ Permission/Role theo code (idempotent)
```

Backup MongoDB (chạy thủ công hoặc đặt lịch tự động — xem hướng dẫn trong từng file):

```bash
# Linux/VPS
MONGO_URI="..." ./backend/scripts/backup-mongo.sh

# Windows PowerShell
$env:MONGO_URI='...'; .\backend\scripts\backup-mongo.ps1
```

## Cấu trúc thư mục chính

```
backend/src/
├── config/        # kết nối database, swagger
├── controllers/   # theo domain: assets, auth, documents, rbac, dashboard...
├── dto/           # validate input (zod)
├── interfaces/    # TS interface cho model
├── middlewares/    # auth, error, upload, rate-limit, performance...
├── models/         # Mongoose schema theo domain
├── routes/         # Express router theo domain
├── services/        # business logic
├── shared/          # constants, cron, errors, cache, helpers, utils
└── docs/            # openAPI.yaml
```

## Các nhóm API chính

| Route | Mô tả |
|---|---|
| `/api/auths` | Đăng nhập, đăng ký, refresh token |
| `/api/documents` | CRUD tài liệu |
| `/api/workflows` | Workflow duyệt tài liệu đa cấp |
| `/api/departments` | Khoa/phòng |
| `/api/users`, `/api/user-audits` | Quản lý user, nhật ký thao tác |
| `/api/rbac` | Quản lý Role/Permission |
| `/api/assets`, `/api/assets/asset-categories` | Quản lý tài sản |
| `/api/assets/medical-devices` | Quản lý thiết bị y tế (kiểm định, phân loại A/B/C/D) |
| `/api/dashboard` | Thống kê tổng hợp (admin, tài sản, thiết bị y tế) |
| `/api/upload`, `/api/export` | Upload file, xuất Excel/Word |
| `/api/notifications` | Thông báo trong hệ thống |
| `/api/performances` | Theo dõi hiệu năng API |

Chi tiết đầy đủ từng endpoint xem tại Swagger UI khi chạy server (thường tại `/api-docs`).

## Lưu ý vận hành

- **Không xóa trực tiếp** các collection cốt lõi (`User`, `Role`, `Department`...) rồi tạo lại — việc này sinh `_id` mới, làm gãy mọi tham chiếu (`ObjectId`) đã lưu ở các document khác (đã từng xảy ra sự cố thật). Nếu cần reset dữ liệu, dùng script `upsert` theo field tự nhiên (`name`, `code`) thay vì xóa toàn bộ.
- **Backup MongoDB định kỳ** — xem `backend/scripts/backup-mongo.sh` / `.ps1`.

# Đánh giá tổng thể dự án `document-papper`

> Đánh giá dựa trên clone trực tiếp từ `https://github.com/Cuongdo12345/document-papper`, commit `671ed82` (18/08/2026).

---

## ⚠️ Vấn đề khẩn cấp

Repo hiện tại **build sẽ lỗi ngay lập tức**:

```json
"build": "tsc && node scripts/copy-static-assets.js"
```

`package.json` trỏ tới `scripts/copy-static-assets.js`, nhưng **file này không tồn tại** trong repo — `backend/scripts/` chỉ có `ma-chay-script.ts`, `seed-assets.ts`, `seed-assignment-history.ts`. Chạy `npm run build` sẽ báo `Cannot find module`.

**Cách fix**: thêm file `backend/scripts/copy-static-assets.js` (đã gửi kèm ở lần trao đổi trước) — script này copy các file tài nguyên tĩnh (`openAPI.yaml`, `forgotPassword.ejs`) từ `src/` sang `dist/` sau khi `tsc` build, vì `tsc` chỉ compile `.ts` và bỏ qua hoàn toàn các file khác. Thiếu bước này, `npm start` (chạy bản build) sẽ crash ngay lúc khởi động vì thiếu `openAPI.yaml`.

---

## 1. Đánh giá cấu trúc file — 8/10

### Điểm mạnh

- Kiến trúc layered rõ ràng: `routes → controllers → services → models`, tách riêng `dto/`, `interfaces/`, `middlewares/`, `shared/`.
- Tổ chức theo domain nhất quán — 15 module: `documents`, `workflow` (duyệt tài liệu đa cấp), `assets`, `medicalDevice`, `rbac`, `users`, `notifications`, `dashboard`, `excel`, `upload`, `departments`, `performances`, `userAudit`...
- Dự án đã phát triển đáng kể qua thời gian: `services/assets` được tách nhỏ hơn thành `assetDevice/` (asset thường) và `medicalDevice/` (thiết bị y tế) riêng biệt — refactor hợp lý khi domain phức tạp lên.
- Module Workflow (duyệt tài liệu nhiều bước theo role) khá hoàn thiện: 1075 dòng service, model `WorkflowInstance`/`WorkflowTemplate` tách biệt, trạng thái rõ ràng (`pending`/`approved`/`rejected`/`cancelled`/`completed`).

### Điểm trừ

- `README.md` gốc **vẫn đang trống** (0 byte).
- `backend/README.md` là nội dung do AI generate lúc phân tích code trước đây, không phải README chuẩn cho người dùng/dev mới.
- `.mcp.json` (config cá nhân cho AI tool) **vẫn còn bị commit** vào git.

---

## 2. Đánh giá độ chịu tải — 6/10

| Yếu tố | Trạng thái |
|---|---|
| Indexing DB | ✅ Tốt — index hợp lý trên các collection chính (unique code, compound index, text index) |
| Pagination | ✅ Tốt — giới hạn `limit` tối đa 100, dùng `.lean()`, `Promise.all` cho count+find song song |
| N+1 query | ✅ Không phát hiện — batch fetch bằng `Promise.all`/`Map` khi import Excel |
| Connection pool | ❌ `maxPoolSize: 10` hard-code, hơi thấp cho nhiều user đồng thời |
| Cache (permission) | ✅ Có, in-memory TTL 5 phút |
| Cache (dashboard) | ❌ Chưa có — mỗi request tính lại `aggregate`/`$facet` từ đầu |
| Performance logging | ⚠️ Ghi MongoDB cho **mọi request** (dù không `await`) — cạnh tranh I/O với DB nghiệp vụ ở traffic cao |
| Scale ngang (nhiều instance) | ❌ Chưa sẵn sàng — cache in-memory (permission) không chia sẻ giữa instance, chưa dùng Redis |
| Tìm kiếm | ⚠️ Dùng `$regex` substring thay vì tận dụng text index đã khai báo — chấp nhận được ở quy mô hiện tại, sẽ chậm dần khi dữ liệu lớn |

**Nhận định**: ổn cho traffic nội bộ vừa/nhỏ, 1 instance. Cần cải thiện pool size, cache dashboard, và cách ghi performance log trước khi traffic tăng hoặc cần scale ngang.

---

## 3. Đánh giá năng suất dự án (production-readiness) — 5/10

### Về tính năng — khá đầy đủ cho hệ thống nội bộ

Auth (JWT + refresh token) · RBAC + ABAC (Policy) · Document CRUD + Workflow duyệt đa cấp · Asset/Thiết bị y tế (kèm lịch kiểm định, cảnh báo bảo hành) · Excel import/export · Upload file · Notification · Dashboard · Audit log.

### Về vận hành/production-readiness — điểm yếu nhất của dự án

| Hạng mục | Trạng thái |
|---|---|
| Automated test | ❌ **0%** — không có file `.test.ts`/`.spec.ts` nào, không có Jest/Mocha/Vitest trong `package.json` |
| CI/CD | ❌ Không có `.github/workflows`, không pipeline nào |
| Docker | ❌ Không có `Dockerfile`/`docker-compose.yml` |
| Backup DB | ❌ Xác nhận từ sự cố thật: không có backup, dẫn tới **mất vĩnh viễn** dữ liệu `createdBy` khi Role/User bị xóa nhầm |
| Build production | ❌ Đang lỗi (xem mục "Vấn đề khẩn cấp") |
| Quy trình thay đổi DB | ❌ Rủi ro cao — đã xảy ra 2 sự cố mất dữ liệu thật do xóa trực tiếp collection không qua migration có kiểm soát |

**Nhận định**: chất lượng code cho phần business logic (indexing, pagination, type safety) ổn, nhưng **quy trình vận hành đang là điểm yếu nhất**, không phải chất lượng code. Với dữ liệu nhạy cảm (hồ sơ, thiết bị y tế bệnh viện), thiếu test + backup tự động + CI là rủi ro vận hành lớn hơn nhiều so với rủi ro kỹ thuật thuần túy.

---

## 4. Module/tính năng đề xuất bổ sung

**Phát hiện đáng chú ý**: hệ thống hiện chỉ có **3 role** (`ADMIN`, `IT`, `USER`) trong khi mỗi bước Workflow lại cho phép gán `role` dạng string tự do, không ràng buộc với 3 role RBAC thật — chưa đủ chi tiết để phản ánh đúng cơ cấu tổ chức bệnh viện.

### 4.1 Mở rộng RBAC theo cơ cấu thật
- Thêm role theo chức danh: Trưởng khoa, Điều dưỡng trưởng, Phòng Vật tư-TTB, Ban Giám đốc
- Ràng buộc role trong workflow step với role thật trong RBAC (hiện đang là string tự do)
- Hỗ trợ phân quyền theo scope khoa/phòng (user chỉ thấy dữ liệu khoa mình)

### 4.2 Notification đa kênh
- Gửi email khi có bước duyệt cần xử lý (`nodemailer` đã có sẵn, chưa thấy dùng cho workflow)
- Tích hợp Zalo OA/SMS cho cảnh báo khẩn (thiết bị hỏng, hết hạn kiểm định)
- Digest email hàng ngày cho quản lý (tổng hợp thiết bị cần duyệt/hết hạn)

### 4.3 Ký số / e-signature cho tài liệu duyệt
- Tích hợp chữ ký số (USB Token/HSM) cho tài liệu quan trọng
- Xuất PDF kèm chữ ký + timestamp cho lưu trữ pháp lý
- Audit trail chi tiết hơn cho mỗi lần ký (IP, thiết bị)

### 4.4 Tài liệu kỹ thuật / hướng dẫn sử dụng thiết bị y tế
- Đính kèm manual/hướng dẫn sử dụng vào từng thiết bị
- Lịch sử bảo trì/sửa chữa chi tiết (khác với calibration — là hỏng hóc thực tế)
- QR code trên thiết bị trỏ tới trang thông tin/manual (`assetQRCode.service.ts` đã có nền)

### 4.5 Báo cáo định kỳ tự động (compliance report)
- Báo cáo định kỳ (tháng/quý) gửi tự động cho Sở Y tế/Ban Giám đốc
- Xuất báo cáo theo mẫu chuẩn Bộ Y tế (nếu có quy định)
- Cron job đã có nền (`assetAlerts.cron.ts`) — mở rộng thêm job xuất báo cáo

---

## 5. Kế hoạch dự án (Roadmap)

### Giai đoạn 1 — Vá lỗi khẩn cấp (Tuần 1)
1. Fix build (`copy-static-assets.js`) — `npm start` đang crash, ưu tiên tuyệt đối
2. Setup backup MongoDB tự động — bài học từ sự cố mất dữ liệu thật
3. Áp dụng lại các fix hiệu năng đã làm: pool size, dashboard cache, performance batch/sample
4. Dọn nợ kỹ thuật nhỏ: gỡ `.mcp.json`, viết lại README

### Giai đoạn 2 — Nền tảng vận hành (Tuần 2-4)
1. Viết test cho module lõi — ưu tiên auth, RBAC, workflow duyệt (nơi lỗi gây hậu quả nặng nhất)
2. Setup CI (lint + build + test) bằng GitHub Actions — chặn merge nếu lỗi
3. Dockerize + docker-compose — chuẩn hóa môi trường dev/staging/production

### Giai đoạn 3 — Hoàn thiện nghiệp vụ (Tháng 2-3)
1. Mở rộng RBAC theo chức danh thật, ràng buộc workflow step với role thật
2. Notification đa kênh (email cho workflow) — tận dụng `nodemailer` đã có
3. Tài liệu kỹ thuật thiết bị + QR — hoàn thiện `assetQRCode.service.ts` đã có nền

### Giai đoạn 4 — Mở rộng dài hạn (Tháng 3-4 trở đi)
1. Chữ ký số cho workflow duyệt — nếu cần giá trị pháp lý thật
2. Báo cáo compliance tự động — mở rộng cron job đã có
3. Chuẩn bị scale ngang (Redis cache) — chỉ làm khi traffic thực tế yêu cầu

**Logic ưu tiên**: Giai đoạn 1-2 tập trung vào nền tảng vận hành trước, vì đây là điểm yếu nhất và rủi ro cao nhất hiện tại (đã có 2 sự cố mất dữ liệu thật trong quá trình phát triển). Giai đoạn 3-4 mới mở rộng tính năng nghiệp vụ — phát triển tính năng mới trên nền chưa có test/backup sẽ càng làm rủi ro chồng chất.

---

## Điểm số tổng thể

| Hạng mục | Điểm |
|---|---|
| Cấu trúc file | 8/10 |
| Độ chịu tải | 6/10 |
| Năng suất / production-readiness | 5/10 |

Điểm trung bình bị kéo xuống chủ yếu vì thiếu test/CI/Docker/backup, không phải vì chất lượng code kém — dấu hiệu điển hình của dự án phát triển tính năng nhanh nhưng chưa dành đủ thời gian cho hạ tầng an toàn.

# KẾ HOẠCH DEPLOY PRODUCTION — Document Papper

**Trạng thái:** PLANNED — chưa triển khai, tạm để đó, phát triển sau (theo yêu cầu user, 2026-09-22).
**Phạm vi quyết định đã chốt:**
- Hạ tầng: FREE tier (user yêu cầu tìm phương án miễn phí).
- Quy mô: 1 bệnh viện, vài chục–vài trăm user, **single-instance backend** (không cần scale ngang).
- Chưa có domain/nhà cung cấp cụ thể nào được xác nhận — cần chốt trước khi bắt đầu Giai đoạn 0.

Không tự động implement bất kỳ giai đoạn nào trong tài liệu này — chỉ bắt đầu khi user chỉ định cụ thể
giai đoạn nào (đúng tinh thần CLAUDE.md §41 áp dụng tương tự cho tài liệu kế hoạch dài hạn).

---

## 0. Ràng buộc kỹ thuật đã xác minh trong code (quyết định kiến trúc, không suy đoán)

| Ràng buộc | Bằng chứng | Ảnh hưởng tới lựa chọn hosting |
|---|---|---|
| **Bắt buộc MongoDB Replica Set** (không chạy được transaction trên standalone) | `backend/mongodb-transaction-setup-guide.md` — dùng cho Import Excel, Asset transfer, Workflow approve, RBAC | Loại các dịch vụ Mongo free không phải replica set; Atlas M0 hoặc tự host `rs0` đều được |
| **Cron job chạy in-process** (`node-cron`, 6 job: SLA alert, weekly report, medical device alert, contract alert, consumable alert, asset alert) | `backend/src/shared/cron/*.cron.ts` | Cần host **luôn chạy 24/7, không spin-down** — loại trừ platform free kiểu Render (ngủ sau 15 phút không request) |
| **Permission cache in-memory** (`Map`, TTL 5 phút, không dùng Redis) | `backend/src/services/rbac/permission.cache.ts` | Bắt buộc **1 instance backend duy nhất** — đúng khớp quy mô đã chốt, không cần đổi gì |
| **Upload file lưu đĩa cục bộ** (`multer.diskStorage`) | `backend/src/services/upload/upload.middleware.ts:13-21` | Cần **ổ đĩa bền vững** gắn liền server — loại các platform có filesystem ephemeral (mất file sau mỗi lần redeploy) |
| `CLIENT_URL` bắt buộc set, server fail-fast nếu thiếu | `backend/.env.example:16-21`, DEV-014 | Phải có domain/URL cố định trước khi deploy |
| Khoá ký PDF nội bộ (`PDF_SIGN_PRIVATE_KEY`/`PUBLIC_KEY`) phải **riêng cho từng môi trường** | `backend/.env.example:49-57` | Phải sinh lại khoá mới cho prod, không copy từ dev |

→ Kết luận: cần 1 server chạy liên tục (không spin-down) với đĩa bền vững, không phải kiểu
"serverless/free web service tự ngủ".

---

## 1. Kiến trúc đề xuất — Oracle Cloud "Always Free" + Cloudflare (100% free, không giới hạn thời gian)

```
                    ┌─────────────────────────────┐
   User (browser) → │ Cloudflare Pages (frontend)  │  ← build tĩnh Vite, CDN free, không giới hạn băng thông
                    └──────────────┬───────────────┘
                                   │ gọi API qua domain con (vd api.xxx.com)
                                   ▼
                    ┌─────────────────────────────┐
                    │ Cloudflare DNS + SSL (free)  │  ← proxy HTTPS, không cần tự xin Let's Encrypt
                    └──────────────┬───────────────┘
                                   ▼
        ┌──────────────────────────────────────────────────┐
        │ Oracle Cloud "Always Free" VM (Ampere A1 hoặc AMD) │
        │  - Nginx reverse proxy → Node backend (PM2)        │
        │  - MongoDB Community, single-node replica set rs0  │
        │  - Thư mục uploads/ trên đĩa block storage 200GB   │
        └──────────────────────────────────────────────────┘
```

### Vì sao chọn tổ hợp này thay vì các free tier khác đã kiểm tra (web search 2026-09-22)

- **Render free tier** — bị loại: web service tự spin-down sau 15 phút không request, phá vỡ cron job
  và làm mất session cache in-memory mỗi lần "thức dậy".
  Nguồn: https://render.com/articles/platforms-with-a-real-free-tier-for-developers-in-2026
- **MongoDB Atlas M0** — có thể dùng thay cho tự host Mongo, nhưng giới hạn 512MB storage và tài liệu
  chính thức KHÔNG xác nhận rõ ràng giới hạn transaction trên M0 (search không ra kết luận chắc chắn)
  — trong khi tự host Mongo trên VM Oracle tận dụng 200GB đĩa free và dùng ĐÚNG guide replica-set
  project đã có sẵn, loại bỏ rủi ro chưa xác minh này.
  Nguồn: https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/
- **Oracle Always Free VM** — chạy liên tục thật (không giới hạn giờ như free-trial 30 ngày các cloud
  khác), đủ RAM cho Node+Mongo+Nginx ở quy mô 1 bệnh viện. Lưu ý: giữa 2026 Oracle đã âm thầm giảm hạn
  mức Ampere A1 từ 4 OCPU/24GB xuống **2 OCPU/12GB** — vẫn đủ cho quy mô đã chốt, nhưng cần biết trước.
  Nguồn: https://terminalbytes.com/oracle-cloud-free-tier-changes-2026/

---

## 2. Rủi ro cần lường trước khi chọn hướng free này

1. **Oracle "Out of Capacity"** — một số khu vực (region) hết chỗ cấp VM Ampere A1 miễn phí, phải thử
   lại nhiều lần/nhiều region hoặc rơi về AMD micro (nhỏ hơn: 1/8 OCPU, 1GB RAM).
   Nguồn: https://github.com/oeufmeister/oci-arm-host-capacity
2. **Single VM = single point of failure** — không có failover tự động. Chấp nhận được ở quy mô đã chốt
   (1 instance), nhưng **bắt buộc có backup routine** (Mục 5).
3. **Không có managed monitoring/alerting** — cần tự dựng (PM2 built-in + uptime checker miễn phí ngoài,
   vd UptimeRobot).
4. **Tài khoản cloud free thường yêu cầu thẻ tín dụng để xác minh** (kể cả Oracle) — rủi ro chung của
   mọi nhà cung cấp free tier, không riêng lựa chọn này.

---

## 3. Các giai đoạn triển khai

### Giai đoạn 0 — Chuẩn bị hạ tầng (không đụng code)
- Đăng ký Oracle Cloud, tạo VM Always Free (thử Ampere A1 trước, fallback AMD nếu hết capacity).
- Cài Node LTS, MongoDB Community, Nginx, PM2 trên VM.
- Setup replica set `rs0` trên VM — dùng lại nguyên quy trình đã viết cho Windows
  (`backend/mongodb-transaction-setup-guide.md`), chuyển sang lệnh Linux tương đương (`mongod.conf`
  thay vì `mongod.cfg`).
- **Verify transaction chạy thật** bằng đúng script `test-transaction.ts` đã có sẵn trong guide, trước
  khi deploy app — không giả định replica set 1 node hoạt động đúng chỉ vì đã làm được ở Windows dev.
- Đăng ký domain miễn phí hoặc domain đã có, trỏ Cloudflare DNS.

### Giai đoạn 1 — Deploy Backend
- `cd backend && npm run build` (đã có sẵn script: `tsc` + `copy-static-assets.js`) → deploy `dist/`
  lên VM.
- Set toàn bộ biến môi trường prod theo `.env.example` — đặc biệt: `NODE_ENV=production`, `MONGO_URI`
  trỏ `rs0` local, `CLIENT_URL` = domain frontend thật, sinh **khoá PDF_SIGN mới riêng cho prod**
  (`npx ts-node scripts/generate-pdf-signing-keys.ts`), SMTP thật (Gmail/SMTP free tier hoặc SMTP nhà
  cung cấp email bệnh viện).
- Chạy bằng PM2 (`pm2 start dist/server.js --name docpapper-api`, `pm2 save`, `pm2 startup`) để tự
  khởi động lại khi VM reboot — thay thế nhu cầu Docker/CI phức tạp mà project hiện chưa có.
- Nginx reverse proxy `api.domain.com` → `localhost:<PORT>`.
- **[BỔ SUNG 2026-09-29, BR-09/DEV-097] Múi giờ:** backend tự cố định `TZ=Asia/Ho_Chi_Minh` lúc khởi động
  (`src/config/timezone.ts`) và truyền timezone vào aggregation MongoDB, nên VM để UTC **không** ảnh hưởng KPI
  hay mã tài liệu, và không cần đặt `TZ` cho process Node. Nên đặt thêm giờ hệ thống VM
  (`timedatectl set-timezone Asia/Ho_Chi_Minh`) để log và `crontab` backup dễ đọc.
- **[BỔ SUNG 2026-09-29, BR-08/DEV-096] Trust proxy — BẮT BUỘC khi chạy sau Cloudflare + Nginx:**
  - Đặt `TRUST_PROXY=2` trong `.env` prod (2 lớp: Cloudflare + Nginx). Thiếu biến này thì `req.ip` là IP
    của Nginx: rate limit đăng nhập (100 lần / 15 phút theo IP) sẽ dùng chung cho **mọi** người dùng, và IP ở
    "Phiên đăng nhập" sai. Không đặt `true` (server từ chối khởi động).
  - Nginx phải nối IP vào header: `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;` (cùng
    `proxy_set_header Host $host;`).
  - Nếu sau này đổi kiến trúc (bỏ Cloudflare proxy, hoặc dùng module `real_ip` của Nginx để lấy
    `CF-Connecting-IP`), đổi `TRUST_PROXY` cho đúng số lớp còn lại.
  - Kiểm tra sau deploy: đăng nhập từ 2 máy khác mạng, mở "Phiên đăng nhập" và xác nhận IP hiển thị là
    IP thật của từng máy, không phải IP của Cloudflare/Nginx.

### Giai đoạn 2 — Deploy Frontend
- `cd frontend && npm run build` → publish thư mục `dist/` lên Cloudflare Pages (build tự động qua
  Git, hoặc upload tay).
- Set `VITE_API_BASE_URL` trỏ đúng `api.domain.com`.

### Giai đoạn 3 — Bảo mật trước go-live (CLAUDE.md §23)
- Xác nhận `helmet`, CORS, rate-limit (đã có trong code — `express-rate-limit`, `helmet` ở
  `backend/package.json`) đang bật đúng ở `NODE_ENV=production`.
- Đổi toàn bộ secret dev (`JWT_SECRET`, `JWT_REFRESH_SECRET`) sang giá trị mới random mạnh — không tái
  dùng giá trị `.env` dev.
- **[BR-18/DEV-104]** Swagger `/api-docs` mặc định TẮT: để `NODE_ENV=production` và KHÔNG đặt
  `ENABLE_API_DOCS`. Xác nhận sau khi deploy: `curl -i https://api.domain.com/api-docs/` phải trả 404.
- Kiểm tra cookie JWT có cờ `Secure`/`SameSite` đúng khi chạy qua HTTPS thật (Cloudflare cung cấp SSL
  free tự động).

### Giai đoạn 4 — Backup & vận hành
- Cron riêng (ngoài node-cron của app, dùng `crontab` Linux) chạy `mongodump` định kỳ (hàng ngày) —
  nén và lưu cả trên VM lẫn đẩy ra nơi khác (vd Cloudflare R2 free 10GB, hoặc email/Google Drive thủ
  công ban đầu nếu chưa cần tự động hoá).
- Theo dõi disk usage `uploads/` — 200GB free là nhiều, nhưng cần cảnh báo sớm trước khi đầy.
- Uptime monitoring ngoài (free, vd UptimeRobot) ping endpoint health-check định kỳ.

---

## 4. Việc CHƯA có trong repo, cần làm mới hoàn toàn (không phải mở rộng cái có sẵn)

- Không có `Dockerfile`/CI-CD nào hiện tại — nếu muốn containerize thay vì chạy PM2 trực tiếp trên VM,
  đó là quyết định kiến trúc riêng cần xác nhận (Docker giúp dễ tái tạo môi trường nhưng thêm độ phức
  tạp học/vận hành so với PM2 trực tiếp — với quy mô free/1 VM, PM2 trực tiếp thường đơn giản hơn).
- Chưa có script deploy tự động (hiện chỉ có `npm run build`/`start` thủ công) — có thể làm 1 script
  deploy đơn giản (rsync/scp + restart PM2) hoặc GitHub Actions free tier (2000 phút/tháng free cho
  repo private) để tự động deploy khi push `main`.

---

## 5. Quyết định CHƯA chốt — cần xác nhận trước khi bắt đầu Giai đoạn 0

- Domain thật (đã có sẵn hay cần đăng ký domain free/rẻ)?
- Dùng PM2 trực tiếp trên VM hay containerize bằng Docker?
- SMTP prod dùng nhà cung cấp nào (Gmail free giới hạn gửi/ngày, hay SMTP riêng của bệnh viện)?
- Backup off-site đẩy đi đâu (Cloudflare R2 / Google Drive / khác)?

---

## 6. Nguồn tham khảo (web search 2026-09-22)

- Oracle Cloud free tier changes 2026 — https://terminalbytes.com/oracle-cloud-free-tier-changes-2026/
- Oracle "Out of Capacity" issue — https://github.com/oeufmeister/oci-arm-host-capacity
- Atlas Free Cluster Limits — https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/
- Render 2026 free tier behavior — https://render.com/articles/platforms-with-a-real-free-tier-for-developers-in-2026

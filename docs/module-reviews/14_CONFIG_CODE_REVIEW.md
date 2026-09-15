# REVIEW-14 — CONFIG / DEPENDENCIES / BUILD

Status: DONE (review only, không sửa code, không upgrade package nào)
Date: 2026-08-31
Scope: `backend/package.json`, `backend/package-lock.json`, `backend/tsconfig.json`, `backend/server.ts`, `backend/src/config/**`, `backend/scripts/**`, `backend/.env.example` — đối chiếu chéo với `backend/.gitignore`, `git ls-files`, và `backend/src/app.ts` khi cần xác minh cách dependency/config được dùng thật (không review sâu các file ngoài danh sách).

## 0. Tóm tắt điều hành (đọc trước)

Finding nghiêm trọng nhất của review này: **`npm run build` sẽ THẤT BẠI trên bất kỳ máy nào clone lại repo từ git**, vì file `scripts/copy-static-assets.js` mà build script phụ thuộc trực tiếp **không được commit vào git** (bị `.gitignore` chặn qua rule `scripts` — xem mục 5). Đây không phải suy đoán — đã xác minh bằng `git ls-files` (file không có trong index) và đọc chính nội dung file đó (tự ghi rõ hậu quả nếu thiếu nó: production crash ngay lúc khởi động vì thiếu `openAPI.yaml`/`forgotPassword.ejs` trong `dist/`). Không có CI/CD nào trong repo để bắt lỗi này trước khi nó xảy ra thật ở môi trường mới.

## 1. Danh sách đã inspect

```
backend/package.json
backend/package-lock.json          (lockfileVersion 3, đọc qua Node script để tra version resolve thật)
backend/tsconfig.json
backend/server.ts
backend/src/config/database/database.ts
backend/src/config/database/database.events.ts
backend/src/config/database/database.shutdown.ts
backend/src/config/database/mongo.logger.ts
backend/src/config/swagger/swagger.ts
backend/scripts/backup-mongo.ps1        (không đọc nội dung sâu — chỉ xác nhận tồn tại + trạng thái git)
backend/scripts/copy-static-assets.js
backend/scripts/ma-chay-script.ts       (không đọc nội dung — ngoài phạm vi câu hỏi review, chỉ xác nhận trạng thái git)
backend/scripts/repair-orphaned-user-roles.ts  (không đọc nội dung sâu — chỉ xác nhận trạng thái git)
backend/scripts/seed-assets.ts          (không đọc nội dung — chỉ xác nhận trạng thái git)
backend/scripts/seed-assignment-history.ts (không đọc nội dung — chỉ xác nhận trạng thái git)
backend/scripts/seed-medical-devices.ts (không đọc nội dung sâu — chỉ xác nhận trạng thái git)
backend/scripts/seed-rbac.ts            (đã đọc đầy đủ ở REVIEW-13, dùng lại kết quả)
backend/.env.example
backend/.gitignore
```

Đối chiếu chéo (chỉ để xác nhận cách dùng thật, không review sâu):
`backend/src/app.ts`, `node_modules/cors/lib/index.js`, `node_modules/{fs,path,mongoose}/package.json`, `git ls-files`/`git check-ignore`/`git status --ignored`.

## 2. Dependencies — package.json vs sử dụng thật

Đã grep toàn bộ `backend/src` cho từng package trong `dependencies`/`devDependencies` để xác nhận có được import hay không.

### 2.1. Dependencies KHÔNG được dùng ở bất kỳ đâu trong `src/` (MEDIUM, CONFIRMED)

| Package | Loại | Ghi nhận |
|---|---|---|
| `docx` (`^9.6.1`) | dependency | 0 kết quả grep `docx` trong toàn bộ `src/`. Thư viện tạo file Word (nặng) — có thể dự định cho tính năng export .docx chưa triển khai, hoặc đã bị thay thế bởi luồng Excel/ejs hiện có. |
| `swagger-jsdoc` (`^6.2.8`) | dependency | 0 kết quả. `config/swagger/swagger.ts` (nơi DUY NHẤT setup Swagger) chỉ dùng `yamljs` + `swagger-ui-express` để load thẳng `openAPI.yaml` tĩnh — không dùng `swagger-jsdoc` (thư viện sinh spec từ JSDoc comment) ở đâu cả. |
| `mongoose-to-swagger` (`^1.5.1`) | dependency | 0 kết quả trong `src/`. |
| `file-saver` (`^2.0.5`) | dependency | 0 kết quả. Đáng chú ý hơn các package khác: đây là thư viện CHỈ chạy được trong TRÌNH DUYỆT (dùng `Blob`/`URL.createObjectURL` của Web API) — cài vào 1 backend Node.js là vô nghĩa về mặt kỹ thuật (không thể `import` và dùng đúng chức năng của nó trong môi trường Node), dấu hiệu rõ ràng của việc copy nhầm dependency từ 1 package.json frontend sang. |
| `@tailwindcss/vite` (`^4.3.0`) | devDependency | 0 kết quả `tailwind`/`vite` trong `src/`; không có `vite.config.*`/`tailwind.config.*` nào trong `backend/`. Đây là Vite plugin cho Tailwind CSS — hoàn toàn không có vai trò trong 1 backend Express/TypeScript thuần server-side. Cùng dấu hiệu contamination từ package.json của project frontend khác. |

**Tổng cộng 5 package (4 dependency + 1 devDependency) xác nhận không được dùng.** Đây không phải "có thể chưa dùng tới" — đã grep toàn bộ `src/` cho từng tên package, 0 kết quả cho cả 5.

### 2.2. `fs` và `path` — dependency npm trỏ tới module built-in của Node (MEDIUM, CONFIRMED)

```json
"fs": "^0.0.1-security",
"path": "^0.12.7",
```

- Cả `fs` và `path` đều là module BUILT-IN của Node.js — không bao giờ cần cài qua npm.
- Đã kiểm tra nội dung 2 package thật sự được cài (`node_modules/fs/README.md`, `node_modules/path/package.json`):
  - `fs@0.0.1-security` là **"Security holding package"** chính thức của npm — package KHÔNG CÓ BẤT KỲ CHỨC NĂNG NÀO (README: *"This package name is not currently in use... npm is hanging on to the package name... we'll probably give it to you if you want it"*). Đây là dạng package npm giữ chỗ tên sau khi package gốc bị gỡ, và theo README, **BẤT KỲ AI cũng có thể liên hệ npm để xin lại quyền publish tên này** — nếu điều đó xảy ra trong tương lai và version constraint `^0.0.1-security` cho phép resolve version mới, đây là 1 vector supply-chain-attack lý thuyết (dù rủi ro thực tế thấp vì `package-lock.json` đã pin version+integrity hash cụ thể, `npm ci` sẽ không tự nâng version).
  - `path@0.12.7` là bản copy đầy đủ y hệt module `path` built-in, do 1 bên thứ 3 (Joyent, ~2015, không còn maintain) publish lên npm, kéo theo 2 dependency phụ (`process`, `util`) hoàn toàn không cần thiết.
- **Đã verify KHÔNG có bug runtime nào xảy ra**: grep `import fs from "fs"` / `import path from "path"` trong `src/` cho thấy code THẬT SỰ import 2 module này (`upload.middleware.ts`, `swagger.ts`, `calibrationRecord.service.ts`...). Theo cơ chế resolution của Node, `require`/`import` 1 tên trùng với core module LUÔN ưu tiên core module trước khi tìm trong `node_modules` — nên toàn bộ code hiện tại vẫn đang dùng đúng `fs`/`path` built-in thật của Node, KHÔNG bị 2 package rỗng/thừa này can thiệp. Impact thực tế chỉ là: 2 dependency vô nghĩa trong `package.json`/lockfile, gây khó hiểu khi audit ("tại sao dự án pin cứng `fs@^0.0.1-security`?") và tăng bề mặt supply-chain không cần thiết dù rủi ro khai thác thực tế thấp.

### 2.3. Dependencies được dùng đúng, không phát hiện vấn đề

`bcrypt`, `compression`, `cookie-parser`, `cors`, `dotenv`, `exceljs`, `express`, `express-rate-limit`, `helmet`, `jsonwebtoken`, `mongoose`, `morgan`, `multer`, `node-cron`, `nodemailer`, `qrcode`, `swagger-ui-express`, `yamljs`, `zod` — tất cả đã xác nhận có ít nhất 1 nơi import thật trong `src/` (một số đã verify chi tiết ở các review trước — REVIEW-10/11/12/13 — không lặp lại toàn bộ ở đây).

### 2.4. Security-sensitive dependencies — điểm cần lưu ý (không phải bug)

- `bcrypt@6.0.0` — native module (biên dịch qua `node-gyp-build`, `hasInstallScript: true`) dùng cho hash mật khẩu — đây LÀ package chính thống, phổ biến, đúng lựa chọn cho tác vụ bảo mật này (không phải bcryptjs pure-JS chậm hơn). Không phát hiện version cũ/có CVE đã biết trong phạm vi kiểm tra thủ công (không chạy `npm audit` — xem mục 8 vì sao).
- `jsonwebtoken@9.0.3` — đã xác nhận ở REVIEW-01: `authenticate` middleware whitelist `algorithms: ["HS256"]` khi verify — đúng thực hành chống "algorithm confusion" (CVE lớp lỗ hổng cũ của jsonwebtoken/jwt nói chung).
- `multer@2.1.1` (lockfile resolve, package.json ghi `^2.1.0`) — bản v2, đã xác nhận qua REVIEW-09 rằng vấn đề upload không kiểm tra MIME/magic-byte là lỗi CÁCH DÙNG (`createUploader()` gọi thiếu `allowedTypes`), không phải lỗ hổng của bản thân package.
- Không chạy được `npm audit`/`npm outdated` trong phạm vi review này (review-only, không có yêu cầu chạy lệnh mạng/ghi log riêng, và theo CLAUDE.md §28 phải dùng command đã được định nghĩa sẵn trong project — project KHÔNG có script `audit`/`outdated` nào định nghĩa sẵn trong `package.json`). Ghi nhận: **UNKNOWN** liệu có CVE nào đang mở trên các dependency hiện tại — khuyến nghị chạy `npm audit` thủ công ngoài phạm vi review-only này.

## 3. Version compatibility

- Đã đối chiếu `engines` field của các dependency chính qua `package-lock.json`: `express@5.2.1` yêu cầu `node >= 18`, `mongoose@9.1.5` yêu cầu `node >= 20.19.0`, `express-rate-limit@8.3.2` yêu cầu `node >= 16`. Máy review hiện tại chạy `node v22.19.0` — thoả mãn tất cả.
- **`package.json` của project KHÔNG khai báo field `"engines"` (LOW, CONFIRMED).** Vì `mongoose` yêu cầu Node cao hơn `express` (20.19.0 vs 18), nếu ai đó deploy lên môi trường chỉ đáp ứng yêu cầu tối thiểu của `express` (Node 18/19) mà không biết `mongoose` cần cao hơn, ứng dụng có thể lỗi runtime khó hiểu (không phải lỗi rõ ràng "Node version too old" ngay từ `npm install`, vì `engines` field không tồn tại để npm cảnh báo). Khuyến nghị (không thực hiện): thêm `"engines": { "node": ">=20.19.0" }` vào `package.json` để npm tự cảnh báo khi cài trên Node quá cũ.
- `express@5.x` là major version tương đối mới so với `express@4.x` từng phổ biến nhiều năm — đã verify các middleware quan trọng đi kèm (`express-rate-limit`, `swagger-ui-express`, `cors`) đều khai báo `peerDependencies`/tương thích rõ ràng với Express 5 (`swagger-ui-express`: `">=4.0.0 || >=5.0.0-beta"`; `express-rate-limit`: `">= 4.11"` không giới hạn trần) — không phát hiện xung đột peer dependency.
- Không phát hiện dependency nào ở trạng thái pre-release/beta/alpha được dùng trong production code (mọi version trong `dependencies` là bản ổn định theo semver).

## 4. TypeScript (tsconfig.json)

```json
{
  "target": "ES2020",
  "module": "commonjs",
  "outDir": "dist",
  "lib": ["ES2022"],
  "types": ["node"],
  "rootDir": ".",
  "strict": true,
  "esModuleInterop": true,
  "skipLibCheck": true,
  "typeRoots": ["./node_modules/@types", "src/shared/types"]
}
```

- `"strict": true` — bật đầy đủ chế độ strict type-checking, đúng thực hành tốt nhất, nhất quán với việc hầu như không dùng `any` bừa bãi đã quan sát được ở các review trước (REVIEW-13 đặc biệt ghi nhận điều này).
- `"target": "ES2020"` + `"lib": ["ES2022"]` — lệch nhau về mặt danh nghĩa (cho phép TypeScript nhận diện API runtime ES2022 như `Array.prototype.at`, `Object.hasOwn`, nhưng chỉ transpile cú pháp xuống mức ES2020). Đây KHÔNG phải bug: Node.js (mọi version >= 16) cung cấp đầy đủ các API ES2022 bất kể `target` transpile xuống mức nào — `target` chỉ ảnh hưởng CÚ PHÁP (arrow function, optional chaining...) được hạ cấp ra sao, không ảnh hưởng API runtime có sẵn hay không. Ghi nhận là điểm cấu hình hơi lỏng lẻo, không phải lỗi.
- `"rootDir": "."` + không có `"include"/"exclude"` tường minh — TypeScript mặc định compile TOÀN BỘ file `.ts` trong thư mục chứa `tsconfig.json` trở xuống (trừ `node_modules`, và tự động trừ `outDir`). Nghĩa là `backend/scripts/*.ts` và `backend/server.ts` ĐỀU nằm trong phạm vi biên dịch của `tsc` cùng với `backend/src/**/*.ts` — khớp với việc `dist/server.js` (không phải `dist/src/server.js`) là entry point thật của `npm start`. Không phát hiện file `.ts` nào ngoài ý muốn bị lọt vào phạm vi biên dịch (không có thư mục `test/`/`examples/` nào khác trong `backend/`).
- **Không có `"noEmitOnError": true` (LOW, CONFIRMED).** Mặc định của TypeScript là `noEmitOnError: false` — nghĩa là dù `tsc` báo lỗi type (compile error), nó VẪN ghi ra file `.js` tương ứng vào `dist/` (trừ lỗi cú pháp nghiêm trọng). Kết hợp với việc KHÔNG có CI/CD nào chạy `tsc --noEmit` như 1 gate riêng trước khi build/deploy (xem mục 8), quy trình hiện tại về lý thuyết cho phép: code có lỗi type vẫn "build thành công" (thoát code khác 0 từ `tsc` nhưng script `build` trong `package.json` là `"tsc && node scripts/copy-static-assets.js"` — dùng `&&`, nên nếu `tsc` thoát khác 0, bước copy-static-assets SẼ KHÔNG chạy, và `npm run build` coi như thất bại đúng cách ở cấp `npm`) — **tự sửa lại nhận định**: vì dùng `&&`, một lỗi `tsc` (exit code non-zero) NGĂN được bước tiếp theo và làm cả lệnh `npm run build` thất bại đúng cách, dù bản thân file `.js` lỗi vẫn có thể đã được ghi ra `dist/` trước khi tiến trình dừng. Rủi ro thực tế: nếu ai chạy riêng lẻ `node dist/server.js` sau 1 lần `tsc` báo lỗi (bỏ qua exit code), có thể chạy nhầm code cũ/lỗi — biên độ rủi ro THẤP vì `npm start` không tự chạy `tsc` trước (script `start` chỉ là `node dist/server.js`), người vận hành phải tự đảm bảo `npm run build` chạy thành công trước `npm start`, đúng quy ước 2 bước tách biệt phổ biến — không phải thiết kế sai, chỉ thiếu 1 lớp bảo vệ tường minh (`noEmitOnError`) cho trường hợp ai đó bỏ qua exit code của `tsc`.
- **Build script không dọn `dist/` trước khi biên dịch lại (LOW, CONFIRMED).** `"build": "tsc && node scripts/copy-static-assets.js"` không có bước xoá `dist/` cũ trước (không dùng `rimraf dist` hay tương đương). Nếu 1 file `.ts` bị XOÁ khỏi `src/` ở 1 commit sau, `tsc` sẽ không tự xoá file `.js` tương ứng đã tồn tại từ lần build trước trong `dist/` — về lý thuyết có thể để lại code đã xoá khỏi source nhưng vẫn được `require()` ngầm bởi code khác trong `dist/` cũ (nếu có), gây khó debug ("tại sao code đã xoá vẫn chạy?"). Rủi ro thấp ở quy mô hiện tại (build luôn chạy trên môi trường CI/deploy sạch — NHƯNG xem mục 5, đây LẠI chính là môi trường thiếu file cần thiết) nhưng đáng lưu ý cùng nhóm "Build hygiene".

## 5. Build — FINDING NGHIÊM TRỌNG NHẤT (HIGH, CONFIRMED)

### `scripts/copy-static-assets.js` (và 4 file khác trong `scripts/`) KHÔNG được commit vào git

`backend/.gitignore` (dòng 6):
```
scripts
```

Rule này ignore TOÀN BỘ thư mục `backend/scripts/` — không chỉ 1 file cụ thể. Đã verify bằng `git ls-files`/`git status --ignored`:

| File | Trạng thái git |
|---|---|
| `backend/scripts/ma-chay-script.ts` | ĐÃ tracked (thêm vào git TRƯỚC KHI rule `scripts` được thêm vào `.gitignore` — git không tự untrack file đã thêm trước đó) |
| `backend/scripts/seed-assets.ts` | ĐÃ tracked (cùng lý do) |
| `backend/scripts/seed-assignment-history.ts` | ĐÃ tracked (cùng lý do) |
| `backend/scripts/backup-mongo.ps1` | **KHÔNG tracked** — `git status` báo `!!` (ignored, untracked) |
| `backend/scripts/copy-static-assets.js` | **KHÔNG tracked** — `git status` báo `!!` |
| `backend/scripts/repair-orphaned-user-roles.ts` | **KHÔNG tracked** — `git status` báo `!!` |
| `backend/scripts/seed-medical-devices.ts` | **KHÔNG tracked** — `git status` báo `!!` |
| `backend/scripts/seed-rbac.ts` | **KHÔNG tracked** — `git status` báo `!!` |

5/8 file trong `scripts/` chỉ tồn tại trên máy làm việc hiện tại, KHÔNG nằm trong repository git.

**Hậu quả cụ thể, đã xác nhận bằng cách đọc chính nội dung `copy-static-assets.js`:**

```js
/**
 * ... Hậu quả trước khi có script này: chạy `npm run build && npm start`
 * (đúng flow production) sẽ CRASH NGAY LÚC KHỞI ĐỘNG với lỗi
 * "ENOENT: no such file or directory, open '.../dist/src/docs/openAPI.yaml'"
 * vì swagger.ts đọc file này ngay khi module được import, trước khi app
 * kịp start. Tính năng quên mật khẩu cũng sẽ lỗi vì thiếu file ejs.
 */
```

Script này tự tài liệu hoá rõ ràng lý do nó tồn tại (copy `openAPI.yaml` và `forgotPassword.ejs` — 2 tài nguyên tĩnh non-`.ts` mà `tsc` không tự copy — sang `dist/`). Vì file này KHÔNG có trong git:

1. `git clone` repo này ở 1 máy khác → thư mục `backend/scripts/` sẽ KHÔNG chứa `copy-static-assets.js`.
2. Chạy `npm run build` (`"tsc && node scripts/copy-static-assets.js"`) → bước `tsc` chạy được, nhưng `node scripts/copy-static-assets.js` báo lỗi `Error: Cannot find module '.../scripts/copy-static-assets.js'` → **`npm run build` THẤT BẠI**.
3. Dù có ai đó bỏ qua lỗi ở bước 2 và chạy tiếp `npm start` với `dist/` chỉ có phần `tsc` tạo ra (thiếu asset tĩnh) → đúng như chính script đã tự ghi trong comment: **crash ngay lúc khởi động** vì `swagger.ts` đọc `openAPI.yaml` NGAY LÚC IMPORT MODULE (không lazy), và tính năng quên mật khẩu lỗi vì thiếu `forgotPassword.ejs`.

**Không có CI/CD nào trong repo để bắt lỗi này sớm** — đã xác nhận: không tìm thấy thư mục `.github/` hay bất kỳ file cấu hình CI nào (`*.yml`/`*.yaml` liên quan workflow) ở gốc repo. Nghĩa là lỗi này sẽ chỉ được phát hiện khi có người thực sự thử clone-lại-và-build trên 1 máy/môi trường mới (CI, máy đồng nghiệp mới, server deploy) — đúng lúc cần chạy production nhất.

**Cùng vấn đề, mức độ nghiêm trọng thấp hơn:** `repair-orphaned-user-roles.ts`, `seed-medical-devices.ts`, `seed-rbac.ts` (đã review chi tiết ở REVIEW-13 — đây là script seed RBAC/Permission ĐANG ĐƯỢC DÙNG THẬT theo comment trong chính nó) cũng chỉ tồn tại trên máy hiện tại — nếu máy này gặp sự cố (ổ cứng hỏng, máy bị thay) mà chưa từng backup riêng, các script bảo trì/seed dữ liệu này **MẤT VĨNH VIỄN**, không có lịch sử git để khôi phục. `backup-mongo.ps1` (script backup MongoDB) cũng cùng tình trạng — trớ trêu là chính script LO VIỆC BACKUP lại không được "backup" bằng git.

**Khuyến nghị (KHÔNG thực hiện trong review-only này):** sửa `.gitignore` để chỉ ignore đúng những gì cần ignore (build output, log, node_modules...) — không ignore nguyên cả thư mục `scripts/`; sau đó `git add` 5 file đang thiếu. Đây là thay đổi CẦN NGƯỜI CÓ THẨM QUYỀN QUYẾT ĐỊNH VÀ THỰC HIỆN (không phải review-only), nhưng mức độ khẩn cấp cao vì ảnh hưởng trực tiếp khả năng deploy/tái tạo môi trường.

## 6. Environment variables

Đã đối chiếu TOÀN BỘ `process.env.*` xuất hiện trong `src/` với danh sách khai báo ở `.env.example`:

| Biến | Khai báo ở `.env.example` | Dùng thật trong code | Ghi chú |
|---|---|---|---|
| `PORT` | ✅ | ✅ (`server.ts`) | Có fail-fast (`throw` nếu thiếu) |
| `MONGO_URI` | ✅ | ✅ (`database.ts`) | Có fail-fast (throw ở module-level — xem mục 7 về việc trùng lặp check) |
| `JWT_SECRET` | ✅ | ✅ (`auth.middleware.ts`, `auth.helper.ts`) | **KHÔNG fail-fast** — đã ghi nhận từ trước ở `RV00-05` (REVIEW-00), không lặp lại chi tiết ở đây, chỉ xác nhận vẫn đúng hiện trạng |
| `JWT_REFRESH_SECRET` | ✅ | ✅ | Cùng tình trạng không fail-fast như `JWT_SECRET` |
| `JWT_EXPIRES_IN` | Có, nhưng bị COMMENT (`# JWT_EXPIRES_IN =`) | ❌ không dùng ở đâu | ĐÚNG — thời hạn token hiện hard-code `"8h"`/`"7d"` trong `auth.helper.ts`, biến này chưa từng được wire vào code, `.env.example` chú thích đúng bằng cách comment nó lại. Không phải finding, chỉ xác nhận nhất quán. |
| `DEFAULT_REGISTER_ROLE_NAME` | ✅ | ✅ (`auths.service.ts`) | OK |
| `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASS`/`SMTP_SECURE`/`MAIL_FROM` | ✅ | ✅ (`mailer.ts`) | OK, không fail-fast nếu thiếu (đã ghi nhận ở REVIEW-10 `RV10-04`) |
| `CLIENT_URL` | ✅ (khai 2 LẦN — xem bên dưới) | ✅ (`app.ts` CORS origin, `auths.service.ts` build reset link) | Xem finding riêng ngay dưới đây |
| `NODE_ENV` | ✅ | ✅ (`app.ts`, `mongo.logger.ts`) | OK |
| `PERF_SAMPLE_RATE` | ✅ | ✅ (`performance.middleware.ts`) | OK |
| `DASHBOARD_CACHE_TTL_MS` | ✅ | ✅ (`dashboard.controller.ts`) | OK |
| `MONGO_DEBUG`/`MONGO_SLOW_MS` | ✅ (tài liệu hoá rất chi tiết, 6 dòng comment) | Có đọc trong code (`mongo.logger.ts`) NHƯNG feature chưa từng được kích hoạt | Xem finding riêng ở mục 7 |
| `MONGO_MAX_POOL_SIZE`/`MONGO_MIN_POOL_SIZE` | ❌ KHÔNG có trong `.env.example` | ✅ dùng thật (`database.ts:106-107`, có default an toàn `?? 20`/`?? 2` nếu thiếu) | **Thiếu tài liệu (LOW)** — 2 biến này được thêm sau (theo comment tại chỗ: "Sửa (review hiệu năng)") nhưng chưa được bổ sung vào `.env.example`, khiến người vận hành không biết có thể tinh chỉnh pool size qua env mà phải đọc source mới biết. Không gây lỗi (có default hợp lý) nhưng là thiếu sót tài liệu. |

### FINDING — `CLIENT_URL` không fail-fast, và khi thiếu làm CORS chuyển sang FAIL-OPEN thay vì fail-closed (MEDIUM, CONFIRMED)

- File: `backend/src/app.ts:54-61`:
```ts
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    methods: [...],
    allowedHeaders: [...],
    credentials: true,
  }),
);
```
- Đã đọc trực tiếp source code của package `cors` đang cài (`node_modules/cors/lib/index.js`, hàm `configureOrigin`):
  ```js
  if (!options.origin || options.origin === '*') {
    // allow any origin
    headers.push([{ key: 'Access-Control-Allow-Origin', value: '*' }]);
  }
  ```
- Observed: nếu `CLIENT_URL` không được set (undefined) trong môi trường chạy thật — không có bất kỳ validate/fail-fast nào cho biến này (khác `PORT`/`MONGO_URI`) — `options.origin` là `undefined`, `!options.origin` là `true`, thư viện `cors` tự động rơi vào nhánh **"allow any origin"**, trả `Access-Control-Allow-Origin: *` cho MỌI request, bất kể domain gọi tới. Kết hợp với `credentials: true` (luôn bật cứng, không phụ thuộc `CLIENT_URL`) tạo ra tổ hợp header `Access-Control-Allow-Origin: *` + `Access-Control-Allow-Credentials: true` — tổ hợp này VI PHẠM spec Fetch/CORS (trình duyệt sẽ tự chặn phản hồi có credentials khi origin là `*`), nên với truy cập từ trình duyệt có gửi cookie, hiệu ứng thực tế bị trình duyệt tự giới hạn phần nào; nhưng với client KHÔNG phải trình duyệt (không áp dụng CORS enforcement phía client — CORS vốn là cơ chế phía trình duyệt, không phải access-control phía server), header `Access-Control-Allow-Origin: *` không có ý nghĩa chặn gì thêm — bản thân model bảo mật thật của API này là JWT Bearer token, không phải CORS, nên mức độ nghiêm trọng thực tế của riêng lỗi CORS này ở mức TRUNG BÌNH, không phải CRITICAL.
- Điểm đáng chú ý nhất không phải bản thân việc CORS mở, mà là **HƯỚNG THẤT BẠI**: quên set 1 biến môi trường quan trọng (`CLIENT_URL`) khiến hệ thống fail-OPEN (nới lỏng bảo mật) thay vì fail-CLOSED (chặn hết/crash rõ ràng) — ngược hướng với nguyên tắc an toàn mặc định. Đây là dạng lỗi cấu hình "im lặng" nguy hiểm nhất: server vẫn chạy bình thường, không log cảnh báo nào, không ai biết CORS đang mở cho tất cả origin cho tới khi bị phát hiện qua audit như review này.
- Cùng lớp vấn đề với `RV00-05` (REVIEW-00, `JWT_SECRET` không fail-fast) nhưng khác hướng hậu quả: `JWT_SECRET` thiếu → hỏng theo hướng lỗi rõ ràng (token verify luôn fail); `CLIENT_URL` thiếu → hỏng theo hướng ÂM THẦM NỚI LỎNG bảo mật — nghiêm trọng hơn về nguyên tắc thiết kế an toàn dù bề mặt tấn công thực tế hạn chế bởi model JWT Bearer.
- `.env.example` khai `CLIENT_URL` **HAI LẦN** ở 2 section khác nhau (dòng 16, dưới "Cấu hình môi trường email" — dùng để build link reset password; dòng 19, dưới "Frontend cấu hình port" — dùng cho CORS) mà không có comment nào giải thích vai trò kép và mức độ nhạy cảm bảo mật của biến này. Đây là dấu hiệu file `.env.example` được ghép từ nhiều lần sửa khác nhau mà không rà soát lại tổng thể.

### Rác trong `.env.example` (LOW, CONFIRMED)

2 dòng cuối file:
```
# https://github.com/OpenAPITools/openapi-generator?utm_source=chatgpt.com
# https://github.com/OpenAPITools/openapi-generator?utm_source=chatgpt.com
```
Trùng lặp y hệt nhau, mang tham số `utm_source=chatgpt.com` — dấu hiệu rõ ràng là link được copy trực tiếp từ 1 cuộc trò chuyện AI rồi dán nhầm vào file cấu hình môi trường đã commit, không liên quan tới nội dung `.env.example`. Không gây hại (chỉ là comment), nhưng là rác cần dọn trong 1 file lẽ ra phải là tài liệu tham khảo chuẩn cho mọi người deploy.

## 7. Startup behavior (server.ts)

### 7.1. `registerMongoLogger()` không bao giờ được gọi — tính năng debug log Mongo hoàn toàn chết (MEDIUM, CONFIRMED)

- `backend/src/config/database/mongo.logger.ts` export `registerMongoLogger()` — hàm này đọc `MONGO_DEBUG`/`MONGO_SLOW_MS`, và nếu `MONGO_DEBUG=true`, gắn `mongoose.set("debug", ...)` để log mọi query + cảnh báo query chậm + gợi ý thiếu index.
- Đã grep toàn bộ `backend/` cho `registerMongoLogger` — kết quả DUY NHẤT là chính định nghĩa của nó. **Không nơi nào gọi hàm này** — `server.ts` chỉ gọi `connectDB()`, `registerMongoEvents()`, `registerMongoShutdown()`, `registerCronJobs()`, KHÔNG có `registerMongoLogger()`.
- Hệ quả: dù `.env.example` dành hẳn 6 dòng comment giải thích chi tiết cách dùng `MONGO_DEBUG`/`MONGO_SLOW_MS` (kèm cả khuyến nghị bật/tắt khác nhau giữa dev/production), set 2 biến này thành BẤT KỲ GIÁ TRỊ GÌ đều **không có tác dụng thực tế nào** — tính năng debug/slow-query-log của Mongo chưa từng được kích hoạt trong luồng khởi động thật. Đây là dạng "tài liệu hứa hẹn 1 tính năng không tồn tại trong luồng chạy thật" — cùng bản chất với finding `RV16-01` (REVIEW-16, `permission.descriptors.ts`) dù mức độ ảnh hưởng thấp hơn (đây chỉ là tiện ích debug, không phải cơ chế bảo mật).
- Khuyến nghị (không thực hiện): thêm `registerMongoLogger()` vào `startServer()` trong `server.ts` (ngay sau `connectDB()`, cùng nhóm với `registerMongoEvents()`) nếu tính năng này còn cần dùng; nếu không còn cần, cân nhắc dọn hẳn file + 2 biến env liên quan.

### 7.2. Check `MONGO_URI` trong `server.ts` là dead code (LOW, CONFIRMED)

```ts
// server.ts
import { connectDB } from "./src/config/database/database";   // (1)
...
if (!process.env.PORT) { throw new Error("❌ PORT is not defined..."); }
if (!process.env.MONGO_URI) { throw new Error("❌ MONGO_URI is not defined..."); }  // (2)
```

```ts
// config/database/database.ts — top-level, chạy NGAY LÚC MODULE ĐƯỢC IMPORT
const MONGO_URI = process.env.MONGO_URI as string;
if (!MONGO_URI) {
  throw new Error("❌ Missing MONGO_URI in environment variables");   // (3)
}
```
- Vì `import` ở dòng (1) thực thi TRƯỚC mọi statement khác trong `server.ts` (kể cả check (2)), và module `database.ts` có code top-level (3) tự throw ngay khi thiếu `MONGO_URI` — nếu `MONGO_URI` thực sự thiếu, chương trình đã crash tại (3) từ lúc import, **KHÔNG BAO GIỜ chạy tới được dòng (2)**. Check (2) trong `server.ts` vì vậy là dead code — không sai (không gây lỗi gì), nhưng gây hiểu nhầm khi đọc code (tưởng đây là lớp bảo vệ đang hoạt động, thực tế lớp bảo vệ THẬT nằm ở nơi khác với message lỗi khác). Không áp dụng cho `PORT` — biến này không được validate ở đâu khác, nên check (2) cho `PORT` VẪN có tác dụng thật.
- Mức độ: LOW — hành vi cuối cùng (fail-fast khi thiếu `MONGO_URI`) vẫn đúng, chỉ là 2 lớp code trùng lặp, 1 lớp không bao giờ chạy tới.

### 7.3. Retry kết nối MongoDB không giới hạn số lần / không backoff (LOW, đã có chủ đích — ghi nhận không phải finding)

`database.ts:121-126`: khi `mongoose.connect()` thất bại, `setTimeout(connectDB, 5000)` retry lại sau đúng 5 giây, LẶP LẠI VÔ HẠN nếu MongoDB không bao giờ sẵn sàng — không có giới hạn số lần thử, không có backoff tăng dần. Comment tại chỗ xác nhận đây là chủ đích ("quan trọng cho Docker compose" — MongoDB container có thể khởi động chậm hơn app container). Chấp nhận được cho mục đích đó; rủi ro duy nhất là log spam vô hạn nếu MongoDB thật sự down dài hạn trong production — không phải bug, chỉ ghi nhận.

### 7.4. Thứ tự khởi động hợp lý

`connectDB()` → `registerMongoEvents()`/`registerMongoShutdown()` → `registerCronJobs()` (đã review kỹ ở REVIEW-15) → `http.createServer(app).listen()`. Thứ tự này đảm bảo cron job và HTTP server chỉ khởi động SAU khi DB sẵn sàng — đúng nguyên tắc, không phát hiện vấn đề.

## 8. Production configuration

- **Không có file cấu hình môi trường riêng cho production** (không có `.env.production`/config theo `NODE_ENV` phân tầng) — dự án dùng ĐÚNG 1 file `.env` cho mọi môi trường, phân biệt hành vi qua đọc trực tiếp `process.env.NODE_ENV === "development"` tại vài chỗ (`app.ts` bật `morgan("dev")`, `mongo.logger.ts` bật log chi tiết). Đây là pattern đơn giản, chấp nhận được ở quy mô hiện tại — không phải thiếu sót cần sửa ngay, chỉ ghi nhận KHÔNG có validation nào đảm bảo `NODE_ENV` được set đúng `"production"` khi deploy thật (nếu quên set, mặc định rơi vào nhánh "không phải development" — tắt log chi tiết, hành vi production hơn — đây là hướng fail an toàn, KHÔNG phải fail-open như finding CORS ở mục 6).
- **Không có CI/CD pipeline nào trong repo** (đã xác nhận ở mục 5) — không có gate tự động cho build/typecheck/test/audit trước khi merge hay deploy. Đây là root cause khiến finding ở mục 5 (thiếu file build) có thể tồn tại mà không ai phát hiện.
- **`helmet()` áp dụng mặc định, không custom CSP** (`app.ts:52`) — đủ cho baseline bảo vệ header phổ biến (X-Frame-Options, X-Content-Type-Options...), không có Content-Security-Policy tuỳ chỉnh — chấp nhận được cho 1 API thuần JSON (không serve HTML trực tiếp từ app này ngoài Swagger UI ở `/api-docs`), không phải finding.
- **`express.json({ limit: "10mb" })`** — giới hạn rõ ràng, hợp lý để chống request body quá lớn; đã đối chiếu với REVIEW-08/09 (upload dùng `multer` với `memoryStorage`, không đi qua `express.json`) — không xung đột.

## 9. Static assets

Đã review kỹ ở mục 5 — 2 tài nguyên tĩnh cần copy thủ công sang `dist/` là `src/docs/openAPI.yaml` và `src/views/email/forgotPassword.ejs` (cả 2 file nguồn ĐÃ được commit đúng trong git, chỉ riêng SCRIPT COPY chúng là bị thiếu). Không phát hiện tài nguyên tĩnh nào khác bị bỏ sót trong danh sách mà `copy-static-assets.js` xử lý (logic của script là generic — copy MỌI file không phải `.ts` trong `src/`, không phải liệt kê cứng từng file, nên sẽ tự động bắt được asset mới nếu có mà không cần sửa script).

## 10. Tổng hợp finding

| # | Mức độ | Hạng mục | Tóm tắt |
|---|---|---|---|
| 1 | **HIGH** | Build / Git hygiene | `scripts/copy-static-assets.js` (và 4 script khác, gồm `seed-rbac.ts` đang dùng thật) bị `.gitignore` chặn hoàn toàn khỏi git — `npm run build` sẽ THẤT BẠI trên môi trường mới clone từ repo; không có CI/CD nào bắt lỗi này trước khi xảy ra thật |
| 2 | MEDIUM | Dependencies | 5 package xác nhận KHÔNG dùng ở đâu trong `src/`: `docx`, `swagger-jsdoc`, `mongoose-to-swagger`, `file-saver` (browser-only, sai runtime), `@tailwindcss/vite` (frontend tool, không có config liên quan) |
| 3 | MEDIUM | Dependencies / Supply-chain | `fs`/`path` được cài như npm package dù là module built-in của Node — `fs@0.0.1-security` là package rỗng hoàn toàn (security holding), `path@0.12.7` là bản copy cũ từ bên thứ 3; không gây lỗi runtime (Node ưu tiên core module) nhưng là dependency thừa, gây khó hiểu khi audit |
| 4 | MEDIUM | Environment variables / Security | `CLIENT_URL` không fail-fast; khi thiếu, `cors({origin: process.env.CLIENT_URL, credentials:true})` rơi vào fail-OPEN (`Access-Control-Allow-Origin: *`) thay vì fail-closed — hướng lỗi nguy hiểm hơn `RV00-05` (JWT_SECRET) dù bề mặt tấn công thực tế hạn chế vì auth model là JWT Bearer, không phải cookie-based CORS-dependent |
| 5 | MEDIUM | Startup behavior / Dead feature | `registerMongoLogger()` không bao giờ được gọi trong `server.ts` — toàn bộ tính năng debug/slow-query-log Mongo (được `.env.example` tài liệu hoá chi tiết qua `MONGO_DEBUG`/`MONGO_SLOW_MS`) chưa từng hoạt động |
| 6 | LOW | Startup behavior | Check `MONGO_URI` trong `server.ts` là dead code — `database.ts` đã throw sớm hơn ở module-import time với message khác |
| 7 | LOW | Version compatibility | Thiếu field `"engines"` trong `package.json` dù `mongoose` (>=20.19.0) yêu cầu Node cao hơn `express` (>=18) — không có cảnh báo npm nếu deploy nhầm Node quá cũ |
| 8 | LOW | Build hygiene | Build script không dọn `dist/` cũ trước khi biên dịch lại (không có `rimraf`/tương đương) — file `.ts` bị xoá khỏi `src/` để lại `.js` mồ côi trong `dist/` |
| 9 | LOW | Documentation | `.env.example`: `CLIENT_URL` khai trùng 2 lần ở 2 section khác nhau không giải thích vai trò kép; thiếu khai báo `MONGO_MAX_POOL_SIZE`/`MONGO_MIN_POOL_SIZE` (đã dùng thật trong code); 2 dòng rác cuối file (link kèm `utm_source=chatgpt.com`, trùng lặp) |
| 10 | LOW | package.json hygiene | `"main": "index.js"` không khớp entry point thật (`server.ts` → `dist/server.js`) — file `index.js` không tồn tại; vô hại vì app không bao giờ được `require()` như 1 thư viện, nhưng là field lạc hậu/gây nhầm |

**Không phát hiện**: circular/xung đột phiên bản peer dependency giữa Express 5 và middleware đi kèm; secret/credential nào bị hard-code trong `config/`/`scripts/` đã đọc; static asset nguồn nào bị thiếu trong git (chỉ THIẾU SCRIPT COPY chúng, bản thân asset đã tracked đúng).

## 11. Cross-reference với review khác

- Finding #4 (CORS fail-open) cùng nhóm nguyên nhân gốc ("biến môi trường bảo mật không fail-fast") với `RV00-05` (REVIEW-00, `JWT_SECRET`/`JWT_REFRESH_SECRET`) và `RV10-04` (REVIEW-10, SMTP config không fail-fast) — cả 3 review độc lập cùng chỉ ra 1 pattern lặp lại trong project: thiếu 1 bước validate tập trung các biến môi trường bắt buộc ngay lúc khởi động (`server.ts` hiện chỉ validate `PORT`/`MONGO_URI`).
- Finding #5 (`registerMongoLogger` chết) cùng bản chất "tài liệu hứa hẹn tính năng không hoạt động thật" với `RV16-01` (REVIEW-16, `permission.descriptors.ts`) — khác mức độ nghiêm trọng (debug tool vs security guard).

## 12. Ghi chú ngoài scope (không xử lý trong review này)

- Không chạy `npm audit`/`npm outdated` (không có script sẵn trong project, và đây là review-only — không tự ý chạy lệnh có thể gọi mạng ngoài phạm vi được yêu cầu). Khuyến nghị người có thẩm quyền tự chạy định kỳ.
- Nội dung chi tiết 4 script còn lại trong `scripts/` (`ma-chay-script.ts`, `seed-assets.ts`, `seed-assignment-history.ts`, `repair-orphaned-user-roles.ts`, `seed-medical-devices.ts`, `backup-mongo.ps1`) — chỉ xác nhận trạng thái git, KHÔNG review sâu logic bên trong (ngoài phạm vi câu hỏi review, vốn tập trung vào config/dependency/build).
- Quyết định sửa `.gitignore` + `git add` 5 file thiếu (finding #1) — cần người có thẩm quyền phê duyệt và thực hiện, không xử lý trong review-only này.

---
**Không có code nào bị sửa, không có package nào được upgrade trong quá trình review này**, đúng yêu cầu "Không tự upgrade package... Không sửa code. DỪNG."

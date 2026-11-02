/**
 * copy-static-assets.js
 * ======================
 * `tsc` CHỈ compile file `.ts` — mọi file khác trong `src/` (yaml, ejs,
 * ảnh, v.v.) bị bỏ qua hoàn toàn, không được copy sang `dist/`.
 *
 * Project này có 2 file tài nguyên tĩnh bị đọc lúc RUNTIME nhưng không hề
 * tồn tại trong `dist/` sau khi build:
 *   - src/docs/openAPI.yaml        (đọc bởi config/swagger/swagger.ts,
 *                                    NGAY LÚC IMPORT MODULE, không lazy)
 *   - src/views/email/forgotPassword.ejs  (đọc lúc gửi email quên mật khẩu)
 *
 * Hậu quả trước khi có script này: chạy `npm run build && npm start`
 * (đúng flow production) sẽ CRASH NGAY LÚC KHỞI ĐỘNG với lỗi
 * "ENOENT: no such file or directory, open '.../dist/src/docs/openAPI.yaml'"
 * vì swagger.ts đọc file này ngay khi module được import, trước khi app
 * kịp start. Tính năng quên mật khẩu cũng sẽ lỗi vì thiếu file ejs.
 *
 * Script này chạy ngay sau `tsc` (xem package.json), quét toàn bộ `src/`,
 * copy mọi file KHÔNG PHẢI `.ts` sang `dist/` với cùng cấu trúc thư mục.
 * Viết bằng plain Node.js (không dùng thêm dependency ngoài) để không phải
 * cài thêm package chỉ cho 1 việc copy file đơn giản.
 */
const fs = require("fs");
const path = require("path");

const SRC_DIR = path.join(__dirname, "..", "src");
const DIST_SRC_DIR = path.join(__dirname, "..", "dist", "src");

let copiedCount = 0;

function copyStaticAssets(currentSrcDir, currentDistDir) {
  const entries = fs.readdirSync(currentSrcDir, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(currentSrcDir, entry.name);

    if (entry.isDirectory()) {
      copyStaticAssets(srcPath, path.join(currentDistDir, entry.name));
      continue;
    }

    if (entry.name.endsWith(".ts")) continue; // tsc đã lo phần này rồi

    fs.mkdirSync(currentDistDir, { recursive: true });
    const distPath = path.join(currentDistDir, entry.name);
    fs.copyFileSync(srcPath, distPath);
    copiedCount += 1;
    console.log(`[copy-static-assets] src/${path.relative(SRC_DIR, srcPath)} -> dist/src/${path.relative(SRC_DIR, srcPath)}`);
  }
}

copyStaticAssets(SRC_DIR, DIST_SRC_DIR);

if (copiedCount === 0) {
  console.warn("[copy-static-assets] Không có file tài nguyên tĩnh nào được copy - kiểm tra lại nếu bạn vừa thêm file mới ngoài .ts vào src/.");
} else {
  console.log(`[copy-static-assets] Xong - đã copy ${copiedCount} file tài nguyên tĩnh sang dist/.`);
}
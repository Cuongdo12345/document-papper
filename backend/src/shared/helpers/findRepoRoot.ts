import fs from "fs";
import path from "path";

/**
 * DEV-074/DEV-075 — tìm thư mục repo root bằng cách đi lên từ `__dirname`
 * (của file GỌI hàm này, truyền vào qua tham số) tới khi thấy
 * `docs/development/tasks` tồn tại — KHÔNG hard-code số cấp cố định
 * ("../../..") vì độ sâu `__dirname` khác nhau giữa dev (`ts-node`, chạy
 * trực tiếp từ `backend/src/...`) và prod (`node dist/...`, chạy từ
 * `backend/dist/src/...`, thêm 1 cấp `dist/`). Cách đi-lên-tới-khi-thấy-
 * marker này đúng ở cả 2 môi trường mà không cần biết trước cấu trúc build.
 *
 * Tách riêng khỏi `services/systemDesign/relatedDocs.ts` (DEV-074, nơi hàm
 * này ban đầu được viết) vì `services/projectDocs/` (DEV-075) cũng cần y hệt
 * logic này — CLAUDE.md §11 "Existing Implementation First", không viết lại.
 */
export function findRepoRoot(fromDir: string): string | undefined {
  let dir = fromDir;
  for (let i = 0; i < 10; i++) {
    if (fs.existsSync(path.join(dir, "docs", "development", "tasks"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
  return undefined;
}

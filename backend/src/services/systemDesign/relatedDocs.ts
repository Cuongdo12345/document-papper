import fs from "fs";
import path from "path";
import { findRepoRoot } from "../../shared/helpers/findRepoRoot";
import { getOrSetCacheSync } from "../../shared/cache/memoryCache";

/**
 * DEV-074 (2026-09-21) — quét `docs/development/tasks/*.md` +
 * `docs/frontend/tasks/*.md`, tìm file nào có nhắc đường dẫn thật của 1
 * module (`models/<module>/` hoặc `features/<module>/`). KHÔNG hard-code tay
 * danh sách quan hệ module↔task — kết quả suy hoàn toàn từ nội dung file thật.
 *
 * BR-21 (DEV-107, 2026-09-30): bản đầu đọc đồng bộ ~150 file (~1,3MB) rồi dò
 * chuỗi ở MỖI request, ~40ms chặn cả server (đo: ~22ms đọc đĩa + ~17ms dò
 * chuỗi). Nay cache KẾT QUẢ CUỐI (map module → tài liệu liên quan) trong RAM
 * `RELATED_DOCS_CACHE_TTL_MS` (60 giây, user chọn) — chỉ lần đầu mỗi phút mới
 * đọc đĩa và dò. (Chỉ cache nội dung file thì vẫn còn ~18ms dò chuỗi mỗi
 * request, nên phải cache kết quả cuối.) ĐÁNH ĐỔI: thêm/sửa file task xong,
 * trang System Design có thể chậm tối đa 60 giây mới thấy (khởi động lại server
 * là thấy ngay).
 */
export const RELATED_DOCS_CACHE_TTL_MS = 60_000;

export interface RelatedDoc {
  /** Đường dẫn repo-relative, VD "docs/development/tasks/DEV-056.md". */
  path: string;
  /** URL GitHub thật, VD "https://github.com/Cuongdo12345/document-papper/blob/main/docs/development/tasks/DEV-056.md". */
  url: string;
}

const GITHUB_BLOB_BASE = "https://github.com/Cuongdo12345/document-papper/blob/main/";
const TASK_SUBDIRS = [
  ["docs", "development", "tasks"],
  ["docs", "frontend", "tasks"],
];

function toPosixPath(p: string): string {
  return p.split(path.sep).join("/");
}

/** Trả về toàn bộ `.md` trong `docs/development/tasks/` + `docs/frontend/tasks/`, kèm nội dung, đọc 1 lần cho mọi module. */
function readAllTaskFiles(repoRoot: string): { repoPath: string; content: string }[] {
  const files: { repoPath: string; content: string }[] = [];

  for (const subdir of TASK_SUBDIRS) {
    const dirPath = path.join(repoRoot, ...subdir);
    if (!fs.existsSync(dirPath)) continue;

    for (const fileName of fs.readdirSync(dirPath)) {
      if (!fileName.endsWith(".md")) continue;
      const filePath = path.join(dirPath, fileName);
      const content = fs.readFileSync(filePath, "utf-8");
      files.push({ repoPath: toPosixPath(path.relative(repoRoot, filePath)), content });
    }
  }

  return files;
}

/**
 * Với mỗi module, tìm trong `taskFiles` (đã đọc sẵn 1 lần) file nào có chứa
 * substring `models/<module>/` hoặc `features/<module>/` — khớp đúng yêu cầu
 * gốc, không phân biệt module có thư mục FE tương ứng hay không (nếu không
 * có, pattern `features/<module>/` đơn giản không match được file nào, đó là
 * kết quả đúng chứ không phải lỗi).
 */
export function buildRelatedDocsMap(moduleNames: string[]): Map<string, RelatedDoc[]> {
  const repoRoot = findRepoRoot(__dirname);
  if (!repoRoot) return new Map(moduleNames.map((name) => [name, [] as RelatedDoc[]]));

  // Khoá gồm cả danh sách module (sắp xếp để không phụ thuộc thứ tự). Giá trị
  // cache được dùng chung giữa các request: nơi gọi KHÔNG được sửa mảng bên trong.
  const cacheKey = `systemDesign:relatedDocs:${repoRoot}:${[...moduleNames].sort().join(",")}`;
  const cached = getOrSetCacheSync(cacheKey, RELATED_DOCS_CACHE_TTL_MS, () => scanRelatedDocs(repoRoot, moduleNames));
  return new Map(cached);
}

/** Đọc file thật + dò chuỗi — phần TỐN KÉM, chỉ chạy khi cache hết hạn. */
function scanRelatedDocs(repoRoot: string, moduleNames: string[]): Map<string, RelatedDoc[]> {
  const result = new Map<string, RelatedDoc[]>();
  for (const name of moduleNames) result.set(name, []);

  const taskFiles = readAllTaskFiles(repoRoot);

  for (const name of moduleNames) {
    const patterns = [`models/${name}/`, `features/${name}/`];
    const matches: RelatedDoc[] = [];

    for (const file of taskFiles) {
      if (patterns.some((p) => file.content.includes(p))) {
        matches.push({ path: file.repoPath, url: `${GITHUB_BLOB_BASE}${file.repoPath}` });
      }
    }

    result.set(
      name,
      matches.sort((a, b) => a.path.localeCompare(b.path)),
    );
  }

  return result;
}

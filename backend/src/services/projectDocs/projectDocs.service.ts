import fs from "fs";
import path from "path";
import { findRepoRoot } from "../../shared/helpers/findRepoRoot";

/**
 * DEV-075 (2026-09-21) — phục vụ trang "Tài liệu dự án": đọc TRỰC TIẾP 12
 * file phân tích tổng quan gốc `docs/01_PROJECT_OVERVIEW.md` →
 * `docs/13_FINAL_PROJECT_REPORT.md` (bỏ qua `06_FRONTEND_ANALYSIS.md` — đã
 * xác nhận KHÔNG tồn tại, xem CLAUDE.md §4 — và `00_PROJECT_MEMORY.md`, đây
 * là memory/index chứ không phải 1 trong 13 phase phân tích, đúng phạm vi
 * user chọn). KHÔNG copy nội dung sang DB/JSON tĩnh — đọc thẳng file mỗi lần
 * gọi API, tránh lặp lại đúng vấn đề "dữ liệu tĩnh lệch schema" đã xảy ra ở
 * FE-23 (xem DEV-073).
 */

export interface ProjectDocSummary {
  /** Tên file không đuôi ".md", VD "01_PROJECT_OVERVIEW". */
  id: string;
  /** Tiêu đề — dòng H1 đầu tiên của file (bỏ "# "). */
  title: string;
}

export interface ProjectDoc extends ProjectDocSummary {
  /** Đường dẫn repo-relative, VD "docs/01_PROJECT_OVERVIEW.md". */
  path: string;
  /** URL GitHub blob thật. */
  url: string;
  /** Nội dung markdown thô, đọc trực tiếp từ file. */
  content: string;
}

const GITHUB_BLOB_BASE = "https://github.com/Cuongdo12345/document-papper/blob/main/";
// "01"→"13" nhưng KHÔNG hard-code từng tên file — quét thư mục thật, chỉ lọc
// đúng dải số 01-13 (loại 00_PROJECT_MEMORY.md và mọi file 14+ audit/review).
const DOC_ID_PATTERN = /^(0[1-9]|1[0-3])_[A-Z0-9_]+$/;

function getDocsDir(): string | undefined {
  const repoRoot = findRepoRoot(__dirname);
  return repoRoot ? path.join(repoRoot, "docs") : undefined;
}

function extractTitle(content: string): string {
  const firstLine = content.split(/\r?\n/, 1)[0] ?? "";
  return firstLine.replace(/^#+\s*/, "").trim();
}

/** Danh sách 12 tài liệu tổng quan (01-13), sort theo số thứ tự thật trong tên file. */
export function listProjectDocsService(): ProjectDocSummary[] {
  const docsDir = getDocsDir();
  if (!docsDir || !fs.existsSync(docsDir)) return [];

  const summaries: ProjectDocSummary[] = [];
  for (const fileName of fs.readdirSync(docsDir)) {
    if (!fileName.endsWith(".md")) continue;
    const id = fileName.slice(0, -3);
    if (!DOC_ID_PATTERN.test(id)) continue;

    const content = fs.readFileSync(path.join(docsDir, fileName), "utf-8");
    summaries.push({ id, title: extractTitle(content) || id });
  }

  return summaries.sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Đọc nội dung 1 tài liệu theo `id` — CHỈ chấp nhận `id` nằm trong danh sách
 * đã quét được ở `listProjectDocsService()` (không nối chuỗi `id` trực tiếp
 * vào path rồi tin tưởng regex 1 lớp) — chặn path traversal 2 lớp: regex
 * format + đối chiếu whitelist file thật đang tồn tại trên đĩa.
 */
export function getProjectDocService(id: string): ProjectDoc | undefined {
  if (!DOC_ID_PATTERN.test(id)) return undefined;

  const docsDir = getDocsDir();
  if (!docsDir) return undefined;

  const available = listProjectDocsService();
  if (!available.some((d) => d.id === id)) return undefined;

  const fileName = `${id}.md`;
  const filePath = path.join(docsDir, fileName);
  if (!fs.existsSync(filePath)) return undefined;

  const content = fs.readFileSync(filePath, "utf-8");
  const repoPath = `docs/${fileName}`;

  return {
    id,
    title: extractTitle(content) || id,
    path: repoPath,
    url: `${GITHUB_BLOB_BASE}${repoPath}`,
    content,
  };
}

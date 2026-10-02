/**
 * DEV-075/FE-26 (2026-09-21) — khớp response THẬT của `GET /api/project-docs`
 * + `GET /api/project-docs/:id` (`backend/src/services/projectDocs/projectDocs.service.ts`).
 */

export interface ProjectDocSummary {
  /** Tên file không đuôi ".md", VD "01_PROJECT_OVERVIEW". */
  id: string;
  /** Tiêu đề — dòng H1 đầu tiên của file. */
  title: string;
}

export interface ProjectDoc extends ProjectDocSummary {
  /** Đường dẫn repo-relative, VD "docs/01_PROJECT_OVERVIEW.md". */
  path: string;
  /** URL GitHub blob thật. */
  url: string;
  /** Nội dung markdown thô. */
  content: string;
}

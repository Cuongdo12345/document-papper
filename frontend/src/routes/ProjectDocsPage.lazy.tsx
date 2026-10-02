import { lazy } from "react";

/**
 * DEV-075/FE-26 — tách riêng file chỉ để wrap `React.lazy` (cùng lý do
 * `SystemDesignPage.lazy.tsx`, tránh warning `only-export-components` của
 * oxlint ở `routes/index.tsx`). `react-markdown`/`remark-gfm` (mới cài) chỉ
 * tải khi vào đúng route `/app/project-docs`, không nằm trong bundle chính.
 */
export const ProjectDocsPage = lazy(() =>
  import("@/features/projectDocs/pages/ProjectDocsPage").then((m) => ({ default: m.ProjectDocsPage })),
);

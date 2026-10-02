import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { parseApiError } from "@/utils/parseApiError";
import { useProjectDocs } from "@/features/projectDocs/hooks/useProjectDocs";
import { useProjectDoc } from "@/features/projectDocs/hooks/useProjectDoc";
import { ProjectDocsSidebar } from "@/features/projectDocs/components/ProjectDocsSidebar";
import { ProjectDocMarkdown } from "@/features/projectDocs/components/ProjectDocMarkdown";

/**
 * DEV-075/FE-26 (2026-09-21) — trang "Tài liệu dự án": 12 tài liệu phân tích
 * tổng quan gốc 01-13 (`docs/01_PROJECT_OVERVIEW.md` →
 * `docs/13_FINAL_PROJECT_REPORT.md`), đọc trực tiếp từ `GET /api/project-docs`
 * (DEV-075) — KHÔNG copy nội dung sang chỗ khác. Layout 2 cột: sidebar danh
 * sách (trái) + nội dung markdown đã render (phải, `react-markdown` +
 * `remark-gfm`, mới cài — xác nhận với user trước khi thêm).
 */
export function ProjectDocsPage() {
  const listQuery = useProjectDocs();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Suy giá trị chọn mặc định (tài liệu đầu tiên) NGAY TRONG render thay vì
  // qua useEffect+setState (tránh cascading render — đúng gợi ý lint
  // `set-state-in-effect`) — user click sẽ ghi đè qua `setSelectedId` như
  // bình thường, giá trị suy này chỉ là fallback khi chưa click gì.
  const effectiveSelectedId = selectedId ?? listQuery.data?.[0]?.id ?? null;

  const docQuery = useProjectDoc(effectiveSelectedId);

  return (
    <div className="flex h-full min-h-150 flex-col gap-4">
      <PageHeader
        title="Tài liệu dự án"
        description="12 tài liệu phân tích tổng quan gốc (cấu trúc dự án, kiến trúc, database, API, RBAC, bảo mật, hiệu năng...) — đọc trực tiếp từ repo, không qua bản sao tĩnh."
      />

      {listQuery.isLoading && <LoadingState variant="spinner" label="Đang tải danh sách tài liệu..." />}
      {listQuery.isError && <ErrorState message={parseApiError(listQuery.error).message} onRetry={() => listQuery.refetch()} />}

      {listQuery.data && (
        <div className="flex min-h-0 flex-1 gap-4">
          <ProjectDocsSidebar docs={listQuery.data} selectedId={effectiveSelectedId} onSelect={setSelectedId} />

          <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-border bg-card p-6">
            {docQuery.isLoading && <LoadingState variant="spinner" label="Đang tải nội dung..." />}
            {docQuery.isError && <ErrorState message={parseApiError(docQuery.error).message} onRetry={() => docQuery.refetch()} />}
            {docQuery.data && (
              <>
                <a
                  href={docQuery.data.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mb-4 inline-block text-xs text-muted-foreground underline-offset-2 hover:text-primary hover:underline"
                >
                  Xem trên GitHub — {docQuery.data.path}
                </a>
                <ProjectDocMarkdown content={docQuery.data.content} />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

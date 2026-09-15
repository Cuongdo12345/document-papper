import { useState } from "react";
import { ErrorState } from "@/components/shared/ErrorState";
import { useDocumentVersions } from "@/features/documents/hooks/useDocumentVersions";
import { DocumentVersionViewModal } from "@/features/documents/components/DocumentVersionViewModal";
import { parseApiError } from "@/utils/parseApiError";
import type { Document, DocumentVersion } from "@/types/document.types";

const SECTION_CLASS = "space-y-3 rounded-lg border border-border bg-card p-4";

/**
 * Roadmap A4 (2026-09-15, user chỉ định implement) — "Lịch sử phiên bản tài
 * liệu". CHỈ ĐỌC (xem quyết định thiết kế ở `DocumentVersionViewModal`).
 * Section riêng trong `DocumentDetailPage` — cùng pattern "Biên bản liên
 * quan"/"Workflow" (luôn hiện, kể cả khi rỗng, để user biết tính năng tồn
 * tại thay vì tự ẩn im lặng).
 */
export function DocumentVersionHistory({ document }: { document: Document }) {
  const [viewing, setViewing] = useState<DocumentVersion | null>(null);
  const query = useDocumentVersions(document._id, true);
  const versions = query.data ?? [];

  return (
    <div className={SECTION_CLASS}>
      <h2 className="text-sm font-semibold text-foreground">Lịch sử chỉnh sửa nội dung</h2>

      {query.isLoading && <p className="text-sm text-muted-foreground">Đang tải...</p>}
      {query.isError && <ErrorState message={parseApiError(query.error).message} onRetry={() => query.refetch()} />}
      {query.data && versions.length === 0 && (
        <p className="text-sm text-muted-foreground">Tài liệu chưa từng được chỉnh sửa lần nào.</p>
      )}

      {versions.length > 0 && (
        <ul className="space-y-2">
          {versions.map((v) => (
            <li
              key={v._id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <div>
                <span className="font-medium text-foreground">Phiên bản {v.versionNumber}</span>
                <span className="text-xs text-muted-foreground">
                  {" — "}
                  {v.editedBy?.fullName ?? "—"}, {new Date(v.editedAt).toLocaleString("vi-VN")}
                </span>
              </div>
              <button type="button" onClick={() => setViewing(v)} className="text-primary hover:underline">
                Xem nội dung
              </button>
            </li>
          ))}
        </ul>
      )}

      {viewing && (
        <DocumentVersionViewModal
          key={viewing._id}
          open={!!viewing}
          onClose={() => setViewing(null)}
          subType={document.subType}
          version={viewing}
        />
      )}
    </div>
  );
}

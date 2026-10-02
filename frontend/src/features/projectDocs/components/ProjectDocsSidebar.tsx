import { cn } from "@/lib/utils";
import type { ProjectDocSummary } from "@/types/projectDocs.types";

interface ProjectDocsSidebarProps {
  docs: ProjectDocSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/** DEV-075/FE-26 — danh sách 12 tài liệu tổng quan, panel trái cố định (không cuộn cùng nội dung bên phải). */
export function ProjectDocsSidebar({ docs, selectedId, onSelect }: ProjectDocsSidebarProps) {
  return (
    <nav className="w-64 shrink-0 space-y-1 overflow-y-auto rounded-lg border border-border bg-card p-2">
      {docs.map((doc) => (
        <button
          key={doc.id}
          type="button"
          onClick={() => onSelect(doc.id)}
          className={cn(
            "block w-full truncate rounded-md px-3 py-2 text-left text-sm transition-colors",
            selectedId === doc.id ? "bg-primary/10 font-medium text-primary" : "text-foreground hover:bg-muted",
          )}
          title={doc.title}
        >
          {doc.title}
        </button>
      ))}
    </nav>
  );
}

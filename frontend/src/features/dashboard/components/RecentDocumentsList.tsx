import { Link } from "react-router-dom";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { Document, DocumentCategory } from "@/types/document.types";

interface RecentDocumentsListProps {
  documents: Document[];
}

/** Chỉ 3 giá trị, ổn định (`DOCUMENT_CATEGORIES`) — không cần import label map đầy đủ từ `DocumentsListPage.tsx` (không export) cho widget gọn này. */
const CATEGORY_LABEL: Record<DocumentCategory, string> = {
  PROPOSAL: "Đề xuất",
  REPORT: "Biên bản",
  REFERENCE: "Tham khảo",
};

/** FE-09 — "5 tài liệu mới nhất", dùng cho cả Admin Summary lẫn Department Summary (cùng shape `recentDocuments: Document[]`). */
export function RecentDocumentsList({ documents }: RecentDocumentsListProps) {
  const columns: DataTableColumn<Document>[] = [
    {
      key: "documentCode",
      header: "Mã",
      className: "font-mono",
      render: (row) => (
        <Link to={`/app/documents/${row._id}`} className="font-medium text-foreground hover:underline">
          {row.documentCode}
        </Link>
      ),
    },
    {
      key: "title",
      header: "Tiêu đề",
      className: "max-w-56 truncate",
      render: (row) => (
        <span className="block truncate" title={row.title}>
          {row.title}
        </span>
      ),
    },
    { key: "category", header: "Loại", render: (row) => <StatusBadge variant="default">{CATEGORY_LABEL[row.category]}</StatusBadge> },
    {
      key: "department",
      header: "Khoa/Phòng",
      className: "max-w-44 truncate",
      render: (row) => (
        <span className="block truncate" title={row.department?.name}>
          {row.department?.name ?? "—"}
        </span>
      ),
    },
    {
      key: "createdBy",
      header: "Người tạo",
      className: "max-w-36 truncate",
      render: (row) => (
        <span className="block truncate" title={row.createdBy?.fullName}>
          {row.createdBy?.fullName ?? "—"}
        </span>
      ),
    },
    { key: "createdAt", header: "Ngày tạo", render: (row) => new Date(row.createdAt).toLocaleDateString("vi-VN") },
  ];

  return <DataTable columns={columns} data={documents} keyExtractor={(row) => row._id} emptyTitle="Chưa có tài liệu nào" />;
}

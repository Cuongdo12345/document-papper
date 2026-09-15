import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Eye, Pencil, Trash2, RotateCcw, ListX } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { FilterBar } from "@/components/shared/FilterBar";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { Pagination } from "@/components/shared/Pagination";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { WorkflowStatusBadge } from "@/features/documents/components/WorkflowStatusBadge";
import { DocumentEditModal } from "@/features/documents/components/DocumentEditModal";
import { DeleteByMonthModal } from "@/features/documents/components/DeleteByMonthModal";
import { DocumentExcelMenu } from "@/features/documents/components/DocumentExcelMenu";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { PERMISSIONS } from "@/constants/permissions";
import { useDocuments } from "@/features/documents/hooks/useDocuments";
import { useDeleteDocument } from "@/features/documents/hooks/useDeleteDocument";
import { useRestoreDocument } from "@/features/documents/hooks/useRestoreDocument";
import { useDepartments } from "@/features/departments/hooks/useDepartments";
import { useDebounce } from "@/hooks/useDebounce";
import { parseApiError } from "@/utils/parseApiError";
import {
  DOCUMENT_CATEGORIES,
  SUB_TYPES_BY_CATEGORY,
  WORKFLOW_STATUSES,
  type Document,
  type DocumentCategory,
  type DocumentSubType,
  type WorkflowStatus,
} from "@/types/document.types";

const LIMIT = 10;

const CATEGORY_LABEL: Record<DocumentCategory, string> = {
  PROPOSAL: "Đề xuất",
  REPORT: "Biên bản",
  REFERENCE: "Tham khảo",
};
const SUB_TYPE_LABEL: Record<DocumentSubType, string> = {
  PROPOSE_REPAIR: "Đề xuất sửa chữa",
  PROPOSE_INK: "Đề xuất thay mực",
  PROPOSE_PROCUREMENT: "Đề xuất mua sắm",
  CHECK_DAMAGE: "Kiểm tra hư hỏng",
  CONFIRM_STATUS: "Xác nhận tình trạng",
  MANUAL: "Hướng dẫn",
};
const WORKFLOW_STATUS_LABEL: Record<WorkflowStatus, string> = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Từ chối",
  cancelled: "Đã huỷ",
  completed: "Hoàn tất",
};

export function DocumentsListPage() {
  const navigate = useNavigate();
  const isAdmin = useIsAdmin();

  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState<DocumentCategory | "">("");
  const [subType, setSubType] = useState<DocumentSubType | "">("");
  const [department, setDepartment] = useState("");
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus | "">("");
  const [isActive, setIsActive] = useState<"true" | "false" | "">("true");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sortBy, setSortBy] = useState<"createdAt" | "updatedAt" | "title" | "documentCode" | "serviceDate" | "actualCost">("createdAt");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const debouncedKeyword = useDebounce(keyword);

  const [editTarget, setEditTarget] = useState<Document | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Document | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<Document | null>(null);
  const [deleteByMonthOpen, setDeleteByMonthOpen] = useState(false);

  function handleSortChange(key: string) {
    if (key === sortBy) {
      setOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key as typeof sortBy);
      setOrder("asc");
    }
    setPage(1);
  }

  function resetFilters() {
    setKeyword("");
    setCategory("");
    setSubType("");
    setDepartment("");
    setWorkflowStatus("");
    setIsActive("true");
    setFromDate("");
    setToDate("");
    setPage(1);
  }

  // `enabled: isAdmin` — dropdown filter "Khoa/Phòng" chỉ hiển thị cho ADMIN
  // (xem block JSX bên dưới, DEV-030); tắt hẳn query cho non-admin thay vì
  // gọi ngầm 1 request `GET /departments` chắc chắn 403 với role USER (chỉ
  // IT mới có `DEPARTMENT_VIEW`) mà không dùng kết quả vào đâu.
  const departmentsQuery = useDepartments({ limit: 100 }, { enabled: isAdmin });
  const query = useDocuments({
    page,
    limit: LIMIT,
    keyword: debouncedKeyword || undefined,
    category: category || undefined,
    subType: subType || undefined,
    department: department || undefined,
    workflowStatus: workflowStatus || undefined,
    isActive: isActive === "" ? undefined : isActive === "true",
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
    sortBy,
    order,
  });
  const deleteMutation = useDeleteDocument();
  const restoreMutation = useRestoreDocument();

  const documents = query.data?.data ?? [];
  const pagination = query.data?.pagination;

  const columns: DataTableColumn<Document>[] = [
    { key: "documentCode", header: "Mã", className: "font-mono", sortKey: "documentCode" },
    {
      key: "title",
      header: "Tiêu đề",
      sortKey: "title",
      render: (row) => (
        <Link to={`/app/documents/${row._id}`} className="font-medium text-primary hover:underline">
          {row.title}
        </Link>
      ),
    },
    {
      key: "category",
      header: "Loại",
      render: (row) => (
        <span className="text-xs">
          {CATEGORY_LABEL[row.category]} · {SUB_TYPE_LABEL[row.subType]}
        </span>
      ),
    },
    { key: "department", header: "Khoa/Phòng", render: (row) => row.department?.name ?? "—" },
    { key: "workflowStatus", header: "Trạng thái", render: (row) => <WorkflowStatusBadge status={row.workflowStatus} /> },
    {
      key: "isActive",
      header: "Hoạt động",
      render: (row) => (
        <StatusBadge variant={row.isActive ? "success" : "default"}>{row.isActive ? "Đang hoạt động" : "Đã ẩn"}</StatusBadge>
      ),
    },
    {
      key: "createdAt",
      header: "Ngày tạo",
      sortKey: "createdAt",
      render: (row) => new Date(row.createdAt).toLocaleDateString("vi-VN"),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Tài liệu"
        description="Quản lý đề xuất, biên bản, tài liệu tham khảo."
        actions={
          <div className="flex gap-2">
            {isAdmin && (
              <Button variant="secondary" size="sm" onClick={() => setDeleteByMonthOpen(true)}>
                <ListX /> Xoá theo tháng
              </Button>
            )}
            <DocumentExcelMenu />
            <PermissionGuard permission={PERMISSIONS.DOCUMENT_CREATE}>
              <Button size="sm" onClick={() => navigate("/app/documents/create")}>
                <Plus /> Tạo đề xuất
              </Button>
            </PermissionGuard>
          </div>
        }
      />

      <FilterBar onReset={resetFilters}>
        <div className="min-w-48 space-y-1.5">
          <label htmlFor="doc-search" className="text-xs font-medium text-muted-foreground">
            Tìm kiếm (mã/tiêu đề)
          </label>
          <input
            id="doc-search"
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value);
              setPage(1);
            }}
            placeholder="Nhập mã hoặc tiêu đề..."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="min-w-40 space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Loại tài liệu</label>
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value as DocumentCategory | "");
              setSubType("");
              setPage(1);
            }}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Tất cả</option>
            {DOCUMENT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-44 space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Phân loại chi tiết</label>
          <select
            value={subType}
            onChange={(e) => {
              setSubType(e.target.value as DocumentSubType | "");
              setPage(1);
            }}
            disabled={!category}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          >
            <option value="">Tất cả</option>
            {(category ? SUB_TYPES_BY_CATEGORY[category] : []).map((st) => (
              <option key={st} value={st}>
                {SUB_TYPE_LABEL[st]}
              </option>
            ))}
          </select>
        </div>

        {/*
          DEV-030 (bổ sung): backend giờ ÉP `department` theo khoa của người
          gọi cho non-admin, GHI ĐÈ bất kỳ giá trị query nào (xem
          `document.service.ts::getAllDocumentsService`) — filter này với
          non-admin sẽ luôn vô hiệu (chọn khoa khác cũng chỉ trả về đúng khoa
          của họ), gây hiểu nhầm "lọc mà không đổi kết quả". Ẩn hẳn với
          non-admin, chỉ ADMIN mới cần lọc theo khoa (xem toàn bộ dữ liệu).
        */}
        {isAdmin && (
          <div className="min-w-40 space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Khoa/Phòng</label>
            <select
              value={department}
              onChange={(e) => {
                setDepartment(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Tất cả</option>
              {departmentsQuery.data?.data.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="min-w-36 space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Trạng thái duyệt</label>
          <select
            value={workflowStatus}
            onChange={(e) => {
              setWorkflowStatus(e.target.value as WorkflowStatus | "");
              setPage(1);
            }}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Tất cả</option>
            {WORKFLOW_STATUSES.map((s) => (
              <option key={s} value={s}>
                {WORKFLOW_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-36 space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Hiển thị</label>
          <select
            value={isActive}
            onChange={(e) => {
              setIsActive(e.target.value as "true" | "false" | "");
              setPage(1);
            }}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="true">Đang hoạt động</option>
            <option value="false">Đã ẩn (đã xoá)</option>
            <option value="">Tất cả</option>
          </select>
        </div>

        <div className="min-w-32 space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Từ ngày</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div className="min-w-32 space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Đến ngày</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </FilterBar>

      <DataTable
        columns={columns}
        data={documents}
        keyExtractor={(row) => row._id}
        isLoading={query.isLoading}
        isError={query.isError}
        errorMessage={query.error ? parseApiError(query.error).message : undefined}
        onRetry={() => query.refetch()}
        emptyTitle="Chưa có tài liệu nào"
        emptyMessage="Tạo đề xuất đầu tiên để bắt đầu."
        sortBy={sortBy}
        order={order}
        onSortChange={handleSortChange}
        rowActions={(row) => (
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="sm" aria-label="Xem chi tiết" onClick={() => navigate(`/app/documents/${row._id}`)}>
              <Eye />
            </Button>
            {row.isActive ? (
              <>
                <PermissionGuard permission={PERMISSIONS.DOCUMENT_UPDATE}>
                  <Button variant="ghost" size="sm" aria-label="Sửa" onClick={() => setEditTarget(row)}>
                    <Pencil />
                  </Button>
                </PermissionGuard>
                {isAdmin && (
                  <Button variant="ghost" size="sm" aria-label="Xoá" onClick={() => setDeleteTarget(row)}>
                    <Trash2 className="text-destructive" />
                  </Button>
                )}
              </>
            ) : (
              <PermissionGuard permission={PERMISSIONS.DOCUMENT_UPDATE}>
                <Button variant="ghost" size="sm" aria-label="Khôi phục" onClick={() => setRestoreTarget(row)}>
                  <RotateCcw />
                </Button>
              </PermissionGuard>
            )}
          </div>
        )}
      />

      {pagination && (
        <Pagination page={pagination.page} limit={pagination.limit} total={pagination.total} totalPages={pagination.totalPages} onPageChange={setPage} />
      )}

      {editTarget && <DocumentEditModal key={editTarget._id} open={!!editTarget} onClose={() => setEditTarget(null)} document={editTarget} />}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteMutation.mutate(deleteTarget._id, { onSuccess: () => setDeleteTarget(null) });
        }}
        title="Xoá tài liệu"
        message={`Ẩn "${deleteTarget?.title}"? Backend sẽ từ chối nếu còn biên bản tham chiếu (PROPOSAL) hoặc workflow đang chờ duyệt.`}
        danger
        isLoading={deleteMutation.isPending}
      />

      <ConfirmDialog
        open={!!restoreTarget}
        onClose={() => setRestoreTarget(null)}
        onConfirm={() => {
          if (!restoreTarget) return;
          restoreMutation.mutate(restoreTarget._id, { onSuccess: () => setRestoreTarget(null) });
        }}
        title="Khôi phục tài liệu"
        message={`Khôi phục "${restoreTarget?.title}"? Chỉ ADMIN hoặc người tạo tài liệu mới khôi phục được.`}
        isLoading={restoreMutation.isPending}
      />

      <DeleteByMonthModal open={deleteByMonthOpen} onClose={() => setDeleteByMonthOpen(false)} />
    </div>
  );
}

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Eye, Pencil, Trash2, RotateCcw, ListX, Search, ChevronDown, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { Pagination } from "@/components/shared/Pagination";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { BatchActionBar } from "@/components/shared/BatchActionBar";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { WorkflowStatusBadge } from "@/features/documents/components/WorkflowStatusBadge";
import { DocumentEditModal } from "@/features/documents/components/DocumentEditModal";
import { DeleteByMonthModal } from "@/features/documents/components/DeleteByMonthModal";
import { DocumentExcelMenu } from "@/features/documents/components/DocumentExcelMenu";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { usePermission } from "@/hooks/usePermission";
import { useRowSelection } from "@/hooks/useRowSelection";
import { PERMISSIONS } from "@/constants/permissions";
import { useDocuments } from "@/features/documents/hooks/useDocuments";
import { useDeleteDocument } from "@/features/documents/hooks/useDeleteDocument";
import { useRestoreDocument } from "@/features/documents/hooks/useRestoreDocument";
import { useBulkDeleteDocument } from "@/features/documents/hooks/useBulkDeleteDocument";
import { useBulkRestoreDocument } from "@/features/documents/hooks/useBulkRestoreDocument";
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
  PROPOSE_PROCUREMENT: "Đề xuất mua sắm/dự trù",
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
  const { hasPermission } = usePermission();
  // Khớp ĐÚNG guard đã áp dụng cho nút hàng-đơn (row action) bên dưới: Xoá
  // chỉ ADMIN (service `deleteDocumentService` tự check `isSystemRole`,
  // KHÔNG chỉ permission), Khôi phục cần permission DOCUMENT_UPDATE.
  const canBulkRestore = hasPermission(PERMISSIONS.DOCUMENT_UPDATE);
  const canBulkAct = isAdmin || canBulkRestore;

  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  // [MỚI 2026-09-18, DEV-063 — Roadmap B6] Tìm toàn văn — Ô RIÊNG, KHÔNG đụng
  // tới `keyword` ở trên (giữ nguyên hành vi khớp chuỗi con tức thời đang
  // dùng). Khi có giá trị, backend bỏ qua sortBy/order, sort theo mức độ
  // liên quan (xem `getAllDocumentsService`).
  const [contentSearch, setContentSearch] = useState("");
  const [category, setCategory] = useState<DocumentCategory | "">("");
  const [subType, setSubType] = useState<DocumentSubType | "">("");
  const [department, setDepartment] = useState("");
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus | "">("");
  const [isActive, setIsActive] = useState<"true" | "false" | "">("true");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sortBy, setSortBy] = useState<"createdAt" | "updatedAt" | "title" | "documentCode" | "serviceDate" | "actualCost">("createdAt");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  // [MỚI 2026-09-18] Thu gọn UI filter — 6 field ít dùng hơn (Loại/Phân loại
  // chi tiết/Khoa/Trạng thái duyệt/Từ-Đến ngày) ẩn sau nút "Bộ lọc nâng cao",
  // mặc định đóng. 2 ô tìm kiếm + "Hiển thị" luôn hiện vì dùng thường xuyên
  // nhất (user chọn hướng này qua AskUserQuestion, không phải suy đoán).
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const advancedFilterCount = [category, subType, department, workflowStatus, fromDate, toDate].filter(Boolean).length;
  const debouncedKeyword = useDebounce(keyword);
  const debouncedContentSearch = useDebounce(contentSearch);

  const [editTarget, setEditTarget] = useState<Document | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Document | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<Document | null>(null);
  const [deleteByMonthOpen, setDeleteByMonthOpen] = useState(false);
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
  const [batchRestoreOpen, setBatchRestoreOpen] = useState(false);

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
    setContentSearch("");
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
    // Backend yêu cầu tối thiểu 2 ký tự (`QueryDocumentDTO.fullTextSearch`)
    // — chặn ở đây để tránh gửi request 400 vô ích khi user mới gõ 1 ký tự.
    fullTextSearch: debouncedContentSearch.trim().length >= 2 ? debouncedContentSearch : undefined,
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
  const bulkDeleteMutation = useBulkDeleteDocument();
  const bulkRestoreMutation = useBulkRestoreDocument();

  const documents = query.data?.data ?? [];
  const pagination = query.data?.pagination;
  const selection = useRowSelection(documents.map((d) => d._id));

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

      {/*
        [MỚI 2026-09-18] Redesign filter bar Document theo hướng "thu gọn
        nâng cao" (user chọn qua AskUserQuestion, không phải FilterBar dùng
        chung — trang này có 9 field, nhiều hơn hẳn 17 trang khác đang dùng
        FilterBar, nên không sửa component chung, chỉ custom layout riêng ở
        đây). Luôn hiện: 2 ô tìm kiếm + Hiển thị (dùng thường xuyên nhất).
        6 field còn lại ẩn sau nút "Bộ lọc nâng cao", mặc định đóng.
      */}
      <div className="space-y-3 rounded-lg border border-border bg-card p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-48 flex-1 space-y-1.5">
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

          {/*
            [DEV-063 — Roadmap B6] Ô tìm kiếm toàn văn RIÊNG biệt khỏi ô "Tìm
            kiếm (mã/tiêu đề)" ở trên — tìm cả trong nội dung tự do (mô tả sự
            cố, ghi chú hạng mục, kết quả kiểm tra) qua `$text`. Kết quả khi
            có giá trị ở ô này LUÔN sắp xếp theo mức độ liên quan (bỏ qua
            việc bấm sắp xếp cột) — ghi rõ trong helper text để tránh người
            dùng thắc mắc vì sao bấm sắp xếp cột không đổi gì.
          */}
          <div className="min-w-56 flex-1 space-y-1.5">
            <label htmlFor="doc-content-search" className="text-xs font-medium text-muted-foreground">
              Tìm nội dung/ghi chú
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="doc-content-search"
                value={contentSearch}
                onChange={(e) => {
                  setContentSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Mô tả sự cố, ghi chú hạng mục..."
                className="w-full rounded-md border border-input bg-background py-2 pl-8 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            {contentSearch.trim().length >= 2 && (
              <p className="text-xs text-muted-foreground">Kết quả đang sắp xếp theo mức độ liên quan.</p>
            )}
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

          <div className="ml-auto flex items-end gap-2">
            <Button type="button" variant={advancedOpen ? "secondary" : "ghost"} size="sm" onClick={() => setAdvancedOpen((o) => !o)}>
              {advancedOpen ? <ChevronDown /> : <ChevronRight />}
              Bộ lọc nâng cao{advancedFilterCount > 0 ? ` (${advancedFilterCount})` : ""}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={resetFilters}>
              Xoá lọc
            </Button>
          </div>
        </div>

        {advancedOpen && (
          <div className="flex flex-wrap items-end gap-3 border-t border-border pt-3">
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
              DEV-030 (bổ sung): backend giờ ÉP `department` theo khoa của
              người gọi cho non-admin, GHI ĐÈ bất kỳ giá trị query nào (xem
              `document.service.ts::getAllDocumentsService`) — filter này
              với non-admin sẽ luôn vô hiệu (chọn khoa khác cũng chỉ trả về
              đúng khoa của họ), gây hiểu nhầm "lọc mà không đổi kết quả".
              Ẩn hẳn với non-admin, chỉ ADMIN mới cần lọc theo khoa (xem toàn
              bộ dữ liệu).
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
          </div>
        )}
      </div>

      {canBulkAct && (
        <BatchActionBar
          count={selection.selectedIds.size}
          onClear={selection.clear}
          onDelete={isAdmin ? () => setBatchDeleteOpen(true) : undefined}
          onRestore={canBulkRestore ? () => setBatchRestoreOpen(true) : undefined}
          isLoading={bulkDeleteMutation.isPending || bulkRestoreMutation.isPending}
        />
      )}

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
        selection={
          canBulkAct
            ? { selectedIds: selection.selectedIds, onToggleRow: selection.toggleRow, onToggleAll: selection.toggleAll }
            : undefined
        }
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

      <ConfirmDialog
        open={batchDeleteOpen}
        onClose={() => setBatchDeleteOpen(false)}
        onConfirm={() => {
          bulkDeleteMutation.mutate([...selection.selectedIds], {
            onSuccess: () => {
              setBatchDeleteOpen(false);
              selection.clear();
            },
          });
        }}
        title="Xoá tài liệu đã chọn"
        message={`Ẩn ${selection.selectedIds.size} tài liệu đã chọn? Mục còn biên bản tham chiếu hoặc workflow đang chờ duyệt sẽ bị bỏ qua kèm lý do.`}
        danger
        isLoading={bulkDeleteMutation.isPending}
      />

      <ConfirmDialog
        open={batchRestoreOpen}
        onClose={() => setBatchRestoreOpen(false)}
        onConfirm={() => {
          bulkRestoreMutation.mutate([...selection.selectedIds], {
            onSuccess: () => {
              setBatchRestoreOpen(false);
              selection.clear();
            },
          });
        }}
        title="Khôi phục tài liệu đã chọn"
        message={`Khôi phục ${selection.selectedIds.size} tài liệu đã chọn? Chỉ ADMIN hoặc người tạo mới khôi phục được từng mục — mục không đủ quyền sẽ bị bỏ qua kèm lý do.`}
        isLoading={bulkRestoreMutation.isPending}
      />

      <DeleteByMonthModal open={deleteByMonthOpen} onClose={() => setDeleteByMonthOpen(false)} />
    </div>
  );
}

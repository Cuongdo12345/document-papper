import { useState } from "react";
import { Upload as UploadIcon, Download, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { FilterBar } from "@/components/shared/FilterBar";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { Pagination } from "@/components/shared/Pagination";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { AppModal } from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/shared/FileUpload";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { PERMISSIONS } from "@/constants/permissions";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useDebounce } from "@/hooks/useDebounce";
import { useFiles } from "@/features/files/hooks/useFiles";
import { useUploadFiles } from "@/features/files/hooks/useUploadFiles";
import { useDeleteFile } from "@/features/files/hooks/useDeleteFile";
import { useDownloadFile } from "@/features/files/hooks/useDownloadFile";
import { useUsers } from "@/features/users/hooks/useUsers";
import { parseApiError } from "@/utils/parseApiError";
import type { UploadedFile } from "@/types/file.types";

const LIMIT = 20;
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // khớp `createUploader({maxSize:...})` mặc định (upload.middleware.ts)
const ACCEPT = ".pdf,.jpg,.jpeg,.png,.docx,.xlsx";
const ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png", ".docx", ".xlsx"];

// Khớp CHÍNH XÁC `createUploader({allowedTypes:[...]})` (`upload.routes.ts`)
// — đây là toàn bộ mimeType có thể xuất hiện trong dữ liệu thật (upload mới
// bị chặn ở mọi loại khác), nên dùng đúng danh sách này cho dropdown lọc
// thay vì tự bịa 1 danh sách "loại file" khác không khớp thực tế.
const MIME_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "application/pdf", label: "PDF" },
  { value: "image/jpeg", label: "Ảnh (JPEG)" },
  { value: "image/png", label: "Ảnh (PNG)" },
  { value: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", label: "Word (.docx)" },
  { value: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", label: "Excel (.xlsx)" },
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * "Quản lý file" (roadmap Mục 20 — File upload) — dùng module Upload ĐỘC LẬP
 * đã có sẵn ở backend (`/api/upload`). ⚠️ CHỦ Ý KHÔNG phải "file đính kèm
 * của Document/Asset" — backend hiện KHÔNG có field liên kết nào giữa
 * `Upload` và Document/Asset (xem `types/file.types.ts`), đây là "danh sách
 * file bạn đã tải lên hệ thống" thuần tuý. Non-ADMIN chỉ thấy file CỦA
 * MÌNH, ADMIN thấy toàn bộ (backend tự filter theo `getFiles`, FE không cần
 * tự lọc thêm).
 *
 * [MỚI 2026-09-12, theo yêu cầu user] Tìm kiếm (tên file, debounce) + lọc
 * (loại file, khoảng ngày tải lên, người tải lên — riêng field này chỉ hiện
 * cho ADMIN) + sort theo cột (khớp `QueryUploadDTO` backend).
 */
export function FilesListPage() {
  const isAdmin = useIsAdmin();

  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [mimeType, setMimeType] = useState("");
  const [uploadedBy, setUploadedBy] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sortBy, setSortBy] = useState<"createdAt" | "fileName" | "fileSize">("createdAt");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const debouncedKeyword = useDebounce(keyword);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<UploadedFile | null>(null);
  const [progress, setProgress] = useState<number | null>(null);

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
    setMimeType("");
    setUploadedBy("");
    setFromDate("");
    setToDate("");
    setPage(1);
  }

  // Dropdown "Người tải lên" CHỈ hiển thị + gọi API cho ADMIN — non-admin
  // luôn bị backend ghi đè `uploadedBy` bằng chính họ (DEV-007/IMP-009),
  // truyền field này không có tác dụng, hiện dropdown sẽ gây hiểu nhầm.
  const usersQuery = useUsers({ limit: 100 }, { enabled: isAdmin });

  const query = useFiles({
    page,
    limit: LIMIT,
    keyword: debouncedKeyword || undefined,
    mimeType: mimeType || undefined,
    uploadedBy: isAdmin && uploadedBy ? uploadedBy : undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
    sortBy,
    order,
  });
  const uploadMutation = useUploadFiles();
  const deleteMutation = useDeleteFile();
  const downloadMutation = useDownloadFile();

  const items = query.data?.data ?? [];
  const apiError = uploadMutation.error ? parseApiError(uploadMutation.error) : null;

  function closeUploadModal() {
    setUploadOpen(false);
    setPendingFiles([]);
    setProgress(null);
    uploadMutation.reset();
  }

  function handleUpload() {
    if (!pendingFiles.length) return;
    uploadMutation.mutate(
      {
        files: pendingFiles,
        onUploadProgress: (e) => {
          if (e.total) setProgress(Math.round((e.loaded / e.total) * 100));
        },
      },
      { onSuccess: closeUploadModal },
    );
  }

  const columns: DataTableColumn<UploadedFile>[] = [
    { key: "fileName", header: "Tên file", sortKey: "fileName" },
    { key: "mimeType", header: "Loại", render: (row) => row.mimeType },
    { key: "fileSize", header: "Kích thước", sortKey: "fileSize", render: (row) => formatBytes(row.fileSize) },
    {
      key: "createdAt",
      header: "Ngày tải lên",
      className: "whitespace-nowrap",
      sortKey: "createdAt",
      render: (row) => new Date(row.createdAt).toLocaleString("vi-VN"),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Tệp tin"
        description="Danh sách file bạn đã tải lên hệ thống."
        actions={
          <PermissionGuard permission={PERMISSIONS.UPLOAD_FILES}>
            <Button size="sm" onClick={() => setUploadOpen(true)}>
              <UploadIcon /> Tải file lên
            </Button>
          </PermissionGuard>
        }
      />

      <FilterBar onReset={resetFilters}>
        <div className="min-w-48 space-y-1.5">
          <label htmlFor="file-search" className="text-xs font-medium text-muted-foreground">
            Tìm theo tên file
          </label>
          <input
            id="file-search"
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value);
              setPage(1);
            }}
            placeholder="Nhập tên file..."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="min-w-40 space-y-1.5">
          <label htmlFor="file-mimeType" className="text-xs font-medium text-muted-foreground">
            Loại file
          </label>
          <select
            id="file-mimeType"
            value={mimeType}
            onChange={(e) => {
              setMimeType(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Tất cả</option>
            {MIME_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {isAdmin && (
          <div className="min-w-44 space-y-1.5">
            <label htmlFor="file-uploadedBy" className="text-xs font-medium text-muted-foreground">
              Người tải lên
            </label>
            <select
              id="file-uploadedBy"
              value={uploadedBy}
              onChange={(e) => {
                setUploadedBy(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Tất cả</option>
              {usersQuery.data?.data.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.fullName} ({u.username})
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="min-w-40 space-y-1.5">
          <label htmlFor="file-fromDate" className="text-xs font-medium text-muted-foreground">
            Từ ngày
          </label>
          <input
            id="file-fromDate"
            type="date"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="min-w-40 space-y-1.5">
          <label htmlFor="file-toDate" className="text-xs font-medium text-muted-foreground">
            Đến ngày
          </label>
          <input
            id="file-toDate"
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
        data={items}
        keyExtractor={(row) => row._id}
        isLoading={query.isLoading}
        isError={query.isError}
        errorMessage={query.error ? parseApiError(query.error).message : undefined}
        onRetry={() => query.refetch()}
        sortBy={sortBy}
        order={order}
        onSortChange={handleSortChange}
        emptyTitle="Chưa có file nào"
        emptyMessage="Bạn chưa tải lên file nào."
        rowActions={(row) => (
          <div className="flex justify-end gap-1">
            <PermissionGuard permission={PERMISSIONS.VIEW_FILE_DETAIL}>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Tải xuống"
                onClick={() => downloadMutation.mutate(row)}
                loading={downloadMutation.isPending && downloadMutation.variables?._id === row._id}
              >
                <Download />
              </Button>
            </PermissionGuard>
            <PermissionGuard permission={PERMISSIONS.DELETE_FILE}>
              <Button variant="ghost" size="sm" aria-label="Xoá" onClick={() => setDeleteTarget(row)}>
                <Trash2 className="text-destructive" />
              </Button>
            </PermissionGuard>
          </div>
        )}
      />

      {query.data?.pagination && query.data.pagination.totalPages > 1 && (
        <Pagination
          page={query.data.pagination.page}
          limit={query.data.pagination.limit}
          total={query.data.pagination.total}
          totalPages={query.data.pagination.totalPages}
          onPageChange={setPage}
        />
      )}

      <AppModal open={uploadOpen} onClose={closeUploadModal} title="Tải file lên" size="sm">
        <div className="space-y-4">
          <FileUpload
            accept={ACCEPT}
            allowedExtensions={ALLOWED_EXTENSIONS}
            maxSizeBytes={MAX_SIZE_BYTES}
            multiple
            disabled={uploadMutation.isPending}
            value={pendingFiles}
            onChange={setPendingFiles}
            helperText="PDF, ảnh, Word, Excel — tối đa 10MB/file"
          />

          {uploadMutation.isPending && progress !== null && (
            <div className="space-y-1">
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-xs text-muted-foreground">Đang tải lên... {progress}%</p>
            </div>
          )}

          {apiError && (
            <p role="alert" className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {apiError.message}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" size="sm" onClick={closeUploadModal} disabled={uploadMutation.isPending}>
              Huỷ
            </Button>
            <Button type="button" size="sm" onClick={handleUpload} loading={uploadMutation.isPending} disabled={!pendingFiles.length}>
              Tải lên
            </Button>
          </div>
        </div>
      </AppModal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteMutation.mutate(deleteTarget._id, { onSuccess: () => setDeleteTarget(null) });
        }}
        title="Xoá file"
        message={`Xoá file "${deleteTarget?.fileName}"? Hành động này không thể hoàn tác.`}
        danger
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
